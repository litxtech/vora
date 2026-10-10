import { useEffect } from 'react';
import { useNavigation } from 'expo-router';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Müzik kırpma kartı açıkken yatay sürükleme ekranı geri götürmesin. */
export function useLockStackBackGesture(locked: boolean): void {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !locked });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [locked, navigation]);
}
