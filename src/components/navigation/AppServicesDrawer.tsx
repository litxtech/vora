import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { radius, spacing } from '@/constants/theme';
import { hasPremiumEntitlement } from '@/features/profile/services/premiumAccess';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type AppServicesDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

type DrawerItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  href: Href;
  accent: string;
  featureId?: string;
  premiumOnly?: boolean;
};

const ITEMS: DrawerItem[] = [
  {
    id: 'ads',
    icon: 'megaphone',
    label: 'Reklam Stüdyosu',
    subtitle: 'Kampanya hazırla, önizle, yayınla',
    href: '/ads/studio',
    accent: '#7C3AED',
    featureId: 'ads',
    premiumOnly: true,
  },
  {
    id: 'ads-panel',
    icon: 'albums-outline',
    label: 'Reklam Merkezi',
    subtitle: 'Kota, borç ve kampanyalar',
    href: '/ads',
    accent: '#F59E0B',
    featureId: 'ads',
    premiumOnly: true,
  },
  {
    id: 'insights',
    icon: 'analytics',
    label: 'İçgörüler & Güven',
    subtitle: 'İstatistik ve demografi',
    href: '/settings/insights',
    accent: '#6366F1',
  },
  {
    id: 'settings',
    icon: 'settings-outline',
    label: 'Ayarlar',
    subtitle: 'Hesap ve tercihler',
    href: '/settings',
    accent: '#64748B',
  },
];

export function AppServicesDrawer({ visible, onClose }: AppServicesDrawerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, isGuest } = useAuth();
  const adsUnlocked = hasPremiumEntitlement(profile?.is_premium);

  const open = (item: DrawerItem) => {
    onClose();
    router.push(item.href);
  };

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? '#121218' : '#fff',
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text variant="h3" style={styles.title}>
          Hizmetler
        </Text>
        <Text secondary variant="caption" style={styles.subtitle}>
          Reklam, analitik ve platform araçlarına hızlı erişim
        </Text>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {isGuest ? (
            <View style={styles.guestBlock}>
              <Text secondary variant="caption" style={styles.guestText}>
                Reklam ve içgörülere erişmek için giriş yapın veya kayıt olun.
              </Text>
              <Button
                title="Giriş Yap"
                onPress={() => {
                  onClose();
                  router.push('/(auth)/login' as Href);
                }}
              />
              <Button
                title="Kayıt Ol"
                variant="outline"
                onPress={() => {
                  onClose();
                  router.push('/(auth)/register' as Href);
                }}
              />
            </View>
          ) : (
            ITEMS.map((item) => {
              if (item.premiumOnly && !adsUnlocked) return null;

              const row = (
                <Pressable
                  key={item.id}
                  onPress={() => open(item)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderColor: colors.border,
                      backgroundColor: pressed ? `${item.accent}10` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${item.accent}18` }]}>
                    <Ionicons name={item.icon} size={20} color={item.accent} />
                  </View>
                  <View style={styles.copy}>
                    <Text variant="label">{item.label}</Text>
                    <Text secondary variant="caption">
                      {item.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );

              if (item.featureId) {
                return (
                  <FeatureGate key={item.id} featureId={item.featureId}>
                    {row}
                  </FeatureGate>
                );
              }

              return row;
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '72%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.md },
  list: { gap: spacing.sm, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  guestBlock: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  guestText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
