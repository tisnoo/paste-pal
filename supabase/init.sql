-- ========================
-- room_clipboard table + policies + trigger
-- ========================

-- table for latest clipboard per room
create table if not exists public.room_clipboard (
  room_id    text primary key,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

-- enable Row Level Security
alter table public.room_clipboard enable row level security;

-- demo policies (public read/write). tighten later if you add auth.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'room_clipboard' and policyname = 'public read'
  ) then
    create policy "public read"
      on public.room_clipboard for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'room_clipboard' and policyname = 'public upsert'
  ) then
    create policy "public upsert"
      on public.room_clipboard for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'room_clipboard' and policyname = 'public update'
  ) then
    create policy "public update"
      on public.room_clipboard for update
      to anon
      using (true)
      with check (true);
  end if;
end$$;

-- keep updated_at fresh on UPDATEs
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_updated_at on public.room_clipboard;
create trigger trg_updated_at
before update on public.room_clipboard
for each row execute function public.set_updated_at();

-- Optional (explicit): replica identity uses the PK; good for Realtime updates
-- (Postgres does this by default when a PK exists)
alter table public.room_clipboard replica identity using index room_clipboard_pkey;

-- ========================
-- Supabase Realtime enablement
-- ========================

-- Ensure the public

alter table public.room_clipboard
  add column if not exists version int not null default 0;

create or replace function public.bump_clipboard_version()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end $$;

drop trigger if exists trg_room_clipboard_bump on public.room_clipboard;
create trigger trg_room_clipboard_bump
before update on public.room_clipboard
for each row execute function public.bump_clipboard_version();
