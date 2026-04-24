create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  is_premium boolean not null default false,
  chat_id uuid,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;

drop policy if exists "users read own ai usage" on public.ai_usage_log;
create policy "users read own ai usage"
  on public.ai_usage_log
  for select
  using (auth.uid() = user_id);

drop policy if exists "admins read all ai usage" on public.ai_usage_log;
create policy "admins read all ai usage"
  on public.ai_usage_log
  for select
  using (public.is_admin());

create index if not exists ai_usage_log_user_created_idx
  on public.ai_usage_log(user_id, created_at desc);
create index if not exists ai_usage_log_created_idx
  on public.ai_usage_log(created_at desc);