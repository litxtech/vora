import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ORIGINAL_AUDIO_LEVELS } from '@/features/vora-studio/constants';
import { captureThumbnail } from '@/features/vora-studio/services/exportStudioVideo';
import { generateAutoSubtitles } from '@/features/vora-studio/services/generateSubtitles';
import { fetchMusicTrackById } from '@/features/music/services/musicData';
import { isMusicTrackPlayable } from '@/features/music/constants';
import { MusicAddPromptCard } from '@/features/music/components/MusicAddPromptCard';
import { MusicEditorPanel } from '@/features/music/components/MusicEditorPanel';
import { MusicPickerSheet } from '@/features/music/components/MusicPickerSheet';
import type { MusicTrack } from '@/features/music/types';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { toUserFacingError } from '@/lib/errors';
import { formatStudioTime } from '@/features/vora-studio/utils/time';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function StudioToolPanel() {
  const activeTool = useStudioEditorStore((s) => s.activeTool);

  switch (activeTool) {
    case 'trim':
      return <TrimPanel />;
    case 'split':
      return <SplitPanel />;
    case 'audio':
      return <AudioPanel />;
    case 'music':
      return <MusicPanel />;
    case 'voiceover':
      return <VoiceOverPanel />;
    case 'text':
      return null;
    case 'thumbnail':
      return <ThumbnailPanel />;
    case 'subtitles':
      return <SubtitlePanel />;
    default:
      return null;
  }
}

function TrimPanel() {
  const { colors } = useTheme();
  const trimStartSec = useStudioEditorStore((s) => s.trimStartSec);
  const trimEndSec = useStudioEditorStore((s) => s.trimEndSec);

  return (
    <View style={styles.trimHelp}>
      <Text secondary variant="caption">
        Beyaz tutamaçları sürükleyerek başlangıç ve bitişi ayarlayın. Ortadaki beyaz nokta oynatma konumudur.
      </Text>
      <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
        Seçili bölüm: {formatStudioTime(trimStartSec)} → {formatStudioTime(trimEndSec)}
      </Text>
    </View>
  );
}

function SplitPanel() {
  const { colors } = useTheme();
  const clips = useStudioEditorStore((s) => s.clips);
  const playheadSec = useStudioEditorStore((s) => s.playheadSec);
  const splitAtPlayhead = useStudioEditorStore((s) => s.splitAtPlayhead);
  const deleteClipById = useStudioEditorStore((s) => s.deleteClipById);
  const mergeClips = useStudioEditorStore((s) => s.mergeClips);

  const sorted = [...clips].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.panel}>
      <ActionChip label={`Burada kes · ${formatStudioTime(playheadSec)}`} icon="cut-outline" onPress={splitAtPlayhead} primary />
      {sorted.length > 1 ? (
        <ActionChip label="Bitişik parçaları birleştir" icon="git-merge-outline" onPress={mergeClips} />
      ) : null}

      {sorted.length > 1 ? (
        <View style={styles.list}>
          {sorted.map((clip, index) => (
            <View key={clip.id} style={[styles.listRow, { borderColor: colors.border }]}>
              <Text variant="caption" style={{ flex: 1 }}>
                {index + 1}. {formatStudioTime(clip.startSec)} — {formatStudioTime(clip.endSec)}
              </Text>
              {sorted.length > 1 ? (
                <Pressable onPress={() => deleteClipById(clip.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AudioPanel() {
  const { colors } = useTheme();
  const originalAudioVolume = useStudioEditorStore((s) => s.originalAudioVolume);
  const setOriginalAudioVolume = useStudioEditorStore((s) => s.setOriginalAudioVolume);

  return (
    <View style={styles.row}>
      {ORIGINAL_AUDIO_LEVELS.map((level) => {
        const active = originalAudioVolume === level.value;
        return (
          <Pressable
            key={level.label}
            style={[styles.option, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}18` : 'transparent' }]}
            onPress={() => setOriginalAudioVolume(level.value)}
          >
            <Text variant="caption" style={{ color: active ? colors.primary : colors.textSecondary }}>
              {level.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MusicPanel() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const trimStartSec = useStudioEditorStore((s) => s.trimStartSec);
  const trimEndSec = useStudioEditorStore((s) => s.trimEndSec);
  const selectedMusicId = useStudioEditorStore((s) => s.selectedMusicId);
  const musicStartSec = useStudioEditorStore((s) => s.musicStartSec);
  const musicVolume = useStudioEditorStore((s) => s.musicVolume);
  const originalAudioVolume = useStudioEditorStore((s) => s.originalAudioVolume);
  const setSelectedMusic = useStudioEditorStore((s) => s.setSelectedMusic);
  const setMusicStartSec = useStudioEditorStore((s) => s.setMusicStartSec);
  const setMusicVolume = useStudioEditorStore((s) => s.setMusicVolume);
  const setOriginalAudioVolume = useStudioEditorStore((s) => s.setOriginalAudioVolume);
  const setPlaying = useStudioEditorStore((s) => s.setPlaying);
  const isPlaying = useStudioEditorStore((s) => s.isPlaying);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);

  const clipDurationSec = Math.max(0.5, trimEndSec - trimStartSec);

  const applyMusicSelection = (track: MusicTrack) => {
    if (!isMusicTrackPlayable(track.audioUrl)) {
      Alert.alert('Ses dosyası yok', 'Bu parçanın sesi henüz yüklenmemiş. Admin panelinden ses yükleyin.');
      return;
    }
    setSelectedMusic(track);
    setSelectedTrack(track);
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!selectedMusicId) {
      setSelectedTrack(null);
      return;
    }
    void fetchMusicTrackById(selectedMusicId).then(setSelectedTrack);
  }, [selectedMusicId]);

  if (selectedTrack) {
    return (
      <>
        <MusicEditorPanel
          track={selectedTrack}
          clipDurationSec={clipDurationSec}
          musicStartSec={musicStartSec}
          musicVolume={musicVolume}
          originalAudioVolume={originalAudioVolume}
          onStartChange={setMusicStartSec}
          onMusicVolumeChange={setMusicVolume}
          onOriginalVolumeChange={setOriginalAudioVolume}
          onRemove={() => {
            setSelectedMusic(null);
            setPlaying(false);
          }}
          onChangeTrack={() => setPickerOpen(true)}
          isPlaying={isPlaying}
          onTogglePreview={() => setPlaying(!isPlaying)}
        />
        <MusicPickerSheet
          visible={pickerOpen}
          selectedTrackId={selectedMusicId}
          onClose={() => setPickerOpen(false)}
          onSelect={applyMusicSelection}
          pauseVideo={() => setPlaying(false)}
        />
      </>
    );
  }

  return (
    <>
      <MusicAddPromptCard onPress={() => setPickerOpen(true)} />
      <MusicPickerSheet
        visible={pickerOpen}
        selectedTrackId={null}
        onClose={() => setPickerOpen(false)}
        onSelect={applyMusicSelection}
        pauseVideo={() => setPlaying(false)}
      />
    </>
  );
}

function VoiceOverPanel() {
  const { colors } = useTheme();
  const playheadSec = useStudioEditorStore((s) => s.playheadSec);
  const voiceOver = useStudioEditorStore((s) => s.voiceOver);
  const isRecordingVoice = useStudioEditorStore((s) => s.isRecordingVoice);
  const setVoiceOver = useStudioEditorStore((s) => s.setVoiceOver);
  const setRecordingVoice = useStudioEditorStore((s) => s.setRecordingVoice);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const startRecording = async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert('İzin gerekli', 'Seslendirme için mikrofon izni vermelisiniz.');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordingVoice(true);
  };

  const stopRecording = async () => {
    await recorder.stop();
    setRecordingVoice(false);
    const uri = recorder.uri;
    if (uri) {
      setVoiceOver({
        uri,
        startSec: playheadSec,
        durationSec: Math.max(1, recorderState.durationMillis / 1000),
      });
    }
  };

  return (
    <View style={styles.panel}>
      <ActionChip
        label={isRecordingVoice ? 'Kaydı durdur' : 'Kayda başla'}
        icon={isRecordingVoice ? 'stop-circle' : 'mic'}
        onPress={isRecordingVoice ? stopRecording : startRecording}
        primary
        danger={isRecordingVoice}
      />
      {isRecordingVoice ? (
        <View style={[styles.statusRow, { backgroundColor: `${colors.danger}18` }]}>
          <View style={styles.recDot} />
          <Text variant="caption" style={{ color: colors.danger }}>
            Kayıt devam ediyor… Videoyu oynatarak konuşun.
          </Text>
        </View>
      ) : null}
      {voiceOver ? (
        <View style={[styles.listRow, { borderColor: colors.border }]}>
          <Text variant="caption" style={{ flex: 1 }}>
            {formatStudioTime(voiceOver.startSec)} · {Math.round(voiceOver.durationSec)} sn
          </Text>
          <Pressable onPress={() => setVoiceOver(null)}>
            <Text variant="caption" style={{ color: colors.danger }}>
              Sil
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ThumbnailPanel() {
  const { colors } = useTheme();
  const sourceUri = useStudioEditorStore((s) => s.sourceUri);
  const thumbnailTimeSec = useStudioEditorStore((s) => s.thumbnailTimeSec);
  const trimStartSec = useStudioEditorStore((s) => s.trimStartSec);
  const trimEndSec = useStudioEditorStore((s) => s.trimEndSec);
  const playheadSec = useStudioEditorStore((s) => s.playheadSec);
  const setThumbnailTime = useStudioEditorStore((s) => s.setThumbnailTime);
  const [loading, setLoading] = useState(false);

  const pickFromPlayhead = async () => {
    if (!sourceUri) return;
    setLoading(true);
    setThumbnailTime(playheadSec);
    await captureThumbnail(sourceUri, playheadSec);
    setLoading(false);
  };

  return (
    <View style={styles.panel}>
      <ActionChip
        label={loading ? 'Seçiliyor…' : `Bu kareyi kapak yap · ${formatStudioTime(playheadSec)}`}
        icon="image-outline"
        onPress={pickFromPlayhead}
        primary
      />
      <View style={styles.row}>
        <Pressable style={[styles.option, { borderColor: colors.border }]} onPress={() => setThumbnailTime(trimStartSec)}>
          <Text variant="caption">Başlangıç</Text>
        </Pressable>
        <Pressable style={[styles.option, { borderColor: colors.border }]} onPress={() => setThumbnailTime((trimStartSec + trimEndSec) / 2)}>
          <Text variant="caption">Orta</Text>
        </Pressable>
        <Pressable style={[styles.option, { borderColor: colors.border }]} onPress={() => setThumbnailTime(Math.max(trimStartSec, trimEndSec - 0.5))}>
          <Text variant="caption">Son</Text>
        </Pressable>
      </View>
      <Text secondary variant="caption">
        Seçili kapak: {formatStudioTime(thumbnailTimeSec)}
      </Text>
    </View>
  );
}

function SubtitlePanel() {
  const { colors } = useTheme();
  const sourceUri = useStudioEditorStore((s) => s.sourceUri);
  const durationSec = useStudioEditorStore((s) => s.durationSec);
  const subtitles = useStudioEditorStore((s) => s.subtitles);
  const setSubtitles = useStudioEditorStore((s) => s.setSubtitles);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!sourceUri) return;
    setLoading(true);
    try {
      const cues = await generateAutoSubtitles(sourceUri, durationSec);
      setSubtitles(cues);
    } catch (err) {
      Alert.alert(
        'Altyazı',
        toUserFacingError(err instanceof Error ? err.message : null, { fallback: 'Altyazı oluşturulamadı.' }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.panel}>
      <ActionChip
        label={loading ? 'Oluşturuluyor…' : subtitles.length ? 'Yeniden oluştur' : 'Altyazı oluştur'}
        icon="sparkles-outline"
        onPress={generate}
        primary
      />
      {subtitles.length > 0 ? (
        <Text secondary variant="caption">
          {subtitles.length} satır altyazı eklendi — videoda altta görünür.
        </Text>
      ) : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
    </View>
  );
}

function ActionChip({
  label,
  icon,
  onPress,
  primary,
  danger,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const tint = danger ? colors.danger : colors.primary;

  return (
    <Pressable
      style={[
        styles.actionChip,
        {
          borderColor: primary || danger ? tint : colors.border,
          backgroundColor: primary || danger ? `${tint}16` : 'transparent',
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={primary || danger ? tint : colors.textSecondary} />
      <Text variant="caption" style={{ color: primary || danger ? tint : colors.textSecondary, flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
  trimHelp: { gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  list: { gap: spacing.xs },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 15,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF5350',
  },
});
