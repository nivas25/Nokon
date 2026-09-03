-- Nokon v1 schema
-- Apply in Supabase SQL editor (or psql) as a privileged role.
-- UUIDs + timestamptz. Service role on the server; do not expose the service key.

-- gen_random_uuid() is in core Postgres 13+. pgcrypto is optional on Supabase.
do $$
begin
  create extension if not exists pgcrypto;
exception
  when others then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- sellers
-- ---------------------------------------------------------------------------
create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  shop_name text not null,
  youtube_handle text not null,
  phone text,
  city text,
  created_at timestamptz not null default now(),
  constraint sellers_youtube_handle_unique unique (youtube_handle)
);

comment on column public.sellers.youtube_handle is
  'Normalized lowercase, leading @ stripped. Match is exact.';

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  item_code text not null,
  title text not null,
  image_url text,
  price_paise integer not null check (price_paise >= 100),
  stock integer not null default 0 check (stock >= 0),
  sizes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_seller_item_code_unique unique (seller_id, item_code)
);

-- ---------------------------------------------------------------------------
-- buyers
-- ---------------------------------------------------------------------------
create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  default_address jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders
-- status: started | awaiting_buyer | blocked | awaiting_payment | paid | expired | failed
-- block_reason: OVER_CAP | OUT_OF_STOCK | SHOP_NOT_FOUND | ITEM_NOT_FOUND | PAYMENT_FAILED
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.buyers (id),
  seller_id uuid references public.sellers (id),
  item_id uuid references public.items (id),
  item_code text,
  size text,
  qty integer not null default 1 check (qty > 0),
  catalog_price_paise integer not null default 0,
  cap_paise integer,
  status text not null default 'started',
  block_reason text,
  mastra_run_id text,
  razorpay_order_id text,
  razorpay_payment_link_id text,
  razorpay_payment_link_url text,
  razorpay_payment_id text,
  reserved_until timestamptz,
  shipping_name text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_razorpay_payment_id_unique unique (razorpay_payment_id)
);

-- ---------------------------------------------------------------------------
-- messages  channel: main | watch
-- sender: buyer_human | buyer_agent | seller_agent | system
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  channel text not null check (channel in ('main', 'watch')),
  sender text not null check (
    sender in ('buyer_human', 'buyer_agent', 'seller_agent', 'system')
  ),
  body text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_events  decision: PASS | FAIL | INFO
-- payload: no secrets, no raw card data
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  step text not null,
  decision text not null check (decision in ('PASS', 'FAIL', 'INFO')),
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_seller_id_idx on public.orders (seller_id);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists items_seller_id_item_code_idx on public.items (seller_id, item_code);
create index if not exists messages_order_id_created_at_idx on public.messages (order_id, created_at);
create index if not exists audit_events_order_id_created_at_idx on public.audit_events (order_id, created_at);
create index if not exists sellers_youtube_handle_idx on public.sellers (youtube_handle);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- atomic stock reserve / release (called from server, not from the LLM)
-- ---------------------------------------------------------------------------
create or replace function public.reserve_item_stock(p_item_id uuid)
returns integer
language plpgsql
as $$
declare
  remaining integer;
begin
  update public.items
  set stock = stock - 1
  where id = p_item_id
    and is_active = true
    and stock > 0
  returning stock into remaining;

  if not found then
    return -1;
  end if;
  return remaining;
end;
$$;

create or replace function public.release_item_stock(p_item_id uuid)
returns integer
language plpgsql
as $$
declare
  remaining integer;
begin
  update public.items
  set stock = stock + 1
  where id = p_item_id
  returning stock into remaining;

  if not found then
    return -1;
  end if;
  return remaining;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle normalization helper
-- ---------------------------------------------------------------------------
create or replace function public.normalize_youtube_handle(raw text)
returns text
language sql
immutable
as $$
  select nullif(lower(regexp_replace(coalesce(raw, ''), '^@+', '')), '');
$$;

-- ---------------------------------------------------------------------------
-- realtime (Supabase)
-- Dashboard: Database → Publications → supabase_realtime, or:
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.orders;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: enabled, but open for anon SELECT on demo tables so Realtime works
-- without a full auth story. Mutations stay on the service role (server).
-- Tighten before any non-demo deploy.
-- ---------------------------------------------------------------------------
alter table public.sellers enable row level security;
alter table public.items enable row level security;
alter table public.buyers enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.audit_events enable row level security;

-- Roles anon/authenticated exist on Supabase, not on vanilla Postgres / PGlite.
do $$
begin
  drop policy if exists sellers_select_anon on public.sellers;
  drop policy if exists items_select_anon on public.items;
  drop policy if exists orders_select_anon on public.orders;
  drop policy if exists messages_select_anon on public.messages;
  drop policy if exists audit_select_anon on public.audit_events;
  drop policy if exists buyers_select_anon on public.buyers;

  create policy sellers_select_anon on public.sellers for select to anon, authenticated using (true);
  create policy items_select_anon on public.items for select to anon, authenticated using (true);
  create policy orders_select_anon on public.orders for select to anon, authenticated using (true);
  create policy messages_select_anon on public.messages for select to anon, authenticated using (true);
  create policy audit_select_anon on public.audit_events for select to anon, authenticated using (true);
  create policy buyers_select_anon on public.buyers for select to anon, authenticated using (true);
exception
  when undefined_object then null;
  when others then null;
end;
$$;

-- service_role bypasses RLS. No insert/update/delete policies for anon.
