const DEFAULT_FALLBACK = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
const RIDE_COMPLETE_FALLBACK = 'Yolculuk tamamlanamadı. Lütfen tekrar deneyin.';

type UserFacingErrorOptions = {
  fallback?: string;
  code?: string | null;
  domain?: 'rides' | 'general';
};

const TECHNICAL_MARKERS = [
  'violates',
  'constraint',
  'duplicate key',
  'pgrst',
  'postgresql',
  'postgres',
  'supabase',
  'row-level security',
  'jwt',
  'refresh_token',
  'fetch failed',
  'network request failed',
  'networkerror',
  'econnrefused',
  'etimedout',
  'enotfound',
  'json object requested',
  'permission denied for',
  'relation "',
  'column "',
  'schema cache',
  'invalid input syntax',
  'syntax error at',
  'could not find the',
  'internal server error',
  'unexpected token',
  'typeerror:',
  'referenceerror:',
  'edge function returned',
  'functionshttp',
  'non-2xx',
  'payment_intent',
  'stripe_customer',
  'off_session',
] as const;

function looksTechnical(message: string): boolean {
  const lower = message.toLowerCase();
  if (TECHNICAL_MARKERS.some((marker) => lower.includes(marker))) return true;
  if (/[a-z0-9]+_[a-z0-9_]+_(key|idx|check|fkey)\b/i.test(message)) return true;
  if (/^[A-Z0-9_]+$/.test(message.trim())) return true;
  if (/\b(public\.)?[a-z]+_[a-z0-9_]+\s*\(/i.test(message)) return true;
  if (/\bfinalize_ride|\bcomplete_ride|\bstripe_[a-z_]+/i.test(message)) return true;
  if (/\buuid\b/i.test(message) && !/[çğıöşüÇĞİÖŞÜ]/.test(message)) return true;
  return false;
}

function isAlreadyUserFacing(message: string): boolean {
  if (looksTechnical(message)) return false;
  if (message.length > 280) return false;
  return /[çğıöşüÇĞİÖŞÜ]|^(Lütfen|Bu |Henüz |Geçerli |Çok fazla |İşlem |Giriş |Şifre |E-posta |Oturum |Mesaj |İlan |Kayıt )/.test(
    message,
  );
}

function mapPostgresCode(code: string | null | undefined): string | null {
  switch (code) {
    case '23505':
      return 'Bu kayıt zaten mevcut.';
    case '23503':
      return 'İlgili kayıt bulunamadı veya artık geçerli değil.';
    case '23514':
      return 'Girdiğiniz bilgiler geçerli değil. Lütfen kontrol edip tekrar deneyin.';
    case '42501':
    case 'PGRST301':
      return 'Bu işlem için yetkiniz yok.';
    case 'PGRST116':
      return 'Aradığınız kayıt bulunamadı.';
    case 'PGRST202':
      return 'İşlem şu an kullanılamıyor. Lütfen biraz sonra tekrar deneyin.';
    case '22P02':
      return 'Girdiğiniz bilgiler geçerli değil.';
    case '57014':
      return 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
    default:
      return null;
  }
}

function mapKnownMessage(lower: string): string | null {
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'E-posta/kullanıcı adı veya şifre hatalı.';
  }

  if (
    lower.includes('email not confirmed') ||
    lower.includes('email_not_confirmed')
  ) {
    return 'E-posta henüz doğrulanmadı. Gelen kutunuzdaki kodu girin.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists')
  ) {
    return 'Bu hesap zaten kayıtlı.';
  }

  if (
    lower.includes('password should be at least') ||
    lower.includes('password is too short')
  ) {
    return 'Şifre çok kısa. Daha güçlü bir şifre seçin.';
  }

  if (
    lower.includes('token has expired') ||
    lower.includes('jwt expired') ||
    lower.includes('refresh_token_not_found') ||
    lower.includes('invalid refresh token')
  ) {
    return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
  }

  if (
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('already exists')
  ) {
    return 'Bu kayıt zaten mevcut.';
  }

  if (lower.includes('row-level security') || lower.includes('rls')) {
    return 'Bu işlem için yetkiniz yok.';
  }

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('internet connection') ||
    lower.includes('offline')
  ) {
    return 'İnternet bağlantısı yok. Bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
  }

  if (lower.includes('storage') && lower.includes('object not found')) {
    return 'Dosya bulunamadı.';
  }

  if (lower.includes('payload too large') || lower.includes('entity too large')) {
    return 'Dosya çok büyük. Daha küçük bir dosya seçin.';
  }

  if (lower.includes('not authorized') || lower.includes('unauthorized')) {
    return 'Bu işlem için oturum açmanız gerekiyor.';
  }

  if (lower.includes('forbidden')) {
    return 'Bu işlem için yetkiniz yok.';
  }

  if (lower.includes('profile not found') || lower.includes('kullanıcı bulunamadı')) {
    return 'Profil kaydı bulunamadı. Çıkış yapıp tekrar giriş yapın.';
  }

  if (
    lower.includes('edge function returned') ||
    lower.includes('non-2xx status code') ||
    lower.includes('functionshttperror')
  ) {
    return 'Sunucu işlemi tamamlanamadı. Lütfen biraz sonra tekrar deneyin.';
  }

  if (lower.includes('internal server error')) {
    return 'Ödeme sunucusuna ulaşılamadı. Lütfen biraz sonra tekrar deneyin.';
  }

  if (lower.includes('could not find the function') || lower.includes('pgrst202')) {
    return 'İşlem şu an kullanılamıyor. Lütfen biraz sonra tekrar deneyin.';
  }

  return mapRideKnownMessage(lower);
}

function mapRideKnownMessage(lower: string): string | null {
  if (lower.includes('yolculuk bulunamadı')) {
    return 'Yolculuk bulunamadı.';
  }
  if (lower.includes('yolculuk devam etmiyor')) {
    return 'Yolculuk şu an devam etmiyor.';
  }
  if (lower.includes('yolculuk başlatılamaz')) {
    return 'Bu yolculuk başlatılamaz.';
  }
  if (lower.includes('yolculuk tamamlanamadı') || lower.includes('iptal edilemez')) {
    return 'Yolculuk şu an bu işlem için uygun değil.';
  }
  if (lower.includes('yetkisiz') || lower.includes('oturum gerekli')) {
    return 'Bu işlem için yetkiniz yok.';
  }
  if (lower.includes('uygulama üzerinden tamamlama ve tahsilat')) {
    return 'Yolcu ödemeleri karttan tahsil edilmeli. Lütfen uygulama üzerinden tamamlayın.';
  }
  if (lower.includes('bazı yolculardan tahsilat alınamadı')) {
    return 'Bazı yolcuların ödemesi alınamadı. Kart bilgilerini kontrol etmelerini isteyin.';
  }
  if (lower.includes('geçersiz ödeme durumu')) {
    return 'Bazı yolcuların ödemesi henüz hazır değil. Kart kaydını tamamlamalarını bekleyin.';
  }
  if (lower.includes('kayıtlı kart bulunamadı')) {
    return 'Yolcunun kayıtlı kartı bulunamadı. Kartını yeniden kaydetmesini isteyin.';
  }
  if (lower.includes('stripe müşteri kaydı yok')) {
    return 'Yolcunun ödeme profili eksik. Kartını yeniden kaydetmesini isteyin.';
  }
  if (lower.includes('yeterli boş koltuk yok')) {
    return 'Yeterli boş koltuk kalmadı.';
  }
  if (
    lower.includes('stripe') ||
    lower.includes('payment_intent') ||
    lower.includes('payment method') ||
    lower.includes('off_session') ||
    lower.includes('card_declined') ||
    lower.includes('insufficient_funds')
  ) {
    return 'Ödeme işlemi tamamlanamadı. Yolcunun kart bilgilerini kontrol etmesini isteyin.';
  }
  if (lower.includes('finalize_ride') || lower.includes('complete_ride_trip')) {
    return RIDE_COMPLETE_FALLBACK;
  }

  return null;
}

/** Ham hata metnini kullanıcıya gösterilecek Türkçe mesaja çevirir. */
export function toUserFacingError(
  message: string | null | undefined,
  options?: UserFacingErrorOptions,
): string {
  const fallback =
    options?.domain === 'rides'
      ? RIDE_COMPLETE_FALLBACK
      : (options?.fallback ?? DEFAULT_FALLBACK);
  if (!message?.trim()) return fallback;

  const trimmed = message.trim();
  if (isAlreadyUserFacing(trimmed)) return trimmed;

  const byCode = mapPostgresCode(options?.code);
  if (byCode) return byCode;

  const lower = trimmed.toLowerCase();
  const rideMapped = mapRideKnownMessage(lower);
  if (rideMapped) return rideMapped;

  const mapped = mapKnownMessage(lower);
  if (mapped) return mapped;

  if (looksTechnical(trimmed)) return fallback;

  return trimmed;
}

type SupabaseErrorLike = {
  message?: string;
  code?: string;
} | null | undefined;

/** Supabase / PostgREST hata nesnesinden kullanıcı mesajı üretir. */
export function supabaseErrorMessage(
  error: SupabaseErrorLike,
  fallback?: string,
): string | null {
  if (!error) return null;
  return toUserFacingError(error.message, { code: error.code, fallback });
}

/** Edge function non-2xx yanıtından kullanıcı mesajı çıkarır. */
export async function edgeFunctionErrorMessage(
  error: unknown,
  data?: { error?: string; failures?: Array<{ error?: string }> } | null,
  options?: Pick<UserFacingErrorOptions, 'fallback' | 'domain'>,
): Promise<string> {
  const fallback =
    options?.domain === 'rides'
      ? RIDE_COMPLETE_FALLBACK
      : (options?.fallback ?? DEFAULT_FALLBACK);
  const mapOpts = { fallback, domain: options?.domain };

  if (data?.error) {
    return toUserFacingError(data.error, mapOpts);
  }

  if (!error || typeof error !== 'object') return fallback;

  const message = 'message' in error && typeof error.message === 'string' ? error.message : null;
  const context = 'context' in error ? (error as { context?: Response }).context : undefined;

  if (context && typeof context.json === 'function') {
    try {
      const payload = (await context.json()) as { error?: string; failures?: Array<{ error?: string }> };
      if (payload?.error) {
        return toUserFacingError(payload.error, mapOpts);
      }
    } catch {
      // ignore parse errors
    }
  }

  return toUserFacingError(message, mapOpts);
}

/** Yolculuk işlemleri için kısa hata çevirisi. */
export function rideErrorMessage(
  message: string | null | undefined,
  fallback = RIDE_COMPLETE_FALLBACK,
): string {
  return toUserFacingError(message, { fallback, domain: 'rides' });
}
