-- Restore the privileged review path for submitted pilot measurement briefs.
-- Browser-authenticated owners remain restricted to their own draft -> submitted transition.

begin;

create or replace function public.protect_pilot_measurement_brief()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.industry_subtype is distinct from old.industry_subtype
    or new.created_at is distinct from old.created_at
  then
    raise exception 'pilot measurement brief protected fields cannot be changed' using errcode = '42501';
  end if;

  if old.status <> 'draft' then
    raise exception 'submitted pilot measurement briefs cannot be changed by the owner' using errcode = '42501';
  end if;

  if new.status not in ('draft', 'submitted') then
    raise exception 'pilot measurement brief review status is protected' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_pilot_measurement_brief() from public, anon, authenticated;

comment on function public.protect_pilot_measurement_brief() is
  'Owners may edit only their own draft or submit it; service-role review transitions remain backend-only.';

commit;
