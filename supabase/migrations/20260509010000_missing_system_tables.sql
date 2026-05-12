-- Missing tables for League, Wallet, and Admin Systems
-- Run this in Supabase SQL Editor

-- 1. Leagues Table
create table if not exists public.leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text not null,
  entry_fee numeric not null default 0,
  max_players integer not null default 100,
  current_players integer not null default 0,
  duration_hours integer not null default 24,
  num_questions integer not null default 10,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  guaranteed_first numeric not null default 0,
  guaranteed_second numeric not null default 0,
  guaranteed_third numeric not null default 0,
  guaranteed_fourth_tenth numeric not null default 0,
  status text not null check (status in ('scheduled', 'open', 'completed')),
  prizes_paid boolean default false,
  platform_revenue numeric default 0,
  prize_pool numeric default 0,
  questions jsonb not null default '[]',
  created_at timestamptz default now()
);

-- 2. League Entries Table
create table if not exists public.league_entries (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  score integer default 0,
  time_seconds integer default 0,
  prize_won numeric default 0,
  created_at timestamptz default now(),
  unique(league_id, user_id)
);

-- 3. Wallets Table
create table if not exists public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  balance numeric not null default 0,
  total_won numeric not null default 0,
  total_spent numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Transactions Table
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'stake', 'win', 'refund')),
  amount numeric not null,
  reference text unique not null,
  description text,
  status text not null check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz default now()
);

-- 5. Withdrawal Requests Table
create table if not exists public.withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  status text not null check (status in ('pending', 'processed', 'rejected')) default 'pending',
  processed_at timestamptz,
  processed_by uuid, -- references admin_accounts(id)
  created_at timestamptz default now()
);

-- 6. Admin Logs Table
create table if not exists public.admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null, -- references admin_accounts(id)
  action text not null,
  details text,
  ip_address text,
  created_at timestamptz default now()
);

-- Enable RLS for all new tables
alter table public.leagues enable row level security;
alter table public.league_entries enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.admin_logs enable row level security;

-- Policies (Simplified for setup, you can restrict further)
create policy "Public can view leagues" on public.leagues for select using (true);
create policy "Users can view own entries" on public.league_entries for select using (auth.uid() = user_id);
create policy "Users can view own wallet" on public.wallets for select using (auth.uid() = user_id);
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can view own withdrawals" on public.withdrawal_requests for select using (auth.uid() = user_id);
create policy "Users can insert own withdrawals" on public.withdrawal_requests for insert with check (auth.uid() = user_id);

-- Service Role policies for Admin operations
create policy "Service role can do everything on leagues" on public.leagues for all using (true) with check (true);
create policy "Service role can do everything on league_entries" on public.league_entries for all using (true) with check (true);
create policy "Service role can do everything on wallets" on public.wallets for all using (true) with check (true);
create policy "Service role can do everything on transactions" on public.transactions for all using (true) with check (true);
create policy "Service role can do everything on withdrawals" on public.withdrawal_requests for all using (true) with check (true);
create policy "Service role can do everything on logs" on public.admin_logs for all using (true) with check (true);
