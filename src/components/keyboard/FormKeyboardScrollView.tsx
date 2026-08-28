import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';
import { spacing } from '@/constants/theme';

/** Form ekranlarında klavye açıldığında aktif alanın görünür kalması için varsayılanlar. */
export const FORM_KEYBOARD_BOTTOM_OFFSET = 88;
export const FORM_KEYBOARD_EXTRA_SPACE = spacing.lg;

export type FormKeyboardScrollViewProps = KeyboardAwareScrollViewProps;

export function FormKeyboardScrollView({
  bottomOffset = FORM_KEYBOARD_BOTTOM_OFFSET,
  extraKeyboardSpace = FORM_KEYBOARD_EXTRA_SPACE,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  ...props
}: FormKeyboardScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      extraKeyboardSpace={extraKeyboardSpace}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      {...props}
    />
  );
}
