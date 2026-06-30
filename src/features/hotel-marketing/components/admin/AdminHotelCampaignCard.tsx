import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import { HOTEL_MARKETING_CAMPAIGN_LABELS } from '@/features/hotel-marketing/constants';
import type { AdminHotelMarketingCampaign } from '@/features/hotel-marketing/types';

type Props = {
  campaign: AdminHotelMarketingCampaign;
  ending: boolean;
  disabled: boolean;
  onEnd: () => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminHotelCampaignCard({ campaign, ending, disabled, onEnd }: Props) {
  const { colors } = useTheme();
  const statusColor = campaign.isActive ? colors.success : colors.textMuted;
  const statusLabel = campaign.isActive ? 'Yayında' : 'Bitti';

  return (
    <GlassCard
      style={[
        styles.card,
        campaign.isActive ? { borderColor: `${HOTEL_ACCENT}44` } : { opacity: 0.88 },
      ]}
    >
      <View style={styles.header}>
        {campaign.hotelCoverUrl ? (
          <Image source={{ uri: campaign.hotelCoverUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${HOTEL_ACCENT}14` }]}>
            <Ionicons name="bed-outline" size={22} color={HOTEL_ACCENT} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.titleRow}>
            <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
              {campaign.hotelName}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text variant="caption" style={{ color: statusColor, fontWeight: '700' }}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text variant="label" style={{ color: HOTEL_ACCENT }} numberOfLines={1}>
            {campaign.headline}
          </Text>
          <Text secondary variant="caption" numberOfLines={2}>
            {campaign.message}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaChip icon="pricetag-outline" label={HOTEL_MARKETING_CAMPAIGN_LABELS[campaign.campaignType]} />
        <MetaChip
          icon="globe-outline"
          label={campaign.platformWide ? 'Tüm platform' : regionNameById(campaign.regionId ?? '')}
        />
        {campaign.notifyUsers ? <MetaChip icon="notifications-outline" label="Bildirimli" /> : null}
        <MetaChip icon="calendar-outline" label={formatDate(campaign.startsAt)} />
        {campaign.endsAt ? <MetaChip icon="time-outline" label={`Bitiş ${formatDate(campaign.endsAt)}`} /> : null}
      </View>

      {campaign.isActive ? (
        <AdminActionChip
          label="Kampanyayı bitir"
          icon="stop-circle-outline"
          tone="danger"
          loading={ending}
          disabled={disabled}
          onPress={onEnd}
        />
      ) : null}
    </GlassCard>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaChip, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}>
      <Ionicons name={icon} size={11} color={colors.textMuted} />
      <Text variant="caption" style={{ color: colors.textSecondary, fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  thumb: { width: 64, height: 64, borderRadius: radius.lg },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
