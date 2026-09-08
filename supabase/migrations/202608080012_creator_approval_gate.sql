-- LC App Creator/Dealer approval gate.
--
-- Unverified creators may complete onboarding and keep a draft, but only a
-- server-approved creator may expose a public creator profile or public session.

begin;

create or replace function public.is_approved_creator(target_user_id uuid)
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

revoke all on function public.is_approved_creator(uuid) from public;
grant execute on function public.is_approved_creator(uuid) to anon, authenticated;

-- Fail closed for rows created before this gate. Approval must never make an old
-- public session visible by surprise; the creator can publish it deliberately.
update public.creator_profiles
   set profile_status = 'draft',
       updated_at = now()
 where profile_status = 'published'
   and verification_status <> 'verified';

update public.creator_sessions cs
   set visibility = 'private',
       updated_at = now()
 where cs.visibility = 'public'
   and cs.provenance = 'user_generated'
   and not public.is_approved_creator(cs.creator_id);

drop policy if exists "creator_profiles_select_public" on public.creator_profiles;
create policy "creator_profiles_select_public"
  on public.creator_profiles for select
  to anon, authenticated
  using (
    profile_status = 'published'
    and public.is_approved_creator(creator_profiles.user_id)
  );

drop policy if exists "creator_profiles_insert_own" on public.creator_profiles;
create policy "creator_profiles_insert_own"
  on public.creator_profiles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and profile_status <> 'published'
    and verification_status in ('not_requested', 'submitted')
    and affiliation_verification_status in ('unverified', 'submitted')
  );

drop policy if exists "creator_profiles_update_own" on public.creator_profiles;
create policy "creator_profiles_update_own"
  on public.creator_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      profile_status <> 'published'
      or public.is_approved_creator(user_id)
    )
  );

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

drop policy if exists "creator_sessions_select_public" on public.creator_sessions;
create policy "creator_sessions_select_public"
  on public.creator_sessions for select
  to anon, authenticated
  using (
    visibility = 'public'
    and status in ('scheduled', 'live')
    and public.is_approved_creator(creator_sessions.creator_id)
  );

-- Explicit maintenance path. Browser users cannot call it; SQL admins and the
-- server-side service role can review creator verification without weakening RLS.
create or replace function public.protect_creator_profile_status_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at then
    raise exception 'creator profile identity fields cannot be changed'
      using errcode = '42501';
  end if;

  if current_setting('lc_app.creator_approval_maintenance', true) = 'on' then
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    if not (auth.uid() = old.user_id and old.verification_status = 'not_requested' and new.verification_status = 'submitted') then
      raise exception 'creator verification status is protected'
        using errcode = '42501';
    end if;
  end if;

  if new.affiliation_verification_status is distinct from old.affiliation_verification_status then
    if not (auth.uid() = old.user_id and old.affiliation_verification_status = 'unverified' and new.affiliation_verification_status = 'submitted') then
      raise exception 'creator affiliation status is protected'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_creator_profile_status_fields() from public;

create or replace function public.admin_set_creator_verification(
  p_user_id uuid,
  p_verification_status text,
  p_affiliation_verification_status text default null
)
returns public.creator_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.creator_profiles;
begin
  if auth.uid() is not null or coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'creator approval is not available through client auth'
      using errcode = '42501';
  end if;

  if p_verification_status not in ('submitted', 'under_review', 'verified', 'rejected') then
    raise exception 'invalid creator verification status'
      using errcode = '22023';
  end if;

  if p_affiliation_verification_status is not null
     and p_affiliation_verification_status not in ('unverified', 'submitted', 'under_review', 'verified', 'rejected') then
    raise exception 'invalid affiliation verification status'
      using errcode = '22023';
  end if;

  perform set_config('lc_app.creator_approval_maintenance', 'on', true);

  update public.creator_profiles
     set verification_status = p_verification_status,
         affiliation_verification_status = coalesce(
           p_affiliation_verification_status,
           affiliation_verification_status
         ),
         profile_status = case
           when p_verification_status = 'verified' then profile_status
           else 'draft'
         end,
         updated_at = now()
   where user_id = p_user_id
   returning * into v_profile;

  if not found then
    raise exception 'creator profile not found'
      using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.admin_set_creator_verification(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_creator_verification(uuid, text, text)
  to service_role;

comment on function public.is_approved_creator(uuid) is
  'True only for an active, completed and server-verified Creator account.';
comment on function public.admin_set_creator_verification(uuid, text, text) is
  'Server/Supabase-admin creator verification workflow; never callable through browser auth.';

commit;
