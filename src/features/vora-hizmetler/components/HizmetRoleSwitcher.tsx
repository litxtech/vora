import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HIZMET_ROLE_OPTIONS } from '@/features/vora-hizmetler/constants';
import type { ServiceRole } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetRoleSwitcherProps = {
  value: ServiceRole;
  onChange: (role: ServiceRole) => void;
};

export function HizmetRoleSwitcher({ value, onChange }: HizmetRoleSwitcherProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text variant="caption" secondary style={styles.lead}>
        Önce rolünüzü seçin — ekranlar buna göre düzenlenir
      </Text>
      <View style={styles.row}>
        {HIZMET_ROLE_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: active ? option.accent : colors.border,
                  backgroundColor: active ? `${option.accent}12` : colors.surfaceElevated,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {active ? (
                <LinearGradient
                  colors={[`${option.accent}`, `${option.accent}CC`]}
                  style={styles.iconWrap}
                >
                  <Ionicons name={option.icon} size={22} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={[styles.iconWrap, { backgroundColor: `${option.accent}18` }]}>
                  <Ionicons name={option.icon} size={22} color={option.accent} />
                </View>
              )}
              <Text variant="label" style={{ textAlign: 'center', color: active ? option.accent : colors.text }}>
                {option.label}
              </Text>
              <Text
                secondary
                variant="caption"
                style={{ textAlign: 'center', fontSize: 10, lineHeight: 14 }}
                numberOfLines={2}
              >
                {option.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  lead: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
