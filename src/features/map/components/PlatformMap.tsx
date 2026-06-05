import { Platform } from 'react-native';
import type { PlatformMapProps } from '@/features/map/components/types';

type MapComponent = (props: PlatformMapProps) => React.JSX.Element;

const MapImpl: MapComponent =
  Platform.OS === 'android'
    ? require('./PlatformMap.android').PlatformMap
    : Platform.OS === 'web'
      ? require('./PlatformMap.web').PlatformMap
      : require('./PlatformMap.ios').PlatformMap;

export function PlatformMap(props: PlatformMapProps) {
  return <MapImpl {...props} />;
}

export type { PlatformMapProps };
