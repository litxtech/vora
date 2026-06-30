import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  HOTEL_MARKETING_CAMPAIGN_ICONS,
  HOTEL_MARKETING_CAMPAIGN_LABELS,
} from '@/features/hotel-marketing/constants';
import type { HotelMarketingCampaign } from '@/features/hotel-marketing/types';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import { radius, spacing } from '@/constants/theme';

type Props = {
  campaign: HotelMarketingCampaign;
  compact?: boolean;
};

export function HotelCampaignBadge({ campaign, compact = false }: Props) {
  const icon = HOTEL_MARKETING_CAMPAIGN_ICONS[campaign.campaignType] as keyof typeof Ionicons.glyphMap;
  const label = campaign.headline || HOTEL_MARKETING_CAMPAIGN_LABELS[campaign.campaignType];

  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Ionicons name={icon} size={compact ? 10 : 12} color="#fff" />
      <Text variant="caption" style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: HOTEL_ACCENT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    maxWidth: '100%',
  },
  badgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
  textCompact: {
    fontSize: 10,
  },
});
