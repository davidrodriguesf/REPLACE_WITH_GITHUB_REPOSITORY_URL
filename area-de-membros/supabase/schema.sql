-- =====================================================================
-- UNIVERSIDADE CORPORATIVA — esquema do banco (Supabase / Postgres)
-- Colaboradores, funções, trilhas, cursos, quiz/prova, certificados,
-- PDI (plano de desenvolvimento), biblioteca, comunidade e eventos.
-- Cole tudo no Supabase → SQL Editor → Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FUNÇÕES (cargos) E PERFIS
-- ---------------------------------------------------------------------
create table if not exists public.job_roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  bio         text,
  phone       text,
  city        text,
  state       text,
  department  text,
  job_role_id uuid references public.job_roles(id) on delete set null,
  manager_id  uuid references public.profiles(id) on delete set null,
  hired_at    date,
  -- employee = colaborador · manager = gestor (vê e acompanha a equipe) · admin = RH/administração
  role        text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_manager_idx on public.profiles (manager_id);
create index if not exists profiles_job_role_idx on public.profiles (job_role_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email),
          coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_manager_of(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.profiles me on me.id = auth.uid() and me.is_active and me.role in ('manager', 'admin')
    where p.id = uid and p.manager_id = auth.uid()
  );
$$;

create or replace function public.can_view_user(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select uid = auth.uid() or public.is_admin() or public.is_manager_of(uid);
$$;

create or replace function public.my_job_role()
returns uuid language sql stable security definer set search_path = public as $$
  select job_role_id from public.profiles where id = auth.uid();
$$;

-- O colaborador só edita dados pessoais. Função, gestor, papel e status são do RH.
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.job_role_id := old.job_role_id;
    new.manager_id := old.manager_id;
    new.is_active := old.is_active;
    new.department := old.department;
    new.hired_at := old.hired_at;
  end if;
  new.email := old.email;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- Dados públicos de colegas (sem e-mail/telefone) para comunidade e eventos
create or replace view public.member_profiles as
  select p.id, p.full_name, p.avatar_url, p.bio, p.role, p.department, p.created_at, j.name as job_role
  from public.profiles p left join public.job_roles j on j.id = p.job_role_id
  where p.is_active;
revoke all on public.member_profiles from anon;
grant select on public.member_profiles to authenticated;

-- ---------------------------------------------------------------------
-- CATÁLOGO: categorias, instrutores, cursos, módulos e aulas
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  position int not null default 0
);

create table if not exists public.instructors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  title      text,           -- ex.: "Diretor Comercial"
  avatar_url text,
  bio        text,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  title                text not null,
  subtitle             text,
  description          text,
  cover_url            text,
  category_id          uuid references public.categories(id) on delete set null,
  -- all = todos os colaboradores · roles = só funções escolhidas (ou via trilha/atribuição)
  audience             text not null default 'all' check (audience in ('all', 'roles')),
  workload_hours       numeric(5,1),           -- carga horária do certificado
  certificate_enabled  boolean not null default true,
  is_featured          boolean not null default false,
  is_published         boolean not null default false,
  position             int not null default 0,
  created_at           timestamptz not null default now()
);

create table if not exists public.course_job_roles (
  course_id   uuid not null references public.courses(id) on delete cascade,
  job_role_id uuid not null references public.job_roles(id) on delete cascade,
  primary key (course_id, job_role_id)
);

create table if not exists public.course_instructors (
  course_id     uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  position      int not null default 0,
  primary key (course_id, instructor_id)
);

create table if not exists public.modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  title      text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists modules_course_idx on public.modules (course_id, position);

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules(id) on delete cascade,
  course_id        uuid not null references public.courses(id) on delete cascade,
  title            text not null,
  description      text,
  video_url        text,
  content          text,
  attachment_url   text,
  duration_minutes int,
  position         int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists lessons_module_idx on public.lessons (module_id, position);
create index if not exists lessons_course_idx on public.lessons (course_id);

create or replace function public.lessons_set_course()
returns trigger language plpgsql as $$
begin
  select course_id into new.course_id from public.modules where id = new.module_id;
  return new;
end $$;
drop trigger if exists lessons_set_course on public.lessons;
create trigger lessons_set_course before insert or update of module_id on public.lessons
  for each row execute function public.lessons_set_course();

-- ---------------------------------------------------------------------
-- TRILHAS (cada função tem a sua) E ATRIBUIÇÕES INDIVIDUAIS
-- ---------------------------------------------------------------------
create table if not exists public.trails (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  cover_url   text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.trail_job_roles (
  trail_id    uuid not null references public.trails(id) on delete cascade,
  job_role_id uuid not null references public.job_roles(id) on delete cascade,
  primary key (trail_id, job_role_id)
);

create table if not exists public.trail_courses (
  trail_id  uuid not null references public.trails(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  position  int not null default 0,
  required  boolean not null default true,
  primary key (trail_id, course_id)
);

create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  due_date    date,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (user_id, course_id)
);

create or replace function public.has_course_access(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.courses co
    join public.profiles me on me.id = auth.uid() and me.is_active
    where co.id = c and co.is_published and (
      co.audience = 'all'
      or exists (select 1 from public.course_job_roles r where r.course_id = c and r.job_role_id = me.job_role_id)
      or exists (select 1 from public.trail_courses tc join public.trail_job_roles tj on tj.trail_id = tc.trail_id
                 where tc.course_id = c and tj.job_role_id = me.job_role_id)
      or exists (select 1 from public.assignments a where a.course_id = c and a.user_id = me.id)
    )
  );
$$;

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------------
-- QUIZ (por aula) E PROVA (final do curso)
-- ---------------------------------------------------------------------
create table if not exists public.quizzes (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid not null references public.courses(id) on delete cascade,
  lesson_id          uuid references public.lessons(id) on delete cascade, -- nulo = prova do curso
  kind               text not null default 'quiz' check (kind in ('quiz', 'exam')),
  title              text not null,
  description        text,
  passing_score      int not null default 70 check (passing_score between 0 and 100),
  max_attempts       int,          -- nulo = ilimitado
  time_limit_minutes int,          -- nulo = sem tempo
  show_answers       boolean not null default true, -- mostra o gabarito depois de enviar
  is_published       boolean not null default true,
  created_at         timestamptz not null default now()
);
create index if not exists quizzes_course_idx on public.quizzes (course_id);

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes(id) on delete cascade,
  prompt      text not null,
  explanation text,
  position    int not null default 0
);

create table if not exists public.quiz_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  text        text not null,
  is_correct  boolean not null default false,
  position    int not null default 0
);

create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  score        int not null,
  correct      int not null,
  total        int not null,
  passed       boolean not null,
  answers      jsonb not null default '{}',
  submitted_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id);

-- Questões SEM o gabarito, para o colaborador responder
create or replace function public.get_quiz(qid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q record;
begin
  select * into q from public.quizzes where id = qid and (is_published or public.is_admin());
  if q is null or not public.has_course_access(q.course_id) then
    raise exception 'Avaliação não encontrada';
  end if;
  return jsonb_build_object(
    'id', q.id, 'title', q.title, 'description', q.description, 'kind', q.kind,
    'passing_score', q.passing_score, 'max_attempts', q.max_attempts,
    'time_limit_minutes', q.time_limit_minutes, 'course_id', q.course_id, 'lesson_id', q.lesson_id,
    'attempts_used', (select count(*) from public.quiz_attempts a where a.quiz_id = qid and a.user_id = auth.uid()),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qq.id, 'prompt', qq.prompt,
        'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text) order by o.position, o.id)
                    from public.quiz_options o where o.question_id = qq.id)
      ) order by qq.position, qq.id)
      from public.quiz_questions qq where qq.quiz_id = qid), '[]'::jsonb)
  );
end $$;

-- Corrige no servidor, grava a tentativa e devolve o resultado
create or replace function public.submit_quiz(qid uuid, answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q record; used int; total int; ok int := 0; sc int; pass boolean; att uuid;
  results jsonb := '[]'::jsonb; r record; chosen uuid; right_id uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  select * into q from public.quizzes where id = qid and is_published;
  if q is null or not public.has_course_access(q.course_id) then raise exception 'Avaliação não encontrada'; end if;
  select count(*) into used from public.quiz_attempts where quiz_id = qid and user_id = auth.uid();
  if q.max_attempts is not null and used >= q.max_attempts then raise exception 'Limite de tentativas atingido'; end if;

  select count(*) into total from public.quiz_questions where quiz_id = qid;
  if total = 0 then raise exception 'Avaliação sem questões'; end if;

  for r in select qq.id, qq.explanation from public.quiz_questions qq where qq.quiz_id = qid order by qq.position, qq.id loop
    chosen := nullif(answers->>r.id::text, '')::uuid;
    select o.id into right_id from public.quiz_options o where o.question_id = r.id and o.is_correct limit 1;
    if chosen is not null and chosen = right_id then ok := ok + 1; end if;
    results := results || jsonb_build_object(
      'question_id', r.id, 'chosen', chosen, 'is_correct', chosen is not null and chosen = right_id,
      'correct_option', case when q.show_answers then right_id end,
      'explanation', case when q.show_answers then r.explanation end);
  end loop;

  sc := round(100.0 * ok / total);
  pass := sc >= q.passing_score;
  insert into public.quiz_attempts (quiz_id, user_id, score, correct, total, passed, answers)
  values (qid, auth.uid(), sc, ok, total, pass, coalesce(answers, '{}'::jsonb)) returning id into att;

  return jsonb_build_object('attempt_id', att, 'score', sc, 'correct', ok, 'total', total, 'passed', pass,
    'passing_score', q.passing_score, 'attempts_used', used + 1, 'max_attempts', q.max_attempts,
    'results', results);
end $$;

-- ---------------------------------------------------------------------
-- CERTIFICADOS
-- ---------------------------------------------------------------------
create table if not exists public.certificates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  code       text not null unique,
  hours      numeric(5,1),
  issued_at  timestamptz not null default now(),
  unique (user_id, course_id)
);

-- Emite o certificado se: todas as aulas concluídas e prova (se houver) aprovada
create or replace function public.issue_certificate(cid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; total int; done int; has_exam boolean; passed boolean; cert record; mins int;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  select * into cert from public.certificates where user_id = auth.uid() and course_id = cid;
  if cert is not null then return to_jsonb(cert); end if;

  select * into c from public.courses where id = cid;
  if c is null or not c.certificate_enabled or not public.has_course_access(cid) then return null; end if;

  select count(*), coalesce(sum(duration_minutes), 0) into total, mins from public.lessons where course_id = cid;
  select count(*) into done from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
    where l.course_id = cid and lp.user_id = auth.uid();
  if total = 0 or done < total then return null; end if;

  select exists (select 1 from public.quizzes where course_id = cid and kind = 'exam' and is_published) into has_exam;
  if has_exam then
    select exists (select 1 from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id
                   where q.course_id = cid and q.kind = 'exam' and q.is_published and a.user_id = auth.uid() and a.passed)
      into passed;
    if not passed then return null; end if;
  end if;

  insert into public.certificates (user_id, course_id, code, hours)
  values (auth.uid(), cid, upper(substr(md5(gen_random_uuid()::text), 1, 4) || '-' || substr(md5(gen_random_uuid()::text), 1, 4) || '-' || substr(md5(gen_random_uuid()::text), 1, 4)),
          coalesce(c.workload_hours, round(mins / 60.0, 1)))
  returning * into cert;
  return to_jsonb(cert);
end $$;

-- Verificação pública (qualquer pessoa com o código)
create or replace function public.verify_certificate(cert_code text)
returns table (full_name text, course_title text, hours numeric, issued_at timestamptz, code text)
language sql stable security definer set search_path = public as $$
  select p.full_name, c.title, ce.hours, ce.issued_at, ce.code
  from public.certificates ce
  join public.profiles p on p.id = ce.user_id
  join public.courses c on c.id = ce.course_id
  where ce.code = upper(trim(cert_code));
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- Mais assistidos nos últimos 30 dias (sem expor quem assistiu)
create or replace function public.trending_courses(lim int default 10)
returns table (course_id uuid, learners bigint)
language sql stable security definer set search_path = public as $$
  select l.course_id, count(distinct lp.user_id) as learners
  from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
  where lp.completed_at > now() - interval '30 days' and public.has_course_access(l.course_id)
  group by l.course_id order by learners desc limit lim;
$$;

-- Relatório de aprendizagem: progresso por colaborador × curso relevante
-- (cursos da trilha da função, atribuídos ou já iniciados). Admin vê todos; gestor, a equipe.
create or replace function public.learning_report(only_user uuid default null)
returns table (user_id uuid, course_id uuid, title text, slug text, total_lessons int, done_lessons int,
               last_activity timestamptz, assigned boolean, due_date date, in_trail boolean,
               certificate_id uuid, best_exam int, exam_passed boolean)
language sql stable security definer set search_path = public as $$
  with people as (
    select p.id, p.job_role_id from public.profiles p
    where (only_user is null or p.id = only_user) and public.can_view_user(p.id)
  ),
  lc as (select l.course_id, count(*)::int n from public.lessons l group by 1),
  prog as (select lp.user_id, l.course_id, count(*)::int n, max(lp.completed_at) last
           from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id group by 1, 2),
  trailc as (select distinct tj.job_role_id, tc.course_id from public.trail_courses tc
             join public.trail_job_roles tj on tj.trail_id = tc.trail_id),
  pairs as (
    select pe.id as user_id, t.course_id from people pe join trailc t on t.job_role_id = pe.job_role_id
    union select a.user_id, a.course_id from public.assignments a join people pe on pe.id = a.user_id
    union select pr.user_id, pr.course_id from prog pr join people pe on pe.id = pr.user_id
  ),
  exams as (select q.course_id, a.user_id, max(a.score)::int best, bool_or(a.passed) passed
            from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id where q.kind = 'exam' group by 1, 2)
  select pa.user_id, c.id, c.title, c.slug, coalesce(lc.n, 0), coalesce(pr.n, 0), pr.last,
         a.id is not null, a.due_date,
         exists (select 1 from people pe join trailc t on t.job_role_id = pe.job_role_id where pe.id = pa.user_id and t.course_id = c.id),
         ce.id, ex.best, ex.passed
  from pairs pa
  join public.courses c on c.id = pa.course_id and c.is_published
  left join lc on lc.course_id = c.id
  left join prog pr on pr.user_id = pa.user_id and pr.course_id = c.id
  left join public.assignments a on a.user_id = pa.user_id and a.course_id = c.id
  left join public.certificates ce on ce.user_id = pa.user_id and ce.course_id = c.id
  left join exams ex on ex.user_id = pa.user_id and ex.course_id = c.id
  order by c.title;
$$;

-- ---------------------------------------------------------------------
-- PDI — PLANO DE DESENVOLVIMENTO INDIVIDUAL
-- ---------------------------------------------------------------------
create table if not exists public.development_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  status      text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists plans_user_idx on public.development_plans (user_id);

create table if not exists public.plan_goals (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.development_plans(id) on delete cascade,
  title        text not null,
  description  text,
  due_date     date,
  course_id    uuid references public.courses(id) on delete set null,
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  completed_at timestamptz,
  position     int not null default 0
);

create table if not exists public.plan_notes (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.development_plans(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create or replace function public.plan_owner(pid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.development_plans where id = pid;
$$;

-- O colaborador só muda o status das próprias metas
create or replace function public.protect_goal()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid := public.plan_owner(new.plan_id);
begin
  if auth.uid() is not null and not public.is_admin() and not public.is_manager_of(owner) then
    new.title := old.title; new.description := old.description; new.due_date := old.due_date;
    new.course_id := old.course_id; new.position := old.position; new.plan_id := old.plan_id;
  end if;
  new.completed_at := case when new.status = 'done' then coalesce(old.completed_at, now()) else null end;
  return new;
end $$;
drop trigger if exists plan_goals_protect on public.plan_goals;
create trigger plan_goals_protect before update on public.plan_goals
  for each row execute function public.protect_goal();

-- ---------------------------------------------------------------------
-- BIBLIOTECA
-- ---------------------------------------------------------------------
create table if not exists public.library_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text,
  description text,
  cover_url   text,
  file_url    text,
  category    text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- COMUNIDADE
-- ---------------------------------------------------------------------
create table if not exists public.spaces (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text,
  admin_only_posts boolean not null default false,
  position         int not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_space_idx on public.posts (space_id, pinned desc, created_at desc);

create or replace function public.protect_post_pin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then null;
  elsif tg_op = 'INSERT' then
    if new.pinned and not public.is_admin() then new.pinned := false; end if;
  elsif new.pinned is distinct from old.pinned and not public.is_admin() then
    new.pinned := old.pinned;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists posts_protect_pin on public.posts;
create trigger posts_protect_pin before insert or update on public.posts
  for each row execute function public.protect_post_pin();

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------
-- EVENTOS (agenda)
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  host         text,  -- ex.: "Mentor Carlos Souza"
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,
  meeting_url  text,
  cover_url    text,
  is_published boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists events_starts_idx on public.events (starts_at);

create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- =====================================================================
-- SEGURANÇA (Row Level Security)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['job_roles','profiles','categories','instructors','courses','course_job_roles',
    'course_instructors','modules','lessons','trails','trail_job_roles','trail_courses','assignments',
    'lesson_progress','quizzes','quiz_questions','quiz_options','quiz_attempts','certificates',
    'development_plans','plan_goals','plan_notes','library_items','spaces','posts','comments','post_likes',
    'events','event_rsvps'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Leitura geral + escrita só do admin
do $$
declare t text;
begin
  foreach t in array array['job_roles','categories','instructors','course_instructors','library_items','spaces'] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- Perfis
create policy profiles_select on public.profiles for select to authenticated using (public.can_view_user(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated using (public.is_admin());

-- Cursos e conteúdo: só o que o colaborador pode acessar
create policy courses_select on public.courses for select to authenticated using (public.has_course_access(id));
create policy courses_admin on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy course_roles_select on public.course_job_roles for select to authenticated using (true);
create policy course_roles_admin on public.course_job_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy modules_select on public.modules for select to authenticated using (public.has_course_access(course_id));
create policy modules_admin on public.modules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lessons_select on public.lessons for select to authenticated using (public.has_course_access(course_id));
create policy lessons_admin on public.lessons for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Trilhas: o colaborador vê as da sua função
create policy trails_select on public.trails for select to authenticated using (
  public.is_admin() or exists (select 1 from public.trail_job_roles tj where tj.trail_id = trails.id and tj.job_role_id = public.my_job_role())
  or exists (select 1 from public.profiles p join public.trail_job_roles tj on tj.job_role_id = p.job_role_id
             where tj.trail_id = trails.id and public.is_manager_of(p.id)));
create policy trails_admin on public.trails for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy trail_roles_select on public.trail_job_roles for select to authenticated using (true);
create policy trail_roles_admin on public.trail_job_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy trail_courses_select on public.trail_courses for select to authenticated using (true);
create policy trail_courses_admin on public.trail_courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Atribuições: admin ou gestor do colaborador
create policy assignments_select on public.assignments for select to authenticated using (public.can_view_user(user_id));
create policy assignments_write on public.assignments for all to authenticated
  using (public.is_admin() or public.is_manager_of(user_id)) with check (public.is_admin() or public.is_manager_of(user_id));

-- Progresso
create policy progress_select on public.lesson_progress for select to authenticated using (public.can_view_user(user_id));
create policy progress_insert on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.has_course_access((select l.course_id from public.lessons l where l.id = lesson_id)));
create policy progress_delete on public.lesson_progress for delete to authenticated using (user_id = auth.uid());

-- Avaliações (gabarito só para admin; colaborador usa get_quiz/submit_quiz)
create policy quizzes_select on public.quizzes for select to authenticated
  using ((is_published and public.has_course_access(course_id)) or public.is_admin());
create policy quizzes_admin on public.quizzes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy questions_admin on public.quiz_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy options_admin on public.quiz_options for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy attempts_select on public.quiz_attempts for select to authenticated using (public.can_view_user(user_id));
create policy attempts_admin_delete on public.quiz_attempts for delete to authenticated using (public.is_admin());

-- Certificados (emitidos só pela função issue_certificate)
create policy certificates_select on public.certificates for select to authenticated using (public.can_view_user(user_id));
create policy certificates_admin_delete on public.certificates for delete to authenticated using (public.is_admin());

-- PDI
create policy plans_select on public.development_plans for select to authenticated using (public.can_view_user(user_id));
create policy plans_write on public.development_plans for all to authenticated
  using (public.is_admin() or public.is_manager_of(user_id)) with check (public.is_admin() or public.is_manager_of(user_id));
create policy goals_select on public.plan_goals for select to authenticated using (public.can_view_user(public.plan_owner(plan_id)));
create policy goals_update on public.plan_goals for update to authenticated
  using (public.can_view_user(public.plan_owner(plan_id))) with check (public.can_view_user(public.plan_owner(plan_id)));
create policy goals_insert on public.plan_goals for insert to authenticated
  with check (public.is_admin() or public.is_manager_of(public.plan_owner(plan_id)));
create policy goals_delete on public.plan_goals for delete to authenticated
  using (public.is_admin() or public.is_manager_of(public.plan_owner(plan_id)));
create policy notes_select on public.plan_notes for select to authenticated using (public.can_view_user(public.plan_owner(plan_id)));
create policy notes_insert on public.plan_notes for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_user(public.plan_owner(plan_id)));
create policy notes_delete on public.plan_notes for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- Comunidade
create policy posts_select on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and (public.is_admin() or exists (select 1 from public.spaces s where s.id = space_id and not s.admin_only_posts)));
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy posts_delete on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_admin());
create policy comments_select on public.comments for select to authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (author_id = auth.uid() or public.is_admin());
create policy likes_select on public.post_likes for select to authenticated using (true);
create policy likes_insert on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Eventos
create policy events_select on public.events for select to authenticated using (is_published or public.is_admin());
create policy events_admin on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy rsvps_select on public.event_rsvps for select to authenticated using (true);
create policy rsvps_insert on public.event_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy rsvps_delete on public.event_rsvps for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- Funções internas não precisam ser chamadas por visitantes
revoke execute on function public.get_quiz(uuid), public.submit_quiz(uuid, jsonb), public.issue_certificate(uuid),
  public.trending_courses(int), public.learning_report(uuid) from anon;

-- =====================================================================
-- DADOS INICIAIS
-- =====================================================================
insert into public.spaces (slug, name, description, admin_only_posts, position) values
  ('avisos',       'Avisos',        'Comunicados oficiais da empresa',       true,  0),
  ('geral',        'Geral',         'Converse com os colegas',               false, 1),
  ('apresentacoes','Apresentações', 'Chegou agora? Conte quem você é',       false, 2),
  ('duvidas',      'Dúvidas',       'Pergunte e ajude os colegas',           false, 3),
  ('conquistas',   'Conquistas',    'Compartilhe certificados e resultados', false, 4)
on conflict (slug) do nothing;

insert into public.categories (name, position) values
  ('Integração', 0), ('Vendas', 1), ('Atendimento', 2), ('Liderança', 3), ('Ferramentas', 4)
on conflict (name) do nothing;

-- =====================================================================
-- DEPOIS DE CRIAR SUA CONTA, torne-se administrador(a):
--   update public.profiles set role = 'admin' where email = 'seu@email.com';
-- =====================================================================
