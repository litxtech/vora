import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { aiMusicPackage } from '../_shared/aiMusicPackages.ts';
import { getStripe } from '../_shared/stripe.ts';
import { json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

type CheckoutBody = {
  packageId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'Desteklenmeyen istek.' }, 405);

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;
    const { user, admin } = auth;

    const body = (await req.json()) as CheckoutBody;
    const pack = aiMusicPackage(body.packageId);
    if (!pack) return json({ error: 'Geçersiz paket.' }, 400);

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, username, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? profile?.username ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const successUrl = body.successUrl ?? 'vora://sounds/ai/packages?checkout=success&session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = body.cancelUrl ?? 'vora://sounds/ai/packages?checkout=cancelled';
    const amountTry = (pack.amountMinor / 100).toLocaleString('tr-TR');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'try',
            unit_amount: pack.amountMinor,
            product_data: {
              name: `Vora Müzik — ${pack.label}`,
              description: `${pack.minutes} dakika üretim hakkı · ${amountTry} TL`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        checkout_type: 'ai_music_minutes',
        package_id: pack.id,
        amount_minor: String(pack.amountMinor),
        seconds: String(pack.seconds),
      },
    });

    if (!session.url) return json({ error: 'Ödeme sayfası oluşturulamadı.' }, 500);
    return json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return jsonSafeError(error);
  }
});
