export type PlatformSupportTier = 'supporter_159' | 'supporter_259' | 'supporter_359';

export type PlatformSupportPackage = {
  id: PlatformSupportTier;
  label: string;
  price: string;
  amountCents: number;
  description: string;
  badge?: string;
};

function formatTry(amount: number): string {
  return `₺${amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

/** Stripe Checkout ile aynı tutulmalı (TRY, kuruş) */
export const PLATFORM_SUPPORT_PACKAGES: PlatformSupportPackage[] = [
  {
    id: 'supporter_159',
    label: 'Destekçi',
    price: formatTry(159),
    amountCents: 15900,
    description: 'Platform geliştirmesine gönüllü katkı',
  },
  {
    id: 'supporter_259',
    label: 'Gönüllü',
    price: formatTry(259),
    amountCents: 25900,
    description: 'Sunucu ve altyapı maliyetlerine destek',
    badge: 'Popüler',
  },
  {
    id: 'supporter_359',
    label: 'Elçi',
    price: formatTry(359),
    amountCents: 35900,
    description: 'Topluluğa güçlü destek',
    badge: 'En yüksek',
  },
];

export const PLATFORM_SUPPORT_DISCLAIMERS = [
  'Bu gönüllü destek paketleri uygulama içi özellik, Premium veya dijital avantaj sağlamaz.',
  'Ödemeler Stripe güvenli ödeme altyapısı üzerinden tek seferlik olarak işlenir.',
  'Bağışınız platform geliştirme ve sunucu maliyetlerine katkı sağlar.',
] as const;

/** Yeşil tikin ne anlama geldiğini açıklayan başlık metni. */
export const PLATFORM_SUPPORT_TICK_TITLE = 'Platform Destekçisi';

/** Tike tıklandığında gösterilen amaç açıklaması. */
export const PLATFORM_SUPPORT_TICK_PURPOSE =
  'Bu yeşil tik, kullanıcının Vora platformuna gönüllü olarak maddi destek sağladığını gösterir. ' +
  'Destekçilerin katkısı sunucu, altyapı ve yeni özelliklerin geliştirilmesine harcanır.';

/** Diğer kullanıcıları da desteğe davet eden sıcak not. */
export const PLATFORM_SUPPORT_INVITE_NOTE =
  'Sen de platforma destek olabilirsin. Bir paket seçip katkıda bulunduğunda bu yeşil tik ' +
  'isminin yanında parıldamaya başlar ve topluluğa Vora’yı ayakta tuttuğunu gösterir.';

/** Destek modalındaki ödeme butonu metni. */
export const PLATFORM_SUPPORT_CTA_LABEL = 'Sen de Destek Ol';
