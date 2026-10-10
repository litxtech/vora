import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { friendshipLabel } from '@/features/contact-discovery/services/policy';
import type { ContactMatch } from '@/features/contact-discovery/types';
import { toggleFollow } from '@/features/feed/services/engagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MatchResultListProps = {
  matches: ContactMatch[];
  viewerId: string;
};

export function MatchResultList({ matches, viewerId }: MatchResultListProps) {
  const { colors } = useTheme();
  const [rows, setRows] = useState(matches);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(matches);
  }, [matches]);

  const addFriend = async (match: ContactMatch) => {
    setPendingId(match.userId);
    setError(null);
    const result = await toggleFollow(match.userId, viewerId, false);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRows((current) =>
      current.map((row) =>
        row.userId === match.userId
          ? {
              ...row,
              viewerFollows: true,
              isFriend: row.followsViewer,
            }
          : row,
      ),
    );
  };

  return (
    <View style={styles.list}>
      <Text variant="label" accessibilityRole="header">
        Eşleşen üyeler ({rows.length})
      </Text>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {rows.map((match) => {
        const title = match.fullName?.trim() || `@${match.username}`;
        const limitedProfile = !match.fullName && !match.avatarUrl;
        return (
          <View
            key={match.userId}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityLabel={`${title}, ${friendshipLabel(match)}`}
          >
            <ProfileAvatar username={match.username} avatarUrl={match.avatarUrl} isVerified={match.isVerified} size={48} />
            <View style={styles.meta}>
              <Text variant="label" numberOfLines={1}>
                {title}
              </Text>
              <Text secondary variant="caption" numberOfLines={1}>
                @{match.username}
              </Text>
              <Text variant="caption">{friendshipLabel(match)}</Text>
              {limitedProfile ? (
                <Text secondary variant="caption">
                  Profil ayrıntıları gizlilik ayarına göre sınırlı.
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  title="Profili görüntüle"
                  variant="outline"
                  size="compact"
                  fullWidth={false}
                  onPress={() => router.push(`/user/${match.userId}` as never)}
                  accessibilityLabel={`${match.username} profilini görüntüle`}
                />
                {match.viewerFollows ? null : (
                  <Button
                    title="Arkadaş ekle"
                    size="compact"
                    fullWidth={false}
                    loading={pendingId === match.userId}
                    onPress={() => void addFriend(match)}
                    accessibilityLabel={`${match.username} kullanıcısını arkadaş olarak ekle`}
                  />
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  meta: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});
