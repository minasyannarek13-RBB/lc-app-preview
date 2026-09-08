-- Operator/provider-owned pilot measurement planning.
-- This stores hypotheses and instrumentation readiness, never gambling activity or claimed outcomes.

begin;

create table if not exists public.pilot_measurement_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  industry_subtype text not null,
  primary_hypothesis text not null,
  attribution_window_days integer not null default 7,
  observed_events text[] not null default '{}',
  feed_readiness text not null default 'not_available',
  handoff_readiness text not null default 'not_available',
  notes text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_measurement_briefs_owner_subtype_unique unique (user_id, industry_subtype),
  constraint pilot_measurement_briefs_subtype_check check (industry_subtype in ('operator', 'provider', 'aggregator', 'other')),
  constraint pilot_measurement_briefs_hypothesis_check check (primary_hypothesis in ('creator_handoff', 'creator_return', 'live_signal_response', 'creator_source_attribution')),
  constraint pilot_measurement_briefs_window_check check (attribution_window_days between 1 and 30),
  constraint pilot_measurement_briefs_events_check check (
    cardinality(observed_events) between 1 and 10
    and observed_events <@ array['creator_impression','creator_profile_open','creator_follow','live_session_open','schedule_reminder','handoff_intent','handoff_return','notification_response']::text[]
  ),
  constraint pilot_measurement_briefs_feed_check check (feed_readiness in ('not_available', 'documentation_available', 'sandbox_available')),
  constraint pilot_measurement_briefs_handoff_check check (handoff_readiness in ('not_available', 'conceptual', 'sandbox_available')),
  constraint pilot_measurement_briefs_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint pilot_measurement_briefs_status_check check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected'))
);

alter table public.pilot_measurement_briefs enable row level security;

drop trigger if exists pilot_measurement_briefs_set_updated_at on public.pilot_measurement_briefs;
create trigger pilot_measurement_briefs_set_updated_at
  before update on public.pilot_measurement_briefs
  for each row execute function public.set_updated_at();

create or replace function public.protect_pilot_measurement_brief()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
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

drop trigger if exists pilot_measurement_briefs_protect on public.pilot_measurement_briefs;
create trigger pilot_measurement_briefs_protect
  before update on public.pilot_measurement_briefs
  for each row execute function public.protect_pilot_measurement_brief();

drop policy if exists "pilot_measurement_briefs_select_own" on public.pilot_measurement_briefs;
create policy "pilot_measurement_briefs_select_own"
  on public.pilot_measurement_briefs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "pilot_measurement_briefs_insert_own_draft" on public.pilot_measurement_briefs;
create policy "pilot_measurement_briefs_insert_own_draft"
  on public.pilot_measurement_briefs for insert to authenticated
  with check (auth.uid() = user_id and status = 'draft');

drop policy if exists "pilot_measurement_briefs_update_own_draft" on public.pilot_measurement_briefs;
create policy "pilot_measurement_briefs_update_own_draft"
  on public.pilot_measurement_briefs for update to authenticated
  using (auth.uid() = user_id and status = 'draft')
  with check (auth.uid() = user_id and status in ('draft', 'submitted'));

revoke all on table public.pilot_measurement_briefs from public, anon, authenticated;
grant select, insert, update on table public.pilot_measurement_briefs to authenticated;

comment on table public.pilot_measurement_briefs is
  'User-owned operator/provider pilot hypotheses and instrumentation readiness. Values are self-reported and are not performance, approval or integration claims.';

commit;
