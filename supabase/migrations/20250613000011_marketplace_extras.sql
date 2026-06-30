-- Yerel Pazar — yorum bildirimi, IBAN doğrulama, iade, payout hatırlatıcı

create or replace function public.notify_marketplace_listing_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.marketplace_listings%rowtype;
  v_author_name text;
begin
  if new.is_removed then
    return new;
  end if;

  select * into v_listing from public.marketplace_listings where id = new.listing_id;
  if not found or v_listing.author_id = new.author_id then
    return new;
  end if;

  select coalesce(full_name, username, 'Kullanıcı') into v_author_name
  from public.profiles where id = new.author_id;

  perform public.notify_marketplace_user(
    v_listing.author_id,
    'marketplace_comment',
    'İlanınıza yorum',
    left(v_author_name || ': ' || new.body, 120),
    jsonb_build_object('listing_id', new.listing_id, 'comment_id', new.id),
    new.author_id
  );

  return new;
end;
$$;

drop trigger if exists marketplace_comment_notify on public.marketplace_comments;
create trigger marketplace_comment_notify
  after insert on public.marketplace_comments
  for each row execute function public.notify_marketplace_listing_comment();

-- Satıcı IBAN admin listesi / doğrulama
create or replace function public.admin_list_marketplace_payout_profiles(p_limit int default 50)
returns table (
  user_id uuid,
  account_holder text,
  iban text,
  bank_name text,
  verified_at timestamptz,
  seller_name text,
  seller_username text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.user_id,
    pp.account_holder,
    pp.iban,
    pp.bank_name,
    pp.verified_at,
    p.full_name as seller_name,
    p.username as seller_username,
    pp.updated_at
  from public.marketplace_seller_payout_profiles pp
  join public.profiles p on p.id = pp.user_id
  where public.is_moderator()
  order by pp.verified_at nulls first, pp.updated_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.admin_verify_marketplace_payout_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  update public.marketplace_seller_payout_profiles
  set verified_at = now(),
      verified_by = auth.uid(),
      updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'IBAN profili bulunamadı';
  end if;
end;
$$;

-- Alıcı uyuşmazlık bildirimi
create or replace function public.marketplace_buyer_open_dispute(
  p_order_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.marketplace_orders%rowtype;
begin
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    return jsonb_build_object('error', 'En az 5 karakter açıklama girin');
  end if;

  select * into v_order from public.marketplace_orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('error', 'Sipariş bulunamadı');
  end if;

  if v_order.buyer_id <> auth.uid() then
    return jsonb_build_object('error', 'Yetkisiz');
  end if;

  if v_order.status not in ('paid_escrow', 'seller_shipped') then
    return jsonb_build_object('error', 'Bu aşamada uyuşmazlık açılamaz');
  end if;

  update public.marketplace_orders
  set status = 'disputed',
      dispute_reason = trim(p_reason),
      updated_at = now()
  where id = p_order_id;

  perform public.log_marketplace_order_event(
    p_order_id, 'dispute_opened', auth.uid(), 'buyer',
    jsonb_build_object('reason', trim(p_reason))
  );

  perform public.notify_marketplace_user(
    v_order.seller_id, 'marketplace_ship_request', 'Uyuşmazlık bildirimi',
    'Alıcı sipariş için uyuşmazlık açtı.',
    jsonb_build_object('order_id', p_order_id),
    auth.uid()
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- Stripe iade sonrası sipariş güncelleme
create or replace function public.admin_marketplace_order_refunded(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.marketplace_orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_order from public.marketplace_orders where id = p_order_id for update;
  if not found then
    raise exception 'Sipariş bulunamadı';
  end if;

  if v_order.status not in ('paid_escrow', 'seller_shipped', 'disputed', 'refund_pending', 'buyer_confirmed') then
    raise exception 'Bu sipariş iade edilemez durumda';
  end if;

  update public.marketplace_orders
  set status = 'refunded',
      refunded_at = now(),
      updated_at = now()
  where id = p_order_id;

  update public.marketplace_listings
  set status = 'active', sold_at = null, updated_at = now()
  where id = v_order.listing_id and status in ('reserved', 'sold');

  perform public.log_marketplace_order_event(
    p_order_id, 'refunded', auth.uid(), 'admin', '{}'
  );

  perform public.notify_marketplace_user(
    v_order.buyer_id, 'marketplace_payout_completed', 'İade tamamlandı',
    'Ödemeniz iade edildi.',
    jsonb_build_object('order_id', p_order_id),
    null
  );

  perform public.notify_marketplace_user(
    v_order.seller_id, 'marketplace_payout_completed', 'Sipariş iade edildi',
    'Alıcıya iade yapıldı, ilan yeniden aktif.',
    jsonb_build_object('order_id', p_order_id),
    null
  );
end;
$$;

-- Stripe admin iade RPC genişletmesi
create or replace function public.admin_get_stripe_payment_for_refund(
  p_payment_type text,
  p_record_id uuid
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  if p_payment_type = 'contribution' then
    select jsonb_build_object(
      'stripe_payment_intent_id', c.stripe_payment_intent_id,
      'status', c.status,
      'amount_cents', c.amount_cents,
      'username', p.username
    )
    into v_result
    from public.platform_contributions c
    join public.profiles p on p.id = c.user_id
    where c.id = p_record_id;
  elsif p_payment_type = 'event_ticket' then
    select jsonb_build_object(
      'stripe_payment_intent_id', t.stripe_payment_intent_id,
      'status', t.status,
      'amount_cents', t.amount_cents,
      'username', p.username
    )
    into v_result
    from public.event_tickets t
    join public.profiles p on p.id = t.user_id
    where t.id = p_record_id;
  elsif p_payment_type = 'marketplace_order' then
    select jsonb_build_object(
      'stripe_payment_intent_id', o.stripe_payment_intent_id,
      'status', o.status,
      'amount_cents', o.gross_amount_cents,
      'username', p.username
    )
    into v_result
    from public.marketplace_orders o
    join public.profiles p on p.id = o.buyer_id
    where o.id = p_record_id;
  else
    raise exception 'Geçersiz ödeme türü';
  end if;

  if v_result is null then
    raise exception 'Ödeme kaydı bulunamadı';
  end if;

  return v_result;
end; $$;

create or replace function public.admin_mark_stripe_payment_refunded(
  p_payment_type text,
  p_record_id uuid
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  if p_payment_type = 'contribution' then
    update public.platform_contributions
    set status = 'refunded'
    where id = p_record_id and status = 'completed';
    if not found then raise exception 'İade edilebilir katkı bulunamadı'; end if;

    delete from public.user_badges
    where user_id = (select user_id from public.platform_contributions where id = p_record_id)
      and badge_type = 'platform_supporter';
  elsif p_payment_type = 'event_ticket' then
    update public.event_tickets
    set status = 'refunded'
    where id = p_record_id and status = 'paid';
    if not found then raise exception 'İade edilebilir bilet bulunamadı'; end if;
  elsif p_payment_type = 'marketplace_order' then
    perform public.admin_marketplace_order_refunded(p_record_id);
  else
    raise exception 'Geçersiz ödeme türü';
  end if;
end; $$;

-- Payout hatırlatıcı (3 gün / 1 gün / gecikmiş)
create or replace function public.process_marketplace_payout_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count int := 0;
  v_days_left int;
begin
  for v_order in
    select o.id, o.seller_id, o.order_number, o.payout_due_at
    from public.marketplace_orders o
    where o.status = 'payout_scheduled'
      and o.payout_due_at is not null
      and o.payout_completed_at is null
  loop
    v_days_left := ceil(extract(epoch from (v_order.payout_due_at - now())) / 86400.0)::int;

    if v_days_left in (3, 1) or v_days_left < 0 then
      perform public.notify_marketplace_user(
        v_order.seller_id,
        'marketplace_payout_due',
        case when v_days_left < 0 then 'Ödeme gecikti' else 'Ödeme yaklaşıyor' end,
        case
          when v_days_left < 0 then v_order.order_number || ' için satıcı ödemesi gecikmiş.'
          else v_order.order_number || ' için ' || v_days_left || ' gün kaldı.'
        end,
        jsonb_build_object('order_id', v_order.id, 'days_left', v_days_left),
        null
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-marketplace-payout-reminders');
  perform cron.schedule(
    'process-marketplace-payout-reminders',
    '0 9 * * *',
    $job$select public.process_marketplace_payout_reminders()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; marketplace payout reminder manuel çalıştırılmalı: %', sqlerrm;
end;
$cron$;

grant execute on function public.admin_list_marketplace_payout_profiles(int) to authenticated;
grant execute on function public.admin_verify_marketplace_payout_profile(uuid) to authenticated;
grant execute on function public.marketplace_buyer_open_dispute(uuid, text) to authenticated;
grant execute on function public.admin_marketplace_order_refunded(uuid) to authenticated;
grant execute on function public.process_marketplace_payout_reminders() to service_role;
