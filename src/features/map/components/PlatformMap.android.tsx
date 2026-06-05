import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Text } from '@/components/ui/Text';
import { MapMarkerPin } from '@/features/map/components/MapMarkerPin';
import {
  KARADENIZ_MAP_CENTER,
  MAPBOX_DARK_STYLE,
  MAPBOX_LIGHT_STYLE,
  MAPBOX_SATELLITE_STYLE,
  MAPBOX_STANDARD_STYLE,
} from '@/features/map/constants';
import type { PlatformMapProps } from '@/features/map/components/types';
import type { MapStyleId } from '@/features/map/types';
import { ensureMapboxInitialized } from '@/lib/mapbox/init';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

function resolveMapboxStyle(style: MapStyleId): string {
  switch (style) {
    case 'light':
      return MAPBOX_LIGHT_STYLE;
    case 'standard':
      return MAPBOX_STANDARD_STYLE;
    case 'satellite':
      return MAPBOX_SATELLITE_STYLE;
    default:
      return MAPBOX_DARK_STYLE;
  }
}

export function PlatformMap({
  markers,
  selectedMarkerId,
  onMarkerPress,
  showsUserLocation = true,
  focusCoordinate,
  mapStyle = 'dark',
}: PlatformMapProps) {
  const { colors } = useTheme();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [ready, setReady] = useState(false);
  const styleURL = useMemo(() => resolveMapboxStyle(mapStyle), [mapStyle]);

  useEffect(() => {
    setReady(ensureMapboxInitialized());
  }, []);

  useEffect(() => {
    if (!focusCoordinate || !cameraRef.current) return;

    cameraRef.current.setCamera({
      centerCoordinate: [focusCoordinate.longitude, focusCoordinate.latitude],
      zoomLevel: focusCoordinate.zoom ?? 13,
      animationDuration: 450,
    });
  }, [focusCoordinate]);

  if (!ready) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.surface }]}>
        <Text variant="h3">Mapbox yapılandırılmadı</Text>
        <Text secondary style={styles.fallbackText}>
          EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN değerini .env dosyasına ekleyin ve uygulamayı yeniden derleyin.
        </Text>
      </View>
    );
  }

  return (
    <Mapbox.MapView style={styles.map} styleURL={styleURL} compassEnabled={false} logoEnabled={false}>
      <Mapbox.Camera
        ref={cameraRef}
        zoomLevel={10}
        centerCoordinate={[KARADENIZ_MAP_CENTER.longitude, KARADENIZ_MAP_CENTER.latitude]}
        animationMode="flyTo"
        animationDuration={0}
      />
      {showsUserLocation ? <Mapbox.UserLocation visible showsUserHeadingIndicator /> : null}
      {markers.map((marker) => (
        <Mapbox.PointAnnotation
          key={marker.id}
          id={marker.id}
          coordinate={[marker.longitude, marker.latitude]}
          onSelected={() => onMarkerPress?.(marker)}
        >
          <MapMarkerPin marker={marker} selected={selectedMarkerId === marker.id} />
        </Mapbox.PointAnnotation>
      ))}
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  fallbackText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
