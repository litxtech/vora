import { router, type Href } from 'expo-router';

const DEFAULT_FALLBACK = '/(tabs)' as Href;

/** Geçmiş yoksa GO_BACK uyarısını önler — feed veya verilen route'a düşer. */
export function safeRouterBack(fallback: Href = DEFAULT_FALLBACK): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
