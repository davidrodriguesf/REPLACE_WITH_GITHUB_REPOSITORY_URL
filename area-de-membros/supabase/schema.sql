-- =====================================================================
-- ÁREA DE MEMBROS + COMUNIDADE — esquema do banco (Supabase / Postgres)
-- Cole tudo no Supabase → SQL Editor → Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PERFIS (1 por usuário do Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  bio         text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  created_at  timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Cria o perfil automaticamente quando um usuário é criado no Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Impede que um aluno se promova a admin editando o próprio perfil
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor ou service role (servidor): permitido
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Somente administradores podem alterar o papel do usuário';
  end if;
  new.email := old.email; -- e-mail é controlado pelo Auth
  return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Dados públicos de membros (sem e-mail) para exibir na comunidade
create or replace view public.member_profiles as
  select id, full_name, avatar_url, bio, role, created_at from public.profiles;
revoke all on public.member_profiles from anon;
grant select on public.member_profiles to authenticated;

-- ---------------------------------------------------------------------
-- CURSOS, MÓDULOS E AULAS
-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  title               text not null,
  subtitle            text,
  description         text,
  cover_url           text,
  -- 'paid' = vendido (liberado pelo webhook da Appmax ou pelo admin)
  -- 'free' = gratuito, mas só o admin libera (o aluno pode solicitar)
  access_type         text not null default 'paid' check (access_type in ('paid', 'free')),
  checkout_url        text,             -- link do checkout da Appmax
  appmax_product_ids  text[] not null default '{}', -- IDs/SKUs dos produtos na Appmax
  is_published        boolean not null default false,
  position            int not null default 0,
  created_at          timestamptz not null default now()
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
  video_url        text,   -- YouTube, Vimeo, Panda, Bunny... (link ou embed)
  content          text,   -- texto de apoio
  attachment_url   text,   -- material complementar (PDF, planilha...)
  duration_minutes int,
  position         int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists lessons_module_idx on public.lessons (module_id, position);

-- Garante que lessons.course_id seja sempre o curso do módulo
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
-- ACESSOS (quem pode ver qual curso)
-- ---------------------------------------------------------------------
create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  source      text not null default 'admin' check (source in ('purchase', 'admin')),
  order_id    text,
  granted_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, course_id)
);
create index if not exists enrollments_user_idx on public.enrollments (user_id);

create or replace function public.has_course_access(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id = c
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Solicitações de acesso a cursos gratuitos (o admin aprova)
create table if not exists public.access_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message      text,
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------------
-- COMUNIDADE
-- ---------------------------------------------------------------------
create table if not exists public.spaces (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text,
  admin_only_posts boolean not null default false, -- ex.: "Avisos"
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
  if auth.uid() is null then
    null; -- SQL Editor / service role
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
-- EVENTOS
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,  -- "Online" ou endereço
  meeting_url  text,  -- link do Zoom / Meet / YouTube
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

-- ---------------------------------------------------------------------
-- LOG DOS WEBHOOKS (Appmax)
-- ---------------------------------------------------------------------
create table if not exists public.webhook_events (
  id         uuid primary key default gen_random_uuid(),
  provider   text not null default 'appmax',
  event      text,
  order_id   text,
  email      text,
  status     text not null default 'received', -- received | processed | ignored | error
  error      text,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists webhook_events_order_idx on public.webhook_events (order_id, event);

-- =====================================================================
-- SEGURANÇA (Row Level Security)
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.enrollments     enable row level security;
alter table public.access_requests enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.spaces          enable row level security;
alter table public.posts           enable row level security;
alter table public.comments        enable row level security;
alter table public.post_likes      enable row level security;
alter table public.events          enable row level security;
alter table public.event_rsvps     enable row level security;
alter table public.webhook_events  enable row level security;

-- Remove políticas antigas (para poder rodar o script de novo)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Perfis: o aluno vê/edita o próprio; admin vê/edita todos
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Cursos e módulos: catálogo visível (para mostrar cursos bloqueados com cadeado)
create policy courses_select on public.courses for select to authenticated
  using (is_published or public.is_admin());
create policy courses_admin on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy modules_select on public.modules for select to authenticated
  using (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy modules_admin on public.modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Aulas: só quem tem acesso ao curso
create policy lessons_select on public.lessons for select to authenticated
  using (public.has_course_access(course_id));
create policy lessons_admin on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Acessos: o aluno vê os seus; só admin (ou webhook com service role) altera
create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy enrollments_admin on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Solicitações de curso gratuito
create policy requests_select on public.access_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy requests_insert on public.access_requests for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.courses c where c.id = course_id and c.access_type = 'free' and c.is_published)
  );
create policy requests_admin on public.access_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Progresso: cada aluno o seu
create policy progress_own on public.lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_course_access(
    (select l.course_id from public.lessons l where l.id = lesson_id)));

-- Comunidade
create policy spaces_select on public.spaces for select to authenticated using (true);
create policy spaces_admin on public.spaces for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy posts_select on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = auth.uid() and (
      public.is_admin() or exists (select 1 from public.spaces s where s.id = space_id and not s.admin_only_posts)
    )
  );
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy comments_select on public.comments for select to authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy likes_select on public.post_likes for select to authenticated using (true);
create policy likes_insert on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Eventos
create policy events_select on public.events for select to authenticated
  using (is_published or public.is_admin());
create policy events_admin on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy rsvps_select on public.event_rsvps for select to authenticated using (true);
create policy rsvps_insert on public.event_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy rsvps_delete on public.event_rsvps for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Webhooks: só admin consulta (gravação é feita com a service role)
create policy webhooks_admin on public.webhook_events for select to authenticated using (public.is_admin());

-- =====================================================================
-- DADOS INICIAIS
-- =====================================================================
insert into public.spaces (slug, name, description, admin_only_posts, position) values
  ('avisos',       'Avisos',        'Comunicados oficiais da equipe',            true,  0),
  ('geral',        'Geral',         'Converse sobre qualquer assunto',           false, 1),
  ('apresentacoes','Apresentações', 'Conte quem você é e o que veio buscar',     false, 2),
  ('duvidas',      'Dúvidas',       'Pergunte e ajude outros alunos',            false, 3),
  ('conquistas',   'Conquistas',    'Compartilhe seus resultados',               false, 4)
on conflict (slug) do nothing;

-- =====================================================================
-- DEPOIS DE CRIAR SUA CONTA, torne-se administrador(a):
--   update public.profiles set role = 'admin' where email = 'seu@email.com';
-- =====================================================================
