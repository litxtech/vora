import '@/lib/notifications/handler';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StartupErrorBoundary } from '@/components/boot/StartupErrorBoundary';
import { ScreenOrientationBootstrap } from '@/components/boot/ScreenOrientationBootstrap';
import { BootOrchestrator } from '@/features/auth/components/BootOrchestrator';
import { FeatureRouteEnforcer } from '@/features/feature-flags/components/FeatureRouteEnforcer';
import { AuthProvider } from '@/providers/AuthProvider';
import { GuestProfileGateProvider } from '@/features/auth/providers/GuestProfileGateProvider';
import { ProximityMatchProvider } from '@/features/proximity-match/components/ProximityMatchProvider';
import { SystemGateOverlay } from '@/features/system-gate';
import { hydrateFeedCacheFromDisk } from '@/features/feed/services/feedCache';
import { startScreenTimeTracking } from '@/features/screen-time';
import { holdNativeSplash } from '@/lib/boot/nativeSplash';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { BootShellBackgroundSync } from '@/features/app-appearance/hooks/useBootShellBackground';
import { resolveBootShellBackground } from '@/lib/boot/resolveBootShellBackground';
import { resolveStackAnimation } from '@/constants/navigation';
import { AppearanceProvider } from '@/providers/AppearanceProvider';
import { AccountSwitchProvider } from '@/features/account-switch/providers/AccountSwitchProvider';
import { CallProvider } from '@/providers/CallProvider';
import { FeatureFlagsProvider } from '@/providers/FeatureFlagsProvider';
import { VoraAiProvider } from '@/providers/VoraAiProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { AppStripeProvider } from '@/providers/AppStripeProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { UserCardProvider } from '@/providers/UserCardProvider';

enableScreens(true);
if (Platform.OS !== 'android') {
  enableFreeze(true);
}

holdNativeSplash();

SplashScreen.setOptions({
  duration: 0,
  fade: false,
});

function RootNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: resolveStackAnimation('default'),
          ...(Platform.OS === 'android'
            ? {
                animationDuration: 0,
                freezeOnBlur: false,
                detachInactiveScreens: true,
              }
            : {}),
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}

function ThemedAppShell() {
  const { colors } = useTheme();

  return (
    <View style={[styles.appShell, { backgroundColor: colors.background }]}>
      <ProximityMatchProvider>
        <FeatureRouteEnforcer />
        <RootNavigator />
        <BootOrchestrator />
        <SystemGateOverlay />
      </ProximityMatchProvider>
    </View>
  );
}

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [shellBackground, setShellBackground] = useState(resolveBootShellBackground());

  useEffect(() => {
    const task = deferBackgroundWork(() => {
      void hydrateFeedCacheFromDisk();
      startScreenTimeTracking();
    });
    return () => task.cancel();
  }, []);

  return (
    <StartupErrorBoundary>
      <ScreenOrientationBootstrap />
      <GestureHandlerRootView style={[styles.root, { backgroundColor: shellBackground }]}>
        <KeyboardProvider preload={false}>
          <AppearanceProvider>
            <BootShellBackgroundSync onColor={setShellBackground} />
            <ThemeProvider>
              <AuthProvider>
                <GuestProfileGateProvider>
                <UserCardProvider>
                  <AccountSwitchProvider>
                  <FeatureFlagsProvider>
                    <VoraAiProvider>
                      <NotificationProvider>
                        <AppStripeProvider>
                          <CallProvider>
                            <ThemedAppShell />
                          </CallProvider>
                        </AppStripeProvider>
                      </NotificationProvider>
                    </VoraAiProvider>
                  </FeatureFlagsProvider>
                  </AccountSwitchProvider>
                </UserCardProvider>
                </GuestProfileGateProvider>
              </AuthProvider>
            </ThemeProvider>
          </AppearanceProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </StartupErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  appShell: {
    flex: 1,
  },
});
