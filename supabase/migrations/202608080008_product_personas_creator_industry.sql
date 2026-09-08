-- LC App Functional Completion MVP: product personas, creator sessions,
-- industry profiles, access requests and session reminders.
--
-- Additive only. Does not change profiles.role, existing Social MVP tables,
-- storage policies, or migration 007 protected-field guard.

begin;

create extension if not exists pgcrypto with schema public;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_active_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id
      and account_status = 'active'
  );
$$;

revoke all on function public.is_active_profile(uuid) from public;
grant execute on function public.is_active_profile(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- account_personas
-- ---------------------------------------------------------------------------
create table if not exists public.account_personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  persona text not null,
  industry_subtype text,
  onboarding_status text not null default 'started',
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_personas_persona_check
    check (persona in ('player', 'creator', 'industry')),
  constraint account_personas_industry_subtype_check
    check (
      (persona <> 'industry' and industry_subtype is null)
      or (persona = 'industry' and industry_subtype in ('operator', 'provider', 'aggregator', 'other'))
    ),
  constraint account_personas_onboarding_status_check
    check (onboarding_status in ('started', 'completed'))
);

create unique index if not exists account_personas_unique_non_industry_idx
  on public.account_personas (user_id, persona)
  where persona <> 'industry';

create unique index if not exists account_personas_unique_industry_idx
  on public.account_personas (user_id, industry_subtype)
  where persona = 'industry';

create unique index if not exists account_personas_one_current_idx
  on public.account_personas (user_id)
  where is_current;

create index if not exists account_personas_user_idx
  on public.account_personas (user_id, created_at desc);

alter table public.account_personas enable row level security;

drop trigger if exists account_personas_set_updated_at on public.account_personas;
create trigger account_personas_set_updated_at
  before update on public.account_personas
  for each row execute function public.set_updated_at();

create or replace function public.protect_account_persona_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.persona is distinct from old.persona
    or new.industry_subtype is distinct from old.industry_subtype
    or new.created_at is distinct from old.created_at
  then
    raise exception 'account persona identity fields cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_account_persona_identity() from public;

drop trigger if exists account_personas_protect_identity on public.account_personas;
create trigger account_personas_protect_identity
  before update on public.account_personas
  for each row execute function public.protect_account_persona_identity();

drop policy if exists "account_personas_select_own" on public.account_personas;
create policy "account_personas_select_own"
  on public.account_personas for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "account_personas_insert_own" on public.account_personas;
create policy "account_personas_insert_own"
  on public.account_personas for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "account_personas_update_own" on public.account_personas;
create policy "account_personas_update_own"
  on public.account_personas for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- player_preferences
-- ---------------------------------------------------------------------------
create table if not exists public.player_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  favorite_games text[] not null default '{}',
  preferred_languages text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_preferences_games_limit check (array_length(favorite_games, 1) is null or array_length(favorite_games, 1) <= 12),
  constraint player_preferences_languages_limit check (array_length(preferred_languages, 1) is null or array_length(preferred_languages, 1) <= 12)
);

alter table public.player_preferences enable row level security;

drop trigger if exists player_preferences_set_updated_at on public.player_preferences;
create trigger player_preferences_set_updated_at
  before update on public.player_preferences
  for each row execute function public.set_updated_at();

drop policy if exists "player_preferences_select_own" on public.player_preferences;
create policy "player_preferences_select_own"
  on public.player_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "player_preferences_insert_own" on public.player_preferences;
create policy "player_preferences_insert_own"
  on public.player_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "player_preferences_update_own" on public.player_preferences;
create policy "player_preferences_update_own"
  on public.player_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- creator_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.creator_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  games text[] not null default '{}',
  languages text[] not null default '{}',
  location_region text,
  affiliation_type text not null default 'unlisted',
  affiliation_name text,
  affiliation_verification_status text not null default 'unverified',
  verification_status text not null default 'not_requested',
  profile_status text not null default 'draft',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_profiles_headline_length check (headline is null or char_length(headline) <= 120),
  constraint creator_profiles_location_length check (location_region is null or char_length(location_region) <= 80),
  constraint creator_profiles_affiliation_name_length check (affiliation_name is null or char_length(affiliation_name) <= 120),
  constraint creator_profiles_games_limit check (array_length(games, 1) is null or array_length(games, 1) <= 12),
  constraint creator_profiles_languages_limit check (array_length(languages, 1) is null or array_length(languages, 1) <= 12),
  constraint creator_profiles_affiliation_type_check
    check (affiliation_type in ('operator', 'studio', 'provider', 'independent', 'unlisted')),
  constraint creator_profiles_affiliation_verification_status_check
    check (affiliation_verification_status in ('unverified', 'submitted', 'under_review', 'verified', 'rejected')),
  constraint creator_profiles_verification_status_check
    check (verification_status in ('not_requested', 'submitted', 'under_review', 'verified', 'rejected')),
  constraint creator_profiles_profile_status_check
    check (profile_status in ('draft', 'published', 'hidden'))
);

create index if not exists creator_profiles_profile_status_idx
  on public.creator_profiles (profile_status, updated_at desc);

alter table public.creator_profiles enable row level security;

drop trigger if exists creator_profiles_set_updated_at on public.creator_profiles;
create trigger creator_profiles_set_updated_at
  before update on public.creator_profiles
  for each row execute function public.set_updated_at();

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

drop trigger if exists creator_profiles_protect_status_fields on public.creator_profiles;
create trigger creator_profiles_protect_status_fields
  before update on public.creator_profiles
  for each row execute function public.protect_creator_profile_status_fields();

drop policy if exists "creator_profiles_select_public" on public.creator_profiles;
create policy "creator_profiles_select_public"
  on public.creator_profiles for select
  to anon, authenticated
  using (
    profile_status = 'published'
    and public.is_active_profile(creator_profiles.user_id)
  );

drop policy if exists "creator_profiles_select_own" on public.creator_profiles;
create policy "creator_profiles_select_own"
  on public.creator_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "creator_profiles_insert_own" on public.creator_profiles;
create policy "creator_profiles_insert_own"
  on public.creator_profiles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and verification_status in ('not_requested', 'submitted')
    and affiliation_verification_status in ('unverified', 'submitted')
  );

drop policy if exists "creator_profiles_update_own" on public.creator_profiles;
create policy "creator_profiles_update_own"
  on public.creator_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- creator_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.creator_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  game text not null,
  table_name text,
  operator_name text,
  provider_name text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled',
  visibility text not null default 'public',
  provenance text not null default 'user_generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_sessions_title_length check (title is null or char_length(title) <= 120),
  constraint creator_sessions_game_length check (char_length(game) between 2 and 80),
  constraint creator_sessions_table_length check (table_name is null or char_length(table_name) <= 120),
  constraint creator_sessions_operator_length check (operator_name is null or char_length(operator_name) <= 120),
  constraint creator_sessions_provider_length check (provider_name is null or char_length(provider_name) <= 120),
  constraint creator_sessions_time_order check (ends_at is null or ends_at > starts_at),
  constraint creator_sessions_status_check check (status in ('scheduled', 'live', 'cancelled', 'completed')),
  constraint creator_sessions_visibility_check check (visibility in ('public', 'private')),
  constraint creator_sessions_provenance_check check (provenance in ('demo', 'user_generated', 'partner', 'system'))
);

create index if not exists creator_sessions_public_idx
  on public.creator_sessions (visibility, status, starts_at);
create index if not exists creator_sessions_creator_idx
  on public.creator_sessions (creator_id, starts_at desc);

alter table public.creator_sessions enable row level security;

drop trigger if exists creator_sessions_set_updated_at on public.creator_sessions;
create trigger creator_sessions_set_updated_at
  before update on public.creator_sessions
  for each row execute function public.set_updated_at();

create or replace function public.protect_creator_session_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.creator_id is distinct from old.creator_id
    or new.created_at is distinct from old.created_at
    or new.provenance is distinct from old.provenance
  then
    raise exception 'creator session system fields cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_creator_session_fields() from public;

drop trigger if exists creator_sessions_protect_fields on public.creator_sessions;
create trigger creator_sessions_protect_fields
  before update on public.creator_sessions
  for each row execute function public.protect_creator_session_fields();

drop policy if exists "creator_sessions_select_public" on public.creator_sessions;
create policy "creator_sessions_select_public"
  on public.creator_sessions for select
  to anon, authenticated
  using (
    visibility = 'public'
    and status in ('scheduled', 'live')
    and public.is_active_profile(creator_sessions.creator_id)
  );

drop policy if exists "creator_sessions_select_own" on public.creator_sessions;
create policy "creator_sessions_select_own"
  on public.creator_sessions for select
  to authenticated
  using (auth.uid() = creator_id);

drop policy if exists "creator_sessions_insert_own" on public.creator_sessions;
create policy "creator_sessions_insert_own"
  on public.creator_sessions for insert
  to authenticated
  with check (
    auth.uid() = creator_id
    and provenance = 'user_generated'
  );

drop policy if exists "creator_sessions_update_own" on public.creator_sessions;
create policy "creator_sessions_update_own"
  on public.creator_sessions for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (
    auth.uid() = creator_id
    and provenance = 'user_generated'
  );

drop policy if exists "creator_sessions_delete_own" on public.creator_sessions;
create policy "creator_sessions_delete_own"
  on public.creator_sessions for delete
  to authenticated
  using (
    auth.uid() = creator_id
    and provenance = 'user_generated'
  );

-- ---------------------------------------------------------------------------
-- player_session_reminders
-- ---------------------------------------------------------------------------
create table if not exists public.player_session_reminders (
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.creator_sessions(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_session_reminders_pkey primary key (user_id, session_id),
  constraint player_session_reminders_status_check check (status in ('active', 'cancelled'))
);

create index if not exists player_session_reminders_session_idx
  on public.player_session_reminders (session_id);

alter table public.player_session_reminders enable row level security;

drop trigger if exists player_session_reminders_set_updated_at on public.player_session_reminders;
create trigger player_session_reminders_set_updated_at
  before update on public.player_session_reminders
  for each row execute function public.set_updated_at();

drop policy if exists "player_session_reminders_select_own" on public.player_session_reminders;
create policy "player_session_reminders_select_own"
  on public.player_session_reminders for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "player_session_reminders_insert_own" on public.player_session_reminders;
create policy "player_session_reminders_insert_own"
  on public.player_session_reminders for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "player_session_reminders_update_own" on public.player_session_reminders;
create policy "player_session_reminders_update_own"
  on public.player_session_reminders for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "player_session_reminders_delete_own" on public.player_session_reminders;
create policy "player_session_reminders_delete_own"
  on public.player_session_reminders for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- industry_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.industry_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  subtype text not null,
  company_name text not null,
  job_title text not null,
  work_email text not null,
  website_url text,
  interests text[] not null default '{}',
  onboarding_completed boolean not null default false,
  access_status text not null default 'not_requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint industry_profiles_subtype_check check (subtype in ('operator', 'provider', 'aggregator', 'other')),
  constraint industry_profiles_company_length check (char_length(company_name) between 2 and 120),
  constraint industry_profiles_job_length check (char_length(job_title) between 2 and 120),
  constraint industry_profiles_work_email_length check (char_length(work_email) between 3 and 254),
  constraint industry_profiles_website_length check (website_url is null or char_length(website_url) <= 300),
  constraint industry_profiles_interests_limit check (array_length(interests, 1) is null or array_length(interests, 1) <= 12),
  constraint industry_profiles_access_status_check check (access_status in ('not_requested', 'submitted', 'under_review', 'approved', 'rejected'))
);

alter table public.industry_profiles enable row level security;

drop trigger if exists industry_profiles_set_updated_at on public.industry_profiles;
create trigger industry_profiles_set_updated_at
  before update on public.industry_profiles
  for each row execute function public.set_updated_at();

create or replace function public.protect_industry_profile_access_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
    or new.access_status is distinct from old.access_status
  then
    raise exception 'industry profile protected fields cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_industry_profile_access_status() from public;

drop trigger if exists industry_profiles_protect_access_status on public.industry_profiles;
create trigger industry_profiles_protect_access_status
  before update on public.industry_profiles
  for each row execute function public.protect_industry_profile_access_status();

drop policy if exists "industry_profiles_select_own" on public.industry_profiles;
create policy "industry_profiles_select_own"
  on public.industry_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "industry_profiles_insert_own" on public.industry_profiles;
create policy "industry_profiles_insert_own"
  on public.industry_profiles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and access_status = 'not_requested'
  );

drop policy if exists "industry_profiles_update_own" on public.industry_profiles;
create policy "industry_profiles_update_own"
  on public.industry_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- partnership_access_requests
-- ---------------------------------------------------------------------------
create table if not exists public.partnership_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  industry_subtype text not null,
  request_note text,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partnership_access_requests_subtype_check check (industry_subtype in ('operator', 'provider', 'aggregator', 'other')),
  constraint partnership_access_requests_status_check check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  constraint partnership_access_requests_note_length check (request_note is null or char_length(request_note) <= 500)
);

create unique index if not exists partnership_access_requests_one_open_idx
  on public.partnership_access_requests (user_id, industry_subtype)
  where status in ('submitted', 'under_review', 'approved');

alter table public.partnership_access_requests enable row level security;

drop trigger if exists partnership_access_requests_set_updated_at on public.partnership_access_requests;
create trigger partnership_access_requests_set_updated_at
  before update on public.partnership_access_requests
  for each row execute function public.set_updated_at();

create or replace function public.protect_partnership_access_request_fields()
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
    or new.status is distinct from old.status
  then
    raise exception 'partnership access request protected fields cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_partnership_access_request_fields() from public;

drop trigger if exists partnership_access_requests_protect_fields on public.partnership_access_requests;
create trigger partnership_access_requests_protect_fields
  before update on public.partnership_access_requests
  for each row execute function public.protect_partnership_access_request_fields();

drop policy if exists "partnership_access_requests_select_own" on public.partnership_access_requests;
create policy "partnership_access_requests_select_own"
  on public.partnership_access_requests for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "partnership_access_requests_insert_own" on public.partnership_access_requests;
create policy "partnership_access_requests_insert_own"
  on public.partnership_access_requests for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'submitted'
  );

drop policy if exists "partnership_access_requests_update_own_note" on public.partnership_access_requests;
create policy "partnership_access_requests_update_own_note"
  on public.partnership_access_requests for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.account_personas is
  'Product persona state for LC App. Not an authorization role.';
comment on table public.creator_profiles is
  'Creator/dealer product profile. Affiliation and verification are user-claimed unless privileged process changes status.';
comment on table public.creator_sessions is
  'Creator-owned public/private Live Casino session schedule records.';
comment on table public.industry_profiles is
  'Industry persona profile for operators, providers, aggregators and other iGaming companies.';
comment on table public.partnership_access_requests is
  'User-submitted request-access records. Client cannot self-approve.';

commit;
