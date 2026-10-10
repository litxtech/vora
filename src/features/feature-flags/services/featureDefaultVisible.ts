type FeatureRegistryModule = {
  APP_FEATURE_BY_ID: Record<string, { defaultVisible?: boolean } | undefined>;
};

/**
 * Kayıt yokken özelliğin kendi varsayılanı.
 * Bu dosya import etmez; registry çağrı anında okunur, açılış döngüsünde fonksiyon kaybolmaz.
 */
export function featureOwnDefaultVisible(featureId: string): boolean {
  const registry = require('../constants') as FeatureRegistryModule;
  return registry.APP_FEATURE_BY_ID?.[featureId]?.defaultVisible !== false;
}
