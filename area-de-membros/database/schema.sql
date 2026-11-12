-- =====================================================================
-- ACADEMIA PESTX — esquema do banco (Neon / Postgres)
-- Multi-empresa: cada empresa do PestX (empresas.id) é um "tenant" aqui.
-- Colaboradores, funções, trilhas, cursos, quiz/prova, certificados,
-- PDI (plano de desenvolvimento), biblioteca, comunidade e eventos.
-- Cole tudo no Neon → SQL Editor → Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- AUTENTICAÇÃO (login próprio do app)
-- O app conecta como dono do banco e, a cada consulta de um colaborador,
-- troca para o papel "authenticated" com o id dele. Assim as regras de
-- acesso (RLS) abaixo valem para tudo o que ele vê e altera.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  execute format('grant anon, authenticated to %I', current_user);
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  password_hash      text,             -- scrypt; nulo até a pessoa criar a senha
  raw_user_meta_data jsonb not null default '{}',
  last_sign_in_at    timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists auth.sessions (
  token_hash text primary key,        -- sha256 do token guardado no cookie
  user_id    uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on auth.sessions (user_id);

create table if not exists auth.tokens (
  token_hash text primary key,        -- sha256 do token enviado por e-mail
  user_id    uuid not null references auth.users(id) on delete cascade,
  purpose    text not null check (purpose in ('invite', 'recovery')),
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Quem está fazendo a consulta (preenchido pelo app a cada transação)
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- ---------------------------------------------------------------------
-- EMPRESAS (o id é o mesmo de empresas.id no PestX)
-- ---------------------------------------------------------------------
create table if not exists public.companies (
  id                uuid primary key,
  name              text not null,
  pestx             jsonb not null default '{}', -- dados lidos do PestX no login (nome, logo, CNPJ, responsável legal)
  -- personalizações feitas na Academia (vazio = usa o que vem do PestX)
  custom_name       text,
  logo_url          text,
  brand_color       text,
  signer_name       text,
  signer_title      text,
  signature_url     text,
  cnpj              text,
  billing_email     text,
  asaas_customer_id text,
  is_platform       boolean not null default false, -- a "empresa" PestX do super admin
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

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
alter table public.profiles add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.profiles add column if not exists is_super_admin boolean not null default false;
alter table public.profiles add column if not exists pestx_user_id uuid;
create unique index if not exists profiles_pestx_idx on public.profiles (pestx_user_id) where pestx_user_id is not null;
create index if not exists profiles_company_idx on public.profiles (company_id);
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Empresa de quem está consultando
create or replace function public.my_company()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid();
$$;
create or replace function public.company_of(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = uid;
$$;

alter table public.job_roles add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.job_roles alter column company_id set default public.my_company();
alter table public.job_roles drop constraint if exists job_roles_name_key;
create unique index if not exists job_roles_company_name_idx on public.job_roles (company_id, name);
create index if not exists profiles_manager_idx on public.profiles (manager_id);
create index if not exists profiles_job_role_idx on public.profiles (job_role_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, company_id)
  values (new.id, lower(new.email),
          coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
          nullif(new.raw_user_meta_data->>'company_id', '')::uuid)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active and company_id is not null);
$$;

-- Super admin do PestX: cuida do marketplace (cursos oferecidos para todas as empresas)
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_super_admin and is_active);
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
  select uid = auth.uid() or (public.is_admin() and public.company_of(uid) = public.my_company()) or public.is_manager_of(uid);
$$;

-- Admin da empresa ou gestor direto
create or replace function public.can_manage_user(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (public.is_admin() and public.company_of(uid) = public.my_company()) or public.is_manager_of(uid);
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
  if auth.uid() is not null then
    -- empresa, super admin e vínculo com o PestX só mudam pelo login (servidor)
    new.company_id := old.company_id;
    new.is_super_admin := old.is_super_admin;
    new.pestx_user_id := old.pestx_user_id;
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
  where p.is_active and p.company_id = public.my_company();
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
alter table public.categories add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.categories alter column company_id set default public.my_company();
alter table public.categories drop constraint if exists categories_name_key;
create unique index if not exists categories_company_name_idx on public.categories (company_id, name);

create table if not exists public.instructors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  title      text,           -- ex.: "Diretor Comercial"
  avatar_url text,
  bio        text,
  created_at timestamptz not null default now()
);
alter table public.instructors add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.instructors alter column company_id set default public.my_company();

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
-- company_id = dona do curso. Curso do marketplace: is_marketplace = true e company_id nulo (é do PestX).
alter table public.courses add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.courses alter column company_id set default public.my_company();
alter table public.courses add column if not exists is_marketplace boolean not null default false;
alter table public.courses add column if not exists price numeric(10,2);
alter table public.courses add column if not exists material_url text; -- apostila / PDF do curso
create index if not exists courses_company_idx on public.courses (company_id);

-- Cursos do marketplace que a empresa comprou (ou ganhou do PestX)
create table if not exists public.course_licenses (
  company_id uuid not null references public.companies(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  audience   text not null default 'all' check (audience in ('all', 'trail')), -- trail = só por trilha/atribuição
  order_id   uuid,
  created_at timestamptz not null default now(),
  primary key (company_id, course_id)
);

-- Compras no marketplace (cobrança no Asaas)
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  course_id        uuid not null references public.courses(id) on delete restrict,
  amount           numeric(10,2) not null,
  status           text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  asaas_payment_id text unique,
  invoice_url      text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);
create index if not exists orders_company_idx on public.orders (company_id, created_at desc);

-- Pode editar o curso: admin da empresa dona, ou super admin (cursos do marketplace)
create or replace function public.can_edit_course(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses co where co.id = c and (
    (co.company_id = public.my_company() and not co.is_marketplace and public.is_admin())
    or (co.is_marketplace and public.is_super_admin())));
$$;

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
alter table public.trails add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.trails alter column company_id set default public.my_company();
create or replace function public.trail_company(tid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.trails where id = tid;
$$;

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
  select exists (
    select 1 from public.courses co
    join public.profiles me on me.id = auth.uid() and me.is_active
    where co.id = c and (
      (co.is_marketplace and me.is_super_admin)
      or (me.role = 'admin' and not co.is_marketplace and co.company_id = me.company_id)
      or (me.role = 'admin' and co.is_marketplace
          and exists (select 1 from public.course_licenses li where li.course_id = c and li.company_id = me.company_id))
      or (
        -- o curso está no "alcance" da empresa: próprio e publicado, ou comprado no marketplace
        ((not co.is_marketplace and co.company_id = me.company_id and co.is_published)
          or (co.is_marketplace and exists (select 1 from public.course_licenses li where li.course_id = c and li.company_id = me.company_id)))
        and (
          (not co.is_marketplace and co.audience = 'all')
          or (not co.is_marketplace and exists (select 1 from public.course_job_roles r where r.course_id = c and r.job_role_id = me.job_role_id))
          or (co.is_marketplace and exists (select 1 from public.course_licenses li where li.course_id = c and li.company_id = me.company_id and li.audience = 'all'))
          or exists (select 1 from public.trail_courses tc
                     join public.trail_job_roles tj on tj.trail_id = tc.trail_id
                     join public.trails t on t.id = tc.trail_id and t.company_id = me.company_id
                     where tc.course_id = c and tj.job_role_id = me.job_role_id)
          or exists (select 1 from public.assignments a where a.course_id = c and a.user_id = me.id)
        )
      )
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

create or replace function public.quiz_course(qid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select course_id from public.quizzes where id = qid;
$$;

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
  select * into q from public.quizzes where id = qid and (is_published or public.can_edit_course(course_id));
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
-- empresa que emitiu (a do colaborador no momento da conclusão)
alter table public.certificates add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.certificates alter column company_id set default public.my_company();

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
drop function if exists public.verify_certificate(text);
create or replace function public.verify_certificate(cert_code text)
returns table (full_name text, course_title text, hours numeric, issued_at timestamptz, code text, company_name text, company_id uuid)
language sql stable security definer set search_path = public as $$
  select p.full_name, c.title, ce.hours, ce.issued_at, ce.code,
         coalesce(co.custom_name, co.pestx->>'name', co.name), co.id
  from public.certificates ce
  join public.profiles p on p.id = ce.user_id
  join public.courses c on c.id = ce.course_id
  left join public.companies co on co.id = coalesce(ce.company_id, p.company_id)
  where ce.code = upper(trim(cert_code));
$$;

-- Vitrine do marketplace para o admin da empresa (mostra também o que ainda não comprou)
create or replace function public.marketplace_catalog()
returns table (id uuid, slug text, title text, subtitle text, description text, cover_url text,
               workload_hours numeric, price numeric, is_published boolean, lessons int, modules int,
               licensed boolean, pending_invoice text)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.title, c.subtitle, c.description, c.cover_url, c.workload_hours, c.price, c.is_published,
    (select count(*)::int from public.lessons l where l.course_id = c.id),
    (select count(*)::int from public.modules m where m.course_id = c.id),
    exists (select 1 from public.course_licenses li where li.course_id = c.id and li.company_id = public.my_company()),
    (select o.invoice_url from public.orders o where o.course_id = c.id and o.company_id = public.my_company()
       and o.status = 'pending' order by o.created_at desc limit 1)
  from public.courses c
  where c.is_marketplace and (c.is_published or public.is_super_admin())
    and (public.is_admin() or public.is_super_admin())
  order by c.position, c.title;
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
  if auth.uid() is not null and not public.can_manage_user(owner) then
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
alter table public.library_items add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.library_items alter column company_id set default public.my_company();

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
alter table public.spaces add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.spaces alter column company_id set default public.my_company();
alter table public.spaces drop constraint if exists spaces_slug_key;
create unique index if not exists spaces_company_slug_idx on public.spaces (company_id, slug);

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
alter table public.events add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.events alter column company_id set default public.my_company();

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
    'events','event_rsvps','companies','course_licenses','orders'] loop
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

-- Tabelas da empresa: leitura de quem é da empresa + escrita só do admin dela
do $$
declare t text;
begin
  foreach t in array array['job_roles','library_items','spaces'] loop
    execute format('create policy %I on public.%I for select to authenticated using (company_id = public.my_company())', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin() and company_id = public.my_company()) with check (public.is_admin() and company_id = public.my_company())', t || '_admin', t);
  end loop;
end $$;

-- Categorias e mentores: os da empresa + os usados nos cursos do marketplace que ela acessa
create policy categories_select on public.categories for select to authenticated using (
  company_id = public.my_company()
  or exists (select 1 from public.courses c where c.category_id = categories.id and c.is_marketplace));
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin() and company_id = public.my_company()) with check (public.is_admin() and company_id = public.my_company());
create policy instructors_select on public.instructors for select to authenticated using (
  company_id = public.my_company()
  or exists (select 1 from public.course_instructors ci where ci.instructor_id = instructors.id and public.has_course_access(ci.course_id)));
create policy instructors_admin on public.instructors for all to authenticated
  using (public.is_admin() and company_id = public.my_company()) with check (public.is_admin() and company_id = public.my_company());
create policy course_instructors_select on public.course_instructors for select to authenticated using (public.has_course_access(course_id));
create policy course_instructors_admin on public.course_instructors for all to authenticated
  using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

-- Empresas, licenças e pedidos (gravados pelo servidor; aqui só a leitura)
create policy companies_select on public.companies for select to authenticated using (id = public.my_company() or public.is_super_admin());
create policy licenses_select on public.course_licenses for select to authenticated using (company_id = public.my_company() or public.is_super_admin());
create policy licenses_update on public.course_licenses for update to authenticated
  using (public.is_admin() and company_id = public.my_company()) with check (public.is_admin() and company_id = public.my_company());
create policy orders_select on public.orders for select to authenticated
  using ((public.is_admin() and company_id = public.my_company()) or public.is_super_admin());

-- Perfis (só da própria empresa)
create policy profiles_select on public.profiles for select to authenticated using (public.can_view_user(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or (public.is_admin() and company_id = public.my_company()))
  with check (id = auth.uid() or (public.is_admin() and company_id = public.my_company()));
create policy profiles_admin_delete on public.profiles for delete to authenticated using (public.is_admin() and company_id = public.my_company());

-- Cursos e conteúdo: só o que o colaborador pode acessar; edita o admin da empresa dona (ou o super admin, no marketplace)
create policy courses_select on public.courses for select to authenticated using (public.has_course_access(id));
create policy courses_admin on public.courses for all to authenticated
  using ((public.is_admin() and not is_marketplace and company_id = public.my_company()) or (is_marketplace and company_id is null and public.is_super_admin()))
  with check ((public.is_admin() and not is_marketplace and company_id = public.my_company()) or (is_marketplace and company_id is null and public.is_super_admin()));
create policy course_roles_select on public.course_job_roles for select to authenticated using (public.has_course_access(course_id));
create policy course_roles_admin on public.course_job_roles for all to authenticated
  using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));
create policy modules_select on public.modules for select to authenticated using (public.has_course_access(course_id));
create policy modules_admin on public.modules for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));
create policy lessons_select on public.lessons for select to authenticated using (public.has_course_access(course_id));
create policy lessons_admin on public.lessons for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

-- Trilhas: o colaborador vê as da sua função (só da empresa)
create policy trails_select on public.trails for select to authenticated using (
  company_id = public.my_company() and (
    public.is_admin() or exists (select 1 from public.trail_job_roles tj where tj.trail_id = trails.id and tj.job_role_id = public.my_job_role())
    or exists (select 1 from public.profiles p join public.trail_job_roles tj on tj.job_role_id = p.job_role_id
               where tj.trail_id = trails.id and public.is_manager_of(p.id))));
create policy trails_admin on public.trails for all to authenticated
  using (public.is_admin() and company_id = public.my_company()) with check (public.is_admin() and company_id = public.my_company());
create policy trail_roles_select on public.trail_job_roles for select to authenticated
  using (public.trail_company(trail_id) = public.my_company());
create policy trail_roles_admin on public.trail_job_roles for all to authenticated
  using (public.is_admin() and public.trail_company(trail_id) = public.my_company())
  with check (public.is_admin() and public.trail_company(trail_id) = public.my_company());
create policy trail_courses_select on public.trail_courses for select to authenticated
  using (public.trail_company(trail_id) = public.my_company());
create policy trail_courses_admin on public.trail_courses for all to authenticated
  using (public.is_admin() and public.trail_company(trail_id) = public.my_company())
  with check (public.is_admin() and public.has_course_access(course_id)
              and public.trail_company(trail_id) = public.my_company());

-- Atribuições: admin ou gestor do colaborador
create policy assignments_select on public.assignments for select to authenticated using (public.can_view_user(user_id));
create policy assignments_write on public.assignments for all to authenticated
  using (public.can_manage_user(user_id)) with check (public.can_manage_user(user_id) and public.has_course_access(course_id));

-- Progresso
create policy progress_select on public.lesson_progress for select to authenticated using (public.can_view_user(user_id));
create policy progress_insert on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.has_course_access((select l.course_id from public.lessons l where l.id = lesson_id)));
create policy progress_delete on public.lesson_progress for delete to authenticated using (user_id = auth.uid());

-- Avaliações (gabarito só para admin; colaborador usa get_quiz/submit_quiz)
create policy quizzes_select on public.quizzes for select to authenticated
  using ((is_published and public.has_course_access(course_id)) or public.can_edit_course(course_id));
create policy quizzes_admin on public.quizzes for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));
create policy questions_admin on public.quiz_questions for all to authenticated
  using (public.can_edit_course(public.quiz_course(quiz_id))) with check (public.can_edit_course(public.quiz_course(quiz_id)));
create policy options_admin on public.quiz_options for all to authenticated
  using (public.can_edit_course(public.quiz_course((select q.quiz_id from public.quiz_questions q where q.id = question_id))))
  with check (public.can_edit_course(public.quiz_course((select q.quiz_id from public.quiz_questions q where q.id = question_id))));
create policy attempts_select on public.quiz_attempts for select to authenticated using (public.can_view_user(user_id));
create policy attempts_admin_delete on public.quiz_attempts for delete to authenticated using (public.is_admin() and public.can_view_user(user_id));

-- Certificados (emitidos só pela função issue_certificate)
create policy certificates_select on public.certificates for select to authenticated using (public.can_view_user(user_id));
create policy certificates_admin_delete on public.certificates for delete to authenticated using (public.is_admin() and public.can_view_user(user_id));

-- PDI
create policy plans_select on public.development_plans for select to authenticated using (public.can_view_user(user_id));
create policy plans_write on public.development_plans for all to authenticated
  using (public.can_manage_user(user_id)) with check (public.can_manage_user(user_id));
create policy goals_select on public.plan_goals for select to authenticated using (public.can_view_user(public.plan_owner(plan_id)));
create policy goals_update on public.plan_goals for update to authenticated
  using (public.can_view_user(public.plan_owner(plan_id))) with check (public.can_view_user(public.plan_owner(plan_id)));
create policy goals_insert on public.plan_goals for insert to authenticated
  with check (public.can_manage_user(public.plan_owner(plan_id)));
create policy goals_delete on public.plan_goals for delete to authenticated
  using (public.can_manage_user(public.plan_owner(plan_id)));
create policy notes_select on public.plan_notes for select to authenticated using (public.can_view_user(public.plan_owner(plan_id)));
create policy notes_insert on public.plan_notes for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_user(public.plan_owner(plan_id)));
create policy notes_delete on public.plan_notes for delete to authenticated using (author_id = auth.uid() or public.can_manage_user(public.plan_owner(plan_id)));

-- Comunidade (só da empresa)
create policy posts_select on public.posts for select to authenticated
  using (exists (select 1 from public.spaces s where s.id = space_id and s.company_id = public.my_company()));
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.spaces s where s.id = space_id
    and s.company_id = public.my_company() and (public.is_admin() or not s.admin_only_posts)));
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or (public.is_admin() and exists (select 1 from public.spaces s where s.id = space_id and s.company_id = public.my_company())))
  with check (author_id = auth.uid() or (public.is_admin() and exists (select 1 from public.spaces s where s.id = space_id and s.company_id = public.my_company())));
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or (public.is_admin() and exists (select 1 from public.spaces s where s.id = space_id and s.company_id = public.my_company())));
create policy comments_select on public.comments for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or (public.is_admin() and exists (select 1 from public.posts p where p.id = post_id)));
create policy likes_select on public.post_likes for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));
create policy likes_insert on public.post_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));
create policy likes_delete on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Eventos (só da empresa)
create policy events_select on public.events for select to authenticated
  using (company_id = public.my_company() and (is_published or public.is_admin()));
create policy events_admin on public.events for all to authenticated
  using (public.is_admin() and company_id = public.my_company()) with check (public.is_admin() and company_id = public.my_company());
create policy rsvps_select on public.event_rsvps for select to authenticated using (exists (select 1 from public.events e where e.id = event_id));
create policy rsvps_insert on public.event_rsvps for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.events e where e.id = event_id));
create policy rsvps_delete on public.event_rsvps for delete to authenticated
  using (user_id = auth.uid() or (public.is_admin() and exists (select 1 from public.events e where e.id = event_id)));

-- Funções internas não precisam ser chamadas por visitantes
revoke execute on function public.get_quiz(uuid), public.submit_quiz(uuid, jsonb), public.issue_certificate(uuid),
  public.trending_courses(int), public.learning_report(uuid), public.marketplace_catalog() from anon;

-- Permissões dos papéis usados pelo app (as linhas visíveis são filtradas pelo RLS)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant select on public.member_profiles to authenticated;
grant execute on function public.verify_certificate(text) to anon;

-- =====================================================================
-- EMPRESA NOVA: canais da comunidade e categorias padrão
-- =====================================================================
create or replace function public.seed_company(cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.spaces where company_id = cid) then
    insert into public.spaces (company_id, slug, name, description, admin_only_posts, position) values
      (cid, 'avisos',        'Avisos',        'Comunicados oficiais da empresa',       true,  0),
      (cid, 'geral',         'Geral',         'Converse com os colegas',               false, 1),
      (cid, 'apresentacoes', 'Apresentações', 'Chegou agora? Conte quem você é',       false, 2),
      (cid, 'duvidas',       'Dúvidas',       'Pergunte e ajude os colegas',           false, 3),
      (cid, 'conquistas',    'Conquistas',    'Compartilhe certificados e resultados', false, 4);
  end if;
  if not exists (select 1 from public.categories where company_id = cid) then
    insert into public.categories (company_id, name, position) values
      (cid, 'Integração', 0), (cid, 'Vendas', 1), (cid, 'Atendimento', 2), (cid, 'Liderança', 3), (cid, 'Ferramentas', 4);
  end if;
end $$;

-- Versão antiga (uma empresa só): o que foi criado antes passa a ser da primeira empresa que entrar
create or replace function public.adopt_orphans(cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set company_id = cid where company_id is null;
  update public.job_roles set company_id = cid where company_id is null;
  update public.categories set company_id = cid where company_id is null;
  update public.instructors set company_id = cid where company_id is null;
  update public.courses set company_id = cid where company_id is null and not is_marketplace;
  update public.trails set company_id = cid where company_id is null;
  update public.library_items set company_id = cid where company_id is null;
  update public.spaces set company_id = cid where company_id is null;
  update public.events set company_id = cid where company_id is null;
  update public.certificates ce set company_id = cid where ce.company_id is null;
end $$;
revoke execute on function public.seed_company(uuid), public.adopt_orphans(uuid) from public, anon, authenticated;

-- Versão do esquema aplicada (uso interno do servidor)
create table if not exists public.app_meta (key text primary key, value text not null);
revoke all on public.app_meta from anon, authenticated;
