import type { ReactNode } from 'react';
import { Marker, type LatLng, type MapMarkerProps } from 'react-native-maps';
import { useIosMarkerTracksViewChanges } from '@/features/map/hooks/useIosMarkerTracksViewChanges';

type IosCustomMapMarkerProps = {
  identifier: string;
  coordinate: LatLng;
  animated?: boolean;
  onPress?: MapMarkerProps['onPress'];
  anchor?: MapMarkerProps['anchor'];
  centerOffset?: MapMarkerProps['centerOffset'];
  children: ReactNode;
};

export function IosCustomMapMarker({
  identifier,
  coordinate,
  animated = false,
  onPress,
  anchor,
  centerOffset,
  children,
}: IosCustomMapMarkerProps) {
  const tracksViewChanges = useIosMarkerTracksViewChanges(animated);

  return (
    <Marker
      identifier={identifier}
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      anchor={anchor}
      centerOffset={centerOffset}
    >
      {children}
    </Marker>
  );
}
