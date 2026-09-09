import { CAP_VIDEO_DURATION_SEC } from '@/features/caps/constants';

export type CapVideoEditorResult = {
  outputPath: string;
  durationMs: number;
};

/**
 * Seçilen videoyu gerçek çıktı üreten 3 sn editörde açar; crop serbesttir.
 * Native modül eski development build'de yoksa dinamik import reddedilir,
 * uygulamanın geri kalanı açılmaya devam eder.
 */
export async function editCapVideo(
  localUri: string,
): Promise<CapVideoEditorResult | null> {
  const { default: VideoTrim, showEditor } = await import('react-native-video-trim');

  return new Promise((resolve, reject) => {
    const subscriptions: Array<{ remove: () => void }> = [];
    const cleanup = () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
    subscriptions.push(
      VideoTrim.onFinishTrimming(({ outputPath, duration, startTime, endTime }) => {
        cleanup();
        const fromRange =
          Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
            ? Math.round(endTime - startTime)
            : 0;
        const fromDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
        // Aralık farkı ile duration arasında tutarlı olanı seç (ms).
        const durationMs =
          fromRange > 0 && fromRange <= CAP_VIDEO_DURATION_SEC * 1000 + 1500
            ? fromRange
            : fromDuration > 0
              ? fromDuration
              : fromRange;
        resolve({ outputPath, durationMs });
      }),
      VideoTrim.onCancel(() => {
        cleanup();
        resolve(null);
      }),
      VideoTrim.onError(({ message }) => {
        cleanup();
        reject(new Error(message));
      }),
    );

    try {
      showEditor(localUri, {
        type: 'video',
        outputExt: 'mp4',
        maxDuration: CAP_VIDEO_DURATION_SEC * 1000,
        minDuration: 500,
        autoplay: true,
        enableEditTools: true,
        enablePreciseTrimming: true,
        closeWhenFinish: true,
        fullScreenModalIOS: true,
        enableSaveDialog: false,
        enableCancelDialog: true,
        saveToPhoto: false,
        headerText: 'Caps bölümünü seç ve kırp',
        saveButtonText: 'Kullan',
        cancelButtonText: 'Vazgeç',
        trimmingText: 'Caps hazırlanıyor…',
        trimmerColor: '#0EA5E9',
        durationFormat: 'mm:ss.SSS',
      });
    } catch (cause) {
      cleanup();
      reject(cause);
    }
  });
}
