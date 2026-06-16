create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner', 'worker')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  pin text not null,
  role text not null check (role in ('owner', 'employee')),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  customer_name text not null,
  received_date date not null default current_date,
  ready_date date,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  amount_pending numeric(10,2) not null default 0 check (amount_pending >= 0),
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'READY', 'DELIVERED')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  payment_date timestamptz not null default now(),
  amount numeric(10,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'upi')),
  payment_type text not null check (payment_type in ('advance', 'partial', 'full')),
  upi_recipient text,
  recorded_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  delivered_at timestamptz not null default now(),
  delivered_by uuid references profiles(id),
  note text
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  table_name text not null,
  record_id text not null,
  details jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.get_next_bill_number()
returns text
language plpgsql
as $$
declare
  v_current_max bigint;
begin
  select coalesce(max(bill_number::bigint), 110)
  into v_current_max
  from public.orders
  where bill_number ~ '^[0-9]+$';

  return greatest(v_current_max + 1, 111)::text;
end;
$$;

create or replace function public.create_order_with_next_bill_number(
  p_customer_name text,
  p_received_date date,
  p_ready_date date,
  p_total_amount numeric,
  p_amount_paid numeric,
  p_notes text
)
returns table (
  id uuid,
  bill_number text,
  amount_pending numeric
)
language plpgsql
as $$
declare
  v_current_max bigint;
  v_next_bill_number text;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Enter customer name.';
  end if;

  if p_received_date is null then
    raise exception 'Enter date received.';
  end if;

  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Enter total amount.';
  end if;

  if p_amount_paid is null or p_amount_paid < 0 then
    raise exception 'Enter valid advance paid.';
  end if;

  if p_amount_paid > p_total_amount then
    raise exception 'Advance cannot be more than total amount.';
  end if;

  perform pg_advisory_xact_lock(111);

  select coalesce(max(orders.bill_number::bigint), 110)
  into v_current_max
  from public.orders
  where orders.bill_number ~ '^[0-9]+$';

  v_next_bill_number := greatest(v_current_max + 1, 111)::text;

  return query
  insert into public.orders (
    bill_number,
    customer_name,
    received_date,
    ready_date,
    total_amount,
    amount_paid,
    amount_pending,
    status,
    notes
  )
  values (
    v_next_bill_number,
    btrim(p_customer_name),
    p_received_date,
    p_ready_date,
    p_total_amount,
    p_amount_paid,
    p_total_amount - p_amount_paid,
    'RECEIVED',
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning orders.id, orders.bill_number, orders.amount_pending;
end;
$$;
