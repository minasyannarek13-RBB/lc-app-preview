-- LC App Run 1: require completed Creator persona/profile before user-generated sessions.
-- Additive policy hardening only. Does not change profiles.role or demo mode.

begin;

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
        and (
          target_visibility <> 'public'
          or cp.profile_status = 'published'
        )
    );
$$;

revoke all on function public.can_manage_user_generated_creator_session(uuid, text) from public;
grant execute on function public.can_manage_user_generated_creator_session(uuid, text) to authenticated;

drop policy if exists "creator_sessions_insert_own" on public.creator_sessions;
create policy "creator_sessions_insert_own"
  on public.creator_sessions for insert
  to authenticated
  with check (
    provenance = 'user_generated'
    and public.can_manage_user_generated_creator_session(creator_id, visibility)
  );

drop policy if exists "creator_sessions_update_own" on public.creator_sessions;
create policy "creator_sessions_update_own"
  on public.creator_sessions for update
  to authenticated
  using (
    auth.uid() = creator_id
    and provenance = 'user_generated'
  )
  with check (
    provenance = 'user_generated'
    and public.can_manage_user_generated_creator_session(creator_id, visibility)
  );

comment on function public.can_manage_user_generated_creator_session(uuid, text) is
  'Checks whether the current authenticated user has completed Creator persona/profile state before creating or updating user-generated creator sessions.';

commit;
