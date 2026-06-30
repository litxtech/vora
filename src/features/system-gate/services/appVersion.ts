import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getCurrentAppVersion(): string {
  return (
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

export function getPlatformMinVersionKey(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}
