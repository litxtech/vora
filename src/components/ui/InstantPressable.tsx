import { Pressable, type PressableProps } from 'react-native';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';

/** Pressable + Android anında dokunma (delayPressIn: 0). */
export function InstantPressable(props: PressableProps) {
  return <Pressable {...getAndroidInstantPressableProps()} {...props} />;
}
