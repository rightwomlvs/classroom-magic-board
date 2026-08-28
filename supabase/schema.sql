-- ============================================================
-- 課堂魔法白板 - Supabase 資料表 (登入保護版)
-- 使用方法：Supabase Dashboard → SQL Editor → New query → 貼上執行
-- 前置：需先到 Authentication → Providers → Email 啟用 Email 登入，
--       並到 Authentication → Settings 調整 Email 驗證設定（見 README）
-- ============================================================

-- 課堂紀錄資料表（每列綁定登入者 owner_id）
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  className text not null default '',
  date text not null default '',
  activeStatus text,
  tasks jsonb not null default '[]'::jsonb,
  prepTitle text not null default '',
  prepContent text not null default '',
  boardTitle text not null default '',
  reminderTitle text not null default '',
  reminderContent text not null default '',
  contributions integer[] not null default '{}',
  studentCount integer not null default 0,
  studentStatus jsonb not null default '{}'::jsonb
);

-- 索引：以日期、班級與擁有者加速查詢
create index if not exists lessons_owner_idx on public.lessons (owner_id);
create index if not exists lessons_date_idx on public.lessons (date);
create index if not exists lessons_classname_idx on public.lessons (className);
create index if not exists lessons_created_at_idx on public.lessons (created_at desc);

-- 啟用資料列層級安全（RLS）
alter table public.lessons enable row level security;

-- 每位登入者只能讀寫自己的資料
drop policy if exists "owner_lessons_insert" on public.lessons;
create policy "owner_lessons_insert"
  on public.lessons for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "owner_lessons_select" on public.lessons;
create policy "owner_lessons_select"
  on public.lessons for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "owner_lessons_update" on public.lessons;
create policy "owner_lessons_update"
  on public.lessons for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "owner_lessons_delete" on public.lessons;
create policy "owner_lessons_delete"
  on public.lessons for delete
  to authenticated
  using (auth.uid() = owner_id);

-- 注意：匿名使用者 (anon) 完全無法存取此表，必須登入。
