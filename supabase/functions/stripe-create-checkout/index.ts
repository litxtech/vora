import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe, priceIdForPlan } from '../_shared/stripe.ts';

type CheckoutBody = {
  plan?: 'monthly' | 'yearly';
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
    const body = (await req.json()) as CheckoutBody;
    const plan = body.plan === 'yearly' ? 'yearly' : 'monthly';
    const priceId = priceIdForPlan(plan);

    const { data: activeSub } = await admin
      .from('premium_subscriptions')
      .select('id, plan, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (activeSub) {
      const planLabel = activeSub.plan === 'yearly' ? 'Yıllık' : 'Aylık';
      return new Response(
        JSON.stringify({
          error: `Zaten aktif ${planLabel} Premium aboneliğiniz var. Yeni paket satın almanıza gerek yok.`,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: profilePremium } = await admin
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .maybeSingle();

    if (profilePremium?.is_premium && !activeSub) {
      return new Response(
        JSON.stringify({
          error: 'Zaten Premium üyesisiniz. Abonelik detaylarınızı Aboneliklerim ekranından görebilirsiniz.',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const successUrl = body.successUrl ?? 'vora://settings/premium?checkout=success';
    const cancelUrl = body.cancelUrl ?? 'vora://settings/premium?checkout=cancelled';

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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: { user_id: userId, plan },
      subscription_data: {
        metadata: { user_id: userId, plan },
      },
      allow_promotion_codes: true,
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
