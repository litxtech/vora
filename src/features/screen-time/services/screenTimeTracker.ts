import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import {
  SCREEN_TIME_OPEN_GRACE_MS,
  SCREEN_TIME_RETENTION_DAYS,
  SCREEN_TIME_STORAGE_KEY,
  SCREEN_TIME_STORAGE_VERSION,
} from '@/features/screen-time/constants';
import type {
  ScreenTimeDay,
  ScreenTimePersisted,
  ScreenTimeSnapshot,
  ScreenTimeWeekCompare,
} from '@/features/screen-time/types';

/**
 * Ekran Süresi izleyicisi.
 *
 * Tasarım ilkeleri (temiz & performanslı):
 * - Yalnızca olay tabanlı: hiçbir global setInterval / arka plan görevi / ağ isteği yok.
 *   Süre, sadece AppState geçişlerinde (aktif <-> arka plan) hesaplanır.
 * - Uygulama kapalıyken veya arka plandayken süre sayılmaz.
 * - Disk yazımı seyrek: yalnızca arka plana geçişte ve ayar değişikliklerinde.
 * - Tüm türetilmiş istatistikler (seri, rekor, karşılaştırma) saf hesaplamadır.
 */

let started = false;
let appStateSub: NativeEventSubscription | null = null;

/** Devam eden ön plan oturumunun başlangıç zaman damgası (ms) — yoksa null. */
let sessionStart: number | null = null;
/** Son arka plana geçiş zamanı — kısa titremeleri ayırt etmek için. */
let lastBackgroundAt: number | null = null;

let days: Record<string, number> = {};
let opens: Record<string, number> = {};
let longestSession = 0;
let goalMinutes: number | null = null;
let lastGoalNotifyDate: string | null = null;
let hydrated = false;

const listeners = new Set<() => void>();

const MS_PER_DAY = 86_400_000;

function dateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 'YYYY-MM-DD' anahtarının bir önceki gününü verir. */
function prevDayKey(key: string): string {
  const [y, m, d] = key.split('-').map((n) => Number.parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dateKey(date.getTime());
}

/** [startMs, endMs] aralığını günlere bölerek saniyeleri ekler. */
function distribute(target: Record<string, number>, startMs: number, endMs: number): void {
  if (endMs <= startMs) return;
  let cursor = startMs;
  let guard = 0;
  while (cursor < endMs && guard < 400) {
    guard += 1;
    const dayEnd = startOfDay(cursor) + MS_PER_DAY;
    const sliceEnd = Math.min(endMs, dayEnd);
    const seconds = (sliceEnd - cursor) / 1000;
    const key = dateKey(cursor);
    target[key] = (target[key] ?? 0) + seconds;
    cursor = sliceEnd;
  }
}

function pruneOld(): void {
  const cutoff = dateKey(Date.now() - SCREEN_TIME_RETENTION_DAYS * MS_PER_DAY);
  for (const key of Object.keys(days)) if (key < cutoff) delete days[key];
  for (const key of Object.keys(opens)) if (key < cutoff) delete opens[key];
}

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // dinleyici hatası izlemeyi bozmasın
    }
  }
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  try {
    const raw = await AsyncStorage.getItem(SCREEN_TIME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ScreenTimePersisted>;
      if (parsed && typeof parsed === 'object') {
        days = parsed.days && typeof parsed.days === 'object' ? { ...parsed.days } : {};
        opens = parsed.opens && typeof parsed.opens === 'object' ? { ...parsed.opens } : {};
        longestSession = typeof parsed.longestSession === 'number' ? parsed.longestSession : 0;
        goalMinutes = typeof parsed.goalMinutes === 'number' ? parsed.goalMinutes : null;
        lastGoalNotifyDate =
          typeof parsed.lastGoalNotifyDate === 'string' ? parsed.lastGoalNotifyDate : null;
      }
    }
  } catch {
    days = {};
    opens = {};
  } finally {
    hydrated = true;
    notify();
  }
}

async function persist(): Promise<void> {
  try {
    pruneOld();
    const payload: ScreenTimePersisted = {
      version: SCREEN_TIME_STORAGE_VERSION,
      days,
      opens,
      longestSession,
      goalMinutes,
      lastGoalNotifyDate,
    };
    await AsyncStorage.setItem(SCREEN_TIME_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // kalıcılık kritik değil; sessizce yoksay
  }
}

/** Devam eden oturumu kapatır, süreyi günlere işler, rekorları günceller ve diske yazar. */
function flush(persistToDisk: boolean): void {
  if (sessionStart != null) {
    const now = Date.now();
    const sessionSeconds = (now - sessionStart) / 1000;
    if (sessionSeconds > longestSession) longestSession = sessionSeconds;
    distribute(days, sessionStart, now);
    sessionStart = null;
  }
  if (persistToDisk) void persist();
  void checkGoalNotification();
  notify();
}

function handleAppStateChange(state: AppStateStatus): void {
  const now = Date.now();
  if (state === 'active') {
    if (sessionStart == null) {
      sessionStart = now;
      const resumedFlicker =
        lastBackgroundAt != null && now - lastBackgroundAt < SCREEN_TIME_OPEN_GRACE_MS;
      if (!resumedFlicker) {
        const key = dateKey(now);
        opens[key] = (opens[key] ?? 0) + 1;
      }
    }
    notify();
  } else {
    lastBackgroundAt = now;
    flush(true);
  }
}

/** İzlemeyi başlatır. İdempotent. Uygulama açılışında bir kez çağrılmalı. */
export function startScreenTimeTracking(): void {
  if (started) return;
  started = true;

  void hydrate().then(() => {
    if (AppState.currentState === 'active' && sessionStart != null) {
      // hydrate tamamlanmadan oturum başladıysa açılışı bir kez say
      const key = dateKey(sessionStart);
      if ((opens[key] ?? 0) === 0) opens[key] = 1;
      notify();
    }
  });

  if (AppState.currentState === 'active') {
    sessionStart = Date.now();
  }

  appStateSub = AppState.addEventListener('change', handleAppStateChange);
}

/** İzlemeyi durdurur (test/temizlik için). */
export function stopScreenTimeTracking(): void {
  if (!started) return;
  flush(true);
  appStateSub?.remove();
  appStateSub = null;
  started = false;
}

function buildDays(): ScreenTimeDay[] {
  return Object.entries(days)
    .map(([date, seconds]) => ({ date, seconds: Math.round(seconds) }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Bugünden geriye doğru kesintisiz kullanım günü serisi. */
function computeCurrentStreak(merged: Record<string, number>, todayKey: string): number {
  let streak = 0;
  let cursor = (merged[todayKey] ?? 0) > 0 ? todayKey : prevDayKey(todayKey);
  // Bugün henüz kullanım yoksa seriyi dünden hesapla (bugün açılınca zaten >0 olur).
  while ((merged[cursor] ?? 0) > 0) {
    streak += 1;
    cursor = prevDayKey(cursor);
  }
  return streak;
}

/** Tüm geçmişteki en uzun kesintisiz seri. */
function computeLongestStreak(merged: Record<string, number>): number {
  const usedDays = Object.keys(merged)
    .filter((k) => (merged[k] ?? 0) > 0)
    .sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of usedDays) {
    if (prev != null && prevDayKey(key) === prev) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = key;
  }
  return longest;
}

/** Canlı oturum dahil anlık özet (saf hesaplama). */
export function getScreenTimeSnapshot(): ScreenTimeSnapshot {
  const now = Date.now();
  const merged: Record<string, number> = { ...days };
  if (sessionStart != null) distribute(merged, sessionStart, now);

  const todayKey = dateKey(now);
  const weekCutoff = dateKey(now - 6 * MS_PER_DAY);
  const lastWeekStart = dateKey(now - 13 * MS_PER_DAY);
  const lastWeekEnd = dateKey(now - 7 * MS_PER_DAY);

  let weekSeconds = 0;
  let totalSeconds = 0;
  let lastWeekSeconds = 0;
  let busiestDay: ScreenTimeDay | null = null;

  for (const [key, secondsRaw] of Object.entries(merged)) {
    const seconds = secondsRaw;
    totalSeconds += seconds;
    if (key >= weekCutoff) weekSeconds += seconds;
    if (key >= lastWeekStart && key <= lastWeekEnd) lastWeekSeconds += seconds;
    if (!busiestDay || seconds > busiestDay.seconds) {
      busiestDay = { date: key, seconds: Math.round(seconds) };
    }
  }

  const totalOpens = Object.values(opens).reduce((sum, n) => sum + n, 0);
  const liveLongest = sessionStart != null ? Math.max(longestSession, (now - sessionStart) / 1000) : longestSession;

  const weekCompare: ScreenTimeWeekCompare = {
    thisWeekSeconds: Math.round(weekSeconds),
    lastWeekSeconds: Math.round(lastWeekSeconds),
    deltaPct:
      lastWeekSeconds > 0 ? ((weekSeconds - lastWeekSeconds) / lastWeekSeconds) * 100 : null,
  };

  const goalSeconds = goalMinutes != null ? goalMinutes * 60 : null;

  return {
    todaySeconds: Math.round(merged[todayKey] ?? 0),
    weekSeconds: Math.round(weekSeconds),
    totalSeconds: Math.round(totalSeconds),
    trackedDays: Object.keys(merged).length,
    days: buildDays(),
    todayOpens: opens[todayKey] ?? 0,
    totalOpens,
    averageSessionSeconds: totalOpens > 0 ? Math.round(totalSeconds / totalOpens) : 0,
    longestSessionSeconds: Math.round(liveLongest),
    busiestDay: busiestDay && busiestDay.seconds > 0 ? busiestDay : null,
    currentStreak: computeCurrentStreak(merged, todayKey),
    longestStreak: computeLongestStreak(merged),
    weekCompare,
    goalMinutes,
    goalReachedToday: goalSeconds != null && (merged[todayKey] ?? 0) >= goalSeconds,
  };
}

export function subscribeScreenTime(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Günlük hedefi ayarlar (dakika) veya null ile kapatır. */
export async function setScreenTimeGoal(minutes: number | null): Promise<void> {
  goalMinutes = minutes != null && minutes > 0 ? Math.round(minutes) : null;
  if (goalMinutes == null) lastGoalNotifyDate = null;
  await persist();
  notify();
}

/** Hedef bugün aşıldıysa ve henüz bildirim gönderilmediyse yerel bildirim gönderir. */
export async function checkGoalNotification(): Promise<void> {
  if (goalMinutes == null) return;
  const now = Date.now();
  const todayKey = dateKey(now);
  if (lastGoalNotifyDate === todayKey) return;

  const merged: Record<string, number> = { ...days };
  if (sessionStart != null) distribute(merged, sessionStart, now);
  const todaySeconds = merged[todayKey] ?? 0;
  if (todaySeconds < goalMinutes * 60) return;

  lastGoalNotifyDate = todayKey;
  void persist();

  try {
    const { notifyScreenTimeGoalReached } = await import('@/features/screen-time/services/goalNotifier');
    await notifyScreenTimeGoalReached(goalMinutes);
  } catch {
    // bildirim gönderilemese de izleme etkilenmesin
  }
}

/** Tüm kayıtlı ekran süresi verisini siler (hedef korunur). */
export async function resetScreenTime(): Promise<void> {
  days = {};
  opens = {};
  longestSession = 0;
  lastGoalNotifyDate = null;
  sessionStart = AppState.currentState === 'active' ? Date.now() : null;
  if (sessionStart != null) opens[dateKey(sessionStart)] = 1;
  await persist();
  notify();
}

/** Dışa aktarma için ham veriyi döndürür. */
export function exportScreenTimeData(): ScreenTimePersisted {
  return {
    version: SCREEN_TIME_STORAGE_VERSION,
    days: { ...days },
    opens: { ...opens },
    longestSession,
    goalMinutes,
    lastGoalNotifyDate,
  };
}
