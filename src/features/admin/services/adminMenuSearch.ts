import { ADMIN_MENU_SECTIONS, type AdminMenuAccent } from '@/features/admin/constants';
import { SUBSCRIPTIONS_ENABLED, SUBSCRIPTION_ADMIN_MENU_IDS } from '@/features/profile/constants/subscriptionsConfig';
import {
  canAccessAdminMenuItem,
  type PermissionMap,
} from '@/features/admin/services/adminPermissions';
import type { UserRole } from '@/types/database';

export type AdminMenuSectionItem = {
  id: string;
  label: string;
  href: string;
  icon: (typeof ADMIN_MENU_SECTIONS)[number]['items'][number]['icon'];
  adminOnly: boolean;
  accent: AdminMenuAccent;
};

export type AdminMenuSection = {
  title: string;
  items: AdminMenuSectionItem[];
};
export type AdminMenuSearchItem = AdminMenuSectionItem & {
  section: string;
  keywords: string[];
};

const EXTRA_KEYWORDS: Record<string, string[]> = {
  calls: ['arama', 'sesli', 'goruntulu', 'agora', 'moderasyon'],
  users: ['kullanici', 'uye', 'ban', 'rol'],
  reports: ['sikayet', 'rapor', 'flag'],
  messaging: ['mesaj', 'dm', 'sohbet', 'chat'],
  content: ['gonderi', 'reel', 'yorum', 'icerik'],
  businesses: ['kurumsal', 'isletme', 'dogrulama'],
  'identity-verification': ['kimlik', 'tc', 'nufus'],
  'ai-moderation': ['yapay', 'zeka', 'ai'],
  'social-safety': ['engel', 'sessiz', 'mute', 'block'],
  'lost-items': ['kayip', 'buluntu'],
  centers: ['merkez', 'harita', 'anket', 'yardim'],
  reporter: ['muhabir', 'haber'],
  'news-verification': ['haber', 'dogrulama'],
  broadcasts: ['bildirim', 'duyuru', 'push', 'zamanla', 'hedef', 'guncelleme'],
  emergency: ['acil', 'afet'],
  operations: ['operasyon', 'is yuku'],
  'commerce-ops': ['ekonomi', 'operasyon', 'otel', 'pazar', 'yolculuk', 'personel', 'finans', 'pdf'],
  'vora-hizmetler': ['hizmet', 'usta', 'escrow', 'odeme', 'payout', 'iban', 'itiraz', 'iade'],
  'hotel-marketing': ['otel', 'pazarlama', 'kampanya', 'reklam', 'tanitim', 'one cikan', 'konaklama'],
  revenue: ['gelir', 'kazanc', 'para'],
  stripe: ['odeme', 'iade', 'kart'],
  permissions: ['izin', 'rol', 'yetki', 'sablon'],
  staff: ['yonetici', 'moderator', 'admin', 'yetki', 'rol', 'atama', 'tam yetki'],
  statistics: ['istatistik', 'analiz', 'metrik'],
  logs: ['kayit', 'log', 'islem'],
  security: ['guvenlik', 'sifre'],
  system: ['sistem', 'bakim'],
  kuru: ['ekonomi', 'coin', 'puan', 'jeton', 'cuzdan'],
  vcts: ['itiraz', 'guven'],
  ads: ['reklam', 'ilan'],
  premium: ['uyelik', 'abonelik'],
  tasks: ['gorev', 'odul'],
  hashtags: ['etiket', 'tag'],
  agenda: ['gundem'],
  map: ['harita'],
  support: ['destek', 'ticket'],
  'live-support': ['canli', 'destek', 'sohbet', 'chat'],
  'premium-support': ['premium', 'abonelik', 'destek'],
  appeals: ['itiraz'],
  campaigns: ['kampanya'],
  events: ['etkinlik', 'bilet'],
  communities: ['topluluk', 'grup'],
  channels: ['kanal'],
  personnel: ['personel', 'is arayan'],
  jobs: ['is ilani', 'ilan'],
  features: ['ozellik', 'ac kapa'],
  'account-lifecycle': ['hesap', 'silme', 'dondurma'],
  'feed-curation': ['sabitle', 'feed'],
  'reels-curation': ['reels', 'sabitle'],
  'discovery-curation': ['kesfet'],
  'profile-boost': ['one cikar', 'boost'],
  'verification-center': ['dogrulama merkezi'],
  'notification-stats': ['bildirim istatistik'],
  'notification-sounds': ['bildirim ses'],
  'music-library': ['muzik', 'ses'],
  'account-links': ['hesap', 'baglama', 'link', 'isletme'],
  'business-shops': ['magaza', 'vitrin', 'boost', 'ticaret'],
  hotels: ['otel', 'konaklama', 'ilan', 'yorum'],
  'proximity-match': ['yakinlik', 'eslesme', 'konum'],
  explorer: ['kasif', 'harita', 'konum'],
  'friend-invites': ['davet', 'referral', 'arkadas'],
  'referral-earnings': ['hakedis', 'referans', 'davet', 'komisyon'],
  'referral-finance': ['hakedis', 'finans', 'yukumluluk', 'odeme'],
  'referral-settings': ['hakedis', 'ayar', 'kampanya'],
  badges: ['rozet', 'oncu', 'pioneer', 'vora ikonu'],
  'app-intro': ['tanitim', 'onboarding', 'slayt'],
  'platform-contributions': ['katki', 'destek', 'bagis'],
};

const SECTION_SUGGESTED_IDS: Record<string, readonly string[]> = {
  Yönetim: ['reports', 'users', 'content', 'messaging', 'ai-moderation', 'support'],
  Programlar: ['reporter', 'communities', 'discovery-curation', 'ads', 'feed-curation'],
  İletişim: ['broadcasts', 'emergency', 'push-automation', 'sounds'],
  Analiz: ['statistics', 'map', 'revenue', 'logs'],
};

const SECTION_KEYWORDS: Record<string, string[]> = {
  Yönetim: ['yonetim', 'modul', 'panel', 'kullanici', 'sikayet', 'icerik'],
  Programlar: ['program', 'topluluk', 'reklam', 'gundem', 'kesfet', 'rozet'],
  İletişim: ['iletisim', 'bildirim', 'duyuru', 'acil', 'push', 'ses'],
  Analiz: ['analiz', 'istatistik', 'gelir', 'guvenlik', 'sistem', 'harita'],
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function buildKeywords(
  id: string,
  label: string,
  section: string,
): string[] {
  const parts = new Set<string>([
    ...tokenize(label),
    ...tokenize(section),
    ...tokenize(id.replace(/-/g, ' ')),
    normalizeText(id),
    ...(EXTRA_KEYWORDS[id] ?? []).map(normalizeText),
    ...(SECTION_KEYWORDS[section] ?? []).map(normalizeText),
  ]);
  return [...parts];
}

function matchSectionTitle(query: string): string | null {
  const q = normalizeText(query.trim());
  if (!q) return null;

  for (const section of ADMIN_MENU_SECTIONS) {
    if (normalizeText(section.title) === q) return section.title;
  }

  return null;
}

function getCrossSectionSuggestions(items: AdminMenuSearchItem[]): AdminMenuSearchItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const picked: AdminMenuSearchItem[] = [];
  const seen = new Set<string>();

  for (const section of ADMIN_MENU_SECTIONS) {
    const sectionIds = SECTION_SUGGESTED_IDS[section.title] ?? [];
    let added = 0;

    for (const id of sectionIds) {
      if (seen.has(id)) continue;
      const item = byId.get(id);
      if (!item) continue;
      picked.push(item);
      seen.add(id);
      added += 1;
      if (added >= 3) break;
    }
  }

  return picked;
}

export type AdminMenuSearchGroup = {
  section: string;
  items: AdminMenuSearchItem[];
};

export function groupAdminMenuSearchResults(items: AdminMenuSearchItem[]): AdminMenuSearchGroup[] {
  const grouped = new Map<string, AdminMenuSearchItem[]>();

  for (const item of items) {
    const list = grouped.get(item.section) ?? [];
    list.push(item);
    grouped.set(item.section, list);
  }

  return ADMIN_MENU_SECTIONS.map((section) => ({
    section: section.title,
    items: grouped.get(section.title) ?? [],
  })).filter((group) => group.items.length > 0);
}

export function getAdminMenuSearchItems(): AdminMenuSearchItem[] {
  return ADMIN_MENU_SECTIONS.flatMap((section) =>
    filterSubscriptionAdminItems(section.items).map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon,
      section: section.title,
      adminOnly: item.adminOnly,
      accent: item.accent,
      keywords: buildKeywords(item.id, item.label, section.title),
    })),
  );
}

function scoreItem(item: AdminMenuSearchItem, query: string): number {
  const q = normalizeText(query.trim());
  if (!q) return 0;

  const label = normalizeText(item.label);
  const section = normalizeText(item.section);
  const id = normalizeText(item.id);

  if (label === q) return 120;
  if (label.startsWith(q)) return 100;
  if (id === q) return 95;
  if (section === q) return 92;
  if (label.includes(q)) return 80;
  if (item.keywords.some((keyword) => keyword === q)) return 78;
  if (section.includes(q)) return 55;
  if (id.includes(q)) return 50;
  if (item.keywords.some((keyword) => keyword.includes(q))) return 48;

  const queryTokens = tokenize(q);
  if (queryTokens.length === 0) return 0;

  let tokenScore = 0;
  let matchedTokens = 0;

  for (const token of queryTokens) {
    let tokenMatched = false;

    if (label.includes(token)) {
      tokenScore += 30;
      tokenMatched = true;
    }
    if (item.keywords.some((keyword) => keyword === token)) {
      tokenScore += 35;
      tokenMatched = true;
    } else if (item.keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      tokenScore += 22;
      tokenMatched = true;
    }
    if (section.includes(token)) {
      tokenScore += 12;
      tokenMatched = true;
    }
    if (id.includes(token)) {
      tokenScore += 10;
      tokenMatched = true;
    }
    if (label.split(' ').some((word) => word.startsWith(token))) {
      tokenScore += 18;
      tokenMatched = true;
    }

    if (tokenMatched) matchedTokens += 1;
  }

  if (matchedTokens === queryTokens.length && queryTokens.length > 1) {
    tokenScore += 25;
  }

  return tokenScore;
}

function isSubscriptionAdminMenuHidden(id: string): boolean {
  if (SUBSCRIPTIONS_ENABLED) return false;
  return (SUBSCRIPTION_ADMIN_MENU_IDS as readonly string[]).includes(id);
}

function filterSubscriptionAdminItems<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => !isSubscriptionAdminMenuHidden(item.id));
}

function isMenuItemAllowed(
  item: { id: string; adminOnly: boolean },
  isAdmin: boolean,
  permissions: PermissionMap | null,
  role: UserRole | null | undefined,
): boolean {
  return canAccessAdminMenuItem(item, permissions, role, isAdmin);
}

export function searchAdminMenuItems(
  items: AdminMenuSearchItem[],
  query: string,
  isAdmin: boolean,
  permissions: PermissionMap | null = null,
  role: UserRole | null | undefined = null,
): AdminMenuSearchItem[] {
  const allowed = items.filter((item) => isMenuItemAllowed(item, isAdmin, permissions, role));
  const q = query.trim();

  if (!q) {
    return getCrossSectionSuggestions(allowed);
  }

  const exactSection = matchSectionTitle(q);
  if (exactSection) {
    return allowed
      .filter((item) => item.section === exactSection)
      .sort((a, b) => a.label.localeCompare(b.label, 'tr-TR'));
  }

  return allowed
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.section.localeCompare(b.item.section, 'tr-TR') ||
        a.item.label.localeCompare(b.item.label, 'tr-TR'),
    )
    .map(({ item }) => item);
}

export function filterAdminMenuSections(
  query: string,
  isAdmin: boolean,
  permissions: PermissionMap | null = null,
  role: UserRole | null | undefined = null,
): AdminMenuSection[] {
  const q = query.trim();
  if (!q) {
    return ADMIN_MENU_SECTIONS.map((section) => ({
      title: section.title,
      items: filterSubscriptionAdminItems(section.items).filter((item) =>
        isMenuItemAllowed(item, isAdmin, permissions, role),
      ),
    })).filter((section) => section.items.length > 0);
  }

  const exactSection = matchSectionTitle(q);
  if (exactSection) {
    const section = ADMIN_MENU_SECTIONS.find((entry) => entry.title === exactSection);
    if (!section) return [];

    return [
      {
        title: section.title,
        items: filterSubscriptionAdminItems(section.items).filter((item) =>
          isMenuItemAllowed(item, isAdmin, permissions, role),
        ),
      },
    ].filter((entry) => entry.items.length > 0);
  }

  const matches = new Set(
    searchAdminMenuItems(getAdminMenuSearchItems(), q, isAdmin, permissions, role).map((item) => item.id),
  );

  return ADMIN_MENU_SECTIONS.map((section) => ({
    title: section.title,
    items: filterSubscriptionAdminItems(section.items).filter(
      (item) => matches.has(item.id) && isMenuItemAllowed(item, isAdmin, permissions, role),
    ),
  })).filter((section) => section.items.length > 0);
}
