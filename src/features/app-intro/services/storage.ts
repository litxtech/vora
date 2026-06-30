import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_INTRO_KEY = 'app_intro_completed_v1';

export async function hasCompletedAppIntro(): Promise<boolean> {
  const value = await AsyncStorage.getItem(APP_INTRO_KEY);
  return value === '1';
}

export async function markAppIntroCompleted(): Promise<void> {
  await AsyncStorage.setItem(APP_INTRO_KEY, '1');
}
