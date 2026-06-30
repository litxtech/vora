/** Uygulama kimliği — mağaza paket adları değiştirilemez; tek kaynak burası. */
const APP_NAME = 'Vora';
const APP_SLUG = 'voralive';
const APP_SCHEME = 'vora';
const APP_DOMAIN = 'vora.app';
const APP_SHARE_BASE_URL = `https://${APP_DOMAIN}`;
const APP_BUNDLE_ID = 'com.karadeniz.dijitalagi';
const APPLE_TEAM_ID = '9W6CR7KXM7';

const IAP_PREMIUM_PRODUCT_SUFFIX = {
  monthly: 'vora.premium.monthly',
  yearly: 'vora.premium.yearly',
};

module.exports = {
  APP_NAME,
  APP_SLUG,
  APP_SCHEME,
  APP_DOMAIN,
  APP_SHARE_BASE_URL,
  APP_BUNDLE_ID,
  APPLE_TEAM_ID,
  IAP_PREMIUM_PRODUCT_SUFFIX,
};
