# Story (Hikâye) Özelliği — Plan

> **Durum:** Planlama aşaması — henüz uygulanmadı.  
> Bu dosyaya ileride ekleme yapılacak; yeni kararlar buraya işlenir.

Son güncelleme: 2025-06-19

---

## Vizyon

Story, Vora'da **24 saatlik anlık paylaşım** katmanıdır. Kalıcı akış gönderisi veya reel değildir.

**Vora farkı — “şehrin anlık hikâyesi”:**
- İl/ilçe etiketi (bölgesel yapı ile uyumlu)
- Acil / trafik / etkinlik gibi hızlı kategori sticker'ları
- VCTS güven rozeti (haber story'sinde güven sinyali)
- İşletme hesapları için “bugün açık / kampanya” story'si

---

## Nerede görünmeli?

| Yer | Açıklama |
|-----|----------|
| Akış üstü | Yatay story halkaları (takip + yakın bölge) |
| Profil | Avatar halkası + “Hikayeler” satırı |
| `/capture` | Üst mod seçici: **Hikaye \| Gönderi \| Reels** |
| Ayrı tab | **Yok** — tab bar kalabalık |

```
Akış üstü (StoryRingBar)
    → Tam ekran viewer

/capture → mod seçici
    → Story modu → hafif düzenleme → yayınla
```

---

## Gönderi vs Story vs Reels

| | Gönderi | Story | Reels |
|---|--------|-------|-------|
| Ömür | Kalıcı | 24 saat | Kalıcı |
| Akış | Evet | Hayır | Hayır (reels sekmesi) |
| Etkileşim | Yorum, beğeni | DM / reaksiyon | Yorum, beğeni |
| Keşif | Kategori / il | Takip + yakın bölge | Algoritma |
| Düzenleme | Compose | Hafif (sticker, metin) | VORA Studio |

**Kural:** Story'yi post tablosuna `is_story` ile eklemeyin — reels gibi ayrı model.

---

## Veri modeli (taslak)

### Tablolar

| Tablo | Amaç |
|-------|------|
| `stories` | Kullanıcının 24 saatlik paketi (author, expires_at, audience) |
| `story_items` | Paket içindeki slaytlar (media, duration, order, stickers JSON) |
| `story_views` | Kim izledi (sadece sahibi görür) |
| `story_reactions` | Hızlı emoji / DM tetikleyici (opsiyonel, Faz 2+) |

### Önemli alanlar

- `expires_at` — oluşturulduktan 24 saat sonra
- `audience` — `public | followers | close_friends` (compose audience modeli ile uyumlu)
- `region_id`, `district` — yerel keşif
- `status` — `pending_review | published | removed`
- `media_type` — `image | video`
- `duration_sec` — video (MVP max ~30 sn)

### Arka plan

- Cron / scheduled job: süresi dolanları `archived`
- Storage temizliği ayrı iş (maliyet kontrolü)

Migration: `supabase/migrations/stories_foundation.sql` (tek özellik, tek dosya)

---

## Oluşturma akışı

1. `/capture` — Story modu seçili
2. Fotoğraf veya kısa video çek
3. Hafif düzenleme (metin, sticker, konum) — **VORA Studio zorunlu değil**
4. Yayınla → `story_items`

**MVP'de studio'ya sokma.** Uzun video → reel'e yönlendir.

Mevcut parçaları yeniden kullan:
- `/capture` — çekim
- Post upload pipeline — medya yükleme
- `audience` — gizlilik
- Push outbox — bildirim (dikkatli)
- Admin content / reports — moderasyon

---

## İzleme deneyimi

Tam ekran viewer (`StoryViewerScreen`):

- Sağ/sol tap → önceki/sonraki slayt
- Sol kenar swipe → önceki kişi
- Sağ kenar swipe → sonraki kişi
- Üstte progress bar (slayt başına segment)
- Alt: mesaj, paylaş, şikâyet

Performans:
- `expo-video` + sonraki slayt prefetch
- Thumbnail önce, video lazy load
- `story_rings` API hafif (sadece “kimde yeni story var”)

---

## Story sıralama (öneri)

1. Takip ettiklerin (izlenmemiş önce)
2. Yakın bölge (aynı il/ilçe, opt-in)
3. Öne çıkan / işletme (yerel vitrin, reklam değil)
4. Kendi story'n (başta “+” halkası)

---

## Moderasyon ve güven

- Yayın öncesi AI tarama (`ai-moderation` ile uyumlu)
- Şüpheli → `pending_review`, sadece sahibi görür
- Rapor → anında kaldır + admin kuyruğu
- Haber/trafik sticker → VCTS / doğrulanmış hesap rozeti

Push:
- “X yeni hikaye paylaştı” spam olmasın
- Close friends veya günlük özet (Faz 2+)

---

## Teknik mimari

```
src/features/stories/
  PLAN.md                 ← bu dosya
  components/
    StoryRingBar.tsx      # Akış üstü
    StoryViewerScreen.tsx # Tam ekran izleyici
    StoryCaptureOverlay.tsx
  services/
    publishStory.ts
    fetchStoryRings.ts
    recordStoryView.ts
  constants.ts
  types.ts

src/app/stories/
  [userId].tsx            # Viewer route
  create.tsx              # İnce route → feature screen
```

Feature flag: `stories` → `src/features/feature-flags/constants.ts`

---

## Aşamalı rollout

### Faz 1 — MVP
- [ ] Story halkaları + tam ekran viewer
- [ ] Fotoğraf + 30 sn video
- [ ] Takip ettiklerin + kendi hikayen
- [ ] 24 saat TTL
- [ ] Basit metin sticker + konum
- [ ] DB migration + RLS
- [ ] `/capture` mod seçici (Hikaye)

### Faz 2
- [ ] Close friends
- [ ] İzleyenler listesi
- [ ] Story'ye DM yanıt (mevcut chat'e düşer)
- [ ] Profil avatar halkası

### Faz 3
- [ ] Anket / soru sticker
- [ ] İşletme story şablonları
- [ ] Bölgesel “bugün Karadeniz'de” keşif şeridi
- [ ] Arşiv + premium öne çıkarma

---

## Yapılmaması gerekenler

1. Story'yi feed post'u gibi kaydetmek
2. Her story'yi reel'e çevirmek
3. VORA Studio'yu story yayın yoluna zorunlu kılmak
4. Başta herkese push atmak
5. Tab bar'a ayrı Story sekmesi eklemek

---

## Notlar / ileride eklenecekler

<!-- Yeni kararlar ve fikirler buraya eklenir -->
