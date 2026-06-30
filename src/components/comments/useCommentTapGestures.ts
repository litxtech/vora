import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';

const DOUBLE_TAP_DELAY = 280;

type Options = {
  /** Yorum metnine çift dokununca (mesajdaki gibi yanıtla) */
  onDoubleTap?: () => void;
  /** Basılı tutunca (düzenle). Yoksa long-press tetiklenmez. */
  onLongPress?: () => void;
};

/**
 * Yorum metni için kısayol jestleri.
 * - Çift dokunma → onDoubleTap (yanıtla)
 * - Basılı tutma → onLongPress (düzenle) + hafif haptik
 *
 * Dönen props doğrudan bir <Pressable> üzerine yayılır.
 */
export function useCommentTapGestures({ onDoubleTap, onLongPress }: Options) {
  const lastTap = useRef(0);

  const handlePress = useCallback(() => {
    if (!onDoubleTap) return;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = 0;
      onDoubleTap();
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap]);

  const handleLongPress = useCallback(() => {
    if (!onLongPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onLongPress();
  }, [onLongPress]);

  return {
    onPress: onDoubleTap ? handlePress : undefined,
    onLongPress: onLongPress ? handleLongPress : undefined,
    delayLongPress: 320,
  };
}
