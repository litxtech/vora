import { captureRef } from 'react-native-view-shot';
import type { View } from 'react-native';

export async function bakeStoryFramedImage(captureTarget: View | null): Promise<string> {
  if (!captureTarget) {
    throw new Error('Önizleme hazır değil.');
  }

  return captureRef(captureTarget, {
    format: 'jpg',
    quality: 0.92,
    result: 'tmpfile',
  });
}
