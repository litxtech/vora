import { Image } from 'react-native';
import { ImageManipulator, manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

/** EXIF yönü uygulanmış gerçek piksel boyutu — selfie yamulmasını önler. */
export async function getOrientedImageSize(uri: string): Promise<{ width: number; height: number }> {
  try {
    const context = ImageManipulator.manipulate(uri);
    const image = await context.renderAsync();
    const size = { width: image.width, height: image.height };
    image.release();
    context.release();
    if (size.width > 0 && size.height > 0) return size;
  } catch {
    // renderAsync başarısız — aşağıdaki yöntemlere düş.
  }

  try {
    const normalized = await manipulateAsync(uri, [], {
      compress: 1,
      format: SaveFormat.JPEG,
    });
    if (normalized.width > 0 && normalized.height > 0) {
      return { width: normalized.width, height: normalized.height };
    }
  } catch {
    // getImageSize'a düş.
  }

  return getImageSize(uri);
}

export async function cropImageSquare(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const size = Math.min(width, height);
  const originX = Math.floor((width - size) / 2);
  const originY = Math.floor((height - size) / 2);
  const result = await manipulateAsync(
    uri,
    [{ crop: { originX, originY, width: size, height: size } }],
    { compress: 0.9, format: SaveFormat.JPEG },
  );
  return result.uri;
}

export async function rotateImage(uri: string, rotationDeg: number): Promise<string> {
  if (!rotationDeg) return uri;
  const result = await manipulateAsync(
    uri,
    [{ rotate: rotationDeg }],
    { compress: 0.9, format: SaveFormat.JPEG },
  );
  return result.uri;
}
