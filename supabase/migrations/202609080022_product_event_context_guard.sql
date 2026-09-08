-- Protect LC attribution evidence from impossible or unsafe creator/session context.
-- Client-observed events remain observational evidence only, never proof of CAC,
-- retention, GGR or ROI. This migration only strengthens relational integrity.

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
      raise exception 'product event Creator is not publicly eligible'
        using errcode = '23514';
    end if;

    if exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = new.user_id and b.blocked_id = new.creator_id)
         or (b.blocker_id = new.creator_id and b.blocked_id = new.user_id)
    ) then
      raise exception 'product event Creator context is blocked'
        using errcode = '23514';
    end if;
  end if;

  if new.creator_session_id is not null then
    select s.creator_id, s.status, s.visibility
      into session_creator, session_status, session_visibility
      from public.creator_sessions s
     where s.id = new.creator_session_id;

    if session_creator is null
       or new.creator_id is null
       or session_creator <> new.creator_id
       or session_visibility <> 'public'
       or session_status not in ('scheduled', 'live') then
      raise exception 'product event session context is not eligible'
        using errcode = '23514';
    end if;
  end if;

  if new.event_name in (
    'creator_impression', 'creator_profile_open', 'creator_follow',
    'live_session_open', 'schedule_reminder', 'handoff_intent',
    'handoff_return', 'notification_response'
  ) and new.creator_id is null then
    raise exception 'product event requires Creator context'
      using errcode = '23514';
  end if;

  if new.event_name in (
    'live_session_open', 'schedule_reminder', 'handoff_intent',
    'handoff_return', 'notification_response'
  ) and new.creator_session_id is null then
    raise exception 'product event requires session context'
      using errcode = '23514';
  end if;

  if new.metadata ?| array[
    'wallet', 'deposit', 'withdrawal', 'kyc', 'aml', 'wager', 'bet',
    'settlement', 'balance', 'card_number', 'payment_method'
  ] then
    raise exception 'regulated or payment data is not allowed in product event metadata'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_product_event_context() from public, anon, authenticated;

drop trigger if exists product_events_context_guard on public.product_events;
create trigger product_events_context_guard
  before insert or update of creator_id, creator_session_id, event_name, metadata
  on public.product_events
  for each row execute function public.enforce_product_event_context();

comment on function public.enforce_product_event_context() is
  'Fail-closed guard for LC-owned attribution events: approved/unblocked Creator, eligible matching public session, required context, and no regulated/payment metadata.';

commit;
