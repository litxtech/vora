import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC } from '@/features/live-support/constants';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';

export type LiveSupportPickedVideo = {
  uri: string;
  durationSec: number;
};

function openVideoTrimmer(uri: string) {
  router.push({
    pathname: '/vora-studio',
    params: { sourceUri: uri, mode: 'live-support' },
  } as never);
}

export async function pickLiveSupportVideoFromLibrary(): Promise<LiveSupportPickedVideo | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('İzin gerekli', 'Video göndermek için galeri erişimine izin verin.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    quality: 1,
    allowsMultipleSelection: false,
    copyToCacheDirectory: true,
    videoMaxDuration: LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;

  const asset = result.assets[0];
  const durationMs = asset.duration ?? 0;
  let durationSec = durationMs > 0 ? durationMs / 1000 : 0;

  if (durationSec <= 0) {
    durationSec = await probeVideoDuration(asset.uri);
  }

  if (durationSec > LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC + 0.35) {
    return new Promise((resolve) => {
      Alert.alert(
        'Video çok uzun',
        `Canlı destek videoları en fazla ${LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC} saniye olabilir. Kırpma ekranında istediğiniz bölümü seçin.`,
        [
          { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Kırp',
            onPress: () => {
              openVideoTrimmer(asset.uri);
              resolve(null);
            },
          },
        ],
      );
    });
  }

  return { uri: asset.uri, durationSec };
}

export async function pickLiveSupportImageFromLibrary(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('İzin gerekli', 'Görsel göndermek için galeri erişimine izin verin.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}
