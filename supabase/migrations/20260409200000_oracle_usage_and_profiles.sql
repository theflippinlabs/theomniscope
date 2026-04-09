-- Oracle Sentinel — user profiles, daily usage, Stripe billing state.
--
-- Three tables, all guarded by RLS so each authenticated user can only
-- read/write their own rows. The oracle-fetch edge function uses the
-- service role key server-side to bypass RLS and log usage on behalf
-- of the caller.
--
-- profiles          — one row per auth.users user, holds plan tier +
--                     Stripe customer / subscription IDs
-- oracle_usage      — append-only query log: one row per analysis call
-- oracle_usage_daily — materialized daily counter for quota checks

-- =========================================================
-- profiles
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'elite')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user can read + update their own row; no insert (created by trigger).
drop policy if exists "profiles self-select" on public.profiles;
create policy "profiles self-select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles self-update" on public.profiles;
create policy "profiles self-update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row on user signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- oracle_usage — append-only query log
-- =========================================================

create table if not exists public.oracle_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  query_type text not null check (query_type in ('wallet', 'token', 'nft')),
  identifier text not null,
  chain text,
  plan_at_time text,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists oracle_usage_user_created_idx
  on public.oracle_usage(user_id, created_at desc);

create index if not exists oracle_usage_user_day_idx
  on public.oracle_usage(user_id, (created_at::date));

alter table public.oracle_usage enable row level security;

-- Users can read their own log. Inserts come from the edge function
-- (service role, bypasses RLS).
drop policy if exists "oracle_usage self-select" on public.oracle_usage;
create policy "oracle_usage self-select"
  on public.oracle_usage for select
  using (auth.uid() = user_id);

-- =========================================================
-- oracle_usage_daily — per-day counter
-- =========================================================
--
-- Derived from oracle_usage but kept as its own table so quota reads
-- don't scan the log. The edge function upserts this on every call.

create table if not exists public.oracle_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  analysis_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.oracle_usage_daily enable row level security;

drop policy if exists "oracle_usage_daily self-select" on public.oracle_usage_daily;
create policy "oracle_usage_daily self-select"
  on public.oracle_usage_daily for select
  using (auth.uid() = user_id);

-- =========================================================
-- helpers
-- =========================================================

-- Atomic daily-counter increment. The edge function calls this via
-- the service role client after a successful oracle-fetch request.
create or replace function public.increment_oracle_usage(
  p_user_id uuid,
  p_query_type text,
  p_identifier text,
  p_chain text,
  p_plan text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  -- Append to the log
  insert into public.oracle_usage (user_id, query_type, identifier, chain, plan_at_time)
  values (p_user_id, p_query_type, p_identifier, p_chain, p_plan);

  -- Upsert the daily counter
  insert into public.oracle_usage_daily as d (user_id, usage_date, analysis_count, updated_at)
  values (p_user_id, v_today, 1, now())
  on conflict (user_id, usage_date)
  do update set
    analysis_count = d.analysis_count + 1,
    updated_at = now()
  returning analysis_count into v_new_count;

  return v_new_count;
end;
$$;

-- Daily quota check: returns how many analyses the user has run today.
create or replace function public.get_oracle_usage_today(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(analysis_count, 0)
  from public.oracle_usage_daily
  where user_id = p_user_id
    and usage_date = (now() at time zone 'utc')::date;
$$;
