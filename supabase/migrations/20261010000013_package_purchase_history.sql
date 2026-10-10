-- Satın alınan paketlerin geçmişi ve 3 günlük itiraz kaydı.
-- Liste: Premium abonelik, platform destek paketi, mağaza vitrin paketi.

create table if not exists public.package_purchase_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  source_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint package_purchase_disputes_source_check
    check (source in ('premium', 'platform_support', 'shop_boost')),
  constraint package_purchase_disputes_reason_check
    check (char_length(btrim(reason)) between 10 and 800),
  constraint package_purchase_disputes_status_check
    check (status in ('open', 'reviewing', 'accepted', 'rejected')),
  constraint package_purchase_disputes_unique unique (user_id, source, source_id)
);

create index if not exists package_purchase_disputes_user_idx
  on public.package_purchase_disputes (user_id, created_at desc);

alter table public.package_purchase_disputes enable row level security;

drop policy if exists package_purchase_disputes_self_select on public.package_purchase_disputes;
create policy package_purchase_disputes_self_select
  on public.package_purchase_disputes
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.package_purchase_disputes to authenticated;

comment on table public.package_purchase_disputes is
  'Kullanıcının satın aldığı paket için itirazı. Süre satın alma anından itibaren 3 gündür.';

create or replace function public.list_my_package_purchases()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source', m.source,
        'source_id', m.source_id,
        'package_key', m.package_key,
        'purchased_at', m.purchased_at,
        'usage', m.usage,
        'fulfillment_problem', m.fulfillment_problem,
        'amount_cents', m.amount_cents,
        'meta', m.meta,
        'duration_days', m.duration_days,
        'dispute_id', d.id,
        'dispute_status', d.status,
        'dispute_reason', d.reason,
        'dispute_created_at', d.created_at
      )
      order by m.purchased_at desc
    ),
    '[]'::jsonb
  )
  from (
    select
      'premium'::text as source,
      ps.id as source_id,
      ps.plan::text as package_key,
      ps.created_at as purchased_at,
      case
        when ps.status = 'active' and ps.expires_at > now() then 'using'
        when ps.status = 'cancelled' and ps.expires_at <= ps.starts_at then 'unused'
        else 'used'
      end as usage,
      (ps.status = 'cancelled' and ps.expires_at <= ps.starts_at) as fulfillment_problem,
      null::integer as amount_cents,
      ps.payment_provider::text as meta,
      null::integer as duration_days
    from public.premium_subscriptions ps
    where ps.user_id = auth.uid()

    union all

    select
      'platform_support'::text,
      c.id,
      c.tier,
      coalesce(c.completed_at, c.created_at),
      case when c.status = 'completed' then 'used' else 'unused' end,
      c.status = 'failed',
      c.amount_cents,
      c.currency,
      null::integer
    from public.platform_contributions c
    where c.user_id = auth.uid()
      and c.status in ('completed', 'failed')

    union all

    select
      'shop_boost'::text,
      b.id,
      b.package_tier::text,
      coalesce(b.paid_at, b.created_at),
      case
        when b.status = 'active' and coalesce(b.ends_at, now()) > now() then 'using'
        when b.starts_at is null then 'unused'
        else 'used'
      end,
      b.status = 'cancelled',
      b.price_cents,
      b.region_scope::text,
      b.duration_days
    from public.business_shop_boosts b
    where b.owner_id = auth.uid()
      and b.paid_at is not null
  ) m
  left join public.package_purchase_disputes d
    on d.user_id = auth.uid()
   and d.source = m.source
   and d.source_id = m.source_id;
$$;

create or replace function public.submit_package_purchase_dispute(
  p_source text,
  p_source_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_purchased timestamptz;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_row public.package_purchase_disputes;
begin
  if v_user is null then
    raise exception 'Oturum gerekli.';
  end if;

  if p_source not in ('premium', 'platform_support', 'shop_boost') then
    raise exception 'Geçersiz paket.';
  end if;

  if char_length(v_reason) < 10 or char_length(v_reason) > 800 then
    raise exception 'İtiraz açıklaması 10 ile 800 karakter arasında olmalı.';
  end if;

  if p_source = 'premium' then
    select ps.created_at into v_purchased
    from public.premium_subscriptions ps
    where ps.id = p_source_id
      and ps.user_id = v_user;
  elsif p_source = 'platform_support' then
    select coalesce(c.completed_at, c.created_at) into v_purchased
    from public.platform_contributions c
    where c.id = p_source_id
      and c.user_id = v_user
      and c.status in ('completed', 'failed');
  else
    select coalesce(b.paid_at, b.created_at) into v_purchased
    from public.business_shop_boosts b
    where b.id = p_source_id
      and b.owner_id = v_user
      and b.paid_at is not null;
  end if;

  if v_purchased is null then
    raise exception 'Satın alma bulunamadı.';
  end if;

  if v_purchased < now() - interval '3 days' then
    raise exception 'İtiraz süresi satın almadan sonra 3 gün ile sınırlıdır.';
  end if;

  if exists (
    select 1
    from public.package_purchase_disputes existing
    where existing.user_id = v_user
      and existing.source = p_source
      and existing.source_id = p_source_id
  ) then
    raise exception 'Bu paket için itiraz zaten gönderildi.';
  end if;

  insert into public.package_purchase_disputes (user_id, source, source_id, reason)
  values (v_user, p_source, p_source_id, v_reason)
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'reason', v_row.reason,
    'created_at', v_row.created_at
  );
end;
$$;

revoke all on function public.list_my_package_purchases() from public, anon;
revoke all on function public.submit_package_purchase_dispute(text, uuid, text) from public, anon;
grant execute on function public.list_my_package_purchases() to authenticated;
grant execute on function public.submit_package_purchase_dispute(text, uuid, text) to authenticated;
