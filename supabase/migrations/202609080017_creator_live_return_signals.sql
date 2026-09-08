-- App-owned Creator Live return signals.
-- Signals are generated only for followers of a verified, published Creator
-- when a public session becomes Live. They contain no gameplay or funds data.

begin;

create table if not exists public.return_signal_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  creator_live_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.return_signals (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.creator_sessions(id) on delete cascade,
  signal_type text not null default 'creator_live',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint return_signals_not_self check (recipient_id <> creator_id),
  constraint return_signals_type_check check (signal_type = 'creator_live'),
  constraint return_signals_unique unique (recipient_id, session_id, signal_type)
);

create index if not exists return_signals_recipient_created_idx
  on public.return_signals (recipient_id, created_at desc);

create or replace function public.remove_follows_on_user_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  delete from public.return_signals
   where (recipient_id = new.blocker_id and creator_id = new.blocked_id)
      or (recipient_id = new.blocked_id and creator_id = new.blocker_id);
  return new;
end;
$$;

revoke all on function public.remove_follows_on_user_block() from public, anon, authenticated;

delete from public.return_signals s
using public.user_blocks b
where (s.recipient_id = b.blocker_id and s.creator_id = b.blocked_id)
   or (s.recipient_id = b.blocked_id and s.creator_id = b.blocker_id);

alter table public.return_signal_preferences enable row level security;
alter table public.return_signals enable row level security;

drop policy if exists "return_signal_preferences_select_own" on public.return_signal_preferences;
create policy "return_signal_preferences_select_own"
  on public.return_signal_preferences for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "return_signal_preferences_insert_own" on public.return_signal_preferences;
create policy "return_signal_preferences_insert_own"
  on public.return_signal_preferences for insert to authenticated
  with check (auth.uid() = user_id and public.is_active_profile(user_id));

drop policy if exists "return_signal_preferences_update_own" on public.return_signal_preferences;
create policy "return_signal_preferences_update_own"
  on public.return_signal_preferences for update to authenticated
  using (auth.uid() = user_id and public.is_active_profile(user_id))
  with check (auth.uid() = user_id and public.is_active_profile(user_id));

drop policy if exists "return_signals_select_own" on public.return_signals;
create policy "return_signals_select_own"
  on public.return_signals for select to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "return_signals_mark_read_own" on public.return_signals;
create policy "return_signals_mark_read_own"
  on public.return_signals for update to authenticated
  using (auth.uid() = recipient_id and public.is_active_profile(recipient_id))
  with check (auth.uid() = recipient_id and public.is_active_profile(recipient_id));

create or replace function public.protect_return_signal_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.recipient_id is distinct from old.recipient_id
    or new.creator_id is distinct from old.creator_id
    or new.session_id is distinct from old.session_id
    or new.signal_type is distinct from old.signal_type
    or new.created_at is distinct from old.created_at
    or new.read_at is null
  then
    raise exception 'return signal immutable fields cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_return_signal_update() from public, anon, authenticated;

drop trigger if exists return_signals_protect_update on public.return_signals;
create trigger return_signals_protect_update
  before update on public.return_signals
  for each row execute function public.protect_return_signal_update();

create or replace function public.create_creator_live_return_signals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'live' or new.visibility <> 'public'
    or (tg_op = 'UPDATE' and old.status = 'live' and old.visibility = 'public')
  then
    return new;
  end if;

  insert into public.return_signals (recipient_id, creator_id, session_id, signal_type)
  select f.follower_id, new.creator_id, new.id, 'creator_live'
  from public.follows f
  join public.creator_profiles cp
    on cp.user_id = new.creator_id
   and cp.verification_status = 'verified'
   and cp.profile_status = 'published'
  left join public.return_signal_preferences pref on pref.user_id = f.follower_id
  where f.following_id = new.creator_id
    and coalesce(pref.creator_live_enabled, true)
    and public.is_active_profile(f.follower_id)
    and not public.is_blocked_pair(f.follower_id, new.creator_id)
  on conflict (recipient_id, session_id, signal_type) do nothing;

  return new;
end;
$$;

revoke all on function public.create_creator_live_return_signals() from public, anon, authenticated;

drop trigger if exists creator_sessions_create_live_return_signals on public.creator_sessions;
create trigger creator_sessions_create_live_return_signals
  after insert or update of status, visibility on public.creator_sessions
  for each row execute function public.create_creator_live_return_signals();

revoke all on table public.return_signal_preferences from public, anon, authenticated;
revoke all on table public.return_signals from public, anon, authenticated;
grant select, insert, update on table public.return_signal_preferences to authenticated;
grant select, update on table public.return_signals to authenticated;

comment on table public.return_signals is
  'In-app Creator Live signals for measurable follow-to-return journeys; no gameplay, funds, KYC/AML, wagering or settlement data.';

commit;
