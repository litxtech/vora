const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const { FileStore } = require('metro-cache');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// semver gibi exports'suz paketlerin deep import'ları (reanimated) bozulmasın.
config.resolver.unstable_enablePackageExports = false;

// Windows'ta %TEMP% altında EMFILE riskini azaltmak için önbelleği projede tut.
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, '.metro-cache'),
  }),
];

const stripeLibEntry = path.resolve(
  __dirname,
  'node_modules/@stripe/stripe-react-native/lib/module/index.js',
);
const livekitNativeEntry = path.resolve(
  __dirname,
  'node_modules/@livekit/react-native/lib/module/index.js',
);
const livekitWebrtcEntry = path.resolve(
  __dirname,
  'node_modules/@livekit/react-native-webrtc/lib/module/index.js',
);
const semverRoot = path.resolve(__dirname, 'node_modules/semver');
const semverMetroShim = path.resolve(__dirname, 'src/lib/shims/semverMetro.js');

function resolveSemverSubpath(moduleName) {
  if (!moduleName.startsWith('semver/')) return null;
  const sub = moduleName.slice('semver/'.length);
  const candidates = [
    path.join(semverRoot, `${sub}.js`),
    path.join(semverRoot, sub, 'index.js'),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return { type: 'sourceFile', filePath };
    }
  }
  return null;
}

config.resolver.alias = {
  ...config.resolver.alias,
  '@': path.resolve(__dirname, 'src'),
  // Stripe's "react-native" field points at src/; use the compiled lib for Metro.
  '@stripe/stripe-react-native': stripeLibEntry,
  // LiveKit "react-native" fields point at src/; compiled lib resolves webrtc peer correctly.
  '@livekit/react-native': livekitNativeEntry,
  '@livekit/react-native-webrtc': livekitWebrtcEntry,
  // semver/index.js eagerly loads ranges/*; shim keeps reanimated worklets check working.
  semver: semverMetroShim,
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@stripe/stripe-react-native') {
    return { type: 'sourceFile', filePath: stripeLibEntry };
  }
  if (moduleName === '@livekit/react-native') {
    return { type: 'sourceFile', filePath: livekitNativeEntry };
  }
  if (moduleName === '@livekit/react-native-webrtc') {
    return { type: 'sourceFile', filePath: livekitWebrtcEntry };
  }
  if (moduleName === 'semver') {
    return { type: 'sourceFile', filePath: semverMetroShim };
  }
  // packageExports açıkken semver deep import'ları (reanimated worklets check) çözülemiyor.
  const semverResolved = resolveSemverSubpath(moduleName);
  if (semverResolved) return semverResolved;

  if (defaultResolveRequest) {
    const resolved = defaultResolveRequest(context, moduleName, platform);
    if (resolved) return resolved;
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
