import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { APPLICATION_STATUS_LABELS, listingDetailPath } from '@/features/personnel-center/constants';
import { PERSONNEL_FEATURE } from '@/features/personnel-center/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import type { JobApplication, JobApplicationStatus } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_COLORS: Record<JobApplicationStatus, string> = {
  sent: '#1E88E5',
  reviewing: '#FFB300',
  interview: '#9C27B0',
  accepted: '#43A047',
  rejected: '#EF5350',
};

type ApplicationCardProps = {
  application: JobApplication;
};

export function ApplicationCard({ application }: ApplicationCardProps) {
  const { colors } = useTheme();
  const showChat = useFeatureVisible(PERSONNEL_FEATURE.applicationChat);
  const statusColor = STATUS_COLORS[application.status];

  const openListing = () => {
    router.push(listingDetailPath(application.listingType, application.listingId) as never);
  };

  const openChat = () => {
    if (application.conversationId) {
      router.push(`/chat/${application.conversationId}` as never);
    }
  };

  return (
    <Pressable onPress={openListing}>
      <GlassCard style={[styles.card, { borderLeftWidth: 3, borderLeftColor: statusColor }]}>
        <View style={styles.header}>
          <Text variant="label" numberOfLines={2} style={styles.title}>
            {application.listingTitle}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text variant="caption" style={{ color: statusColor }}>
              {APPLICATION_STATUS_LABELS[application.status]}
            </Text>
          </View>
        </View>

        {application.employerName ? (
          <Text secondary variant="caption">
            {application.employerName}
          </Text>
        ) : null}

        {application.message ? (
          <Text secondary variant="caption" numberOfLines={2}>
            {application.message}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text secondary variant="caption">
            {new Date(application.createdAt).toLocaleDateString('tr-TR')}
          </Text>
          {showChat && application.conversationId ? (
            <Pressable onPress={openChat}>
              <Text variant="caption" style={{ color: colors.primary }}>
                Başvuru sohbeti
              </Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { flex: 1 },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
