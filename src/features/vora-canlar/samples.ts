import type { ImageSource } from 'expo-image';

export type CanlarExample = {
  id: string;
  kind: 'case' | 'campaign';
  title: string;
  city: string;
  badge: string;
  tone: string;
  summary: string;
  image: ImageSource;
  events: { label: string; note: string }[];
};

const kedi = require('./assets/canlar-ornek-kedi.jpg') as ImageSource;
const kopek = require('./assets/canlar-ornek-kopek.jpg') as ImageSource;
const kus = require('./assets/canlar-ornek-kus.jpg') as ImageSource;
const yavru = require('./assets/canlar-ornek-yavru.jpg') as ImageSource;

/** Tasarım önizlemesi. Veritabanına yazılmaz ve gerçek vaka değildir. */
export const CANLAR_EXAMPLES: CanlarExample[] = [
  {
    id: 'ornek-pamuk',
    kind: 'case',
    title: 'Pamuk',
    city: 'Trabzon',
    badge: 'Çok acil',
    tone: '#E53935',
    summary: 'Örnek ihbar. Yol kenarında görülen kedi. Bu kayıt gerçek değildir.',
    image: kedi,
    events: [
      { label: 'Yeni ihbar', note: 'Örnek zaman çizelgesi. Henüz inceleme yok.' },
      { label: 'İnceleme bekliyor', note: 'Örnek durum. Yetkili ataması yapılmadı.' },
    ],
  },
  {
    id: 'ornek-karabas',
    kind: 'case',
    title: 'Karabaş',
    city: 'Samsun',
    badge: 'Tedavi devam ediyor',
    tone: '#F9A825',
    summary: 'Örnek tedavi dosyası. Klinik notu uydurulmamıştır; yalnızca yerleşim örneğidir.',
    image: kopek,
    events: [
      { label: 'Güvenli alana alındı', note: 'Örnek geçmiş kaydı.' },
      { label: 'Tedavi devam ediyor', note: 'Örnek durum. Tıbbi ayrıntı yoktur.' },
    ],
  },
  {
    id: 'ornek-serce',
    kind: 'case',
    title: 'Serçe',
    city: 'Ordu',
    badge: 'Yeni ihbar',
    tone: '#C47B4A',
    summary: 'Örnek kuş ihbarı. Konum yalnızca şehir olarak gösterilir.',
    image: kus,
    events: [{ label: 'Yeni ihbar', note: 'Örnek kayıt. Koordinat paylaşılmaz.' }],
  },
  {
    id: 'ornek-boncuk',
    kind: 'campaign',
    title: 'Boncuk için mama',
    city: 'Rize',
    badge: 'Bağış açık',
    tone: '#2E7D32',
    summary: 'Örnek kampanya. Hedef 12.000 TL. Toplanan tutar yoktur; ödeme başlatılmaz.',
    image: yavru,
    events: [
      { label: 'Yayında', note: 'Örnek kampanya durumu. Ödeme yöntemi açık görünür; bu ekrandan tahsilat yapılmaz.' },
      { label: 'Kanıt yok', note: 'Örnek şeffaflık satırı. Belge yüklenmedi.' },
    ],
  },
];

export function findCanlarExample(id: string | undefined) {
  return CANLAR_EXAMPLES.find((item) => item.id === id) ?? null;
}
