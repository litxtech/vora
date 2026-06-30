import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LAYER_BY_ID } from '@/features/map/constants';
import type { MapMarker } from '@/features/map/types';
import { isLiveMarker } from '@/features/map/utils/geo';
import { radius } from '@/constants/theme';

type MapMarkerPinProps = {
  marker: MapMarker;
  selected?: boolean;
  size?: 'sm' | 'md';
};

function LivePulse({ color, size }: { color: string; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Animated.View
      style={[
        styles.pulse,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

export function MapMarkerPin({ marker, selected = false, size = 'md' }: MapMarkerPinProps) {
  const layer = LAYER_BY_ID[marker.layer];
  const isPremium = marker.layer === 'businesses' && marker.meta?.verified === true;
  const pinColor = marker.meta?.mapColor ? String(marker.meta.mapColor) : layer.color;
  const dim = size === 'sm' ? 28 : isPremium ? 42 : 36;
  const iconSize = size === 'sm' ? 14 : isPremium ? 20 : 18;
  const isLive = isLiveMarker(marker);

  return (
    <View style={styles.wrap}>
      {isLive ? <LivePulse color={pinColor} size={dim} /> : null}
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
            backgroundColor: pinColor,
            borderColor: selected ? '#FFFFFF' : isPremium ? '#FFB300' : 'rgba(255,255,255,0.85)',
            borderWidth: selected ? 3 : isPremium ? 2.5 : 2,
            transform: [{ scale: selected ? 1.14 : isPremium ? 1.08 : 1 }],
          },
        ]}
      >
        <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={iconSize} color="#fff" />
      </View>
      <View style={[styles.tail, { borderTopColor: pinColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    borderWidth: 2,
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
