import appIdentity from './app.js';

/** Uygulama kimliği — mağaza paket adları değiştirilemez; tek kaynak app.js */
export const APP_NAME = appIdentity.APP_NAME;
export const APP_SLUG = appIdentity.APP_SLUG;
export const APP_SCHEME = appIdentity.APP_SCHEME;
export const APP_DOMAIN = appIdentity.APP_DOMAIN;
export const APP_SHARE_BASE_URL = appIdentity.APP_SHARE_BASE_URL;
export const APP_BUNDLE_ID = appIdentity.APP_BUNDLE_ID;
export const APPLE_TEAM_ID = appIdentity.APPLE_TEAM_ID;
export const IAP_PREMIUM_PRODUCT_SUFFIX = appIdentity.IAP_PREMIUM_PRODUCT_SUFFIX;

export function iapProductId(suffix: string): string {
  return `${APP_BUNDLE_ID}.${suffix}`;
}
