import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

const GROWTH_DISCOUNT_RATE = 0.3;
const GROWTH_PERIOD_MS = 90 * 86_400_000;

const VALID_TIERS = ['starter', 'standard', 'premium'] as const;
const VALID_SCOPES = ['region', 'karadeniz'] as const;

type BoostTier = (typeof VALID_TIERS)[number];
type BoostScope = (typeof VALID_SCOPES)[number];

type CheckoutBody = {
  packageTier?: BoostTier;
  regionScope?: BoostScope;
  successUrl?: string;
  cancelUrl?: string;
};

type ShowcaseRow = {
  item_kind: 'product' | 'hotel';
  item_id: string;
  sort_order: number;
};

type SnapshotItem = {
  kind: 'product' | 'hotel';
  id: string;
  title: string;
  priceCents: number | null;
  imageUrl: string | null;
};

function tierLabel(tier: BoostTier): string {
  if (tier === 'starter') return 'Başlangıç (3 gün)';
  if (tier === 'premium') return 'Premium (14 gün)';
  return 'Standart (7 gün)';
}

function scopeLabel(scope: BoostScope): string {
  return scope === 'karadeniz' ? 'Karadeniz geneli' : 'Bölgesel';
}

function isGrowthPeriod(approvedAt: string | null): boolean {
  if (!approvedAt) return false;
  const ts = new Date(approvedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= GROWTH_PERIOD_MS;
}

async function buildShowcaseSnapshot(
  admin: ReturnType<typeof createClient>,
  businessId: string,
): Promise<SnapshotItem[]> {
  const { data: showcase } = await admin
    .from('business_shop_showcase')
    .select('item_kind, item_id, sort_order')
    .eq('business_id', businessId)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .limit(3);

  if (!showcase?.length) return [];

  const items: SnapshotItem[] = [];

  for (const row of showcase as ShowcaseRow[]) {
    if (row.item_kind === 'product') {
      const { data: product } = await admin
        .from('marketplace_listings')
        .select('id, title, price, cover_url, media_urls')
        .eq('id', row.item_id)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!product) continue;
      const media = product.media_urls as string[] | null;
      items.push({
        kind: 'product',
        id: product.id,
        title: product.title,
        priceCents: product.price != null ? Math.round(Number(product.price) * 100) : null,
        imageUrl: product.cover_url ?? media?.[0] ?? null,
      });
    } else {
      const { data: hotel } = await admin
        .from('hotel_listings')
        .select('id, name, price_per_night, cover_url')
        .eq('id', row.item_id)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!hotel) continue;
      items.push({
        kind: 'hotel',
        id: hotel.id,
        title: hotel.name,
        priceCents: hotel.price_per_night != null ? Math.round(Number(hotel.price_per_night) * 100) : null,
        imageUrl: hotel.cover_url ?? null,
      });
    }
  }

  return items;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authData.user.id;
    const body = (await req.json()) as CheckoutBody;
    const packageTier = body.packageTier;
    const regionScope = body.regionScope ?? 'region';

    if (!packageTier || !VALID_TIERS.includes(packageTier)) {
      return new Response(JSON.stringify({ error: 'Geçersiz paket seçimi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!VALID_SCOPES.includes(regionScope)) {
      return new Response(JSON.stringify({ error: 'Geçersiz bölge kapsamı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: business } = await admin
      .from('businesses')
      .select(
        'id, name, owner_id, region_id, registration_status, shop_published, commerce_mode, registration_approved_at',
      )
      .eq('owner_id', userId)
      .maybeSingle();

    if (!business || business.owner_id !== userId) {
      return new Response(JSON.stringify({ error: 'Onaylı işletme hesabı bulunamadı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (business.registration_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'İşletmeniz henüz onaylanmadı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!business.shop_published || business.commerce_mode === 'none') {
      return new Response(JSON.stringify({ error: 'Önce mağazanızı yayına alın' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: activeBoost } = await admin.rpc('get_business_shop_boost_status', {
      p_business_id: business.id,
    });

    if (activeBoost?.active === true) {
      return new Response(JSON.stringify({ error: 'Mağazanız zaten öne çıkarılmış durumda' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const regionId = regionScope === 'region' ? business.region_id : null;

    const { data: slotInfo, error: slotError } = await admin.rpc('shop_boost_slots_available', {
      p_scope: regionScope,
      p_region_id: regionId,
    });

    if (slotError) {
      return new Response(JSON.stringify({ error: slotError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((slotInfo as { available?: number })?.available === 0) {
      return new Response(
        JSON.stringify({ error: 'Bu bölgede öne çıkarma slotları dolu. Lütfen daha sonra tekrar deneyin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: listPrice, error: priceError } = await admin.rpc('shop_boost_list_price_cents', {
      p_tier: packageTier,
      p_scope: regionScope,
    });

    if (priceError || !listPrice) {
      return new Response(JSON.stringify({ error: 'Fiyat hesaplanamadı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: durationDays } = await admin.rpc('shop_boost_duration_days', {
      p_tier: packageTier,
    });

    const listPriceCents = Number(listPrice);
    const growthDiscount = isGrowthPeriod(business.registration_approved_at)
      ? Math.round(listPriceCents * GROWTH_DISCOUNT_RATE)
      : 0;
    const priceCents = listPriceCents - growthDiscount;
    const showcaseSnapshot = await buildShowcaseSnapshot(admin, business.id);

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, username, full_name')
      .eq('id', userId)
      .maybeSingle();

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authData.user.email ?? undefined,
        name: profile?.full_name ?? profile?.username ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const amountTry = (priceCents / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const successUrl = body.successUrl ?? 'vora://business-center/shop-boost?checkout=success';
    const cancelUrl = body.cancelUrl ?? 'vora://business-center/shop-boost?checkout=cancelled';

    const { data: boostRow, error: insertError } = await admin
      .from('business_shop_boosts')
      .insert({
        business_id: business.id,
        owner_id: userId,
        package_tier: packageTier,
        region_scope: regionScope,
        region_id: regionId,
        showcase_snapshot: showcaseSnapshot,
        list_price_cents: listPriceCents,
        discount_cents: growthDiscount,
        price_cents: priceCents,
        duration_days: Number(durationDays ?? 7),
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !boostRow) {
      return new Response(JSON.stringify({ error: insertError?.message ?? 'Kayıt oluşturulamadı' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'try',
            unit_amount: priceCents,
            product_data: {
              name: `Mağazayı Öne Çıkar — ${tierLabel(packageTier)}`,
              description: `${business.name} · ${scopeLabel(regionScope)} · ${amountTry} ₺`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        business_id: business.id,
        boost_id: boostRow.id,
        checkout_type: 'business_shop_boost',
        amount_cents: String(priceCents),
        package_tier: packageTier,
        region_scope: regionScope,
      },
    });

    await admin
      .from('business_shop_boosts')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', boostRow.id);

    return new Response(JSON.stringify({ url: session.url, boostId: boostRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
