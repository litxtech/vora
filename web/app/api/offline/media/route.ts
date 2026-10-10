import { createHash } from 'node:crypto';
import { conflictCopy, IMAGE_UPLOAD_LIMIT } from '@/lib/offline/policy';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';
import { currentUser } from '@/lib/session';
import { createSessionClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']);
const ID_OK = /^[a-z0-9:_-]{8,120}$/i;

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return json({ status: 'failed', message: 'Giriş gerekli.', permanent: true }, 401);
  const supabase = await createSessionClient();
  if (!supabase) return json({ status: 'retry', message: 'Bağlantı kurulamadı.' }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ status: 'failed', message: 'Dosya okunamadı.', permanent: true }, 400);
  }
  const id = String(form.get('id') ?? '');
  const kind = String(form.get('type') ?? '');
  const checksum = String(form.get('checksum') ?? '');
  const content = String(form.get('content') ?? '').trim();
  const regionId = String(form.get('regionId') ?? '').trim();
  const audience = String(form.get('audience') ?? '') === 'friends' ? 'friends' : 'public';
  const file = form.get('file');
  if (!ID_OK.test(id) || (kind !== 'photo' && kind !== 'video') || !(file instanceof File)) {
    return json({ status: 'failed', message: 'Yükleme bilgisi eksik.', permanent: true }, 400);
  }
  if (kind === 'video' || !ALLOWED.has(file.type)) {
    return json({
      status: 'failed',
      permanent: true,
      message: 'Bu dosya türü sunucuya yüklenemiyor. Taslak cihazda duruyor; video kovası yalnızca uygulamadaki desteklenen yüklemeyi kabul eder.',
    }, 415);
  }
  if (file.size > IMAGE_UPLOAD_LIMIT) {
    return json({
      status: 'failed',
      permanent: true,
      message: 'Dosya 10 MB sınırını aşıyor. Kuyrukta sonsuza kadar tutulmayacak.',
    }, 413);
  }
  if (!content || content.length > 4000 || !regionId) {
    return json({ status: 'failed', message: 'Paylaşım metni ve şehir gerekli.', permanent: true }, 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (!checksum || actual !== checksum) {
    return json({ status: 'failed', message: 'Dosya bütünlüğü doğrulanamadı.', permanent: true }, 400);
  }

  const existing = await supabase
    .from('offline_action_receipts')
    .select('status, message')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  const prior = existing.data as { status?: string; message?: string | null } | null;
  if (prior?.status === 'done') return json({ status: 'confirmed' }, 200);
  if (prior?.status === 'failed') return json({ status: 'failed', message: prior.message, permanent: true }, 409);
  if (!prior) {
    await supabase.from('offline_action_receipts').insert({
      id,
      user_id: user.id,
      action_type: kind,
      status: 'pending',
    });
  }

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${user.id}/offline_${id.replace(/[^a-z0-9_-]/gi, '').slice(0, 40)}.${ext}`;
  const uploaded = await uploadPublicImage(supabase, {
    folder: 'post-media',
    path,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType: file.type,
  });
  if (uploaded.error || !uploaded.url) {
    await supabase.from('offline_action_receipts').delete().eq('id', id).eq('user_id', user.id);
    return json({ status: 'retry', message: 'Dosya yüklenemedi. Tekrar denenecek.' }, 503);
  }
  const publicUrl = uploaded.url;
  const inserted = await supabase.from('posts').insert({
    author_id: user.id,
    region_id: regionId,
    content,
    category: 'general',
    audience,
    status: 'published',
    requires_moderation: false,
    media_urls: [publicUrl],
  });
  if (inserted.error) {
    const gone = inserted.error.code === '23503';
    if (gone) {
      await supabase.from('offline_action_receipts').update({ status: 'failed', message: conflictCopy() }).eq('id', id).eq('user_id', user.id);
      return json({ status: 'failed', message: conflictCopy(), permanent: true }, 409);
    }
    await supabase.from('offline_action_receipts').delete().eq('id', id).eq('user_id', user.id);
    return json({ status: 'retry', message: 'Paylaşım yazılamadı. Tekrar denenecek.' }, 503);
  }
  await supabase.from('offline_action_receipts').update({ status: 'done', message: null }).eq('id', id).eq('user_id', user.id);
  return json({ status: 'confirmed' }, 200);
}
