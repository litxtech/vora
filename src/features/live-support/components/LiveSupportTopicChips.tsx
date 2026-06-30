import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { LIVE_SUPPORT_ACCENT, LIVE_SUPPORT_TOPICS } from '@/features/live-support/constants';
import type { LiveSupportTopic } from '@/features/live-support/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LiveSupportTopicChipsProps = {
  selectedTopic: LiveSupportTopic | null;
  onSelectTopic: (topic: (typeof LIVE_SUPPORT_TOPICS)[number]) => void;
};

export const LiveSupportTopicChips = memo(function LiveSupportTopicChips({
  selectedTopic,
  onSelectTopic,
}: LiveSupportTopicChipsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.row}
    >
      {LIVE_SUPPORT_TOPICS.map((topic) => {
        const active = selectedTopic === topic.id;
        return (
          <Pressable
            key={topic.id}
            onPress={() => onSelectTopic(topic)}
            style={[
              styles.chip,
              {
                borderColor: active ? LIVE_SUPPORT_ACCENT : colors.border,
                backgroundColor: active ? `${LIVE_SUPPORT_ACCENT}18` : colors.surfaceElevated,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: active ? LIVE_SUPPORT_ACCENT : colors.text,
                fontWeight: active ? '700' : '500',
                fontSize: 11,
              }}
            >
              {topic.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: {
    gap: 6,
    paddingHorizontal: 2,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
