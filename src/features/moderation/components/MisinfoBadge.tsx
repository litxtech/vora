import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MISINFO_FLAG_TYPES } from '@/features/moderation/constants';
import { fetchMisinfoFlagCounts } from '@/features/moderation/services/misinfo';
import type { MisinfoFlagType } from '@/features/moderation/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MisinfoBadgeProps = {
  targetType: string;
  targetId: string;
  onPress?: () => void;
};

function summarize(counts: Record<MisinfoFlagType, number>) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;

  const top = MISINFO_FLAG_TYPES.map((t) => ({ ...t, count: counts[t.id] }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)[0];

  return { total, label: top?.label ?? 'Yanlış bilgi' };
}

export function MisinfoBadge({ targetType, targetId, onPress }: MisinfoBadgeProps) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<{ total: number; label: string } | null>(null);

  useEffect(() => {
    if (targetId.startsWith('demo-')) return;
    fetchMisinfoFlagCounts(targetType, targetId).then((counts) => {
      setSummary(summarize(counts));
    });
  }, [targetType, targetId]);

  if (!summary) return null;

  const content = (
    <View style={[styles.badge, { backgroundColor: `${colors.warning}18`, borderColor: colors.warning }]}>
      <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
      <Text variant="caption" style={{ color: colors.warning }}>
        {summary.label} · {summary.total} işaretleme
      </Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
