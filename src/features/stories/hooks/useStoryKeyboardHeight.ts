import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';

/** Klavye yüksekliği — hikâye kartını yanıt girişiyle birlikte yukarı taşımak için. */
export function useStoryKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = KeyboardEvents.addListener(showEvent, (e) => setHeight(e.height));
    const hide = KeyboardEvents.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
