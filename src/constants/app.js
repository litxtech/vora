/** Uygulama kimliği — mağaza paket adları değiştirilemez; tek kaynak burası. */
const APP_NAME = 'Vora';
const APP_SLUG = 'voralive';
const APP_SCHEME = 'vora';
const APP_DOMAIN = 'vora.app';
const APP_SHARE_BASE_URL = `https://${APP_DOMAIN}`;
/** iOS App Store paket adı — değiştirilemez. */
const APP_BUNDLE_ID = 'com.karadeniz.dijitalagi';
/** Google Play yeni kayıt — askılı com.karadeniz.dijitalagi kullanılamaz. */
const APP_ANDROID_PACKAGE = 'com.litxtech.vora';
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
  APP_ANDROID_PACKAGE,
  APPLE_TEAM_ID,
  IAP_PREMIUM_PRODUCT_SUFFIX,
};
