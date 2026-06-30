import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type QuickItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
};

type Props = {
  items: QuickItem[];
};

export function BusinessHubQuickStrip({ items }: Props) {
  const { colors } = useTheme();
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.chip,
            {
              borderColor: `${item.accent}44`,
              backgroundColor: `${item.accent}12`,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <View style={[styles.chipIcon, { backgroundColor: `${item.accent}22` }]}>
            <Ionicons name={item.icon} size={16} color={item.accent} />
          </View>
          <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
