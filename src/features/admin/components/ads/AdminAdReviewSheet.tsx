import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import {
  AD_BILLING_MODE_LABELS,
  AD_SESSION_HOURS,
  AD_STATUS_LABELS,
  adTypeMeta,
  computeCtr,
  ctaLabelText,
  formatAdDate,
  formatAdRegions,
  formatBudget,
  formatCpcKurus,
} from '@/features/ads/constants';
import type { AdCtaLabel, AdType } from '@/features/ads/types';
import type { BusinessAdRow } from '@/features/admin/services/adsManagement';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type AdminAdReviewSheetProps = {
  ad: BusinessAdRow | null;
  onClose: () => void;
  onApprove: (ad: BusinessAdRow) => void;
  onReject: (ad: BusinessAdRow) => void;
  busy?: boolean;
  showActions?: boolean;
};

function DetailRow({
  icon,
  label,
  value,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View style={styles.detailCopy}>
        <Text secondary variant="caption">
          {label}
        </Text>
        <Text variant="caption" style={{ fontWeight: '600' }} numberOfLines={onPress ? 2 : undefined}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="open-outline" size={14} color={colors.primary} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export function AdminAdReviewSheet({
  ad,
  onClose,
  onApprove,
  onReject,
  busy = false,
  showActions = true,
}: AdminAdReviewSheetProps) {
  const { colors } = useTheme();

  if (!ad) return null;

  const meta = adTypeMeta(ad.ad_type as AdType);
  const regionIds = ad.target_region_ids?.length
    ? ad.target_region_ids
    : ad.target_region_id
      ? [ad.target_region_id]
      : [];
  const isWallet = ad.billing_mode === 'wallet_cpc' || ad.budget_cents > 0;
  const ageLabel =
    ad.target_age_min != null
      ? `${ad.target_age_min}–${ad.target_age_max ?? '+'} yaş`
      : 'Tüm yaş grupları';
  const ownerLabel = ad.owner_full_name?.trim()
    ? `${ad.owner_full_name} (@${ad.owner_username})`
    : `@${ad.owner_username}`;

  return (
    <Modal visible animationType={resolveModalAnimationType('slide')} presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text variant="label">Reklam inceleme</Text>
            <Text secondary variant="caption">
              {AD_STATUS_LABELS[ad.status] ?? ad.status}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {ad.image_url ? (
            <Image source={{ uri: ad.image_url }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: `${meta.color}18`, borderColor: colors.border }]}>
              <Ionicons name={meta.icon} size={40} color={meta.color} />
              <Text secondary variant="caption">
                Görsel yok
              </Text>
            </View>
          )}

          <View style={[styles.typeBadge, { backgroundColor: `${meta.color}18` }]}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text variant="caption" style={{ color: meta.color, fontWeight: '700' }}>
              {meta.label}
            </Text>
          </View>

          <Text variant="h3">{ad.title}</Text>
          <Text secondary variant="body" style={styles.description}>
            {ad.description}
          </Text>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text variant="label">Yayıncı</Text>
            <View style={styles.ownerRow}>
              {ad.owner_avatar_url ? (
                <Image source={{ uri: ad.owner_avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="person" size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.ownerCopy}>
                <Text variant="caption" style={{ fontWeight: '700' }}>
                  {ownerLabel}
                </Text>
                {ad.business_name ? (
                  <Text secondary variant="caption">
                    İşletme: {ad.business_name}
                  </Text>
                ) : (
                  <Text secondary variant="caption">
                    Kişisel reklam (işletme bağlı değil)
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text variant="label">Yerleşim & CTA</Text>
            <DetailRow icon={meta.icon} label="Yerleşim" value={meta.label} colors={colors} />
            <DetailRow icon="megaphone-outline" label="CTA" value={ctaLabelText(ad.cta_label as AdCtaLabel)} colors={colors} />
            <DetailRow
              icon="link-outline"
              label="Hedef link"
              value={ad.destination_url?.trim() || 'Belirtilmedi'}
              colors={colors}
              onPress={
                ad.destination_url?.trim()
                  ? () => void openUrl(ad.destination_url!.trim())
                  : undefined
              }
            />
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text variant="label">Hedef kitle</Text>
            <DetailRow icon="globe-outline" label="Kapsam" value={formatAdRegions(regionIds)} colors={colors} />
            <DetailRow
              icon="navigate-outline"
              label="İlçe"
              value={ad.target_district?.trim() || 'Tüm ilçeler'}
              colors={colors}
            />
            <DetailRow icon="people-outline" label="Yaş" value={ageLabel} colors={colors} />
            <DetailRow
              icon="heart-outline"
              label="İlgi alanları"
              value={ad.target_interests?.length ? ad.target_interests.join(', ') : 'Belirtilmedi'}
              colors={colors}
            />
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text variant="label">Bütçe & faturalama</Text>
            <DetailRow
              icon="pricetag-outline"
              label="Model"
              value={AD_BILLING_MODE_LABELS[ad.billing_mode] ?? ad.billing_mode}
              colors={colors}
            />
            {isWallet ? (
              <>
                <DetailRow icon="cash-outline" label="Bütçe tavanı" value={formatBudget(ad.budget_cents)} colors={colors} />
                <DetailRow
                  icon="finger-print-outline"
                  label="Tıklama ücreti"
                  value={formatCpcKurus(ad.cpc_cents)}
                  colors={colors}
                />
              </>
            ) : null}
            <Text secondary variant="caption">
              Onay sonrası {AD_SESSION_HOURS} saat yayınlanır.
            </Text>
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text variant="label">İstatistik & zaman</Text>
            <DetailRow icon="eye-outline" label="Gösterim" value={String(ad.impressions)} colors={colors} />
            <DetailRow icon="hand-left-outline" label="Tıklama" value={String(ad.clicks)} colors={colors} />
            <DetailRow icon="analytics-outline" label="CTR" value={computeCtr(ad.impressions, ad.clicks)} colors={colors} />
            {isWallet ? (
              <DetailRow icon="trending-down-outline" label="Harcanan" value={formatBudget(ad.spent_cents)} colors={colors} />
            ) : null}
            <DetailRow icon="calendar-outline" label="Oluşturulma" value={formatAdDate(ad.created_at)} colors={colors} />
            <DetailRow icon="play-outline" label="Başlangıç" value={formatAdDate(ad.starts_at)} colors={colors} />
            <DetailRow icon="stop-outline" label="Bitiş" value={formatAdDate(ad.ends_at)} colors={colors} />
          </View>
        </ScrollView>

        {showActions && ad.status === 'pending' ? (
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <AdminActionChip
              label="Reddet"
              icon="close"
              tone="danger"
              onPress={() => onReject(ad)}
              loading={busy}
            />
            <AdminActionChip
              label="Onayla"
              icon="checkmark"
              tone="success"
              onPress={() => onApprove(ad)}
              loading={busy}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { padding: spacing.xs },
  headerCopy: { flex: 1, gap: 2 },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.xl,
  },
  heroPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  description: { lineHeight: 22 },
  section: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerCopy: { flex: 1, gap: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailCopy: { flex: 1, gap: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
