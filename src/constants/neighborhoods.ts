import type { RegionId } from '@/constants/regions';

/** Örnek mahalle listeleri — ilçe bazlı genişletilebilir */
export const NEIGHBORHOODS: Partial<Record<RegionId, Record<string, string[]>>> = {
  trabzon: {
    Ortahisar: ['Bostancı', 'Çarşı', 'Gazipaşa', 'Pelitli', 'Yalıncak', 'Beşirli'],
    Yomra: ['Kaşüstü', 'Sancak', 'Orta', 'Sahil'],
    Akçaabat: ['Merkez', 'Derecik', 'Şinik'],
    Arsin: ['Merkez', 'Yeşilce', 'Köprübaşı'],
    Çaykara: ['Merkez', 'Uzungöl', 'Ataköy'],
  },
};

export function neighborhoodsForDistrict(regionId: RegionId, district: string): string[] {
  return NEIGHBORHOODS[regionId]?.[district] ?? [];
}
