import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { LAYER_BY_ID } from '@/features/map/constants';
import type { MapCoordinate, MapMarker } from '@/features/map/types';
import { distanceKm, formatDistance, formatMapDate } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapDetailSheetProps = {
  marker: MapMarker | null;
  userCoords?: MapCoordinate | null;
  onClose: () => void;
  onFocus: (marker: MapMarker) => void;
  onOpenDetail: (marker: MapMarker) => void;
};

function MetaChip({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.metaChip, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

export function MapDetailSheet({
  marker,
  userCoords,
  onClose,
  onFocus,
  onOpenDetail,
}: MapDetailSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  if (!marker) return null;

  const layer = LAYER_BY_ID[marker.layer];
  const isPremium = marker.layer === 'businesses' && marker.meta?.verified === true;
  const distanceLabel =
    userCoords != null
      ? formatDistance(distanceKm(userCoords, marker))
      : undefined;
  const dateLabel = formatMapDate(marker.createdAt);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <BlurView intensity={isDark ? 36 : 52} tint={isDark ? 'dark' : 'light'} style={styles.sheet}>
        <View style={[styles.content, { borderColor: colors.border }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: `${layer.color}22` }]}>
              <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={22} color={layer.color} />
            </View>
            <View style={styles.titles}>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: `${layer.color}18`, borderColor: layer.color }]}>
                  <Text variant="caption" style={{ color: layer.color }}>
                    {layer.label}
                  </Text>
                </View>
                {isPremium ? (
                  <View style={[styles.badge, styles.premiumBadge]}>
                    <Ionicons name="star" size={10} color="#FFB300" />
                    <Text variant="caption" style={{ color: '#FFB300' }}>
                      Sponsorlu
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="h3" numberOfLines={2}>
                {marker.title}
              </Text>
              {marker.subtitle ? (
                <Text secondary variant="caption">
                  {marker.subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {(distanceLabel || dateLabel) && (
            <View style={styles.metaRow}>
              {distanceLabel ? <MetaChip icon="navigate-outline" label={distanceLabel} color={colors.accent} /> : null}
              {dateLabel ? <MetaChip icon="time-outline" label={dateLabel} color={colors.primary} /> : null}
              {marker.meta?.severity ? (
                <MetaChip icon="alert-circle-outline" label={String(marker.meta.severity)} color={colors.danger} />
              ) : null}
            </View>
          )}

          {marker.description ? (
            <Text secondary style={styles.description} numberOfLines={3}>
              {marker.description}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button title="Görüntüle" onPress={() => onOpenDetail(marker)} />
            <View style={styles.secondaryActions}>
              <Pressable style={[styles.iconAction, { borderColor: colors.border }]} onPress={() => onFocus(marker)}>
                <Ionicons name="pin-outline" size={18} color={colors.textSecondary} />
                <Text variant="caption" secondary>
                  Konuma Git
                </Text>
              </Pressable>
              <Pressable style={[styles.iconAction, { borderColor: colors.border }]} onPress={() => onOpenDetail(marker)}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                <Text variant="caption" secondary>
                  Yorum Yap
                </Text>
              </Pressable>
              <Pressable style={[styles.iconAction, { borderColor: colors.border }]} onPress={() => onOpenDetail(marker)}>
                <Ionicons name="bookmark-outline" size={18} color={colors.textSecondary} />
                <Text variant="caption" secondary>
                  Takip Et
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
  },
  sheet: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: spacing.md,
  },
  handleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
  },
  close: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    gap: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
    borderColor: '#FFB300',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  description: {
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
