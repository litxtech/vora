import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_AI_BADGE_COLOR, VORA_AI_BADGE_LABEL } from '@/features/vora-ai/constants';
import { radius, spacing } from '@/constants/theme';

type VoraAIBadgeProps = {
  compact?: boolean;
};

export function VoraAIBadge({ compact }: VoraAIBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${VORA_AI_BADGE_COLOR}22` }, compact && styles.compact]}>
      <Text style={styles.sparkle}>✨</Text>
      <Ionicons name="sparkles" size={compact ? 9 : 10} color={VORA_AI_BADGE_COLOR} />
      <Text variant="caption" style={[styles.label, { color: VORA_AI_BADGE_COLOR }]}>
        {VORA_AI_BADGE_LABEL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  compact: {
    paddingHorizontal: 5,
  },
  sparkle: {
    fontSize: 10,
    lineHeight: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
