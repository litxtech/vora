import fs from 'fs';
import path from 'path';
import plist from '@expo/plist';
import {
  type ConfigPlugin,
  withDangerousMod,
  withInfoPlist,
} from 'expo/config-plugins';

const NSE_BUNDLE_NAME = 'VoraCallCommunicationNSE';
const IN_START_CALL_INTENT = 'INStartCallIntent';

/** NSE Info.plist (INStartCallIntent) — communication entitlement EAS profile sync gerektirir. */
const withCallCommunicationNotifications: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (mod) => {
    const types = Array.isArray(mod.modResults.NSUserActivityTypes)
      ? [...mod.modResults.NSUserActivityTypes]
      : [];
    if (!types.includes(IN_START_CALL_INTENT)) {
      types.push(IN_START_CALL_INTENT);
    }
    mod.modResults.NSUserActivityTypes = types;
    return mod;
  });

  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const plistPath = path.join(
        mod.modRequest.projectRoot,
        'ios',
        NSE_BUNDLE_NAME,
        `${NSE_BUNDLE_NAME}-Info.plist`,
      );

      if (!fs.existsSync(plistPath)) {
        return mod;
      }

      const raw = fs.readFileSync(plistPath, 'utf8');
      const parsed = plist.parse(raw) as Record<string, unknown>;
      const extension = (parsed.NSExtension ?? {}) as Record<string, unknown>;
      const attributes = (extension.NSExtensionAttributes ?? {}) as Record<string, unknown>;

      extension.NSExtensionPrincipalClass = '$(PRODUCT_MODULE_NAME).NotificationService';
      attributes.IntentsSupported = [IN_START_CALL_INTENT];
      extension.NSExtensionAttributes = attributes;
      parsed.NSExtension = extension;

      fs.writeFileSync(plistPath, plist.build(parsed));
      return mod;
    },
  ]);

  return config;
};

export default withCallCommunicationNotifications;
