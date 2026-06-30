import { ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { IzdivacParticipantCard } from '@/features/izdivac/components/IzdivacParticipantCard';
import type { IzdivacParticipant } from '@/features/izdivac/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { shouldSkipUiBlur } from '@/lib/device/androidPerfProfile';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  participants: IzdivacParticipant[];
};

export function IzdivacGenderPanel({ title, icon, accent, participants }: Props) {
  const { colors, isDark } = useTheme();
  const borderColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.1)';
  const panelBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.45)';

  return (
    <View style={[styles.panel, { borderColor, backgroundColor: panelBg }]}>
      {!shouldSkipUiBlur() ? (
        <BlurView
          intensity={isDark ? 18 : 28}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Ionicons name={icon} size={12} color={accent} />
        <Text variant="caption" style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.countPill, { backgroundColor: `${accent}1A` }]}>
          <Text variant="caption" style={{ color: accent, fontSize: 10, fontWeight: '700' }}>
            {participants.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {participants.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Text secondary variant="caption" style={styles.emptyText}>
              Aktif yok
            </Text>
          </View>
        ) : (
          participants.map((participant) => (
            <IzdivacParticipantCard
              key={participant.userId}
              participant={participant}
              accent={accent}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  listContent: {
    padding: 6,
    gap: 6,
    paddingBottom: spacing.sm,
  },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 10,
    textAlign: 'center',
  },
});
