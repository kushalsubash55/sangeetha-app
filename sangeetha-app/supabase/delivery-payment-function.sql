create or replace function public.record_delivery_payment(
  p_bill_number text,
  p_amount_received numeric,
  p_payment_method text
)
returns table (
  order_id uuid,
  bill_number text,
  total_paid numeric,
  amount_pending numeric,
  status text
)
language plpgsql
as $$
declare
  v_order public.orders%rowtype;
  v_new_total_paid numeric(10,2);
  v_new_pending numeric(10,2);
  v_next_status text;
  v_payment_type text;
begin
  if p_amount_received is null or p_amount_received <= 0 then
    raise exception 'Enter payment amount.';
  end if;

  if p_payment_method not in ('cash', 'upi') then
    raise exception 'Choose valid payment mode.';
  end if;

  select *
  into v_order
  from public.orders
  where orders.bill_number = p_bill_number
  for update;

  if not found then
    raise exception 'Bill number not found.';
  end if;

  if p_amount_received > v_order.amount_pending then
    raise exception 'Payment cannot be more than pending balance.';
  end if;

  v_new_total_paid := v_order.amount_paid + p_amount_received;
  v_new_pending := v_order.amount_pending - p_amount_received;
  v_next_status := case when v_new_pending = 0 then 'DELIVERED' else v_order.status end;
  v_payment_type := case
    when v_new_pending = 0 then 'full'
    when v_order.amount_paid = 0 then 'advance'
    else 'partial'
  end;

  insert into public.payments (
    order_id,
    amount,
    payment_method,
    payment_type,
    note
  )
  values (
    v_order.id,
    p_amount_received,
    p_payment_method,
    v_payment_type,
    case when v_new_pending = 0 then 'Final payment received' else 'Payment recorded' end
  );

  update public.orders
  set
    amount_paid = v_new_total_paid,
    amount_pending = v_new_pending,
    status = v_next_status,
    updated_at = now()
  where id = v_order.id;

  if v_new_pending = 0 and v_order.status <> 'DELIVERED' then
    insert into public.deliveries (
      order_id,
      note
    )
    values (
      v_order.id,
      'Delivered'
    );
  end if;

  insert into public.audit_logs (
    action,
    table_name,
    record_id,
    details
  )
  values (
    'ORDER_PAYMENT_UPDATED',
    'orders',
    v_order.id::text,
    jsonb_build_object(
      'bill_number', v_order.bill_number,
      'amount_received_now', p_amount_received,
      'payment_mode', p_payment_method,
      'auto_delivered', v_new_pending = 0,
      'status', v_next_status,
      'amount_paid', v_new_total_paid,
      'amount_pending', v_new_pending
    )
  );

  return query
  select
    v_order.id,
    v_order.bill_number,
    v_new_total_paid,
    v_new_pending,
    v_next_status;
end;
$$;
