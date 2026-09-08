-- Keep the global Creator Live signal preference behaviorally correct.
-- Muting removes existing app-owned Live signals; enabling restores only
-- currently eligible signals for followed Creators whose per-Creator alerts remain enabled.
-- No gameplay, wallet, KYC/AML, wagering or settlement data is involved.

begin;

create or replace function public.create_live_signals_on_preference_enable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Global mute must take effect immediately, including signals that already exist.
  if not new.creator_live_enabled then
    delete from public.return_signals
     where recipient_id = new.user_id
       and signal_type = 'creator_live';
    return new;
  end if;

  -- No work for an already-enabled preference or an inactive account.
  if (tg_op = 'UPDATE' and old.creator_live_enabled)
    or not public.is_active_profile(new.user_id)
  then
    return new;
  end if;

  -- Enabling restores only currently valid Live signals and preserves
  -- per-Creator mute choices introduced by migration 025.
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

comment on function public.create_live_signals_on_preference_enable() is
  'Synchronizes global Creator Live signal preference: mute deletes existing app-owned Live signals; enable restores only eligible current signals while respecting per-Creator alert preferences.';

commit;
