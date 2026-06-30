import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { CenterShell } from '@/features/centers/components/CenterShell';
import { DUTY_TABS, DUTY_TYPES, type DutyListing, type DutyListingType } from '@/features/duty/constants';
import { fetchDutyListings } from '@/features/duty/services/dutyData';
import { spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';

function DutyCard({ item }: { item: DutyListing }) {
  const type = DUTY_TYPES[item.listingType];
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${type.color}22` }]}>
          <Ionicons name={type.icon as keyof typeof Ionicons.glyphMap} size={20} color={type.color} />
        </View>
        <View style={styles.meta}>
          <Text variant="label">{item.name}</Text>
          {item.address ? <Text secondary variant="caption">{item.address}</Text> : null}
          {item.openUntil ? (
            <Text variant="caption" style={{ color: type.color }}>
              {item.isOpen ? `Açık · ${item.openUntil}'a kadar` : 'Kapalı'}
            </Text>
          ) : null}
        </View>
        {item.phone ? (
          <Pressable onPress={() => void openUrl(`tel:${item.phone}`)}>
            <Ionicons name="call" size={22} color={type.color} />
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

export function DutyCenterScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<DutyListingType>('pharmacy');
  const [listings, setListings] = useState<DutyListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setListings(await fetchDutyListings(profile?.region_id ?? null, tab));
    setLoading(false);
  }, [profile?.region_id, tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CenterShell
      title="Nöbetçi Merkezi"
      subtitle="Nöbetçi eczane, açık veteriner, hastane ve akaryakıt istasyonu"
      tabs={DUTY_TABS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as DutyListingType)}
      loading={loading}
      onRefresh={load}
      hasContent={listings.length > 0}
      emptyIcon="medkit-outline"
      emptyMessage="Bugün için kayıt bulunamadı."
    >
      {listings.map((item) => (
        <DutyCard key={item.id} item={item} />
      ))}
    </CenterShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 2 },
});
