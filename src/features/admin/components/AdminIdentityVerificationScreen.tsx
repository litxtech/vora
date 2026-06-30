import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminIdentityDocumentViewer } from '@/features/admin/components/shared/AdminIdentityDocumentViewer';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { IdentityVerificationApplicationCard } from '@/features/admin/components/IdentityVerificationApplicationCard';
import {
  fetchIdentityVerifications,
  rejectIdentityVerification,
  type IdentityApprovalRow,
} from '@/features/admin/services/identityApprovals';

const STATUS_FILTERS = [
  { id: 'pending' as const, label: 'Bekleyen' },
  { id: 'in_review' as const, label: 'İnceleniyor' },
  { id: 'approved' as const, label: 'Onaylı' },
  { id: 'rejected' as const, label: 'Reddedildi' },
  { id: 'all' as const, label: 'Tümü' },
];

type ViewerState = {
  uri: string | null;
  label: string;
  loading: boolean;
};

export function AdminIdentityVerificationScreen() {
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('pending');
  const [items, setItems] = useState<IdentityApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await fetchIdentityVerifications(
      filter === 'all' ? undefined : filter,
    );

    if (error) Alert.alert('Hata', error);
    setItems(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const openDocument = (uri: string, label: string) => {
    if (!uri) {
      setViewer(null);
      return;
    }
    setViewer({ uri, label, loading: false });
  };

  const openDocumentLoading = (label: string) => {
    setViewer({ uri: null, label, loading: true });
  };

  const confirmReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      Alert.alert('Gerekçe zorunlu', 'Red gerekçesi yazın.');
      return;
    }

    const { error } = await rejectIdentityVerification(rejectingId, rejectReason.trim());
    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    setRejectingId(null);
    setRejectReason('');
    load(true);
  };

  return (
    <>
      <AdminShell
        title="Kimlik Doğrulama"
        subtitle="Bireysel kimlik başvuruları — belgeleri büyük ekranda inceleyin"
        requireAdmin={false}
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <AdminFilterChip options={STATUS_FILTERS} value={filter} onChange={setFilter} />

        {loading ? (
          <AdminEmptyState loading />
        ) : items.length === 0 ? (
          <AdminEmptyState
            title="Başvuru yok"
            message="Bu filtrede kimlik doğrulama başvurusu bulunamadı."
            icon="id-card-outline"
          />
        ) : (
          items.map((item) => (
            <IdentityVerificationApplicationCard
              key={item.id}
              item={item}
              rejecting={rejectingId === item.id}
              rejectReason={rejectReason}
              onRejectReasonChange={setRejectReason}
              onStartReject={() => {
                setRejectingId(item.id);
                setRejectReason('');
              }}
              onCancelReject={() => setRejectingId(null)}
              onConfirmReject={confirmReject}
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
          onClose={() => setViewer(null)}
        />
      ) : null}
    </>
  );
}
