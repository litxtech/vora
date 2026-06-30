import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import type { ExpoConfig } from 'expo/config';
import {
  APP_BUNDLE_ID,
  APP_DOMAIN,
  APP_NAME,
  APP_SCHEME,
  APP_SLUG,
  APPLE_TEAM_ID,
} from './src/constants/app.js';

const vendorAndroidMaven = path.join(__dirname, 'vendor', 'android-m2');
const googleServicesFile = path.join(__dirname, 'google-services.json');
const androidPackage = APP_BUNDLE_ID;

function ensureGoogleServicesJson(): void {
  if (fs.existsSync(googleServicesFile)) return;

  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();
  const senderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();

  if (!apiKey || !projectId || !appId || !senderId) return;

  const payload = {
    project_info: {
      project_number: senderId,
      project_id: projectId,
      storage_bucket: `${projectId}.firebasestorage.app`,
    },
    client: [
      {
        client_info: {
          mobilesdk_app_id: appId,
          android_client_info: { package_name: androidPackage },
        },
        oauth_client: [],
        api_key: [{ current_key: apiKey }],
        services: {
          appinvite_service: { other_platform_oauth_client: [] },
        },
      },
    ],
    configuration_version: '1',
  };

  fs.writeFileSync(googleServicesFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

ensureGoogleServicesJson();

const apnsEnvironment =
  process.env.EAS_BUILD_PROFILE === 'development' ? 'development' : 'production';

const notificationMode =
  process.env.EAS_BUILD_PROFILE === 'development' ? 'development' : 'production';

const config: ExpoConfig = {
  name: APP_NAME,
  slug: APP_SLUG,
  owner: 'voralive',
  version: '2.4.0',
  orientation: 'default',
  icon: './assets/icon-ios.png',
  scheme: APP_SCHEME,
  backgroundColor: '#F1F5F9',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/icon-ios.png',
    supportsTablet: false,
    bundleIdentifier: APP_BUNDLE_ID,
    appleTeamId: APPLE_TEAM_ID,
    buildNumber: '16',
    associatedDomains: [`applinks:${APP_DOMAIN}`],
    entitlements: {
      'aps-environment': apnsEnvironment,
      'com.apple.developer.applesignin': ['Default'],
    },
    infoPlist: {
      LSApplicationQueriesSchemes: ['whatsapp'],
      UIBackgroundModes: ['remote-notification', 'audio', 'location'],
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'Görüntülü arama, etkinlik QR girişi ve fotoğraf paylaşımı için kamera erişimi gerekir.',
      NSMicrophoneUsageDescription:
        'Sesli arama, ses kaydı ve görüntülü arama için mikrofon erişimi gerekir.',
      NSLocationWhenInUseUsageDescription:
        'Yakınınızdaki Vora kullanıcılarıyla eşleşmek ve içerikleri göstermek için konum iznine ihtiyaç duyuyoruz.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Uygulama arka plandayken de yakındaki Vora kullanıcılarıyla eşleşebilmeniz için konum iznine ihtiyaç duyuyoruz.',
      NSPhotoLibraryUsageDescription:
        'Profil fotoğrafı ve mesajlarda medya paylaşımı için galeri erişimi gerekir.',
      NSPhotoLibraryAddUsageDescription: 'Mesajlara fotoğraf kaydetmek için galeri erişimi gerekir.',
    },
  },
  android: {
    ...(fs.existsSync(googleServicesFile) ? { googleServicesFile: './google-services.json' } : {}),
    icon: './assets/icon-android.png',
    package: APP_BUNDLE_ID,
    versionCode: 13,
    backgroundColor: '#F1F5F9',
    softwareKeyboardLayoutMode: 'resize',
    blockedPermissions: [
      // full-screen-sharing-special kaldırıldı; yedek olarak manifest'ten de silinir.
      'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
      'android.permission.CAPTURE_VIDEO_OUTPUT',
    ],
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
    ],
    adaptiveIcon: {
      backgroundColor: '#1A1D26',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: APP_DOMAIN, pathPrefix: '/p' },
          { scheme: 'https', host: APP_DOMAIN, pathPrefix: '/r' },
          { scheme: 'https', host: APP_DOMAIN, pathPrefix: '/v' },
          { scheme: 'https', host: APP_DOMAIN, pathPrefix: '/u' },
          { scheme: 'https', host: APP_DOMAIN, pathPrefix: '/m' },
          { scheme: 'https', host: APP_DOMAIN, pathPrefix: '/s' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      {
        action: 'VIEW',
        data: [{ scheme: APP_SCHEME }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    './plugins/withAndroidLargeScreenSupport',
    [
      'expo-build-properties',
      {
        android: {
          // JitPack Cloudflare 403 — BlurView ve TAndroidLame yerel maven repo'dan çözülür
          extraMavenRepos: [vendorAndroidMaven],
          useHermesV1: true,
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          extraProguardRules: [
            '-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivity$g',
            '-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Args',
            '-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Error',
            '-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter',
            '-dontwarn com.stripe.android.pushProvisioning.PushProvisioningEphemeralKeyProvider',
            '-dontwarn com.google.android.gms.tapandpay.**',
          ].join('\n'),
        },
        ios: {
          useHermesV1: true,
        },
      },
    ],
    'expo-apple-authentication',
    'expo-iap',
    'expo-router',
    'expo-asset',
    [
      'expo-audio',
      {
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    'expo-video',
    'expo-secure-store',
    'react-native-compressor',
    'expo-font',
    [
      'expo-splash-screen',
      {
        // Görünmez 1px görsel: Android 12+ zorunlu splash ikonunu logo göstermeden karşılar.
        image: './assets/splash-transparent.png',
        imageWidth: 1,
        backgroundColor: '#F1F5F9',
        dark: {
          backgroundColor: '#0A0E14',
        },
        ios: {
          backgroundColor: '#F1F5F9',
          dark: {
            backgroundColor: '#0A0E14',
          },
        },
        android: {
          backgroundColor: '#F1F5F9',
          dark: {
            backgroundColor: '#0A0E14',
          },
        },
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
          'Yakınınızdaki Vora kullanıcılarıyla eşleşmek ve içerikleri göstermek için konum iznine ihtiyaç duyuyoruz.',
        locationAlwaysAndWhenInUsePermission:
          'Uygulama arka plandayken de yakındaki Vora kullanıcılarıyla eşleşebilmeniz için konum iznine ihtiyaç duyuyoruz.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon-android.png',
        color: '#E85D5D',
        mode: notificationMode,
        enableBackgroundRemoteNotifications: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Profil fotoğrafı eklemek için galeri erişimi gerekir.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Fotoğraf, video ve etkinlik QR girişi için kamera erişimi gerekir.',
        microphonePermission:
          'Video kaydı için mikrofon erişimi gerekir.',
        recordAudioAndroid: true,
      },
    ],
    'expo-document-picker',
    'expo-image',
    'expo-sharing',
    'expo-screen-orientation',
    '@react-native-community/datetimepicker',
    [
      'expo-media-library',
      {
        photosPermission: 'Mesajlarda medya paylaşımı için galeri erişimi gerekir.',
        savePhotosPermission: 'Mesajlardan fotoğraf kaydetmek için galeri erişimi gerekir.',
        isAccessMediaLocationEnabled: false,
      },
    ],
    './plugins/withStripApplePayEntitlement',
    './plugins/withIosProductionSigning',
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
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_SHARE_BASE_URL: process.env.EXPO_PUBLIC_SHARE_BASE_URL,
    EXPO_PUBLIC_IOS_APP_STORE_URL: process.env.EXPO_PUBLIC_IOS_APP_STORE_URL,
    EXPO_PUBLIC_ANDROID_PLAY_STORE_URL:
      process.env.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL ??
      `https://play.google.com/store/apps/details?id=${APP_BUNDLE_ID}`,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};

export default config;
