import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { CanlarScaffold, CanlarSectionTitle } from '@/features/vora-canlar/components/CanlarScaffold';
import { CanlarCampaignVisual, CanlarCaseVisual, CanlarEmptyState } from '@/features/vora-canlar/components/canlarUi';
import { CANLAR_ACCENT, HELP_KIND_OPTIONS } from '@/features/vora-canlar/constants';
import { useCanlarFeed } from '@/features/vora-canlar/hooks/useCanlarFeed';
import { useTheme } from '@/providers/ThemeProvider';

const AID_LABEL: Record<string, string> = {
  food: 'Mama',
  medicine: 'İlaç ve malzeme',
  transport: 'Nakil',
  foster: 'Geçici yuva',
  volunteer_work: 'Gönüllü çalışma',
  care: 'Bakım',
  other: 'Diğer destek',
};

export function CanlarCompletedScreen() {
  const { colors } = useTheme();
  const { feed, loading, refreshing, error, load } = useCanlarFeed();
  const campaigns = feed.completed_campaigns ?? [];
  const aid = feed.delivered_aid ?? [];
  return (
    <CanlarScaffold title="Yapılan yardımlar" refreshing={refreshing} onRefresh={() => void load({ pull: true })}>
      <Text secondary>Yalnızca sonuçlanan kampanyalar ve teslim edilmiş destekler. Teklif aşamasındaki kayıtlar burada durmaz.</Text>
      {loading ? <ActivityIndicator color={CANLAR_ACCENT} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CanlarSectionTitle title="Sonuçlanan kampanyalar" />
      {campaigns.length === 0 && !loading ? <CanlarEmptyState title="Sonuçlanan kampanya yok" body="Hedefi tamamlanan veya kapanan kampanyalar burada görünür." /> : null}
      {campaigns.map((row) => (
        <CanlarCampaignVisual key={row.id} row={row} onPress={() => router.push(`/vora-canlar/campaign/${row.id}` as never)} />
      ))}
      <CanlarSectionTitle title="Teslim edilen destek" />
      {aid.length === 0 && !loading ? <CanlarEmptyState title="Teslim kaydı yok" body="Mama, malzeme ve bakım ancak teslim edilince burada görünür." /> : null}
      {aid.map((row) => (
        <CanlarCaseVisual
          key={row.id}
          row={{
            id: row.case_id ?? row.id,
            name: row.name || AID_LABEL[row.aid_type] || 'Destek',
            city_label: row.city_label ?? undefined,
            cover_url: row.cover_url,
            summary: [AID_LABEL[row.aid_type], row.quantity_note].filter(Boolean).join(' · '),
            status: 'completed',
            created_at: row.created_at,
          }}
          onPress={() => {
            if (row.case_id) router.push(`/vora-canlar/case/${row.case_id}` as never);
          }}
        />
      ))}
      <Text secondary>{HELP_KIND_OPTIONS.map((item) => item.label).join(', ')} kampanya türleridir. Ayni teslim bunlardan ayrı kaydedilir.</Text>
    </CanlarScaffold>
  );
}
