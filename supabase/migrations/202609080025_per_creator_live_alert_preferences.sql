-- Per-Creator control for app-owned in-app Live return signals.
-- A player can mute one Creator without breaking the follow relationship.
-- Additive only; no gameplay, wallet, KYC/AML, wagering or settlement data.

begin;

alter table public.follows
  add column if not exists live_alerts_enabled boolean not null default true;

-- New follows must point to an active, verified and published Creator. This
-- keeps the social graph and any downstream attribution fail-closed.
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows for insert to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and live_alerts_enabled
    and public.is_active_profile(follower_id)
    and public.is_active_profile(following_id)
    and public.is_approved_creator(following_id)
    and not public.is_blocked_pair(follower_id, following_id)
  );

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
    and f.live_alerts_enabled
    and coalesce(pref.creator_live_enabled, true)
    and public.is_active_profile(f.follower_id)
    and not public.is_blocked_pair(f.follower_id, new.creator_id)
  on conflict (recipient_id, session_id, signal_type) do nothing;

  return new;
end;
$$;

revoke all on function public.create_creator_live_return_signals() from public, anon, authenticated;

create or replace function public.create_live_signal_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.live_alerts_enabled
    or new.follower_id = new.following_id
    or not public.is_active_profile(new.follower_id)
    or not public.is_active_profile(new.following_id)
    or not public.is_approved_creator(new.following_id)
    or public.is_blocked_pair(new.follower_id, new.following_id)
  then
    return new;
  end if;

  insert into public.return_signals (recipient_id, creator_id, session_id, signal_type)
  select new.follower_id, new.following_id, s.id, 'creator_live'
  from public.creator_sessions s
  left join public.return_signal_preferences pref on pref.user_id = new.follower_id
  where s.creator_id = new.following_id
    and s.status = 'live'
    and s.visibility = 'public'
    and coalesce(pref.creator_live_enabled, true)
  on conflict (recipient_id, session_id, signal_type) do nothing;

  return new;
end;
$$;

revoke all on function public.create_live_signal_on_follow() from public, anon, authenticated;

create or replace function public.create_live_signals_on_preference_enable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.creator_live_enabled
    or (tg_op = 'UPDATE' and old.creator_live_enabled)
    or not public.is_active_profile(new.user_id)
  then
    return new;
  end if;

  insert into public.return_signals (recipient_id, creator_id, session_id, signal_type)
  select new.user_id, f.following_id, s.id, 'creator_live'
  from public.follows f
  join public.creator_profiles cp
    on cp.user_id = f.following_id
   and cp.verification_status = 'verified'
   and cp.profile_status = 'published'
  join public.creator_sessions s
    on s.creator_id = f.following_id
   and s.status = 'live'
   and s.visibility = 'public'
  where f.follower_id = new.user_id
    and f.live_alerts_enabled
    and public.is_active_profile(f.following_id)
    and not public.is_blocked_pair(new.user_id, f.following_id)
  on conflict (recipient_id, session_id, signal_type) do nothing;

  return new;
end;
$$;

revoke all on function public.create_live_signals_on_preference_enable() from public, anon, authenticated;

create or replace function public.set_creator_live_alert_preference(
  p_creator_id uuid,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
    or p_creator_id is null
    or p_enabled is null
    or v_user_id = p_creator_id
    or not public.is_active_profile(v_user_id)
    or not public.is_active_profile(p_creator_id)
    or not public.is_approved_creator(p_creator_id)
    or public.is_blocked_pair(v_user_id, p_creator_id)
  then
    raise exception 'Creator Live alert preference is not available' using errcode = '42501';
  end if;

  update public.follows
     set live_alerts_enabled = p_enabled
   where follower_id = v_user_id
     and following_id = p_creator_id;

  if not found then
    raise exception 'Follow relationship required' using errcode = '42501';
  end if;

  if not p_enabled then
    delete from public.return_signals
     where recipient_id = v_user_id
       and creator_id = p_creator_id
       and signal_type = 'creator_live';
  else
    insert into public.return_signals (recipient_id, creator_id, session_id, signal_type)
    select v_user_id, p_creator_id, s.id, 'creator_live'
      from public.creator_sessions s
      left join public.return_signal_preferences pref on pref.user_id = v_user_id
     where s.creator_id = p_creator_id
       and s.status = 'live'
       and s.visibility = 'public'
       and coalesce(pref.creator_live_enabled, true)
    on conflict (recipient_id, session_id, signal_type) do nothing;
  end if;

  return p_enabled;
end;
$$;

revoke all on function public.set_creator_live_alert_preference(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_creator_live_alert_preference(uuid, boolean) to authenticated;

comment on column public.follows.live_alerts_enabled is
  'Player-owned per-Creator preference for app-owned in-app Live signals.';
comment on function public.set_creator_live_alert_preference(uuid, boolean) is
  'Safely mutes or enables Live signals for one followed, approved Creator; muting preserves the follow.';

commit;
