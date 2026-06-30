import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { upsertStripeSubscription } from '../_shared/premiumSubscription.ts';
import { corsHeaders, getStripe, planFromPriceId, priceIdForPlan } from '../_shared/stripe.ts';

type UpgradeBody = {
  action?: 'preview' | 'upgrade';
  targetPlan?: 'yearly';
};

type DbSubscription = {
  id: string;
  plan: string;
  stripe_subscription_id: string | null;
  payment_provider: string | null;
  status: string;
  expires_at: string;
};

function formatTry(cents: number): string {
  return `₺${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function prorationCreditCents(invoice: Stripe.Invoice): number {
  let credit = 0;
  for (const line of invoice.lines?.data ?? []) {
    if (line.amount < 0) {
      credit += Math.abs(line.amount);
    }
  }
  return credit;
}

async function loadStripeSubscription(
  stripe: ReturnType<typeof getStripe>,
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<
  | { error: string; status: number }
  | { dbSub: DbSubscription; stripeSub: Stripe.Subscription; itemId: string; customerId: string }
> {
  const { data: dbSub } = await admin
    .from('premium_subscriptions')
    .select('id, plan, stripe_subscription_id, payment_provider, status, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!dbSub) {
    return { error: 'Aktif abonelik bulunamadı.', status: 404 };
  }

  if (dbSub.payment_provider === 'apple') {
    return {
      error: 'Apple aboneliği yükseltmek için iPhone Ayarlar → Apple ID → Abonelikler bölümünü kullanın.',
      status: 400,
    };
  }

  if (!dbSub.stripe_subscription_id) {
    return { error: 'Stripe abonelik kaydı bulunamadı.', status: 404 };
  }

  if (dbSub.plan === 'yearly') {
    return { error: 'Zaten yıllık pakettesiniz.', status: 409 };
  }

  const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id);
  const itemId = stripeSub.items.data[0]?.id;
  const customerId = typeof stripeSub.customer === 'string'
    ? stripeSub.customer
    : stripeSub.customer?.id;

  if (!itemId || !customerId) {
    return { error: 'Abonelik detayları okunamadı.', status: 500 };
  }

  const currentPlan = (stripeSub.metadata?.plan as string | undefined) ??
    planFromPriceId(stripeSub.items.data[0]?.price?.id ?? '');

  if (currentPlan === 'yearly') {
    return { error: 'Zaten yıllık pakettesiniz.', status: 409 };
  }

  return { dbSub, stripeSub, itemId, customerId };
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
    const body = (await req.json().catch(() => ({}))) as UpgradeBody;
    const action = body.action === 'upgrade' ? 'upgrade' : 'preview';
    const targetPlan = body.targetPlan === 'yearly' ? 'yearly' : 'yearly';

    if (targetPlan !== 'yearly') {
      return new Response(JSON.stringify({ error: 'Desteklenmeyen hedef paket.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = getStripe();
    const loaded = await loadStripeSubscription(stripe, admin, userId);
    if ('error' in loaded) {
      return new Response(JSON.stringify({ error: loaded.error }), {
        status: loaded.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { stripeSub, itemId, customerId } = loaded;
    const yearlyPriceId = priceIdForPlan('yearly');

    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: stripeSub.id,
      subscription_details: {
        items: [{ id: itemId, price: yearlyPriceId }],
        proration_behavior: 'always_invoice',
      },
    });

    const amountDueCents = preview.amount_due ?? 0;
    const creditCents = prorationCreditCents(preview);
    const currency = preview.currency ?? 'try';

    if (action === 'preview') {
      return new Response(
        JSON.stringify({
          currentPlan: 'monthly',
          targetPlan: 'yearly',
          amountDueCents,
          creditCents,
          currency,
          amountDueFormatted: formatTry(amountDueCents),
          creditFormatted: creditCents > 0 ? formatTry(creditCents) : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const updated = await stripe.subscriptions.update(stripeSub.id, {
      items: [{ id: itemId, price: yearlyPriceId }],
      proration_behavior: 'always_invoice',
      cancel_at_period_end: false,
      metadata: {
        ...stripeSub.metadata,
        user_id: userId,
        plan: 'yearly',
      },
    });

    const upsert = await upsertStripeSubscription(admin, stripe, updated, {
      userId,
      plan: 'yearly',
      paymentVerified: true,
    });

    if (upsert.error) {
      return new Response(JSON.stringify({ error: upsert.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const item = updated.items?.data?.[0] as { current_period_end?: number } | undefined;
    const legacyEnd = (updated as { current_period_end?: number }).current_period_end;
    const periodEnd = item?.current_period_end ?? legacyEnd ?? Math.floor(Date.now() / 1000);

    return new Response(
      JSON.stringify({
        plan: 'yearly',
        amountDueCents,
        creditCents,
        amountDueFormatted: formatTry(amountDueCents),
        expiresAt: new Date(periodEnd * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('stripe-upgrade-subscription error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
