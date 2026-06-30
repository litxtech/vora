import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type RefundBody = {
  payment_type?: 'contribution' | 'event_ticket' | 'marketplace_order' | 'ride_reservation' | 'vora_service';
  record_id?: string;
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
      return new Response(JSON.stringify({ error: 'Oturum gerekli' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Yalnızca adminler iade yapabilir' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RefundBody;
    const paymentType = body.payment_type;
    const recordId = body.record_id;

    if (!paymentType || !recordId) {
      return new Response(JSON.stringify({ error: 'Ödeme bilgisi eksik' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: payment, error: paymentError } = await admin.rpc('admin_get_stripe_payment_for_refund', {
      p_payment_type: paymentType,
      p_record_id: recordId,
    });

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: paymentError?.message ?? 'Ödeme bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentIntentId = payment.stripe_payment_intent_id as string | null;
    const status = payment.status as string;
    const username = payment.username as string;
    const amountCents = payment.amount_cents as number;

    const refundableStatuses =
      paymentType === 'contribution'
        ? ['completed']
        : paymentType === 'event_ticket'
          ? ['paid']
          : paymentType === 'ride_reservation'
            ? ['held', 'refund_pending', 'released']
            : paymentType === 'vora_service'
              ? ['authorized', 'completed']
              : ['paid_escrow', 'seller_shipped', 'disputed', 'buyer_confirmed', 'refund_pending'];

    if (!refundableStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Bu ödeme iade edilemez durumda' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: 'Stripe ödeme kimliği bulunamadı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = getStripe();
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

    const { error: markError } = await admin.rpc('admin_mark_stripe_payment_refunded', {
      p_payment_type: paymentType,
      p_record_id: recordId,
    });

    if (markError) {
      console.error('admin_mark_stripe_payment_refunded failed:', markError.message);
      return new Response(
        JSON.stringify({
          error: 'Stripe iadesi oluştu ancak kayıt güncellenemedi. Destek ekibine bildirin.',
          refund_id: refund.id,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        refund_id: refund.id,
        username,
        amount_cents: amountCents,
        message: `@${username} için ₺${(amountCents / 100).toLocaleString('tr-TR')} iade başlatıldı`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
