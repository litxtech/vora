import { Platform, type ImageSourcePropType } from 'react-native';

/** app.config.ts ile aynı kaynaklar */
export const APP_ICON: ImageSourcePropType = Platform.select({
  ios: require('../../assets/icon-ios.png'),
  android: require('../../assets/icon-android.png'),
  default: require('../../assets/icon-ios.png'),
})!;

export const APP_NAME = 'Vora';
