import { useEffect, useState } from 'react';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminIdentityDocumentViewer } from '@/features/admin/components/shared/AdminIdentityDocumentViewer';
import type { AdminDocumentMediaType } from '@/features/admin/services/adminDocumentPresentation';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { BusinessVerificationApplicationCard } from '@/features/admin/components/BusinessVerificationApplicationCard';
import {
  fetchBusinesses,
  type BusinessApprovalRow,
  type BusinessFilter,
} from '@/features/admin/services/businessApprovals';

const FILTERS = [
  { id: 'pending' as const, label: 'Bekleyen' },
  { id: 'approved' as const, label: 'Onaylı' },
  { id: 'rejected' as const, label: 'Reddedilen' },
  { id: 'all' as const, label: 'Tümü' },
];

type ViewerState = {
  uri: string | null;
  label: string;
  loading: boolean;
  mediaType: AdminDocumentMediaType;
};

export function AdminBusinessesScreen() {
  const [filter, setFilter] = useState<BusinessFilter>('pending');
  const [search, setSearch] = useState('');
  const [businesses, setBusinesses] = useState<BusinessApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await fetchBusinesses(filter, search);
    setBusinesses(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [filter, search]);

  const openDocument = (uri: string, label: string, mediaType: AdminDocumentMediaType) => {
    if (!uri) {
      setViewer(null);
      return;
    }
    setViewer({ uri, label, loading: false, mediaType });
  };

  const openDocumentLoading = (label: string, mediaType: AdminDocumentMediaType) => {
    setViewer({ uri: null, label, loading: true, mediaType });
  };

  return (
    <>
      <AdminShell
        title="Kurumsal Hesaplar"
        subtitle="Başvuru inceleme — belgeleri ve işletme bilgilerini görüntüleyin"
        requireAdmin
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <AdminFilterChip options={FILTERS} value={filter} onChange={setFilter} />
        <AdminSearchInput value={search} onChangeText={setSearch} placeholder="İşletme veya kategori ara..." />

        {loading ? (
          <AdminEmptyState loading />
        ) : businesses.length === 0 ? (
          <AdminEmptyState
            title="Kayıt yok"
            message="Seçili filtreye uygun kurumsal hesap bulunamadı."
            icon="business-outline"
          />
        ) : (
          businesses.map((item) => (
            <BusinessVerificationApplicationCard
              key={item.id}
              item={item}
              onUpdated={() => load(true)}
              onOpenDocument={openDocument}
              onOpenDocumentLoading={openDocumentLoading}
              onOpenDocumentFailed={() => setViewer(null)}
            />
          ))
        )}
      </AdminShell>

      {viewer ? (
        <AdminIdentityDocumentViewer
          uri={viewer.uri}
          label={viewer.label}
          loading={viewer.loading}
          mediaType={viewer.mediaType}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </>
  );
}
