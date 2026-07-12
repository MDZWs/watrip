-- ============================================================
-- 旅行 App 社区化升级 - 数据库 Schema + RLS 策略
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴执行
-- 文档：specs/community-platform-upgrade/技术栈.md 第3节
-- ============================================================

-- ============================================================
-- 第一部分：公共函数与触发器
-- ============================================================

-- updated_at 自动更新函数
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 第二部分：用户体系
-- ============================================================

-- 用户资料表（id 关联 auth.users）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  city text,
  bio text default '',
  level int not null default 1,
  exp int not null default 0,
  points int not null default 0,
  is_certified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 注册时自动创建 profiles 记录（demo@trip.com 自动升级为满级管理员）
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.email = 'demo@trip.com' then
    -- Demo 满级体验账号：Lv12 + 管理员 + 无限配额
    insert into public.profiles (id, username, level, points, exp, role, storage_quota, bio)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'username', 'Demo 满级体验官'),
      12, 99999, 99999, 'admin', 999,
      '🎁 官方提供的满级体验账号，可测试全部功能'
    )
    on conflict (id) do update set
      level = 12, exp = 99999, points = 99999, role = 'admin', storage_quota = 999,
      bio = '🎁 官方提供的满级体验账号，可测试全部功能';
  else
    insert into public.profiles (id, username)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'username', '旅行者_' || substr(new.id::text, 1, 6))
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 关注关系
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- 新手任务完成记录
create table if not exists public.user_tasks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_key)
);

-- ============================================================
-- 第三部分：内容体系
-- ============================================================

-- 行程模板
create table if not exists public.trip_templates (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  cover_url text,
  destination text,
  city text,
  days int,
  budget text,
  tags text[] default '{}',
  season text,
  suitable_for text[] default '{}',
  day_plans jsonb,
  description text default '',
  likes int not null default 0,
  copies int not null default 0,
  favorites int not null default 0,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 图文游记
create table if not exists public.travel_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  cover_url text,
  title text not null,
  content jsonb not null,
  tags text[] default '{}',
  attached_template_id uuid references public.trip_templates(id) on delete set null,
  likes int not null default 0,
  favorites int not null default 0,
  views int not null default 0,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 游记内地点标注
create table if not exists public.note_locations (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.travel_notes(id) on delete cascade,
  name text not null,
  lng float8 not null,
  lat float8 not null,
  address text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 第四部分：互动体系
-- ============================================================

-- 点赞
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_type text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id, target_type)
);

-- 收藏
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_type text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id, target_type)
);

-- 查看记录（UV 去重）
create table if not exists public.views (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_type text not null,
  viewed_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id, target_type, viewed_date)
);

-- ============================================================
-- 第五部分：积分体系
-- ============================================================

-- 积分账本
create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
-- Phase 3.1：补全 target_id / target_type 字段（兼容 PointsCore 写入）
alter table public.point_ledger add column if not exists target_id uuid;
alter table public.point_ledger add column if not exists target_type text;

-- 经验账本
create table if not exists public.exp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 第六部分：打卡体系
-- ============================================================

-- 打卡记录
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  poi_id text,
  poi_name text not null,
  lng float8 not null,
  lat float8 not null,
  address text,
  type text not null default 'cloud',
  has_roast boolean not null default false,
  created_at timestamptz not null default now()
);

-- 吐槽内容
create table if not exists public.roasts (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  images jsonb default '[]',
  likes int not null default 0,
  favorites int not null default 0,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 地点专题区域
create table if not exists public.poi_topics (
  id uuid primary key default gen_random_uuid(),
  poi_id text unique,
  poi_name text not null,
  lng float8 not null,
  lat float8 not null,
  address text,
  checkin_count int not null default 0,
  roast_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 第七部分：投票体系
-- ============================================================

-- 每日签到
create table if not exists public.daily_signin (
  user_id uuid not null references public.profiles(id) on delete cascade,
  signin_date date not null,
  tickets_earned int not null default 3,
  created_at timestamptz not null default now(),
  primary key (user_id, signin_date)
);

-- 投票记录
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_type text not null,
  vote_count int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 第八部分：道具体系
-- ============================================================

-- 用户道具
create table if not exists public.user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  source text not null default 'drop',
  acquired_at timestamptz not null default now()
);

-- 月度活动
create table if not exists public.monthly_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  theme text not null,
  start_date date not null,
  end_date date not null,
  tasks jsonb not null default '[]',
  reward_item_id text not null,
  reward_item_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 活动任务进度
create table if not exists public.event_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.monthly_events(id) on delete cascade,
  task_key text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, event_id, task_key)
);

-- ============================================================
-- 第九部分：合规体系
-- ============================================================

-- 举报记录
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_type text not null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- 违规记录
create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_type text not null,
  level text not null,
  action text not null,
  created_at timestamptz not null default now()
);

-- 审核队列
create table if not exists public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null,
  target_type text not null,
  reason text not null,
  status text not null default 'pending',
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 第十部分：等级特权
-- ============================================================

create table if not exists public.level_privileges (
  level int primary key,
  privilege_key text not null,
  privilege_config jsonb not null default '{}'
);

-- 初始化等级特权数据
insert into public.level_privileges (level, privilege_key, privilege_config) values
  (4, 'pdf_export', '{"enabled": true}'::jsonb),
  (6, 'custom_tags', '{"enabled": true}'::jsonb),
  (8, 'profile_theme', '{"enabled": true}'::jsonb),
  (9, 'collection_set', '{"enabled": true}'::jsonb),
  (10, 'homepage_boost', '{"weight": 1.5}'::jsonb),
  (12, 'certified_planner', '{"enabled": true}'::jsonb)
on conflict (level) do nothing;

-- ============================================================
-- 第十一部分：触发器（updated_at 自动更新）
-- ============================================================

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'profiles','follows','trip_templates','travel_notes','roasts',
    'poi_topics','moderation_queue'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', tbl);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.handle_updated_at()', tbl);
  end loop;
end$$;

-- ============================================================
-- 第十二部分：索引
-- ============================================================

create index if not exists idx_templates_author on public.trip_templates(author_id);
create index if not exists idx_templates_city on public.trip_templates(city);
create index if not exists idx_templates_created on public.trip_templates(created_at desc);
create index if not exists idx_notes_author on public.travel_notes(author_id);
create index if not exists idx_note_locations_note on public.note_locations(note_id);
create index if not exists idx_likes_target on public.likes(target_id, target_type);
create index if not exists idx_favorites_target on public.favorites(target_id, target_type);
create index if not exists idx_views_target on public.views(target_id, target_type, viewed_date);
create index if not exists idx_point_ledger_user on public.point_ledger(user_id, created_at desc);
create index if not exists idx_exp_ledger_user on public.exp_ledger(user_id, created_at desc);
create index if not exists idx_checkins_user on public.checkins(user_id, created_at desc);
create index if not exists idx_checkins_poi on public.checkins(poi_id);
create index if not exists idx_roasts_checkin on public.roasts(checkin_id);
create index if not exists idx_follows_following on public.follows(following_id);
create index if not exists idx_votes_target on public.votes(target_id, target_type);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_moderation_status on public.moderation_queue(status);

-- ============================================================
-- 第十三部分：RLS 策略
-- ============================================================

-- 启用 RLS
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.user_tasks enable row level security;
alter table public.trip_templates enable row level security;
alter table public.travel_notes enable row level security;
alter table public.note_locations enable row level security;
alter table public.likes enable row level security;
alter table public.favorites enable row level security;
alter table public.views enable row level security;
alter table public.point_ledger enable row level security;
alter table public.exp_ledger enable row level security;
alter table public.checkins enable row level security;
alter table public.roasts enable row level security;
alter table public.poi_topics enable row level security;
alter table public.daily_signin enable row level security;
alter table public.votes enable row level security;
alter table public.user_items enable row level security;
alter table public.monthly_events enable row level security;
alter table public.event_progress enable row level security;
alter table public.reports enable row level security;
alter table public.violations enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.level_privileges enable row level security;

-- profiles：所有人可读，仅本人可改
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);

-- follows：仅本人可读写自己的关注关系
drop policy if exists "follows_select_all" on public.follows;
drop policy if exists "follows_insert_self" on public.follows;
drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_select_all" on public.follows for select using (true);
create policy "follows_insert_self" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_self" on public.follows for delete using (auth.uid() = follower_id);

-- user_tasks：仅本人可读写
drop policy if exists "user_tasks_select_self" on public.user_tasks;
drop policy if exists "user_tasks_insert_self" on public.user_tasks;
drop policy if exists "user_tasks_delete_self" on public.user_tasks;
create policy "user_tasks_select_self" on public.user_tasks for select using (auth.uid() = user_id);
create policy "user_tasks_insert_self" on public.user_tasks for insert with check (auth.uid() = user_id);
create policy "user_tasks_delete_self" on public.user_tasks for delete using (auth.uid() = user_id);

-- trip_templates：所有人可读，仅作者可写
drop policy if exists "templates_select_all" on public.trip_templates;
drop policy if exists "templates_insert_self" on public.trip_templates;
drop policy if exists "templates_update_self" on public.trip_templates;
drop policy if exists "templates_delete_self" on public.trip_templates;
create policy "templates_select_all" on public.trip_templates for select using (status = 'published' or auth.uid() = author_id);
create policy "templates_insert_self" on public.trip_templates for insert with check (auth.uid() = author_id);
create policy "templates_update_self" on public.trip_templates for update using (auth.uid() = author_id);
create policy "templates_delete_self" on public.trip_templates for delete using (auth.uid() = author_id);

-- travel_notes：所有人可读，仅作者可写
drop policy if exists "notes_select_all" on public.travel_notes;
drop policy if exists "notes_insert_self" on public.travel_notes;
drop policy if exists "notes_update_self" on public.travel_notes;
drop policy if exists "notes_delete_self" on public.travel_notes;
create policy "notes_select_all" on public.travel_notes for select using (status = 'published' or auth.uid() = author_id);
create policy "notes_insert_self" on public.travel_notes for insert with check (auth.uid() = author_id);
create policy "notes_update_self" on public.travel_notes for update using (auth.uid() = author_id);
create policy "notes_delete_self" on public.travel_notes for delete using (auth.uid() = author_id);

-- note_locations：随游记权限（所有人可读）
drop policy if exists "note_locations_select_all" on public.note_locations;
drop policy if exists "note_locations_insert_self" on public.note_locations;
create policy "note_locations_select_all" on public.note_locations for select using (true);
create policy "note_locations_insert_self" on public.note_locations for insert with check (auth.uid() = (select author_id from public.travel_notes where id = note_id));

-- likes/favorites/views：仅本人可读写自己的记录
drop policy if exists "likes_select_all" on public.likes;
drop policy if exists "likes_insert_self" on public.likes;
drop policy if exists "likes_delete_self" on public.likes;
create policy "likes_select_all" on public.likes for select using (true);
create policy "likes_insert_self" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_self" on public.likes for delete using (auth.uid() = user_id);

drop policy if exists "favorites_select_all" on public.favorites;
drop policy if exists "favorites_insert_self" on public.favorites;
drop policy if exists "favorites_delete_self" on public.favorites;
create policy "favorites_select_all" on public.favorites for select using (true);
create policy "favorites_insert_self" on public.favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete_self" on public.favorites for delete using (auth.uid() = user_id);

drop policy if exists "views_select_self" on public.views;
drop policy if exists "views_insert_self" on public.views;
drop policy if exists "views_delete_self" on public.views;
create policy "views_select_self" on public.views for select using (auth.uid() = user_id);
create policy "views_insert_self" on public.views for insert with check (auth.uid() = user_id);
create policy "views_delete_self" on public.views for delete using (auth.uid() = user_id);

-- 积分/经验账本：仅本人可读，仅系统可写（通过 service_role）
drop policy if exists "point_ledger_select_self" on public.point_ledger;
drop policy if exists "point_ledger_insert_self" on public.point_ledger;
drop policy if exists "exp_ledger_select_self" on public.exp_ledger;
drop policy if exists "exp_ledger_insert_self" on public.exp_ledger;
create policy "point_ledger_select_self" on public.point_ledger for select using (auth.uid() = user_id);
create policy "point_ledger_insert_self" on public.point_ledger for insert with check (auth.uid() = user_id);
create policy "exp_ledger_select_self" on public.exp_ledger for select using (auth.uid() = user_id);
create policy "exp_ledger_insert_self" on public.exp_ledger for insert with check (auth.uid() = user_id);

-- checkins：所有人可读，仅本人可写
drop policy if exists "checkins_select_all" on public.checkins;
drop policy if exists "checkins_insert_self" on public.checkins;
drop policy if exists "checkins_delete_self" on public.checkins;
create policy "checkins_select_all" on public.checkins for select using (true);
create policy "checkins_insert_self" on public.checkins for insert with check (auth.uid() = user_id);
create policy "checkins_delete_self" on public.checkins for delete using (auth.uid() = user_id);

-- roasts：所有人可读，仅本人可写/删
drop policy if exists "roasts_select_all" on public.roasts;
drop policy if exists "roasts_insert_self" on public.roasts;
drop policy if exists "roasts_update_self" on public.roasts;
drop policy if exists "roasts_delete_self" on public.roasts;
create policy "roasts_select_all" on public.roasts for select using (status = 'published' or auth.uid() = user_id);
create policy "roasts_insert_self" on public.roasts for insert with check (auth.uid() = user_id);
create policy "roasts_update_self" on public.roasts for update using (auth.uid() = user_id);
create policy "roasts_delete_self" on public.roasts for delete using (auth.uid() = user_id);

-- poi_topics：所有人可读，仅本人可写（首次打卡时创建）
drop policy if exists "poi_topics_select_all" on public.poi_topics;
drop policy if exists "poi_topics_insert_self" on public.poi_topics;
drop policy if exists "poi_topics_update_self" on public.poi_topics;
create policy "poi_topics_select_all" on public.poi_topics for select using (true);
create policy "poi_topics_insert_self" on public.poi_topics for insert with check (auth.uid() is not null);
create policy "poi_topics_update_self" on public.poi_topics for update using (auth.uid() is not null);

-- daily_signin：仅本人可读写
drop policy if exists "signin_select_self" on public.daily_signin;
drop policy if exists "signin_insert_self" on public.daily_signin;
create policy "signin_select_self" on public.daily_signin for select using (auth.uid() = user_id);
create policy "signin_insert_self" on public.daily_signin for insert with check (auth.uid() = user_id);

-- votes：仅本人可写，所有人可读投票数
drop policy if exists "votes_select_all" on public.votes;
drop policy if exists "votes_insert_self" on public.votes;
create policy "votes_select_all" on public.votes for select using (true);
create policy "votes_insert_self" on public.votes for insert with check (auth.uid() = user_id);

-- user_items：仅本人可读
drop policy if exists "user_items_select_self" on public.user_items;
drop policy if exists "user_items_insert_self" on public.user_items;
create policy "user_items_select_self" on public.user_items for select using (auth.uid() = user_id);
create policy "user_items_insert_self" on public.user_items for insert with check (auth.uid() = user_id);

-- monthly_events：所有人可读
drop policy if exists "events_select_all" on public.monthly_events;
create policy "events_select_all" on public.monthly_events for select using (is_active = true);

-- event_progress：仅本人可读写
drop policy if exists "event_progress_select_self" on public.event_progress;
drop policy if exists "event_progress_insert_self" on public.event_progress;
drop policy if exists "event_progress_update_self" on public.event_progress;
create policy "event_progress_select_self" on public.event_progress for select using (auth.uid() = user_id);
create policy "event_progress_insert_self" on public.event_progress for insert with check (auth.uid() = user_id);
create policy "event_progress_update_self" on public.event_progress for update using (auth.uid() = user_id);

-- reports：仅本人可创建举报
drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self" on public.reports for insert with check (auth.uid() = reporter_id);

-- violations / moderation_queue：仅管理员（service_role 自动绕过 RLS）
-- 普通用户不可读不可写

-- level_privileges：所有人可读
drop policy if exists "level_privileges_select_all" on public.level_privileges;
create policy "level_privileges_select_all" on public.level_privileges for select using (true);

-- ============================================================
-- 第十四部分：增量变更（配额管理 + 审核通道）
-- 2026-07-02 追加：行程数量限制 + 优质内容审核
-- ============================================================

-- profiles 表增加存储配额字段
alter table public.profiles add column if not exists storage_quota int not null default 3;
comment on column public.profiles.storage_quota is '行程存储配额上限，基础 3，审核通过 +2';

-- profiles 表增加角色字段（user/admin）
alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user','admin'));
comment on column public.profiles.role is '用户角色：user 普通用户 / admin 管理员（免配额、可审核）';

-- 把指定用户设为管理员（测试用）
update public.profiles set role = 'admin' where id in (
  select id from auth.users where email = '1539904695@qq.com'
);

-- ========== 修改 profiles RLS 为公开可读 ==========
-- 用户名/头像/等级等是公开展示的信息
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
drop policy if exists "profiles_select_self" on public.profiles;

-- ========== 删除 profiles 外键约束（允许插入虚拟用户）==========
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Phase 4.4：违规封禁字段
alter table public.profiles add column if not exists banned_until timestamptz;

-- Phase 5.1：投票票数（与积分独立，不互通）
alter table public.profiles add column if not exists tickets int not null default 0;

-- Phase 5.3：主页装扮主题（Lv8 解锁）
alter table public.profiles add column if not exists theme text;
-- Phase 5.3：专属标签（Lv6 解锁，存为 text 数组）
alter table public.profiles add column if not exists custom_tags text[];

-- Phase 5.3：专题合集表（Lv9 解锁）
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  cover_emoji text default '📚',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- 合集内容项
create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  target_id uuid not null,
  target_type text not null,
  added_at timestamptz not null default now(),
  unique(collection_id, target_id, target_type)
);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "collections_select_all" on public.collections;
create policy "collections_select_all" on public.collections for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "collections_insert_self" on public.collections;
create policy "collections_insert_self" on public.collections for insert with check (auth.uid() = user_id);
drop policy if exists "collections_update_self" on public.collections;
create policy "collections_update_self" on public.collections for update using (auth.uid() = user_id);
drop policy if exists "collections_delete_self" on public.collections;
create policy "collections_delete_self" on public.collections for delete using (auth.uid() = user_id);

drop policy if exists "collection_items_select_all" on public.collection_items;
create policy "collection_items_select_all" on public.collection_items for select using (true);
drop policy if exists "collection_items_insert_self" on public.collection_items;
create policy "collection_items_insert_self" on public.collection_items for insert with check (auth.uid() in (
  select user_id from public.collections where id = collection_id
));

-- ========== 插入虚拟用户（种子数据）==========
insert into public.profiles (id, username, avatar_url, bio, level, points, exp, role, storage_quota) values
  ('a0000000-0000-0000-0000-000000000001', '旅行达人小明', null, '走过100+城市，用脚步丈量世界', 8, 2680, 2680, 'user', 5),
  ('a0000000-0000-0000-0000-000000000002', '美食家小红', null, '寻找每一座城市的烟火气', 6, 1560, 1560, 'user', 5),
  ('a0000000-0000-0000-0000-000000000003', '摄影师小李', null, '用镜头记录旅途的光影', 7, 2100, 2100, 'user', 5),
  ('a0000000-0000-0000-0000-000000000004', '亲子游妈妈', null, '带娃看世界，陪伴是最好的礼物', 5, 980, 980, 'user', 4)
on conflict (id) do nothing;

-- ========== 插入虚拟行程模板 ==========
insert into public.trip_templates (id, author_id, title, destination, city, days, budget, day_plans, suitable_for, status, likes, favorites, copies, created_at) values
  -- 旅行达人小明的行程
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '北京3日深度游：古都韵味',
   '北京', '北京', 3, '2000-3000元',
   '[{"day":1,"title":"故宫天安门","items":[{"name":"故宫博物院","time":"9:00—17:00","desc":"世界文化遗产，明清两代皇宫","lng":116.397426,"lat":39.918058},{"name":"天安门广场","time":"17:00—18:30","desc":"世界上最大的城市广场","lng":116.397426,"lat":39.905494},{"name":"王府井大街","time":"19:00—21:00","desc":"北京最繁华的商业街","lng":116.410344,"lat":39.914189}]},{"day":2,"title":"长城一日游","items":[{"name":"八达岭长城","time":"8:00—17:00","desc":"不到长城非好汉","lng":116.024067,"lat":40.352789}]},{"day":3,"title":"颐和园圆明园","items":[{"name":"颐和园","time":"9:00—13:00","desc":"皇家园林博物馆","lng":116.275526,"lat":39.999084},{"name":"圆明园","time":"14:00—17:00","desc":"万园之园遗址","lng":116.299371,"lat":40.006551}]}]',
   ARRAY['经典','拍照','文化'], 'published', 128, 56, 34, now() - interval '10 days'),

  -- 美食家小红的行程
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
   '成都4日吃货地图',
   '成都', '成都', 4, '1500-2500元',
   '[{"day":1,"title":"宽窄巷子锦里","items":[{"name":"宽窄巷子","time":"10:00—14:00","desc":"老成都生活体验","lng":104.059526,"lat":30.670717},{"name":"锦里","time":"15:00—18:00","desc":"三国文化街区","lng":104.048702,"lat":30.642835},{"name":"武侯祠","time":"18:00—20:00","desc":"三国圣地","lng":104.048092,"lat":30.643958}]},{"day":2,"title":"都江堰青城山","items":[{"name":"都江堰","time":"9:00—13:00","desc":"世界水利文化鼻祖","lng":103.610784,"lat":30.997237},{"name":"青城山","time":"14:00—18:00","desc":"道教名山","lng":103.485216,"lat":30.900887}]},{"day":3,"title":"熊猫基地太古里","items":[{"name":"成都大熊猫繁育研究基地","time":"8:00—12:00","desc":"国宝乐园","lng":104.144562,"lat":30.732908},{"name":"太古里","time":"14:00—18:00","desc":"潮流时尚街区","lng":104.083801,"lat":30.653589}]},{"day":4,"title":"人民公园春熙路","items":[{"name":"人民公园","time":"9:00—12:00","desc":"老成都茶馆文化","lng":104.062378,"lat":30.658601},{"name":"春熙路","time":"14:00—20:00","desc":"成都最热闹的步行街","lng":104.083038,"lat":30.659528}]}]',
   ARRAY['美食','亲子','citywalk'], 'published', 256, 98, 67, now() - interval '7 days'),

  -- 摄影师小李的行程
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
   '云南5日光影之旅',
   '云南', '大理', 5, '3000-5000元',
   '[{"day":1,"title":"大理古城","items":[{"name":"大理古城","time":"14:00—20:00","desc":"南诏古国韵味","lng":100.225668,"lat":25.690398}]},{"day":2,"title":"洱海环游","items":[{"name":"洱海","time":"9:00—18:00","desc":"风花雪月之地","lng":100.184898,"lat":25.776517},{"name":"双廊古镇","time":"14:00—18:00","desc":"洱海东岸最美小镇","lng":100.181274,"lat":25.946702}]},{"day":3,"title":"苍山","items":[{"name":"苍山","time":"9:00—17:00","desc":"十九峰十八溪","lng":100.084526,"lat":25.675027}]},{"day":4,"title":"丽江古城","items":[{"name":"丽江古城","time":"14:00—22:00","desc":"世界文化遗产","lng":100.233013,"lat":26.872108}]},{"day":5,"title":"玉龙雪山","items":[{"name":"玉龙雪山","time":"8:00—17:00","desc":"北半球最南端雪山","lng":100.170146,"lat":27.10793}]}]',
   ARRAY['拍照','自然','小众'], 'published', 189, 112, 45, now() - interval '5 days'),

  -- 亲子游妈妈的行程
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004',
   '上海3日亲子乐园游',
   '上海', '上海', 3, '2000-4000元',
   '[{"day":1,"title":"迪士尼乐园","items":[{"name":"上海迪士尼乐园","time":"9:00—21:00","desc":"孩子的梦幻天堂","lng":121.674737,"lat":31.144371}]},{"day":2,"title":"海昌海洋公园","items":[{"name":"上海海昌海洋公园","time":"9:00—18:00","desc":"海洋动物世界","lng":121.913414,"lat":30.621448}]},{"day":3,"title":"上海科技馆外滩","items":[{"name":"上海科技馆","time":"9:00—16:00","desc":"亲子科普好去处","lng":121.544459,"lat":31.220692},{"name":"外滩","time":"18:00—21:00","desc":"上海地标夜景","lng":121.490317,"lat":31.241657}]}]',
   ARRAY['亲子','家庭','乐园'], 'published', 78, 34, 21, now() - interval '3 days'),

  -- 旅行达人小明第二个行程
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   '杭州2日西湖茶香',
   '杭州', '杭州', 2, '800-1500元',
   '[{"day":1,"title":"西湖经典","items":[{"name":"断桥残雪","time":"9:00—10:30","desc":"白娘子传说","lng":120.149484,"lat":30.262847},{"name":"雷峰塔","time":"11:00—13:00","desc":"西湖南岸地标","lng":120.150364,"lat":30.233246},{"name":"苏堤春晓","time":"14:00—17:00","desc":"西湖十景之首","lng":120.137244,"lat":30.245106}]},{"day":2,"title":"龙井茶文化","items":[{"name":"龙井村","time":"9:00—12:00","desc":"西湖龙井原产地","lng":120.114544,"lat":30.227661},{"name":"灵隐寺","time":"13:00—16:00","desc":"千年古刹","lng":120.100098,"lat":30.240872}]}]',
   ARRAY['经典','自然','美食'], 'published', 95, 41, 28, now() - interval '1 days')
on conflict (id) do nothing;

-- 审核通道表
create table if not exists public.template_reviews (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.trip_templates(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  quality_score int check (quality_score >= 1 and quality_score <= 5),
  review_note text default '',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_template on public.template_reviews(template_id);
create index if not exists idx_reviews_author on public.template_reviews(author_id, created_at desc);
create index if not exists idx_reviews_status on public.template_reviews(status);

-- RLS：作者可读自己的审核记录，所有人可读已通过的审核状态
alter table public.template_reviews enable row level security;
drop policy if exists "reviews_select_self" on public.template_reviews;
drop policy if exists "reviews_insert_self" on public.template_reviews;
drop policy if exists "reviews_update_admin" on public.template_reviews;
create policy "reviews_select_self" on public.template_reviews for select using (auth.uid() = author_id or status = 'approved');
create policy "reviews_insert_self" on public.template_reviews for insert with check (auth.uid() = author_id and status = 'pending');
create policy "reviews_update_admin" on public.template_reviews for update using (auth.uid() = reviewed_by or auth.uid() = author_id);

-- ========== Phase 5.4：Demo 满级账号幂等升级 ==========
-- 对已注册的 demo@trip.com 用户做幂等升级（Lv12 + 管理员 + 无限配额）
update public.profiles p
set
  level = 12,
  exp = 99999,
  points = 99999,
  role = 'admin',
  storage_quota = 999,
  username = 'Demo 满级体验官',
  bio = '🎁 官方提供的满级体验账号，可测试全部功能'
from auth.users u
where p.id = u.id and u.email = 'demo@trip.com';

-- ========== Phase 5.5：专属标签内容字段（Lv6 特权使用场景） ==========
-- trip_templates 和 travel_notes 表增加 custom_tags 字段
-- 用于发布内容时选择作者专属标签（与 suitable_for 系统标签语义分离）
alter table public.trip_templates add column if not exists custom_tags text[];
alter table public.travel_notes add column if not exists custom_tags text[];

-- ============================================================
-- 完成。执行后可验证：
-- select storage_quota from public.profiles limit 1;
-- select * from public.template_reviews limit 1;
-- ============================================================


-- ============================================================
-- 第十六部分：虚拟游记数据（Phase 2.2）
-- 用 $$ dollar-quote 包裹 HTML 内容，避免引号转义问题
-- ============================================================

-- 先补齐 travel_notes 表缺失的字段（与代码对齐）
alter table public.travel_notes add column if not exists destination text;
alter table public.travel_notes add column if not exists cover_image text;
alter table public.travel_notes add column if not exists cover_emoji text;
-- content 改为 text 类型（原 jsonb 不便存 HTML）
alter table public.travel_notes alter column content type text using content::text;

-- 幂等清理：删除已有虚拟游记（note_locations 会因 on delete cascade 自动清理）
delete from public.travel_notes where id in (
  'f0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000003',
  'f0000000-0000-0000-0000-000000000004'
);

-- 游记 1：大理（摄影师小李）
insert into public.travel_notes (id, author_id, title, content, destination, cover_image, cover_emoji, status, views, likes, favorites, created_at) values
('f0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000003',
 '我在大理的7天，把日子过成了诗',
 $content$
<h2>Day 1·初见洱海</h2>
<p>从下关一出站，风就把人吹醒了。租了辆小电驴，沿着环海西路慢慢骑。苍山的雪还没化完，洱海的水蓝得不像话。</p>
<img src="https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80" alt="洱海">
<p>在<span class="note-location-mark" data-lng="100.18" data-lat="25.79" data-name="洱海" data-address="大理白族自治州">洱海</span>边坐了一下午，什么也没干，就发呆。原来旅行的意义，有时候就是停下来。</p>
<h2>Day 3·喜洲的早市</h2>
<p>喜洲的早市是这次旅行最大的惊喜。白族阿婆背着竹篓，卖着自家种的菜和现烤的<span class="note-location-mark" data-lng="100.16" data-lat="25.82" data-name="喜洲古镇" data-address="大理市喜洲镇">喜洲</span>粑粑。</p>
<img src="https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80" alt="喜洲早市">
<blockquote>生活不在别处，就在此刻这一碗热汤里。</blockquote>
<h2>Day 5·苍山徒步</h2>
<p>从感通寺上山，走玉带云游路。海拔爬到2600米的时候，云就在脚下了。</p>
<img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" alt="苍山">
<p>下山后去古城吃了个酸辣鱼，大理的酸辣不是泰式那种，是木瓜的酸，特别开胃。</p>
<h2>写在最后</h2>
<p>大理是个适合发呆的地方。如果你也累了，就来这里住几天，不用打卡，不用赶路。</p>
$content$,
 '大理',
 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
 '🏔️',
 'published', 892, 234, 78, now() - interval '5 days');

-- 游记 1 地点标注
insert into public.note_locations (note_id, name, address, lng, lat) values
('f0000000-0000-0000-0000-000000000001', '洱海', '大理白族自治州', 100.18, 25.79),
('f0000000-0000-0000-0000-000000000001', '喜洲古镇', '大理市喜洲镇', 100.16, 25.82),
('f0000000-0000-0000-0000-000000000001', '苍山', '大理市', 100.10, 25.68);


-- 游记 2：西安（美食家小红）
insert into public.travel_notes (id, author_id, title, content, destination, cover_image, cover_emoji, status, views, likes, favorites, created_at) values
('f0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000002',
 '西安城墙下，我吃垮了一条街',
 $content$
<h2>回民街的深夜食堂</h2>
<p>晚上10点的<span class="note-location-mark" data-lng="108.94" data-lat="34.26" data-name="回民街" data-address="西安市碑林区">回民街</span>，人比白天还多。老孙家肉夹馍排了40分钟队，但第一口下去就值了。</p>
<img src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80" alt="西安美食">
<p>腊汁肉炖了8小时，馍是现打的，皮酥心软。咬下去肉汁混着馍香，绝了。</p>
<h2>城墙骑行</h2>
<p>第二天租了辆自行车在城墙上骑。13.7公里的城墙，骑完正好一圈。</p>
<img src="https://images.unsplash.com/photo-1591855034832-4ca6cb3b1b2d?w=800&q=80" alt="西安城墙">
<blockquote>在城墙上吹着风，看着下面的车水马龙，有种穿越时空的错觉。</blockquote>
<h2>必吃清单</h2>
<p>1. 肉夹馍 - 老孙家<br>2. 羊肉泡馍 - 老米家<br>3. 凉皮 - 盛家<br>4. 甄糕 - 永兴坊<br>5. 葫芦头 - 春发生</p>
<img src="https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&q=80" alt="泡馍">
<p>每一口都是历史，每一勺都是人间烟火。</p>
$content$,
 '西安',
 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
 '🍜',
 'published', 1247, 389, 156, now() - interval '3 days');

-- 游记 2 地点标注
insert into public.note_locations (note_id, name, address, lng, lat) values
('f0000000-0000-0000-0000-000000000002', '回民街', '西安市碑林区', 108.94, 34.26),
('f0000000-0000-0000-0000-000000000002', '西安城墙', '西安市', 108.94, 34.26);


-- 游记 3：上海亲子（亲子游妈妈）
insert into public.travel_notes (id, author_id, title, content, destination, cover_image, cover_emoji, status, views, likes, favorites, created_at) values
('f0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000004',
 '带5岁娃闯上海，亲子游原来可以这么轻松',
 $content$
<h2>迪士尼·不是噩梦是美梦</h2>
<p>带5岁娃去<span class="note-location-mark" data-lng="121.67" data-lat="31.14" data-name="上海迪士尼" data-address="浦东新区川沙镇">迪士尼</span>之前，我是崩溃的。但实际去了才发现，只要规划好，完全 OK。</p>
<img src="https://images.unsplash.com/photo-1583511655802-41816b23b593?w=800&q=80" alt="上海迪士尼">
<p>关键三点：1. 买尊享卡；2. 早起入园先排热门项目；3. 中午回酒店睡一觉，下午4点再回来。</p>
<h2>外滩夜景</h2>
<p>晚上带娃去<span class="note-location-mark" data-lng="121.49" data-lat="31.24" data-name="外滩" data-address="黄浦区">外滩</span>看夜景。娃指着东方明珠说"妈妈，那是大珠子！"笑死我了。</p>
<img src="https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=800&q=80" alt="外滩夜景">
<blockquote>孩子的眼睛里，整个世界都是新奇的。</blockquote>
<h2>亲子餐厅推荐</h2>
<p>1. 自然博物馆旁边的大象餐厅 - 有儿童区<br>2. 陆家嘴的云朵餐厅 - 玻璃幕墙看得到东方明珠<br>3. 南京路的豆捞坊 - 娃爱吃的菌菇锅</p>
<img src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80" alt="亲子餐厅">
<p>带娃旅行，节奏放慢一点，惊喜就多一点。</p>
$content$,
 '上海',
 'https://images.unsplash.com/photo-1583511655802-41816b23b593?w=800&q=80',
 '🎠',
 'published', 678, 145, 89, now() - interval '2 days');

-- 游记 3 地点标注
insert into public.note_locations (note_id, name, address, lng, lat) values
('f0000000-0000-0000-0000-000000000003', '上海迪士尼', '浦东新区川沙镇', 121.67, 31.14),
('f0000000-0000-0000-0000-000000000003', '外滩', '黄浦区', 121.49, 31.24);


-- 游记 4：北京胡同（旅行达人小明）
insert into public.travel_notes (id, author_id, title, content, destination, cover_image, cover_emoji, status, views, likes, favorites, created_at) values
('f0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000001',
 '北京胡同里的24小时，发现不一样的古都',
 $content$
<h2>清晨·国子监街</h2>
<p>早上6点的<span class="note-location-mark" data-lng="116.41" data-lat="39.95" data-name="国子监街" data-address="东城区">国子监街</span>，只有遛鸟的大爷和扫地的清洁工。阳光透过槐树叶子洒下来，整条街都是金色的。</p>
<img src="https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=800&q=80" alt="北京胡同">
<p>这是北京最安静的胡同，没有商铺，只有红墙和古柏。</p>
<h2>午后·五道营</h2>
<p>从雍和宫出来，拐进<span class="note-location-mark" data-lng="116.41" data-lat="39.95" data-name="五道营胡同" data-address="东城区">五道营胡同</span>。这里比南锣鼓巷清净，但咖啡馆和古着店一个不少。</p>
<img src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80" alt="五道营">
<p>在一家叫"藏红花"的小馆吃了碗炸酱面，老板娘是地道北京人，聊了半小时。</p>
<blockquote>真正的北京，不在景点里，在胡同的拐角处。</blockquote>
<h2>傍晚·什刹海</h2>
<p>太阳快落山的时候到<span class="note-location-mark" data-lng="116.38" data-lat="39.94" data-name="什刹海" data-address="西城区">什刹海</span>。湖边有人拉二胡，有人唱京剧，还有人在钓鱼。</p>
<img src="https://images.unsplash.com/photo-1546779909-19d5c4aca5c2?w=800&q=80" alt="什刹海">
<p>这才是老北京的样子，慢悠悠，有烟火气。</p>
$content$,
 '北京',
 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=800&q=80',
 '🏮',
 'published', 1023, 287, 134, now() - interval '1 days');

-- 游记 4 地点标注
insert into public.note_locations (note_id, name, address, lng, lat) values
('f0000000-0000-0000-0000-000000000004', '国子监街', '东城区', 116.41, 39.95),
('f0000000-0000-0000-0000-000000000004', '五道营胡同', '东城区', 116.41, 39.95),
('f0000000-0000-0000-0000-000000000004', '什刹海', '西城区', 116.38, 39.94);

