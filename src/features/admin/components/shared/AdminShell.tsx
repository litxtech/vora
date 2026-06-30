import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminGoBack } from '@/features/admin/services/adminNavigation';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { AdminHeader } from '@/features/admin/components/shared/AdminHeader';
import { useAdminGuard, useModeratorGuard } from '@/features/admin/hooks/useAdminGuard';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
  showBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  requireAdmin?: boolean;
  /** Chat gibi FlatList içeren ekranlarda false — ScrollView iç içe VirtualizedList uyarısını önler */
  scrollable?: boolean;
};

export function AdminShell({
  title,
  subtitle,
  badge,
  children,
  showBack = true,
  backLabel,
  onBack,
  refreshing = false,
  onRefresh,
  requireAdmin = false,
  scrollable = true,
}: Props) {
  const { colors } = useTheme();
  const guard = requireAdmin ? useAdminGuard() : useModeratorGuard();

  if (guard.status === 'loading') {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (guard.status === 'unauthorized') {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AdminHeader title="Yönetim" subtitle="Yetkisiz erişim" showBack />
          <GlassCard style={styles.deniedCard}>
            <Text variant="label">Erişim reddedildi</Text>
            <Text secondary variant="caption">
              {requireAdmin
                ? 'Bu sayfaya yalnızca adminler erişebilir.'
                : 'Bu sayfaya yalnızca moderatör ve adminler erişebilir.'}
            </Text>
            <Button title="Geri Dön" onPress={adminGoBack} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const header = (
    <AdminHeader
      title={title}
      subtitle={subtitle}
      badge={badge}
      showBack={showBack}
      backLabel={backLabel}
      onBack={onBack}
    />
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {scrollable ? (
          <KeyboardAwareScrollView
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            bottomOffset={32}
            extraKeyboardSpace={24}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              ) : undefined
            }
          >
            {header}
            {children}
          </KeyboardAwareScrollView>
        ) : (
          <View style={[styles.page, styles.pageFlex]}>
            {header}
            {children}
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  pageFlex: { flex: 1, minHeight: 0, paddingBottom: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deniedCard: { gap: spacing.md },
});
