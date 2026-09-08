-- Close the Follow -> Live return-loop gap for Creators who are already live.
-- Additive only. No gameplay, wallet, KYC/AML, wagering or settlement data.

begin;

create or replace function public.create_live_signal_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id = new.following_id
    or not public.is_active_profile(new.follower_id)
    or not public.is_active_profile(new.following_id)
    or public.is_blocked_pair(new.follower_id, new.following_id)
  then
    return new;
  end if;

  insert into public.return_signals (recipient_id, creator_id, session_id, signal_type)
  select new.follower_id, new.following_id, s.id, 'creator_live'
  from public.creator_profiles cp
  join public.creator_sessions s
    on s.creator_id = cp.user_id
   and s.status = 'live'
   and s.visibility = 'public'
  left join public.return_signal_preferences pref
    on pref.user_id = new.follower_id
  where cp.user_id = new.following_id
    and cp.verification_status = 'verified'
    and cp.profile_status = 'published'
    and coalesce(pref.creator_live_enabled, true)
  on conflict (recipient_id, session_id, signal_type) do nothing;

  return new;
end;
$$;

revoke all on function public.create_live_signal_on_follow() from public, anon, authenticated;

drop trigger if exists follows_create_live_signal_catchup on public.follows;
create trigger follows_create_live_signal_catchup
  after insert on public.follows
  for each row execute function public.create_live_signal_on_follow();

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
    and public.is_active_profile(f.following_id)
    and not public.is_blocked_pair(new.user_id, f.following_id)
  on conflict (recipient_id, session_id, signal_type) do nothing;

  return new;
end;
$$;

revoke all on function public.create_live_signals_on_preference_enable() from public, anon, authenticated;

drop trigger if exists return_signal_preferences_live_catchup on public.return_signal_preferences;
create trigger return_signal_preferences_live_catchup
  after insert or update of creator_live_enabled on public.return_signal_preferences
  for each row execute function public.create_live_signals_on_preference_enable();

comment on function public.create_live_signal_on_follow() is
  'Creates an in-app Creator Live signal when a player follows a verified published Creator who is already live.';
comment on function public.create_live_signals_on_preference_enable() is
  'Restores eligible current Creator Live signals when a player enables Creator Live signals.';

commit;
