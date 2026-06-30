import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HotelCampaignBadge } from '@/features/hotel-marketing/components/HotelCampaignBadge';
import { HOTEL_ACCENT, HOTEL_GRADIENT, hotelDetailPath } from '@/features/hotel-center/constants';
import type { HotelMarketingCampaign } from '@/features/hotel-marketing/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  campaigns: HotelMarketingCampaign[];
};

export function HotelMarketingStrip({ campaigns }: Props) {
  const { colors } = useTheme();
  if (campaigns.length === 0) return null;

  const featured = campaigns.slice(0, 8);

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <LinearGradient
          colors={[HOTEL_GRADIENT[0], HOTEL_GRADIENT[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.titleAccent}
        />
        <View style={styles.titleCopy}>
          <Ionicons name="megaphone" size={16} color={HOTEL_ACCENT} />
          <Text variant="label" style={{ color: HOTEL_ACCENT, fontWeight: '800' }}>
            Öne çıkan oteller
          </Text>
        </View>
        <Text secondary variant="caption" style={{ color: colors.textMuted }}>
          {featured.length} kampanya
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {featured.map((campaign) => (
          <Pressable
            key={campaign.campaignId}
            onPress={() => router.push(hotelDetailPath(campaign.hotelId) as never)}
            style={({ pressed }) => [
              styles.card,
              {
                borderColor: `${HOTEL_ACCENT}30`,
                backgroundColor: colors.surfaceElevated,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={[`${HOTEL_GRADIENT[0]}CC`, `${HOTEL_GRADIENT[1]}88`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGlow}
            />
            <View style={styles.mediaWrap}>
              {campaign.coverUrl ? (
                <Image source={{ uri: campaign.coverUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.coverPlaceholder, { backgroundColor: `${HOTEL_ACCENT}12` }]}>
                  <Ionicons name="bed-outline" size={24} color={HOTEL_ACCENT} />
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                style={styles.coverOverlay}
              />
              <View style={styles.badgeWrap}>
                <HotelCampaignBadge campaign={campaign} compact />
              </View>
            </View>
            <View style={styles.copy}>
              <Text variant="label" numberOfLines={1} style={styles.hotelName}>
                {campaign.hotelName}
              </Text>
              <Text secondary variant="caption" numberOfLines={2} style={styles.message}>
                {campaign.message}
              </Text>
              <View style={styles.ctaRow}>
                <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
                  İncele
                </Text>
                <Ionicons name="arrow-forward" size={12} color={HOTEL_ACCENT} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  titleRow: { gap: spacing.xs },
  titleAccent: { height: 3, width: 48, borderRadius: radius.full },
  titleCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { gap: spacing.sm, paddingRight: spacing.sm },
  card: {
    width: 232,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  mediaWrap: { position: 'relative' },
  cover: { width: '100%', height: 108 },
  coverPlaceholder: {
    width: '100%',
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
  },
  badgeWrap: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  copy: { padding: spacing.sm, gap: 4 },
  hotelName: { fontWeight: '800' },
  message: { lineHeight: 16, minHeight: 32 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
