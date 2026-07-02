import { useCallback, useMemo, useState } from 'react';
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
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { SoundWaveVisualizer } from '@/features/sounds/components/SoundWaveVisualizer';
import { defaultSoundTitle } from '@/features/sounds/constants';
import { useSoundRecorder } from '@/features/sounds/hooks/useSoundRecorder';
import type { SoundInputMode, SoundRecorderPhase } from '@/features/sounds/hooks/useSoundRecorder';
import { publishSound } from '@/features/sounds/services/soundData';
import type { SoundPrivacy } from '@/features/sounds/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type Step = 'record' | 'details';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 280;

const RECORD_TIPS = [
  'Sessiz bir ortamda kayıt alın',
  'Mikrofonu ağzınıza 15–20 cm yaklaştırın',
  'Uzun veya büyük dosyalar otomatik sıkıştırılır',
] as const;

function phaseLabel(phase: SoundRecorderPhase, inputMode: SoundInputMode): string {
  switch (phase) {
    case 'recording':
      return 'Kayıt devam ediyor';
    case 'paused':
      return 'Kayıt duraklatıldı';
    case 'preview':
      return inputMode === 'mic' ? 'Önizleme hazır' : 'Ses yüklendi';
    default:
      if (inputMode === 'file') return 'Dosyadan ses seçin';
      if (inputMode === 'video') return 'Galeriden video seçin';
      return 'Kayda başlamak için dokunun';
  }
}

const INPUT_MODES: {
  id: SoundInputMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
}[] = [
  { id: 'mic', label: 'Kayıt', icon: 'mic', hint: 'Mikrofonla canlı kayıt' },
  { id: 'file', label: 'Dosya', icon: 'document-outline', hint: 'MP3, M4A, WAV dosyası' },
  { id: 'video', label: 'Video', icon: 'film-outline', hint: 'Galerideki videodan ses' },
];

type InputModeTabsProps = {
  mode: SoundInputMode;
  accent: string;
  muted: string;
  text: string;
  surface: string;
  border: string;
  disabled?: boolean;
  onChange: (mode: SoundInputMode) => void;
};

function InputModeTabs({ mode, accent, muted, text, surface, border, disabled, onChange }: InputModeTabsProps) {
  return (
    <View style={styles.inputModeRow}>
      {INPUT_MODES.map((item) => {
        const active = mode === item.id;
        return (
          <Pressable
            key={item.id}
            disabled={disabled}
            onPress={() => {
              hapticLight();
              onChange(item.id);
            }}
            style={[
              styles.inputModeTab,
              {
                borderColor: active ? accent : border,
                backgroundColor: active ? `${accent}14` : surface,
                opacity: disabled ? 0.55 : 1,
              },
            ]}
          >
            <Ionicons name={item.icon} size={16} color={active ? accent : muted} />
            <Text variant="caption" style={{ color: active ? text : muted, fontWeight: active ? '700' : '500' }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function hapticLight() {
  if (Platform.OS === 'android') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function hapticMedium() {
  if (Platform.OS === 'android') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

type StepIndicatorProps = {
  step: Step;
  accent: string;
  muted: string;
  text: string;
};

function StepIndicator({ step, accent, muted, text }: StepIndicatorProps) {
  const steps: { id: Step; label: string }[] = [
    { id: 'record', label: 'Kayıt' },
    { id: 'details', label: 'Bilgiler' },
  ];

  return (
    <View style={styles.stepRow}>
      {steps.map((item, index) => {
        const active = step === item.id;
        const done = step === 'details' && item.id === 'record';
        const color = active || done ? accent : muted;
        return (
          <View key={item.id} style={styles.stepItem}>
            <View style={[styles.stepDot, { borderColor: color, backgroundColor: active || done ? `${accent}22` : 'transparent' }]}>
              {done ? (
                <Ionicons name="checkmark" size={12} color={accent} />
              ) : (
                <Text variant="caption" style={{ color, fontWeight: '700' }}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text variant="caption" style={{ color: active ? text : muted, fontWeight: active ? '700' : '500' }}>
              {item.label}
            </Text>
            {index < steps.length - 1 ? <View style={[styles.stepLine, { backgroundColor: done ? accent : muted }]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

type ControlAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
};

type RecordControlsProps = {
  phase: SoundRecorderPhase;
  previewPlaying: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
  onTogglePreview: () => void;
  onRetake: () => void;
  onContinue: () => void;
};

function RecordControls({
  phase,
  previewPlaying,
  colors,
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
  onTogglePreview,
  onRetake,
  onContinue,
}: RecordControlsProps) {
  const actions: ControlAction[] = useMemo(() => {
    if (phase === 'idle') {
      return [{ key: 'start', icon: 'mic', label: 'Kayda Başla', onPress: onStart, primary: true }];
    }
    if (phase === 'recording') {
      return [
        { key: 'pause', icon: 'pause', label: 'Duraklat', onPress: onPause },
        { key: 'stop', icon: 'stop', label: 'Bitir', onPress: onStop, primary: true },
        { key: 'cancel', icon: 'close', label: 'İptal', onPress: onCancel, danger: true },
      ];
    }
    if (phase === 'paused') {
      return [
        { key: 'resume', icon: 'play', label: 'Devam', onPress: onResume, primary: true },
        { key: 'stop', icon: 'stop', label: 'Bitir', onPress: onStop },
        { key: 'cancel', icon: 'trash-outline', label: 'Sil', onPress: onCancel, danger: true },
      ];
    }
    return [
      {
        key: 'preview',
        icon: previewPlaying ? 'pause' : 'play',
        label: previewPlaying ? 'Duraklat' : 'Dinle',
        onPress: onTogglePreview,
        primary: true,
      },
      { key: 'retake', icon: 'refresh', label: 'Yeniden', onPress: onRetake },
      { key: 'continue', icon: 'arrow-forward', label: 'Devam', onPress: onContinue },
    ];
  }, [onCancel, onContinue, onPause, onResume, onRetake, onStart, onStop, onTogglePreview, phase, previewPlaying]);

  return (
    <View style={styles.controlsGrid}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={() => {
            hapticLight();
            action.onPress();
          }}
          style={({ pressed }) => [
            styles.controlItem,
            pressed && styles.controlPressed,
          ]}
        >
          <View
            style={[
              styles.controlBtn,
              action.primary && styles.controlBtnPrimary,
              action.danger && { borderColor: colors.danger, backgroundColor: `${colors.danger}12` },
              !action.primary && !action.danger && { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Ionicons
              name={action.icon}
              size={action.primary ? 26 : 22}
              color={action.danger ? colors.danger : action.primary ? '#fff' : colors.text}
            />
          </View>
          <Text variant="caption" secondary style={styles.controlLabel}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SoundCreateScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const recorder = useSoundRecorder();

  const [step, setStep] = useState<Step>('record');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<SoundPrivacy>('public');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishLabel, setPublishLabel] = useState('Onayla ve Paylaş');

  const suggestedTitle = defaultSoundTitle(profile?.username ?? 'kullanici');
  const heroColors = isDark
    ? (['#1e1b4b', '#581c87', '#9d174d'] as const)
    : (['#4338ca', '#7c3aed', '#db2777'] as const);

  const waveActive = recorder.phase === 'recording' || recorder.previewPlaying;
  const activeInputMode = INPUT_MODES.find((item) => item.id === recorder.inputMode);
  const showMicControls = recorder.inputMode === 'mic';
  const showImportPicker = recorder.inputMode !== 'mic' && recorder.phase === 'idle';
  const showPreviewControls = recorder.phase === 'preview';

  const pickCover = useCallback(async () => {
    hapticLight();
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
    hapticMedium();
    setStep('details');
  }, [recorder.recordedUri, suggestedTitle, title]);

  const handlePublish = useCallback(async () => {
    if (!user?.id || !recorder.recordedUri) return;

    setPublishing(true);
    setPublishLabel('Hazırlanıyor…');
    const result = await publishSound(user.id, profile?.username ?? 'kullanici', {
      title: title.trim() || suggestedTitle,
      description: description.trim() || null,
      privacy,
      localAudioUri: recorder.recordedUri,
      durationSec: recorder.recordedDurationSec,
      coverLocalUri: coverUri,
      onUploadProgress: (_stage, label) => setPublishLabel(label),
    });
    setPublishing(false);
    setPublishLabel('Onayla ve Paylaş');

    if (result.error || !result.sound) {
      Alert.alert('Paylaşılamadı', result.error ?? 'Ses yüklenemedi.');
      return;
    }

    hapticMedium();
    const libraryNote =
      privacy === 'public'
        ? 'Sesin müzik kütüphanesine eklendi; tüm kullanıcılar anında kullanabilir.'
        : 'Sesin yalnızca sana görünür.';
    Alert.alert('Ses paylaşıldı', libraryNote, [
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

  const ringSize = 168;
  const stroke = 5;
  const ringRadius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const ringProgress = step === 'details' ? 1 : recorder.progress;
  const dashOffset = circumference * (1 - ringProgress);

  return (
    <GradientBackground>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <ScreenBackButton />
          <View style={styles.topCenter}>
            <Text variant="label" style={styles.topTitle}>
              Ses Oluştur
            </Text>
            <Text secondary variant="caption">
              Orijinal sesini kaydet ve paylaş
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <StepIndicator
          step={step}
          accent={colors.accent}
          muted={colors.textMuted}
          text={colors.text}
        />

        {step === 'record' ? (
          <InputModeTabs
            mode={recorder.inputMode}
            accent={colors.accent}
            muted={colors.textMuted}
            text={colors.text}
            surface={colors.surface}
            border={colors.border}
            disabled={recorder.importing || recorder.phase === 'recording' || recorder.phase === 'paused'}
            onChange={(mode) => void recorder.switchInputMode(mode)}
          />
        ) : null}

        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: step === 'details' ? spacing.md : insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={step === 'details' ? 100 : insets.bottom + spacing.md}
        >
          {step === 'record' ? (
            <>
              <LinearGradient colors={[...heroColors]} style={styles.hero}>
                <View style={styles.ringWrap}>
                  <Svg width={ringSize} height={ringSize} style={styles.ringSvg}>
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={stroke}
                      fill="transparent"
                    />
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      stroke="#fff"
                      strokeWidth={stroke}
                      fill="transparent"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      rotation={-90}
                      origin={`${ringSize / 2}, ${ringSize / 2}`}
                    />
                  </Svg>
                  <View style={styles.ringCenter}>
                    <Text style={styles.timerText}>{recorder.elapsedLabel}</Text>
                    {recorder.elapsedSec <= recorder.maxSec ? (
                      <Text style={styles.timerSub}>/{recorder.maxSec}s</Text>
                    ) : null}
                  </View>
                </View>

                <SoundWaveVisualizer
                  active={waveActive}
                  accentColor="#fff"
                  mutedColor="rgba(255,255,255,0.28)"
                  height={48}
                />

                <View style={styles.phasePill}>
                  {recorder.phase === 'recording' ? <View style={styles.liveDot} /> : null}
                  <Text style={styles.phaseText}>{phaseLabel(recorder.phase, recorder.inputMode)}</Text>
                </View>
                {recorder.importLabel ? (
                  <Text style={styles.importLabel} numberOfLines={1}>
                    {recorder.importLabel}
                  </Text>
                ) : null}
              </LinearGradient>

              {showImportPicker ? (
                <GlassCard style={styles.importCard}>
                  <View style={styles.importCardHeader}>
                    <Ionicons
                      name={recorder.inputMode === 'file' ? 'document-outline' : 'film-outline'}
                      size={22}
                      color={colors.accent}
                    />
                    <View style={styles.importCardText}>
                      <Text variant="label">
                        {recorder.inputMode === 'file' ? 'Ses dosyası seç' : 'Galeriden video seç'}
                      </Text>
                      <Text secondary variant="caption">
                        {activeInputMode?.hint} · otomatik sıkıştırma
                      </Text>
                    </View>
                  </View>
                  <Button
                    title={
                      recorder.importing
                        ? 'Yükleniyor…'
                        : recorder.inputMode === 'file'
                          ? 'Dosyadan Seç'
                          : 'Galeriden Seç'
                    }
                    loading={recorder.importing}
                    onPress={() =>
                      void (recorder.inputMode === 'file'
                        ? recorder.importFromFile()
                        : recorder.importFromGalleryVideo())
                    }
                  />
                </GlassCard>
              ) : null}

              {showMicControls ? (
                <RecordControls
                  phase={recorder.phase}
                  previewPlaying={recorder.previewPlaying}
                  colors={colors}
                  onStart={() => void recorder.startRecording()}
                  onPause={recorder.pauseRecording}
                  onResume={recorder.resumeRecording}
                  onStop={() => void recorder.stopRecording()}
                  onCancel={() => void recorder.cancelRecording()}
                  onTogglePreview={() => void recorder.togglePreview()}
                  onRetake={() => void recorder.resetForRetake()}
                  onContinue={goToDetails}
                />
              ) : null}

              {!showMicControls && showPreviewControls ? (
                <RecordControls
                  phase={recorder.phase}
                  previewPlaying={recorder.previewPlaying}
                  colors={colors}
                  onStart={() => {}}
                  onPause={() => {}}
                  onResume={() => {}}
                  onStop={() => {}}
                  onCancel={() => void recorder.cancelRecording()}
                  onTogglePreview={() => void recorder.togglePreview()}
                  onRetake={() => void recorder.resetForRetake()}
                  onContinue={goToDetails}
                />
              ) : null}

              <GlassCard style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <Ionicons name="bulb-outline" size={18} color={colors.accent} />
                  <Text variant="label">İpuçları</Text>
                </View>
                {RECORD_TIPS.map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={[styles.tipBullet, { backgroundColor: `${colors.accent}33` }]} />
                    <Text secondary variant="caption">
                      {tip}
                    </Text>
                  </View>
                ))}
                <View style={styles.tipRow}>
                  <View style={[styles.tipBullet, { backgroundColor: `${colors.danger}33` }]} />
                  <Text secondary variant="caption">
                    YouTube / Spotify bağlantıları telif nedeniyle desteklenmiyor. Kendi kaydınızı, dosyanızı veya
                    galerideki videonuzu kullanın.
                  </Text>
                </View>
              </GlassCard>
            </>
          ) : (
            <>
              <GlassCard style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Pressable onPress={() => void pickCover()} style={[styles.coverBox, { borderColor: colors.border }]}>
                    {coverUri ? (
                      <Image source={{ uri: coverUri }} style={styles.coverImage} />
                    ) : (
                      <LinearGradient colors={[...heroColors]} style={styles.coverFallback}>
                        <Ionicons name="musical-notes" size={28} color="#fff" />
                      </LinearGradient>
                    )}
                    <View style={[styles.coverEdit, { backgroundColor: colors.surface }]}>
                      <Ionicons name="camera-outline" size={14} color={colors.text} />
                    </View>
                  </Pressable>

                  <View style={styles.previewMeta}>
                    <Text variant="label" numberOfLines={2}>
                      {title.trim() || suggestedTitle}
                    </Text>
                    <Text secondary variant="caption">
                      {recorder.recordedDurationSec}s · @{profile?.username ?? 'kullanici'}
                    </Text>
                    <Pressable
                      onPress={() => void recorder.togglePreview()}
                      style={[styles.miniPlayBtn, { backgroundColor: `${colors.accent}18`, borderColor: colors.accent }]}
                    >
                      <Ionicons
                        name={recorder.previewPlaying ? 'pause' : 'play'}
                        size={16}
                        color={colors.accent}
                      />
                      <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
                        {recorder.previewPlaying ? 'Duraklat' : 'Önizle'}
                      </Text>
                    </Pressable>
                    <View style={[styles.previewProgressTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.previewProgressFill,
                          {
                            width: `${(recorder.previewPlaying ? recorder.previewProgress : 1) * 100}%`,
                            backgroundColor: colors.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
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
                  placeholder={suggestedTitle}
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

              <Text variant="caption" secondary style={styles.fieldLabel}>
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
                      onPress={() => {
                        hapticLight();
                        setPrivacy(option.id);
                      }}
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
                      <Text secondary variant="caption" style={styles.privacySubtitle}>
                        {option.subtitle}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </KeyboardAwareScrollView>

        {step === 'details' ? (
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
              title={publishing ? publishLabel : 'Onayla ve Paylaş'}
              loading={publishing}
              onPress={() => void handlePublish()}
            />
            <Button
              title="Geri"
              variant="ghost"
              onPress={() => setStep('record')}
            />
          </View>
        ) : null}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  topTitle: { fontWeight: '800' },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  inputModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  inputModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  importCard: {
    gap: spacing.md,
  },
  importCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  importCardText: {
    flex: 1,
    gap: 2,
  },
  importLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    marginHorizontal: spacing.xs,
    opacity: 0.5,
  },
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
  ringWrap: {
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
  },
  timerText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginTop: 2,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  phaseText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  controlsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  controlItem: {
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 72,
  },
  controlPressed: {
    opacity: 0.85,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnPrimary: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    borderWidth: 0,
  },
  controlLabel: {
    textAlign: 'center',
  },
  tipsCard: {
    marginTop: spacing.xs,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewCard: {
    marginBottom: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  coverBox: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  previewMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  miniPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  previewProgressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  previewProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    marginBottom: -spacing.xs,
  },
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
  privacyCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  privacySubtitle: {
    lineHeight: 16,
  },
  footer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
