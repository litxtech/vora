import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { AI_MUSIC_PACKAGES, type AiMusicPackageId, formatAiMusicAllowance } from '@/features/ai-music/constants';
import { confirmAiMusicCheckout, fetchAiMusicBalance, buyAiMusicPackage } from '@/features/ai-music/services/aiMusicMinutes';
import type { AiMusicBalance } from '@/features/ai-music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AiMusicPackagesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ session_id?: string; checkout?: string }>();
  const [balance, setBalance] = useState<AiMusicBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<AiMusicPackageId | null>(null);

  const load = useCallback(async () => {
    const next = await fetchAiMusicBalance();
    setBalance(next);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const sessionId = typeof params.session_id === 'string' ? params.session_id : '';
      void (async () => {
        if (sessionId.startsWith('cs_')) {
          const confirmed = await confirmAiMusicCheckout(sessionId);
          if (!active) return;
          if (confirmed.error) Alert.alert('Ödeme', confirmed.error);
          else if (confirmed.credited && confirmed.balance) setBalance(confirmed.balance);
        }
        if (!active) return;
        await load();
      })();
      return () => {
        active = false;
      };
    }, [load, params.session_id]),
  );

  const buy = async (packageId: AiMusicPackageId) => {
    if (buying) return;
    setBuying(packageId);
    const result = await buyAiMusicPackage(packageId);
    setBuying(null);
    if (result.error) {
      Alert.alert('Ödeme', result.error);
      return;
    }
    if (result.balance) setBalance(result.balance);
    else await load();
    if (result.credited) {
      Alert.alert('Dakikalar eklendi', 'Paket hesabına tanımlandı. Yeni parça üretebilirsin.', [
        { text: 'Parça üret', onPress: () => router.replace('/sounds/ai/new' as Href) },
        { text: 'Tamam', style: 'cancel' },
      ]);
    }
  };

  const available = balance?.availableSec ?? 0;

  return (
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <ScreenBackButton
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/sounds/ai' as Href);
            }}
          />
          <Text variant="label">Müzik paketleri</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}>
          <LinearGradient colors={['#0B3A4A', '#0E7490', '#14B8A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroKicker}>Vora Müzik</Text>
            <Text style={styles.heroTitle}>
              {loading ? 'Hak okunuyor' : available > 0 ? `${formatAiMusicAllowance(available)} kaldı` : 'Ücretsiz hak bitti'}
            </Text>
            <Text style={styles.heroBody}>
              Her hesaba 10 dakika ücretsiz. Dakika, parçayı onaylayınca düşer. Paket ödemesi tamamlanınca hak hemen yazılır.
            </Text>
          </LinearGradient>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
          ) : (
            AI_MUSIC_PACKAGES.map((pack) => {
              const busy = buying === pack.id;
              return (
                <Pressable
                  key={pack.id}
                  disabled={buying != null}
                  onPress={() => void buy(pack.id)}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: buying && !busy ? 0.55 : 1 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{pack.label}</Text>
                    <Text secondary variant="caption">Üretim hakkı · hesaba anında eklenir</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.price}>{pack.priceTry} TL</Text>
                    {busy ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="card-outline" size={18} color={colors.accent} />}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  hero: { borderRadius: radius.lg, padding: spacing.md, gap: 4, marginBottom: spacing.md },
  heroKicker: { color: '#CCFBF1', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  heroTitle: { color: '#F8FAFC', fontSize: 22, fontWeight: '800' },
  heroBody: { color: '#E6FFFA', lineHeight: 18, fontSize: 13 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  priceCol: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 16, fontWeight: '800' },
});
