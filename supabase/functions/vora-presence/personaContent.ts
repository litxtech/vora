/** Persona arketipi, kategori seçimi ve halk dilinde içerik havuzu. */

export type PersonaArchetype = {
  id: string;
  label: string;
  tone: string;
  bioExtra: string;
  categories: string[];
  photoBias: number;
};

export const PERSONA_ARCHETYPES: PersonaArchetype[] = [
  {
    id: 'mahalle',
    label: 'mahalle insanı',
    tone: 'samimi',
    bioExtra: 'Mahalle muhabbeti ve çay vakti olmazsa olmaz.',
    categories: ['daily', 'general', 'entertainment'],
    photoBias: 0.55,
  },
  {
    id: 'motorcu',
    label: 'motor/gezgin',
    tone: 'enerjik',
    bioExtra: 'Boş zamanında sahil yolu ve manzara turu yaparım.',
    categories: ['traffic', 'daily', 'entertainment', 'general'],
    photoBias: 0.75,
  },
  {
    id: 'esnaf',
    label: 'esnaf',
    tone: 'düzgün',
    bioExtra: 'Kendi işimin başındayım, müşteri memnuniyeti önemli.',
    categories: ['business', 'daily', 'job', 'general'],
    photoBias: 0.6,
  },
  {
    id: 'haber',
    label: 'haber takipçisi',
    tone: 'meraklı',
    bioExtra: 'Bölgedeki gelişmeleri takip eder, paylaşırım.',
    categories: ['news', 'traffic', 'daily', 'general'],
    photoBias: 0.45,
  },
  {
    id: 'spor',
    label: 'spor fan',
    tone: 'coşkulu',
    bioExtra: 'Maç günü evde oturmam, tribün/seyir keyfi severim.',
    categories: ['entertainment', 'event', 'daily', 'general'],
    photoBias: 0.7,
  },
  {
    id: 'aile',
    label: 'aile babası/annesi',
    tone: 'sıcak',
    bioExtra: 'Aile ziyaretleri ve pazar alışverişi benim rutinim.',
    categories: ['daily', 'general', 'event', 'lost_found'],
    photoBias: 0.65,
  },
  {
    id: 'genclik',
    label: 'genç',
    tone: 'rahat',
    bioExtra: 'Arkadaşlarla takılır, akşam sahil yürüyüşü yaparım.',
    categories: ['entertainment', 'daily', 'job', 'general'],
    photoBias: 0.8,
  },
  {
    id: 'emekli',
    label: 'emekli',
    tone: 'sakin',
    bioExtra: 'Sabah erken kalkar, çayımı alır manzaraya bakarım.',
    categories: ['daily', 'news', 'general', 'traffic'],
    photoBias: 0.4,
  },
  {
    id: 'dogasever',
    label: 'doğasever',
    tone: 'huzurlu',
    bioExtra: 'Yeşil ve deniz havası benim için şifa gibi.',
    categories: ['daily', 'entertainment', 'event', 'general'],
    photoBias: 0.85,
  },
  {
    id: 'calisan',
    label: 'çalışan',
    tone: 'pratik',
    bioExtra: 'İş çıkışı yorgun ama memleket havası toparlıyor.',
    categories: ['job', 'traffic', 'daily', 'business'],
    photoBias: 0.35,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  general: 'genel sohbet',
  daily: 'günlük yaşam',
  entertainment: 'eğlence',
  event: 'etkinlik',
  business: 'işletme / yerel esnaf',
  news: 'haber',
  traffic: 'trafik',
  job: 'iş ilanı',
  lost_found: 'kayıp eşya',
  emergency: 'acil durum',
};

const CATEGORY_AI_BRIEFS: Record<string, string> = {
  general: 'Gün içinde aklına gelen kısa bir şey. Hava, mod, selam, minik bir gözlem.',
  daily: 'Kahvaltı, yorgunluk, iş, ev, çay molası, trafik, alışveriş. Sıradan gün anı.',
  entertainment: 'Arkadaş, maç, dizi, müzik, akşam planı, can sıkıntısı, keyif.',
  event: 'Yakında bir şey var mı, davet, düğün, konser — merak veya plan.',
  business: 'Dükkan, müşteri, stok, teşekkür. Reklam cümlesi kurma.',
  news: 'Duydum/gördüm tonu. Kesin haber iddia etme.',
  traffic: 'Yolda bekleme, sis, yoğunluk. Yer adı en fazla bir kez.',
  job: 'Eleman arıyorum veya iş arıyorum. Kısa ilan dili.',
  lost_found: 'Kayıp/bulunan eşya veya hayvan. Yardım iste.',
  emergency: 'Yağmur, rüzgar, elektrik. Sakin uyarı, panik yok.',
};

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(arr: T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

export function resolveArchetype(personaKey: string): PersonaArchetype {
  return pick(PERSONA_ARCHETYPES, personaKey);
}

export function buildPersonaInterests(personaKey: string): string[] {
  const archetype = resolveArchetype(personaKey);
  return [...new Set(archetype.categories)];
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function categoryAiBrief(category: string): string {
  return CATEGORY_AI_BRIEFS[category] ?? CATEGORY_AI_BRIEFS.general;
}

export function pickCategoryForPersona(
  personaKey: string,
  enabledCategories: string[],
  postCount: number,
  recentCategories: string[] = [],
): string {
  if (!enabledCategories.length) return 'general';

  const archetype = resolveArchetype(personaKey);
  const preferred = archetype.categories.filter((c) => enabledCategories.includes(c));
  const pool = preferred.length ? preferred : enabledCategories;

  const avoid = new Set(recentCategories.slice(0, 2));
  const fresh = pool.filter((c) => !avoid.has(c));
  const candidates = fresh.length ? fresh : pool;

  const idx = (hash(`${personaKey}:${postCount}:${Date.now() % 997}`) + postCount) % candidates.length;
  return candidates[idx];
}

export function photoChanceForPersona(
  baseChance: number,
  category: string,
  personaKey: string,
  withPhotoCategories: string[],
): boolean {
  const archetype = resolveArchetype(personaKey);
  let chance = baseChance * (0.85 + archetype.photoBias * 0.3);

  if (['daily', 'entertainment', 'event', 'business', 'traffic'].includes(category)) {
    chance += 0.08;
  }
  if (['job', 'news', 'emergency'].includes(category) && Math.random() < 0.4) {
    chance -= 0.15;
  }

  chance = Math.min(Math.max(chance, 0.1), 0.95);
  return Math.random() < chance;
}

type FallbackCtx = {
  regionName: string;
  district: string;
  personaKey: string;
  postCount: number;
  withPhoto: boolean;
};

function fb(ctx: FallbackCtx, lines: string[]): string {
  const idx = (hash(`${ctx.personaKey}:${ctx.postCount}`) + ctx.postCount) % lines.length;
  return lines[idx];
}

export function fallbackPostContent(category: string, ctx: FallbackCtx): string {
  const { regionName, district } = ctx;
  const place = district ? `${district}` : regionName;
  const maybePlace = hash(`${ctx.personaKey}:${ctx.postCount}:place`) % 4 === 0 ? place : '';

  const pools: Record<string, string[]> = {
    traffic: [
      'sabah trafik yine aynı ya',
      'köprü tarafı kalabalık bugün',
      '10 dk geciktim işe valla',
      'alternatif yoldan gittim daha iyi',
      maybePlace ? `${maybePlace} çıkışı biraz sıkışık` : 'yol biraz zor geçti',
      'sis vardı dikkatli gidin',
    ],
    news: [
      'duydum ki yarın yol çalışması varmış',
      'hava kararsız bugün şemsiye alsam mı',
      'mahallede bir hareketlilik var',
      'okul çıkışı trafik artıyor yine',
      maybePlace ? `${maybePlace} tarafında bir şeyler oluyor galiba` : 'haberleri takip ediyorum',
    ],
    business: [
      'bugün yoğun geçti teşekkürler herkese',
      'stok bitmiş tekrar gelecek',
      'erken kapanıyoruz haberiniz olsun',
      'müşteri memnun kaldı güzel gün',
      ctx.withPhoto ? 'vitrin düzgün oldu bugün' : 'kısa mola verdim',
      maybePlace ? `${maybePlace} tarafındayız açığız` : 'iş yerindeyim',
    ],
    job: [
      'eleman arıyoruz yazın dm',
      'iş arıyorum uygun yer varsa haber verin',
      'part time lazım deneyim şart değil',
      'yaz sezonu için birini arıyoruz',
      'deneyimli şoför aranıyor',
    ],
    entertainment: [
      'akşam planı netleşti gibi',
      'maç stresi bitti rahatladık',
      'çay başı uzadı gece oldu',
      'müzik açık mod iyi',
      ctx.withPhoto ? 'akşam ışığı güzel' : 'hafta sonu dinlenme modu',
      'arkadaşlarla takıldık iyi geldi',
    ],
    event: [
      'hafta sonu bir şey var mı bakan?',
      'düğün daveti aldım heyecanlıyım',
      'konser duyurusunu gördünüz mü',
      'piknik planı yapıyoruz hava uygun olursa',
      ctx.withPhoto ? 'organizasyon hazırlanıyor gibi' : 'etkinlik takvimine baktım',
    ],
    daily: [
      'sabah kahvesi yetmedi bugün',
      'pazar alışverişi bitti neyse',
      'ev işleri bitmiyor',
      'aile ziyareti uzun sürdü',
      ctx.withPhoto ? 'güzel bir an yakaladım' : 'kısa mola',
      'akşam yemeği güzel oldu',
      'çocuklar okuldan gelince ev karıştı',
      maybePlace ? `${maybePlace} havası ferah bugün` : 'yürüyüş iyi geldi',
    ],
    lost_found: [
      'kaybolan kediyi gören yazsın lütfen',
      'cüzdan buldum sahibi arıyorum',
      'anahtarlık düşmüş olabilir',
      'telefonumu kaybettim bulan olursa ulaşsın',
    ],
    emergency: [
      'yağmur sert geldi dikkat',
      'rüzgar çok esiyor dışarıda',
      'elektrik gitti geldi az önce',
      'fırtına uyarısı vardı',
    ],
    general: [
      'modum yerinde bugün',
      'kısa bir not hayırlı günler',
      ctx.withPhoto ? 'gün batımı iyi oturmuş' : 'sessiz bir gün',
      'tanıdık yüz görmek iyi hissettiriyor',
      maybePlace ? `${maybePlace} sakin bugün` : 'bugün fena değil',
    ],
  };

  return fb(ctx, pools[category] ?? pools.general);
}

export function buildPostPrompt(
  persona: {
    display_name: string;
    gender: string;
    region_id: string;
    district: string | null;
    bio: string;
    tone: string;
    persona_key: string;
  },
  regionName: string,
  category: string,
  withPhoto: boolean,
  recentPosts: Array<{ content: string; category: string }>,
): { system: string; user: string } {
  const archetype = resolveArchetype(persona.persona_key);
  const district = persona.district ? `, ${persona.district}` : '';
  const genderLabel = persona.gender === 'female' ? 'kadın' : 'erkek';
  const recentBlock = recentPosts.length
    ? recentPosts.map((p) => `- (${p.category}) ${p.content.slice(0, 120)}`).join('\n')
    : '- (henüz yok)';

  const system =
    'Sen Türkiye\'de yaşayan sıradan bir sosyal medya kullanıcısısın. WhatsApp durumu veya X/Twitter gönderisi gibi yaz: ' +
    'kısa, doğal, günlük konuşma dili. Büyük harfle başlamak zorunda değilsin. ' +
    'Reklam, link, hashtag, "paylaşıyorum", "fotoğraf ekledim" gibi meta cümleler kullanma. ' +
    'Bölge/şehir adını her metinde kullanma — çoğu paylaşımda hiç geçmesin. Emoji en fazla 1. Abartılı Karadeniz şivesi yapma.';

  const user =
    `Profil: ${persona.display_name}, ${genderLabel}, ${regionName}${district}.\n` +
    `Hakkında: ${persona.bio}\n` +
    `Konuşma tarzı: ${persona.tone} (${archetype.label})\n` +
    `Kategori: ${categoryLabel(category)}\n` +
    `Konu rehberi: ${categoryAiBrief(category)}\n` +
    `${withPhoto ? 'Gönderiye fotoğraf da var; metin fotoğrafla uyumlu olsun.\n' : ''}` +
    `\nSon paylaşımların (bunları TEKRAR ETME, aynı kalıbı kullanma):\n${recentBlock}\n\n` +
    'Örnek ton: "bugün işten erken çıktım iyi oldu" / "çay içmeden olmuyor" / "maç berabere bitti sinir"\n' +
    'Tek paragraflık 1-2 cümle yaz. En fazla 180 karakter. Sadece gönderi metnini döndür.';

  return { system, user };
}
