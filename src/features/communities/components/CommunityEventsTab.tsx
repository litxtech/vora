import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { communityCreateEventPath } from '@/features/communities/constants';
import type { CommunityDetail } from '@/features/communities/types';
import { EventCard } from '@/features/events/components/EventCard';
import { fetchCommunityEvents } from '@/features/events/services/eventData';
import type { EventListing } from '@/features/events/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityEventsTabProps = {
  detail: CommunityDetail;
};

export function CommunityEventsTab({ detail }: CommunityEventsTabProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [events, setEvents] = useState<EventListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setEvents(await fetchCommunityEvents(detail.id, user?.id ?? null));
  }, [detail.id, user?.id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  return (
    <View style={styles.wrap}>
      {detail.isMember ? (
        <Button
          title="Etkinlik Oluştur"
          variant="outline"
          onPress={() => router.push(communityCreateEventPath(detail.id, detail.name) as never)}
          fullWidth={false}
        />
      ) : null}

      {events.length === 0 ? (
        <GlassCard style={styles.empty}>
          <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
          <Text secondary>Henüz etkinlik yok.</Text>
          {detail.isMember ? (
            <Text variant="caption" secondary>
              Topluluğunuz için bir buluşma veya etkinlik planlayın.
            </Text>
          ) : null}
        </GlassCard>
      ) : (
        events.map((event) => <EventCard key={event.id} event={event} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
