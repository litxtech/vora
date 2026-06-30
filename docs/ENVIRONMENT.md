# Ortam değişkenleri

Vora'da ortam değişkenleri üç katmanda kullanılır:

| Katman | Dosya / yer | Erişim |
|--------|-------------|--------|
| **İstemci (public)** | `.env` → `EXPO_PUBLIC_*` | `import { env } from '@/config/env'` |
| **Build / CLI** | `.env` (commit edilmez) | `process.env` (script'ler, EAS) |
| **Sunucu (gizli)** | Supabase Edge Function secrets | `Deno.env.get(...)` |

> `.env` ve `google-services.json` asla commit edilmez. Şablon: [`.env.example`](../.env.example)

---

## İstemci — `EXPO_PUBLIC_*`

Kod içinde **doğrudan `process.env` kullanmayın.** Merkezi nesne:

```ts
import { env } from '@/config/env';

env.supabase.url
env.mapbox.accessToken
env.dev.isDemoDataEnabled
```

### Tam eşleme tablosu

| `.env` anahtarı | Kod özelliği (`env.*`) | Zorunlu | Açıklama |
|-----------------|------------------------|---------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | `supabase.url` | Evet | Supabase proje URL'i |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `supabase.anonKey` | Evet | Supabase anon (public) key |
| `EXPO_PUBLIC_AGORA_APP_ID` | `agora.appId` | Arama için | Agora uygulama kimliği |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `mapbox.accessToken` | Android harita | Mapbox public token |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `firebase.apiKey` | Android push | Firebase API key |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `firebase.projectId` | Android push | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `firebase.appId` | Android push | Firebase mobile app ID |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `firebase.messagingSenderId` | Android push | FCM sender ID (project number) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `stripe.publishableKey` | Ödeme için | Stripe publishable key |
| `EXPO_PUBLIC_SHARE_BASE_URL` | `share.baseUrl` | Hayır | Paylaşım link kökü (varsayılan: share-preview) |
| `EXPO_PUBLIC_IOS_APP_STORE_URL` | `stores.iosAppStoreUrl` | Hayır | App Store sayfası |
| `EXPO_PUBLIC_ANDROID_PLAY_STORE_URL` | `stores.androidPlayStoreUrl` | Hayır | Play Store sayfası |
| `EXPO_PUBLIC_TERMS_OF_USE_URL` | `legal.termsOfUseUrl` | Hayır | Harici kullanım şartları |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | `legal.privacyPolicyUrl` | Hayır | Harici gizlilik politikası |
| `EXPO_PUBLIC_CHILD_PROTECTION_POLICY_URL` | `legal.childProtectionPolicyUrl` | Hayır | Harici çocuk koruma politikası |
| `EXPO_PUBLIC_ENABLE_DEMO_DATA` | `dev.isDemoDataEnabled` | Hayır | `true` / `false`; boşsa `__DEV__` |

---

## Uygulama sabitleri — `src/constants/app.ts`

Mağaza kimliği ve marka değerleri tek dosyada:

| Sabit | Değer | Not |
|-------|-------|-----|
| `APP_NAME` | `Vora` | Görünen ad |
| `APP_SLUG` | `voralive` | Expo slug |
| `APP_SCHEME` | `vora` | Deep link şeması |
| `APP_DOMAIN` | `vora.app` | Paylaşım domain'i |
| `APP_BUNDLE_ID` | `com.karadeniz.dijitalagi` | iOS bundle + Android package (değiştirilemez) |
| `APPLE_TEAM_ID` | `9W6CR7KXM7` | Apple Developer Team |
| `iapProductId(...)` | — | IAP ürün ID üretici |

---

## CLI / CI (commit edilmez)

| Anahtar | Kullanım |
|---------|----------|
| `EXPO_TOKEN` | EAS CLI, CI build |
| `SUPABASE_ACCESS_TOKEN` | `supabase link`, `db push` |
| `EAS_BUILD_PROFILE` | `development` / `production` (otomatik) |

---

## Supabase Edge Function secrets

Bu değerler yalnızca sunucuda; istemciye **asla** konmaz.

### Altyapı

| Secret | Kullanıldığı yer |
|--------|------------------|
| `SUPABASE_URL` | Tüm edge function'lar (otomatik) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sunucu tarafı DB |
| `SUPABASE_ANON_KEY` | Kullanıcı JWT doğrulama |

### Ödeme (Stripe)

| Secret | Açıklama |
|--------|----------|
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook imza doğrulama |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Premium abonelik |

### Arama & medya

| Secret | Açıklama |
|--------|----------|
| `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` | Agora token üretimi |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | Video upload |

### AI

| Secret | Açıklama |
|--------|----------|
| `DEEPSEEK_API_KEY` | Vora AI metin |
| `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` | İsteğe bağlı override |
| `AI_VISION_API_KEY` / `AI_VISION_*` | Görsel analiz |
| `OPENAI_API_KEY` | Moderasyon / yedek |

### Push bildirimleri

| Secret | Açıklama |
|--------|----------|
| `FIREBASE_SERVER_KEY` | Android FCM (legacy) |
| `APNS_KEY_ID` / `APNS_TEAM_ID` / `APNS_AUTH_KEY` | iOS push |
| `APNS_BUNDLE_ID` | Varsayılan: `APP_BUNDLE_ID` |

### Mağaza doğrulama

| Secret | Açıklama |
|--------|----------|
| `APPLE_ISSUER_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | App Store Server API |
| `APPLE_BUNDLE_ID` | Varsayılan: `com.karadeniz.dijitalagi` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play Billing |
| `GOOGLE_PLAY_PACKAGE_NAME` | Varsayılan: `com.karadeniz.dijitalagi` |

### Paylaşım (share-preview)

| Secret | Açıklama |
|--------|----------|
| `SHARE_BASE_URL` | Varsayılan: `https://vora.app` |
| `APP_SCHEME` | Varsayılan: `vora` |
| `ANDROID_PACKAGE` | App Links doğrulama |
| `ANDROID_SHA256_FINGERPRINT(S)` | Play imza parmak izi |
| `APPLE_TEAM_ID` | Universal Links |

---

## İsimlendirme kuralları

1. **Public istemci:** `EXPO_PUBLIC_<SERVIS>_<ALAN>` (SCREAMING_SNAKE)
2. **Kod erişimi:** `env.<servis>.<alan>` (camelCase)
3. **Boolean prop:** `is` / `has` öneki (`isKaradenizWideScope`)
4. **Ürün kapsamı (DB):** `'region' | 'karadeniz'` — API/DB enum'u, değiştirmeyin
5. **Paket adı:** `APP_BUNDLE_ID` sabitini kullanın; string kopyalamayın

---

## Hızlı kontrol

```bash
# TypeScript
npm run typecheck

# Eksik Firebase env (Android push)
# → uygulama içi uyarı veya listMissingFirebaseEnvKeys()
```
