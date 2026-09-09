import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import { CITY_GOVERNANCE_ACCENT } from '@/features/city-governance/constants';
import type { CityElectionCandidate } from '@/features/city-governance/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ElectionCandidateCardProps = {
  candidate: CityElectionCandidate;
  selected?: boolean;
  disabled?: boolean;
  showVotes?: boolean;
  onVote?: () => void;
  onOpenProfile?: () => void;
};

export function ElectionCandidateCard({
  candidate,
  selected = false,
  disabled = false,
  showVotes = false,
  onVote,
  onOpenProfile,
}: ElectionCandidateCardProps) {
  const { colors } = useTheme();
  const displayName = candidate.fullName ?? candidate.username;

  return (
    <GlassCard style={[styles.card, selected && { borderColor: CITY_GOVERNANCE_ACCENT, borderWidth: 1 }]}>
      <Pressable style={styles.header} onPress={onOpenProfile}>
        <FeedAuthorAvatar
          author={{
            id: candidate.userId,
            username: candidate.username,
            fullName: candidate.fullName,
            avatarUrl: candidate.avatarUrl,
            role: 'user',
            isVerified: false,
          }}
          size={52}
        />
        <View style={styles.meta}>
          <Text variant="label" numberOfLines={1}>
            {displayName}
          </Text>
          <Text secondary variant="caption">
            @{candidate.username}
          </Text>
        </View>
        {showVotes ? (
          <View style={[styles.voteBadge, { backgroundColor: `${CITY_GOVERNANCE_ACCENT}18` }]}>
            <Text style={{ color: CITY_GOVERNANCE_ACCENT, fontWeight: '800' }}>
              {candidate.voteCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {candidate.statement ? (
        <Text secondary variant="body" style={styles.statement}>
          &ldquo;{candidate.statement}&rdquo;
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button variant="outline" size="compact" onPress={onOpenProfile}>
          Profil
        </Button>
        {onVote ? (
          <Button size="compact" onPress={onVote} disabled={disabled || selected}>
            {selected ? 'Oy Verildi' : 'Oy Ver'}
          </Button>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  voteBadge: {
    minWidth: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  statement: {
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});

export function openCandidateProfile(username: string): void {
  router.push(`/u/${username}`);
}
