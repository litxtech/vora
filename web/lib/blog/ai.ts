import { CITIES } from '@/lib/cities';
import { FEATURES } from '@/lib/features';
import type { AiPatch } from '@/lib/blog/studio';
import { keepRealLinks, knownInternalPaths, slugifyTr } from '@/lib/blog/studio';

export type AiAction =
  | 'create_article'
  | 'titles'
  | 'meta_description'
  | 'slug'
  | 'content'
  | 'expand'
  | 'shorten'
  | 'rewrite'
  | 'intro'
  | 'conclusion'
  | 'headings'
  | 'faq'
  | 'excerpt'
  | 'alt_text'
  | 'og'
  | 'seo_fields'
  | 'improve_selection'
  | 'proofread'
  | 'readability'
  | 'natural_turkish'
  | 'translate'
  | 'regenerate_all';

const ACTIONS = new Set<string>([
  'create_article', 'titles', 'meta_description', 'slug', 'content', 'expand', 'shorten', 'rewrite',
  'intro', 'conclusion', 'headings', 'faq', 'excerpt', 'alt_text', 'og', 'seo_fields',
  'improve_selection', 'proofread', 'readability', 'natural_turkish', 'translate', 'regenerate_all',
]);

export function isAiAction(value: string): value is AiAction {
  return ACTIONS.has(value);
}

function providerConfig(): { apiKey: string; baseUrl: string; model: string; provider: string } | null {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || '';
  if (!apiKey) return null;
  const deepseek = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  return {
    apiKey,
    baseUrl: (deepseek ? process.env.DEEPSEEK_BASE_URL : process.env.OPENAI_BASE_URL) || (deepseek ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'),
    model: (deepseek ? process.env.DEEPSEEK_MODEL : process.env.OPENAI_MODEL) || (deepseek ? 'deepseek-v4-flash' : 'gpt-4o-mini'),
    provider: deepseek ? 'deepseek' : 'openai',
  };
}

function voraContext(categories: string[], blogSlugs: string[]): string {
  const cities = CITIES.map((city) => `${city.name} (${city.id})`).join(', ');
  const features = FEATURES.map((item) => `${item.title}: ${item.description}`).join('\n');
  return [
    'Vora, Karadeniz şehirleri için bir sosyal uygulamadır. Web sitesi yalnızca herkese açık içeriği gösterir.',
    `Şehirler: ${cities}.`,
    `Mevcut blog kategorileri (listede yoksa kategori uydurma): ${categories.join(', ') || 'yok'}.`,
    `Gerçek özellikler:\n${features}`,
    'Olmayan özelliği, kullanıcı sayısını, fiyatı, yorumu, etkinliği veya istatistiği yazma.',
    'Emin değilsen factualNotes içine “Bu bilgi doğrulanmalıdır.” ekle.',
    `İç bağlantı href değerleri yalnızca şunlar olabilir: ${[...knownInternalPaths(CITIES.map((city) => city.id), blogSlugs)].slice(0, 80).join(' ')}`,
  ].join('\n');
}

function systemPrompt(brandVoice: string, seoRules: string, categories: string[], blogSlugs: string[]): string {
  return [
    'Sen Vora Blog Studio asistanısın. Yönetici değilsin. Yayınlama. Yalnızca istenen alanları doldur.',
    'Doğal, insan yazmış gibi, faydalı ve abartısız yaz. Anahtar kelime yığma. Google’ı manipüle etmeye çalışma.',
    'Sahte kaynak, sahte şehir bilgisi ve sahte Vora özelliği üretme.',
    brandVoice,
    seoRules,
    voraContext(categories, blogSlugs),
    'Yanıt yalnızca JSON olsun. İstenmeyen alanları boş bırak.',
    'Şema: {"title":"","slug":"","excerpt":"","content":"","seoTitle":"","seoDescription":"","ogTitle":"","ogDescription":"","tags":[],"citySlug":null,"categorySlug":null,"faqs":[{"question":"","answer":""}],"links":[{"href":"","label":""}],"altText":"","searchIntent":"","factualNotes":[],"quality":{"originality":"good","readability":"good","seo":"good","structure":"good","intent":"good","factual":"good"},"selection":""}',
    'content markdown olsun. H1 (# ) kullanma. H2 ve H3 kullan. SSS’yi hem faqs alanına hem içeriğin sonuna yazma; yalnızca faqs alanına yaz.',
    'quality değerleri yalnızca good, warning veya needs_review olsun.',
  ].join('\n');
}

export async function runBlogAi(input: {
  action: AiAction;
  topic?: string;
  language?: string;
  tone?: string;
  audience?: string;
  length?: string;
  city?: string;
  selection?: string;
  article?: Record<string, unknown>;
  categories: { slug: string; name: string }[];
  blogSlugs: string[];
  brandVoice: string;
  seoRules: string;
  signal?: AbortSignal;
}): Promise<{ patch: AiPatch; provider: string; model: string; inputTokens: number; outputTokens: number; estimatedCost: number }> {
  const config = providerConfig();
  if (!config) throw new Error('AI şu anda kullanılamıyor.');
  const user = [
    `İşlem: ${input.action}`,
    `Dil: ${input.language || 'tr'}`,
    input.topic ? `Konu: ${input.topic}` : '',
    input.tone ? `Ton: ${input.tone}` : '',
    input.audience ? `Hedef kitle: ${input.audience}` : '',
    input.length ? `Uzunluk: ${input.length}` : '',
    input.city ? `Şehir: ${input.city}` : '',
    input.selection ? `Seçili metin:\n${input.selection}` : '',
    input.article ? `Mevcut yazı JSON:\n${JSON.stringify(input.article).slice(0, 12000)}` : '',
    'Yalnızca bu işlemin alanlarını doldur. Manuel bırakılması gereken diğer alanlara dokunma.',
  ].filter(Boolean).join('\n\n');
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal: input.signal,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt(input.brandVoice, input.seoRules, input.categories.map((item) => `${item.name} (${item.slug})`), input.blogSlugs) },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error('AI şu anda kullanılamıyor.');
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = body.choices?.[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI şu anda kullanılamıyor.');
  const parsed = JSON.parse(match[0]) as AiPatch;
  const allowed = knownInternalPaths(CITIES.map((city) => city.id), input.blogSlugs);
  if (parsed.links) parsed.links = keepRealLinks(parsed.links, allowed);
  if (parsed.slug) parsed.slug = slugifyTr(parsed.slug);
  const cityIds = new Set(CITIES.map((city) => city.id));
  if (parsed.citySlug && !cityIds.has(parsed.citySlug)) parsed.citySlug = null;
  const categorySlugs = new Set(input.categories.map((item) => item.slug));
  if (parsed.categorySlug && !categorySlugs.has(parsed.categorySlug)) parsed.categorySlug = null;
  if (parsed.tags) parsed.tags = parsed.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 1 && tag.length < 32).slice(0, 8);
  const inputTokens = body.usage?.prompt_tokens ?? 0;
  const outputTokens = body.usage?.completion_tokens ?? 0;
  const estimatedCost = Number(((inputTokens / 1_000_000) * 0.14 + (outputTokens / 1_000_000) * 0.28).toFixed(6));
  return { patch: parsed, provider: config.provider, model: config.model, inputTokens, outputTokens, estimatedCost };
}
