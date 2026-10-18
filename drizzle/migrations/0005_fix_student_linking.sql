CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.e2ai_norm_name(_s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT lower(regexp_replace(trim(extensions.unaccent(replace(replace(normalize(coalesce(_s,''), NFC),'đ','d'),'Đ','D'))), '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.find_official_student(_name text)
RETURNS TABLE(student_code text, full_name text, class_name text, is_linked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _q text := public.e2ai_norm_name(_name);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  IF length(_q) < 2 THEN RETURN; END IF;
  RETURN QUERY
    SELECT o.student_code, o.full_name, COALESCE(o.class_name, '12A1'), o.linked_user_id IS NOT NULL
    FROM public.official_students o
    WHERE public.e2ai_norm_name(o.full_name) LIKE '%' || _q || '%'
       OR _q LIKE '%' || public.e2ai_norm_name(o.full_name) || '%'
    ORDER BY o.student_code LIMIT 10;
END $$;
REVOKE ALL ON FUNCTION public.find_official_student(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_official_student(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_official_student(_code text, _full_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.official_students; _email text; _existing text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  SELECT student_code INTO _existing FROM public.official_students WHERE linked_user_id = _uid;
  IF FOUND THEN
    IF _existing = upper(trim(_code)) THEN RETURN _existing; END IF;
    RAISE EXCEPTION 'account_already_linked';
  END IF;
  IF EXISTS (SELECT 1 FROM public.official_teacher WHERE linked_user_id = _uid) THEN RAISE EXCEPTION 'is_teacher'; END IF;
  SELECT * INTO _row FROM public.official_students WHERE student_code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_code'; END IF;
  IF public.e2ai_norm_name(_row.full_name) <> public.e2ai_norm_name(_full_name) THEN RAISE EXCEPTION 'name_mismatch'; END IF;
  IF _row.linked_user_id IS NOT NULL THEN RAISE EXCEPTION 'already_linked'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  UPDATE public.official_students SET linked_user_id = _uid, linked_at = now(), email = _email, updated_at = now()
    WHERE student_code = _row.student_code AND linked_user_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'already_linked'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'student') ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET role = 'student', full_name = _row.full_name, student_code = _row.student_code,
    school = COALESCE(_row.school, school), class_name = COALESCE(_row.class_name, '12A1', class_name),
    profile_completed = true, updated_at = now() WHERE user_id = _uid;
  RETURN _row.student_code;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS official_students_linked_user_uniq ON public.official_students(linked_user_id) WHERE linked_user_id IS NOT NULL;