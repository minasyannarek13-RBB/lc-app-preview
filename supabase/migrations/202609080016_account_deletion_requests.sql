-- User-owned account deletion request workflow.
-- This records a private request for authorised processing; it does not grant
-- browser clients permission to delete auth identities or bypass retention checks.

begin;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  constraint account_deletion_requests_status_check check (status in ('pending', 'cancelled', 'completed', 'rejected')),
  constraint account_deletion_requests_cancelled_check check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint account_deletion_requests_completed_check check ((status = 'completed') = (completed_at is not null))
);

create unique index if not exists account_deletion_requests_one_pending
  on public.account_deletion_requests (user_id) where status = 'pending';
create index if not exists account_deletion_requests_requested_idx
  on public.account_deletion_requests (requested_at desc);

alter table public.account_deletion_requests enable row level security;

create or replace function public.protect_account_deletion_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'invalid account deletion request owner' using errcode = '42501';
  end if;
  if (
    select count(*) from public.account_deletion_requests
    where user_id = auth.uid() and requested_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'account deletion request rate limit exceeded' using errcode = '22023';
  end if;
  new.status := 'pending';
  new.requested_at := now();
  new.cancelled_at := null;
  new.completed_at := null;
  return new;
end;
$$;

revoke all on function public.protect_account_deletion_request_insert() from public, anon, authenticated;

drop trigger if exists account_deletion_requests_protect_insert on public.account_deletion_requests;
create trigger account_deletion_requests_protect_insert
  before insert on public.account_deletion_requests
  for each row execute function public.protect_account_deletion_request_insert();

create or replace function public.protect_account_deletion_request_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if auth.uid() is null
    or old.user_id <> auth.uid()
    or new.user_id is distinct from old.user_id
    or new.id is distinct from old.id
    or new.requested_at is distinct from old.requested_at
    or old.status <> 'pending'
    or new.status <> 'cancelled'
    or new.cancelled_at is null
    or new.completed_at is distinct from old.completed_at
  then
    raise exception 'invalid account deletion request transition' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_account_deletion_request_update() from public, anon, authenticated;

drop trigger if exists account_deletion_requests_protect_update on public.account_deletion_requests;
create trigger account_deletion_requests_protect_update
  before update on public.account_deletion_requests
  for each row execute function public.protect_account_deletion_request_update();

drop policy if exists "account_deletion_requests_select_own" on public.account_deletion_requests;
create policy "account_deletion_requests_select_own"
  on public.account_deletion_requests for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "account_deletion_requests_insert_own" on public.account_deletion_requests;
create policy "account_deletion_requests_insert_own"
  on public.account_deletion_requests for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and cancelled_at is null
    and completed_at is null
  );

drop policy if exists "account_deletion_requests_cancel_own" on public.account_deletion_requests;
create policy "account_deletion_requests_cancel_own"
  on public.account_deletion_requests for update to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'cancelled' and cancelled_at is not null);

revoke all on table public.account_deletion_requests from public, anon, authenticated;
grant select, insert, update on table public.account_deletion_requests to authenticated;

comment on table public.account_deletion_requests is
  'Private user-owned requests awaiting authorised deletion processing; not proof of immediate deletion.';

commit;
