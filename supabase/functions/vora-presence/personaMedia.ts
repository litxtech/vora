import { pickPortrait } from './personaCatalog.ts';

const REGION_PHOTOS: Record<string, string[]> = {
  trabzon: [
    'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=1080&q=80',
    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1080&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1080&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80',
  ],
  rize: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=80',
    'https://images.unsplash.com/photo-1518173946687-a4c036bc9680?w=1080&q=80',
    'https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=1080&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1080&q=80',
  ],
  ordu: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80',
    'https://images.unsplash.com/photo-1439068798045-3164d0cbdce2?w=1080&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1080&q=80',
  ],
  samsun: [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1080&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1080&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
  ],
  giresun: [
    'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=1080&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1080&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374fd794c45?w=1080&q=80',
  ],
  artvin: [
    'https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=1080&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374fd794c45?w=1080&q=80',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=80',
  ],
};

const CATEGORY_PHOTOS: Record<string, string[]> = {
  daily: [
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1080&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1080&q=80',
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1080&q=80',
    'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=1080&q=80',
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1080&q=80',
    'https://images.unsplash.com/photo-1515823064-df736067dd5e?w=1080&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&q=80',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&q=80',
    'https://images.unsplash.com/photo-1429962710661-db203fa79498?w=1080&q=80',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1080&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1080&q=80',
    'https://images.unsplash.com/photo-1459749411175-04bf5132ceea?w=1080&q=80',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1080&q=80',
  ],
  general: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1080&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&q=80',
    'https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b?w=1080&q=80',
    'https://images.unsplash.com/photo-1511632765481-a03876809000?w=1080&q=80',
  ],
  event: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&q=80',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1080&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&q=80',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1080&q=80',
  ],
  business: [
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1080&q=80',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1080&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&q=80',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1080&q=80',
  ],
  news: [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1080&q=80',
    'https://images.unsplash.com/photo-1495020689067-6a84981bbf24?w=1080&q=80',
    'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1080&q=80',
  ],
  traffic: [
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2001?w=1080&q=80',
    'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1080&q=80',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1080&q=80',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1080&q=80',
  ],
  job: [
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1080&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1080&q=80',
  ],
  lost_found: [
    'https://images.unsplash.com/photo-1512428559087-56026550da9a?w=1080&q=80',
    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1080&q=80',
  ],
  emergency: [
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1080&q=80',
    'https://images.unsplash.com/photo-1534088568595-a066f41045a9?w=1080&q=80',
  ],
};

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function personaPortraitUrl(gender: string, seed: string): string {
  return pickPortrait(gender === 'female' ? 'female' : 'male', seed);
}

export function pickPersonaPhoto(
  category: string,
  regionId: string,
  personaKey: string,
  postCount: number,
): string {
  const regionPool = REGION_PHOTOS[regionId] ?? [];
  const categoryPool = CATEGORY_PHOTOS[category] ?? CATEGORY_PHOTOS.general;
  const merged = [...categoryPool, ...regionPool];
  const unique = [...new Set(merged)];
  const salt = `${personaKey}:${category}:${postCount}:${Math.floor(Date.now() / 86_400_000)}`;
  const idx = (hashSeed(salt) + postCount * 7) % unique.length;
  return unique[idx] ?? CATEGORY_PHOTOS.general[0];
}
