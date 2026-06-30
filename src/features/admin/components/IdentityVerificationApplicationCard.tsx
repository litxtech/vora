import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import {
  approveIdentityVerification,
  rejectIdentityVerification,
  type IdentityApprovalRow,
} from '@/features/admin/services/identityApprovals';
import { getIdentityDocumentSignedUrl } from '@/features/admin/services/identityDocumentAccess';
import {
  IDENTITY_DOCUMENT_OPTIONS,
  IDENTITY_STATUS_LABELS,
} from '@/features/identity-verification/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type IdentityVerificationApplicationCardProps = {
  item: IdentityApprovalRow;
  rejecting: boolean;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  onUpdated: () => void;
  onOpenDocument: (uri: string, label: string) => void;
  onOpenDocumentLoading: (label: string) => void;
  onOpenDocumentFailed: () => void;
};

type DocumentThumbProps = {
  path: string;
  label: string;
  onOpen: (uri: string, label: string) => void;
  onLoading: (label: string) => void;
  onFailed: () => void;
};

function documentLabel(type: string): string {
  return IDENTITY_DOCUMENT_OPTIONS.find((option) => option.id === type)?.label ?? type;
}

function DocumentThumb({ path, label, onOpen, onLoading, onFailed }: DocumentThumbProps) {
  const { colors } = useTheme();
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadThumb = async () => {
    setLoading(true);
    setFailed(false);
    const url = await getIdentityDocumentSignedUrl(path);
    setThumbUrl(url);
    setFailed(!url);
    setLoading(false);
    return url;
  };

  useEffect(() => {
    let mounted = true;
    void loadThumb().then(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, [path]);

  const handlePress = async () => {
    onLoading(label);
    const url = thumbUrl ?? (await loadThumb());
    if (!url) {
      Alert.alert('Hata', `${label} açılamadı.`);
      onFailed();
      return;
    }
    onOpen(url, label);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.thumb, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} — büyük ekranda aç`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.thumbImage} contentFit="cover" cachePolicy="none" />
      ) : (
        <Pressable onPress={() => void loadThumb()} hitSlop={8}>
          <Ionicons name={failed ? 'refresh-outline' : 'image-outline'} size={22} color={colors.textMuted} />
        </Pressable>
      )}
      <Text variant="caption" numberOfLines={1} style={styles.thumbLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IdentityVerificationApplicationCard({
  item,
  rejecting,
  rejectReason,
  onRejectReasonChange,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onUpdated,
  onOpenDocument,
  onOpenDocumentLoading,
  onOpenDocumentFailed,
}: IdentityVerificationApplicationCardProps) {
  const { colors } = useTheme();
  const [exportingPdf, setExportingPdf] = useState(false);
  const statusMeta = IDENTITY_STATUS_LABELS[item.status];

  const handleApprove = () => {
    Alert.alert('Onayla', `@${item.username} kimlik başvurusu onaylansın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await approveIdentityVerification(item.id);
          if (error) Alert.alert('Hata', error);
          else onUpdated();
        },
      },
    ]);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const mod = await import('@/features/admin/services/identityPdfExport');
      const exportPdf = mod?.exportIdentityVerificationPdf;
      if (!exportPdf) {
        Alert.alert('PDF hatası', 'PDF modülü yüklenemedi.');
        return;
      }
      const { error } = await exportPdf(item);
      if (error) Alert.alert('PDF hatası', error);
    } catch {
      Alert.alert(
        'PDF hatası',
        "PDF modülü yüklenemedi. Dev client'ı yeniden oluşturup tekrar deneyin.",
      );
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <GlassCard style={styles.row}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Pressable onPress={() => router.push(`/admin/users/${item.user_id}` as Href)}>
            <Text variant="label" style={{ color: colors.primary }}>
              @{item.username}
            </Text>
          </Pressable>
          <Text variant="label">{item.applicant_name}</Text>
          {item.full_name && item.full_name !== item.applicant_name ? (
            <Text secondary variant="caption">
              Profil adı: {item.full_name}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}18` }]}>
          <Text variant="caption">
            {statusMeta.emoji} {statusMeta.label}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoCell label="Belge" value={documentLabel(item.document_type)} />
        <InfoCell
          label="Doğum"
          value={
            item.birth_date
              ? new Date(`${item.birth_date}T12:00:00`).toLocaleDateString('tr-TR')
              : '—'
          }
        />
        <InfoCell
          label="Başvuru"
          value={new Date(item.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        />
      </View>

      <Text variant="caption" secondary>
        Belgelere dokunarak büyük ekranda inceleyin
      </Text>

      <View style={styles.thumbRow}>
        <DocumentThumb
          path={item.id_front_path}
          label="Ön yüz"
          onOpen={onOpenDocument}
          onLoading={onOpenDocumentLoading}
          onFailed={onOpenDocumentFailed}
        />
        {item.id_back_path ? (
          <DocumentThumb
            path={item.id_back_path}
            label="Arka yüz"
            onOpen={onOpenDocument}
            onLoading={onOpenDocumentLoading}
            onFailed={onOpenDocumentFailed}
          />
        ) : null}
        <DocumentThumb
          path={item.selfie_path}
          label="Selfie"
          onOpen={onOpenDocument}
          onLoading={onOpenDocumentLoading}
          onFailed={onOpenDocumentFailed}
        />
      </View>

      <View style={styles.actions}>
        <AdminActionChip
          label={exportingPdf ? 'PDF hazırlanıyor…' : 'PDF İndir'}
          icon="download-outline"
          tone="primary"
          onPress={handleExportPdf}
        />
        <AdminActionChip
          label="Kullanıcı profili"
          icon="person-outline"
          onPress={() => router.push(`/admin/users/${item.user_id}` as Href)}
        />
      </View>

      {item.status === 'pending' || item.status === 'in_review' ? (
        <View style={styles.actions}>
          <AdminActionChip
            label="Onayla"
            icon="checkmark-circle-outline"
            tone="success"
            onPress={handleApprove}
          />
          <AdminActionChip
            label="Reddet"
            icon="close-circle-outline"
            tone="danger"
            onPress={onStartReject}
          />
        </View>
      ) : item.rejection_reason ? (
        <Text secondary variant="caption">
          Red gerekçesi: {item.rejection_reason}
        </Text>
      ) : null}

      {rejecting ? (
        <View style={styles.rejectBox}>
          <Input
            label="Red gerekçesi"
            value={rejectReason}
            onChangeText={onRejectReasonChange}
            placeholder="Belge okunmuyor, fotoğraf bulanık vb."
            multiline
          />
          <View style={styles.actions}>
            <AdminActionChip label="Vazgeç" icon="close" onPress={onCancelReject} />
            <AdminActionChip label="Reddet" icon="warning" tone="danger" onPress={onConfirmReject} />
          </View>
        </View>
      ) : null}
    </GlassCard>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Text variant="caption">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoCell: {
    minWidth: '30%',
    gap: 2,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    flex: 1,
    minHeight: 108,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  thumbImage: {
    width: '100%',
    height: 72,
    borderRadius: radius.sm,
  },
  thumbLabel: {
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  rejectBox: { gap: spacing.sm },
});
