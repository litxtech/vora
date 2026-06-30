import type { CenterDef } from '@/features/centers/types';
import type {
  MarketplaceCategory,
  MarketplaceCondition,
  MarketplaceDeliveryMode,
  MarketplaceListingStatus,
  MarketplaceListingType,
  MarketplaceListing,
  MarketplaceOfferStatus,
  MarketplaceOrderStatus,
  MarketplaceSort,
  MarketplaceTab,
} from '@/features/marketplace/types';
import { toUserFacingError } from '@/lib/errors';

export const MARKETPLACE_CENTER_DEF: CenterDef = {
  id: 'marketplace',
  section: 57,
  route: '/marketplace-center',
  title: 'Yerel Pazar',
  subtitle: 'İkinci el, takas ve güvenli al-sat',
  icon: 'storefront',
  accent: '#FF9800',
  group: 'economy',
  hasMap: true,
  hasCreate: true,
};

export const MARKETPLACE_ACCENT = '#FF9800';
export const MARKETPLACE_ACCENT_DEEP = '#E65100';
export const MARKETPLACE_GRADIENT = ['#FF9800', '#F07167'] as const;
export const MARKETPLACE_COMMISSION_RATE = 0.15;
export const MARKETPLACE_MIN_CHECKOUT_CENTS = 5000;
export const MARKETPLACE_NEARBY_RADIUS_KM = 15;
export const MARKETPLACE_MAX_PHOTOS = 8;
export const MARKETPLACE_MAX_DAILY_LISTINGS = 5;
export const MARKETPLACE_PAGE_SIZE = 20;

export const MARKETPLACE_ERROR_DUPLICATE =
  'Bu ürün için zaten aktif bir ilanınız var. Yeni kopya oluşturamazsınız — mevcut ilanı düzenleyin veya satılığa çıkarın.';

export const MARKETPLACE_ERROR_DAILY_LIMIT = `Günde en fazla ${MARKETPLACE_MAX_DAILY_LISTINGS} yeni ilan verebilirsiniz.`;

export function mapMarketplaceListingError(message: string): string {
  const lower = message.toLowerCase();
  if (
    message.includes('MARKETPLACE_DUPLICATE') ||
    lower.includes('marketplace_listings_author_fingerprint_active_idx') ||
    lower.includes('duplicate key')
  ) {
    return MARKETPLACE_ERROR_DUPLICATE;
  }
  if (message.includes('MARKETPLACE_DAILY_LIMIT')) {
    return MARKETPLACE_ERROR_DAILY_LIMIT;
  }
  return toUserFacingError(message, { fallback: 'İlan kaydedilemedi. Lütfen tekrar deneyin.' });
}
export const MARKETPLACE_MIN_TITLE_LENGTH = 3;
export const MARKETPLACE_MAX_TITLE_LENGTH = 80;
export const MARKETPLACE_MIN_DESCRIPTION_LENGTH = 10;
export const MARKETPLACE_MAX_DESCRIPTION_LENGTH = 2000;

export const MARKETPLACE_TABS: { id: MarketplaceTab; label: string; icon: string }[] = [
  { id: 'discover', label: 'Keşfet', icon: 'compass-outline' },
  { id: 'nearby', label: 'Yakınımdaki', icon: 'navigate-outline' },
  { id: 'free', label: 'Ücretsiz', icon: 'gift-outline' },
  { id: 'trade', label: 'Takas', icon: 'swap-horizontal-outline' },
  { id: 'entertainment', label: 'Eğlence', icon: 'game-controller-outline' },
  { id: 'electronics', label: 'Elektronik', icon: 'phone-portrait-outline' },
  { id: 'furniture', label: 'Mobilya', icon: 'bed-outline' },
  { id: 'favorites', label: 'Favoriler', icon: 'heart-outline' },
  { id: 'mine', label: 'İlanlarım', icon: 'person-outline' },
];

export const MARKETPLACE_PRIMARY_TABS = MARKETPLACE_TABS.filter((t) =>
  (['discover', 'nearby', 'free', 'trade', 'favorites'] as MarketplaceTab[]).includes(t.id),
);

export function listingSupportsSecureCheckout(
  listing: Pick<MarketplaceListing, 'status' | 'listingType' | 'price'>,
): boolean {
  return (
    listing.status === 'active' &&
    listing.listingType !== 'free' &&
    listing.listingType !== 'trade' &&
    listing.price != null &&
    listing.price * 100 >= MARKETPLACE_MIN_CHECKOUT_CENTS
  );
}

export const MARKETPLACE_SORT_OPTIONS: { id: MarketplaceSort; label: string }[] = [
  { id: 'favorites', label: 'En çok favori' },
  { id: 'newest', label: 'En yeni' },
  { id: 'price_asc', label: 'Fiyat ↑' },
  { id: 'price_desc', label: 'Fiyat ↓' },
  { id: 'nearest', label: 'En yakın' },
];

export const LISTING_TYPE_OPTIONS: { value: MarketplaceListingType; label: string }[] = [
  { value: 'sale', label: 'Satılık' },
  { value: 'negotiable', label: 'Pazarlık' },
  { value: 'trade', label: 'Takas' },
  { value: 'free', label: 'Ücretsiz' },
];

export const CONDITION_OPTIONS: { value: MarketplaceCondition; label: string }[] = [
  { value: 'new', label: 'Sıfır' },
  { value: 'like_new', label: 'Az kullanılmış' },
  { value: 'used', label: 'Kullanılmış' },
  { value: 'for_parts', label: 'Yedek parça / arızalı' },
];

export const DELIVERY_MODE_OPTIONS: { value: MarketplaceDeliveryMode; label: string }[] = [
  { value: 'meetup', label: 'Yüz yüze teslim' },
  { value: 'shipping', label: 'Kargo' },
];

export const CATEGORY_DEFS: Record<
  MarketplaceCategory,
  { label: string; icon: string; color: string; subcategories: { slug: string; label: string }[] }
> = {
  electronics: {
    label: 'Elektronik',
    icon: 'phone-portrait-outline',
    color: '#1E88E5',
    subcategories: [
      { slug: 'phone_tablet', label: 'Telefon & Tablet' },
      { slug: 'computer', label: 'Bilgisayar' },
      { slug: 'tv_audio', label: 'TV & Ses' },
      { slug: 'camera', label: 'Fotoğraf & Kamera' },
      { slug: 'console', label: 'Konsol & Oyun' },
      { slug: 'appliance', label: 'Küçük ev aleti' },
      { slug: 'accessory', label: 'Aksesuar' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  home_living: {
    label: 'Ev & Yaşam',
    icon: 'home-outline',
    color: '#FB8C00',
    subcategories: [
      { slug: 'kitchen', label: 'Mutfak eşyası' },
      { slug: 'bathroom', label: 'Banyo & Temizlik' },
      { slug: 'decor', label: 'Dekorasyon' },
      { slug: 'textile', label: 'Tekstil' },
      { slug: 'storage', label: 'Depolama' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  furniture: {
    label: 'Mobilya',
    icon: 'bed-outline',
    color: '#795548',
    subcategories: [
      { slug: 'living_room', label: 'Oturma odası' },
      { slug: 'bedroom', label: 'Yatak odası' },
      { slug: 'dining', label: 'Masa & sandalye' },
      { slug: 'office', label: 'Ofis mobilyası' },
      { slug: 'garden', label: 'Bahçe mobilyası' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  clothing: {
    label: 'Giyim & Aksesuar',
    icon: 'shirt-outline',
    color: '#E91E63',
    subcategories: [
      { slug: 'women', label: 'Kadın' },
      { slug: 'men', label: 'Erkek' },
      { slug: 'kids', label: 'Çocuk' },
      { slug: 'shoes', label: 'Ayakkabı' },
      { slug: 'bags', label: 'Çanta' },
      { slug: 'jewelry', label: 'Takı & saat' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  baby_kids: {
    label: 'Anne & Çocuk',
    icon: 'happy-outline',
    color: '#FF7043',
    subcategories: [
      { slug: 'stroller', label: 'Bebek arabası' },
      { slug: 'toys', label: 'Oyuncak' },
      { slug: 'school', label: 'Okul & kırtasiye' },
      { slug: 'gear', label: 'Bebek ekipmanı' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  sports: {
    label: 'Spor & Outdoor',
    icon: 'bicycle-outline',
    color: '#43A047',
    subcategories: [
      { slug: 'bike', label: 'Bisiklet' },
      { slug: 'fitness', label: 'Fitness' },
      { slug: 'camping', label: 'Kamp' },
      { slug: 'team', label: 'Takım sporu' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  entertainment: {
    label: 'Eğlence & Hobi',
    icon: 'game-controller-outline',
    color: '#9C27B0',
    subcategories: [
      { slug: 'video_games', label: 'Video oyun' },
      { slug: 'board_games', label: 'Masa oyunu' },
      { slug: 'music_instrument', label: 'Müzik aleti' },
      { slug: 'model', label: 'Model & maket' },
      { slug: 'drone', label: 'Drone & RC' },
      { slug: 'art_supply', label: 'Sanat malzemesi' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  books_media: {
    label: 'Kitap & Medya',
    icon: 'book-outline',
    color: '#5C6BC0',
    subcategories: [
      { slug: 'books', label: 'Kitap' },
      { slug: 'textbook', label: 'Ders kitabı' },
      { slug: 'magazine', label: 'Dergi' },
      { slug: 'media', label: 'Film & müzik' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  vehicles: {
    label: 'Araç & Parça',
    icon: 'car-outline',
    color: '#37474F',
    subcategories: [
      { slug: 'car', label: 'Otomobil' },
      { slug: 'motorcycle', label: 'Motosiklet' },
      { slug: 'parts', label: 'Yedek parça' },
      { slug: 'accessory', label: 'Aksesuar' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  garden_agri: {
    label: 'Bahçe & Tarım',
    icon: 'leaf-outline',
    color: '#2E7D32',
    subcategories: [
      { slug: 'tools', label: 'Bahçe aletleri' },
      { slug: 'pots', label: 'Saksı & ekipman' },
      { slug: 'machinery', label: 'Tarım makinesi' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  handmade: {
    label: 'El Emeği',
    icon: 'color-palette-outline',
    color: '#AB47BC',
    subcategories: [
      { slug: 'textile', label: 'Tekstil & örgü' },
      { slug: 'ceramic', label: 'Seramik' },
      { slug: 'wood', label: 'Ahşap' },
      { slug: 'jewelry', label: 'Takı' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  pets: {
    label: 'Evcil Hayvan',
    icon: 'paw-outline',
    color: '#8E24AA',
    subcategories: [
      { slug: 'accessories', label: 'Aksesuar' },
      { slug: 'carrier', label: 'Taşıma & kafes' },
      { slug: 'care', label: 'Bakım' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  office_business: {
    label: 'Ofis & İş',
    icon: 'briefcase-outline',
    color: '#455A64',
    subcategories: [
      { slug: 'electronics', label: 'Elektronik' },
      { slug: 'furniture', label: 'Mobilya' },
      { slug: 'equipment', label: 'Ekipman' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  collectibles: {
    label: 'Koleksiyon',
    icon: 'diamond-outline',
    color: '#FFB300',
    subcategories: [
      { slug: 'antique', label: 'Antika' },
      { slug: 'coins', label: 'Para & pul' },
      { slug: 'cards', label: 'Kart koleksiyonu' },
      { slug: 'vintage', label: 'Vintage' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  services: {
    label: 'Hizmet',
    icon: 'construct-outline',
    color: '#546E7A',
    subcategories: [
      { slug: 'repair', label: 'Tamir' },
      { slug: 'cleaning', label: 'Temizlik' },
      { slug: 'lesson', label: 'Özel ders' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  real_estate: {
    label: 'Emlak',
    icon: 'business-outline',
    color: '#00897B',
    subcategories: [
      { slug: 'sale', label: 'Satılık' },
      { slug: 'rent', label: 'Kiralık' },
      { slug: 'other', label: 'Diğer' },
    ],
  },
  other: {
    label: 'Diğer',
    icon: 'ellipsis-horizontal-outline',
    color: '#78909C',
    subcategories: [{ slug: 'other', label: 'Diğer' }],
  },
};

export const MARKETPLACE_CATEGORIES = Object.entries(CATEGORY_DEFS).map(([id, def]) => ({
  id: id as MarketplaceCategory,
  ...def,
}));

export const MARKETPLACE_CATEGORY_TABS = MARKETPLACE_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
  icon: c.icon,
  color: c.color,
}));

export const REPORT_REASONS = [
  { value: 'misleading', label: 'Yanıltıcı ilan' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Uygunsuz içerik' },
  { value: 'scam', label: 'Dolandırıcılık' },
  { value: 'prohibited', label: 'Yasak ürün' },
  { value: 'other', label: 'Diğer' },
];

export const ORDER_STATUS_LABELS: Record<MarketplaceOrderStatus, string> = {
  pending_payment: 'Ödeme bekleniyor',
  paid_escrow: 'Ödeme alındı',
  seller_shipped: 'Teslim edildi / kargoda',
  buyer_confirmed: 'Alıcı onayladı',
  platform_approved: 'Platform onayı',
  payout_scheduled: 'Ödeme planlandı',
  payout_completed: 'Ödeme yatırıldı',
  closed: 'Tamamlandı',
  disputed: 'Uyuşmazlık',
  refund_pending: 'İade bekleniyor',
  refunded: 'İade edildi',
  cancelled: 'İptal',
};

export const LISTING_STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  active: 'Aktif',
  reserved: 'Rezerve',
  sold: 'Satıldı',
  removed: 'Kaldırıldı',
  archived: 'Arşiv',
};

export const OFFER_STATUS_LABELS: Record<MarketplaceOfferStatus, string> = {
  pending: 'Beklemede',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri çekildi',
  expired: 'Süresi doldu',
};

export const TAB_EMPTY_MESSAGES: Partial<Record<MarketplaceTab, string>> = {
  discover: 'Henüz ilan yok. İlk ilanı siz verin.',
  nearby: 'Yakınınızda aktif ilan bulunamadı.',
  free: 'Ücretsiz ilan bulunamadı.',
  trade: 'Takas ilanı bulunamadı.',
  favorites: 'Henüz favori ilanınız yok.',
  mine: 'Henüz ilan vermediniz veya tüm ilanlar arşivlendi.',
};

export const MARKETPLACE_POPULAR_SEARCHES = [
  'iPhone',
  'bisiklet',
  'koltuk',
  'PlayStation',
  'bebek arabası',
  'laptop',
  'telefon',
  'klima',
];

export const FOOD_BLOCK_KEYWORDS = [
  'gıda',
  'yiyecek',
  'yemek',
  'içecek',
  'bal',
  'peynir',
  'reçel',
  'turşu',
  'kuruyemiş',
];

export function categoryLabel(category: MarketplaceCategory | string): string {
  return CATEGORY_DEFS[category as MarketplaceCategory]?.label ?? category;
}

export function categoryColor(category: MarketplaceCategory | string): string {
  return CATEGORY_DEFS[category as MarketplaceCategory]?.color ?? '#78909C';
}

export function categoryIcon(category: MarketplaceCategory | string): string {
  return CATEGORY_DEFS[category as MarketplaceCategory]?.icon ?? 'ellipsis-horizontal-outline';
}

export function subcategoryLabel(category: MarketplaceCategory, slug: string): string {
  return CATEGORY_DEFS[category]?.subcategories.find((s) => s.slug === slug)?.label ?? slug;
}

export function listingDetailPath(id: string): string {
  return `/detail/marketplace/${id}`;
}

export function listingClonePath(id: string): string {
  return `/marketplace-center/create?cloneFrom=${id}`;
}

export function listingEditPath(id: string): string {
  return `/marketplace-center/edit/${id}`;
}

export function marketplaceAccountPath(): string {
  return '/marketplace-center/account';
}

export function myListingsPath(): string {
  return '/marketplace-center/my-listings';
}

export function marketplaceOffersPath(): string {
  return '/marketplace-center/offers';
}

export function formatMarketplacePrice(
  price: number | null,
  listingType: MarketplaceListingType,
  currency = 'try',
): string {
  if (listingType === 'free') return 'ÜCRETSİZ';
  if (listingType === 'trade') return 'TAKAS';
  if (price == null) return 'Fiyat belirtilmedi';
  const symbol = currency.toLowerCase() === 'try' ? '₺' : currency.toUpperCase();
  return `${symbol}${price.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

export function formatCents(cents: number, currency = 'try'): string {
  const symbol = currency.toLowerCase() === 'try' ? '₺' : currency.toUpperCase();
  return `${symbol}${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatMarketplaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function saleDateGroupLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  }
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const MARKETPLACE_SELL_GREEN = '#43A047';
export const MARKETPLACE_COMMISSION_RED = '#EF5350';

export function commissionBreakdown(grossCents: number) {
  const commissionCents = Math.round(grossCents * MARKETPLACE_COMMISSION_RATE);
  const sellerNetCents = grossCents - commissionCents;
  return { commissionCents, sellerNetCents };
}

export function payoutDaysRemaining(payoutDueAt: string | null): number | null {
  if (!payoutDueAt) return null;
  const diff = new Date(payoutDueAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function containsBlockedFoodKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return FOOD_BLOCK_KEYWORDS.some((kw) => lower.includes(kw));
}
