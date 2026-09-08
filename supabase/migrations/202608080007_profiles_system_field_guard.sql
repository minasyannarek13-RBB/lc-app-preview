-- Social MVP: profiles privileged-field guard
--
-- Fixes the live security bug where an authenticated user could update their
-- own public.profiles.role through the broad own-profile UPDATE policy.

begin;

drop trigger if exists profiles_protect_system_fields on public.profiles;
drop trigger if exists profiles_protect_privileged_fields on public.profiles;

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  protected_key text;
begin
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

create trigger profiles_protect_system_fields
before update on public.profiles
for each row
execute function public.protect_profile_system_fields();

comment on function public.protect_profile_system_fields() is
  'Prevents authenticated browser/client profile updates from changing role, account_status, identity, timestamp, and privileged/system fields.';

comment on trigger profiles_protect_system_fields on public.profiles is
  'DB-level guard for public.profiles privileged fields; normal own-profile editing remains controlled by RLS and constraints.';

commit;
