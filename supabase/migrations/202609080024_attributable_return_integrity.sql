-- Make LC funnel evidence event-specific and preserve legitimate post-handoff returns.
-- Observed app events remain evidence to validate, never proof of CAC, retention, GGR or ROI.

begin;

create or replace function public.enforce_product_event_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_creator uuid;
  session_status text;
  session_visibility text;
begin
  if new.creator_id is not null then
    if not public.is_approved_creator(new.creator_id) then
      raise exception 'product event Creator is not publicly eligible' using errcode = '23514';
    end if;

    if exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = new.user_id and b.blocked_id = new.creator_id)
         or (b.blocker_id = new.creator_id and b.blocked_id = new.user_id)
    ) then
      raise exception 'product event Creator context is blocked' using errcode = '23514';
    end if;
  end if;

  if new.creator_session_id is not null then
    select s.creator_id, s.status, s.visibility
      into session_creator, session_status, session_visibility
      from public.creator_sessions s
     where s.id = new.creator_session_id;

    if session_creator is null or new.creator_id is null or session_creator <> new.creator_id then
      raise exception 'product event session context does not match Creator' using errcode = '23514';
    end if;

    -- Current-intent events must describe a currently eligible public session.
    if new.event_name = 'schedule_reminder'
       and (session_visibility <> 'public' or session_status <> 'scheduled') then
      raise exception 'schedule reminder requires a public scheduled session' using errcode = '23514';
    end if;

    if new.event_name in ('live_session_open', 'handoff_intent')
       and (session_visibility <> 'public' or session_status <> 'live') then
      raise exception 'live intent requires a public live session' using errcode = '23514';
    end if;

    if new.event_name = 'notification_response'
       and session_visibility <> 'public' then
      raise exception 'notification response requires public session context' using errcode = '23514';
    end if;
  end if;

  if new.event_name in (
    'creator_impression', 'creator_profile_open', 'creator_follow',
    'live_session_open', 'schedule_reminder', 'handoff_intent',
    'handoff_return', 'notification_response'
  ) and new.creator_id is null then
    raise exception 'product event requires Creator context' using errcode = '23514';
  end if;

  if new.event_name in (
    'live_session_open', 'schedule_reminder', 'handoff_intent',
    'handoff_return', 'notification_response'
  ) and new.creator_session_id is null then
    raise exception 'product event requires session context' using errcode = '23514';
  end if;

  -- A return is only attributable when LC previously observed the matching handoff intent.
  -- The session may have ended or become private while the player was away, so historical
  -- return evidence is anchored to the prior immutable event instead of current visibility.
  if new.event_name = 'handoff_return' and not exists (
    select 1
      from public.product_events prior
     where prior.user_id = new.user_id
       and prior.event_name = 'handoff_intent'
       and prior.journey_id = new.journey_id
       and prior.creator_id = new.creator_id
       and prior.creator_session_id = new.creator_session_id
       and prior.created_at <= coalesce(new.created_at, now())
       and prior.created_at >= coalesce(new.created_at, now()) - interval '30 days'
  ) then
    raise exception 'handoff return requires matching prior handoff intent' using errcode = '23514';
  end if;

  if new.metadata ?| array[
    'wallet', 'deposit', 'withdrawal', 'kyc', 'aml', 'wager', 'bet',
    'settlement', 'balance', 'card_number', 'payment_method'
  ] then
    raise exception 'regulated or payment data is not allowed in product event metadata' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_product_event_context() from public, anon, authenticated;

comment on function public.enforce_product_event_context() is
  'Fail-closed LC attribution guard: event-specific live/schedule eligibility, matching Creator/session, blocked-context denial, safe metadata, and return events anchored to a prior matching handoff intent.';

commit;
