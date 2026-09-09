import { router } from 'expo-router';
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
import { CITY_GOVERNANCE_ACCENT } from '@/features/city-governance/constants';
import {
  createCouncilProposal,
  fetchCouncilProposals,
  startCouncilSession,
  supportCouncilProposal,
  type CouncilProposal,
} from '@/features/city-governance/services/cityCouncil';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';

type Props = {
  slug: string;
  regionId: RegionId;
  regionName: string;
  isLeader?: boolean;
};

function proposalStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Açık';
    case 'qualified':
      return 'Meclise taşındı';
    case 'closed':
      return 'Kapalı';
    default:
      return status;
  }
}

export function CityCouncilScreen({ slug, regionId, regionName, isLeader = false }: Props) {
  const [proposals, setProposals] = useState<CouncilProposal[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionAgenda, setSessionAgenda] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setProposals(await fetchCouncilProposals(regionId));
    setLoading(false);
  }, [regionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <CityPageShell
      slug={slug}
      regionName={regionName}
      activeTab="council"
      subtitle="Halk gündemi, öneriler ve meclis oturumları"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      {isLeader ? (
        <CitySurfaceCard style={styles.card}>
          <CitySectionTitle title="Meclisi Topla" icon="megaphone-outline" />
          <View style={styles.formStack}>
            <Input value={sessionTitle} onChangeText={setSessionTitle} placeholder="Oturum başlığı" />
            <Input value={sessionAgenda} onChangeText={setSessionAgenda} placeholder="Gündem maddeleri" multiline />
          </View>
          <Button
            onPress={() => {
              if (!sessionTitle.trim()) {
                Alert.alert('Meclis', 'Oturum başlığı gerekli');
                return;
              }
              void startCouncilSession(regionId, sessionTitle.trim(), sessionAgenda.trim() || undefined)
                .then((sessionId) => {
                  setSessionTitle('');
                  setSessionAgenda('');
                  router.push(`/council/${sessionId}`);
                })
                .catch((e) => Alert.alert('Hata', e.message));
            }}
          >
            Canlı Oturumu Başlat
          </Button>
        </CitySurfaceCard>
      ) : null}

      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Halk Gündemine Taşı" icon="create-outline" />
        <View style={styles.formStack}>
          <Input value={title} onChangeText={setTitle} placeholder="Konu başlığı" />
          <Input value={description} onChangeText={setDescription} placeholder="Neden önemli?" multiline />
        </View>
        <Button
          onPress={() => {
            if (!title.trim()) {
              Alert.alert('Meclis', 'Başlık gerekli');
              return;
            }
            void createCouncilProposal(regionId, title, description)
              .then(() => {
                setTitle('');
                setDescription('');
                return reload();
              })
              .catch((e) => Alert.alert('Hata', e.message));
          }}
        >
          Öneri Oluştur
        </Button>
      </CitySurfaceCard>

      <CitySectionTitle title="Gündem Önerileri" icon="list-outline" />

      {proposals.length === 0 ? (
        <CitySurfaceCard style={styles.card}>
          <Text secondary>Henüz öneri yok. İlk gündem maddesini sen oluştur.</Text>
        </CitySurfaceCard>
      ) : null}

      {proposals.map((p) => (
        <CitySurfaceCard key={p.id} style={styles.card}>
          <View style={styles.proposalHead}>
            <Text variant="label">{p.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${CITY_GOVERNANCE_ACCENT}18` }]}>
              <Text variant="caption" style={{ color: CITY_GOVERNANCE_ACCENT, fontWeight: '700' }}>
                {proposalStatusLabel(p.status)}
              </Text>
            </View>
          </View>
          {p.description ? <Text secondary>{p.description}</Text> : null}
          <Text variant="caption" secondary>
            {p.supportCount} destek
          </Text>
          {p.status === 'open' || p.status === 'qualified' ? (
            <Button
              size="compact"
              variant="outline"
              onPress={() => {
                void supportCouncilProposal(p.id)
                  .then(reload)
                  .catch((e) => Alert.alert('Hata', e.message));
              }}
            >
              Destekle
            </Button>
          ) : null}
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
  proposalHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
