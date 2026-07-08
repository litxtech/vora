import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { fetchSoundById, updateSound } from '@/features/sounds/services/soundData';
import type { SoundPrivacy } from '@/features/sounds/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 280;

function hapticMedium() {
  if (Platform.OS === 'android') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function SoundEditScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const soundId = Array.isArray(id) ? id[0] : id;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<SoundPrivacy>('public');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);

  const heroColors = isDark
    ? (['#1e1b4b', '#581c87', '#9d174d'] as const)
    : (['#4338ca', '#7c3aed', '#db2777'] as const);

  useEffect(() => {
    if (!soundId) return;
    void fetchSoundById(soundId).then((sound) => {
      if (!sound) {
        setLoading(false);
        return;
      }
      if (sound.authorId !== user?.id) {
        Alert.alert('Yetkisiz', 'Bu sesi yalnızca sahibi düzenleyebilir.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        setLoading(false);
        return;
      }
      setTitle(sound.title);
      setDescription(sound.description ?? '');
      setPrivacy(sound.privacy);
      setExistingCoverUrl(sound.coverUrl);
      setDurationSec(sound.durationSec);
      setLoading(false);
    });
  }, [soundId, user?.id]);

  const pickCover = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCoverUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id || !soundId) return;
    if (!title.trim()) {
      Alert.alert('Eksik bilgi', 'Ses adı gerekli.');
      return;
    }

    setSaving(true);
    const result = await updateSound(soundId, user.id, {
      title: title.trim(),
      description: description.trim() || null,
      privacy,
      coverLocalUri: coverUri,
    });
    setSaving(false);

    if (result.error || !result.sound) {
      Alert.alert('Kaydedilemedi', result.error ?? 'Ses güncellenemedi.');
      return;
    }

    hapticMedium();
    Alert.alert(
      'Güncellendi',
      privacy === 'public'
        ? 'Ses bilgileri güncellendi ve müzik kütüphanesinde görünür.'
        : 'Ses bilgileri güncellendi.',
      [{ text: 'Tamam', onPress: () => router.replace(`/sounds/${soundId}`) }],
    );
  }, [coverUri, description, privacy, soundId, title, user?.id]);

  const coverPreview = coverUri ?? existingCoverUrl;

  return (
    <GradientBackground>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <ScreenBackButton />
          <Text variant="label" style={styles.topTitle}>
            Sesi Düzenle
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <KeyboardAwareScrollView
              contentContainerStyle={[styles.content, { paddingBottom: spacing.xl }]}
              keyboardShouldPersistTaps="handled"
              bottomOffset={120}
            >
              <GlassCard style={styles.previewCard}>
                <Pressable onPress={() => void pickCover()} style={[styles.coverBox, { borderColor: colors.border }]}>
                  {coverPreview ? (
                    <Image source={{ uri: coverPreview }} style={styles.coverImage} />
                  ) : (
                    <LinearGradient colors={[...heroColors]} style={styles.coverFallback}>
                      <Ionicons name="musical-notes" size={28} color="#fff" />
                    </LinearGradient>
                  )}
                  <View style={[styles.coverEdit, { backgroundColor: colors.surface }]}>
                    <Ionicons name="camera-outline" size={14} color={colors.text} />
                  </View>
                </Pressable>
                <Text secondary variant="caption" style={styles.durationHint}>
                  Ses dosyası değiştirilemez · {durationSec}s
                </Text>
              </GlassCard>

              <View style={styles.fieldBlock}>
                <View style={styles.fieldHeader}>
                  <Text variant="caption" secondary>
                    Ses Adı
                  </Text>
                  <Text variant="caption" secondary>
                    {title.length}/{TITLE_MAX}
                  </Text>
                </View>
                <TextInput
                  value={title}
                  onChangeText={(value) => setTitle(value.slice(0, TITLE_MAX))}
                  placeholder="Ses adı"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldBlock}>
                <View style={styles.fieldHeader}>
                  <Text variant="caption" secondary>
                    Açıklama (isteğe bağlı)
                  </Text>
                  <Text variant="caption" secondary>
                    {description.length}/{DESCRIPTION_MAX}
                  </Text>
                </View>
                <TextInput
                  value={description}
                  onChangeText={(value) => setDescription(value.slice(0, DESCRIPTION_MAX))}
                  placeholder="Bu ses hakkında kısa bir not"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
              </View>

              <Text variant="caption" secondary>
                Gizlilik
              </Text>
              <View style={styles.privacyRow}>
                {([
                  {
                    id: 'public' as const,
                    title: 'Herkese Açık',
                    subtitle: 'Müzik kütüphanesinde herkes kullanabilir',
                    icon: 'earth-outline' as const,
                  },
                  {
                    id: 'private' as const,
                    title: 'Sadece Ben',
                    subtitle: 'Yalnızca sen görebilirsin',
                    icon: 'lock-closed-outline' as const,
                  },
                ]).map((option) => {
                  const active = privacy === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setPrivacy(option.id)}
                      style={[
                        styles.privacyCard,
                        {
                          borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? `${colors.accent}10` : colors.surface,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={active ? colors.accent : colors.textSecondary}
                      />
                      <Text variant="label" style={{ color: active ? colors.accent : colors.text }}>
                        {option.title}
                      </Text>
                      <Text secondary variant="caption">
                        {option.subtitle}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </KeyboardAwareScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: insets.bottom + spacing.md,
                  backgroundColor: colors.background,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Button
                title={saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
                loading={saving}
                onPress={() => void handleSave()}
              />
            </View>
          </>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topTitle: { fontWeight: '800' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md },
  previewCard: { alignItems: 'center', gap: spacing.sm },
  coverBox: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverEdit: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationHint: { textAlign: 'center' },
  fieldBlock: { gap: spacing.xs },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  privacyRow: { flexDirection: 'row', gap: spacing.sm },
  privacyCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
