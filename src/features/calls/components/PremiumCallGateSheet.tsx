import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { CallType } from '@/features/calls/types';
import { PREMIUM_CALL_GATE_COPY } from '@/features/calls/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const PREMIUM_GOLD = '#FFB300';
const PREMIUM_GOLD_DARK = '#FF8F00';

type PremiumCallGateSheetProps = {
  visible: boolean;
  callType?: CallType;
  onClose: () => void;
};

export function PremiumCallGateSheet({ visible, callType = 'audio', onClose }: PremiumCallGateSheetProps) {
  const { colors, isDark } = useTheme();
  const isVideo = callType === 'video';

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <LinearGradient
            colors={['rgba(255,179,0,0.28)', 'rgba(255,143,0,0.08)']}
            style={styles.hero}
          >
            <View style={styles.iconWrap}>
              <LinearGradient colors={[PREMIUM_GOLD, PREMIUM_GOLD_DARK]} style={styles.icon}>
                <Ionicons name={isVideo ? 'videocam' : 'call'} size={26} color="#fff" />
              </LinearGradient>
            </View>
            <Text variant="h3" style={styles.title}>
              {PREMIUM_CALL_GATE_COPY.title}
            </Text>
            <Text secondary variant="caption" style={styles.subtitle}>
              {PREMIUM_CALL_GATE_COPY.subtitle}
            </Text>
          </LinearGradient>

          <GlassCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: `${PREMIUM_GOLD}22` }]}>
                <Ionicons name="call-outline" size={18} color={PREMIUM_GOLD_DARK} />
              </View>
              <View style={styles.featureText}>
                <Text variant="label">Sesli arama</Text>
                <Text secondary variant="caption">
                  Premium üyeler sınırsız sesli görüşme başlatabilir
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.accent}22` }]}>
                <Ionicons name="videocam-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text variant="label">Görüntülü arama</Text>
                <Text secondary variant="caption">
                  Gelen aramaları cevaplamak için Premium gerekmez
                </Text>
              </View>
            </View>
          </GlassCard>

          <View style={styles.actions}>
            <Button
              title="Premium'a Geç"
              onPress={() => {
                onClose();
                router.push('/settings/premium' as never);
              }}
            />
            <Button title="Vazgeç" variant="outline" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: spacing.xs,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  iconWrap: {
    marginBottom: spacing.xs,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
  featureCard: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
