export type SeoCheck = { id: string; label: string; ok: boolean };

export type PostSeoInput = {
  content: string;
  title: string | null;
  mediaCount: number;
  regionId: string | null;
  category: string | null;
  authorSearchVisible: boolean;
};

const MIN_INDEX_LENGTH = 80;

export function postIndexable(input: PostSeoInput): { index: boolean; score: number; checks: SeoCheck[] } {
  const text = input.content.trim();
  const checks: SeoCheck[] = [
    { id: 'public', label: 'Herkese açık ve yazar profili açık', ok: true },
    { id: 'moderated', label: 'Yayında, hassas değil, moderasyon beklemıyor', ok: true },
    { id: 'length', label: 'Anlamlı metin uzunluğu', ok: text.length >= MIN_INDEX_LENGTH },
    { id: 'unique', label: 'Tekrarlı karakter dizisi değil', ok: !isLowEntropy(text) },
    { id: 'city', label: 'Şehir atanmış', ok: Boolean(input.regionId) },
    { id: 'topic', label: 'Konu atanmış', ok: Boolean(input.category && input.category !== 'general') },
    { id: 'image', label: 'Görsel var', ok: input.mediaCount > 0 },
    { id: 'title', label: 'Başlık veya ilk cümle var', ok: Boolean(input.title?.trim() || firstSentence(text)) },
  ];
  const required = checks.filter((c) => ['length', 'unique', 'city', 'title'].includes(c.id));
  const index = required.every((c) => c.ok);
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { index, score, checks };
}

export function profileIndexable(input: { bio: string | null; searchVisible: boolean; postCount: number }): {
  index: boolean;
  score: number;
  checks: SeoCheck[];
} {
  const checks: SeoCheck[] = [
    { id: 'public', label: 'Herkese açık profil', ok: true },
    { id: 'optin', label: 'Arama motorlarında göster ayarı açık', ok: input.searchVisible },
    { id: 'bio', label: 'Biyografi veya herkese açık paylaşım var', ok: Boolean(input.bio?.trim()) || input.postCount > 0 },
  ];
  const index = checks.every((c) => c.ok);
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { index, score, checks };
}

/** Anlamsız etiket sayfası açılmaz: en az 8 public gönderi ve çağıran taraf yazar çeşitliliğini de doğrular. */
export function hashtagIndexable(count: number, authorCount = 3): boolean {
  return count >= 8 && authorCount >= 3;
}

function firstSentence(text: string): string {
  return text.split(/[.!?\n]/)[0]?.trim() ?? '';
}

function isLowEntropy(text: string): boolean {
  const compact = text.replace(/\s+/g, '');
  if (compact.length < 40) return true;
  const unique = new Set(compact.toLowerCase()).size;
  return unique < 8;
}
