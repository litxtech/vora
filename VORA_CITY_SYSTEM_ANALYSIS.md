# VORA CITY SYSTEM ANALYSIS

> Analiz tarihi: 29 Ağustos 2026  
> Kod tabanı: Vora `2.4.5` · Expo SDK `56` · React Native `0.85.3`  
> Durum: **Analiz tamamlandı — implementasyon bekliyor (Phase 1 onayı gerekli)**

---

## 0. Özet Kararlar

| Konu | Karar |
|------|-------|
| Şehir entity | Yeni `cities` tablosu **oluşturma** — mevcut `regions` tablosunu genişlet |
| Kullanıcı tablosu | Yeni `users` tablosu **oluşturma** — `auth.users` + `profiles` korunur |
| Ses altyapısı | Agora 1:1 aramalar **korunur**; çoklu sesli odalar için **LiveKit** eklenir |
| Topluluklar | Mevcut `communities` (kullanıcı toplulukları) **ayrı kalır**; resmi şehir topluluğu governance katmanıdır |
| Heyet | Mevcut `heyet_cases` (ticari uyuşmazlık) **ayrı kalır** — Meclis ile karıştırılmaz |
| LiveKit secrets | Supabase Edge Function secrets'a deploy; repoya **asla** commit edilmez |
| Migration stili | Mevcut timestamp convention korunur (`20250829…`) — tek dev SQL dosyası yok |

---

## 1. CURRENT ARCHITECTURE

### 1.1 Stack

| Katman | Detay |
|--------|-------|
| Framework | Expo `~56.0.20`, React Native `0.85.3`, React `19.2.3` |
| Routing | `expo-router` file-based — `src/app/` ince route, `src/features/` ağır logic |
| TypeScript | `strict: true`, path alias `@/*` → `src/*` |
| State | Zustand (feature store'lar), React Context (Auth, Theme, Notifications, Calls) |
| Backend | Supabase (416 migration, ~928 RPC, 33 Edge Function) |
| UI | Custom design system — `src/constants/theme.ts`, `src/components/ui/*`, `useTheme()` |

### 1.2 Authentication

- **Provider:** `src/providers/AuthProvider.tsx` + `useAuth()`
- **Methods:** username/password, email OTP, Apple Sign-In, guest accounts, multi-account switch
- **Profile bootstrap:** `handle_new_user()` trigger → `profiles` row
- **Session policy:** ban/freeze/deletion enforcement, push token deactivation on sign-out
- **Guards:** `useRequireAuth`, `useRouteGuard`, `BootOrchestrator`

### 1.3 Profiles & Regions

**`profiles`** (`20250605000001_initial_schema.sql`):

```sql
id uuid PK → auth.users
username, full_name, avatar_url, bio
region_id text → regions(id)   -- onboarding / marketplace bölgesi
role user_role                 -- user | moderator | admin | super_admin
is_verified, is_premium, birth_date, ...
```

**`regions`** — mevcut şehir/bölge modeli:

```sql
id text PK          -- 'trabzon', 'rize', ...
name text
phase smallint      -- rollout fazı (1/2/3)
is_active boolean
created_at
```

18 Karadeniz ili seed'li (`20250608000001_regions_expansion.sql`). İstemci sabiti: `src/constants/regions.ts`.

**Önemli:** `profiles.region_id` kayıt/onboarding bölgesidir. GPS veya sosyal şehir aidiyeti ile aynı kavram değildir — spec'teki `city_memberships` ayrı tutulmalıdır.

### 1.4 Mevcut Şehirle İlgili Tablolar

| Tablo | Amaç | Governance ile ilişki |
|-------|------|----------------------|
| `regions` | Şehir listesi, faz rollout | **Genişletilecek ana entity** |
| `city_scores` / `city_score_votes` | Trafik/hizmet puanlama | Bağımsız — korunur |
| `daily_city_summaries` | AI günlük özet | Bağımsız — korunur |
| `communities` | Kullanıcı oluşturulan topluluklar | Farklı domain — karıştırma |
| `community_members` | Topluluk üyeliği | Farklı rol enum'u |
| `user_presence` | Online durumu | `active_count` türetimi için kullanılabilir |

### 1.5 Ses / Arama Altyapısı

| Bileşen | Durum |
|---------|-------|
| **Agora** | `react-native-agora@^4.5.4`, `src/features/calls/` |
| **`call_sessions`** | Yalnızca 1:1 audio/video (`caller_id`, `callee_id`) |
| **Token** | Edge Function `agora-token/index.ts` |
| **LiveKit** | **Yok** |
| **WebRTC / Daily** | **Yok** |
| **Voice rooms** | **Yok** |
| **Voice messages** | Async — `src/features/messaging/` (LiveKit ile ilgisiz) |

### 1.6 Bildirimler

- **Client:** `src/lib/notifications/*`, `NotificationProvider`
- **Push:** Expo Notifications + FCM/APNs via Edge Functions
- **Pipeline:** DB trigger → `notification_outbox` → `process-notification-outbox` / `send-push-notification`
- **Navigation:** `src/lib/notifications/navigation.ts` — event type + `deep_link` payload
- **Pending nav:** `pendingNavigation.ts` — boot tamamlanana kadar hedef saklanır
- **Prefs:** `src/features/notifications/services/notificationPrefs.ts`
- **Event types:** `src/constants/notifications.ts` (~80+ tip) — city event'leri **henüz yok**

### 1.7 Deep Linking

- **Scheme:** `vora://`
- **Universal links:** `https://vora.app/{p,r,v,u,m,s}`
- **Mevcut route'lar:** post, reel, VCTS verify, profile, marketplace, shop
- **Eksik:** `/city/*`, `/room/*`, `/council/*`, `/election/*`, `/proposal/*`
- **Share preview:** `supabase/functions/share-preview/index.ts` — OG meta + redirect

### 1.8 Moderation & Admin

- **Roles:** `src/constants/roles.ts` — `canModerate()`, `canAdmin()`
- **User safety:** `content_reports`, `user_blocks`, `user_mutes`, `user_warnings`
- **Report/block UI:** `ReportSheet`, `UserSafetySheet`, profile/chat entegrasyonu
- **Admin panel:** `src/features/admin/` (~350 dosya), `/admin/*` routes
- **Heyet:** `heyet_cases` — marketplace/ride/hotel uyuşmazlık çözümü (admin açar) — **Meclis değil**

### 1.9 Feature Flags

- **Table:** `app_feature_flags` — boolean `is_button_visible` per feature
- **Provider:** `FeatureFlagsProvider` + realtime subscription
- **Admin UI:** `/admin/features`
- **Per-feature:** `src/features/*/featureFlags.ts`
- **Limitation:** Global boolean only — per-city rollout için `app_system_config` veya yeni JSON flag gerekir

### 1.10 Realtime

Supabase Realtime kullanılıyor: `call_sessions`, feature flags, messaging, vb.  
City governance için seçici subscription — diplomacy status, room state, election results, proposal support count.

### 1.11 Analytics

Dedicated product analytics SDK **yok**. Admin istatistikleri ve feature-level metrikler var. City viral loop için yeni event logging katmanı gerekir (`governance_audit_logs` + istemci event helper).

---

## 2. EXISTING REUSABLE SYSTEMS

### Doğrudan yeniden kullanılabilir

| Sistem | Nasıl kullanılır |
|--------|------------------|
| `regions` + `REGIONS` constant | Şehir entity'si — kolon genişletmesi |
| `profiles` | Kullanıcı kimliği, avatar, username, verified status |
| `user_badges` / `BADGE_CONFIG` | Lider rozeti için yeni `city_leader` badge tipi |
| `user_presence` | Şehir `active_count` aggregate kaynağı |
| `app_system_config` | Election süresi, meclis boyutu, destek eşiği, rate limit config |
| `app_feature_flags` | `city_system_enabled`, `city_elections_enabled`, vb. |
| `notification_outbox` + `_shared/notifications.ts` | City event push pipeline |
| `register_push_token` RPC | Değişiklik yok |
| `content_reports` + block system | Voice room raporlama |
| `is_admin()` / `is_moderator()` | RLS helper'ları |
| `governance_audit_logs` pattern | Benzer audit tablo (yeni) |
| Theme/UI (`GlassCard`, `Button`, `useTheme`) | CityScreen modern UI |
| `app-share` utilities | "Vora'ya Gel" native share |
| `pendingNavigation` | Auth sonrası deep link hedefi |
| Agora 1:1 calls | Lider hattı private call (Phase 3) — LiveKit'e geçiş opsiyonel |

### Kısmen yeniden kullanılabilir (dikkatli)

| Sistem | Not |
|--------|-----|
| `profiles.region_id` | Hızlı erişim için `primary_city_id` veya membership'ten türet — mevcut kolonu governance role ile karıştırma |
| `communities` | Şehir feed'i için opsiyonel resmi community auto-link — zorunlu değil |
| `agenda` feature | Keşfet sekmesi trending — "Vora Gündem" ayrı feature olmalı |
| `leaderboard` | Puan sistemi — city leader badge ile karıştırma |

### Oluşturulmamalı (duplicate)

- `users` tablosu
- `cities` tablosu (`regions` yeterli)
- İkinci notification pipeline
- İkinci moderation sistemi
- Agora'yı kaldırıp 1:1 aramayı LiveKit'e taşımak (Phase 1'de gerek yok)

---

## 3. DATABASE CHANGES

### 3.1 `regions` Genişletmesi (cities yerine)

Mevcut `regions` tablosuna eklenecek kolonlar:

```sql
-- 20250829000001_city_regions_extend.sql
alter table public.regions add column if not exists slug text;
alter table public.regions add column if not exists country_code text not null default 'TR';
alter table public.regions add column if not exists region_label text;  -- 'Karadeniz' vb.
alter table public.regions add column if not exists latitude numeric;
alter table public.regions add column if not exists longitude numeric;
alter table public.regions add column if not exists cover_image_url text;
alter table public.regions add column if not exists icon_url text;
alter table public.regions add column if not exists description text;
alter table public.regions add column if not exists member_count integer not null default 0;
alter table public.regions add column if not exists active_count integer not null default 0;
alter table public.regions add column if not exists governance_status text not null default 'active';
-- governance_status: active | passive | coming_soon
```

`slug` = `id` (zaten unique text PK). UUID gerekmiyor — mevcut FK'lar (`profiles.region_id`, `communities.region_id`) korunur.

### 3.2 Yeni Tablolar (spec → region_id adaptasyonu)

Tüm spec'teki `city_id` referansları → `region_id text references regions(id)`.

| Migration dosyası | Tablolar |
|-------------------|----------|
| `20250829000002_city_membership.sql` | `city_memberships`, `profiles.primary_city_id` (nullable, FK regions) |
| `20250829000003_city_elections.sql` | `city_elections`, `city_election_candidates`, `city_election_votes` |
| `20250829000004_city_leadership.sql` | `city_leadership_terms`, `city_council_terms` |
| `20250829000005_city_council.sql` | `city_council_proposals`, `city_proposal_supports`, `city_council_sessions`, `city_council_decisions`, `city_council_decision_votes` |
| `20250829000006_city_diplomacy.sql` | `city_diplomacy_requests`, `city_agreements` |
| `20250829000007_city_voice_rooms.sql` | `city_voice_rooms`, `city_voice_room_participants`, `city_voice_speaker_requests` |
| `20250829000008_city_history.sql` | `city_history_events`, `governance_audit_logs` |
| `20250829000009_city_config.sql` | `app_system_config` seed: `city_governance` JSON |
| `20250829000010_city_rls.sql` | Tüm yeni tablolar RLS + policies |
| `20250829000011_city_rpc.sql` | Güvenli RPC fonksiyonları |
| `20250829000012_city_notifications.sql` | Notify trigger'ları, outbox entegrasyonu |

**Prefix `city_`:** Governance domain'i mevcut `city_scores`'dan ayırmak için tablo adlarında `city_` prefix kullanılır.

### 3.3 Enum'lar

```sql
city_membership_role: citizen | council_member | deputy | leader
city_membership_status: active | suspended | left
city_election_type: leader | council
city_election_status: scheduled | nomination | voting | counting | completed | cancelled
city_diplomacy_request_type: leader_call | joint_room | joint_council | cooperation | challenge
city_diplomacy_status: pending | accepted | rejected | cancelled | expired
city_voice_room_type: city | joint_city | leader_private | city_council | joint_council | regional_council
city_voice_participant_role: listener | speaker | city_leader | council_member | moderator | admin
city_history_event_type: leader_elected | council_elected | agreement_signed | joint_room | ...
```

### 3.4 Config (`app_system_config`)

```json
{
  "key": "city_governance",
  "value": {
    "leader_term_days": 30,
    "council_size": 6,
    "proposal_support_threshold": 50,
    "leader_call_rate_limit_per_hour": 3,
    "election_min_account_age_days": 7,
    "election_min_membership_days": 3,
    "enabled_region_ids": ["trabzon", "rize"],
    "feature_flags": {
      "elections": true,
      "council": true,
      "diplomacy": true,
      "joint_voice_rooms": true
    }
  }
}
```

Admin panelden düzenlenebilir — hard-code yok.

### 3.5 Counter Sync

- `regions.member_count` ← `city_memberships` trigger (status=active)
- `regions.active_count` ← periodic RPC veya `user_presence` + membership join (region bazlı online)

---

## 4. SECURITY / RLS PLAN

### 4.1 Temel İlkeler

1. Client'tan gelen `role`, `leader`, `city_id` değerlerine **güvenilmez**
2. Liderlik/meclis ataması yalnızca `finalize_election()` RPC ile
3. Oy verme yalnızca `cast_city_election_vote()` RPC ile
4. Diplomasi yalnızca aktif lider RPC'leri ile
5. Voice room role değişiklikleri server-side doğrulanır

### 4.2 RLS Policy Özeti

| Tablo | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `city_memberships` | Kendi + aynı şehir üyeleri public read | RPC `join_city()` only | RPC only (role değişmez) | RPC `leave_city()` |
| `city_elections` | Authenticated, aktif şehir | Admin/system | RPC state machine | Admin |
| `city_election_votes` | Kendi oyu | RPC only | — | — |
| `city_leadership_terms` | Public read | RPC only | RPC only | — |
| `city_diplomacy_requests` | İlgili liderler + şehir üyeleri summary | RPC (lider) | RPC (hedef lider) | RPC (iptal) |
| `city_voice_rooms` | Katılımcılar + public listener (room type'a göre) | RPC | RPC (lider/admin) | RPC |
| `governance_audit_logs` | Admin read | SECURITY DEFINER insert | — | — |

### 4.3 Election Eligibility (server-side only)

Internal function `_city_election_eligible(user_id, region_id)`:

- `auth.uid()` authenticated
- `city_memberships.status = 'active'`
- `profiles.is_verified` or email/phone confirmed (mevcut alanlar)
- Account age ≥ config
- Membership age ≥ config
- Not suspended/banned
- Fraud signals (future: trust score threshold)

Client'a formül gönderilmez — RPC boolean error code döner.

### 4.4 Idempotency

- `cast_city_election_vote`: UNIQUE(election_id, voter_user_id)
- `accept_joint_room`: UNIQUE constraint + status check
- `city_history_events`: reference_id + event_type unique where applicable
- Push: outbox dedupe key (`city_event:{type}:{target_id}:{user_id}`)

### 4.5 SECURITY DEFINER RPC'ler

```
join_city(region_id)
leave_city(region_id)
cast_city_election_vote(election_id, candidate_user_id)
finalize_city_election(election_id)
send_diplomacy_request(...)
respond_diplomacy_request(...)
propose_joint_room(...)
accept_joint_room(...)
create_city_voice_room(...)
join_city_voice_room(...)
request_speaker(...)
approve_speaker_request(...)
support_city_proposal(proposal_id)
create_council_decision(...)
cast_council_decision_vote(...)
finalize_council_decision(...)
record_governance_audit(...)
```

---

## 5. VOICE ROOM INTEGRATION PLAN

### 5.1 Mevcut Durum

- Agora: 1:1 calls only — **korunur**
- LiveKit: **yeni** — multi-party voice rooms için

### 5.2 Mimari

```
src/features/city-voice/
  services/
    VoiceRoomService.ts      ← provider-agnostic interface
    livekitRoomEngine.ts     ← LiveKit RN SDK
    livekitToken.ts          ← edge function client
  hooks/
    useCityVoiceRoom.ts
  components/
    CityVoiceRoomScreen.tsx
    JointCityRoomScreen.tsx
    LeaderLineScreen.tsx
  constants.ts
  types.ts
  index.ts
```

**Edge Function:** `supabase/functions/livekit-token/index.ts`

Secrets (Supabase CLI — repoya yazılmaz):

```
LIVEKIT_URL=wss://vorea-ydijne5g.livekit.cloud
LIVEKIT_API_KEY=***
LIVEKIT_API_SECRET=***
```

Deploy komutu (implementasyon aşamasında):

```bash
supabase secrets set LIVEKIT_URL=... LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...
supabase functions deploy livekit-token
```

### 5.3 Provider Stratejisi

| Senaryo | Provider | Gerekçe |
|---------|----------|---------|
| Lider hattı (1:1 private) | Agora (mevcut) veya LiveKit | Phase 3'te Agora reuse — daha az risk |
| Şehir odası | LiveKit | Multi-participant |
| Ortak şehir odası | LiveKit | Multi-city, speaker management |
| Meclis oturumu | LiveKit | Structured phases + voice |
| Ortak Meclis | LiveKit | Multi-city council |

Phase 4'te `@livekit/react-native` eklenir. Agora dependency **kaldırılmaz**.

### 5.4 Domain Model

**`city_voice_rooms`:**

```
id, livekit_room_name, room_type, region_ids[], status,
diplomacy_request_id nullable, council_session_id nullable,
started_by, started_at, ended_at, listener_count, metadata jsonb
```

**`city_voice_room_participants`:**

```
room_id, user_id, region_id, role, is_muted, joined_at, left_at
```

Token generation server-side — participant role DB'den doğrulanır, LiveKit JWT claims'e yansır.

### 5.5 UI Provider Isolation

LiveKit/Agora import'ları yalnızca `services/*Engine.ts` dosyalarında. Screen'ler `VoiceRoomService` interface kullanır.

---

## 6. NOTIFICATION PLAN

### 6.1 Yeni Event Types

`src/constants/notifications.ts` ve DB enum'a eklenecek:

```
city_room_started
city_join_started
diplomacy_request_received
leader_call_received
joint_room_proposed
joint_room_started
council_session_started
joint_council_requested
joint_council_started
city_election_started
city_election_ending
city_election_completed
city_proposal_qualified
council_decision_voting_started
council_decision_approved
city_agreement_proposed
city_agreement_approved
city_leader_call
```

### 6.2 Event Service

```
src/features/city-governance/services/cityNotificationEvents.ts
```

Pattern: domain action → `emit_city_notification(event_type, payload)` → DB function → outbox.

Push metinleri **template tablosu** veya `app_system_config.city_notification_templates` — kod içi hard-code yok.

### 6.3 Rate Limiting

Server function `_city_leader_can_broadcast(leader_user_id, region_id, event_type)`:

- Son 1 saatte max N toplu çağrı (config)
- Duplicate event dedupe (same room + same user + 5 min window)
- User notification prefs check (`notificationPrefs`)

### 6.4 Deep Link Payload

```json
{
  "event_type": "joint_room_started",
  "deep_link": "/room/{roomId}",
  "region_id": "trabzon",
  "room_id": "uuid",
  "title": "TRABZON × RİZE",
  "body": "Liderler anlaştı. İki şehir birleşiyor."
}
```

### 6.5 Navigation Handler

`src/lib/notifications/navigation.ts` — yeni case'ler:

- `city_*` → `/city/[slug]`
- `joint_room_*` → `/room/[id]`
- `council_*` → `/council/[id]`
- `city_election_*` → `/election/[id]`

---

## 7. NAVIGATION / SCREEN PLAN

### 7.1 Yeni Routes (`src/app/`)

| Route | Screen | Phase |
|-------|--------|-------|
| `/city/[slug]` | `CityScreen` | 1 |
| `/city/[slug]/leader` | `CityLeaderPanelScreen` | 3 |
| `/city/[slug]/council` | `CityCouncilScreen` | 5 |
| `/city/[slug]/election/[id]` | `CityElectionScreen` | 2 |
| `/city/[slug]/diplomacy` | `CityDiplomacyScreen` | 3 |
| `/city/[slug]/history` | `CityHistoryScreen` | 6 |
| `/room/[id]` | `JointCityRoomScreen` | 4 |
| `/leader-line/[id]` | `LeaderLineScreen` | 3 |
| `/council/[id]` | `JointCouncilScreen` | 5–6 |
| `/election/[id]` | Election detail (deep link) | 2 |
| `/proposal/[id]` | Proposal detail | 5 |

### 7.2 Deep Link Genişletmesi

**`app.config.ts`** intentFilters + associatedDomains:

```
/city, /room, /council, /election, /proposal
```

**`share-preview` Edge Function:** OG meta for city/room share URLs.

### 7.3 Tab / Entry Points

- Keşfet veya yeni "Şehir" entry (feature flag gated)
- Profile'da "Ana Şehrim" chip → CityScreen
- Feed header optional city pill (Phase 6 — Vora Gündem)

### 7.4 Feature Module

```
src/features/city-governance/
  components/
    CityScreen.tsx
    CityLeaderPanelScreen.tsx
    CityCouncilScreen.tsx
    CityElectionScreen.tsx
    CityDiplomacyScreen.tsx
    CityHistoryScreen.tsx
    LeaderLineScreen.tsx
    JointCityRoomScreen.tsx
    JointCouncilScreen.tsx
    CityLeaderBadge.tsx
    CityMembershipSheet.tsx
    ... (cards, empty states, animations)
  services/
    cityMembership.ts
    cityElections.ts
    cityDiplomacy.ts
    cityCouncil.ts
    cityHistory.ts
    cityNotificationEvents.ts
  hooks/
    useCityMembership.ts
    useCityElection.ts
    useCityLeader.ts
    useCityRealtime.ts
  constants.ts
  types.ts
  featureFlags.ts
  index.ts
```

Voice ayrı feature (izolasyon kuralı):

```
src/features/city-voice/
```

---

## 8. FILES TO CREATE

### Database Migrations (12 dosya)

```
supabase/migrations/20250829000001_city_regions_extend.sql
supabase/migrations/20250829000002_city_membership.sql
supabase/migrations/20250829000003_city_elections.sql
supabase/migrations/20250829000004_city_leadership.sql
supabase/migrations/20250829000005_city_council.sql
supabase/migrations/20250829000006_city_diplomacy.sql
supabase/migrations/20250829000007_city_voice_rooms.sql
supabase/migrations/20250829000008_city_history.sql
supabase/migrations/20250829000009_city_config.sql
supabase/migrations/20250829000010_city_rls.sql
supabase/migrations/20250829000011_city_rpc.sql
supabase/migrations/20250829000012_city_notifications.sql
```

### Edge Functions

```
supabase/functions/livekit-token/index.ts
supabase/functions/livekit-token/deno.json (if needed)
```

### Feature — Governance

```
src/features/city-governance/**  (see §7.4)
src/features/city-governance/featureFlags.ts
```

### Feature — Voice

```
src/features/city-voice/**  (see §5.2)
```

### Routes

```
src/app/city/[slug]/index.tsx
src/app/city/[slug]/_layout.tsx
src/app/city/[slug]/leader.tsx
src/app/city/[slug]/council.tsx
src/app/city/[slug]/diplomacy.tsx
src/app/city/[slug]/history.tsx
src/app/city/[slug]/election/[id].tsx
src/app/room/[id].tsx
src/app/leader-line/[id].tsx
src/app/council/[id].tsx
src/app/election/[id].tsx
src/app/proposal/[id].tsx
```

### Docs

```
docs/ENVIRONMENT.md  — LiveKit public env note (URL only if needed client-side)
.env.example         — EXPO_PUBLIC_LIVEKIT_URL placeholder (optional)
```

---

## 9. FILES TO MODIFY

| Dosya | Değişiklik |
|-------|------------|
| `app.config.ts` | Deep link pathPrefix'ler, LiveKit plugin if needed |
| `src/config/env.ts` | Optional `livekit.url` public env |
| `docs/ENVIRONMENT.md` | LiveKit secrets documentation |
| `src/constants/notifications.ts` | City event types |
| `src/lib/notifications/navigation.ts` | City route handlers |
| `supabase/functions/share-preview/index.ts` | City/room OG previews |
| `src/features/profile/constants.ts` | `city_leader` badge config |
| `src/features/profile/types.ts` | BadgeType union |
| `src/features/feature-flags/constants.ts` | City feature registry |
| `src/features/feature-flags/registry/subFeatures.ts` | Sub-feature flags |
| `src/app/_layout.tsx` | CityVoiceProvider if needed |
| `src/providers/NotificationProvider.tsx` | City event category (optional) |
| `src/types/database.ts` | Regenerate after migrations |
| `package.json` | `@livekit/react-native` (Phase 4) |

**Dokunulmayacak:**

- `src/features/calls/*` (Agora 1:1)
- `src/providers/AuthProvider.tsx` (breaking change yok)
- Mevcut RLS policies (yalnızca additive)

---

## 10. RISKS

| Risk | Etki | Mitigasyon |
|------|------|------------|
| `regions` vs `cities` isim karmaşası | Dev confusion | Dokümantasyon + `city_*` table prefix, FK `region_id` |
| `profiles.region_id` vs membership | Yanlış aidiyet | Ayrı `primary_city_id` + membership table |
| Agora + LiveKit dual provider | Bundle size, complexity | Strict service abstraction, phase rollout |
| LiveKit RN SDK Expo 56 uyumu | Build failure | Phase 4'te EAS test build önce |
| Secret exposure (API keys in chat) | Security breach | **Rotate LiveKit keys**, secrets via Supabase CLI only |
| Election fraud | Trust erosion | Server-side eligibility, rate limits, audit log |
| Push spam (Vora'ya Gel) | User churn | Rate limit + dedupe + prefs |
| Empty state at ~100 users | Dead product feel | Spec empty states — sahte aktivite yok |
| 416 existing migrations | Merge conflict | Small incremental migrations, tek feature başına dosya |
| RLS misconfiguration | Privilege escalation | Dedicated `city_rls` migration + security review |
| Realtime subscription leak | Performance | `useCityRealtime` cleanup pattern |
| Scope creep (Phase 6+ before V1 scenario) | Never ship | Strict phase gates — spec §61 scenario first |

---

## 11. IMPLEMENTATION PHASES

### PHASE 1 — Foundation (onay bekliyor)

- [ ] `regions` extend migration
- [ ] `city_memberships` + `profiles.primary_city_id`
- [ ] RLS policies (membership)
- [ ] RPC: `join_city`, `leave_city`
- [ ] `src/features/city-governance/` scaffold
- [ ] `CityScreen` (modern UI, empty states)
- [ ] Leader role display (read-only — manual seed veya admin assign for testing)
- [ ] `city_leader` profile badge component
- [ ] Feature flags: `city_system_enabled`
- [ ] Seed Karadeniz phase-1 cities governance_status

**Phase 1 çıktısı:** Kullanıcı Trabzon'a katılır, CityScreen görür, lider rozeti görünür.

### PHASE 2 — Elections

- [ ] Election tables + RLS
- [ ] RPC: nominate, cast vote, finalize
- [ ] `CityElectionScreen`, candidate cards
- [ ] Leadership terms + history seed
- [ ] Eligibility checks
- [ ] Notification: election started/completed

### PHASE 3 — Leader Dashboard & Diplomacy

- [ ] `CityLeaderPanelScreen`
- [ ] Diplomacy requests table + RPC
- [ ] Leader line (Agora 1:1 reuse)
- [ ] Realtime diplomacy status
- [ ] Push: diplomacy_request_received

### PHASE 4 — Joint Voice Rooms (LiveKit)

- [ ] `@livekit/react-native` integration
- [ ] `livekit-token` Edge Function
- [ ] Supabase secrets deploy
- [ ] `city_voice_rooms` tables
- [ ] `JointCityRoomScreen`
- [ ] Speaker request/management
- [ ] "Vora'ya Gel" share + deep links
- [ ] Push: joint_room_started
- [ ] **V1 success scenario steps 7–24**

### PHASE 5 — Council

- [ ] Council members (election)
- [ ] Proposals + support
- [ ] Council sessions + decisions + voting
- [ ] `CityCouncilScreen`

### PHASE 6 — Joint Councils & History

- [ ] Joint council sessions
- [ ] City agreements
- [ ] `city_history_events`
- [ ] Vora Gündem feed

### PHASE 7 — Future

- [ ] Regional council (Karadeniz Meclisi)
- [ ] City network visualization
- [ ] Advanced analytics
- [ ] Advanced anti-fraud

---

## 12. LIVEKIT DEPLOYMENT NOTU

Kullanıcı tarafından sağlanan LiveKit credentials implementasyon aşamasında Supabase secrets'a deploy edilecek:

```bash
supabase secrets set \
  LIVEKIT_URL="wss://vorea-ydijne5g.livekit.cloud" \
  LIVEKIT_API_KEY="..." \
  LIVEKIT_API_SECRET="..."
```

**Güvenlik uyarısı:** API secret bu sohbette paylaşıldı. Production öncesi LiveKit dashboard'dan key rotation önerilir. Secret'lar repoya, `.env` commit'ine veya istemci koduna **konmaz**.

`docs/ENVIRONMENT.md` Edge Function secrets tablosuna `LIVEKIT_*` satırları eklenecek (Phase 4).

---

## 13. V1 BAŞARI SENARYOSU (Spec §61)

Phase 1–4 tamamlandığında uçtan uca test edilecek akış:

1. Trabzon'a katıl → 2. Seçim gör → 3. Oy ver → 4. Server finalize → 5. Lider ol → 6. Leader Dashboard → 7–8. Rize liderine talep → 9–10. Kabul → 11. Lider hattı → 12–13. Şehirleri birleştir → 14. Tek ortak oda → 15–17. Push + deep link → 18–21. Speaker management → 22–24. Share + yeni kullanıcı

**Phase 5+'ye geçmeden önce bu senaryo hatasız çalışmalıdır.**

---

*PHASE 1 implementation için hazırım.*
