import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { defaultSoundTitle, MAX_SOUND_DURATION_SEC } from '@/features/sounds/constants';
import { useSoundRecorder } from '@/features/sounds/hooks/useSoundRecorder';
import { publishSound } from '@/features/sounds/services/soundData';
import type { SoundPrivacy } from '@/features/sounds/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type Step = 'record' | 'details';

export function SoundCreateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const recorder = useSoundRecorder();

  const [step, setStep] = useState<Step>('record');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<SoundPrivacy>('public');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const suggestedTitle = defaultSoundTitle(profile?.username ?? 'kullanici');

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

  const goToDetails = useCallback(() => {
    if (!recorder.recordedUri) {
      Alert.alert('Kayıt yok', 'Önce ses kaydı yapın veya önizleyin.');
      return;
    }
    if (!title.trim()) setTitle(suggestedTitle);
    setStep('details');
  }, [recorder.recordedUri, suggestedTitle, title]);

  const handlePublish = useCallback(async () => {
    if (!user?.id || !recorder.recordedUri) return;

    setPublishing(true);
    const result = await publishSound(user.id, profile?.username ?? 'kullanici', {
      title: title.trim() || suggestedTitle,
      description: description.trim() || null,
      privacy,
      localAudioUri: recorder.recordedUri,
      durationSec: recorder.recordedDurationSec,
      coverLocalUri: coverUri,
    });
    setPublishing(false);

    if (result.error || !result.sound) {
      Alert.alert('Paylaşılamadı', result.error ?? 'Ses yüklenemedi.');
      return;
    }

    Alert.alert('Ses paylaşıldı', 'Sesin artık içeriklerde kullanılabilir.', [
      { text: 'Tamam', onPress: () => router.replace(`/sounds/${result.sound!.id}`) },
    ]);
  }, [
    coverUri,
    description,
    privacy,
    profile?.username,
    recorder.recordedDurationSec,
    recorder.recordedUri,
    suggestedTitle,
    title,
    user?.id,
  ]);

  return (
    <GradientBackground>
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <ScreenBackButton />
          <Text variant="label" style={styles.topTitle}>
            Ses Oluştur
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'record' ? (
            <>
              <LinearGradient colors={['#312e81', '#581c87', '#831843']} style={styles.hero}>
                <View style={styles.timerRing}>
                  <Text style={styles.timerText}>{recorder.elapsedLabel}</Text>
                  <Text style={styles.timerSub}> / {MAX_SOUND_DURATION_SEC}s</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <View style={[styles.progressFill, { width: `${recorder.progress * 100}%` }]} />
                </View>
                <Text style={styles.heroHint}>
                  {recorder.phase === 'recording'
                    ? 'Kayıt devam ediyor…'
                    : recorder.phase === 'paused'
                      ? 'Kayıt duraklatıldı'
                      : recorder.phase === 'preview'
                        ? 'Önizleme hazır'
                        : 'Kayda başlamak için mikrofona dokunun'}
                </Text>
              </LinearGradient>

              <View style={styles.controls}>
                {recorder.phase === 'idle' ? (
                  <Pressable onPress={() => void recorder.startRecording()} style={styles.mainBtn}>
                    <Ionicons name="mic" size={28} color="#fff" />
                  </Pressable>
                ) : null}

                {recorder.phase === 'recording' ? (
                  <>
                    <Pressable onPress={recorder.pauseRecording} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                      <Ionicons name="pause" size={22} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={() => void recorder.stopRecording()} style={styles.mainBtn}>
                      <Ionicons name="stop" size={24} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => void recorder.cancelRecording()} style={[styles.secondaryBtn, { borderColor: colors.danger }]}>
                      <Ionicons name="close" size={22} color={colors.danger} />
                    </Pressable>
                  </>
                ) : null}

                {recorder.phase === 'paused' ? (
                  <>
                    <Pressable onPress={recorder.resumeRecording} style={styles.mainBtn}>
                      <Ionicons name="play" size={24} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => void recorder.stopRecording()} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                      <Ionicons name="stop" size={22} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={() => void recorder.cancelRecording()} style={[styles.secondaryBtn, { borderColor: colors.danger }]}>
                      <Ionicons name="trash-outline" size={22} color={colors.danger} />
                    </Pressable>
                  </>
                ) : null}

                {recorder.phase === 'preview' ? (
                  <>
                    <Pressable onPress={() => void recorder.togglePreview()} style={styles.mainBtn}>
                      <Ionicons name={recorder.previewPlaying ? 'pause' : 'play'} size={24} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => void recorder.resetForRetake()} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                      <Ionicons name="refresh" size={22} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={goToDetails} style={[styles.secondaryBtn, { borderColor: colors.accent, backgroundColor: `${colors.accent}18` }]}>
                      <Ionicons name="arrow-forward" size={22} color={colors.accent} />
                    </Pressable>
                  </>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <Text variant="title" style={styles.sectionTitle}>
                Ses Bilgileri
              </Text>

              <Pressable onPress={() => void pickCover()} style={[styles.coverPicker, { borderColor: colors.border }]}>
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.coverImage} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                    <Text secondary variant="caption">
                      Kapak görseli (isteğe bağlı)
                    </Text>
                  </>
                )}
              </Pressable>

              <Text variant="caption" secondary style={styles.fieldLabel}>
                Ses Adı
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={suggestedTitle}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />

              <Text variant="caption" secondary style={styles.fieldLabel}>
                Açıklama (isteğe bağlı)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Bu ses hakkında kısa bir not"
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />

              <Text variant="caption" secondary style={styles.fieldLabel}>
                Gizlilik
              </Text>
              <View style={styles.privacyRow}>
                {(['public', 'private'] as const).map((option) => {
                  const active = privacy === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setPrivacy(option)}
                      style={[
                        styles.privacyChip,
                        {
                          borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? `${colors.accent}18` : colors.surface,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option === 'public' ? 'earth-outline' : 'lock-closed-outline'}
                        size={16}
                        color={active ? colors.accent : colors.textSecondary}
                      />
                      <Text variant="caption" style={{ color: active ? colors.accent : colors.textSecondary }}>
                        {option === 'public' ? 'Herkese Açık' : 'Sadece Ben'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.detailActions}>
                <Button variant="ghost" onPress={() => setStep('record')}>
                  Yeniden Kaydet
                </Button>
                <Button onPress={() => void handlePublish()} disabled={publishing}>
                  {publishing ? 'Paylaşılıyor…' : 'Paylaş'}
                </Button>
              </View>

              {publishing ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} /> : null}
            </>
          )}
        </ScrollView>
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
  topTitle: { fontWeight: '700' },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  timerRing: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timerText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    marginBottom: 8,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 999,
  },
  heroHint: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  mainBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontWeight: '800' },
  coverPicker: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: spacing.xs,
  },
  coverImage: { width: '100%', height: '100%' },
  fieldLabel: { marginBottom: -spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  privacyChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  detailActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
