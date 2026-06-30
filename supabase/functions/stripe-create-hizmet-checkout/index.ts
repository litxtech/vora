import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type HizmetCheckoutBody = {
  requestId?: string;
  offerId?: string;
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
    const body = (await req.json()) as HizmetCheckoutBody;
    const requestId = body.requestId;
    const offerId = body.offerId;

    if (!requestId || !offerId) {
      return new Response(JSON.stringify({ error: 'requestId ve offerId gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: request, error: requestError } = await admin
      .from('vora_service_requests')
      .select('id, title, requester_id, status, accepted_offer_id')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError || !request) {
      return new Response(JSON.stringify({ error: 'Talep bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.requester_id !== userId) {
      return new Response(JSON.stringify({ error: 'Yalnızca talep sahibi ödeme yapabilir' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.status !== 'offer_accepted') {
      return new Response(JSON.stringify({ error: 'Ödeme için önce teklif kabul edilmeli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.accepted_offer_id !== offerId) {
      return new Response(JSON.stringify({ error: 'Geçersiz teklif' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingPayment } = await admin
      .from('vora_service_payments')
      .select('id')
      .eq('request_id', requestId)
      .in('status', ['authorized', 'completed'])
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ error: 'Bu talep için ödeme zaten yapıldı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: offer, error: offerError } = await admin
      .from('vora_service_offers')
      .select('id, price, status, provider_id, vora_service_providers(display_name, user_id)')
      .eq('id', offerId)
      .maybeSingle();

    if (offerError || !offer || offer.status !== 'accepted') {
      return new Response(JSON.stringify({ error: 'Kabul edilmiş teklif bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountCents = Math.round(Number(offer.price) * 100);
    if (amountCents < 5000) {
      return new Response(JSON.stringify({ error: 'Minimum güvenli ödeme tutarı ₺50' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const commissionCents = Math.round(amountCents * 0.15);
    const providerNetCents = amountCents - commissionCents;

    const providerRaw = offer.vora_service_providers as
      | { display_name: string; user_id: string }
      | { display_name: string; user_id: string }[]
      | null;
    const provider = Array.isArray(providerRaw) ? providerRaw[0] : providerRaw;

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

    const successUrl =
      body.successUrl ?? `vora://detail/vora-hizmetler/request/${requestId}?checkout=success`;
    const cancelUrl =
      body.cancelUrl ?? `vora://detail/vora-hizmetler/request/${requestId}?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'try',
            unit_amount: amountCents,
            product_data: {
              name: request.title,
              description: `Vora Hizmetler — ${provider?.display_name ?? 'Usta'}`,
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
        request_id: requestId,
        offer_id: offerId,
        provider_id: offer.provider_id,
        provider_user_id: provider?.user_id ?? '',
        checkout_type: 'vora_service_offer',
        amount_cents: String(amountCents),
        commission_cents: String(commissionCents),
        provider_net_cents: String(providerNetCents),
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
