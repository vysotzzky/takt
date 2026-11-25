create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Supabase Auth owns accounts and sessions. Profiles contain application roles.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  role text not null default 'employee' check (role in ('employee', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);

create unique index shifts_one_open_per_employee
  on public.shifts (employee_id) where ended_at is null;
create index shifts_employee_history on public.shifts (employee_id, started_at desc);
create index shifts_recent on public.shifts (started_at desc);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete restrict,
  kind text not null check (kind in ('start', 'stop')),
  request_id uuid not null unique,
  recorded_at timestamptz not null default now(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision not null check (accuracy_m between 0 and 41000000),
  photo_path text not null unique check (btrim(photo_path) <> ''),
  unique (shift_id, kind)
);

alter table public.profiles enable row level security;
alter table public.shifts enable row level security;
alter table public.evidence enable row level security;
revoke all on table public.profiles, public.shifts, public.evidence from public, anon, authenticated;
grant select on table public.profiles, public.shifts, public.evidence to authenticated;
grant select, insert, update, delete on table public.profiles, public.shifts, public.evidence to service_role;

-- The helper reads the caller's role without recursively applying the profiles policy.
create function private.can_read_employee(employee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as caller
    where caller.id = (select auth.uid())
      and caller.is_active
      and (caller.id = employee or caller.role = 'admin')
  );
$$;
revoke all on function private.can_read_employee(uuid) from public, anon, authenticated;
grant execute on function private.can_read_employee(uuid) to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (private.can_read_employee(id));

create policy shifts_select on public.shifts
  for select to authenticated
  using (private.can_read_employee(employee_id));

create policy evidence_select on public.evidence
  for select to authenticated
  using (exists (
    select 1 from public.shifts as shift
    where shift.id = evidence.shift_id
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('takt-evidence', 'takt-evidence', false, 3145728, array['image/jpeg']);

create policy takt_evidence_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'takt-evidence'
    and exists (
      select 1 from public.evidence as proof
      where proof.photo_path = storage.objects.name
    )
  );
