import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  VORA_NEEDS_ACCENT,
  VORA_NEEDS_CENTER_DEF,
  VORA_NEEDS_GRADIENT,
} from '@/features/vora-needs/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  regionLabel: string;
  onCreate: () => void;
  showCreate?: boolean;
};

export function VoraNeedsBrandHeader({ regionLabel, onCreate, showCreate = true }: Props) {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[`${VORA_NEEDS_GRADIENT[0]}22`, `${VORA_NEEDS_GRADIENT[1]}12`, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { borderColor: `${VORA_NEEDS_ACCENT}33` }]}
    >
      <View style={styles.row}>
        <LinearGradient
          colors={[VORA_NEEDS_GRADIENT[0], VORA_NEEDS_GRADIENT[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBox}
        >
          <Ionicons name="hand-left" size={22} color="#fff" />
        </LinearGradient>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text variant="h3" style={styles.title}>
              {VORA_NEEDS_CENTER_DEF.title}
            </Text>
            <View style={[styles.regionPill, { backgroundColor: `${VORA_NEEDS_ACCENT}20` }]}>
              <Ionicons name="location-outline" size={11} color={VORA_NEEDS_ACCENT} />
              <Text variant="caption" style={{ color: VORA_NEEDS_ACCENT, fontWeight: '700' }}>
                {regionLabel}
              </Text>
            </View>
          </View>
          <Text secondary variant="caption">
            {VORA_NEEDS_CENTER_DEF.subtitle}
          </Text>
        </View>

        {showCreate ? (
        <Pressable onPress={onCreate} style={styles.createBtn} hitSlop={6}>
          <LinearGradient
            colors={[VORA_NEEDS_GRADIENT[0], VORA_NEEDS_GRADIENT[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createGradient}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  title: {
    fontWeight: '800',
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  createBtn: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  createGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
