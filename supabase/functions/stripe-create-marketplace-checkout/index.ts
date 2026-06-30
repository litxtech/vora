import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { businessCommissionBreakdown } from '../_shared/businessCommission.ts';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type MarketplaceCheckoutBody = {
  listingId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

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
    const body = (await req.json()) as MarketplaceCheckoutBody;
    const listingId = body.listingId;
    if (!listingId) {
      return new Response(JSON.stringify({ error: 'listingId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: listing, error: listingError } = await admin
      .from('marketplace_listings')
      .select('id, title, price, currency, status, content_status, author_id, listing_type, business_id')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: 'İlan bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (listing.status !== 'active' || listing.content_status !== 'published') {
      return new Response(JSON.stringify({ error: 'Bu ilan satışa açık değil' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (listing.listing_type === 'free' || listing.listing_type === 'trade') {
      return new Response(JSON.stringify({ error: 'Bu ilan için online ödeme yapılamaz' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (listing.author_id === userId) {
      return new Response(JSON.stringify({ error: 'Kendi ilanınızı satın alamazsınız' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountCents = Math.round(Number(listing.price) * 100);
    if (amountCents < 5000) {
      return new Response(JSON.stringify({ error: 'Minimum güvenli ödeme tutarı ₺50' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let commissionCents = Math.round(amountCents * 0.15);
    let sellerNetCents = amountCents - commissionCents;

    if (listing.business_id) {
      const { data: business, error: businessError } = await admin
        .from('businesses')
        .select('registration_approved_at, owner:profiles!businesses_owner_id_fkey (is_premium)')
        .eq('id', listing.business_id)
        .maybeSingle();

      if (!businessError && business) {
        const ownerRaw = business.owner as { is_premium: boolean } | { is_premium: boolean }[] | null;
        const owner = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw;
        const breakdown = businessCommissionBreakdown(amountCents, 'product', {
          registrationApprovedAt: business.registration_approved_at as string | null,
          ownerIsPremium: owner?.is_premium ?? false,
        });
        commissionCents = breakdown.commissionCents;
        sellerNetCents = breakdown.netCents;
      }
    }

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

    const currency = (listing.currency ?? 'try').toLowerCase();
    const successUrl = body.successUrl ?? `vora://detail/marketplace/${listingId}?checkout=success`;
    const cancelUrl = body.cancelUrl ?? `vora://detail/marketplace/${listingId}?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: listing.title,
              description: 'Yerel Pazar — güvenli alışveriş',
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
        listing_id: listingId,
        seller_id: listing.author_id,
        checkout_type: 'marketplace_order',
        amount_cents: String(amountCents),
        commission_cents: String(commissionCents),
        seller_net_cents: String(sellerNetCents),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
