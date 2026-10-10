let armedUntil = 0;
const listeners = new Set<() => void>();

export function armAiMusicJobs(): void {
  armedUntil = Date.now() + 15 * 60 * 1000;
  listeners.forEach((listener) => listener());
}

export function aiMusicJobsArmed(): boolean {
  return Date.now() < armedUntil;
}

export function subscribeAiMusicJobs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
