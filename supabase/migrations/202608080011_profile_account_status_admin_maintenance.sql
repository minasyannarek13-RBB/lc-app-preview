-- LC App account-status maintenance path.
--
-- Migration 007 correctly blocks client updates to public.profiles.account_status.
-- This adds an admin-only SQL maintenance function so Supabase project admins can
-- suspend/disable/reactivate accounts without weakening client RLS or browser auth.

begin;

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  protected_key text;
begin
  if current_setting('lc_app.profile_system_maintenance', true) = 'on' then
    return new;
  end if;

  foreach protected_key in array array[
    'id',
    'role',
    'account_status',
    'created_at',
    'admin_notes',
    'admin_flags',
    'moderation_status',
    'moderation_reason',
    'moderated_by',
    'moderated_at',
    'suspended_by',
    'suspended_at',
    'disabled_by',
    'disabled_at'
  ]
  loop
    if (to_jsonb(new) -> protected_key) is distinct from (to_jsonb(old) -> protected_key) then
      raise exception 'profiles.% cannot be changed by client update', protected_key
        using errcode = '42501';
    end if;
  end loop;

  select key
  into protected_key
  from jsonb_object_keys(to_jsonb(new)) as keys(key)
  where (
    key like 'admin_%'
    or key like 'moderator_%'
    or key like 'system_%'
    or key like 'internal_%'
    or key in ('is_admin', 'is_moderator', 'permissions', 'privileges', 'permission_level')
  )
  and (to_jsonb(new) -> key) is distinct from (to_jsonb(old) -> key)
  limit 1;

  if protected_key is not null then
    raise exception 'profiles.% cannot be changed by client update', protected_key
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_system_fields() from public;

create or replace function public.admin_set_profile_account_status(
  p_user_id uuid,
  p_account_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is not null then
    raise exception 'profile account status maintenance is not available through client auth'
      using errcode = '42501';
  end if;

  if p_account_status not in ('active', 'suspended', 'disabled') then
    raise exception 'invalid account_status: %', p_account_status
      using errcode = '22023';
  end if;

  perform set_config('lc_app.profile_system_maintenance', 'on', true);

  update public.profiles
     set account_status = p_account_status,
         updated_at = now()
   where id = p_user_id
   returning * into v_profile;

  if not found then
    raise exception 'profile not found: %', p_user_id
      using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.admin_set_profile_account_status(uuid, text) from public, anon, authenticated;

comment on function public.admin_set_profile_account_status(uuid, text) is
  'Supabase SQL-admin maintenance helper for account_status. Not granted to anon/authenticated and blocked when called through client auth.';

commit;
