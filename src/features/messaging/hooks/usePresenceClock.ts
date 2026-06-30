import { useSyncExternalStore } from 'react';

let tick = 0;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;
const DEFAULT_INTERVAL_MS = 30_000;

function notifyPresenceClock(): void {
  tick += 1;
  for (const listener of listeners) listener();
}

function subscribePresenceClock(listener: () => void): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  if (!intervalId) {
    intervalId = setInterval(notifyPresenceClock, DEFAULT_INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    subscriberCount -= 1;
    if (subscriberCount <= 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getPresenceClockSnapshot(): number {
  return tick;
}

/** Göreli son görülme metninin akması için tek paylaşımlı periyodik yenileme. */
export function usePresenceClock(_intervalMs = DEFAULT_INTERVAL_MS): number {
  return useSyncExternalStore(subscribePresenceClock, getPresenceClockSnapshot, getPresenceClockSnapshot);
}
