# Changelog

Bu dosya ekip için önemli değişiklikleri listeler. Detaylı ortam değişkeni referansı: [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md).

Format [Keep a Changelog](https://keepachangelog.com/) esas alınır.

---

## [2.4.1] — 2025-06-30

### Depo ve marka

- **Git remote** `mytrabzon/karadeniz-vora-` → [`litxtech/vora`](https://github.com/litxtech/vora)
- **npm paket adı** `karadeniz-app` → `vora`
- **README.md** eklendi (kurulum, mimari, EAS)
- **CHANGELOG.md** ve **docs/ENVIRONMENT.md** eklendi

### İsimlendirme standardizasyonu

#### Ortam değişkenleri (istemci)

Tüm `EXPO_PUBLIC_*` değerleri artık tek merkezden okunur:

| Eski (dağınık) | Yeni (merkezi) |
|----------------|----------------|
| `process.env.EXPO_PUBLIC_SUPABASE_URL` | `env.supabase.url` |
| `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` | `env.supabase.anonKey` |
| `env.supabaseUrl` / `env.supabaseAnonKey` | `env.supabase.url` / `env.supabase.anonKey` |
| `env.agoraAppId` | `env.agora.appId` |
| `env.mapboxToken` | `env.mapbox.accessToken` |
| `process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `env.stripe.publishableKey` |
| `process.env.EXPO_PUBLIC_SHARE_BASE_URL` | `env.share.baseUrl` |
| `process.env.EXPO_PUBLIC_*_URL` (yasal) | `env.legal.*` |
| `process.env.EXPO_PUBLIC_ENABLE_DEMO_DATA` | `env.dev.isDemoDataEnabled` |

**Dosya:** `src/config/env.ts` — yeni kod buradan import etmeli.

#### Uygulama kimliği

Dağınık `com.karadeniz.dijitalagi` string'leri → `src/constants/app.ts`:

| Sabit | Açıklama |
|-------|----------|
| `APP_BUNDLE_ID` | iOS bundle + Android package |
| `APP_SCHEME` | Deep link (`vora://`) |
| `APP_DOMAIN` | `vora.app` |
| `iapProductId()` | Premium IAP ürün ID'leri |

`app.config.ts` bu sabitleri import eder.

#### Bileşen / servis prop'ları

| Eski | Yeni | Neden |
|------|------|-------|
| `karadenizWide` | `isKaradenizWideScope` | Boolean isimlendirme (`is` öneki) |
| `agendaKaradenizWide` | `isAgendaKaradenizWideScope` | Aynı kural |

> **Not:** Veritabanı/API kapsam değeri `'karadeniz'` aynı kaldı (`DiscoveryScope`, RPC `p_karadeniz_wide`). Yalnızca TypeScript tarafı yeniden adlandırıldı.

### Güvenlik

- `google-services.json` `.gitignore`'a eklendi

### Ekip için yapılacaklar

1. Remote'u güncelleyin: `git remote set-url origin https://github.com/litxtech/vora.git`
2. `.env` dosyanızı koruyun — commit edilmez
3. Yeni kodda `import { env } from '@/config/env'` kullanın
4. Paket kimliği için `import { APP_BUNDLE_ID } from '@/constants/app'`

---

## [2.4.0] — 2025-06-30

### İlk senkron — litxtech/vora

- Expo SDK 56 tam uygulama kodu
- 80+ özellik modülü (`src/features/`)
- Supabase migration'ları ve edge function'lar
- Vendor Android Maven bağımlılıkları
