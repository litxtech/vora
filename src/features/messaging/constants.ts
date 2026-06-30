/** Sohbet ekranı layout token'ları — renkler için useChatTheme kullanın */
export const CHAT_BUBBLE_RADIUS = 12;
export const CHAT_BUBBLE_MAX_WIDTH = '78%';
export const CHAT_BUBBLE_GAP = 6;
/** Grup sohbeti — gönderici avatarı */
export const CHAT_SENDER_AVATAR_SIZE = 28;
export const CHAT_SENDER_AVATAR_GAP = 6;

/** Aynı kişinin ardışık mesajları (grup içi) */
export const CHAT_GROUP_GAP = 4;

export function chatGroupBubbleMaxWidth(screenWidth: number): number {
  return (
    screenWidth -
    CHAT_LIST_HORIZONTAL_PAD * 2 -
    CHAT_SENDER_AVATAR_SIZE -
    CHAT_SENDER_AVATAR_GAP
  );
}
/** Farklı gönderen veya mesaj grupları arası */
export const CHAT_SENDER_GAP = 14;
export const CHAT_COMPOSER_MIN_HEIGHT = 52;
export const CHAT_NEAR_BOTTOM_THRESHOLD = 48;
export const CHAT_LIST_HORIZONTAL_PAD = 12;
/** Son mesaj ile input arası boşluk */
export const CHAT_BUBBLE_ABOVE_INPUT = 36;
/** Sohbet medya önizleme — feed ile uyumlu */
export const CHAT_MEDIA_WIDTH = 280;
export const CHAT_MEDIA_MAX_HEIGHT = 320;
export const CHAT_MEDIA_ASPECT = 16 / 9;
/** Paylaşılan reel kartı — dikey 9:16 */
export const CHAT_REEL_SHARE_WIDTH = 228;
export const CHAT_REEL_SHARE_ASPECT = 9 / 16;
/** Paylaşılan Yerel Pazar ilan kartı */
export const CHAT_MARKETPLACE_SHARE_WIDTH = 248;

/** Sohbet ekranında bellekte tutulacak maksimum mesaj (en yeniler). */
export const CHAT_MEMORY_MESSAGE_CAP = 800;

/** Medya galerisi sayfa boyutu */
export const CHAT_GALLERY_PAGE_SIZE = 48;

/** Sohbet açılışında çekilen ilk mesaj sayfası */
/** İlk karede çizilecek mesaj — tam sayfa beklenmez, alt kısım hemen görünür. */
export const CHAT_INITIAL_RENDER_COUNT = 18;

/** Sohbet açılışında tek seferde çekilen mesaj sayısı */
export const CHAT_MESSAGE_PAGE_SIZE = 50;

/** Tek seferde gönderilebilecek maksimum fotoğraf sayısı */
export const CHAT_MAX_IMAGES_PER_SEND = 10;

/** Süreli (kaybolan) fotoğraf görüntüleme süresi (saniye) */
export const CHAT_EPHEMERAL_DEFAULT_DURATION_SEC = 10;

/** Sohbet video — WhatsApp benzeri limitler */
export const CHAT_VIDEO_MAX_DURATION_SEC = 180;
export const CHAT_VIDEO_TARGET_HEIGHT = 720;
/** Supabase Free global limit (50 MB) — güvenli pay */
export const CHAT_VIDEO_MAX_UPLOAD_BYTES = 48 * 1024 * 1024;

/** @deprecated useChatTheme().incomingBubble */
export const CHAT_INCOMING_BUBBLE = '#182430';
/** @deprecated useChatTheme().outgoingBubble */
export const CHAT_OUTGOING_BUBBLE = '#1565C0';
