import { Platform } from 'react-native';
import { getAndroidInitialAuthSessionTimeoutMs } from '@/lib/device/androidPerfProfile';

const DEFAULT_MS = 1_200;

export function resolveInitialAuthSessionTimeoutMs(): number {
  if (Platform.OS === 'android') return getAndroidInitialAuthSessionTimeoutMs();
  return DEFAULT_MS;
}
