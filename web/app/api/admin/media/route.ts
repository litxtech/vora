import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !ALLOWED.has(file.type) || file.size > 25 * 1024 * 1024) {
    return NextResponse.redirect(new URL('/admin/media?error=1', request.url));
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `${Date.now()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from('web-media').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return NextResponse.redirect(new URL('/admin/media?error=1', request.url));
  const { data } = supabase.storage.from('web-media').getPublicUrl(path);
  await supabase.from('web_media').insert({
    storage_path: path,
    public_url: data.publicUrl,
    filename: safeName,
    alt: String(form.get('alt') ?? '') || null,
    caption: String(form.get('caption') ?? '') || null,
    mime_type: file.type,
  });
  return NextResponse.redirect(new URL('/admin/media', request.url));
}
