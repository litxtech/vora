const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { FileStore } = require('metro-cache');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

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

config.resolver.alias = {
  ...config.resolver.alias,
  '@': path.resolve(__dirname, 'src'),
  // Stripe's "react-native" field points at src/; use the compiled lib for Metro.
  '@stripe/stripe-react-native': stripeLibEntry,
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@stripe/stripe-react-native') {
    return { type: 'sourceFile', filePath: stripeLibEntry };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
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
