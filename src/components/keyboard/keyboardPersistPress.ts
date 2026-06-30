import type { GestureResponderEvent } from 'react-native';

/**
 * Klavye açıkken ilk dokunuşun yalnızca klavyeyi kapatması sorununu önler.
 * Yalnızca onPressIn — onPress eklenmez (aynı dokunuşta çift gönderim olur).
 */
export function keyboardPersistPress(handler: () => void): {
  onPressIn: (event: GestureResponderEvent) => void;
} {
  return {
    onPressIn: (event) => {
      event?.preventDefault?.();
      handler();
    },
  };
}
