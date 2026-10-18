CREATE TABLE public.official_students (
  student_code text PRIMARY KEY CHECK (student_code ~ '^A(0[1-9]|[1-3][0-9]|4[0-4])$'),
  full_name text NOT NULL,
  email text,
  school text,
  grade text,
  class_name text,
  linked_user_id uuid UNIQUE,
  linked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.official_students TO authenticated;
GRANT ALL ON public.official_students TO service_role;
ALTER TABLE public.official_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student reads own official row" ON public.official_students FOR SELECT TO authenticated
  USING (linked_user_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "teacher updates official rows" ON public.official_students FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE TABLE public.official_teacher (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  full_name text NOT NULL,
  school text,
  subject text,
  email text,
  linked_user_id uuid UNIQUE,
  linked_at timestamptz
);
GRANT SELECT ON public.official_teacher TO authenticated;
GRANT ALL ON public.official_teacher TO service_role;
ALTER TABLE public.official_teacher ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in reads teacher" ON public.official_teacher FOR SELECT TO authenticated USING (true);

-- Roles can now only be granted through the linking functions below.
DROP POLICY IF EXISTS "claim own role once" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.link_official_student(_code text, _full_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.official_students; _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  SELECT student_code INTO _code FROM public.official_students WHERE linked_user_id = _uid;
  IF FOUND THEN RETURN _code; END IF;
  IF EXISTS (SELECT 1 FROM public.official_teacher WHERE linked_user_id = _uid) THEN RAISE EXCEPTION 'is_teacher'; END IF;
  SELECT * INTO _row FROM public.official_students WHERE student_code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_code'; END IF;
  IF lower(regexp_replace(trim(_row.full_name), '\s+', ' ', 'g')) <> lower(regexp_replace(trim(_full_name), '\s+', ' ', 'g')) THEN
    RAISE EXCEPTION 'name_mismatch';
  END IF;
  IF _row.linked_user_id IS NOT NULL THEN RAISE EXCEPTION 'already_linked'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  UPDATE public.official_students SET linked_user_id = _uid, linked_at = now(), email = _email, updated_at = now()
    WHERE student_code = _row.student_code;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'student') ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET role = 'student', full_name = _row.full_name, student_code = _row.student_code,
    school = COALESCE(_row.school, school), class_name = COALESCE(_row.class_name, class_name),
    profile_completed = true, updated_at = now() WHERE user_id = _uid;
  RETURN _row.student_code;
END $$;

CREATE OR REPLACE FUNCTION public.link_official_teacher()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _t public.official_teacher; _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  IF EXISTS (SELECT 1 FROM public.official_students WHERE linked_user_id = _uid) THEN RAISE EXCEPTION 'is_student'; END IF;
  SELECT * INTO _t FROM public.official_teacher WHERE id = 1;
  IF _t.linked_user_id = _uid THEN RETURN true; END IF;
  IF _t.linked_user_id IS NOT NULL THEN RAISE EXCEPTION 'teacher_already_linked'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  UPDATE public.official_teacher SET linked_user_id = _uid, linked_at = now(), email = _email WHERE id = 1;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'teacher') ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET role = 'teacher', full_name = _t.full_name, school = _t.school,
    profile_completed = true, updated_at = now() WHERE user_id = _uid;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.unlink_official_student(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT linked_user_id INTO _old FROM public.official_students WHERE student_code = _code;
  UPDATE public.official_students SET linked_user_id = NULL, linked_at = NULL, updated_at = now() WHERE student_code = _code;
  IF _old IS NOT NULL THEN DELETE FROM public.user_roles WHERE user_id = _old AND role = 'student'; END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.link_official_student(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_official_teacher() FROM anon;
REVOKE EXECUTE ON FUNCTION public.unlink_official_student(text) FROM anon;

CREATE OR REPLACE FUNCTION public.teaches_student(_teacher uuid, _student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members m JOIN public.classes c ON c.id = m.class_id
                 WHERE c.teacher_id = _teacher AND m.student_id = _student)
      OR (public.has_role(_teacher, 'teacher')
          AND EXISTS (SELECT 1 FROM public.official_students WHERE linked_user_id = _student));
$$;

INSERT INTO public.official_teacher (id, full_name, school, subject)
VALUES (1, 'Nguyễn Thị Hồng Lam', 'THPT Đoàn Văn Tố', 'Tiếng Anh') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.official_students (student_code, full_name) VALUES
('A01','Trần Quốc Anh'),('A02','Nguyễn Quốc An Bình'),('A03','Lê Ngọc Bảo Châu'),('A04','Nguyễn Ngọc Bảo Châu'),
('A05','Ngô Trần Khánh Duy'),('A06','Nguyễn Thị Tường Duy'),('A07','Thái Nguyễn Duy'),('A08','Nguyễn Thị Thùy Dương'),
('A09','Nguyễn Tấn Đạt'),('A10','Trần Tiến Đạt'),('A11','Huỳnh Minh Đăng'),('A12','Nguyễn Ngọc Hân'),
('A13','Lâm Nhất Huy'),('A14','Ngô Gia Huy'),('A15','Phạm Thị Mỹ Huyền'),('A16','Dương Phước Khang'),
('A17','Mạch Gia Khang'),('A18','Nguyễn Phúc Khang'),('A19','Võ Quốc Kiệt'),('A20','Trần Bảo Ngọc'),
('A21','Đinh Dương Thảo Nguyên'),('A22','Trần Nguyễn Thảo Nguyên'),('A23','Bùi Quang Nhật'),('A24','Đặng Huỳnh Xuân Nhi'),
('A25','Lê Thị Tuyết Nhi'),('A26','Nguyễn Ngọc Thảo Nhi'),('A27','Lâm Võ Khắc Quy'),('A28','Trần Lâm Nhã Quỳnh'),
('A29','Phạm Thanh Thảo'),('A30','Hồ Hồng Thắm'),('A31','Diệp Quốc Thịnh'),('A32','Đỗ Phước Thịnh'),
('A33','Đỗ Thị Bích Thùy'),('A34','Đặng Trí Thức'),('A35','Trần Thị Thủy Tiên'),('A36','Trần Thị Huyền Trân'),
('A37','Nguyễn Thị Ngọc Tuyết'),('A38','Nguyễn Cát Tường'),('A39','Nguyễn Trường Vũ'),('A40','Huỳnh Thảo Vy'),
('A41','Lê Phạm Tường Vy'),('A42','Phan Khánh Vy'),('A43','Trần Thị Ái Vy'),('A44','Nguyễn Thị Thảo Xuân')
ON CONFLICT (student_code) DO NOTHING;