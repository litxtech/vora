import { supabase } from '@/lib/supabase/client';

export const CASE_CODE_HELP =
  'Vaka numarası siz yazmazsınız. İhbar kaydolunca sistem VC-000123 biçiminde bir numara verir. Paylaşım bu numarayı beklemez ve hemen yayınlanır.';

export const STATUS_SCENARIOS = [
  { title: 'Yeni ihbar', text: 'Kayıt açıldı. Henüz bir ekip bakmadı.' },
  { title: 'İnceleniyor', text: 'Bilgi kontrol ediliyor. Bu, hayvanın kurtarıldığı anlamına gelmez.' },
  { title: 'Kurtarma', text: 'Plan var veya ekip yolda. Henüz güvende sayılmaz.' },
  { title: 'Güvenli alanda', text: 'Hayvan alındı. Tedavi ayrıca yazılır.' },
  { title: 'Tedavi veya iyileşme', text: 'Sağlık süreci sürüyor. Yüzde ile gösterilmez.' },
  { title: 'Yuva veya tamamlandı', text: 'Dosya başarıyla kapandı.' },
  { title: 'Kayıp, iptal veya mükerrer', text: 'Başarı değildir. Kayıt silinmez, sonucu ayrı durur.' },
] as const;

export const DONATION_SCENARIOS = [
  { title: 'Ödeme bekleniyor', text: 'Tutar henüz çekilmedi. Toplanan bağış sayılmaz.' },
  { title: 'Ödeme kesinleşti', text: 'Para alındı. İşlem ücreti ayrıca yazılır; baştan sabit oran yoktur.' },
  { title: 'Ödeme başarısız', text: 'Para alınmadı. Bağışa eklenmez.' },
  { title: 'İade', text: 'Para geri döndü. Toplanan tutardan düşülür.' },
] as const;

export function missingMessage(problems: string[]) {
  if (problems.length === 0) return null;
  return problems.join('\n');
}

export function explainCanlarError(message: string | null | undefined) {
  if (!message) return 'İşlem tamamlanamadı. Eksik alanı yukarıdan kontrol edin.';
  const text = message.trim();
  if (/uuid/i.test(text)) {
    return 'Seçilen dosya bulunamadı. Listeden kendi ihbarınızı seçin. Numara yazılmaz.';
  }
  if (/summary/i.test(text) || /char_length/i.test(text)) {
    return 'Ne oldu? kısmı çok kısa. En az bir kısa cümle yazın.';
  }
  if (/aralığın dışında/i.test(text) || /gross/i.test(text)) {
    return 'Bağış tutarı en az 10 TL, en çok 500.000 TL olabilir. Örnek: 100';
  }
  if (/şehir|city/i.test(text) && /null/i.test(text)) {
    return 'Şehir eksik. İl adını yazın.';
  }
  return text;
}

type Row = { id: string; title?: string };

const tables = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Row | null; error: { message: string } | null }>;
        eq: (column: string, value: string) => {
          eq: (column: string, value: boolean) => {
            limit: (count: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
};

export type OwnCase = { id: string; name: string | null; city_label: string; public_code: string };

export async function listMyCases(userId: string): Promise<OwnCase[]> {
  const listed = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          order: (column: string, options: { ascending: boolean }) => {
            limit: (count: number) => Promise<{ data: OwnCase[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
  const { data, error } = await listed
    .from('canlar_cases')
    .select('id, name, city_label, public_code')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error || !data) return [];
  return data;
}

export async function resolveCaseCode(raw: string): Promise<{ id: string } | { error: string }> {
  const code = raw.trim().toUpperCase().replace(/\s/g, '');
  if (!code) return { error: 'Vaka numarası boş.' };
  if (!/^VC-\d{1,8}$/.test(code)) {
    return { error: 'Vaka numarası VC-000123 biçiminde olmalı. Dosyanın üstünden aynen yazın.' };
  }
  const padded = `VC-${code.slice(3).padStart(6, '0')}`;
  const { data, error } = await tables.from('canlar_cases').select('id').eq('public_code', padded).maybeSingle();
  if (error) return { error: 'Vaka numarası şu anda kontrol edilemedi. Bağlantınızı deneyin.' };
  if (!data?.id) return { error: `${padded} numaralı dosya yok. Numarayı dosyanın üstünden kontrol edin.` };
  return { id: data.id };
}

export async function findOpenCampaign(caseId: string): Promise<{ id: string; title: string } | { error: string }> {
  const { data, error } = await tables
    .from('canlar_campaigns')
    .select('id, title')
    .eq('case_id', caseId)
    .eq('status', 'live')
    .eq('payments_enabled', true)
    .limit(1);
  if (error) return { error: 'Bağış durumu kontrol edilemedi.' };
  const row = data?.[0];
  if (!row?.id) {
    return { error: 'Bu vakada bağışa açık kampanya yok. Buton için kampanyanın yayında ve ödemesinin açık olması gerekir.' };
  }
  return { id: row.id, title: row.title ?? 'Kampanya' };
}
