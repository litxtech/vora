import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ReferralProgressBar } from '@/features/referral-earnings/components/ReferralProgressBar';
import {
  REFERRAL_STATUS_COLORS,
  REFERRAL_STATUS_LABELS,
  formatReferralCents,
} from '@/features/referral-earnings/constants';
import type { ReferralInviteeRow } from '@/features/referral-earnings/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  row: ReferralInviteeRow;
};

export function ReferralInviteeCard({ row }: Props) {
  const { colors } = useTheme();
  const statusColor = REFERRAL_STATUS_COLORS[row.status];

  return (
    <GlassCard style={styles.card}>
      <Pressable
        onPress={() => router.push(`/user/${row.inviteeId}` as never)}
        style={({ pressed }) => [styles.header, { opacity: pressed ? 0.85 : 1 }]}
      >
        {row.avatarUrl ? (
          <Image source={{ uri: row.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surfaceElevated }]}>
            <Text variant="label">{row.username.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text variant="label">{row.fullName ?? row.username}</Text>
          <Text variant="caption" muted>
            @{row.username} · {new Date(row.registeredAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
          <Text variant="caption" style={{ color: statusColor }}>
            {REFERRAL_STATUS_LABELS[row.status]}
          </Text>
        </View>
      </Pressable>

      <View style={styles.progress}>
        <ReferralProgressBar label="Üyelik Günü" current={row.membershipDays} target={row.minDays} unit=" gün" />
        <ReferralProgressBar
          label="Aktif Süre"
          current={row.activeMinutes}
          target={row.minActiveMinutes}
          unit=" dk"
        />
        <ReferralProgressBar label="Paylaşım" current={row.sharesCount} target={row.minShares} />
        <ReferralProgressBar
          label="Etkileşim"
          current={row.interactionsCount}
          target={row.minInteractions}
        />
      </View>

      <View style={styles.footer}>
        <Text variant="caption" secondary>
          İlerleme %{row.progressPercent}
        </Text>
        <Text variant="label" style={{ color: colors.success }}>
          {formatReferralCents(row.amountCents)}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: radius.full },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md },
  progress: { gap: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
