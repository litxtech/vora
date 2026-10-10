import { Dimensions, Platform, type ScaledSize } from 'react-native';

/** Masaüstünde uygulama telefon genişliğinde kalır. Dar tarayıcıda gerçek genişlik kullanılır. */
const APP_WIDTH = 420;
const DESKTOP = 840;

function shouldFrame() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= DESKTOP;
}

function frame(size: ScaledSize): ScaledSize {
  if (!shouldFrame() || size.width <= APP_WIDTH) return size;
  return { ...size, width: APP_WIDTH };
}

const read = Dimensions.get.bind(Dimensions);
Dimensions.get = ((dimension: 'window' | 'screen') => frame(read(dimension))) as typeof Dimensions.get;

const subscribe = Dimensions.addEventListener.bind(Dimensions);
Dimensions.addEventListener = ((type, handler) =>
  subscribe(type, (update) => {
    handler({
      window: frame(update.window),
      screen: frame(update.screen),
    });
  })) as typeof Dimensions.addEventListener;
