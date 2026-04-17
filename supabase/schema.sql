create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'contributor')),
  created_at timestamptz not null default now()
);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  category text not null,
  retailer text not null,
  purchase_date date not null,
  delivery_date date not null,
  return_deadline date not null,
  price numeric(10, 2) not null default 0,
  order_number text,
  purchase_url text,
  return_method text not null,
  status text not null,
  notes text,
  receipt_url text,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.return_items enable row level security;

create policy if not exists "public read workspaces"
  on public.workspaces for select
  using (true);

create policy if not exists "public insert workspaces"
  on public.workspaces for insert
  with check (true);

create policy if not exists "public read workspace_members"
  on public.workspace_members for select
  using (true);

create policy if not exists "public write workspace_members"
  on public.workspace_members for all
  using (true)
  with check (true);

create policy if not exists "public read return_items"
  on public.return_items for select
  using (true);

create policy if not exists "public write return_items"
  on public.return_items for all
  using (true)
  with check (true);

alter publication supabase_realtime add table public.workspace_members;
alter publication supabase_realtime add table public.return_items;
