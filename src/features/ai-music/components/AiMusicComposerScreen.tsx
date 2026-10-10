import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import {
  AI_MUSIC_DAILY_LIMIT,
  AI_MUSIC_MAX_SEC,
  AI_MUSIC_MIN_SEC,
  AI_MUSIC_VOCALS,
  formatAiMusicAllowance,
  formatAiMusicClock,
} from '@/features/ai-music/constants';
import { useAiMusicVoiceRecorder } from '@/features/ai-music/hooks/useAiMusicVoiceRecorder';
import { fetchAiMusicBalance } from '@/features/ai-music/services/aiMusicMinutes';
import {
  pickAiMusicReference,
  uploadAiMusicVoiceRecording,
  type AiMusicReferenceFile,
} from '@/features/ai-music/services/referenceUpload';
import { startAiMusicGeneration } from '@/features/ai-music/services/aiMusicData';
import { armAiMusicJobs } from '@/features/ai-music/services/aiMusicJobs';
import type { AiMusicBalance, AiMusicVocal } from '@/features/ai-music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function AiMusicComposerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [vocal, setVocal] = useState<AiMusicVocal>('instrumental');
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [reference, setReference] = useState<AiMusicReferenceFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [balance, setBalance] = useState<AiMusicBalance | null>(null);
  const voice = useAiMusicVoiceRecorder();

  const durationSec = Math.min(AI_MUSIC_MAX_SEC, minutes * 60 + seconds);
  const uploadedFile = reference != null && reference.source !== 'recording';
  const showLyrics = !uploadedFile && (vocal !== 'instrumental' || reference?.source === 'recording');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void fetchAiMusicBalance().then((next) => {
        if (!active || !next) return;
        setBalance(next);
        if (next.availableSec <= 0) router.replace('/sounds/ai/packages' as Href);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const shift = (unit: 'min' | 'sec', delta: number) => {
    if (unit === 'min') {
      const next = Math.max(0, Math.min(3, minutes + delta));
      setMinutes(next);
      if (next === 3) setSeconds(0);
      return;
    }
    const cap = minutes >= 3 ? 0 : 55;
    const next = Math.max(0, Math.min(cap, seconds + delta));
    setSeconds(next);
  };

  const attach = async (kind: 'audio' | 'video') => {
    setUploading(true);
    const result = await pickAiMusicReference(kind);
    setUploading(false);
    if (result.error) {
      Alert.alert('Dosya eklenemedi', result.error);
      return;
    }
    if (result.file) setReference(result.file);
  };

  const useVoiceRecording = async () => {
    if (!voice.uri) return;
    if (voice.durationSec < 2) {
      Alert.alert('Kayıt kısa', 'Sözünü veya ezgini en az 2 saniye söyle.');
      return;
    }
    setUploading(true);
    const result = await uploadAiMusicVoiceRecording(voice.uri, voice.durationSec);
    setUploading(false);
    if (result.error || !result.file) {
      Alert.alert('Kayıt yüklenemedi', result.error ?? 'Ses kaydı gönderilemedi.');
      return;
    }
    setReference(result.file);
    await voice.discard();
  };

  const handleCreate = () => {
    if (!user) {
      Alert.alert('Giriş gerekli', 'Müzik üretmek için hesabına gir.');
      return;
    }
    if (durationSec < AI_MUSIC_MIN_SEC) {
      Alert.alert('Süre kısa', 'Parça en az 10 saniye olmalı.');
      return;
    }
    if (uploadedFile && prompt.trim().length < 8) {
      Alert.alert('Prompt gerekli', 'Ses dosyası üslubu taşır. Parçanın nasıl olacağını kısaca yaz.');
      return;
    }
    if (prompt.trim().length < 8 && lyrics.trim().length < 8 && !reference) {
      Alert.alert('Tarif gerekli', 'Ne istediğini yaz, sözlerini söyle veya bir ses yükle.');
      return;
    }
    if (voice.phase === 'recording') {
      Alert.alert('Kayıt sürüyor', 'Önce kaydı bitir.');
      return;
    }
    if (!balance || durationSec > balance.availableSec) {
      router.push('/sounds/ai/packages' as Href);
      return;
    }

    armAiMusicJobs();
    startAiMusicGeneration({
      title: title.trim() || undefined,
      prompt: prompt.trim(),
      style: 'serbest',
      durationSec,
      vocal,
      lyrics: showLyrics ? lyrics.trim() : undefined,
      referenceStoragePath: reference?.path,
      referenceName: reference?.name,
      referenceKind: reference?.kind,
      referenceSource: reference?.source,
      referenceDurationSec: reference?.durationSec,
    });
    router.replace('/sounds/ai' as Href);
  };

  return (
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <ScreenBackButton />
          <Text variant="label">Yeni parça</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={['#0B3A4A', '#0E7490', '#14B8A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}>
              <Ionicons name="sparkles" size={16} color="#ECFEFF" />
              <Text style={styles.heroKicker}>Vora Müzik</Text>
            </View>
            <Text style={styles.heroTitle}>Prompttan parça</Text>
            <Text style={styles.heroBody}>
              Ne istediğini yaz. İstersen bir ses ekle; söz gerekmez, prompt yeter.
            </Text>
          </LinearGradient>

          <Field label="Ad">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Parça adı"
              placeholderTextColor={colors.textMuted}
              maxLength={120}
              style={[styles.input, inputColors(colors)]}
            />
          </Field>

          <Field label="Prompt">
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Örnek: yağmur altında yavaş kemençe, sonra horon temposuna yükselsin"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={800}
              style={[styles.input, styles.prompt, inputColors(colors)]}
            />
          </Field>

          <Field label="Ses">
            <View style={styles.vocalRow}>
              {AI_MUSIC_VOCALS.map((item) => {
                const active = vocal === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setVocal(item.id)}
                    style={[
                      styles.vocalChip,
                      {
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? `${colors.accent}18` : colors.surface,
                      },
                    ]}
                  >
                    <Text variant="caption" style={{ fontWeight: '700', color: active ? colors.accent : colors.text }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text secondary variant="caption" style={{ marginTop: 6 }}>
              {uploadedFile
                ? 'Ses dosyası bağlı. Parçayı prompt belirler.'
                : reference?.source === 'recording'
                  ? 'Ses kaydın ezgiyi taşır. Kadın veya erkek seçimi okuyuşu belirler.'
                  : AI_MUSIC_VOCALS.find((item) => item.id === vocal)?.hint}
            </Text>
          </Field>

          {showLyrics ? (
            <Field label="Şarkı sözü">
              <TextInput
                value={lyrics}
                onChangeText={setLyrics}
                placeholder={
                  reference?.source === 'recording'
                    ? 'Söylediğin sözleri buraya da yazabilirsin. Boşsa kayıttaki sözler kullanılır.'
                    : 'Her satır bir dize. Boş bırakırsan sözler tariften yazılır.'
                }
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={2000}
                style={[styles.input, styles.prompt, inputColors(colors)]}
              />
            </Field>
          ) : null}

          <Field label="Süre">
            <View style={[styles.clock, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Stepper label="Dakika" value={minutes} onMinus={() => shift('min', -1)} onPlus={() => shift('min', 1)} />
              <Text variant="title">{formatAiMusicClock(durationSec)}</Text>
              <Stepper label="Saniye" value={seconds} onMinus={() => shift('sec', -5)} onPlus={() => shift('sec', 5)} />
            </View>
            <Text secondary variant="caption">En az 0:10, en fazla 3:00. Üretirken ve düzenlerken dakika düşmez.</Text>
          </Field>

          <Field label="Referans">
            {voice.phase === 'idle' ? (
              <View style={styles.fileRow}>
                <Pressable
                  onPress={() => void voice.start()}
                  disabled={uploading}
                  style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Ionicons name="mic" size={15} color={colors.accent} />
                  <Text variant="caption">Sesin</Text>
                </Pressable>
                <Pressable
                  onPress={() => void attach('audio')}
                  disabled={uploading}
                  style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Ionicons name="musical-note" size={15} color={colors.accent} />
                  <Text variant="caption">Ses dosyası</Text>
                </Pressable>
                <Pressable
                  onPress={() => void attach('video')}
                  disabled={uploading}
                  style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Ionicons name="film" size={15} color={colors.accent} />
                  <Text variant="caption">Video</Text>
                </Pressable>
              </View>
            ) : null}
            {voice.phase === 'recording' ? (
              <View style={[styles.recordLive, { borderColor: colors.danger, backgroundColor: colors.surface }]}>
                <View style={[styles.recordDot, { backgroundColor: colors.danger }]} />
                <Text style={{ flex: 1, fontWeight: '700' }}>{voice.elapsedLabel}</Text>
                <Pressable onPress={() => void voice.stop()} style={[styles.stepBtn, { borderColor: colors.danger }]}>
                  <Ionicons name="stop" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ) : null}
            {voice.phase === 'preview' ? (
              <View style={[styles.fileChip, { backgroundColor: `${colors.accent}14` }]}>
                <Pressable onPress={() => void voice.togglePlayback()} hitSlop={8}>
                  <Ionicons name={voice.playing ? 'pause' : 'play'} size={18} color={colors.accent} />
                </Pressable>
                <Text style={{ flex: 1, fontWeight: '700' }}>Kaydın · {voice.elapsedLabel}</Text>
                <Pressable onPress={() => void voice.discard()} hitSlop={8}>
                  <Text secondary variant="caption">Sil</Text>
                </Pressable>
                <Pressable onPress={() => void useVoiceRecording()} disabled={uploading}>
                  <Text variant="caption" style={{ color: colors.accent, fontWeight: '800' }}>Kullan</Text>
                </Pressable>
              </View>
            ) : null}
            {voice.phase === 'idle' ? (
              <Text secondary variant="caption" style={{ marginTop: 6 }}>
                {uploadedFile
                  ? 'Yüklenen ses yalnızca üslup ve tempo için. Söz yazmana gerek yok.'
                  : `İsteğe bağlı. Kayıt en fazla ${voice.maxLabel}.`}
              </Text>
            ) : null}
            {reference ? (
              <View style={[styles.fileChip, { backgroundColor: `${colors.accent}14` }]}>
                <Text numberOfLines={1} style={{ flex: 1 }}>
                  {reference.source === 'recording'
                    ? 'Ses kaydın bağlı'
                    : reference.kind === 'video'
                      ? `Videodaki ses · ${reference.name}`
                      : `Ses dosyası · ${reference.name}`}
                </Text>
                <Pressable onPress={() => setReference(null)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>
            ) : null}
          </Field>

          <Pressable onPress={() => router.push('/sounds/ai/packages' as Href)} style={styles.allowance}>
            <Text variant="caption">
              Kalan hak {balance ? formatAiMusicAllowance(balance.availableSec) : '…'}
            </Text>
            <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>Dakika al</Text>
          </Pressable>
          <Text secondary variant="caption" style={{ marginBottom: spacing.md }}>
            Günde {AI_MUSIC_DAILY_LIMIT} üretim. Dakika yalnızca onayda düşer. Kütüphane ayrı adımdır.
          </Text>
          <Button
            title={uploading ? 'Dosya hazırlanıyor' : 'Üret'}
            size="compact"
            loading={uploading}
            onPress={handleCreate}
          />
        </KeyboardAwareScrollView>
      </View>
    </GradientBackground>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text variant="label" style={{ marginBottom: spacing.sm }}>{label}</Text>
      {children}
    </View>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepper}>
      <Text secondary variant="caption">{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={onMinus} style={[styles.stepBtn, { borderColor: colors.border }]}>
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
        <Text style={{ minWidth: 24, textAlign: 'center', fontWeight: '700' }}>{value}</Text>
        <Pressable onPress={onPlus} style={[styles.stepBtn, { borderColor: colors.border }]}>
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function inputColors(colors: { text: string; border: string; surface: string }) {
  return { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface };
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  hero: { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroKicker: { color: '#CCFBF1', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  heroTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '800' },
  heroBody: { color: '#E6FFFA', lineHeight: 18, fontSize: 13 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  prompt: { minHeight: 88, textAlignVertical: 'top' },
  vocalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vocalChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  allowance: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepper: { alignItems: 'center', gap: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordLive: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  fileRow: { flexDirection: 'row', gap: 8 },
  fileBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fileChip: {
    marginTop: 8,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
