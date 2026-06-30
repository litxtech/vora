import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import type { HotelListingDetail } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  hotel: Pick<
    HotelListingDetail,
    | 'ownerId'
    | 'businessId'
    | 'businessName'
    | 'businessLogoUrl'
    | 'ownerUsername'
    | 'ownerAvatarUrl'
    | 'ownerAccountType'
  >;
};

export function HotelHostRow({ hotel }: Props) {
  const { colors } = useTheme();
  const isBusiness = Boolean(hotel.businessId) || hotel.ownerAccountType === 'business';
  const displayName =
    hotel.businessName ?? (hotel.ownerUsername ? `@${hotel.ownerUsername}` : isBusiness ? 'İşletme' : 'Ev sahibi');
  const avatarUrl = hotel.businessLogoUrl ?? hotel.ownerAvatarUrl;
  const subtitle = isBusiness ? 'İşletme profili' : 'Ev sahibi profili';

  if (!hotel.ownerId && !hotel.businessId) return null;

  return (
    <Pressable
      onPress={() =>
        navigateToPublicProfile({
          userId: hotel.ownerId,
          businessId: hotel.businessId,
        })
      }
      style={[styles.row, { backgroundColor: `${colors.surface}AA`, borderColor: colors.border }]}
    >
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: `${HOTEL_ACCENT}20` }]}>
            <Ionicons name={isBusiness ? 'storefront-outline' : 'person-outline'} size={18} color={HOTEL_ACCENT} />
          </View>
        )}
      </View>
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text variant="label" numberOfLines={1}>
            {displayName}
          </Text>
          {isBusiness ? <BusinessVerifiedTick size={14} /> : null}
        </View>
        <Text secondary variant="caption">
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
});
