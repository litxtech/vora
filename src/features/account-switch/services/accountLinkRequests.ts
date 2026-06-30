import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { AccountLinkRequestStatus } from '@/features/account-switch/types';

export async function requestAccountLink(
  targetUserId: string,
): Promise<{ requestId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('request_account_link', {
    p_target_user_id: targetUserId,
  });

  if (error) return { requestId: null, error: mapLinkRequestError(error.message) };
  return { requestId: typeof data === 'string' ? data : null, error: null };
}

export async function respondAccountLinkRequest(
  requestId: string,
  accept: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('respond_account_link_request', {
    p_request_id: requestId,
    p_accept: accept,
  });

  if (error) return { error: mapLinkRequestError(error.message) };
  return { error: null };
}

export async function fetchPendingAccountLinkRequestIds(
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('account_link_requests')
    .select('id')
    .eq('target_user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (error || !data) return new Set();
  return new Set(data.map((row) => row.id as string));
}

export async function fetchOutgoingPendingLinkRequest(
  userId: string,
): Promise<{ requestId: string; targetUserId: string; targetUsername: string | null } | null> {
  const { data, error } = await supabase
    .from('account_link_requests')
    .select('id, target_user_id, profiles:target_user_id(username)')
    .eq('requester_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const profile = data.profiles as { username?: string } | { username?: string }[] | null;
  const username = Array.isArray(profile) ? profile[0]?.username : profile?.username;
  return {
    requestId: data.id as string,
    targetUserId: data.target_user_id as string,
    targetUsername: username ?? null,
  };
}

export async function unlinkAccountLink(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_account_link');
  if (error) return { error: mapLinkRequestError(error.message) };
  return { error: null };
}

export async function cancelOutgoingAccountLinkRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('cancel_account_link_request', {
    p_request_id: requestId,
  });
  if (error) return { error: mapLinkRequestError(error.message) };
  return { error: null };
}

function mapLinkRequestError(message: string | undefined): string {
  const raw = message?.toLowerCase() ?? '';
  if (raw.includes('cannot link self')) return 'Kendi hesabınızı bağlayamazsınız.';
  if (raw.includes('account types must differ')) {
    return 'Yalnızca bireysel ve işletme hesapları birbirine bağlanabilir.';
  }
  if (raw.includes('link already exists')) return 'Bu hesaplardan biri zaten bağlı.';
  if (raw.includes('pending request exists')) return 'Bu hesap için zaten bekleyen bir istek var.';
  if (raw.includes('request not found')) return 'İstek bulunamadı veya zaten yanıtlandı.';
  if (raw.includes('request expired')) return 'Bağlama isteğinin süresi dolmuş.';
  if (raw.includes('link not found')) return 'Aktif hesap bağlantısı bulunamadı.';
  if (raw.includes('profile not found')) {
    return 'Hesap bulunamadı. Kullanıcı adını kontrol edin.';
  }
  if (raw.includes('kullanıcı bulunamadı')) {
    return 'Profil kaydı bulunamadı. Çıkış yapıp tekrar giriş yapın.';
  }
  return supabaseErrorMessage({ message }) ?? 'İşlem tamamlanamadı.';
}

export function isPendingAccountLinkNotification(
  eventType: string,
  data: Record<string, unknown> | null | undefined,
  pendingIds: Set<string>,
): boolean {
  if (eventType !== 'account_link_request') return false;
  const requestId = data?.request_id;
  return typeof requestId === 'string' && pendingIds.has(requestId);
}

export type AccountLinkRequestRow = {
  id: string;
  status: AccountLinkRequestStatus;
};
