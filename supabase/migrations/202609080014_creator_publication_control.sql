-- LC App Creator publication control.
--
-- Verification is server-controlled. A verified Creator still chooses whether
-- their profile is public. Public sessions fail closed when the profile is
-- private, and hiding a profile cannot leave a directly queryable session.

begin;

create or replace function public.can_publish_creator_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_active_profile(target_user_id)
    and exists (
      select 1
      from public.account_personas ap
      where ap.user_id = target_user_id
        and ap.persona = 'creator'
        and ap.onboarding_status = 'completed'
    )
    and exists (
      select 1
      from public.creator_profiles cp
      where cp.user_id = target_user_id
        and cp.onboarding_completed is true
        and cp.verification_status = 'verified'
    );
$$;

revoke all on function public.can_publish_creator_profile(uuid) from public;
grant execute on function public.can_publish_creator_profile(uuid) to authenticated;

create or replace function public.is_approved_creator(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_publish_creator_profile(target_user_id)
    and exists (
      select 1
      from public.creator_profiles cp
      where cp.user_id = target_user_id
        and cp.profile_status = 'published'
    );
$$;

revoke all on function public.is_approved_creator(uuid) from public;
grant execute on function public.is_approved_creator(uuid) to anon, authenticated;

drop policy if exists "creator_profiles_update_own" on public.creator_profiles;
create policy "creator_profiles_update_own"
  on public.creator_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      profile_status <> 'published'
      or public.can_publish_creator_profile(user_id)
    )
  );

-- A session may become public only while its verified Creator profile is also
-- deliberately published. Private drafts remain available to their owner.
create or replace function public.can_manage_user_generated_creator_session(
  target_creator_id uuid,
  target_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_creator_id
    and public.is_active_profile(target_creator_id)
    and exists (
      select 1
      from public.account_personas ap
      where ap.user_id = target_creator_id
        and ap.persona = 'creator'
        and ap.onboarding_status = 'completed'
    )
    and exists (
      select 1
      from public.creator_profiles cp
      where cp.user_id = target_creator_id
        and cp.onboarding_completed is true
    )
    and (
      target_visibility <> 'public'
      or public.is_approved_creator(target_creator_id)
    );
$$;

revoke all on function public.can_manage_user_generated_creator_session(uuid, text) from public;
grant execute on function public.can_manage_user_generated_creator_session(uuid, text) to authenticated;

-- Keep profile publication and session exposure in one database transaction.
-- Direct API clients and interrupted browser requests must not leave stale
-- public session rows that can reappear on a later profile publication.
create or replace function public.privatize_creator_sessions_on_unpublish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.profile_status = 'published' and new.profile_status <> 'published' then
    update public.creator_sessions
       set visibility = 'private',
           updated_at = now()
     where creator_id = new.user_id
       and visibility = 'public'
       and provenance = 'user_generated';
  end if;

  return new;
end;
$$;

revoke all on function public.privatize_creator_sessions_on_unpublish() from public;

drop trigger if exists creator_profiles_privatize_sessions on public.creator_profiles;
create trigger creator_profiles_privatize_sessions
  after update of profile_status on public.creator_profiles
  for each row
  when (old.profile_status is distinct from new.profile_status)
  execute function public.privatize_creator_sessions_on_unpublish();

update public.creator_sessions cs
   set visibility = 'private',
       updated_at = now()
 where cs.visibility = 'public'
   and cs.provenance = 'user_generated'
   and not public.is_approved_creator(cs.creator_id);

comment on function public.can_publish_creator_profile(uuid) is
  'True when an active, completed Creator is server-verified and may choose to publish their profile.';
comment on function public.is_approved_creator(uuid) is
  'True only when an eligible verified Creator has deliberately published their profile.';

commit;
