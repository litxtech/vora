# Yerel Android Maven deposu

JitPack (Cloudflare 403) yüzünden EAS/Android CI ortamında indirilemeyen native bağımlılıklar burada sabitlenir:

- `com.github.Dimezis:BlurView:version-3.1.0` (expo-blur)
- `com.github.kaushik-naik:TAndroidLame:277c2ab4b0` (react-native-compressor)

`app.config.ts` içindeki `expo-build-properties.extraMavenRepos` bu klasörü kullanır.

Kaynak kodu `/vendor/_src/` altında tutulur (gitignore). AAR yeniden üretmek için o projelerde `./gradlew :library:assembleRelease` (BlurView) ve `./gradlew :androidlame:assembleRelease` (TAndroidLame) çalıştırılıp çıktılar buraya kopyalanır.
