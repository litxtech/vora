import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminRideStatusBadge } from '@/features/admin/components/rides/AdminRideStatusBadge';
import { getRideLicensePhotoUrl } from '@/features/admin/services/rideLicenseDocumentAccess';
import type { AdminRideLicenseRow, AdminRideVehicleRow } from '@/features/rides/services/adminRides';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LicensePhotoThumbProps = {
  path: string;
  label: string;
  onOpen: (uri: string, label: string) => void;
  onLoading: (label: string) => void;
  onFailed: () => void;
};

function LicensePhotoThumb({ path, label, onOpen, onLoading, onFailed }: LicensePhotoThumbProps) {
  const { colors } = useTheme();
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const resolveUrl = () => {
    const url = getRideLicensePhotoUrl(path);
    setThumbUrl(url);
    setFailed(!url);
    setLoading(false);
    return url;
  };

  useEffect(() => {
    resolveUrl();
  }, [path]);

  const handlePress = () => {
    onLoading(label);
    const url = thumbUrl ?? resolveUrl();
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
        <Pressable onPress={() => resolveUrl()} hitSlop={8}>
          <Ionicons name={failed ? 'refresh-outline' : 'image-outline'} size={22} color={colors.textMuted} />
        </Pressable>
      )}
      <Text variant="caption" numberOfLines={1} style={styles.thumbLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

type LicenseProps = {
  kind: 'license';
  item: AdminRideLicenseRow;
  onApprove: () => void;
  onReject: () => void;
  actionLoading?: boolean;
  onOpenDocument: (uri: string, label: string) => void;
  onOpenDocumentLoading: (label: string) => void;
  onOpenDocumentFailed: () => void;
};

type VehicleProps = {
  kind: 'vehicle';
  item: AdminRideVehicleRow;
  onApprove: () => void;
  onReject: () => void;
  actionLoading?: boolean;
};

type Props = LicenseProps | VehicleProps;

export function AdminRideVerifyCard(props: Props) {
  const { colors } = useTheme();
  const { onApprove, onReject, actionLoading = false } = props;

  const title =
    props.kind === 'license'
      ? props.item.fullName ?? props.item.username ?? 'Sürücü'
      : `${props.item.brand} ${props.item.model}`;

  const subtitle =
    props.kind === 'license'
      ? `@${props.item.username ?? props.item.userId.slice(0, 8)} · ehliyet`
      : `${props.item.plate} · ${props.item.fullName ?? props.item.username ?? props.item.userId.slice(0, 8)}`;

  const icon = props.kind === 'license' ? 'card-outline' : 'car-outline';

  const licensePhotos =
    props.kind === 'license'
      ? [
          props.item.licenseFrontPath ? { path: props.item.licenseFrontPath, label: 'Ehliyet ön' } : null,
          props.item.licenseBackPath ? { path: props.item.licenseBackPath, label: 'Ehliyet arka' } : null,
          props.item.selfiePath ? { path: props.item.selfiePath, label: 'Selfie + ehliyet' } : null,
        ].filter((photo): photo is { path: string; label: string } => photo != null)
      : [];

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={1}>
            {title}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <AdminRideStatusBadge label="Bekliyor" tone="warning" />
      </View>

      <Text secondary variant="caption">
        Başvuru: {new Date(props.item.createdAt).toLocaleDateString('tr-TR')}
      </Text>

      {props.kind === 'license' ? (
        <View style={styles.photosBlock}>
          <Text variant="caption" style={styles.photosTitle}>
            Ehliyet belgeleri
          </Text>
          {licensePhotos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
              {licensePhotos.map((photo) => (
                <LicensePhotoThumb
                  key={`${photo.label}-${photo.path}`}
                  path={photo.path}
                  label={photo.label}
                  onOpen={props.onOpenDocument}
                  onLoading={props.onOpenDocumentLoading}
                  onFailed={props.onOpenDocumentFailed}
                />
              ))}
            </ScrollView>
          ) : (
            <Text secondary variant="caption">
              Belge görselleri yüklenemedi. Veritabanı güncellemesini uygulayın.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        <AdminActionChip label="Onayla" icon="checkmark-outline" tone="success" compact onPress={onApprove} loading={actionLoading} />
        <AdminActionChip label="Reddet" icon="close-outline" tone="danger" compact onPress={onReject} loading={actionLoading} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  photosBlock: { gap: spacing.xs },
  photosTitle: { fontWeight: '700', marginLeft: spacing.xs },
  photosRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumb: {
    width: 108,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  thumbImage: {
    width: '100%',
    height: 84,
    backgroundColor: '#1a2230',
  },
  thumbLabel: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
    fontSize: 11,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
