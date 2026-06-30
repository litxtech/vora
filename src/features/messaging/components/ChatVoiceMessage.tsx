import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { useChatVoicePlayer } from '../hooks/useChatVoicePlayer';
import {
  formatVoiceDuration,
  parseVoiceDurationSec,
  voiceWaveformHeights,
} from '../utils/voiceMessage';

type ChatVoiceMessageProps = {
  uri: string;
  content?: string;
  isMine: boolean;
  seed: string;
  accentColor: string;
  textColor: string;
  metaColor: string;
  compact?: boolean;
};

export const ChatVoiceMessage = memo(function ChatVoiceMessage({
  uri,
  content,
  isMine,
  seed,
  accentColor,
  textColor,
  metaColor,
  compact = false,
}: ChatVoiceMessageProps) {
  const { colors } = useTheme();
  const { playing, progress, toggle } = useChatVoicePlayer(uri);
  const durationSec = parseVoiceDurationSec(content) ?? 0;
  const bars = useMemo(() => voiceWaveformHeights(seed), [seed]);
  const playColor = isMine ? '#fff' : accentColor;
  const playedColor = isMine ? 'rgba(255,255,255,0.95)' : accentColor;
  const unplayedColor = isMine ? 'rgba(255,255,255,0.35)' : `${accentColor}44`;
  const btnBg = isMine ? 'rgba(255,255,255,0.18)' : `${accentColor}16`;

  return (
    <Pressable
      style={[styles.row, compact ? styles.rowCompact : null]}
      onPress={(event) => {
        event.stopPropagation?.();
        void toggle();
      }}
      hitSlop={4}
    >
      <View style={[styles.playBtn, { backgroundColor: btnBg }]}>
        <Ionicons name={playing ? 'pause' : 'play'} size={compact ? 18 : 20} color={playColor} />
      </View>

      <View style={styles.waveCol}>
        <View style={styles.waveRow}>
          {bars.map((height, index) => {
            const barProgress = (index + 1) / bars.length;
            const active = progress >= barProgress;
            return (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    height: 6 + height * (compact ? 14 : 18),
                    backgroundColor: active ? playedColor : unplayedColor,
                  },
                ]}
              />
            );
          })}
        </View>
        <Text variant="caption" style={{ color: metaColor, fontSize: 11, marginTop: 2 }}>
          {formatVoiceDuration(durationSec || 0)}
        </Text>
      </View>

      {!compact ? (
        <Ionicons
          name="mic"
          size={16}
          color={isMine ? 'rgba(255,255,255,0.55)' : colors.textMuted}
          style={styles.micIcon}
        />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
    maxWidth: 260,
    paddingVertical: 2,
  },
  rowCompact: {
    minWidth: 0,
    maxWidth: '100%',
    flex: 1,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveCol: {
    flex: 1,
    minWidth: 0,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 26,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  micIcon: {
    marginLeft: 2,
  },
});
