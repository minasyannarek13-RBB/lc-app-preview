-- Enforce the user-generated Creator session lifecycle at the database boundary.
-- This prevents direct clients from resurrecting terminal sessions or publishing
-- an unapproved Live state, and removes return signals that are no longer valid.

begin;

-- Existing terminal sessions must not remain publicly discoverable.
update public.creator_sessions
set visibility = 'private'
where provenance = 'user_generated'
  and status in ('completed', 'cancelled')
  and visibility <> 'private';

create or replace function public.enforce_creator_session_state_machine()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.provenance <> 'user_generated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'scheduled' then
      raise exception 'new Creator sessions must start as scheduled'
        using errcode = '23514';
    end if;
  elsif not (
    (old.status = 'scheduled' and new.status in ('scheduled', 'live', 'cancelled'))
    or (old.status = 'live' and new.status in ('live', 'completed', 'cancelled'))
    or (old.status = 'completed' and new.status = 'completed')
    or (old.status = 'cancelled' and new.status = 'cancelled')
  ) then
    raise exception 'invalid Creator session status transition: % to %', old.status, new.status
      using errcode = '23514';
  end if;

  if new.status in ('completed', 'cancelled') then
    new.visibility := 'private';
  end if;

  if new.status = 'live' then
    if new.visibility <> 'public' then
      raise exception 'a Live Creator session must be public'
        using errcode = '23514';
    end if;
    if not public.is_approved_creator(new.creator_id) then
      raise exception 'Creator is not approved to publish a Live session'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_creator_session_state_machine() from public, anon, authenticated;

drop trigger if exists creator_sessions_enforce_state_machine on public.creator_sessions;
create trigger creator_sessions_enforce_state_machine
  before insert or update of status, visibility on public.creator_sessions
  for each row execute function public.enforce_creator_session_state_machine();

create or replace function public.remove_ineligible_creator_live_return_signals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'live' or new.visibility <> 'public' then
    delete from public.return_signals
    where session_id = new.id
      and signal_type = 'creator_live';
  end if;
  return new;
end;
$$;

revoke all on function public.remove_ineligible_creator_live_return_signals() from public, anon, authenticated;

drop trigger if exists creator_sessions_remove_ineligible_return_signals on public.creator_sessions;
create trigger creator_sessions_remove_ineligible_return_signals
  after update of status, visibility on public.creator_sessions
  for each row execute function public.remove_ineligible_creator_live_return_signals();

comment on function public.enforce_creator_session_state_machine() is
  'Fail-closed lifecycle for user-generated Creator sessions: scheduled -> live -> completed, with cancellation and immutable terminal states.';

commit;
