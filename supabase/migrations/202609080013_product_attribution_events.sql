-- LC App product-loop attribution foundation.
--
-- Records only authenticated, app-owned interaction events. It does not ingest
-- gameplay, wallet, KYC/AML, wagering, settlement or responsible-gaming data.
-- Additive migration; no existing table or policy is weakened.

begin;

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null,
  event_key uuid not null,
  journey_id uuid not null,
  creator_id uuid references public.profiles(id) on delete set null,
  creator_session_id uuid references public.creator_sessions(id) on delete set null,
  campaign_source text,
  campaign_name text,
  attribution_confidence text not null default 'unattributed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint product_events_name_check check (event_name in (
    'product_open',
    'creator_impression',
    'discovery_search',
    'creator_profile_open',
    'creator_follow',
    'live_session_open',
    'schedule_reminder',
    'handoff_intent',
    'handoff_return',
    'notification_response'
  )),
  constraint product_events_attribution_confidence_check
    check (attribution_confidence in ('direct', 'contextual', 'unattributed')),
  constraint product_events_campaign_source_length
    check (campaign_source is null or char_length(campaign_source) <= 80),
  constraint product_events_campaign_name_length
    check (campaign_name is null or char_length(campaign_name) <= 80),
  constraint product_events_metadata_object
    check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 2048),
  constraint product_events_user_event_key_unique unique (user_id, event_key)
);

create index if not exists product_events_user_created_idx
  on public.product_events (user_id, created_at desc);
create index if not exists product_events_journey_created_idx
  on public.product_events (journey_id, created_at asc);
create index if not exists product_events_creator_created_idx
  on public.product_events (creator_id, created_at desc)
  where creator_id is not null;
create index if not exists product_events_session_created_idx
  on public.product_events (creator_session_id, created_at desc)
  where creator_session_id is not null;

alter table public.product_events enable row level security;

revoke all on table public.product_events from public, anon, authenticated;
grant select, insert on table public.product_events to authenticated;

drop policy if exists "product_events_select_own" on public.product_events;
create policy "product_events_select_own"
  on public.product_events for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "product_events_insert_own_active" on public.product_events;
create policy "product_events_insert_own_active"
  on public.product_events for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

create or replace function public.enforce_product_event_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.product_events
    where user_id = new.user_id
      and created_at >= now() - interval '1 minute'
  ) >= 120 then
    raise exception 'product event rate limit exceeded'
      using errcode = '54000';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_product_event_rate_limit() from public, anon, authenticated;

drop trigger if exists product_events_rate_limit on public.product_events;
create trigger product_events_rate_limit
  before insert on public.product_events
  for each row execute function public.enforce_product_event_rate_limit();

comment on table public.product_events is
  'Authenticated LC-owned discovery, follow, live, handoff and return events. Metrics remain hypotheses until validated with agreed partner attribution.';
comment on column public.product_events.attribution_confidence is
  'direct, contextual or unattributed classification; not proof of commercial causality.';
comment on column public.product_events.metadata is
  'Small non-sensitive event context only. Never store gameplay, funds, KYC/AML, wagering or settlement data.';

commit;
