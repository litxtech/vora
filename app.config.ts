import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Vora',
  slug: 'voralive',
  owner: 'voralive',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon-ios.png',
  scheme: 'vora',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/icon-ios.png',
    supportsTablet: true,
    bundleIdentifier: 'com.karadeniz.dijitalagi',
    infoPlist: {
      NSCameraUsageDescription: 'Görüntülü arama için kamera erişimi gerekir.',
      NSMicrophoneUsageDescription: 'Sesli ve görüntülü arama için mikrofon erişimi gerekir.',
      NSLocationWhenInUseUsageDescription:
        'Yakınınızdaki olayları ve içerikleri gösterebilmek için konum iznine ihtiyaç duyuyoruz.',
      NSPhotoLibraryUsageDescription: 'Profil fotoğrafı eklemek için galeri erişimi gerekir.',
    },
  },
  android: {
    icon: './assets/icon-android.png',
    package: 'com.karadeniz.dijitalagi',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ],
    adaptiveIcon: {
      backgroundColor: '#1A1D26',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'react-native-compressor',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
      },
    ],
    'react-native-maps',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsVersion: '11.20.1',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Yakınınızdaki olayları ve içerikleri gösterebilmek için konum iznine ihtiyaç duyuyoruz.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon-android.png',
        color: '#E85D5D',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Profil fotoğrafı eklemek için galeri erişimi gerekir.',
      },
    ],
    'expo-document-picker',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'fddc3166-8869-44c7-987e-1f15dea17e0b',
    },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_AGORA_APP_ID: process.env.EXPO_PUBLIC_AGORA_APP_ID,
    EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
};

export default config;
