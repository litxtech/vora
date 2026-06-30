import { type ConfigPlugin, withEntitlementsPlist } from 'expo/config-plugins';

/** Provisioning profile Apple Pay içermiyorsa build düşmesin diye entitlement kaldırılır. */
const withStripApplePayEntitlement: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (config) => {
    delete config.modResults['com.apple.developer.in-app-payments'];
    return config;
  });

export default withStripApplePayEntitlement;
