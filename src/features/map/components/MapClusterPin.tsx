import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { LAYER_BY_ID } from '@/features/map/constants';
import type { MapMarker, MarkerGroup } from '@/features/map/types';
import { resolveGroupAvatarUrl } from '@/features/map/utils/groupMarkers';
import { radius } from '@/constants/theme';

const PIN_SIZE = 44;
const BADGE_MIN = 18;

type MapClusterPinProps = {
  group: MarkerGroup;
  selected?: boolean;
  onPress?: () => void;
};

function SingleMarkerFallback({ marker, selected }: { marker: MapMarker; selected?: boolean }) {
  const layer = LAYER_BY_ID[marker.layer];
  const pinColor = marker.meta?.mapColor ? String(marker.meta.mapColor) : layer.color;
  const avatarUrl = marker.avatarUrl ?? marker.mediaUrls?.[0] ?? null;

  if (avatarUrl) {
    return (
      <View
        style={[
          styles.avatarRing,
          {
            borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.9)',
            borderWidth: selected ? 3 : 2,
            transform: [{ scale: selected ? 1.1 : 1 }],
          },
        ]}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconPin,
        {
          backgroundColor: pinColor,
          borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
          borderWidth: selected ? 3 : 2,
          transform: [{ scale: selected ? 1.1 : 1 }],
        },
      ]}
    >
      <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={20} color="#fff" />
    </View>
  );
}

export function MapClusterPin({ group, selected = false, onPress }: MapClusterPinProps) {
  if (group.count <= 1) {
    return (
      <Pressable onPress={onPress} hitSlop={6} style={styles.wrap}>
        <SingleMarkerFallback marker={group.representative} selected={selected} />
        <View style={[styles.tail, { borderTopColor: LAYER_BY_ID[group.representative.layer].color }]} />
      </Pressable>
    );
  }

  const rep = group.representative;
  const layer = LAYER_BY_ID[rep.layer];
  const avatarUrl = resolveGroupAvatarUrl(group);
  const pinColor = rep.meta?.mapColor ? String(rep.meta.mapColor) : layer.color;

  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.wrap}>
      <View style={styles.clusterWrap}>
        {avatarUrl ? (
          <View
            style={[
              styles.avatarRing,
              {
                borderColor: selected ? '#FFFFFF' : pinColor,
                borderWidth: selected ? 3 : 2.5,
                transform: [{ scale: selected ? 1.08 : 1 }],
              },
            ]}
          >
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          </View>
        ) : (
          <View
            style={[
              styles.iconPin,
              {
                backgroundColor: pinColor,
                borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.9)',
                borderWidth: selected ? 3 : 2,
              },
            ]}
          >
            <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={20} color="#fff" />
          </View>
        )}
        <View style={[styles.countBadge, { backgroundColor: pinColor }]}>
          <Text variant="caption" style={styles.countText}>
            +{group.count - 1}
          </Text>
        </View>
      </View>
      <View style={[styles.tail, { borderTopColor: pinColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  iconPin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.32,
    shadowRadius: 5,
    elevation: 5,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: BADGE_MIN,
    height: BADGE_MIN,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  countText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    lineHeight: 12,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
