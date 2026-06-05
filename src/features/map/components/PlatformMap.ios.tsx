import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type MapType, type Region } from 'react-native-maps';
import { MapMarkerPin } from '@/features/map/components/MapMarkerPin';
import { KARADENIZ_INITIAL_REGION } from '@/features/map/constants';
import type { PlatformMapProps } from '@/features/map/components/types';
import type { MapStyleId } from '@/features/map/types';

function resolveIosMapType(style: MapStyleId): MapType {
  if (style === 'satellite') return 'satellite';
  if (style === 'standard') return 'standard';
  return 'mutedStandard';
}

function resolveIosUiStyle(style: MapStyleId): 'light' | 'dark' {
  if (style === 'light' || style === 'standard') return 'light';
  return 'dark';
}

export function PlatformMap({
  markers,
  selectedMarkerId,
  onMarkerPress,
  showsUserLocation = true,
  focusCoordinate,
  mapStyle = 'dark',
}: PlatformMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!focusCoordinate || !mapRef.current) return;

    const region: Region = {
      latitude: focusCoordinate.latitude,
      longitude: focusCoordinate.longitude,
      latitudeDelta: focusCoordinate.zoom ? 1 / focusCoordinate.zoom : 0.08,
      longitudeDelta: focusCoordinate.zoom ? 1 / focusCoordinate.zoom : 0.08,
    };

    mapRef.current.animateToRegion(region, 450);
  }, [focusCoordinate]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={KARADENIZ_INITIAL_REGION}
      showsUserLocation={showsUserLocation}
      showsCompass={false}
      showsScale={false}
      showsMyLocationButton={false}
      mapType={resolveIosMapType(mapStyle)}
      userInterfaceStyle={resolveIosUiStyle(mapStyle)}
      rotateEnabled
      pitchEnabled
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          identifier={marker.id}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          onPress={() => onMarkerPress?.(marker)}
          tracksViewChanges={selectedMarkerId === marker.id}
        >
          <MapMarkerPin marker={marker} selected={selectedMarkerId === marker.id} />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
  },
});
