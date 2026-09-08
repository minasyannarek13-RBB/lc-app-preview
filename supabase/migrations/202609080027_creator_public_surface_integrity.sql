-- Keep the public Creator surface truthful and fail-closed.
-- Public posts require an approved/published Creator, scheduled public sessions
-- must still be in the future, and one Creator may have only one Live session.

begin;

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
  on public.posts for insert to authenticated
  with check (
    auth.uid() = author_id
    and public.is_active_profile(author_id)
    and status = 'active'
    and deleted_at is null
    and (
      not exists (
        select 1 from public.creator_profiles cp
        where cp.user_id = author_id
      )
      or public.is_approved_creator(author_id)
    )
  );

create or replace function public.enforce_creator_session_state_machine()
returns trigger
language plpgsql
security definer
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
    if new.starts_at <= now() then
      raise exception 'new Creator sessions must be scheduled in the future'
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

  if new.status = 'scheduled' and new.visibility = 'public' and new.starts_at <= now() then
    raise exception 'a public scheduled Creator session must be in the future'
      using errcode = '23514';
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

    -- Lock the Creator row so concurrent transitions cannot both become Live.
    perform 1
      from public.creator_profiles cp
     where cp.user_id = new.creator_id
     for update;

    if exists (
      select 1
        from public.creator_sessions other
       where other.creator_id = new.creator_id
         and other.status = 'live'
         and other.id <> new.id
    ) then
      raise exception 'Creator already has a Live session'
        using errcode = '23514', hint = 'already_live';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_creator_session_state_machine() from public, anon, authenticated;

drop trigger if exists creator_sessions_enforce_state_machine on public.creator_sessions;
create trigger creator_sessions_enforce_state_machine
  before insert or update of status, visibility, starts_at, creator_id, provenance
  on public.creator_sessions
  for each row execute function public.enforce_creator_session_state_machine();

comment on function public.enforce_creator_session_state_machine() is
  'Fail-closed Creator session lifecycle with truthful future schedule and one-Live-session concurrency guard.';

commit;
