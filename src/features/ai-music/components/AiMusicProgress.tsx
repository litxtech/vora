import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AI_MUSIC_STAGES, aiMusicStageLabel } from '@/features/ai-music/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AiMusicProgressProps = {
  stage: string;
  progress: number;
  compact?: boolean;
};

export function AiMusicProgress({ stage, progress, compact }: AiMusicProgressProps) {
  const { colors } = useTheme();
  const width = Math.max(6, Math.min(100, progress));
  const visible = stage === 'listening'
    ? AI_MUSIC_STAGES
    : AI_MUSIC_STAGES.filter((item) => item.id !== 'listening');

  return (
    <View style={compact ? undefined : styles.block}>
      <View style={styles.row}>
        <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
          Müzik hazırlanıyor
        </Text>
        <Text variant="caption" secondary>
          {aiMusicStageLabel(stage)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: `${colors.accent}22` }]}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: colors.accent }]} />
      </View>
      {compact ? null : (
        <View style={styles.stages}>
          {visible.map((item) => {
            const active = item.id === stage;
            return (
              <Text
                key={item.id}
                variant="caption"
                style={{ color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500' }}
              >
                {item.label}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  stages: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
