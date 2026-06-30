import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';
import { json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

type HotelCheckoutBody = {
  hotelId?: string;
  roomTypeId?: string | null;
  checkIn?: string;
  checkOut?: string;
  guestsCount?: number;
  applyStudentDiscount?: boolean;
  guestNote?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  successUrl?: string;
  cancelUrl?: string;
};

function mapStripeCheckoutError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('stripe_secret_key')) {
    return 'Ödeme sistemi yapılandırması eksik. Lütfen daha sonra tekrar deneyin.';
  }
  if (lower.includes('amount') && (lower.includes('minimum') || lower.includes('too small'))) {
    return 'Ödeme tutarı çok düşük. Lütfen konaklama süresini veya oda seçimini kontrol edin.';
  }
  if (lower.includes('currency') && lower.includes('try')) {
    return 'Ödeme para birimi şu an kullanılamıyor. Destek ekibiyle iletişime geçin.';
  }
  return message;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const { user, userClient, admin } = auth;
    const userId = user.id;
    const body = (await req.json()) as HotelCheckoutBody;
    const {
      hotelId,
      roomTypeId,
      checkIn,
      checkOut,
      guestsCount = 1,
      applyStudentDiscount = false,
      guestNote,
      guestFirstName,
      guestLastName,
      guestPhone,
    } = body;

    if (!hotelId || !checkIn || !checkOut) {
      return json({ error: 'Otel ve tarih bilgileri eksik.' }, 400);
    }

    if (!guestFirstName?.trim() || !guestLastName?.trim() || !guestPhone?.trim()) {
      return json({ error: 'Ad, soyad ve telefon zorunludur.' }, 400);
    }

    const { data: pending, error: pendingError } = await userClient.rpc('create_hotel_reservation_pending', {
      p_hotel_id: hotelId,
      p_guest_id: userId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests_count: guestsCount,
      p_apply_student_discount: applyStudentDiscount,
      p_guest_note: guestNote ?? null,
      p_room_type_id: roomTypeId ?? null,
      p_guest_first_name: guestFirstName.trim(),
      p_guest_last_name: guestLastName.trim(),
      p_guest_phone: guestPhone.trim(),
    });

    if (pendingError || !pending) {
      const rpcMessage = pendingError?.message ?? 'Rezervasyon oluşturulamadı';
      console.error('[stripe-create-hotel-checkout] pending rpc failed:', pendingError);
      return json({ error: rpcMessage }, 400);
    }

    const reservationId = pending.reservation_id as string;
    const reservationCode = pending.reservation_code as string;
    const grossCents = pending.gross_amount_cents as number;
    const nights = pending.nights as number;
    const hotelName = pending.hotel_name as string;

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, username, full_name')
      .eq('id', userId)
      .maybeSingle();

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? profile?.username ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const successUrl = body.successUrl ?? `vora://detail/hotels/${hotelId}?checkout=success`;
    const cancelUrl = body.cancelUrl ?? `vora://detail/hotels/${hotelId}?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'try',
            unit_amount: grossCents,
            product_data: {
              name: hotelName,
              description: `Otel rezervasyonu · ${nights} gece · ${reservationCode}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        checkout_type: 'hotel_reservation',
        user_id: userId,
        hotel_id: hotelId,
        reservation_id: reservationId,
        amount_cents: String(grossCents),
      },
    });

    await admin
      .from('hotel_reservations')
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    return json({
      url: session.url,
      reservationId,
      reservationCode,
      grossAmountCents: grossCents,
    });
  } catch (error) {
    console.error('[stripe-create-hotel-checkout]', error);
    const message = error instanceof Error ? error.message : String(error);
    const friendly = mapStripeCheckoutError(message);
    if (friendly !== message) {
      return json({ error: friendly }, 400);
    }
    return jsonSafeError(error, 500);
  }
});
