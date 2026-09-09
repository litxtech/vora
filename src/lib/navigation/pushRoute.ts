import { router, type Href } from 'expo-router';
import { getNavigationRepeatGuardMs } from '@/lib/device/androidPerfProfile';

let lastPushAt = 0;
let lastHref = '';

/** Çift tıklama koruması + anında stack push. */
export function pushRoute(href: Href | string): void {
  const key = String(href);
  const now = Date.now();
  const guard = getNavigationRepeatGuardMs();

  if (key === lastHref && now - lastPushAt < guard) return;

  lastPushAt = now;
  lastHref = key;
  router.push(href as Href);
}

/** replace için aynı koruma. */
export function replaceRoute(href: Href | string): void {
  const key = String(href);
  const now = Date.now();
  const guard = getNavigationRepeatGuardMs();

  if (key === lastHref && now - lastPushAt < guard) return;

  lastPushAt = now;
  lastHref = key;
  router.replace(href as Href);
}
