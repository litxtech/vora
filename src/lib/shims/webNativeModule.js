const React = require('react');
const { View } = require('react-native');

function WebNativeStub(props) {
  return React.createElement(View, props, props?.children ?? null);
}

const handler = {
  get(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return target;
    if (prop === 'prototype') return Function.prototype;
    if (typeof prop === 'symbol') return undefined;
    return target;
  },
  apply() {
    return null;
  },
};

module.exports = new Proxy(WebNativeStub, handler);
