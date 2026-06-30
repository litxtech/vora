import { router } from 'expo-router';

/** Etkinlik detayından güvenli geri — deep link / replace sonrası boş stack'e düşmez. */
export function eventGoBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/event-center' as never);
}
