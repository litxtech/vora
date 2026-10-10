import { applyReplay, parseReplay } from '@/lib/offline/replay';
import { currentUser } from '@/lib/session';
import { createSessionClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ status: 'failed', message: 'Giriş gerekli.', permanent: true }, { status: 401 });
  }
  const supabase = await createSessionClient();
  if (!supabase) {
    return Response.json({ status: 'retry', message: 'Bağlantı kurulamadı.' }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: 'failed', message: 'İşlem okunamadı.', permanent: true }, { status: 400 });
  }
  const parsed = parseReplay(body);
  if ('http' in parsed) {
    return Response.json({ status: parsed.status, message: parsed.message, permanent: parsed.permanent }, { status: parsed.http });
  }
  const outcome = await applyReplay(supabase, user.id, parsed.id, parsed.type, parsed.payload);
  return Response.json(
    { status: outcome.status, message: outcome.message, permanent: outcome.permanent },
    { status: outcome.http, headers: { 'cache-control': 'no-store' } },
  );
}
