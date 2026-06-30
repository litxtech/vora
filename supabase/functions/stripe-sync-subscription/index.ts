import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  upsertStripeSubscription,
  verifyStripeSubscriptionPaid,
} from '../_shared/premiumSubscription.ts';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

async function resolveCustomerId(
  stripe: ReturnType<typeof getStripe>,
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const search = await stripe.customers.search({
    query: `metadata['user_id']:'${userId}'`,
    limit: 1,
  });

  const customer = search.data[0];
  if (customer?.id) {
    await admin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', userId);
    return customer.id;
  }

  return null;
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
    const stripe = getStripe();

    const { data: existingActiveRows } = await admin
      .from('premium_subscriptions')
      .select('id, stripe_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    for (const row of existingActiveRows ?? []) {
      if (!row.stripe_subscription_id) {
        await admin.from('premium_subscriptions').update({ status: 'expired' }).eq('id', row.id);
        continue;
      }
      try {
        const existingSub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        const validOwner = existingSub.metadata?.user_id === userId;
        const paid = await verifyStripeSubscriptionPaid(stripe, existingSub);
        if (!validOwner || !paid) {
          await admin.from('premium_subscriptions').update({ status: 'expired' }).eq('id', row.id);
        }
      } catch {
        await admin.from('premium_subscriptions').update({ status: 'expired' }).eq('id', row.id);
      }
    }

    await admin.rpc('sync_premium_status', { p_user_id: userId });

    const customerId = await resolveCustomerId(stripe, admin, userId);

    let synced = 0;

    if (customerId) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 10,
      });

      for (const session of sessions.data) {
        if (
          session.status !== 'complete' ||
          session.payment_status !== 'paid' ||
          session.mode !== 'subscription' ||
          !session.subscription
        ) {
          continue;
        }

        const sessionUserId = session.metadata?.user_id ?? session.client_reference_id;
        if (!sessionUserId || sessionUserId !== userId) {
          continue;
        }

        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);

        if (sub.metadata?.user_id !== userId) {
          continue;
        }

        const result = await upsertStripeSubscription(admin, stripe, sub, {
          userId,
          plan: session.metadata?.plan as 'monthly' | 'yearly' | undefined,
          paymentVerified: true,
        });
        if (!result.error) synced += 1;
      }

      const activeList = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10,
      });

      for (const sub of activeList.data) {
        if (sub.metadata?.user_id !== userId) {
          continue;
        }
        if (!(await verifyStripeSubscriptionPaid(stripe, sub))) {
          continue;
        }
        const result = await upsertStripeSubscription(admin, stripe, sub, { userId });
        if (!result.error) synced += 1;
      }
    }

    const subSearch = await stripe.subscriptions.search({
      query: `metadata['user_id']:'${userId}' AND status:'active'`,
      limit: 10,
    });

    for (const sub of subSearch.data) {
      if (sub.metadata?.user_id !== userId) {
        continue;
      }
      if (!(await verifyStripeSubscriptionPaid(stripe, sub))) {
        continue;
      }
      const result = await upsertStripeSubscription(admin, stripe, sub, { userId });
      if (!result.error) synced += 1;
    }

    const { data: activeSub } = await admin
      .from('premium_subscriptions')
      .select('plan, expires_at, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeSub) {
      return new Response(
        JSON.stringify({
          synced: synced > 0,
          active: false,
          error: synced > 0
            ? 'Ödeme kaydı bulundu ancak aktif abonelik oluşturulamadı. Destek ile iletişime geçin.'
            : 'Ödenmiş Stripe aboneliği bulunamadı. Ödeme yapmadıysanız Premium aktifleşmez.',
        }),
        {
          status: synced > 0 ? 500 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        synced: synced > 0,
        active: true,
        plan: activeSub.plan ?? null,
        expiresAt: activeSub.expires_at ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('stripe-sync-subscription error:', message);
    return new Response(JSON.stringify({ error: message, active: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
