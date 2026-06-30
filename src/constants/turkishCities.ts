/** Türkiye'nin 81 ili — paylaşımlı yolculuk ve genel şehir seçimi için */
export type TurkishCity = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export const TURKISH_CITIES: TurkishCity[] = [
  { id: 'adana', name: 'Adana', lat: 37.0, lng: 35.3213 },
  { id: 'adiyaman', name: 'Adıyaman', lat: 37.7648, lng: 38.2786 },
  { id: 'afyonkarahisar', name: 'Afyonkarahisar', lat: 38.7507, lng: 30.5567 },
  { id: 'agri', name: 'Ağrı', lat: 39.7191, lng: 43.0503 },
  { id: 'aksaray', name: 'Aksaray', lat: 38.3687, lng: 34.037 },
  { id: 'amasya', name: 'Amasya', lat: 40.6499, lng: 35.8353 },
  { id: 'ankara', name: 'Ankara', lat: 39.9334, lng: 32.8597 },
  { id: 'antalya', name: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { id: 'ardahan', name: 'Ardahan', lat: 41.1105, lng: 42.7022 },
  { id: 'artvin', name: 'Artvin', lat: 41.1828, lng: 41.8183 },
  { id: 'aydin', name: 'Aydın', lat: 37.856, lng: 27.8416 },
  { id: 'balikesir', name: 'Balıkesir', lat: 39.6484, lng: 27.8826 },
  { id: 'bartin', name: 'Bartın', lat: 41.6344, lng: 32.3375 },
  { id: 'batman', name: 'Batman', lat: 37.8812, lng: 41.1351 },
  { id: 'bayburt', name: 'Bayburt', lat: 40.2552, lng: 40.2249 },
  { id: 'bilecik', name: 'Bilecik', lat: 40.1426, lng: 29.9793 },
  { id: 'bingol', name: 'Bingöl', lat: 38.8854, lng: 40.4983 },
  { id: 'bitlis', name: 'Bitlis', lat: 38.4006, lng: 42.1095 },
  { id: 'bolu', name: 'Bolu', lat: 40.7395, lng: 31.6089 },
  { id: 'burdur', name: 'Burdur', lat: 37.7203, lng: 30.2908 },
  { id: 'bursa', name: 'Bursa', lat: 40.1885, lng: 29.061 },
  { id: 'canakkale', name: 'Çanakkale', lat: 40.1553, lng: 26.4142 },
  { id: 'cankiri', name: 'Çankırı', lat: 40.6013, lng: 33.6134 },
  { id: 'corum', name: 'Çorum', lat: 40.5506, lng: 34.9556 },
  { id: 'denizli', name: 'Denizli', lat: 37.7765, lng: 29.0864 },
  { id: 'diyarbakir', name: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { id: 'duzce', name: 'Düzce', lat: 40.8438, lng: 31.1565 },
  { id: 'edirne', name: 'Edirne', lat: 41.6771, lng: 26.5557 },
  { id: 'elazig', name: 'Elazığ', lat: 38.681, lng: 39.2264 },
  { id: 'erzincan', name: 'Erzincan', lat: 39.75, lng: 39.5 },
  { id: 'erzurum', name: 'Erzurum', lat: 39.9043, lng: 41.2679 },
  { id: 'eskisehir', name: 'Eskişehir', lat: 39.7767, lng: 30.5206 },
  { id: 'gaziantep', name: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { id: 'giresun', name: 'Giresun', lat: 40.9128, lng: 38.3895 },
  { id: 'gumushane', name: 'Gümüşhane', lat: 40.4603, lng: 39.4814 },
  { id: 'hakkari', name: 'Hakkari', lat: 37.5744, lng: 43.7408 },
  { id: 'hatay', name: 'Hatay', lat: 36.4018, lng: 36.3498 },
  { id: 'igdir', name: 'Iğdır', lat: 39.9237, lng: 44.045 },
  { id: 'isparta', name: 'Isparta', lat: 37.7648, lng: 30.5566 },
  { id: 'istanbul', name: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { id: 'izmir', name: 'İzmir', lat: 38.4237, lng: 27.1428 },
  { id: 'kahramanmaras', name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371 },
  { id: 'karabuk', name: 'Karabük', lat: 41.2061, lng: 32.6204 },
  { id: 'karaman', name: 'Karaman', lat: 37.1759, lng: 33.2287 },
  { id: 'kars', name: 'Kars', lat: 40.6013, lng: 43.0975 },
  { id: 'kastamonu', name: 'Kastamonu', lat: 41.3887, lng: 33.7827 },
  { id: 'kayseri', name: 'Kayseri', lat: 38.7312, lng: 35.4787 },
  { id: 'kirikkale', name: 'Kırıkkale', lat: 39.8468, lng: 33.5153 },
  { id: 'kirklareli', name: 'Kırklareli', lat: 41.7333, lng: 27.2167 },
  { id: 'kirsehir', name: 'Kırşehir', lat: 39.1425, lng: 34.1709 },
  { id: 'kilis', name: 'Kilis', lat: 36.7184, lng: 37.1212 },
  { id: 'kocaeli', name: 'Kocaeli', lat: 40.8533, lng: 29.8815 },
  { id: 'konya', name: 'Konya', lat: 37.8746, lng: 32.4932 },
  { id: 'kutahya', name: 'Kütahya', lat: 39.4242, lng: 29.9833 },
  { id: 'malatya', name: 'Malatya', lat: 38.3552, lng: 38.3095 },
  { id: 'manisa', name: 'Manisa', lat: 38.6191, lng: 27.4289 },
  { id: 'mardin', name: 'Mardin', lat: 37.3212, lng: 40.7245 },
  { id: 'mersin', name: 'Mersin', lat: 36.8121, lng: 34.6415 },
  { id: 'mugla', name: 'Muğla', lat: 37.2153, lng: 28.3636 },
  { id: 'mus', name: 'Muş', lat: 38.7432, lng: 41.5065 },
  { id: 'nevsehir', name: 'Nevşehir', lat: 38.6939, lng: 34.6857 },
  { id: 'nigde', name: 'Niğde', lat: 37.9667, lng: 34.6939 },
  { id: 'ordu', name: 'Ordu', lat: 40.9839, lng: 37.8764 },
  { id: 'osmaniye', name: 'Osmaniye', lat: 37.0742, lng: 36.2478 },
  { id: 'rize', name: 'Rize', lat: 41.0201, lng: 40.5234 },
  { id: 'sakarya', name: 'Sakarya', lat: 40.7569, lng: 30.3781 },
  { id: 'samsun', name: 'Samsun', lat: 41.2867, lng: 36.33 },
  { id: 'sanliurfa', name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969 },
  { id: 'siirt', name: 'Siirt', lat: 37.9333, lng: 41.95 },
  { id: 'sinop', name: 'Sinop', lat: 42.0264, lng: 35.1551 },
  { id: 'sivas', name: 'Sivas', lat: 39.7477, lng: 37.0179 },
  { id: 'sirnak', name: 'Şırnak', lat: 37.5164, lng: 42.4611 },
  { id: 'tekirdag', name: 'Tekirdağ', lat: 40.978, lng: 27.511 },
  { id: 'tokat', name: 'Tokat', lat: 40.3167, lng: 36.55 },
  { id: 'trabzon', name: 'Trabzon', lat: 41.0027, lng: 39.7168 },
  { id: 'tunceli', name: 'Tunceli', lat: 39.1079, lng: 39.5401 },
  { id: 'usak', name: 'Uşak', lat: 38.6823, lng: 29.4082 },
  { id: 'van', name: 'Van', lat: 38.4891, lng: 43.4089 },
  { id: 'yalova', name: 'Yalova', lat: 40.65, lng: 29.2667 },
  { id: 'yozgat', name: 'Yozgat', lat: 39.8181, lng: 34.8147 },
  { id: 'zonguldak', name: 'Zonguldak', lat: 41.4564, lng: 31.7987 },
];

const cityById = new Map(TURKISH_CITIES.map((c) => [c.id, c]));

export function turkishCityName(id: string | null | undefined): string {
  if (!id) return '—';
  return cityById.get(id)?.name ?? id;
}

export function filterTurkishCities(query: string, excludeIds: string[] = []): TurkishCity[] {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  const excluded = new Set(excludeIds);
  return TURKISH_CITIES.filter((c) => {
    if (excluded.has(c.id)) return false;
    if (!q) return true;
    return c.name.toLocaleLowerCase('tr-TR').includes(q) || c.id.includes(q);
  });
}
