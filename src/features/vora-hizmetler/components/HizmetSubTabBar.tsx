import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_GRADIENT } from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TabOption<T extends string> = {
  id: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type HizmetSubTabBarProps<T extends string> = {
  tabs: TabOption<T>[];
  value: T;
  onChange: (tab: T) => void;
  accent?: string;
};

export function HizmetSubTabBar<T extends string>({
  tabs,
  value,
  onChange,
  accent,
}: HizmetSubTabBarProps<T>) {
  const { colors } = useTheme();
  const activeGradient = accent
    ? ([accent, `${accent}CC`] as const)
    : VORA_HIZMETLER_GRADIENT;

  return (
    <View style={[styles.bar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.btn, active && styles.btnActive]}
          >
            {active ? (
              <LinearGradient
                colors={[...activeGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Ionicons name={tab.icon} size={15} color="#fff" />
                <Text variant="caption" style={styles.btnTextActive} numberOfLines={1}>
                  {tab.label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.btnInner}>
                <Ionicons name={tab.icon} size={15} color={colors.textSecondary} />
                <Text
                  variant="caption"
                  style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: spacing.sm,
    gap: 4,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  btnActive: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },
  btnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  btnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  btnTextActive: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
});
