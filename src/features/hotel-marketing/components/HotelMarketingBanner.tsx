import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { HotelCampaignBadge } from '@/features/hotel-marketing/components/HotelCampaignBadge';
import { HOTEL_ACCENT, HOTEL_GRADIENT, hotelDetailPath } from '@/features/hotel-center/constants';
import type { HotelMarketingCampaign } from '@/features/hotel-marketing/types';
import { radius, spacing } from '@/constants/theme';

type Props = {
  campaign: HotelMarketingCampaign;
};

export function HotelMarketingBanner({ campaign }: Props) {
  return (
    <Pressable onPress={() => router.push(hotelDetailPath(campaign.hotelId) as never)}>
      <GlassCard style={[styles.card, { borderColor: `${HOTEL_ACCENT}44` }]}>
        <LinearGradient
          colors={[`${HOTEL_GRADIENT[0]}22`, `${HOTEL_GRADIENT[1]}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        />
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: `${HOTEL_ACCENT}18` }]}>
            <Ionicons name="megaphone" size={20} color={HOTEL_ACCENT} />
          </View>
          <View style={styles.copy}>
            <HotelCampaignBadge campaign={campaign} />
            <Text variant="label" style={styles.hotelName} numberOfLines={1}>
              {campaign.hotelName}
            </Text>
            <Text variant="body" style={styles.message} numberOfLines={3}>
              {campaign.message}
            </Text>
            <View style={styles.cta}>
              <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
                Otel detayına git
              </Text>
              <Ionicons name="chevron-forward" size={14} color={HOTEL_ACCENT} />
            </View>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderLeftColor: HOTEL_ACCENT,
    overflow: 'hidden',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: spacing.xs },
  hotelName: { fontWeight: '800' },
  message: { lineHeight: 20 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
});
