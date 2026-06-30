import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

const VALID_TIERS = {
  supporter_159: { amountCents: 15900, label: 'Destekçi' },
  supporter_259: { amountCents: 25900, label: 'Gönüllü' },
  supporter_359: { amountCents: 35900, label: 'Elçi' },
} as const;

type ContributionTier = keyof typeof VALID_TIERS;

type ContributionCheckoutBody = {
  tier?: ContributionTier;
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
    const body = (await req.json()) as ContributionCheckoutBody;
    const tier = body.tier;

    if (!tier || !(tier in VALID_TIERS)) {
      return new Response(JSON.stringify({ error: 'Geçersiz destek paketi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tierDef = VALID_TIERS[tier];

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

    const successUrl = body.successUrl ?? 'vora://settings/contribute?checkout=success';
    const cancelUrl = body.cancelUrl ?? 'vora://settings/contribute?checkout=cancelled';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'try',
            unit_amount: tierDef.amountCents,
            product_data: {
              name: `Vora Platform Desteği — ${tierDef.label}`,
              description: 'Gönüllü platform desteği (uygulama içi özellik sağlamaz)',
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
        tier,
        checkout_type: 'platform_contribution',
        amount_cents: String(tierDef.amountCents),
      },
    });

    await admin.from('platform_contributions').insert({
      user_id: userId,
      tier,
      amount_cents: tierDef.amountCents,
      currency: 'try',
      stripe_checkout_session_id: session.id,
      status: 'pending',
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
