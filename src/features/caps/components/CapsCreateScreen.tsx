import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getVideoMetaData } from 'react-native-compressor';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { CapLoopVideo } from '@/features/caps/components/CapLoopVideo';
import {
  CAP_VIDEO_DURATION_SEC,
} from '@/features/caps/constants';
import {
  createCapFromLocalUri,
  createCapFromLocalVideoUri,
} from '@/features/caps/services/capsData';
import {
  editCapVideo,
} from '@/features/caps/services/capVideoEditor';
import {
  isCapDurationAllowed,
  normalizeVideoDurationMs,
  resolveCapDurationMs,
} from '@/features/caps/services/capDuration';
import type { CapMediaKind } from '@/features/caps/types';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function CapsCreateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<CapMediaKind | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const acceptVideo = async (pickedUri: string, durationMsHint?: number | null) => {
    try {
      const stable = await prepareLocalVideoUri(normalizeLocalFileUri(pickedUri));
      const meta = await getVideoMetaData(stable);
      const probedMs = normalizeVideoDurationMs(Number(meta?.duration ?? 0));
      const resolvedMs = resolveCapDurationMs(durationMsHint, probedMs);

      if (!isCapDurationAllowed(resolvedMs)) {
        Alert.alert(
          '3 saniye sınırı',
          'Seçilen bölüm 3 saniyeden uzun. Editörde 3 saniyelik bir aralık seçip tekrar deneyin.',
        );
        return;
      }

      const width = Number(meta?.width ?? 0);
      const height = Number(meta?.height ?? 0);
      if (width > 0 && height > 0) {
        setAspectRatio(Math.min(2, Math.max(0.5, width / height)));
      }
      setDurationMs(resolvedMs);
      setMediaKind('video');
      setUri(stable);
    } catch (err) {
      Alert.alert('Hata', String(err));
    }
  };

  const acceptImage = (
    pickedUri: string,
    width?: number | null,
    height?: number | null,
  ) => {
    if (width && height) {
      setAspectRatio(Math.min(2, Math.max(0.5, width / height)));
    }
    setDurationMs(null);
    setMediaKind('image');
    setUri(normalizeLocalFileUri(pickedUri));
  };

  const editPickedVideo = async (pickedUri: string) => {
    try {
      const stable = await prepareLocalVideoUri(normalizeLocalFileUri(pickedUri), {
        forceCopy: true,
      });
      const result = await editCapVideo(stable);
      if (result) {
        await acceptVideo(result.outputPath, result.durationMs);
      }
    } catch (err) {
      Alert.alert(
        'Video düzenleyici açılamadı',
        `${String(err)}\n\nYeni native modül için development build’i yeniden oluşturun.`,
      );
    }
  };

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Caps oluşturmak için galeri erişimine izin verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.92,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    acceptImage(asset.uri, asset.width, asset.height);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Caps çekmek için kamera izni verin.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.92,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    acceptImage(asset.uri, asset.width, asset.height);
  };

  const pickVideoFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Caps oluşturmak için galeri erişimine izin verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    await editPickedVideo(result.assets[0].uri);
  };

  const recordVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Caps çekmek için kamera izni verin.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      videoMaxDuration: CAP_VIDEO_DURATION_SEC,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    await editPickedVideo(result.assets[0].uri);
  };

  const handlePick = () => {
    Alert.alert('Caps oluştur', 'Resim veya 3 sn video seçin.', [
      { text: 'Resim (galeri)', onPress: () => void pickImageFromGallery() },
      { text: 'Fotoğraf çek', onPress: () => void takePhoto() },
      { text: 'Video (galeri)', onPress: () => void pickVideoFromGallery() },
      { text: 'Video çek (3 sn)', onPress: () => void recordVideo() },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Giriş gerekli');
      return;
    }
    if (!uri || !mediaKind) {
      Alert.alert('Medya seçin', 'Önce bir resim veya 3 saniyelik video seçin.');
      return;
    }
    setSaving(true);
    const result =
      mediaKind === 'video'
        ? await createCapFromLocalVideoUri(user.id, uri, title.trim() || null, durationMs)
        : await createCapFromLocalUri(user.id, uri, title.trim() || null);
    setSaving(false);
    if (result.error || !result.cap) {
      Alert.alert('Hata', result.error ?? 'Caps oluşturulamadı');
      return;
    }
    Alert.alert('Hazır', 'Caps kütüphanenize ve keşfe eklendi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
        <AuthHeader title="Caps Oluştur" />
        <View style={styles.body}>
          <Pressable
            onPress={handlePick}
            style={[
              styles.preview,
              { aspectRatio, backgroundColor: 'transparent' },
            ]}
          >
            {uri && mediaKind === 'video' ? (
              <CapLoopVideo videoUrl={uri} style={styles.image} contentFit="contain" />
            ) : uri && mediaKind === 'image' ? (
              <Image source={{ uri }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="images-outline" size={36} color={colors.textMuted} />
                <Text secondary>Resim veya video seç</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.kindRow}>
            <Pressable
              onPress={() => void pickImageFromGallery()}
              style={[styles.kindBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                Resim
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void pickVideoFromGallery()}
              style={[styles.kindBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="videocam-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                Video (3 sn)
              </Text>
            </Pressable>
          </View>

          <Text variant="caption" secondary style={styles.hint}>
            Videoda istediğiniz 3 saniyelik bölümü seçin; kırpma aracıyla ölçüyü
            serbestçe yatay, kare veya dikey ayarlayın. Resimler kendi ölçüsünü korur.
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
            placeholder="Başlık (isteğe bağlı)"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <Pressable
            onPress={() => void handleSave()}
            disabled={saving || !uri}
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: saving || !uri ? 0.5 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Kaydet</Text>
            )}
          </Pressable>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  preview: {
    width: '100%',
    maxHeight: 360,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 240,
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kindBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  hint: {
    textAlign: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  saveBtn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
