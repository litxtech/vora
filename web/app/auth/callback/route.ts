import { NextResponse, type NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/app';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/app';
  const supabase = await createSessionClient();
  if (!supabase) return NextResponse.redirect(new URL('/login', url.origin));

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && (type === 'recovery' || type === 'email' || type === 'signup')) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
