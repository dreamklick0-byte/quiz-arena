-- Complete Quiz Arena Schema
-- Run this entire file in Supabase SQL Editor

-- 1. Questions Table
create table if not exists public.questions (
  id bigint primary key generated always as identity,
  subject text not null,
  exam_type text not null,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null,
  explanation text,
  year integer,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

drop policy if exists "questions_select_all" on public.questions;
create policy "questions_select_all"
  on public.questions for select to anon, authenticated
  using (true);

drop policy if exists "questions_insert_service_role" on public.questions;
create policy "questions_insert_service_role"
  on public.questions for insert to service_role
  with check (true);

-- 2. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select to anon, authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- 3. User Streaks Table
create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_activity_date date not null,
  current_streak integer not null default 1,
  longest_streak integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

drop policy if exists "streak_select_own" on public.user_streaks;
create policy "streak_select_own"
  on public.user_streaks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "streak_manage_own_insert" on public.user_streaks;
create policy "streak_manage_own_insert"
  on public.user_streaks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "streak_manage_own_update" on public.user_streaks;
create policy "streak_manage_own_update"
  on public.user_streaks for update to authenticated
  using (auth.uid() = user_id);

-- 4. User Subject Wins Table (for Leaderboard)
create table if not exists public.user_subject_wins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  wins integer not null default 0,
  player_label text,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject)
);

alter table public.user_subject_wins enable row level security;

drop policy if exists "subject_wins_select_all" on public.user_subject_wins;
create policy "subject_wins_select_all"
  on public.user_subject_wins for select to anon, authenticated
  using (true);

drop policy if exists "subject_wins_insert_own" on public.user_subject_wins;
create policy "subject_wins_insert_own"
  on public.user_subject_wins for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "subject_wins_update_own" on public.user_subject_wins;
create policy "subject_wins_update_own"
  on public.user_subject_wins for update to authenticated
  using (auth.uid() = user_id);

-- 5. Record Daily Activity Function
create or replace function public.record_daily_activity ()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := ((now() at time zone 'utc'))::date;
  prev date;
  cur int;
  lng int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  insert into public.profiles (id, display_name)
  values (uid, 'Student')
  on conflict (id) do nothing;

  select last_activity_date, current_streak, longest_streak
    into prev, cur, lng
  from public.user_streaks
  where user_id = uid;

  if not found then
    insert into public.user_streaks (
      user_id, last_activity_date, current_streak, longest_streak
    )
    values (uid, today, 1, 1);
    return jsonb_build_object('ok', true, 'streak', 1);
  end if;

  if prev = today then
    return jsonb_build_object(
      'ok', true,
      'streak', cur,
      'unchanged', true
    );
  end if;

  if prev = (today - 1) then
    cur := cur + 1;
  else
    cur := 1;
  end if;

  lng := greatest(lng, cur);

  update public.user_streaks set
    last_activity_date = today,
    current_streak = cur,
    longest_streak = lng,
    updated_at = now()
  where user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'streak', cur,
    'longest', lng
  );
end;
$$;

grant execute on function public.record_daily_activity () to authenticated;

-- 6. Increment Subject Win Function
create or replace function public.increment_subject_win (p_subject text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pname text;
begin
  if uid is null then
    return;
  end if;

  insert into public.profiles (id, display_name)
  values (uid, 'Student')
  on conflict (id) do nothing;

  select display_name into pname from public.profiles where id = uid;
  pname := coalesce(nullif(trim(pname), ''), 'Student');

  insert into public.user_subject_wins as u (
    user_id, subject, wins, player_label
  )
  values (uid, p_subject, 1, pname)
  on conflict (user_id, subject) do update
    set wins = u.wins + 1,
        player_label = excluded.player_label,
        updated_at = now();
end;
$$;

grant execute on function public.increment_subject_win (text) to authenticated;
