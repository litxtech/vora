import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapEmptyStateProps = {
  nearbyEnabled?: boolean;
  hasSourceData?: boolean;
  searchQuery?: string;
};

export function MapEmptyState({
  nearbyEnabled,
  hasSourceData = false,
  searchQuery = '',
}: MapEmptyStateProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];

  const { title, subtitle, icon } = useMemo(() => {
    const query = searchQuery.trim();
    if (!hasSourceData) {
      return {
        icon: 'earth-outline' as const,
        title: 'Haritada henüz içerik yok',
        subtitle: 'Olay, etkinlik veya işletme paylaşıldığında burada görünür.',
      };
    }
    if (query) {
      return {
        icon: 'search-outline' as const,
        title: 'Arama sonucu bulunamadı',
        subtitle: 'Farklı bir terim deneyin veya filtreleri genişletin.',
      };
    }
    if (nearbyEnabled) {
      return {
        icon: 'radio-outline' as const,
        title: 'Yakınınızda sonuç yok',
        subtitle: 'Yakınımda filtresini kapatın veya katman seçimini genişletin.',
      };
    }
    return {
      icon: 'layers-outline' as const,
      title: 'Seçili katmanlarda sonuç yok',
      subtitle: 'Başka bir kategori seçin veya tüm katmanları açın.',
    };
  }, [hasSourceData, nearbyEnabled, searchQuery]);

  const inner = (
    <View style={[styles.inner, { borderColor: colors.border, backgroundColor: surface.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text variant="caption" style={styles.title}>
          {title}
        </Text>
        <Text secondary variant="caption" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );

  return isDark ? (
    <BlurView intensity={24} tint="dark" style={styles.shell}>
      {inner}
    </BlurView>
  ) : (
    <View style={[styles.shell, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
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
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '600',
  },
});
