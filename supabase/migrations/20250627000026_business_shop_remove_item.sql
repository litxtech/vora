-- Mağazadan ürün/otel kaldırma — işletme sahibi (business_id veya owner_id üzerinden)

create or replace function public.business_shop_remove_item(
  p_business_id uuid,
  p_item_kind public.business_shop_item_kind,
  p_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_listing public.marketplace_listings%rowtype;
  v_open_order int;
begin
  select * into v_business
  from public.businesses
  where id = p_business_id
    and owner_id = auth.uid()
    and registration_status = 'approved';

  if not found then
    return jsonb_build_object('error', 'İşletme bulunamadı veya bu işlem için yetkiniz yok');
  end if;

  if p_item_kind = 'product' then
    select * into v_listing
    from public.marketplace_listings
    where id = p_item_id
      and (
        business_id = p_business_id
        or author_id = v_business.owner_id
      )
    for update;

    if not found then
      return jsonb_build_object('error', 'Ürün bulunamadı');
    end if;

    if v_listing.status <> 'removed' then
      select count(*)::int into v_open_order
      from public.marketplace_orders
      where listing_id = p_item_id
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

      if v_open_order > 0 then
        return jsonb_build_object('error', 'Devam eden sipariş varken bu ürün kaldırılamaz');
      end if;

      update public.marketplace_listings
      set status = 'removed', updated_at = now()
      where id = p_item_id;
    end if;
  else
    delete from public.hotel_listings
    where id = p_item_id
      and (
        business_id = p_business_id
        or owner_id = v_business.owner_id
      );

    if not found then
      return jsonb_build_object('error', 'Otel bulunamadı');
    end if;
  end if;

  delete from public.business_shop_showcase
  where business_id = p_business_id
    and item_kind = p_item_kind
    and item_id = p_item_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.business_shop_remove_item(uuid, public.business_shop_item_kind, uuid) from public;
grant execute on function public.business_shop_remove_item(uuid, public.business_shop_item_kind, uuid) to authenticated;
