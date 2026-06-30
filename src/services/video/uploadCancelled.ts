export class UploadCancelledError extends Error {
  constructor(message = 'Yükleme iptal edildi.') {
    super(message);
    this.name = 'UploadCancelledError';
  }
}

export function isUploadCancelledError(err: unknown): boolean {
  if (err instanceof UploadCancelledError) return true;
  if (err instanceof Error) {
    return err.name === 'UploadCancelledError' || err.name === 'AbortError';
  }
  return false;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new UploadCancelledError();
  }
}
