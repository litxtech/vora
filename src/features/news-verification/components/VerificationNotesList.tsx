import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import type { FeedAuthor } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { NEWS_VERIFICATION_VOTES } from '@/features/news-verification/constants';
import type { NewsVerificationNote } from '@/features/news-verification/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type VerificationNotesListProps = {
  notes: NewsVerificationNote[];
};

function toAuthor(note: NewsVerificationNote): FeedAuthor {
  return {
    id: note.reporterId,
    username: note.username,
    fullName: note.displayName,
    avatarUrl: note.avatarUrl,
    role: note.role as FeedAuthor['role'],
    isVerified: ['verified_reporter', 'moderator', 'admin', 'super_admin'].includes(note.role),
  };
}

export function VerificationNotesList({ notes }: VerificationNotesListProps) {
  const { colors, isDark } = useTheme();

  if (notes.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.title}>
        Doğrulama Notları
      </Text>

      {notes.map((note) => {
        const vote = NEWS_VERIFICATION_VOTES.find((option) => option.id === note.result);
        const voteColor = vote?.color ?? colors.textMuted;

        return (
          <View
            key={note.id}
            style={[
              styles.row,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.rowHeader}>
              <View style={styles.authorWrap}>
                <UserBadge author={toAuthor(note)} timeLabel={formatFeedTime(note.createdAt)} />
              </View>
              <View style={[styles.resultPill, { backgroundColor: `${voteColor}18`, borderColor: `${voteColor}44` }]}>
                <Ionicons name={vote?.icon ?? 'shield-outline'} size={12} color={voteColor} />
                <Text variant="caption" style={{ color: voteColor, fontWeight: '700', fontSize: 11 }}>
                  {vote?.label ?? note.result}
                </Text>
              </View>
            </View>
            <Text style={styles.noteText}>{note.note}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.xs,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  authorWrap: {
    flex: 1,
    minWidth: 0,
  },
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    flexShrink: 0,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
