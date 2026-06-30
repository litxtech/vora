import appIdentity from './app.js';

/** Uygulama kimliği — mağaza paket adları değiştirilemez; tek kaynak app.js */
export const APP_NAME = appIdentity.APP_NAME as 'Vora';
export const APP_SLUG = appIdentity.APP_SLUG as 'voralive';
export const APP_SCHEME = appIdentity.APP_SCHEME as 'vora';
export const APP_DOMAIN = appIdentity.APP_DOMAIN as 'vora.app';
export const APP_SHARE_BASE_URL = appIdentity.APP_SHARE_BASE_URL;
export const APP_BUNDLE_ID = appIdentity.APP_BUNDLE_ID as 'com.karadeniz.dijitalagi';
export const APPLE_TEAM_ID = appIdentity.APPLE_TEAM_ID as '9W6CR7KXM7';
export const IAP_PREMIUM_PRODUCT_SUFFIX = appIdentity.IAP_PREMIUM_PRODUCT_SUFFIX;

export function iapProductId(suffix: string): string {
  return `${APP_BUNDLE_ID}.${suffix}`;
}
