import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path } from 'react-native-svg';
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

/**
 * Mapbox PointAnnotation içinde Android'de Animated / LinearGradient çökme yapabiliyor.
 * Bu sürüm statik View + düz renkler kullanır.
 */
export function ExplorerSilhouettePin({ marker, selected = false }: ExplorerSilhouettePinProps) {
  const initial = marker.username.slice(0, 1).toUpperCase();
  const headSize = selected ? 42 : 36;
  const bodyWidth = selected ? 42 : 36;
  const bodyHeight = selected ? 54 : 48;
  const displayName = marker.fullName ?? marker.username;
  const innerSize = headSize - 6;

  return (
    <View style={[styles.wrap, selected && styles.wrapSelected]} collapsable={false}>
      {selected ? (
        <View
          style={[
            styles.ring,
            {
              width: headSize + 14,
              height: headSize + 14,
              borderRadius: (headSize + 14) / 2,
            },
          ]}
        />
      ) : null}

      <View style={[styles.label, selected && styles.labelSelected]}>
        <View style={styles.labelDot} />
        <Text variant="caption" style={styles.labelText} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      <View
        style={[
          styles.avatarRing,
          {
            width: headSize + 4,
            height: headSize + 4,
            borderRadius: (headSize + 4) / 2,
          },
          selected && styles.avatarRingSelected,
        ]}
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
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
              }}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
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
      </View>

      <Svg width={bodyWidth} height={bodyHeight} viewBox="0 0 40 56">
        <Ellipse cx="20" cy="54" rx={selected ? 15 : 13} ry="4.5" fill="rgba(0,0,0,0.45)" />
        <Path
          d="M20 14 C14 14 11 18 11 23 C11 26 12.5 28 12.5 30 L10 52 L14 52 L15.5 36 L17 52 L21 52 L22.5 36 L24 52 L28 52 L25.5 30 C25.5 28 27 26 27 23 C27 18 24 14 20 14 Z"
          fill={selected ? '#1A2838' : EXPLORER_SILHOUETTE_COLOR}
          stroke={EXPLORER_ACCENT_COLOR}
          strokeWidth={selected ? 2 : 1.6}
        />
        <Path
          d="M20 8 C16 8 13.5 10.5 13.5 14 C13.5 17 15.5 19 20 19 C24.5 19 26.5 17 26.5 14 C26.5 10.5 24 8 20 8 Z"
          fill={selected ? '#1A2838' : EXPLORER_SILHOUETTE_COLOR}
          stroke={EXPLORER_ACCENT_COLOR}
          strokeWidth={selected ? 2 : 1.6}
        />
        <Circle cx="20" cy="13" r="5.5" fill={EXPLORER_RING_COLOR} opacity={0.35} />
      </Svg>

      <View style={[styles.ground, { width: bodyWidth * 0.7, opacity: selected ? 0.45 : 0.3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    elevation: 8,
  },
  wrapSelected: {
    elevation: 12,
  },
  ring: {
    position: 'absolute',
    top: 20,
    borderWidth: 2,
    borderColor: EXPLORER_ACCENT_COLOR,
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
  },
  label: {
    marginBottom: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 165, 0.4)',
    backgroundColor: 'rgba(16, 22, 32, 0.94)',
    maxWidth: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  labelSelected: {
    borderColor: EXPLORER_ACCENT_COLOR,
    backgroundColor: 'rgba(0, 191, 165, 0.2)',
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: EXPLORER_ACCENT_COLOR,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -8,
    borderWidth: 2,
    borderColor: EXPLORER_ACCENT_COLOR,
    backgroundColor: '#0A1018',
    padding: 1,
  },
  avatarRingSelected: {
    borderWidth: 2.5,
    borderColor: '#00E5C8',
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
    fontSize: 14,
  },
  verifiedDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 16,
    height: 16,
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
  ground: {
    position: 'absolute',
    bottom: 0,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#000000',
  },
});
