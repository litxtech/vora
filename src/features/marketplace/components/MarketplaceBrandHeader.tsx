import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT, MARKETPLACE_GRADIENT } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  regionLabel: string;
  onAccount?: () => void;
  onCreate: () => void;
  showAccount?: boolean;
  showCreate?: boolean;
};

export function MarketplaceBrandHeader({
  regionLabel,
  onAccount,
  onCreate,
  showAccount,
  showCreate = true,
}: Props) {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[`${MARKETPLACE_GRADIENT[0]}22`, `${MARKETPLACE_GRADIENT[1]}12`, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { borderColor: `${MARKETPLACE_ACCENT}33` }]}
    >
      <View style={styles.row}>
        <LinearGradient
          colors={[MARKETPLACE_GRADIENT[0], MARKETPLACE_GRADIENT[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBox}
        >
          <Ionicons name="storefront" size={22} color="#fff" />
        </LinearGradient>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text variant="h3" style={styles.title}>
              Yerel Pazar
            </Text>
            <View style={[styles.regionPill, { backgroundColor: `${MARKETPLACE_ACCENT}20` }]}>
              <Ionicons name="location-outline" size={11} color={MARKETPLACE_ACCENT} />
              <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
                {regionLabel}
              </Text>
            </View>
          </View>
          <Text secondary variant="caption">
            Komşundan al · güvenli öde · yerel teslim
          </Text>
        </View>

        <View style={styles.actions}>
          {showAccount && onAccount ? (
            <Pressable
              onPress={onAccount}
              style={[styles.actionBtn, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}
              hitSlop={6}
            >
              <Ionicons name="grid-outline" size={18} color={MARKETPLACE_ACCENT} />
            </Pressable>
          ) : null}
          {showCreate ? (
            <Pressable onPress={onCreate} style={styles.createBtn} hitSlop={6}>
              <LinearGradient
                colors={[MARKETPLACE_GRADIENT[0], MARKETPLACE_GRADIENT[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </LinearGradient>
            </Pressable>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  title: { fontWeight: '800', letterSpacing: -0.3 },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: { borderRadius: radius.full, overflow: 'hidden' },
  createGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
