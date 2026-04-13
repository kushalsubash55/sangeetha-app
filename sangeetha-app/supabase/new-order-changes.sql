do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'order_date'
  ) then
    alter table public.orders rename column order_date to received_date;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'delivery_date'
  ) then
    alter table public.orders rename column delivery_date to ready_date;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'bill_number'
      and data_type <> 'text'
  ) then
    alter table public.orders
      alter column bill_number drop identity if exists;

    alter table public.orders
      alter column bill_number type text using bill_number::text;
  end if;
end $$;

alter table public.orders
  alter column bill_number set not null;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('RECEIVED', 'READY', 'DELIVERED'));

alter table public.orders
  alter column status set default 'RECEIVED';

update public.orders
set status = case
  when upper(status) = 'PENDING' then 'RECEIVED'
  when upper(status) = 'READY' then 'READY'
  when upper(status) = 'DELIVERED' then 'DELIVERED'
  else 'RECEIVED'
end;
