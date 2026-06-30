import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, verifyApplePremiumPurchase } from '../_shared/apple.ts';

type VerifyBody = {
  transactionId?: string;
  purchaseToken?: string | null;
  productId?: string | null;
  sandbox?: boolean;
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

    const body = (await req.json()) as VerifyBody;
    const transactionId = body.transactionId?.trim();
    if (!transactionId && !body.purchaseToken) {
      return new Response(JSON.stringify({ error: 'transactionId or purchaseToken required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verified = await verifyApplePremiumPurchase({
      transactionId: transactionId ?? '',
      purchaseToken: body.purchaseToken,
      productId: body.productId,
      sandbox: body.sandbox ?? false,
    });

    const userId = authData.user.id;
    const row = {
      user_id: userId,
      plan: verified.plan,
      status: 'active' as const,
      payment_provider: 'apple' as const,
      apple_original_transaction_id: verified.originalTransactionId,
      apple_product_id: verified.productId,
      starts_at: verified.startsAt,
      expires_at: verified.expiresAt,
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      stripe_customer_id: null,
    };

    const { data: existing } = await admin
      .from('premium_subscriptions')
      .select('id')
      .eq('apple_original_transaction_id', verified.originalTransactionId)
      .maybeSingle();

    if (existing?.id) {
      await admin.from('premium_subscriptions').update(row).eq('id', existing.id);
    } else {
      await admin.from('premium_subscriptions').insert(row);
    }

    await admin.rpc('sync_premium_status', { p_user_id: userId });

    return new Response(
      JSON.stringify({
        ok: true,
        plan: verified.plan,
        expiresAt: verified.expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('apple-verify-subscription error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
