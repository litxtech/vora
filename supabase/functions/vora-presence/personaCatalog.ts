/** Karadeniz persona havuzu: Türk isimleri, kullanıcı adları, doğal portreler. */

import { buildPersonaInterests, resolveArchetype } from './personaContent.ts';

export type PersonaGender = 'female' | 'male';
export type UsernameStyle = 'underscore' | 'dot' | 'compact' | 'plain';
export type AvatarMode = 'always' | 'never' | 'random';

export const AVATAR_NONE_SENTINEL = '__none__';

export type PersonaGenerateOptions = {
  usernameStyle?: UsernameStyle;
  avatarMode?: AvatarMode;
  regionId?: string;
};

export type GeneratedPersona = {
  username: string;
  fullName: string;
  gender: PersonaGender;
  regionId: string;
  district: string;
  bio: string;
  avatarUrl: string;
  personaKey: string;
  tone: string;
  interests: string[];
};

const REGIONS = ['trabzon', 'rize', 'ordu', 'samsun', 'giresun', 'artvin'] as const;

const DISTRICTS: Record<string, string[]> = {
  trabzon: ['Ortahisar', 'Akçaabat', 'Yomra', 'Araklı', 'Of'],
  rize: ['Merkez', 'Çayeli', 'Ardeşen', 'Pazar', 'Fındıklı'],
  ordu: ['Altınordu', 'Ünye', 'Fatsa', 'Perşembe', 'Kumru'],
  samsun: ['Atakum', 'İlkadım', 'Bafra', 'Çarşamba', 'Terme'],
  giresun: ['Merkez', 'Bulancak', 'Espiye', 'Tirebolu', 'Görele'],
  artvin: ['Merkez', 'Hopa', 'Arhavi', 'Borçka', 'Yusufeli'],
};

const FEMALE_NAMES = [
  'Elif', 'Zeynep', 'Ayşe', 'Fatma', 'Merve', 'Esra', 'Sude', 'Defne', 'Ece', 'Aylin',
  'Melis', 'Naz', 'Büşra', 'Ceren', 'Dilara', 'Gamze', 'Hazal', 'İrem', 'Kübra', 'Lale',
  'Selin', 'Tuğba', 'Yasemin', 'Aslı', 'Burcu', 'Cansu', 'Damla', 'Eda', 'Fulya', 'Gizem',
];

const MALE_NAMES = [
  'Emre', 'Burak', 'Can', 'Kerem', 'Mert', 'Onur', 'Barış', 'Deniz', 'Ahmet', 'Mehmet',
  'Mustafa', 'Ali', 'Hakan', 'Serkan', 'Oğuz', 'Tolga', 'Umut', 'Yusuf', 'Enes', 'Furkan',
  'Gökhan', 'Halil', 'İbrahim', 'Kaan', 'Levent', 'Murat', 'Nihat', 'Orhan', 'Polat', 'Rıza',
];

const SURNAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Aktaş', 'Öztürk', 'Arslan', 'Koç', 'Polat',
  'Korkmaz', 'Güneş', 'Yıldız', 'Özkan', 'Erdem', 'Aksoy', 'Doğan', 'Kılıç', 'Aslan', 'Taş',
  'Aydın', 'Karaca', 'Bulut', 'Tekin', 'Uçar', 'Sarı', 'Balcı', 'Toprak', 'Gencer', 'Pehlivan',
];

/** Doğal portreler — stok foto, yapay yüz değil. */
const FEMALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=480&h=480&fit=crop&crop=faces',
];

const MALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1557862921-37829c790f19?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1545167622-874a2c4a358f?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1527982316319-1d99a5d97ad1?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1504257438649-4148af4fe0e8?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=480&h=480&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=480&h=480&fit=crop&crop=faces',
];

const BIO_TEMPLATES: Record<PersonaGender, string[]> = {
  female: [
    '{region}\'da yaşıyorum. Sakin tempoda, günlük hayatı paylaşmayı seviyorum.',
    '{district} tarafında yaşıyorum. Çay, sahil yürüyüşü ve sohbet benim için.',
    '{region}lıyım. Aile ziyaretleri ve mahalle muhabbeti vazgeçilmez.',
    '{region}\'da çalışıyorum. İş çıkışı sahil havası iyi geliyor.',
    '{district}\'de yaşıyorum. Yerel lezzetleri keşfetmeyi severim.',
  ],
  male: [
    '{region}\'da yaşıyorum. Sabah erken sahil turu yaparım.',
    '{district} tarafındayım. Maç muhabbeti ve çay olmazsa olmaz.',
    '{region}\'da iş güç koşturmacası var ama manzara her şeye değer.',
    '{district}\'de yaşıyorum. Motor gezintisi ve doğa benim hobim.',
    '{region}lıyım. Yerel esnafı desteklemeye çalışırım.',
  ],
};

const REGION_LABELS: Record<string, string> = {
  trabzon: 'Trabzon',
  rize: 'Rize',
  ordu: 'Ordu',
  samsun: 'Samsun',
  giresun: 'Giresun',
  artvin: 'Artvin',
};

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(arr: T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function randomSuffix(): string {
  return String(Math.floor(Math.random() * 90) + 10);
}

function resolveUsernameStyle(style?: string): UsernameStyle {
  if (style === 'dot' || style === 'compact' || style === 'plain' || style === 'underscore') {
    return style;
  }
  return 'underscore';
}

function resolveAvatarMode(mode?: string): AvatarMode {
  if (mode === 'never' || mode === 'random' || mode === 'always') return mode;
  return 'always';
}

export function buildUsername(
  firstName: string,
  surname: string,
  style: UsernameStyle,
  seed: string,
): string {
  const first = slugify(firstName);
  const last = slugify(surname);
  if (!first) return `user${randomSuffix()}`;

  switch (style) {
    case 'dot':
      return last ? `${first}.${last}` : `${first}${randomSuffix()}`;
    case 'compact':
      return last ? `${first}${last}` : `${first}${randomSuffix()}`;
    case 'plain':
      return hash(`${seed}:plain`) % 3 === 0 && last
        ? `${first}${randomSuffix()}`
        : first;
    case 'underscore':
    default:
      return last ? `${first}_${last}` : `${first}${randomSuffix()}`;
  }
}

export function resolvePersonaAvatarUrl(
  gender: PersonaGender,
  personaKey: string,
  mode?: AvatarMode | string,
): string {
  const resolved = resolveAvatarMode(mode);
  if (resolved === 'never') return AVATAR_NONE_SENTINEL;
  if (resolved === 'random' && hash(`${personaKey}:avatar`) % 2 === 0) {
    return AVATAR_NONE_SENTINEL;
  }
  return pickPortrait(gender, personaKey);
}

export function pickPortrait(gender: PersonaGender, seed: string): string {
  const pool = gender === 'female' ? FEMALE_PORTRAITS : MALE_PORTRAITS;
  return pool[hash(seed) % pool.length];
}

export function generatePersonaProfile(
  gender: PersonaGender,
  regionId?: string,
  existingKeys?: Set<string>,
  options?: PersonaGenerateOptions,
): GeneratedPersona {
  const usernameStyle = resolveUsernameStyle(options?.usernameStyle);
  const avatarMode = resolveAvatarMode(options?.avatarMode);
  const region = regionId && REGIONS.includes(regionId as typeof REGIONS[number])
    ? regionId
    : pick([...REGIONS], `${gender}:${Date.now()}:${Math.random()}`);
  const district = pick(DISTRICTS[region] ?? ['Merkez'], `${region}:${gender}:d`);
  const firstName = pick(gender === 'female' ? FEMALE_NAMES : MALE_NAMES, `${region}:${gender}:n:${Math.random()}`);
  const surname = pick(SURNAMES, `${region}:${gender}:s:${Math.random()}`);
  const fullName = `${firstName} ${surname}`;
  let username = buildUsername(firstName, surname, usernameStyle, `${region}:${gender}`);
  let personaKey = username;
  let attempt = 0;
  while (existingKeys?.has(personaKey) && attempt < 8) {
    attempt += 1;
    username = `${buildUsername(firstName, surname, usernameStyle, `${personaKey}:${attempt}`)}${randomSuffix()}`;
    personaKey = username;
  }
  const regionLabel = REGION_LABELS[region] ?? region;
  const archetype = resolveArchetype(personaKey);
  const bioTemplate = pick(BIO_TEMPLATES[gender], personaKey);
  const bio = `${bioTemplate
    .replace('{region}', regionLabel)
    .replace('{district}', district)} ${archetype.bioExtra}`;
  const avatarUrl = resolvePersonaAvatarUrl(gender, personaKey, avatarMode);

  return {
    username,
    fullName,
    gender,
    regionId: region,
    district,
    bio,
    avatarUrl,
    personaKey,
    tone: archetype.tone,
    interests: buildPersonaInterests(personaKey),
  };
}

export function resolveGenderFilter(
  filter?: string | null,
): PersonaGender {
  if (filter === 'female' || filter === 'male') return filter;
  return Math.random() < 0.5 ? 'female' : 'male';
}
