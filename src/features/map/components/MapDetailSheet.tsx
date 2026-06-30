import { useEffect, useRef } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaCarousel } from '@/features/feed/components/MediaCarousel';
import { HotelMapSheetContent } from '@/features/hotel-center/components/HotelMapSheetContent';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { MapBottomSheet } from '@/features/map/components/MapBottomSheet';
import { LAYER_BY_ID } from '@/features/map/constants';
import { useContentFollow } from '@/features/map/hooks/useContentFollow';
import { prefetchMapMarkerDetail } from '@/features/map/services/mapNavigation';
import type { ContentFollowType, MapCoordinate, MapMarker } from '@/features/map/types';
import { distanceKm, formatDistance, formatMapDate } from '@/features/map/utils/geo';
import { radius, spacing, glassSurface } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const MAP_POST_MEDIA_MAX_HEIGHT = 140;
const ACTION_FOOTER_HEIGHT = 56;
const HEADER_BLOCK_HEIGHT = 72;

type MapDetailSheetProps = {
  marker: MapMarker | null;
  visible: boolean;
  bottomInset: number;
  userCoords?: MapCoordinate | null;
  onClose: () => void;
  onFocus: (marker: MapMarker) => void;
  onOpenDetail: (marker: MapMarker) => void;
  onOpenPostCard?: (marker: MapMarker) => void;
  onPostMediaPress?: (marker: MapMarker, index: number) => void;
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
    <View style={[styles.metaChip, { borderColor: `${color}44`, backgroundColor: `${color}12` }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

function followTypeForMarker(marker: MapMarker): ContentFollowType | null {
  if (marker.layer === 'events') return 'event';
  if (marker.layer === 'incidents') return 'incident';
  return null;
}

function ActionIcon({
  icon,
  label,
  onPress,
  active,
  activeColor,
  borderColor,
  backgroundColor,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  borderColor: string;
  backgroundColor: string;
  iconColor: string;
}) {
  return (
    <Pressable
      style={[
        styles.iconAction,
        {
          borderColor: active ? (activeColor ?? borderColor) : borderColor,
          backgroundColor: active ? `${activeColor ?? borderColor}14` : backgroundColor,
        },
      ]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={active ? (activeColor ?? iconColor) : iconColor} />
    </Pressable>
  );
}

export function MapDetailSheet({
  marker,
  visible,
  bottomInset,
  userCoords,
  onClose,
  onFocus,
  onOpenDetail,
  onOpenPostCard,
  onPostMediaPress,
}: MapDetailSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const { colors, mode } = useTheme();
  const glass = glassSurface[mode];
  const { requireAuth } = useRequireAuth();
  const lastMarkerRef = useRef<MapMarker | null>(null);

  useEffect(() => {
    if (marker) lastMarkerRef.current = marker;
  }, [marker]);

  useEffect(() => {
    if (marker) prefetchMapMarkerDetail(marker);
  }, [marker?.layer, marker?.sourceId]);

  const activeMarker = marker ?? lastMarkerRef.current;

  const followType = activeMarker ? followTypeForMarker(activeMarker) : null;
  const { following, toggle: toggleFollow } = useContentFollow(
    followType ?? 'event',
    followType && activeMarker ? activeMarker.sourceId : null,
  );

  if (!activeMarker) return null;

  const layer = LAYER_BY_ID[activeMarker.layer];
  const isPremium = activeMarker.layer === 'businesses' && activeMarker.meta?.verified === true;
  const distanceLabel =
    userCoords != null ? formatDistance(distanceKm(userCoords, activeMarker)) : undefined;
  const dateLabel = formatMapDate(activeMarker.createdAt);
  const isPost = activeMarker.layer === 'posts';
  const isHotel = activeMarker.layer === 'hotels';
  const mediaUrls = activeMarker.mediaUrls ?? [];
  const maxSheetHeight = Math.round(screenHeight * 0.72 - bottomInset);
  const scrollMaxHeight = Math.max(
    120,
    maxSheetHeight - HEADER_BLOCK_HEIGHT - ACTION_FOOTER_HEIGHT - spacing.lg,
  );

  const handleOpenPostCard = () => {
    if (isPost && onOpenPostCard) {
      onOpenPostCard(activeMarker);
      return;
    }
    onOpenDetail(activeMarker);
  };

  const handleFollow = async () => {
    if (!followType || !(await requireAuth('Takip'))) return;
    const result = await toggleFollow();
    if (result?.error) Alert.alert('Hata', result.error);
    else if (result?.following) Alert.alert('Takip', 'Yeni gelişmeler bildirim olarak gelecek.');
  };

  const preview = isHotel ? (
    <HotelMapSheetContent
      hotelId={activeMarker.sourceId}
      fallbackTitle={activeMarker.title}
      fallbackDescription={activeMarker.description}
      onMediaPress={() => onOpenDetail(activeMarker)}
    />
  ) : (
    <>
      {(distanceLabel || dateLabel || activeMarker.meta?.severity) ? (
        <View style={styles.metaRow}>
          {distanceLabel ? <MetaChip icon="navigate-outline" label={distanceLabel} color={colors.accent} /> : null}
          {dateLabel ? <MetaChip icon="time-outline" label={dateLabel} color={colors.primary} /> : null}
          {activeMarker.meta?.severity ? (
            <MetaChip icon="alert-circle-outline" label={String(activeMarker.meta.severity)} color={colors.danger} />
          ) : null}
        </View>
      ) : null}

      {isPost && mediaUrls.length > 0 ? (
        <MediaCarousel
          urls={mediaUrls}
          variant="inline"
          maxHeight={MAP_POST_MEDIA_MAX_HEIGHT}
          onMediaPress={(index) => onPostMediaPress?.(activeMarker, index)}
        />
      ) : null}

      {activeMarker.description ? (
        <Text
          variant="body"
          secondary={!isPost}
          style={styles.description}
          numberOfLines={isPost ? 4 : 3}
        >
          {activeMarker.description}
        </Text>
      ) : null}
    </>
  );

  const actionFooter = (
    <View style={styles.actionFooter}>
      <View style={styles.actions}>
        <Button
          title={isPost ? 'Gönderiyi aç' : isHotel ? 'Tüm detayları gör' : 'Detayı gör'}
          onPress={handleOpenPostCard}
          fullWidth={false}
          style={styles.primaryAction}
        />
        <ActionIcon
          icon="locate-outline"
          label="Konuma git"
          onPress={() => onFocus(activeMarker)}
          borderColor={colors.border}
          backgroundColor={glass.chip}
          iconColor={colors.textSecondary}
        />
        <ActionIcon
          icon="chatbubble-outline"
          label={isPost ? 'Yorumlar' : 'Yorum yap'}
          onPress={isPost ? handleOpenPostCard : () => onOpenDetail(activeMarker)}
          borderColor={colors.border}
          backgroundColor={glass.chip}
          iconColor={colors.textSecondary}
        />
        {followType ? (
          <ActionIcon
            icon={following ? 'bookmark' : 'bookmark-outline'}
            label={following ? 'Takipte' : 'Takip et'}
            onPress={handleFollow}
            active={following}
            activeColor={colors.accent}
            borderColor={colors.border}
            backgroundColor={glass.chip}
            iconColor={colors.textSecondary}
          />
        ) : !isPost ? (
          <ActionIcon
            icon="arrow-forward-outline"
            label="Detay"
            onPress={() => onOpenDetail(activeMarker)}
            borderColor={colors.border}
            backgroundColor={glass.chip}
            iconColor={colors.textSecondary}
          />
        ) : null}
      </View>
    </View>
  );

  const header = (
    <View style={styles.header}>
      <View style={[styles.iconWrap, { backgroundColor: `${layer.color}20` }]}>
        <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={22} color={layer.color} />
      </View>
      <View style={styles.titles}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: `${layer.color}16`, borderColor: `${layer.color}55` }]}>
            <Text variant="caption" style={{ color: layer.color, fontWeight: '600' }}>
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
        <Text variant="label" numberOfLines={2} style={styles.title}>
          {activeMarker.title}
        </Text>
        {activeMarker.subtitle ? (
          <Text secondary variant="caption" numberOfLines={1}>
            {activeMarker.subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel="Kapat">
        <Ionicons name="close" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  return (
    <MapBottomSheet
      visible={visible}
      onClose={onClose}
      bottomInset={bottomInset}
      maxHeight={maxSheetHeight}
    >
      <View style={[styles.sheetInner, { maxHeight: maxSheetHeight }]}>
        <View style={styles.content}>{header}</View>
        <ScrollView
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
        >
          <View style={styles.content}>{preview}</View>
        </ScrollView>
        <View style={styles.content}>{actionFooter}</View>
      </View>
    </MapBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetInner: {
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.lg,
  },
  title: {
    fontSize: 16,
  },
  close: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 2,
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
    lineHeight: 20,
  },
  actionFooter: {
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconAction: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
