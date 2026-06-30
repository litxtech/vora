# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Özellik izolasyonu

Her özellik kendi dosyasında / klasöründe yaşar. Bir özellikteki kod hatası diğerlerini etkilememeli.

- Her özellik `src/features/<özellik>/` altında: `components/`, `services/`, `constants.ts`, `types.ts`
- Route dosyaları (`src/app/`) ince tutulur — yalnızca ilgili feature screen'i import eder
- Birden fazla özelliği birleştiren monolit dosyalar yazma (ör. `sections_41_56.sql` gibi)
- Yeni Supabase migration'ları tek özellik başına bir dosya (ör. `vcts_foundation.sql` modeli)
- Merkez tanımları ilgili feature'ın `constants.ts` dosyasında (`TRAFFIC_CENTER_DEF` vb.)
- Harita detay fetcher'ları `map/services/detail/` altında özellik başına ayrı dosya
- Özellikler arası import yalnızca public API üzerinden; derin path import'tan kaçın
