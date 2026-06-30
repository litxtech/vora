import { Platform } from 'react-native';
import { getAndroidAuthBootstrapTimeoutMs } from '@/lib/device/androidPerfProfile';

const DEFAULT_AUTH_BOOTSTRAP_TIMEOUT_MS = 3_000;
const IOS_AUTH_BOOTSTRAP_TIMEOUT_MS = 4_500;

export function resolveAuthBootstrapTimeoutMs(): number {
  if (Platform.OS === 'android') return getAndroidAuthBootstrapTimeoutMs();
  if (Platform.OS === 'ios') return IOS_AUTH_BOOTSTRAP_TIMEOUT_MS;
  return DEFAULT_AUTH_BOOTSTRAP_TIMEOUT_MS;
}
