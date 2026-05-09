-- Add is_ready column to room_players
alter table public.room_players add column if not exists is_ready boolean not null default false;
