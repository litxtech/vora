import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { MapBottomSheet } from '@/features/map/components/MapBottomSheet';
import { LAYER_BY_ID } from '@/features/map/constants';
import type { MapCoordinate, MapMarker, MarkerGroup } from '@/features/map/types';
import { distanceKm, formatDistance, formatMapDate } from '@/features/map/utils/geo';
import { radius, spacing, glassSurface } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SHEET_HEIGHT = 320;

type MapClusterSheetProps = {
  group: MarkerGroup | null;
  visible: boolean;
  bottomInset: number;
  userCoords?: MapCoordinate | null;
  onClose: () => void;
  onOpenMarker: (marker: MapMarker) => void;
  onOpenDetail: (marker: MapMarker) => void;
};

function ClusterMemberCard({
  marker,
  cardWidth,
  userCoords,
  onOpen,
  onOpenDetail,
}: {
  marker: MapMarker;
  cardWidth: number;
  userCoords?: MapCoordinate | null;
  onOpen: () => void;
  onOpenDetail: () => void;
}) {
  const { colors, mode } = useTheme();
  const glass = glassSurface[mode];
  const layer = LAYER_BY_ID[marker.layer];
  const avatarUrl = marker.avatarUrl ?? marker.mediaUrls?.[0] ?? null;
  const distanceLabel =
    userCoords != null ? formatDistance(distanceKm(userCoords, marker)) : undefined;
  const dateLabel = formatMapDate(marker.createdAt);

  return (
    <Pressable
      onPress={onOpen}
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: glass.background,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.cardAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.cardAvatarFallback, { backgroundColor: `${layer.color}22` }]}>
            <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={18} color={layer.color} />
          </View>
        )}
        <View style={styles.cardHeaderText}>
          <View style={[styles.layerChip, { backgroundColor: `${layer.color}18` }]}>
            <Text variant="caption" style={{ color: layer.color, fontWeight: '700' }}>
              {layer.label}
            </Text>
          </View>
          <Text variant="body" numberOfLines={2} style={styles.cardTitle}>
            {marker.title}
          </Text>
          {marker.subtitle ? (
            <Text variant="caption" secondary numberOfLines={1}>
              {marker.subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {marker.description ? (
        <Text variant="caption" secondary numberOfLines={3} style={styles.cardDescription}>
          {marker.description}
        </Text>
      ) : null}

      <View style={styles.cardMeta}>
        {distanceLabel ? (
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={12} color={colors.accent} />
            <Text variant="caption" style={{ color: colors.accent }}>
              {distanceLabel}
            </Text>
          </View>
        ) : null}
        {dateLabel ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text variant="caption" secondary>
              {dateLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Button title="Detayı gör" onPress={onOpenDetail} variant="outline" style={styles.cardBtn} />
    </Pressable>
  );
}

export function MapClusterSheet({
  group,
  visible,
  bottomInset,
  userCoords,
  onClose,
  onOpenMarker,
  onOpenDetail,
}: MapClusterSheetProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<MapMarker>>(null);

  const cardWidth = screenWidth - spacing.md * 2 - spacing.sm;
  const members = group?.members ?? [];

  useEffect(() => {
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [group?.id]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + spacing.sm));
      setActiveIndex(Math.max(0, Math.min(index, members.length - 1)));
    },
    [cardWidth, members.length],
  );

  if (!group || group.count <= 1) return null;

  return (
    <MapBottomSheet
      visible={visible}
      onClose={onClose}
      bottomInset={bottomInset}
      minHeight={SHEET_HEIGHT}
      maxHeight={SHEET_HEIGHT + bottomInset}
    >
      <View style={styles.sheetInner}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <Text variant="h3">Bu bölgede {group.count} içerik</Text>
            <Text variant="caption" secondary>
              Kaydırarak sırayla inceleyin
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={members}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          snapToInterval={cardWidth + spacing.sm}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <ClusterMemberCard
              marker={item}
              cardWidth={cardWidth}
              userCoords={userCoords}
              onOpen={() => onOpenMarker(item)}
              onOpenDetail={() => onOpenDetail(item)}
            />
          )}
        />

        {members.length > 1 ? (
          <View style={styles.dots}>
            {members.map((member, index) => (
              <View
                key={member.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === activeIndex ? colors.primary : colors.border,
                    width: index === activeIndex ? 16 : 6,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </MapBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetInner: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sheetHeaderText: {
    flex: 1,
    gap: 2,
  },
  carouselContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cardAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  layerChip: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cardTitle: {
    fontWeight: '700',
  },
  cardDescription: {
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardBtn: {
    alignSelf: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: radius.full,
  },
});
