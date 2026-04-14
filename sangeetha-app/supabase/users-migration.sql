create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  pin text not null,
  role text not null check (role in ('owner', 'employee')),
  created_at timestamptz not null default now()
);

insert into users (name, phone, pin, role)
values ('Kushal Subash', '4692749742', '5823', 'owner')
on conflict (phone) do update
set
  name = excluded.name,
  pin = excluded.pin,
  role = excluded.role;

drop table if exists app_users;
