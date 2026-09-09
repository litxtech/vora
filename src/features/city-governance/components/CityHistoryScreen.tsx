import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import {
  CityPageShell,
  CitySectionTitle,
  CitySurfaceCard,
} from '@/features/city-governance/components/cityUi';
import {
  fetchCityHistoryEvents,
  fetchCityLeadershipHistory,
} from '@/features/city-governance/services/cityElections';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';

type Props = {
  slug: string;
  regionId: RegionId;
  regionName: string;
};

export function CityHistoryScreen({ slug, regionId, regionName }: Props) {
  const [events, setEvents] = useState<Awaited<ReturnType<typeof fetchCityHistoryEvents>>>([]);
  const [leaders, setLeaders] = useState<Awaited<ReturnType<typeof fetchCityLeadershipHistory>>>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [e, l] = await Promise.all([
      fetchCityHistoryEvents(regionId),
      fetchCityLeadershipHistory(regionId),
    ]);
    setEvents(e);
    setLeaders(l);
    setLoading(false);
  }, [regionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <CityPageShell
      slug={slug}
      regionName={regionName}
      activeTab="history"
      subtitle="Liderlik dönemleri ve şehir olayları"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      <CitySectionTitle title="Liderler" icon="ribbon-outline" />
      {leaders.length === 0 ? (
        <CitySurfaceCard style={styles.card}>
          <Text secondary>Henüz kayıtlı liderlik dönemi yok.</Text>
        </CitySurfaceCard>
      ) : null}
      {leaders.map((l) => (
        <CitySurfaceCard key={l.id} style={styles.card}>
          <Text variant="label">{l.fullName ?? l.username}</Text>
          <Text secondary variant="caption">
            {new Date(l.startedAt).toLocaleDateString('tr-TR')}
            {l.endedAt ? ` – ${new Date(l.endedAt).toLocaleDateString('tr-TR')}` : ' – görevde'}
          </Text>
        </CitySurfaceCard>
      ))}

      <CitySectionTitle title="Olaylar" icon="book-outline" />
      {events.length === 0 ? (
        <CitySurfaceCard style={styles.card}>
          <Text secondary>Henüz şehir olayı kaydı yok.</Text>
        </CitySurfaceCard>
      ) : null}
      {events.map((e) => (
        <CitySurfaceCard key={e.id} style={styles.card}>
          <Text variant="label">{e.title}</Text>
          {e.description ? <Text secondary>{e.description}</Text> : null}
          <Text secondary variant="caption">
            {new Date(e.occurredAt).toLocaleDateString('tr-TR')}
          </Text>
        </CitySurfaceCard>
      ))}
    </CityPageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
});
