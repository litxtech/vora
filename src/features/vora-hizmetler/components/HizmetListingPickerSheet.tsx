import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  serviceCategoryLabel,
  serviceRequestDetailPath,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import { fetchMyOpenListings } from '@/features/vora-hizmetler/services/requestData';
import type { ServiceRequestListing } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetListingPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  providerName?: string;
  onSelect: (listing: ServiceRequestListing) => void | Promise<void>;
  onCreateNew?: () => void;
};

export function HizmetListingPickerSheet({
  visible,
  onClose,
  userId,
  providerName,
  onSelect,
  onCreateNew,
}: HizmetListingPickerSheetProps) {
  const { colors } = useTheme();
  const [listings, setListings] = useState<ServiceRequestListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setListings([]);
      return;
    }
    setLoading(true);
    const result = await fetchMyOpenListings(userId);
    setListings(result.listings);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const handleSelect = async (listing: ServiceRequestListing) => {
    setSubmittingId(listing.id);
    await onSelect(listing);
    setSubmittingId(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text variant="h3" style={styles.title}>
            İlanınızı seçin
          </Text>
          <Text secondary variant="body" style={styles.subtitle}>
            {providerName
              ? `${providerName} ustasına hangi ilanınızla başvurmak istiyorsunuz?`
              : 'Ustaya göndermek istediğiniz açık ilanınızı seçin.'}
          </Text>

          {loading ? (
            <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
          ) : listings.length ? (
            <FlatList
              data={listings}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void handleSelect(item)}
                  disabled={submittingId === item.id}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceElevated,
                      opacity: pressed || submittingId === item.id ? 0.86 : 1,
                    },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: `${VORA_HIZMETLER_ACCENT}16` }]}>
                    <Ionicons name="document-text-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text variant="label" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text secondary variant="caption" numberOfLines={1}>
                      {serviceCategoryLabel(item.category)} · {item.offerCount} teklif
                    </Text>
                  </View>
                  {submittingId === item.id ? (
                    <ActivityIndicator color={VORA_HIZMETLER_ACCENT} size="small" />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  )}
                </Pressable>
              )}
            />
          ) : (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Ionicons name="document-outline" size={32} color={colors.textMuted} />
              <Text variant="label">Açık ilanınız yok</Text>
              <Text secondary variant="caption" style={{ textAlign: 'center', lineHeight: 18 }}>
                Önce bir iş ilanı verin; sonra ustaya başvuru gönderebilirsiniz.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {onCreateNew ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onCreateNew();
                }}
                style={[styles.secondaryBtn, { borderColor: VORA_HIZMETLER_ACCENT }]}
              >
                <Ionicons name="add-circle-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
                <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT }}>
                  Yeni İlan Ver
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
              <Text variant="label">Kapat</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function openListingDetail(listingId: string) {
  router.push(serviceRequestDetailPath(listingId) as never);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.5)',
    marginVertical: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
