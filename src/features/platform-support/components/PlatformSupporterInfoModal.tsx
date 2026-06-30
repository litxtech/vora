import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import {
  PLATFORM_SUPPORT_INVITE_NOTE,
  PLATFORM_SUPPORT_PACKAGES,
  PLATFORM_SUPPORT_TICK_PURPOSE,
  PLATFORM_SUPPORT_TICK_TITLE,
  type PlatformSupportTier,
} from '@/features/platform-support/constants';
import { startPlatformSupportCheckout } from '@/features/platform-support/services/contributionCheckout';
import { platformSupporterNote } from '@/features/platform-support/utils/formatSupporterSince';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const SUPPORT_ACCENT = '#10B981';
const SUPPORT_ACCENT_DARK = '#059669';
const DEFAULT_TIER: PlatformSupportTier = 'supporter_259';

type PlatformSupporterInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Destekçi olunan tarih (ISO). Verilirse "... tarihinden beri destekçi" notu gösterilir. */
  since?: string | null;
};

/**
 * Yeşil destekçi tikine tıklanınca açılan bilgi modalı.
 * Tikin amacını gösterir, paket seçilmesine izin verir ve uygulama içi ödemeyi başlatır.
 */
export function PlatformSupporterInfoModal({ visible, onClose, since }: PlatformSupporterInfoModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<PlatformSupportTier>(DEFAULT_TIER);
  const [loading, setLoading] = useState(false);

  const handleContribute = async () => {
    if (loading) return;
    if (!user) {
      onClose();
      router.push('/(auth)/login' as Href);
      return;
    }
    setLoading(true);
    const { error } = await startPlatformSupportCheckout(selectedTier);
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('fade')}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={
              isDark
                ? (['#0F2922', '#0A1F18', '#121820'] as const)
                : (['#ECFDF5', '#A7F3D0', '#D1FAE5'] as const)
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroIcon, { borderColor: `${SUPPORT_ACCENT}88` }]}>
              <Ionicons name="checkmark-circle" size={40} color={SUPPORT_ACCENT} />
            </View>
            <Text variant="h3" style={[styles.heroTitle, { color: isDark ? '#D1FAE5' : '#065F46' }]}>
              {PLATFORM_SUPPORT_TICK_TITLE}
            </Text>
            {since ? (
              <Text variant="caption" style={[styles.heroSince, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                {platformSupporterNote(since)}
              </Text>
            ) : null}
          </LinearGradient>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="body" style={styles.description}>
              {PLATFORM_SUPPORT_TICK_PURPOSE}
            </Text>

            <View style={styles.packages}>
              <Text variant="label">Destek paketi seç</Text>
              {PLATFORM_SUPPORT_PACKAGES.map((pkg) => {
                const selected = selectedTier === pkg.id;
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() => setSelectedTier(pkg.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.packageRow,
                      {
                        borderColor: selected ? SUPPORT_ACCENT : colors.border,
                        borderWidth: selected ? 2 : 1,
                        backgroundColor: selected
                          ? `${SUPPORT_ACCENT}${isDark ? '18' : '22'}`
                          : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? SUPPORT_ACCENT : colors.textMuted}
                    />
                    <View style={styles.packageInfo}>
                      <View style={styles.packageTitleRow}>
                        <Text variant="label">{pkg.label}</Text>
                        {pkg.badge ? (
                          <View style={[styles.packageBadge, { backgroundColor: `${SUPPORT_ACCENT}33` }]}>
                            <Text variant="caption" style={styles.packageBadgeText}>
                              {pkg.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text secondary variant="caption" style={styles.packageDesc}>
                        {pkg.description}
                      </Text>
                    </View>
                    <Text variant="label" style={{ color: SUPPORT_ACCENT_DARK }}>
                      {pkg.price}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={[
                styles.noteBox,
                { backgroundColor: `${SUPPORT_ACCENT}12`, borderColor: `${SUPPORT_ACCENT}30` },
              ]}
            >
              <Ionicons name="heart" size={18} color={SUPPORT_ACCENT} />
              <Text secondary variant="caption" style={styles.noteText}>
                {PLATFORM_SUPPORT_INVITE_NOTE}
              </Text>
            </View>

            <Pressable
              onPress={handleContribute}
              disabled={loading}
              style={[styles.ctaBtn, { backgroundColor: SUPPORT_ACCENT_DARK, opacity: loading ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Seçili paketle destek ol"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="heart" size={16} color="#fff" />
                  <Text variant="label" style={styles.ctaBtnText}>
                    {selectedLabel(selectedTier)} ile Destek Ol
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Kapat">
              <Text secondary variant="caption">
                Kapat
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function selectedLabel(tier: PlatformSupportTier): string {
  return PLATFORM_SUPPORT_PACKAGES.find((pkg) => pkg.id === tier)?.price ?? '';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroSince: {
    textAlign: 'center',
  },
  bodyScroll: {
    flexGrow: 0,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  description: {
    lineHeight: 22,
  },
  packages: {
    gap: spacing.sm,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  packageInfo: {
    flex: 1,
    gap: 2,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  packageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  packageBadgeText: {
    color: SUPPORT_ACCENT_DARK,
    fontSize: 10,
  },
  packageDesc: {
    lineHeight: 16,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    lineHeight: 18,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.xs,
    minHeight: 48,
  },
  ctaBtnText: {
    color: '#fff',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
