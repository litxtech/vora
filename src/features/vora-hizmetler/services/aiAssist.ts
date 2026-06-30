import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import type { AiRequestAssistResult, ServiceCategory } from '@/features/vora-hizmetler/types';
import {
  SERVICE_CATEGORY_OPTIONS,
  serviceCategoryLabel,
} from '@/features/vora-hizmetler/constants';
import { countNearbyProvidersByCategory } from '@/features/vora-hizmetler/services/requestData';
import { supabase } from '@/lib/supabase/client';

const CATEGORY_KEYWORDS: Record<ServiceCategory, string[]> = {
  elektrik: ['elektrik', 'priz', 'sigorta', 'ampul', 'kablo', 'elektrikçi'],
  su_tesisati: ['musluk', 'su', 'tesisat', 'boru', 'tıkan', 'damla', 'lavabo', 'klozet', 'sıhhi'],
  boya: ['boya', 'badana', 'duvar boya'],
  alci: ['alçı', 'sıva', 'macun'],
  insaat: ['inşaat', 'duvar', 'yapı', 'tadilat', 'kırım'],
  klima: ['klima', 'soğutma', 'split'],
  kombi: ['kombi', 'kalorifer', 'petek', 'ısıtma'],
  mobilya: ['mobilya', 'koltuk', 'dolap'],
  marangoz: ['marangoz', 'ahşap', 'kapı', 'pencere'],
  oto_tamir: ['araba', 'oto', 'motor', 'tamir', 'servis'],
  cekici: ['çekici', 'kaza', 'yolda kaldı'],
  lastik: ['lastik', 'tekerlek', 'balans'],
  bilgisayar: ['bilgisayar', 'pc', 'laptop', 'format'],
  yazilim: ['yazılım', 'program', 'kod', 'app', 'uygulama'],
  web_tasarim: ['web', 'site', 'tasarım'],
  fotografci: ['fotoğraf', 'fotoğrafçı', 'çekim'],
  kameraman: ['kamera', 'video çekim', 'kameraman'],
  dugun_organizasyon: ['düğün', 'organizasyon', 'nişan'],
  kuafor: ['kuaför', 'saç', 'kesim'],
  guzellik: ['güzellik', 'makyaj', 'cilt', 'epilasyon'],
  temizlik: ['temizlik', 'temizle', 'ev temizliği'],
  nakliye: ['nakliye', 'taşıma', 'ev taşıma'],
  veteriner: ['veteriner', 'hayvan', 'kedi', 'köpek'],
  bahcivan: ['bahçe', 'bahçıvan', 'çim', 'ağaç'],
  ozel_ders: ['ders', 'özel ders', 'eğitim', 'matematik'],
  avukat: ['avukat', 'hukuk', 'dava'],
  muhasebeci: ['muhasebe', 'vergi', 'beyanname'],
  diger: [],
};

const PRICE_ESTIMATES: Record<ServiceCategory, { min: number; max: number; duration: string }> = {
  elektrik: { min: 500, max: 2000, duration: '30-90 dakika' },
  su_tesisati: { min: 700, max: 2500, duration: '30-60 dakika' },
  boya: { min: 3000, max: 15000, duration: '1-3 gün' },
  alci: { min: 2000, max: 8000, duration: '1-2 gün' },
  insaat: { min: 5000, max: 50000, duration: '3-14 gün' },
  klima: { min: 800, max: 3500, duration: '1-2 saat' },
  kombi: { min: 600, max: 3000, duration: '45-90 dakika' },
  mobilya: { min: 500, max: 5000, duration: '1-4 saat' },
  marangoz: { min: 1000, max: 8000, duration: '2-8 saat' },
  oto_tamir: { min: 1000, max: 10000, duration: '2-24 saat' },
  cekici: { min: 800, max: 3000, duration: '30-60 dakika' },
  lastik: { min: 300, max: 2000, duration: '20-45 dakika' },
  bilgisayar: { min: 400, max: 2500, duration: '1-3 saat' },
  yazilim: { min: 5000, max: 50000, duration: '1-4 hafta' },
  web_tasarim: { min: 3000, max: 30000, duration: '1-3 hafta' },
  fotografci: { min: 2000, max: 15000, duration: '2-8 saat' },
  kameraman: { min: 3000, max: 20000, duration: '2-8 saat' },
  dugun_organizasyon: { min: 20000, max: 200000, duration: '1-3 ay' },
  kuafor: { min: 200, max: 1500, duration: '30-90 dakika' },
  guzellik: { min: 300, max: 3000, duration: '45-120 dakika' },
  temizlik: { min: 500, max: 3000, duration: '2-6 saat' },
  nakliye: { min: 2000, max: 15000, duration: '3-8 saat' },
  veteriner: { min: 400, max: 2500, duration: '30-60 dakika' },
  bahcivan: { min: 500, max: 4000, duration: '2-6 saat' },
  ozel_ders: { min: 300, max: 800, duration: '60 dakika' },
  avukat: { min: 2000, max: 20000, duration: '1-5 saat' },
  muhasebeci: { min: 1000, max: 8000, duration: '1-3 saat' },
  diger: { min: 500, max: 3000, duration: '1-2 saat' },
};

function detectCategory(text: string): ServiceCategory {
  const lower = text.toLowerCase();
  for (const option of SERVICE_CATEGORY_OPTIONS) {
    if (option.value === 'diger') continue;
    const keywords = CATEGORY_KEYWORDS[option.value];
    if (keywords.some((kw) => lower.includes(kw))) {
      return option.value;
    }
  }
  return 'diger';
}

export async function analyzeServiceRequest(
  text: string,
  regionId: string | null,
): Promise<AiRequestAssistResult> {
  const category = detectCategory(text);
  const estimate = PRICE_ESTIMATES[category];
  const nearbyProviders = await countNearbyProvidersByCategory(category, regionId);

  return {
    category,
    categoryLabel: serviceCategoryLabel(category),
    estimatedDuration: estimate.duration,
    nearbyProviders: Math.max(nearbyProviders, 0),
    estimatedPriceMin: estimate.min,
    estimatedPriceMax: estimate.max,
  };
}

export async function uploadServiceMedia(
  userId: string,
  uri: string,
  mimeType = 'image/jpeg',
): Promise<{ url: string | null; error?: string }> {
  try {
    const ext = mimeType.includes('video') ? 'mp4' : mimeType.includes('png') ? 'png' : 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const arrayBuffer = await readLocalFileBytes(uri);

    const { error } = await supabase.storage
      .from('vora-hizmetler')
      .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });

    if (error) return { url: null, error: error.message };

    const { data } = supabase.storage.from('vora-hizmetler').getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Yükleme başarısız' };
  }
}
