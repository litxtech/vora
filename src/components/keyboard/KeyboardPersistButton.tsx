import type { ReactNode } from 'react';
import type { Insets, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

type KeyboardPersistButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  hitSlop?: number | Insets;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: ReactNode;
};

/**
 * Klavye açıkken tek dokunuşta tetiklenen gönder butonu.
 *
 * react-native-keyboard-controller'ın KeyboardStickyView'ı içinde React Native'in
 * kendi Pressable'ı klavye açıkken ilk dokunuşu yutuyor (yalnızca klavyeyi kapatıyor,
 * onPress tetiklenmiyor) — kullanıcı ikinci kez basmak zorunda kalıyor.
 * react-native-gesture-handler'ın Pressable'ı klavye geçişlerinde dokunuşu güvenilir
 * şekilde yakaladığı için tek dokunuşta gönderim sağlar (kütüphane yazarının önerdiği çözüm).
 */
export function KeyboardPersistButton({
  onPress,
  disabled,
  hitSlop,
  style,
  accessibilityLabel,
  children,
}: KeyboardPersistButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}
