create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner', 'worker')),
  phone text,
  is_active boolean not null default true,
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
