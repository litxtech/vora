import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  fetchBusinessEvents,
  fetchBusinessJobs,
  type BusinessEvent,
  type BusinessJob,
} from '@/features/profile/services/businessProfile';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BusinessListingsSectionProps = {
  businessId: string;
  organizerId: string;
};

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function BusinessListingsSection({ businessId, organizerId }: BusinessListingsSectionProps) {
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<BusinessJob[]>([]);
  const [events, setEvents] = useState<BusinessEvent[]>([]);

  useEffect(() => {
    fetchBusinessJobs(businessId).then(setJobs);
    fetchBusinessEvents(organizerId).then(setEvents);
  }, [businessId, organizerId]);

  if (jobs.length === 0 && events.length === 0) return null;

  return (
    <View style={styles.container}>
      {jobs.length > 0 ? (
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
            <Text variant="label">İş İlanları</Text>
          </View>
          {jobs.map((job) => (
            <Pressable
              key={job.id}
              style={[styles.item, { borderColor: colors.border }]}
              onPress={() => router.push(`/detail/jobs/${job.id}` as never)}
            >
              <Text variant="label" numberOfLines={1}>
                {job.title}
              </Text>
              {job.salaryRange ? (
                <Text secondary variant="caption">
                  {job.salaryRange}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.chevron} />
            </Pressable>
          ))}
        </GlassCard>
      ) : null}

      {events.length > 0 ? (
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text variant="label">Etkinlikler</Text>
          </View>
          {events.map((event) => (
            <Pressable
              key={event.id}
              style={[styles.item, { borderColor: colors.border }]}
              onPress={() => router.push(`/detail/events/${event.id}` as never)}
            >
              <Text variant="label" numberOfLines={1}>
                {event.title}
              </Text>
              <Text secondary variant="caption">
                {formatEventDate(event.startsAt)}
                {event.locationName ? ` · ${event.locationName}` : ''}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.chevron} />
            </Pressable>
          ))}
        </GlassCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm, gap: 2 },
  chevron: { position: 'absolute', right: 0, top: spacing.sm },
});
