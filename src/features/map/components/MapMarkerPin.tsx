import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LAYER_BY_ID } from '@/features/map/constants';
import type { MapMarker } from '@/features/map/types';
import { radius } from '@/constants/theme';

type MapMarkerPinProps = {
  marker: MapMarker;
  selected?: boolean;
  size?: 'sm' | 'md';
};

export function MapMarkerPin({ marker, selected = false, size = 'md' }: MapMarkerPinProps) {
  const layer = LAYER_BY_ID[marker.layer];
  const isPremium = marker.layer === 'businesses' && marker.meta?.verified === true;
  const dim = size === 'sm' ? 28 : isPremium ? 42 : 36;
  const iconSize = size === 'sm' ? 14 : isPremium ? 20 : 18;

  return (
    <View style={styles.wrap}>
      {isPremium ? (
        <View style={styles.premiumBadge}>
          <Ionicons name="star" size={10} color="#FFB300" />
        </View>
      ) : null}
      <View
        style={[
          styles.pin,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: layer.color,
            borderColor: selected ? '#FFFFFF' : isPremium ? '#FFB300' : 'rgba(255,255,255,0.85)',
            borderWidth: selected ? 3 : isPremium ? 2.5 : 2,
            transform: [{ scale: selected ? 1.14 : isPremium ? 1.08 : 1 }],
          },
        ]}
      >
        <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={iconSize} color="#fff" />
      </View>
      <View style={[styles.tail, { borderTopColor: layer.color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    zIndex: 2,
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: '#1A2230',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.32,
    shadowRadius: 5,
    elevation: 5,
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
