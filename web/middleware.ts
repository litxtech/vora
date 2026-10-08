import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const redirect = await lookupRedirect(path);
  if (redirect && redirect.to_path !== path) {
    return NextResponse.redirect(new URL(redirect.to_path, request.url), redirect.status_code);
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    await supabase.auth.getUser();
  }
  if (process.env.PUBLIC_SITE_INDEXABLE !== 'true') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  if (!request.cookies.get('vora_attr') && !path.startsWith('/admin') && !path.startsWith('/api')) {
    const type = path.startsWith('/city/')
      ? 'city'
      : path.startsWith('/p/')
        ? 'public_post'
        : path.startsWith('/blog/')
          ? 'blog'
          : path.startsWith('/u/')
            ? 'profile'
            : path.startsWith('/events/')
              ? 'event'
              : 'page';
    response.cookies.set(
      'vora_attr',
      JSON.stringify({
        landing_page: path,
        landing_content_type: type,
        landing_city: path.startsWith('/city/') ? path.split('/')[2] ?? '' : '',
        landing_post: path.startsWith('/p/') ? path.split('/')[2] ?? '' : '',
        landing_blog: path.startsWith('/blog/') ? path.split('/')[2] ?? '' : '',
      }),
      { sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' },
    );
  }
  return response;
}

async function lookupRedirect(path: string): Promise<{ to_path: string; status_code: number } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !path.startsWith('/')) return null;
  try {
    const endpoint = new URL('/rest/v1/web_redirects', url);
    endpoint.searchParams.set('from_path', `eq.${path}`);
    endpoint.searchParams.set('select', 'to_path,status_code');
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as { to_path: string; status_code: number }[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|vora-logo.png).*)'],
};
