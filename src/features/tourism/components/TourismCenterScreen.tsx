import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { CenterShell } from '@/features/centers/components/CenterShell';
import { TOURISM_CATEGORIES, TOURISM_TABS, type TourismCategory, type TourismPlace } from '@/features/tourism/constants';
import { fetchTourismPlaces } from '@/features/tourism/services/tourismData';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

function TourismCard({ place }: { place: TourismPlace }) {
  const cat = TOURISM_CATEGORIES[place.category];
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${cat.color}22` }]}>
          <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={cat.color} />
        </View>
        <View style={styles.meta}>
          <Text variant="label">{place.name}</Text>
          {place.address ? <Text secondary variant="caption">{place.address}</Text> : null}
        </View>
        {place.rating != null ? (
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color="#F9A825" />
            <Text variant="caption">{place.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      {place.description ? <Text secondary variant="caption" numberOfLines={2}>{place.description}</Text> : null}
    </GlassCard>
  );
}

export function TourismCenterScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<TourismCategory | 'all'>('all');
  const [places, setPlaces] = useState<TourismPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setPlaces(await fetchTourismPlaces(profile?.region_id ?? null, tab));
    setLoading(false);
  }, [profile?.region_id, tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <CenterShell
      title="Turizm Merkezi"
      subtitle="Karadeniz'e gelen turistler için gezilecek yerler, şelaleler ve yaylalar"
      tabs={TOURISM_TABS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as TourismCategory | 'all')}
      loading={loading}
      onRefresh={load}
      hasContent={places.length > 0}
      emptyIcon="compass-outline"
    >
      {places.map((p) => <TourismCard key={p.id} place={p} />)}
    </CenterShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
