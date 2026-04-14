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
