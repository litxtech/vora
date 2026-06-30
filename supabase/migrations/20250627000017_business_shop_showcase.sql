-- Mağaza vitrini: işletme sahibi ürün/otel sıralaması ve görünürlük yönetimi

create type public.business_shop_item_kind as enum ('product', 'hotel');

create table public.business_shop_showcase (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  item_kind public.business_shop_item_kind not null,
  item_id uuid not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, item_kind, item_id)
);

create index business_shop_showcase_business_sort_idx
  on public.business_shop_showcase (business_id, sort_order asc);

comment on table public.business_shop_showcase is
  'İşletme mağaza vitrininde gösterilecek ürün ve otellerin sırası ve görünürlüğü';

alter table public.business_shop_showcase enable row level security;

create policy business_shop_showcase_owner_all on public.business_shop_showcase
  for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
        and b.registration_status = 'approved'
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
        and b.registration_status = 'approved'
    )
  );

create policy business_shop_showcase_public_read on public.business_shop_showcase
  for select to anon, authenticated
  using (
    is_visible = true
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.registration_status = 'approved'
        and b.shop_published = true
        and b.commerce_mode <> 'none'
    )
  );

grant usage on type public.business_shop_item_kind to anon, authenticated;
grant select on public.business_shop_showcase to anon, authenticated;
grant insert, update, delete on public.business_shop_showcase to authenticated;
