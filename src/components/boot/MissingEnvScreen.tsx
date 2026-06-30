import { StyleSheet, Text, View } from 'react-native';

const BG = '#0A0E14';
const TEXT = '#F4F7FB';
const MUTED = '#9AA8BC';
const ACCENT = '#EF5350';

export function MissingEnvScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Yapılandırma eksik</Text>
      <Text style={styles.body}>
        Supabase bağlantı bilgileri bulunamadı. Geliştirme için `.env` dosyasını, EAS build için
        development ortam değişkenlerini tanımlayın.
      </Text>
      <Text style={styles.hint}>EXPO_PUBLIC_SUPABASE_URL{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  hint: {
    color: TEXT,
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 8,
  },
});
