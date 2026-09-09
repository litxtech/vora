import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { CAP_JUMP_STEPS_SEC, formatCapClock } from '@/features/caps/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CapsStudioJumpBarProps = {
  currentMs: number;
  durationMs: number;
  onJumpMs: (ms: number) => void;
};

function parseClock(input: string): number | null {
  const parts = input
    .trim()
    .split(/[:.]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (nums.length === 1) return Math.round(nums[0] * 1000);
  if (nums.length === 2) return Math.round((nums[0] * 60 + nums[1]) * 1000);
  if (nums.length >= 3) {
    return Math.round((nums[0] * 3600 + nums[1] * 60 + nums[2]) * 1000);
  }
  return null;
}

export function CapsStudioJumpBar({ currentMs, durationMs, onJumpMs }: CapsStudioJumpBarProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(formatCapClock(currentMs));

  useEffect(() => {
    setDraft(formatCapClock(currentMs));
  }, [currentMs]);

  const jumpBy = (sec: number) => {
    const next = Math.min(durationMs, Math.max(0, currentMs + sec * 1000));
    onJumpMs(next);
  };

  const goToDraft = () => {
    const ms = parseClock(draft);
    if (ms == null) return;
    const next = Math.min(durationMs, Math.max(0, ms));
    onJumpMs(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
          ]}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={goToDraft}
          placeholder="00:00:00"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
        />
        <Pressable
          onPress={goToDraft}
          style={[styles.goBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.goText}>Git</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {CAP_JUMP_STEPS_SEC.map((sec) => (
          <Pressable
            key={sec}
            onPress={() => jumpBy(sec)}
            style={[styles.chip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text variant="caption" style={{ fontWeight: '700' }}>
              +{sec >= 60 ? `${sec / 60} dk` : `${sec} sn`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    height: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontVariant: ['tabular-nums'],
    fontSize: 16,
    fontWeight: '600',
  },
  goBtn: {
    height: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goText: { color: '#fff', fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
