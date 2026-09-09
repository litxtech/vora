import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  CityPageShell,
  CitySectionTitle,
  CitySurfaceCard,
} from '@/features/city-governance/components/cityUi';
import { CITY_DIPLOMACY_ACCENT } from '@/features/city-diplomacy/constants';
import {
  fetchCityLeaders,
  sendDiplomacyRequest,
} from '@/features/city-diplomacy/services/diplomacyData';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';

type Props = {
  slug: string;
  regionId: RegionId;
  regionName: string;
};

export function CityDiplomacyScreen({ slug, regionId, regionName }: Props) {
  const [leaders, setLeaders] = useState<Awaited<ReturnType<typeof fetchCityLeaders>>>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLeaders(await fetchCityLeaders());
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const contact = async (toRegionId: RegionId, toName: string) => {
    setBusy(true);
    try {
      await sendDiplomacyRequest(toRegionId, 'leader_call', `${regionName} × ${toName}`, message || undefined);
      Alert.alert('Gönderildi', `${toName} liderine görüşme talebi iletildi.`);
      setMessage('');
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Gönderilemedi');
    } finally {
      setBusy(false);
    }
  };

  const peers = leaders.filter((l) => l.regionId !== regionId && l.leader);

  return (
    <CityPageShell
      slug={slug}
      regionName={regionName}
      activeTab="diplomacy"
      subtitle="Aktif şehir liderleriyle iletişim"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Mesajın" icon="chatbubble-ellipses-outline" />
        <View style={styles.formStack}>
          <Input
            value={message}
            onChangeText={setMessage}
            placeholder="Kısa bir giriş mesajı (opsiyonel)"
            multiline
          />
        </View>
        <Text secondary variant="caption">
          Lider hattı talebi gönderir. Karşı taraf kabul ederse görüşme başlar.
        </Text>
      </CitySurfaceCard>

      <CitySectionTitle title="Aktif Liderler" icon="people-outline" />

      {peers.length === 0 ? (
        <CitySurfaceCard style={styles.card}>
          <Text secondary>Şu an görüşülebilecek başka şehir lideri yok.</Text>
        </CitySurfaceCard>
      ) : null}

      {peers.map((item) => (
        <CitySurfaceCard key={item.regionId} style={styles.card}>
          <View style={styles.leaderRow}>
            <View style={[styles.leaderBadge, { backgroundColor: `${CITY_DIPLOMACY_ACCENT}18` }]}>
              <Text style={{ color: CITY_DIPLOMACY_ACCENT, fontWeight: '800' }}>
                {item.regionName.charAt(0)}
              </Text>
            </View>
            <View style={styles.leaderCopy}>
              <Text variant="label">{item.regionName}</Text>
              <Text secondary variant="caption">
                {item.leader?.full_name ?? item.leader?.username}
              </Text>
            </View>
          </View>
          <Button size="compact" onPress={() => void contact(item.regionId, item.regionName)} loading={busy}>
            Görüşme Talebi Gönder
          </Button>
        </CitySurfaceCard>
      ))}
    </CityPageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  formStack: {
    gap: spacing.sm,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  leaderBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderCopy: {
    flex: 1,
    gap: 2,
  },
});
