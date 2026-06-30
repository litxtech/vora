import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_OPT_IN_KEY = 'proximity-match:bg-opt-in';

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeProximityBackgroundOptIn(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export async function isProximityBackgroundOptInEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(BACKGROUND_OPT_IN_KEY)) === '1';
}

export async function setProximityBackgroundOptInEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BACKGROUND_OPT_IN_KEY, enabled ? '1' : '0');
  emitChange();
}
