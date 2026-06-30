-- Yerel Pazar — satıcı ilan durumu yönetimi

create or replace function public.marketplace_owner_set_listing_status(
  p_listing_id uuid,
  p_status public.marketplace_listing_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.marketplace_listings%rowtype;
  v_open_order int;
begin
  select * into v_listing from public.marketplace_listings where id = p_listing_id for update;
  if not found then
    return jsonb_build_object('error', 'İlan bulunamadı');
  end if;

  if v_listing.author_id <> auth.uid() then
    return jsonb_build_object('error', 'Yetkisiz');
  end if;

  if p_status = v_listing.status then
    return jsonb_build_object('ok', true);
  end if;

  select count(*)::int into v_open_order
  from public.marketplace_orders
  where listing_id = p_listing_id
    and status in (
      'pending_payment',
      'paid_escrow',
      'seller_shipped',
      'buyer_confirmed',
      'platform_approved',
      'payout_scheduled',
      'disputed',
      'refund_pending'
    );

  if p_status in ('active', 'reserved') and v_open_order > 0 then
    return jsonb_build_object('error', 'Devam eden sipariş varken bu işlem yapılamaz');
  end if;

  if p_status = 'active' and v_listing.status = 'sold' and v_open_order > 0 then
    return jsonb_build_object('error', 'Ödenmiş sipariş tamamlanmadan yeniden satışa açılamaz');
  end if;

  update public.marketplace_listings
  set
    status = p_status,
    sold_at = case
      when p_status = 'sold' then now()
      when p_status = 'active' then null
      else sold_at
    end,
    updated_at = now()
  where id = p_listing_id;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.marketplace_owner_set_listing_status(uuid, public.marketplace_listing_status) to authenticated;
