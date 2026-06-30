import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { LIVE_SUPPORT_ACCENT, LIVE_SUPPORT_TOPICS } from '@/features/live-support/constants';
import type { LiveSupportTopic } from '@/features/live-support/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const TOPIC_ICONS: Record<LiveSupportTopic, keyof typeof Ionicons.glyphMap> = {
  account: 'person-outline',
  billing: 'wallet-outline',
  technical: 'construct-outline',
  app_bug: 'bug-outline',
  report: 'flag-outline',
  general: 'help-circle-outline',
  other: 'ellipsis-horizontal-outline',
};

type LiveSupportIntroProps = {
  selectedTopic: LiveSupportTopic | null;
  onSelectTopic: (topic: (typeof LIVE_SUPPORT_TOPICS)[number]) => void;
};

export const LiveSupportIntro = memo(function LiveSupportIntro({
  selectedTopic,
  onSelectTopic,
}: LiveSupportIntroProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${LIVE_SUPPORT_ACCENT}14` }]}>
          <Ionicons name="headset-outline" size={14} color={LIVE_SUPPORT_ACCENT} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="caption" style={styles.title}>
            Nasıl yardımcı olabiliriz?
          </Text>
          <Text secondary variant="caption" style={styles.subtitle} numberOfLines={2}>
            Sorununuzu yazın veya konu seçin.
          </Text>
        </View>
      </View>

      <View style={styles.chipsWrap}>
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
                  backgroundColor: active ? `${LIVE_SUPPORT_ACCENT}16` : colors.surfaceElevated,
                },
              ]}
            >
              <Ionicons
                name={TOPIC_ICONS[topic.id]}
                size={11}
                color={active ? LIVE_SUPPORT_ACCENT : colors.textMuted}
              />
              <Text
                variant="caption"
                numberOfLines={1}
                style={{
                  color: active ? LIVE_SUPPORT_ACCENT : colors.text,
                  fontWeight: active ? '700' : '500',
                  fontSize: 10,
                }}
              >
                {topic.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCopy: { flex: 1, gap: 1 },
  title: { fontWeight: '700', fontSize: 12 },
  subtitle: { fontSize: 11, lineHeight: 14 },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
});
