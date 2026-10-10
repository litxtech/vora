import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { aiMusicPackage } from '../_shared/aiMusicPackages.ts';
import { getStripe } from '../_shared/stripe.ts';
import { json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

type ConfirmBody = {
  sessionId?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'Desteklenmeyen istek.' }, 405);

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;
    const { user, admin } = auth;

    const body = (await req.json()) as ConfirmBody;
    const sessionId = (body.sessionId ?? '').trim();
    if (!sessionId.startsWith('cs_')) return json({ error: 'Ödeme oturumu geçersiz.' }, 400);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metaUser = session.metadata?.user_id ?? session.client_reference_id;
    const packageId = session.metadata?.package_id ?? '';
    const pack = aiMusicPackage(packageId);

    if (session.metadata?.checkout_type !== 'ai_music_minutes' || metaUser !== user.id || !pack) {
      return json({ error: 'Bu ödeme hesabına ait değil.' }, 403);
    }
    if (session.payment_status !== 'paid') {
      return json({ credited: false, balance: null });
    }
    if (session.amount_total != null && session.amount_total !== pack.amountMinor) {
      return json({ error: 'Ödeme tutarı pakete uymuyor.' }, 400);
    }
    if (session.currency && session.currency !== 'try') {
      return json({ error: 'Ödeme para birimi geçersiz.' }, 400);
    }

    const { data, error } = await admin.rpc('fulfill_ai_music_purchase', {
      p_user_id: user.id,
      p_session_id: session.id,
      p_package_id: pack.id,
      p_amount_minor: pack.amountMinor,
    });
    if (error) return json({ error: 'Dakikalar hesaba yazılamadı.' }, 500);

    return json({ credited: true, balance: data });
  } catch (error) {
    return jsonSafeError(error);
  }
});
