import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const SPLASH_BACKGROUND = '#0A0E14';
const SPLASH_ACCENT = '#1E88E5';
const SPLASH_TEXT = '#9AA8BC';
/** Native splash hiç kapanmazsa boş lacivert ekranda takılmayı önler. */
const SPLASH_HIDE_FALLBACK_MS = 3_000;

type AppSplashProps = {
  hideNativeSplash?: boolean;
};

export function AppSplash({ hideNativeSplash = true }: AppSplashProps) {
  useEffect(() => {
    if (!hideNativeSplash) return;

    void SplashScreen.hideAsync();

    const timer = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, SPLASH_HIDE_FALLBACK_MS);

    return () => clearTimeout(timer);
  }, [hideNativeSplash]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={SPLASH_ACCENT} />
      <Text style={styles.label}>Vora yükleniyor…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    color: SPLASH_TEXT,
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
