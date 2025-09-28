-- Rooms
create table rooms (
  id text primary key default gen_random_uuid(),
  host_id text not null,
  last_activity_at timestamptz default now()
);

-- Pre-key bundles (one per room)
create table prekey_bundles (
  room_id text references rooms(id) on delete cascade,
  client_id uuid not null,
  identity_key text not null,
  signed_prekey_id int not null,
  signed_prekey_pub text not null,
  signed_prekey_sig text not null,
  registration_id int not null,
  created_at timestamptz default now(),
  primary key (room_id, client_id)
);

-- One-time pre-keys
create table one_time_prekeys (
  room_id text references rooms(id) on delete cascade,
  client_id uuid not null,
  id int not null,
  pub text not null,
  primary key (room_id, client_id, id)
);

-- Messages (ciphertext only)
create table messages (
  room_id text references rooms(id) on delete cascade,
  sender text not null,
  recipient text, -- null = broadcast
  payload text not null, -- base64-encoded ciphertext blob
  updated_at timestamptz default now(),
  primary key (room_id, sender, recipient)
);

-- Room activity
create or replace function update_room_activity()
returns trigger as $$
begin
  update rooms
  set last_activity_at = now()
  where id = NEW.room_id;
  return NEW;
end;
$$ language plpgsql;

create trigger bump_room_activity
after insert or update on messages
for each row
execute function update_room_activity();

-- Cleanup inactive rooms
create or replace function cleanup_inactive_rooms()
returns void
language plpgsql
as $$
begin
  delete from rooms
  where last_activity_at < now() - interval '30 minutes';
end;
$$;

select cron.schedule(
  'cleanup_inactive_rooms',      -- job name
  '*/5 * * * *',                 -- cron syntax: every 5 min
  $$ call cleanup_inactive_rooms(); $$
);
