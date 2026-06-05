import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  resultCount: number;
  loading?: boolean;
  nearbyEnabled?: boolean;
};

export function MapSearchBar({ value, onChangeText, resultCount, loading, nearbyEnabled }: MapSearchBarProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      <BlurView intensity={isDark ? 28 : 50} tint={isDark ? 'dark' : 'light'} style={styles.blur}>
        <View style={[styles.inner, { borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder="Olay, işletme, etkinlik, konum ara..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {value ? (
            <Pressable onPress={() => onChangeText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </BlurView>
      <Text variant="caption" muted style={styles.count}>
        {loading
          ? 'Yükleniyor...'
          : nearbyEnabled
            ? `${resultCount} nokta · Yakınımda`
            : `${resultCount} nokta`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  blur: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.xs,
  },
  count: {
    marginLeft: spacing.xs,
  },
});
