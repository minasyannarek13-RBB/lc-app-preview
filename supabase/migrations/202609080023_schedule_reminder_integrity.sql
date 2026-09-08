-- Make schedule reminders a trustworthy app-owned return-intent signal.
-- A reminder may reference only a future, public scheduled session from an
-- approved Creator, and is removed when that eligibility no longer holds.

begin;

create or replace function public.can_set_creator_session_reminder(
  target_user_id uuid,
  target_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_user_id
    and public.is_active_profile(target_user_id)
    and exists (
      select 1
      from public.creator_sessions cs
      where cs.id = target_session_id
        and cs.creator_id <> target_user_id
        and cs.status = 'scheduled'
        and cs.visibility = 'public'
        and cs.starts_at > now()
        and public.is_approved_creator(cs.creator_id)
        and not public.is_blocked_pair(target_user_id, cs.creator_id)
    );
$$;

revoke all on function public.can_set_creator_session_reminder(uuid, uuid) from public, anon, authenticated;
grant execute on function public.can_set_creator_session_reminder(uuid, uuid) to authenticated;

drop policy if exists "player_session_reminders_select_own" on public.player_session_reminders;
create policy "player_session_reminders_select_own"
  on public.player_session_reminders for select
  to authenticated
  using (public.can_set_creator_session_reminder(user_id, session_id));

drop policy if exists "player_session_reminders_insert_own" on public.player_session_reminders;
create policy "player_session_reminders_insert_own"
  on public.player_session_reminders for insert
  to authenticated
  with check (
    status = 'active'
    and public.can_set_creator_session_reminder(user_id, session_id)
  );

drop policy if exists "player_session_reminders_update_own" on public.player_session_reminders;
create policy "player_session_reminders_update_own"
  on public.player_session_reminders for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  )
  with check (
    status = 'active'
    and public.can_set_creator_session_reminder(user_id, session_id)
  );

-- Remove rows that could otherwise look like valid return intent in analysis.
delete from public.player_session_reminders r
where not exists (
  select 1
  from public.creator_sessions cs
  where cs.id = r.session_id
    and cs.creator_id <> r.user_id
    and cs.status = 'scheduled'
    and cs.visibility = 'public'
    and cs.starts_at > now()
    and public.is_approved_creator(cs.creator_id)
    and public.is_active_profile(r.user_id)
    and not public.is_blocked_pair(r.user_id, cs.creator_id)
);

create or replace function public.remove_ineligible_creator_session_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.starts_at is distinct from new.starts_at
    or new.status <> 'scheduled'
    or new.visibility <> 'public'
    or new.starts_at <= now()
    or not public.is_approved_creator(new.creator_id)
  then
    delete from public.player_session_reminders
    where session_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.remove_ineligible_creator_session_reminders() from public, anon, authenticated;

drop trigger if exists creator_sessions_remove_ineligible_reminders on public.creator_sessions;
create trigger creator_sessions_remove_ineligible_reminders
  after update of status, visibility, starts_at on public.creator_sessions
  for each row execute function public.remove_ineligible_creator_session_reminders();

-- Blocking either direction invalidates schedule-based return intent as well
-- as follows and Live signals.
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
  delete from public.player_session_reminders r
  using public.creator_sessions cs
  where r.session_id = cs.id
    and (
      (r.user_id = new.blocker_id and cs.creator_id = new.blocked_id)
      or (r.user_id = new.blocked_id and cs.creator_id = new.blocker_id)
    );
  return new;
end;
$$;

revoke all on function public.remove_follows_on_user_block() from public, anon, authenticated;

comment on function public.can_set_creator_session_reminder(uuid, uuid) is
  'Fail-closed eligibility for visible app-owned schedule return intent; excludes private, terminal, past, unapproved and blocked Creator sessions.';

commit;
