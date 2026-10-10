import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CanlarButton, CanlarScaffold, CanlarSectionTitle } from '@/features/vora-canlar/components/CanlarScaffold';
import {
  CanlarCampaignVisual,
  CanlarCaseVisual,
  CanlarChipRail,
  CanlarEmptyState,
  CanlarPostVisual,
} from '@/features/vora-canlar/components/canlarUi';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { type CanlarPostCard } from '@/features/vora-canlar/services/api';
import { useCanlarFeed } from '@/features/vora-canlar/hooks/useCanlarFeed';
import { describeCanlarPost } from '@/features/vora-canlar/services/contentKind';
import { useTheme } from '@/providers/ThemeProvider';

function useFeed() {
  return useCanlarFeed();
}

export function CanlarUrgentScreen() {
  const { colors } = useTheme();
  const { feed, loading, refreshing, error, load } = useFeed();
  return (
    <CanlarScaffold title="Acil yardım" refreshing={refreshing} onRefresh={() => void load({ pull: true })}>
      <Text secondary>Hâlâ açık olan acil kayıtlar.</Text>
      {loading ? <ActivityIndicator color={CANLAR_ACCENT} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!loading && feed.urgent.length === 0 ? (
        <CanlarEmptyState title="Şu anda açık acil vaka yok" body="Açık acil kayıtlar burada durur." />
      ) : null}
      {feed.urgent.map((row) => (
        <CanlarCaseVisual key={row.id} row={row} onPress={() => router.push(`/vora-canlar/case/${row.id}` as never)} />
      ))}
    </CanlarScaffold>
  );
}

const POST_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'community', label: 'Topluluk' },
  { id: 'urgent', label: 'Acil çağrı' },
  { id: 'case', label: 'Vakaya bağlı' },
  { id: 'campaign', label: 'Kampanya' },
  { id: 'treatment', label: 'Tedavi güncellemesi' },
];

export function CanlarCommunityScreen() {
  const { colors } = useTheme();
  const { feed, loading, refreshing, error, load } = useFeed();
  const [filter, setFilter] = useState('all');
  const posts = feed.posts.filter((post) => filter === 'all' || filter === 'treatment' || describeCanlarPost(post).kind === filter);
  return (
    <CanlarScaffold title="Paylaşımlar" refreshing={refreshing} onRefresh={() => void load({ pull: true })}>
      <Text secondary>Topluluk gönderisi, vaka ve kampanya aynı kart değildir. Tür rozeti kaydın ne olduğunu söyler.</Text>
      <CanlarButton label="Paylaşım oluştur" icon="add" onPress={() => router.push('/vora-canlar/post/create' as never)} />
      <CanlarChipRail items={POST_FILTERS} value={filter} onChange={setFilter} />
      {loading ? <ActivityIndicator color={CANLAR_ACCENT} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {filter === 'treatment' ? (
        <View style={{ gap: 12 }}>
          <CanlarSectionTitle title="Tedavi ve durum kayıtları" caption="Bunlar gönderi değildir. Mevcut dosyaya yazılmış herkese açık notlardır." />
          {feed.updates.length === 0 && !loading ? <CanlarEmptyState title="Herkese açık gelişme yok" body="Yetkili bir durum notu yazılınca burada görünür." /> : null}
          {feed.updates.map((row) => (
            <CanlarCaseVisual
              key={`${row.id ?? row.case_id}-${row.created_at}`}
              row={{
                id: row.case_id ?? row.id ?? '',
                name: row.name,
                public_code: row.public_code,
                city_label: row.city_label,
                cover_url: row.cover_url,
                species: row.species ?? undefined,
                status: row.to_status ?? row.status,
                treatment_status: row.treatment_status ?? undefined,
                summary: row.note,
                created_at: row.created_at,
              }}
              onPress={() => {
                const caseId = row.case_id ?? row.id;
                if (caseId) router.push(`/vora-canlar/case/${caseId}` as never);
              }}
            />
          ))}
        </View>
      ) : (
        <>
          {!loading && posts.length === 0 ? <CanlarEmptyState title="Bu türde paylaşım yok" body="Başka bir filtre seçin veya ilk paylaşımı siz yazın." action="Paylaş" onAction={() => router.push('/vora-canlar/post/create' as never)} /> : null}
          {posts.map((post) => (
            <PostBlock key={post.id} post={post} />
          ))}
        </>
      )}
    </CanlarScaffold>
  );
}

function PostBlock({ post }: { post: CanlarPostCard }) {
  return <CanlarPostVisual post={post} onPress={() => router.push(`/vora-canlar/post/${post.id}` as never)} />;
}

export function CanlarCampaignListScreen() {
  const { colors } = useTheme();
  const { feed, loading, refreshing, error, load } = useFeed();
  return (
    <CanlarScaffold title="Kampanyalar" refreshing={refreshing} onRefresh={() => void load({ pull: true })}>
      <Text secondary>Yayındaki bağışlar. Toplanan tutar burada görünür.</Text>
      {loading ? <ActivityIndicator color={CANLAR_ACCENT} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CanlarSectionTitle title="Bağış kampanyaları" />
      {feed.campaigns.length === 0 && !loading ? <CanlarEmptyState title="Yayında bağış kampanyası yok" body="İncelemeden geçen kampanyalar burada kart olarak durur." /> : null}
      {feed.campaigns.map((row) => (
        <CanlarCampaignVisual key={row.id} row={row} onPress={() => router.push(`/vora-canlar/campaign/${row.id}` as never)} />
      ))}
    </CanlarScaffold>
  );
}
