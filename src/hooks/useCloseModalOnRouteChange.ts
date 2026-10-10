import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';

/**
 * Android'de RN Modal, route değişince (ör. /room) üstte kalabiliyor.
 * Görünür sheet/modal'ı pathname değişiminde kapatır.
 */
export function useCloseModalOnRouteChange(visible: boolean, onClose: () => void) {
  const pathname = usePathname();
  const pathWhenOpened = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) {
      pathWhenOpened.current = null;
      return;
    }
    if (pathWhenOpened.current == null) {
      pathWhenOpened.current = pathname;
      return;
    }
    if (pathWhenOpened.current !== pathname) {
      onCloseRef.current();
    }
  }, [visible, pathname]);
}
