import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import {
  BUSINESS_ACCENT,
  BUSINESS_ROUTES,
  commerceModeShowsProducts,
  shopAccentColor,
} from '@/features/business-center/constants';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import type { BusinessAccountRecord } from '@/features/business-center/types';
import { CreateListingScreen } from '@/features/marketplace/components/CreateListingScreen';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function BusinessCreateProductScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessAccountRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    void fetchBusinessAccountByOwner(user.id).then((biz) => {
      setBusiness(biz);
      setLoading(false);
    });
  }, [user?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={BUSINESS_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (!business) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard style={styles.card}>
            <Ionicons name="storefront-outline" size={28} color={colors.textMuted} />
            <Text variant="label">İşletme hesabı bulunamadı</Text>
            <Text secondary variant="caption" style={styles.centerText}>
              Ürün eklemek için önce kurumsal hesabınızı tamamlayın.
            </Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  if (business.registrationStatus === 'pending') {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard style={styles.card}>
            <Ionicons name="hourglass-outline" size={28} color={BUSINESS_ACCENT} />
            <Text variant="label">Onay bekleniyor</Text>
            <Text secondary variant="caption" style={styles.centerText}>
              İşletme onayı tamamlandıktan sonra mağazanıza ürün ekleyebilirsiniz.
            </Text>
            <Button title="Durumu gör" onPress={() => router.push(BUSINESS_ROUTES.pending as never)} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  if (!commerceModeShowsProducts(business.commerceMode)) {
    const accent = shopAccentColor(business.shopAccent);
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard style={[styles.card, { borderColor: `${accent}44` }]}>
            <Ionicons name="cart-outline" size={28} color={accent} />
            <Text variant="label">E-ticaret modu kapalı</Text>
            <Text secondary variant="caption" style={styles.centerText}>
              Mağazanıza ürün eklemek için e-ticaret vitrinini açmanız gerekiyor.
            </Text>
            <Button title="Mağazayı kur" onPress={() => router.push(BUSINESS_ROUTES.setup as never)} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <CreateListingScreen
      mode="business"
      businessId={business.id}
      businessMeta={{
        id: business.id,
        name: business.name,
        shopAccent: business.shopAccent,
        shopTagline: business.shopTagline,
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  centerText: { textAlign: 'center', lineHeight: 20 },
});
