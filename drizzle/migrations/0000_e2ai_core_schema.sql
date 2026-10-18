-- ===== roles =====
create type public.app_role as enum ('student', 'teacher');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create policy "claim own role once" on public.user_roles
  for insert to authenticated with check (
    auth.uid() = user_id
    and not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid())
  );

-- ===== profiles =====
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  full_name text,
  role public.app_role not null default 'student',
  school text,
  class_name text,
  student_code text,
  avatar_url text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ===== classes =====
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  teacher_id uuid not null,
  school text,
  academic_year text,
  class_code text not null unique,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.classes to authenticated;
grant all on public.classes to service_role;
alter table public.classes enable row level security;

create table public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null,
  joined_at timestamptz not null default now(),
  unique (class_id, student_id)
);

grant select, insert, delete on public.class_members to authenticated;
grant all on public.class_members to service_role;
alter table public.class_members enable row level security;

create or replace function public.teaches_student(_teacher uuid, _student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members cm
    join public.classes c on c.id = cm.class_id
    where c.teacher_id = _teacher and cm.student_id = _student
  )
$$;

create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = user_id or public.teaches_student(auth.uid(), user_id));
create policy "insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = user_id);

create policy "teacher manages own classes" on public.classes
  for all to authenticated using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy "member reads class" on public.classes
  for select to authenticated using (
    exists (select 1 from public.class_members cm where cm.class_id = id and cm.student_id = auth.uid())
  );

create policy "read class members" on public.class_members
  for select to authenticated using (
    student_id = auth.uid()
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );
create policy "student joins class" on public.class_members
  for insert to authenticated with check (student_id = auth.uid());
create policy "leave or remove member" on public.class_members
  for delete to authenticated using (
    student_id = auth.uid()
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

-- join a class by code (students cannot read other classes, so this is a definer function)
create or replace function public.join_class_by_code(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _class_id uuid;
begin
  select id into _class_id from public.classes where upper(class_code) = upper(trim(_code));
  if _class_id is null then
    raise exception 'CLASS_NOT_FOUND';
  end if;
  insert into public.class_members (class_id, student_id)
  values (_class_id, auth.uid())
  on conflict (class_id, student_id) do nothing;
  update public.profiles
     set class_name = (select class_name from public.classes where id = _class_id),
         updated_at = now()
   where user_id = auth.uid();
  return _class_id;
end;
$$;

-- ===== practice =====
create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  class_id uuid references public.classes(id) on delete set null,
  activity_type text not null default 'practice',
  category_id text,
  category_label text,
  topic text,
  scenario text,
  question text,
  difficulty integer,
  status text not null default 'completed',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds numeric,
  response_time_seconds numeric,
  word_count integer,
  response_text text,
  overall_score numeric,
  grammar_score numeric,
  vocabulary_score numeric,
  fluency_score numeric,
  pronunciation_score numeric,
  interaction_score numeric,
  appropriateness_score numeric,
  turn_count integer not null default 0,
  feedback jsonb,
  recommendation jsonb,
  ai_feedback jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.practice_sessions to authenticated;
grant all on public.practice_sessions to service_role;
alter table public.practice_sessions enable row level security;

create policy "student manages own sessions" on public.practice_sessions
  for all to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "teacher reads student sessions" on public.practice_sessions
  for select to authenticated using (public.teaches_student(auth.uid(), student_id));

create table public.practice_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  student_id uuid not null,
  turn_number integer not null,
  speaker text not null,
  transcript text,
  ai_response text,
  grammar_feedback text,
  vocabulary_feedback text,
  fluency_feedback text,
  pronunciation_feedback text,
  created_at timestamptz not null default now()
);

grant select, insert on public.practice_turns to authenticated;
grant all on public.practice_turns to service_role;
alter table public.practice_turns enable row level security;

create policy "student manages own turns" on public.practice_turns
  for all to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "teacher reads student turns" on public.practice_turns
  for select to authenticated using (public.teaches_student(auth.uid(), student_id));

-- ===== research team tables =====
create table public.development_logs (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  version text,
  stage text,
  title text not null,
  description text,
  problem text,
  solution text,
  result text,
  author text,
  created_by uuid,
  created_at timestamptz not null default now()
);

grant select on public.development_logs to authenticated;
grant insert, update, delete on public.development_logs to authenticated;
grant all on public.development_logs to service_role;
alter table public.development_logs enable row level security;

create policy "anyone signed in reads dev log" on public.development_logs
  for select to authenticated using (true);
create policy "teachers write dev log" on public.development_logs
  for all to authenticated using (public.has_role(auth.uid(), 'teacher')) with check (public.has_role(auth.uid(), 'teacher'));

create table public.prototype_tests (
  id uuid primary key default gen_random_uuid(),
  test_code text,
  test_date date not null default current_date,
  version text,
  tester text,
  test_category text not null,
  test_case text not null,
  expected_result text,
  actual_result text,
  status text not null default 'NOT_TESTED',
  error text,
  solution text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.prototype_tests to authenticated;
grant all on public.prototype_tests to service_role;
alter table public.prototype_tests enable row level security;

create policy "anyone signed in reads tests" on public.prototype_tests
  for select to authenticated using (true);
create policy "teachers write tests" on public.prototype_tests
  for all to authenticated using (public.has_role(auth.uid(), 'teacher')) with check (public.has_role(auth.uid(), 'teacher'));

create index on public.practice_sessions (student_id, created_at desc);
create index on public.practice_turns (session_id, turn_number);
create index on public.class_members (class_id);
