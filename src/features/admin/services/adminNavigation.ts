import { router, type Href } from 'expo-router';

const TABS_HOME = '/(tabs)' as Href;
const ADMIN_HOME = '/admin' as Href;

export function openAdminPanel() {
  router.replace(ADMIN_HOME);
}

export function exitAdminPanel() {
  router.replace(TABS_HOME);
}

/** Admin alt sayfalarından güvenli geri — boş tab ekranına düşmez. */
export function adminGoBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  exitAdminPanel();
}
