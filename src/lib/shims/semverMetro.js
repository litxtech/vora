'use strict';

// Reanimated worklets check only needs these three APIs. Avoid semver/index.js,
// which eagerly requires every ranges/* module and breaks Metro incremental bundles.
module.exports = {
  satisfies: require('semver/functions/satisfies'),
  prerelease: require('semver/functions/prerelease'),
  outside: require('semver/ranges/outside'),
};
