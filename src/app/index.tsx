import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/providers/AuthProvider';

SplashScreen.preventAutoHideAsync();

const VORA_RED = '#E85D5D';
const SPLASH_DURATION_MS = 100;

export default function SplashRoute() {
  const { isLoading, user, profile, isGuest } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const navigated = useRef(false);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: SPLASH_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: SPLASH_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => setAnimationDone(true));
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (isLoading || !animationDone || navigated.current) return;

    navigated.current = true;

    void (async () => {
      await SplashScreen.hideAsync();

      if (user) {
        if (profile?.onboarding_completed === false) {
          router.replace('/(onboarding)/profile-setup');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }

      if (isGuest) {
        router.replace('/(tabs)');
        return;
      }

      router.replace('/(welcome)/lobby');
    })();
  }, [isLoading, animationDone, user, profile, isGuest]);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        Vora
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: 6,
    color: VORA_RED,
  },
});
