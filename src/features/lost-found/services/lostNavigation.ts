import { router } from 'expo-router';

/** Kayıp merkezi detayından güvenli geri — deep link / replace sonrası boş stack'e düşmez. */
export function lostGoBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/lost-center' as never);
}
