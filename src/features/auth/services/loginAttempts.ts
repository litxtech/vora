import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOGIN_LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS } from '@/constants/auth';

const ATTEMPTS_KEY = 'auth:login_attempts';
const LOCKOUT_KEY = 'auth:login_lockout_until';

type AttemptState = {
  count: number;
  lockedUntil: number | null;
};

async function readState(): Promise<AttemptState> {
  const [attemptsRaw, lockoutRaw] = await Promise.all([
    AsyncStorage.getItem(ATTEMPTS_KEY),
    AsyncStorage.getItem(LOCKOUT_KEY),
  ]);

  const lockedUntil = lockoutRaw ? Number(lockoutRaw) : null;
  if (lockedUntil && Date.now() < lockedUntil) {
    return { count: MAX_LOGIN_ATTEMPTS, lockedUntil };
  }

  if (lockedUntil && Date.now() >= lockedUntil) {
    await Promise.all([AsyncStorage.removeItem(ATTEMPTS_KEY), AsyncStorage.removeItem(LOCKOUT_KEY)]);
    return { count: 0, lockedUntil: null };
  }

  return { count: attemptsRaw ? Number(attemptsRaw) : 0, lockedUntil: null };
}

export async function getLoginLockoutMessage(): Promise<string | null> {
  const state = await readState();
  if (!state.lockedUntil) return null;

  const minutesLeft = Math.ceil((state.lockedUntil - Date.now()) / 60000);
  return `Çok fazla yanlış deneme. ${minutesLeft} dakika sonra tekrar deneyin.`;
}

export async function recordFailedLogin(): Promise<string | null> {
  const state = await readState();
  const nextCount = state.count + 1;

  if (nextCount >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000;
    await Promise.all([
      AsyncStorage.setItem(ATTEMPTS_KEY, String(nextCount)),
      AsyncStorage.setItem(LOCKOUT_KEY, String(lockedUntil)),
    ]);
    return `Çok fazla yanlış deneme. ${LOGIN_LOCKOUT_MINUTES} dakika sonra tekrar deneyin.`;
  }

  await AsyncStorage.setItem(ATTEMPTS_KEY, String(nextCount));
  return null;
}

export async function clearLoginAttempts(): Promise<void> {
  await Promise.all([AsyncStorage.removeItem(ATTEMPTS_KEY), AsyncStorage.removeItem(LOCKOUT_KEY)]);
}
