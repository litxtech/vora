import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
} from 'expo/config-plugins';

/** ML Kit code scanner (expo-camera launchScanner) — Play Console portrait uyarısı. */
const ORIENTATION_RESTRICTED_ACTIVITIES = [
  'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity',
] as const;

function upsertActivityOrientationRemoval(
  application: AndroidConfig.Manifest.Application,
  activityName: string,
): void {
  if (!application.activity) {
    application.activity = [];
  }

  const activities = Array.isArray(application.activity)
    ? application.activity
    : [application.activity];
  application.activity = activities;

  const existing = activities.find((activity) => activity.$?.['android:name'] === activityName);
  const mergeRule = {
    'android:name': activityName,
    'tools:node': 'merge',
    'tools:remove': 'android:screenOrientation',
  };

  if (existing) {
    existing.$ = { ...existing.$, ...mergeRule };
  } else {
    activities.push({ $: mergeRule });
  }
}

function applyLargeScreenManifestChanges(
  manifest: AndroidConfig.Manifest.AndroidManifest,
): AndroidConfig.Manifest.AndroidManifest {
  AndroidConfig.Manifest.ensureToolsAvailable(manifest);

  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  application.$['android:resizeableActivity'] = 'true';

  const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  mainActivity.$['android:resizeableActivity'] = 'true';

  for (const activityName of ORIENTATION_RESTRICTED_ACTIVITIES) {
    upsertActivityOrientationRemoval(application, activityName);
  }

  return manifest;
}

/** Android 16+ büyük ekran uyumluluğu: yön ve yeniden boyutlandırma kısıtlarını kaldırır. */
const withAndroidLargeScreenSupport: ConfigPlugin = (config) =>
  withAndroidManifest(config, (config) => {
    config.modResults = applyLargeScreenManifestChanges(config.modResults);
    return config;
  });

export default withAndroidLargeScreenSupport;
