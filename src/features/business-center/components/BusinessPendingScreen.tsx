import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { BUSINESS_ACCENT, BUSINESS_ROUTES } from '@/features/business-center/constants';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function BusinessPendingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchBusinessAccountByOwner(user.id).then((biz) => {
      setLoading(false);
      if (biz?.registrationStatus === 'approved') {
        router.replace(BUSINESS_ROUTES.account as never);
      }
    });
  }, [user?.id]);

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={BUSINESS_ACCENT} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AuthHeader title="Onay Bekleniyor" subtitle="Kurumsal hesap başvurunuz inceleniyor" />

        <GlassCard style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: `${BUSINESS_ACCENT}18` }]}>
            <Ionicons name="hourglass-outline" size={32} color={BUSINESS_ACCENT} />
          </View>
          <Text variant="label">Belgeleriniz kontrol ediliyor</Text>
          <Text secondary>
            İşletme başvurunuz yönetici ekibimiz tarafından inceleniyor. Onaylandığında mağaza kurulumu,
            ürün satışı ve otel rezervasyonu özelliklerini açabileceksiniz.
          </Text>
          <Text secondary variant="caption" style={{ marginTop: spacing.sm }}>
            Ortalama inceleme süresi 1–3 iş günüdür. Onay sonrası bildirim alacaksınız.
          </Text>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { gap: spacing.md, alignItems: 'flex-start' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
