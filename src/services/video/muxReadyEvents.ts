type MuxReadyListener = (videoId: string) => void;

const listeners = new Set<MuxReadyListener>();

export function subscribeMuxVideoReady(listener: MuxReadyListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitMuxVideoReady(videoId: string): void {
  listeners.forEach((listener) => listener(videoId));
}
