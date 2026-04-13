alter table orders
  alter column bill_number drop identity if exists;

alter table orders
  alter column bill_number type text using bill_number::text;

alter table orders
  alter column bill_number set not null;

alter table orders
  rename column order_date to received_date;

alter table orders
  rename column delivery_date to ready_date;

alter table orders
  drop constraint if exists orders_status_check;

alter table orders
  add constraint orders_status_check
  check (status in ('RECEIVED', 'READY', 'DELIVERED'));

alter table orders
  alter column status set default 'RECEIVED';
