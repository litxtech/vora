import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AdminAdCard } from '@/features/admin/components/ads/AdminAdCard';
import { AdminAdReviewSheet } from '@/features/admin/components/ads/AdminAdReviewSheet';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchBusinessAds, reviewBusinessAd, type BusinessAdRow } from '@/features/admin/services/adsManagement';

const STATUS_FILTERS = [
  { id: 'pending' as const, label: 'Bekleyen' },
  { id: 'active' as const, label: 'Aktif' },
  { id: 'ended' as const, label: 'Biten' },
];

export function AdminAdsScreen() {
  const [status, setStatus] = useState<'pending' | 'active' | 'ended'>('pending');
  const [items, setItems] = useState<BusinessAdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<BusinessAdRow | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchBusinessAds(status));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [status]);

  const runReview = async (item: BusinessAdRow, approve: boolean, note?: string) => {
    setActingId(item.id);
    const { error } = await reviewBusinessAd(item.id, approve, note);
    setActingId(null);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    setSelected(null);
    await load(true);
  };

  const confirmReview = (item: BusinessAdRow, approve: boolean) => {
    Alert.alert(
      approve ? 'Reklamı onayla' : 'Reklamı reddet',
      `"${item.title}" reklamını ${approve ? 'onaylayıp 24 saat yayına almak' : 'reddetmek'} istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: approve ? 'Onayla' : 'Reddet',
          style: approve ? 'default' : 'destructive',
          onPress: () => void runReview(item, approve),
        },
      ],
    );
  };

  return (
    <AdminShell title="Reklamlar" subtitle="İşletme reklam onay kuyruğu" refreshing={refreshing} onRefresh={() => load(true)}>
      <AdminFilterChip options={STATUS_FILTERS} value={status} onChange={setStatus} />
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Reklam yok" message="Bu filtrede reklam bulunamadı." icon="megaphone-outline" />
      ) : (
        items.map((item) => (
          <AdminAdCard
            key={item.id}
            ad={item}
            onReview={() => setSelected(item)}
            showQuickActions={status === 'pending'}
            onQuickApprove={() => confirmReview(item, true)}
            onQuickReject={() => confirmReview(item, false)}
            actionLoading={actingId === item.id}
          />
        ))
      )}

      <AdminAdReviewSheet
        ad={selected}
        onClose={() => setSelected(null)}
        onApprove={(item) => confirmReview(item, true)}
        onReject={(item) => confirmReview(item, false)}
        busy={selected ? actingId === selected.id : false}
        showActions={status === 'pending'}
      />
    </AdminShell>
  );
}
