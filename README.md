# Vora

**Vora**, bölgesel sosyal ağ ve yaşam platformudur. Akış, keşfet, mesajlaşma, harita, merkezler (iş, turizm, ulaşım, etkinlik vb.), görüntülü/sesli arama, Vora AI ve daha fazlasını tek bir Expo uygulamasında birleştirir.

- **Sürüm:** 2.4.0  
- **Paket:** `com.karadeniz.dijitalagi`  
- **Web:** [vora.app](https://vora.app)  
- **Geliştirici:** [LitxTech](https://github.com/litxtech)

---

## Özellikler

| Alan | İçerik |
|------|--------|
| **Sosyal** | Akış, hikâyeler, reels, hashtag, profil, takip, davet |
| **Mesajlaşma** | Sohbet, link önizleme, gerçek zamanlı inbox, push bildirimleri |
| **Harita** | Mapbox (Android), katmanlar, POI detayları, trafik |
| **Merkezler** | İş ilanları, personel, kayıp-buluntu, etkinlikler, otel, pazar yeri, ulaşım ve daha fazlası |
| **Arama** | Agora ile sesli/görüntülü arama |
| **Vora AI** | DeepSeek tabanlı asistan, Vora Studio, Vora Presence |
| **Ticaret** | Stripe ödemeleri, cüzdan, platform desteği, reklam cüzdanı |
| **Yönetim** | Admin paneli, moderasyon, özellik bayrakları, duyurular |

Özellikler `src/features/<özellik>/` altında izole edilmiştir; route dosyaları (`src/app/`) yalnızca ilgili ekranı import eder.

---

## Teknoloji

| Katman | Teknoloji |
|--------|-----------|
| Mobil | [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/), React Native 0.85, Expo Router |
| Backend | [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Harita | Mapbox (`@rnmapbox/maps`), react-native-maps (iOS) |
| Video | Mux, expo-video |
| Arama | Agora |
| Ödeme | Stripe, expo-iap (Apple / Google) |
| Push | Firebase (Android), APNs (iOS) |
| Durum | Zustand |

---

## Proje yapısı

```
├── src/
│   ├── app/              # Expo Router — ince route dosyaları
│   ├── components/       # Paylaşılan UI bileşenleri
│   ├── constants/        # Tema, bölgeler, merkez tanımları
│   ├── features/         # Özellik modülleri (components, services, types)
│   ├── config/           # Ortam değişkenleri
│   └── providers/        # React context sağlayıcıları
├── supabase/
│   ├── migrations/       # Veritabanı migration'ları
│   └── functions/        # Edge Functions (Stripe, AI, push, Mux vb.)
├── assets/               # İkonlar, splash, görseller
├── plugins/              # Expo config plugin'leri
├── scripts/              # Yardımcı script'ler
└── vendor/android-m2/    # Yerel Android Maven bağımlılıkları
```

---

## Gereksinimler

- Node.js 20+
- npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/) ve [EAS CLI](https://docs.expo.dev/build/setup/) (production build için)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (veritabanı işlemleri için)
- iOS: Xcode 16+ (yerel build)
- Android: Android Studio, JDK 17

---

## Kurulum

```bash
# Depoyu klonlayın
git clone https://github.com/litxtech/vora.git
cd vora

# Bağımlılıkları yükleyin
npm install

# Ortam değişkenlerini oluşturun
cp .env.example .env
# .env dosyasını düzenleyin (aşağıdaki tabloya bakın)

# Geliştirme sunucusunu başlatın
npm start
```

### Ortam değişkenleri

`.env.example` dosyasındaki tüm anahtarları inceleyin. **Kod içinde** `import { env } from '@/config/env'` kullanın — tam eşleme tablosu için [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md).

Minimum geliştirme için:

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) anahtarı |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox public token (Android harita) |
| `EXPO_PUBLIC_AGORA_APP_ID` | Agora uygulama kimliği |
| `EXPO_PUBLIC_FIREBASE_*` | Android push için Firebase yapılandırması |

Sunucu tarafı sırları (Stripe, Mux, DeepSeek, Agora sertifikası vb.) yalnızca Supabase Edge Function secrets veya EAS secrets içinde tutulur — istemciye konmaz.

> **Güvenlik:** `.env`, `google-services.json` ve tüm private key dosyaları asla commit edilmemelidir.

---

## Veritabanı

```bash
# Supabase projesine bağlanın (ilk kurulum)
supabase link --project-ref <project-ref>

# Migration'ları uygulayın
npm run db:push

# Yerel geliştirme ortamı (isteğe bağlı)
supabase start
npm run db:reset
```

Edge Function'ları deploy etmek için:

```bash
supabase functions deploy <function-name>
```

---

## Geliştirme komutları

| Komut | Açıklama |
|-------|----------|
| `npm start` | Expo geliştirme sunucusu |
| `npm run android` | Android yerel build |
| `npm run ios` | iOS yerel build |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run db:push` | Supabase migration push |
| `npm run ensure:google-services` | `google-services.json` üretimi (env'den) |

---

## Production build (EAS)

```bash
# EAS'e giriş
eas login

# Development client
eas build --profile development --platform all

# Production
eas build --profile production --platform all

# Mağazaya gönderim
eas submit --profile production --platform all
```

Build profilleri `eas.json` içinde tanımlıdır.

---

## Mimari kurallar

1. Her özellik `src/features/<özellik>/` altında yaşar (`components/`, `services/`, `constants.ts`, `types.ts`).
2. Özellikler arası import yalnızca public API (`index.ts`) üzerinden yapılır.
3. Yeni Supabase migration'ları tek özellik başına bir dosya olmalıdır.
4. Harita detay fetcher'ları `map/services/detail/` altında özellik başına ayrı dosyadır.
5. Expo SDK 56 dokümantasyonu referans alınır: [docs.expo.dev/v56](https://docs.expo.dev/versions/v56.0.0/).

Detaylar için [`AGENTS.md`](./AGENTS.md) ve değişiklik geçmişi için [`CHANGELOG.md`](./CHANGELOG.md) dosyalarına bakın.

---

## Lisans

Bu depo özel mülkiyettedir. LitxTech tarafından geliştirilmiştir. Kullanım ve dağıtım için depo sahibiyle iletişime geçin.

---

## İletişim

- GitHub: [litxtech/vora](https://github.com/litxtech/vora)
- Web: [vora.app](https://vora.app)
