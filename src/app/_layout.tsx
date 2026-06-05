import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.setOptions({
  duration: 100,
  fade: true,
});
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/providers/AuthProvider';
import { CallProvider } from '@/providers/CallProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';

function RootNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(welcome)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="detail" />
        <Stack.Screen name="compose" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="hashtag/[tag]" />
        <Stack.Screen name="post-viewers/[id]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="admin/notification-sounds" />
        <Stack.Screen name="settings" />
        <Stack.Screen
          name="call"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <CallProvider>
              <RootNavigator />
            </CallProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
