import { Platform } from 'react-native';
import type { ExplorerMarker } from '@/features/explorer/types';

type ExplorerSilhouettePinProps = {
  marker: ExplorerMarker;
  selected?: boolean;
};

const PinImpl =
  Platform.OS === 'android'
    ? require('./ExplorerSilhouettePin.android').ExplorerSilhouettePin
    : require('./ExplorerSilhouettePin.ios').ExplorerSilhouettePin;

export function ExplorerSilhouettePin(props: ExplorerSilhouettePinProps) {
  return <PinImpl {...props} />;
}
