export type FieldMode = 'auto' | 'manual';

export type FaqItem = { question: string; answer: string };
export type LinkItem = { href: string; label: string };

export type ArticleDraft = {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  language: string;
  categoryId: string;
  citySlug: string;
  tags: string;
  status: string;
  coverImageUrl: string;
  coverImageAlt: string;
  videoUrl: string;
  authorName: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  canonical: string;
  indexable: boolean;
  faqs: FaqItem[];
  links: LinkItem[];
  scheduledAt: string;
  fieldModes: Record<string, FieldMode>;
  factualNotes: string[];
  quality: Record<string, string>;
  updatedAt: string | null;
};

export type AiPatch = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  tags?: string[];
  citySlug?: string | null;
  categorySlug?: string | null;
  faqs?: FaqItem[];
  links?: LinkItem[];
  altText?: string;
  searchIntent?: string;
  factualNotes?: string[];
  quality?: Record<string, string>;
  selection?: string;
};

const TR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

const STOP = new Set(['ve', 'ile', 'bir', 'icin', 'için', 'the', 'and', 'of', 'en', 'iyi', 'da', 'de']);

export function slugifyTr(input: string): string {
  const folded = input
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/['’ʼ]/g, '')
    .replace(/[çğıöşüâîû]/g, (char) => TR_MAP[char] ?? char)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const parts = folded
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((part) => part && !STOP.has(part))
    .map((part) => (part.length > 6 ? part.replace(/nin$/, '') : part));
  return parts.join('-').replace(/-+/g, '-').slice(0, 80);
}

export function countH1(markdown: string): number {
  return markdown.split('\n').filter((line) => /^#\s+\S/.test(line.trim())).length;
}

export function scoreArticle(draft: Pick<
  ArticleDraft,
  'title' | 'slug' | 'excerpt' | 'content' | 'seoTitle' | 'seoDescription' | 'coverImageUrl' | 'coverImageAlt' | 'faqs' | 'links' | 'canonical'
>): { score: number; checks: { id: string; ok: boolean; label: string }[] } {
  const words = draft.content.trim().split(/\s+/).filter(Boolean).length;
  const checks = [
    { id: 'seoTitle', ok: (draft.seoTitle || draft.title).trim().length >= 20, label: 'SEO başlığı' },
    { id: 'description', ok: (draft.seoDescription || draft.excerpt).trim().length >= 80, label: 'Meta açıklama' },
    { id: 'slug', ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug), label: 'Slug' },
    { id: 'h1', ok: Boolean(draft.title.trim()) && countH1(draft.content) === 0, label: 'Tek H1 (başlık)' },
    { id: 'depth', ok: words >= 300, label: 'İçerik derinliği' },
    { id: 'links', ok: draft.links.length > 0 || /\[[^\]]+\]\(\//.test(draft.content), label: 'İç bağlantı' },
    { id: 'image', ok: Boolean(draft.coverImageUrl.trim()), label: 'Kapak görseli' },
    { id: 'alt', ok: !draft.coverImageUrl.trim() || Boolean(draft.coverImageAlt.trim()), label: 'Alt metin' },
    { id: 'faq', ok: draft.faqs.some((item) => item.question.trim() && item.answer.trim()), label: 'SSS' },
    { id: 'canonical', ok: Boolean(draft.canonical.trim() || draft.slug.trim()), label: 'Canonical' },
  ];
  const score = Math.round((checks.filter((item) => item.ok).length / checks.length) * 100);
  return { score, checks };
}

export function readabilityNotes(content: string): string[] {
  const notes: string[] = [];
  const paragraphs = content.split(/\n{2,}/).filter((part) => part.trim() && !part.trim().startsWith('#'));
  if (paragraphs.some((part) => part.split(/\s+/).length > 120)) notes.push('Bazı paragraflar çok uzun.');
  const sentences = content.split(/[.!?]/).map((part) => part.trim()).filter(Boolean);
  if (sentences.some((part) => part.split(/\s+/).length > 35)) notes.push('Bazı cümleler 35 kelimeyi aşıyor.');
  if (!/^##\s/m.test(content)) notes.push('H2 başlık yok.');
  return notes;
}

const CONTENT_ACTIONS = new Set(['content', 'expand', 'shorten', 'rewrite', 'intro', 'conclusion', 'headings', 'proofread', 'readability', 'natural_turkish', 'improve_selection']);
const SEO_FIELDS = ['seoTitle', 'seoDescription', 'slug', 'ogTitle', 'ogDescription'] as const;

export function applyAiPatch(
  draft: ArticleDraft,
  patch: AiPatch,
  action: string,
  confirm: boolean,
): ArticleDraft {
  const next: ArticleDraft = {
    ...draft,
    faqs: draft.faqs.map((item) => ({ ...item })),
    links: draft.links.map((item) => ({ ...item })),
    fieldModes: { ...draft.fieldModes },
    factualNotes: patch.factualNotes ?? draft.factualNotes,
    quality: patch.quality ?? draft.quality,
  };
  const allow = (field: string): boolean => {
    if (action === 'regenerate_all') return confirm;
    if (action === 'seo_fields' && (SEO_FIELDS as readonly string[]).includes(field)) return confirm || next.fieldModes[field] !== 'manual';
    if (next.fieldModes[field] === 'manual') return false;
    return true;
  };
  const take = (field: keyof ArticleDraft, value: string | undefined) => {
    if (value == null || !allow(String(field))) return;
    (next as Record<string, unknown>)[field] = value;
    if (next.fieldModes[String(field)] !== 'manual') next.fieldModes[String(field)] = 'auto';
  };
  if (action === 'improve_selection' && patch.selection && draft.content.includes('{{selection}}')) {
    next.content = draft.content.replace('{{selection}}', patch.selection);
    return next;
  }
  if (CONTENT_ACTIONS.has(action)) {
    take('content', patch.content);
    return next;
  }
  if (action === 'faq') {
    if (allow('faqs') && patch.faqs) next.faqs = patch.faqs;
    return next;
  }
  if (action === 'excerpt') {
    take('excerpt', patch.excerpt);
    return next;
  }
  if (action === 'titles') {
    take('title', patch.title);
    take('seoTitle', patch.seoTitle);
    return next;
  }
  if (action === 'slug') {
    take('slug', patch.slug ? slugifyTr(patch.slug) : undefined);
    return next;
  }
  if (action === 'meta_description') {
    take('seoDescription', patch.seoDescription);
    return next;
  }
  if (action === 'og') {
    take('ogTitle', patch.ogTitle);
    take('ogDescription', patch.ogDescription);
    return next;
  }
  if (action === 'alt_text') {
    take('coverImageAlt', patch.altText);
    return next;
  }
  if (action === 'seo_fields') {
    take('seoTitle', patch.seoTitle);
    take('seoDescription', patch.seoDescription);
    take('slug', patch.slug ? slugifyTr(patch.slug) : undefined);
    take('ogTitle', patch.ogTitle);
    take('ogDescription', patch.ogDescription);
    return next;
  }
  if (action === 'create_article' || action === 'regenerate_all' || action === 'translate') {
    take('title', patch.title);
    take('slug', patch.slug ? slugifyTr(patch.slug) : undefined);
    take('excerpt', patch.excerpt);
    take('content', patch.content);
    take('seoTitle', patch.seoTitle);
    take('seoDescription', patch.seoDescription);
    take('ogTitle', patch.ogTitle);
    take('ogDescription', patch.ogDescription);
    take('coverImageAlt', patch.altText);
    if (allow('tags') && patch.tags) next.tags = patch.tags.slice(0, 8).join(', ');
    if (allow('citySlug') && patch.citySlug) next.citySlug = patch.citySlug;
    if (allow('faqs') && patch.faqs) next.faqs = patch.faqs.slice(0, 6);
    if (allow('links') && patch.links) next.links = patch.links.slice(0, 6);
    return next;
  }
  return next;
}

export function tokenOverlap(left: string, right: string): number {
  const a = new Set(slugifyTr(left).split('-').filter((part) => part.length > 2));
  const b = new Set(slugifyTr(right).split('-').filter((part) => part.length > 2));
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

export function knownInternalPaths(cities: string[], blogSlugs: string[]): Set<string> {
  const paths = new Set<string>(['/', '/blog', '/cities', '/events', '/download', '/about', '/features']);
  for (const city of cities) paths.add(`/city/${city}`);
  for (const slug of blogSlugs) paths.add(`/blog/${slug}`);
  return paths;
}

export function keepRealLinks(links: LinkItem[], allowed: Set<string>): LinkItem[] {
  return links.filter((link) => allowed.has(link.href) && link.label.trim().length > 1).slice(0, 6);
}

export function emptyDraft(authorName = 'Vora'): ArticleDraft {
  return {
    id: null,
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    language: 'tr',
    categoryId: '',
    citySlug: '',
    tags: '',
    status: 'draft',
    coverImageUrl: '',
    coverImageAlt: '',
    videoUrl: '',
    authorName,
    seoTitle: '',
    seoDescription: '',
    ogTitle: '',
    ogDescription: '',
    canonical: '',
    indexable: true,
    faqs: [],
    links: [],
    scheduledAt: '',
    fieldModes: {},
    factualNotes: [],
    quality: {},
    updatedAt: null,
  };
}
