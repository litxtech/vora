import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import {
  EXPLORER_ACCENT_COLOR,
  EXPLORER_RING_COLOR,
  EXPLORER_SILHOUETTE_COLOR,
} from '@/features/explorer/constants';
import type { ExplorerMarker } from '@/features/explorer/types';
import { radius } from '@/constants/theme';

type ExplorerSilhouettePinProps = {
  marker: ExplorerMarker;
  selected?: boolean;
};

function LiveRing({ size, active }: { size: number; active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: active ? 1400 : 2200,
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, active]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, active ? 2 : 1.55],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [active ? 0.55 : 0.28, 0],
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: EXPLORER_ACCENT_COLOR,
          borderWidth: active ? 2.5 : 1.5,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

function ExplorerBody({
  width,
  height,
  selected,
  markerId,
}: {
  width: number;
  height: number;
  selected: boolean;
  markerId: string;
}) {
  const gradientId = `explorer-body-${markerId}-${selected ? 'on' : 'off'}`;

  return (
    <Svg width={width} height={height} viewBox="0 0 40 56" style={styles.body}>
      <Defs>
        <SvgGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={selected ? '#2A3548' : EXPLORER_SILHOUETTE_COLOR} />
          <Stop offset="100%" stopColor={selected ? '#0A1018' : '#101820'} />
        </SvgGradient>
      </Defs>

      <Ellipse cx="20" cy="54" rx={selected ? 16 : 14} ry={selected ? 5 : 4} fill="rgba(0,0,0,0.42)" />

      <Path
        d="M20 14 C14 14 11 18 11 23 C11 26 12.5 28 12.5 30 L10 52 L14 52 L15.5 36 L17 52 L21 52 L22.5 36 L24 52 L28 52 L25.5 30 C25.5 28 27 26 27 23 C27 18 24 14 20 14 Z"
        fill={`url(#${gradientId})`}
        stroke={EXPLORER_ACCENT_COLOR}
        strokeWidth={selected ? 2 : 1.5}
      />

      <Path
        d="M20 8 C16 8 13.5 10.5 13.5 14 C13.5 17 15.5 19 20 19 C24.5 19 26.5 17 26.5 14 C26.5 10.5 24 8 20 8 Z"
        fill={`url(#${gradientId})`}
        stroke={EXPLORER_ACCENT_COLOR}
        strokeWidth={selected ? 2 : 1.5}
      />

      <Circle cx="20" cy="13" r={selected ? 6.5 : 5.5} fill={EXPLORER_RING_COLOR} opacity={selected ? 0.45 : 0.28} />
    </Svg>
  );
}

export function ExplorerSilhouettePin({ marker, selected = false }: ExplorerSilhouettePinProps) {
  const initial = marker.username.slice(0, 1).toUpperCase();
  const headSize = selected ? 40 : 34;
  const bodyWidth = selected ? 40 : 34;
  const bodyHeight = selected ? 52 : 46;
  const displayName = marker.fullName ?? marker.username;
  const scale = useRef(new Animated.Value(selected ? 1.1 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.1 : 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [scale, selected]);

  return (
    <Animated.View style={[styles.wrap, styles.wrapIos, { transform: [{ scale }] }]}>
      <LiveRing size={headSize + (selected ? 12 : 8)} active={selected} />

      <LinearGradient
        colors={
          selected
            ? ['rgba(0, 191, 165, 0.35)', 'rgba(0, 191, 165, 0.12)']
            : ['rgba(26, 34, 48, 0.94)', 'rgba(10, 16, 24, 0.88)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.label, selected && styles.labelSelected]}
      >
        <View style={styles.labelDot} />
        <Text variant="caption" style={styles.labelText} numberOfLines={1}>
          {displayName}
        </Text>
      </LinearGradient>

      <LinearGradient
        colors={selected ? ['#00E5C8', EXPLORER_ACCENT_COLOR, '#00897B'] : ['#00C9B1', EXPLORER_ACCENT_COLOR, '#00796B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.avatarRing, { width: headSize + 6, height: headSize + 6, borderRadius: (headSize + 6) / 2 }]}
      >
        <View
          style={[
            styles.avatarWrap,
            { width: headSize, height: headSize, borderRadius: headSize / 2 },
          ]}
        >
          {marker.avatarUrl ? (
            <Image
              source={{ uri: marker.avatarUrl }}
              style={{
                width: headSize - 5,
                height: headSize - 5,
                borderRadius: (headSize - 5) / 2,
              }}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                {
                  width: headSize - 5,
                  height: headSize - 5,
                  borderRadius: (headSize - 5) / 2,
                },
              ]}
            >
              <Text variant="caption" style={styles.avatarInitial}>
                {initial}
              </Text>
            </View>
          )}
          {marker.isVerified ? (
            <View style={styles.verifiedDot}>
              <Text style={styles.verifiedMark}>✓</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <ExplorerBody
        width={bodyWidth}
        height={bodyHeight}
        selected={selected}
        markerId={marker.userId}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  wrapIos: {
    shadowColor: EXPLORER_ACCENT_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  ring: {
    position: 'absolute',
    top: 18,
  },
  label: {
    marginBottom: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 165, 0.38)',
    maxWidth: 124,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  labelSelected: {
    borderColor: EXPLORER_ACCENT_COLOR,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: EXPLORER_ACCENT_COLOR,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -8,
    zIndex: 2,
    padding: 2,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1018',
    overflow: 'hidden',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 191, 165, 0.2)',
  },
  avatarInitial: {
    color: EXPLORER_ACCENT_COLOR,
    fontWeight: '800',
    fontSize: 12,
  },
  verifiedDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: radius.full,
    backgroundColor: EXPLORER_ACCENT_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedMark: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  body: {
    marginTop: -2,
  },
});
