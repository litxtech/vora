import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import {
  CityPageShell,
  CitySurfaceCard,
} from '@/features/city-governance/components/cityUi';
import { fetchCityAgendaFeed } from '@/features/city-governance/services/cityCouncil';
import { spacing } from '@/constants/theme';

function feedTypeLabel(type: string): string {
  switch (type) {
    case 'live_room':
      return 'Canlı oda';
    case 'election':
      return 'Seçim';
    case 'council_session':
      return 'Meclis';
    case 'diplomacy':
      return 'Diplomasi';
    default:
      return 'Gündem';
  }
}

export function VoraAgendaScreen() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchCityAgendaFeed>>>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    setItems(await fetchCityAgendaFeed());
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <CityPageShell
      slug="trabzon"
      regionName="Vora Gündem"
      regionLabel="Karadeniz"
      activeTab="home"
      hideNav
      subtitle="Şehirler arası canlı gündem akışı"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      {items.length === 0 ? (
        <CitySurfaceCard style={styles.card}>
          <Text secondary>Henüz gündem maddesi yok.</Text>
        </CitySurfaceCard>
      ) : null}

      {items.map((item) => (
        <Pressable
          key={`${item.feedType}-${item.id}`}
          onPress={() => {
            if (item.feedType === 'live_room' && item.referenceId) {
              router.push(`/room/${item.referenceId}`);
              return;
            }
            if (item.feedType === 'council_session' && item.referenceId) {
              router.push(`/council/${item.referenceId}`);
            }
          }}
        >
          <CitySurfaceCard style={styles.card}>
            <Text variant="caption" secondary>
              {feedTypeLabel(item.feedType)}
            </Text>
            <Text variant="label">{item.title}</Text>
            {item.subtitle ? <Text secondary>{item.subtitle}</Text> : null}
            <Text secondary variant="caption">
              {new Date(item.occurredAt).toLocaleString('tr-TR')}
            </Text>
          </CitySurfaceCard>
        </Pressable>
      ))}
    </CityPageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
});
