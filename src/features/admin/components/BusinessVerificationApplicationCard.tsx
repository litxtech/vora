import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminPdfPreviewThumb } from '@/features/admin/components/shared/AdminPdfPreviewThumb';
import type { AdminDocumentMediaType } from '@/features/admin/services/adminDocumentPresentation';
import {
  approveBusiness,
  rejectBusiness,
  setBusinessPremium,
  type BusinessApprovalRow,
} from '@/features/admin/services/businessApprovals';
import {
  getBusinessDocumentSignedUrl,
  getBusinessDocumentViewUri,
  isBusinessDocumentPdf,
} from '@/features/admin/services/businessDocumentAccess';
import { BUSINESS_STATUS_LABELS } from '@/features/admin/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BusinessVerificationApplicationCardProps = {
  item: BusinessApprovalRow;
  onUpdated: () => void;
  onOpenDocument: (uri: string, label: string, mediaType: AdminDocumentMediaType) => void;
  onOpenDocumentLoading: (label: string, mediaType: AdminDocumentMediaType) => void;
  onOpenDocumentFailed: () => void;
};

type DocumentThumbProps = {
  urlOrPath: string;
  label: string;
  onOpen: (uri: string, label: string, mediaType: AdminDocumentMediaType) => void;
  onLoading: (label: string, mediaType: AdminDocumentMediaType) => void;
  onFailed: () => void;
};

function documentNameFromPath(urlOrPath: string, index: number): string {
  const parts = urlOrPath.split('/').pop()?.split('?')[0] ?? '';
  return parts || `Belge ${index + 1}`;
}

function DocumentThumb({ urlOrPath, label, onOpen, onLoading, onFailed }: DocumentThumbProps) {
  const { colors } = useTheme();
  const isPdf = isBusinessDocumentPdf(urlOrPath);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadThumb = async () => {
    setLoading(true);
    setFailed(false);
    const url = await getBusinessDocumentSignedUrl(urlOrPath);
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
  }, [urlOrPath]);

  const handlePress = async () => {
    onLoading(label, isPdf ? 'pdf' : 'image');
    const url = isPdf
      ? (thumbUrl ?? (await getBusinessDocumentViewUri(urlOrPath)))
      : (thumbUrl ?? (await loadThumb()));
    if (!url) {
      Alert.alert('Hata', `${label} açılamadı.`);
      onFailed();
      return;
    }

    onOpen(url, label, isPdf ? 'pdf' : 'image');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.thumb, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} — uygulama içinde aç`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : thumbUrl && isPdf ? (
        <AdminPdfPreviewThumb uri={thumbUrl} />
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

export function BusinessVerificationApplicationCard({
  item,
  onUpdated,
  onOpenDocument,
  onOpenDocumentLoading,
  onOpenDocumentFailed,
}: BusinessVerificationApplicationCardProps) {
  const { colors } = useTheme();
  const owner = item.owner;
  const statusLabel = BUSINESS_STATUS_LABELS[item.registration_status] ?? item.registration_status;
  const documents = item.document_urls ?? [];

  const handleApprove = () => {
    Alert.alert('Onayla', `${item.name} doğrulansın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await approveBusiness(item.id);
          if (error) Alert.alert('Hata', error);
          else onUpdated();
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Reddet', 'Başvuru reddedilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          const { error } = await rejectBusiness(item.id);
          if (error) Alert.alert('Hata', error);
          else onUpdated();
        },
      },
    ]);
  };

  const handlePremium = () => {
    Alert.alert('Premium', 'Premium paket tanımlansın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Premium ver',
        onPress: async () => {
          const { error } = await setBusinessPremium(item.id, true);
          if (error) Alert.alert('Hata', error);
          else onUpdated();
        },
      },
    ]);
  };

  return (
    <GlassCard style={styles.row}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label">{item.name}</Text>
          <Text secondary variant="caption">
            {item.category} · {statusLabel}
          </Text>
          {owner ? (
            <Pressable onPress={() => router.push(`/admin/users/${item.owner_id}` as Href)}>
              <Text variant="caption" style={{ color: colors.primary }}>
                @{owner.username}
                {owner.full_name ? ` · ${owner.full_name}` : ''}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.infoGrid}>
        {item.tax_number ? <InfoCell label="Vergi no" value={item.tax_number} /> : null}
        {item.phone ? <InfoCell label="Telefon" value={item.phone} /> : null}
        {item.district ? <InfoCell label="İlçe" value={item.district} /> : null}
        {item.address ? <InfoCell label="Adres" value={item.address} /> : null}
        {item.email ? <InfoCell label="E-posta" value={item.email} /> : null}
        {item.website ? <InfoCell label="Web" value={item.website} /> : null}
        <InfoCell
          label="Başvuru"
          value={new Date(item.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        />
      </View>

      {item.description ? (
        <Text secondary variant="caption">
          {item.description}
        </Text>
      ) : null}

      {documents.length > 0 ? (
        <>
          <Text variant="caption" secondary>
            Belgelere dokunarak uygulama içinde inceleyin
          </Text>
          <View style={styles.thumbRow}>
            {documents.map((doc, index) => (
              <DocumentThumb
                key={`${doc}-${index}`}
                urlOrPath={doc}
                label={documentNameFromPath(doc, index)}
                onOpen={onOpenDocument}
                onLoading={onOpenDocumentLoading}
                onFailed={onOpenDocumentFailed}
              />
            ))}
          </View>
        </>
      ) : (
        <Text secondary variant="caption">
          Yüklenmiş belge bulunamadı.
        </Text>
      )}

      {item.registration_status === 'pending' ? (
        <View style={styles.actions}>
          <AdminActionChip label="İşletmeyi onayla" icon="checkmark-circle-outline" tone="success" onPress={handleApprove} />
          <AdminActionChip label="Başvuruyu reddet" icon="close-circle-outline" tone="danger" onPress={handleReject} />
        </View>
      ) : item.registration_status === 'approved' ? (
        <AdminActionChip label="Premium paket ver" icon="star-outline" tone="primary" onPress={handlePremium} />
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoCell: {
    minWidth: '45%',
    gap: 2,
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: 108,
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
    maxWidth: 100,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
