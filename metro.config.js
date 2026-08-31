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

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@livekit/react-native': path.resolve(__dirname, 'node_modules/@livekit/react-native'),
  '@livekit/react-native-webrtc': path.resolve(__dirname, 'node_modules/@livekit/react-native-webrtc'),
};

function rewriteLiveKitResolvedPath(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  if (
    normalized.includes('/@livekit/react-native-webrtc/src/') ||
    normalized.endsWith('/@livekit/react-native-webrtc/src/index.ts')
  ) {
    return livekitWebrtcEntry;
  }
  if (
    normalized.includes('/@livekit/react-native/src/') ||
    normalized.endsWith('/@livekit/react-native/src/index.tsx')
  ) {
    return livekitNativeEntry;
  }
  return null;
}

function resolveLiveKitModule(moduleName) {
  if (moduleName === '@livekit/react-native') {
    return { type: 'sourceFile', filePath: livekitNativeEntry };
  }
  if (moduleName === '@livekit/react-native-webrtc') {
    return { type: 'sourceFile', filePath: livekitWebrtcEntry };
  }
  return null;
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const liveKitResolved = resolveLiveKitModule(moduleName);
  if (liveKitResolved) return liveKitResolved;

  if (moduleName === '@stripe/stripe-react-native') {
    return { type: 'sourceFile', filePath: stripeLibEntry };
  }
  if (moduleName === 'semver') {
    return { type: 'sourceFile', filePath: semverMetroShim };
  }
  // packageExports açıkken semver deep import'ları (reanimated worklets check) çözülemiyor.
  const semverResolved = resolveSemverSubpath(moduleName);
  if (semverResolved) return semverResolved;

  if (defaultResolveRequest) {
    const resolved = defaultResolveRequest(context, moduleName, platform);
    if (resolved?.type === 'sourceFile' && resolved.filePath) {
      const rewritten = rewriteLiveKitResolvedPath(resolved.filePath);
      if (rewritten) {
        return { type: 'sourceFile', filePath: rewritten };
      }
    }
    if (resolved) return resolved;
  }

  const fallback = context.resolveRequest(context, moduleName, platform);
  if (fallback?.type === 'sourceFile' && fallback.filePath) {
    const rewritten = rewriteLiveKitResolvedPath(fallback.filePath);
    if (rewritten) {
      return { type: 'sourceFile', filePath: rewritten };
    }
  }
  return fallback;
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
