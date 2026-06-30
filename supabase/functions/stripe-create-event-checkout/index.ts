import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type EventCheckoutBody = {
  eventId?: string;
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
    const body = (await req.json()) as EventCheckoutBody;
    const eventId = body.eventId;
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'eventId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: event, error: eventError } = await admin
      .from('events')
      .select('id, title, ticket_type, ticket_price_cents, ticket_currency, status, organizer_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Etkinlik bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event.status !== 'published' || event.ticket_type !== 'paid') {
      return new Response(JSON.stringify({ error: 'Bu etkinlik ücretli bilet satışına açık değil' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountCents = event.ticket_price_cents ?? 0;
    if (amountCents < 100) {
      return new Response(JSON.stringify({ error: 'Geçersiz bilet fiyatı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event.organizer_id === userId) {
      return new Response(JSON.stringify({ error: 'Kendi etkinliğinize bilet alamazsınız' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingTicket } = await admin
      .from('event_tickets')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingTicket?.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Bu etkinlik için zaten biletiniz var' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const currency = (event.ticket_currency ?? 'try').toLowerCase();
    const successUrl = body.successUrl ?? `vora://detail/events/${eventId}?checkout=success`;
    const cancelUrl = body.cancelUrl ?? `vora://detail/events/${eventId}?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: event.title,
              description: 'Etkinlik bileti',
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
        event_id: eventId,
        checkout_type: 'event_ticket',
        amount_cents: String(amountCents),
      },
    });

    await admin.from('event_tickets').upsert(
      {
        event_id: eventId,
        user_id: userId,
        stripe_checkout_session_id: session.id,
        amount_cents: amountCents,
        currency,
        status: 'pending',
      },
      { onConflict: 'event_id,user_id' },
    );

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
