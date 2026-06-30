import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type EventTicketStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export type EventTicket = {
  id: string;
  eventId: string;
  status: EventTicketStatus;
  amountCents: number;
  paidAt: string | null;
};

function checkoutReturnUrl(eventId: string, result: 'success' | 'cancelled'): string {
  return Linking.createURL(`detail/events/${eventId}`, { queryParams: { checkout: result } });
}

export async function fetchEventTicket(eventId: string, userId: string): Promise<EventTicket | null> {
  const { data } = await supabase
    .from('event_tickets')
    .select('id, event_id, status, amount_cents, paid_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    eventId: data.event_id,
    status: data.status as EventTicketStatus,
    amountCents: data.amount_cents,
    paidAt: data.paid_at,
  };
}

export async function startEventTicketCheckout(eventId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-event-checkout',
    {
      body: {
        eventId,
        successUrl: checkoutReturnUrl(eventId, 'success'),
        cancelUrl: checkoutReturnUrl(eventId, 'cancelled'),
      },
    },
  );

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  if (!data?.url) return { error: 'Ödeme sayfası açılamadı.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, checkoutReturnUrl(eventId, 'success'));
  if (result.type === 'cancel') {
    return { error: null };
  }

  return { error: null };
}

export async function checkInWithQrToken(token: string): Promise<{ ok: boolean; error?: string; eventId?: string }> {
  const { data, error } = await supabase.rpc('check_in_event', { p_qr_token: token.trim() });
  if (error) return { ok: false, error: supabaseErrorMessage(error)! };

  const result = data as { ok?: boolean; error?: string; event_id?: string } | null;
  if (!result?.ok) return { ok: false, error: result?.error ?? 'Giriş başarısız' };
  return { ok: true, eventId: result.event_id };
}

export function parseQrCheckInToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get('token');
    if (token) return token;
    const pathToken = url.pathname.split('/').filter(Boolean).pop();
    if (pathToken && /^[a-f0-9]{32}$/i.test(pathToken)) return pathToken;
  } catch {
    // not a URL
  }
  return trimmed.length >= 16 ? trimmed : null;
}
