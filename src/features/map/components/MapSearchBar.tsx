import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { MapStyleIndicator } from '@/features/map/components/MapStyleIndicator';
import type { MapStyleId } from '@/features/map/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  resultCount: number;
  loading?: boolean;
  searching?: boolean;
  nearbyEnabled?: boolean;
  mapStyle?: MapStyleId;
  onCycleMapStyle?: () => void;
};

export function MapSearchBar({
  value,
  onChangeText,
  onFocus,
  onBlur,
  onClear,
  resultCount,
  loading,
  searching,
  nearbyEnabled,
  mapStyle,
  onCycleMapStyle,
}: MapSearchBarProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];
  const filterActive = value.trim().length > 0;

  const inner = (
    <View style={[styles.inner, { borderColor: colors.border, backgroundColor: surface.background }]}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="İşletme, ilçe, etkinlik veya adres ara..."
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text }]}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      {value ? (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
      {mapStyle && onCycleMapStyle ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MapStyleIndicator mapStyle={mapStyle} onPress={onCycleMapStyle} />
        </>
      ) : null}
    </View>
  );

  const countLabel = loading
    ? 'Yükleniyor...'
    : filterActive
      ? nearbyEnabled
        ? `${resultCount} eşleşen pin · Yakınımda`
        : `${resultCount} eşleşen pin`
      : nearbyEnabled
        ? 'Yazmaya başlayın · Yakınımda açık'
        : resultCount > 0
          ? `${resultCount} pin · Ara veya konum bul`
          : null;

  return (
    <View style={styles.wrap}>
      {isDark ? (
        <BlurView intensity={28} tint="dark" style={styles.shell}>
          {inner}
        </BlurView>
      ) : (
        <View style={styles.shell}>{inner}</View>
      )}
      {countLabel ? (
        <Text variant="caption" muted style={styles.count}>
          {countLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  shell: {
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
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.xs,
    minWidth: 0,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },
  count: {
    marginLeft: spacing.xs,
  },
});
