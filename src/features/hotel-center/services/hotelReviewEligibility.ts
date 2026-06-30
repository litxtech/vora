import { supabase } from '@/lib/supabase/client';

export const HOTEL_REVIEW_UNLOCK_HOUR = 11;
export const HOTEL_REVIEW_TIMEZONE = 'Europe/Istanbul';

export type HotelReviewEligibilityReason =
  | 'login_required'
  | 'owner'
  | 'no_stay'
  | 'too_early'
  | null;

export type HotelReviewEligibility = {
  eligible: boolean;
  hasReview: boolean;
  checkOut: string | null;
  unlocksAt: string | null;
  reason: HotelReviewEligibilityReason;
};

export function formatHotelReviewUnlockLabel(unlocksAt: string | null, checkOut: string | null): string {
  if (unlocksAt) {
    const d = new Date(unlocksAt);
    const time = d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: HOTEL_REVIEW_TIMEZONE,
    });
    const date = checkOut
      ? new Date(`${checkOut}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
      : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    return `Çıkış günü (${date}) saat ${time}'den sonra değerlendirebilirsiniz.`;
  }
  return `Çıkış günü saat ${HOTEL_REVIEW_UNLOCK_HOUR}:00'dan sonra değerlendirebilirsiniz.`;
}

export function reviewEligibilityMessage(eligibility: HotelReviewEligibility): string {
  if (eligibility.eligible) {
    return eligibility.hasReview ? 'Konaklamanızı güncelleyin' : 'Konaklamanızı değerlendirin';
  }
  switch (eligibility.reason) {
    case 'no_stay':
      return 'Yalnızca bu otelde konaklayan misafirler değerlendirme yapabilir.';
    case 'too_early':
      return formatHotelReviewUnlockLabel(eligibility.unlocksAt, eligibility.checkOut);
    case 'login_required':
      return 'Değerlendirmek için giriş yapın.';
    default:
      return '';
  }
}

export async function fetchHotelReviewEligibility(hotelId: string): Promise<HotelReviewEligibility> {
  const { data, error } = await supabase.rpc('get_hotel_review_eligibility', {
    p_hotel_id: hotelId,
  });

  if (error || !data) {
    return { eligible: false, hasReview: false, checkOut: null, unlocksAt: null, reason: 'no_stay' };
  }

  const row = data as Record<string, unknown>;
  return {
    eligible: row.eligible === true,
    hasReview: row.has_review === true,
    checkOut: (row.check_out as string | null) ?? null,
    unlocksAt: (row.unlocks_at as string | null) ?? null,
    reason: (row.reason as HotelReviewEligibilityReason) ?? null,
  };
}
