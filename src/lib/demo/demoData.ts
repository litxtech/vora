/**
 * Sahte içerik yalnızca geliştirmede veya EXPO_PUBLIC_ENABLE_DEMO_DATA=true iken.
 * Production build'de varsayılan: kapalı.
 */
export function isDemoDataEnabled(): boolean {
  const flag = process.env.EXPO_PUBLIC_ENABLE_DEMO_DATA;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return __DEV__;
}

export function demoArrayFallback<T>(demo: readonly T[]): T[] {
  return isDemoDataEnabled() ? [...demo] : [];
}

export function demoValueFallback<T>(demo: T, empty: T): T {
  return isDemoDataEnabled() ? demo : empty;
}

export function demoOrNull<T>(demo: T): T | null {
  return isDemoDataEnabled() ? demo : null;
}

export function isDemoEntityId(id: string): boolean {
  return id.startsWith('demo-');
}
