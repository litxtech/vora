import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';

const EVENTS = new Set([
  'web_page_view',
  'blog_view',
  'city_view',
  'public_post_view',
  'profile_view',
  'event_view',
  'download_click',
  'signup_click',
  'app_open_click',
]);

export async function POST(request: Request) {
  const client = createAnonClient();
  if (!client) return NextResponse.json({ ok: false }, { status: 204 });
  const body = (await request.json().catch(() => null)) as {
    event?: string;
    path?: string;
    contentType?: string;
    citySlug?: string;
    contentId?: string;
  } | null;
  if (!body || !body.event || !EVENTS.has(body.event) || !body.path || body.path.length > 300) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await client.from('web_analytics_events').insert({
    event_name: body.event,
    path: body.path,
    content_type: body.contentType ?? null,
    city_slug: body.citySlug ?? null,
    content_id: body.contentId ?? null,
  });
  return NextResponse.json({ ok: true });
}
