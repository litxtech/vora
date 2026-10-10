import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type DonationCheckoutBody = {
  donationId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

function clip(value: string, max: number) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1))}…`;
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

    const body = (await req.json()) as DonationCheckoutBody;
    if (!body.donationId) {
      return new Response(JSON.stringify({ error: 'Bağış kaydı gerekli.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: donation, error: donationError } = await admin
      .from('canlar_donations')
      .select('id, donor_id, campaign_id, gross_minor, currency, status, anonymous')
      .eq('id', body.donationId)
      .maybeSingle();

    if (donationError || !donation || donation.donor_id !== authData.user.id || donation.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Bağış kaydı bulunamadı.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: campaign } = await admin
      .from('canlar_campaigns')
      .select('id, title, case_id, status, payments_enabled, currency')
      .eq('id', donation.campaign_id)
      .maybeSingle();

    if (!campaign || campaign.status !== 'live' || !campaign.payments_enabled) {
      return new Response(JSON.stringify({ error: 'Kampanya bağışa kapalı.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, username, full_name, is_guest')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profile?.is_guest) {
      return new Response(JSON.stringify({ error: 'Misafir hesaplar bağış yapamaz.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authData.user.email ?? undefined,
        name: profile?.full_name ?? profile?.username ?? undefined,
        metadata: { user_id: authData.user.id },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', authData.user.id);
    }

    const [{ data: rescue }, { data: posts }] = await Promise.all([
      campaign.case_id
        ? admin.from('canlar_cases').select('name, public_code').eq('id', campaign.case_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from('canlar_posts')
        .select('id, body')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    const post = posts?.[0] ?? null;
    const donorName = profile?.full_name?.trim() || 'Ad yok';
    const donorUsername = profile?.username?.trim() ? `@${profile.username.trim()}` : 'kullanıcı adı yok';
    const caseName = rescue?.name?.trim() || 'İsimsiz vaka';
    const caseCode = rescue?.public_code?.trim() || 'vaka kodu yok';
    const postLabel = post ? `${post.id} — ${clip(post.body, 180)}` : 'Bağlı gönderi yok';
    const action = 'Bağış ödemesi';
    const description = clip(
      [
        'Vora Canlar bağışı.',
        `Bağışçı: ${donorName} (${donorUsername}).`,
        `Kullanıcı: ${authData.user.id}.`,
        `Kampanya: ${campaign.title}.`,
        `Vaka: ${caseName} (${caseCode}).`,
        `Gönderi: ${postLabel}.`,
        `İşlem: ${action}.`,
      ].join(' '),
      1000,
    );

    const metadata = {
      checkout_type: 'canlar_donation',
      donation_id: donation.id,
      campaign_id: donation.campaign_id,
      campaign_title: clip(campaign.title, 500),
      user_id: authData.user.id,
      donor_name: clip(donorName, 500),
      donor_username: clip(donorUsername, 500),
      case_name: clip(caseName, 500),
      case_code: clip(caseCode, 500),
      post_id: post?.id ?? '',
      post_excerpt: clip(post?.body ?? 'Bağlı gönderi yok', 500),
      action,
      amount_cents: String(donation.gross_minor),
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: donation.currency,
            unit_amount: donation.gross_minor,
            product_data: {
              name: clip(`Vora Canlar bağışı — ${donorName} — ${campaign.title}`, 250),
              description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: body.successUrl ?? `vora://vora-canlar/donation/${donation.id}`,
      cancel_url: body.cancelUrl ?? `vora://vora-canlar/campaign/${donation.campaign_id}`,
      client_reference_id: donation.id,
      metadata,
      payment_intent_data: { description, metadata },
    });

    const { error: attachError } = await admin.rpc('canlar_attach_checkout', {
      p_donation_id: donation.id,
      p_session_id: session.id,
      p_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    });
    if (attachError) {
      return new Response(JSON.stringify({ error: 'Ödeme oturumu bağlanamadı.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: session.url, donationId: donation.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ödeme başlatılamadı.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
