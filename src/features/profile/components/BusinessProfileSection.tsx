import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { BusinessProfile } from '@/features/profile/services/businessProfile';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { businessCategoryLabel } from '@/features/businesses/constants';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type BusinessProfileSectionProps = {
  business: BusinessProfile;
  /** Profil başlığında işletme adı zaten gösteriliyorsa yalnızca iletişim/detay kartı */
  compact?: boolean;
};

export function BusinessProfileSection({ business, compact = false }: BusinessProfileSectionProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      {!compact ? (
        <View style={styles.header}>
          {business.logoUrl ? (
            <View style={[styles.logoFrame, { backgroundColor: colors.surfaceElevated }]}>
              <Image source={{ uri: business.logoUrl }} style={styles.logo} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="storefront" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.headerMeta}>
            <View style={styles.nameRow}>
              <Text variant="h3">{business.name}</Text>
              {business.isVerified ? <BusinessVerifiedTick size={16} /> : null}
            </View>
            <Text secondary variant="caption">
              {businessCategoryLabel(business.category)}
            </Text>
          </View>
        </View>
      ) : null}

      {business.description ? <Text secondary>{business.description}</Text> : null}

      <View style={styles.fields}>
        {business.phone ? (
          <Pressable style={styles.field} onPress={() => void openUrl(`tel:${business.phone}`)}>
            <Ionicons name="call-outline" size={16} color={colors.primary} />
            <Text variant="caption">{business.phone}</Text>
          </Pressable>
        ) : null}
        {business.website ? (
          <Pressable style={styles.field} onPress={() => void openUrl(business.website!)}>
            <Ionicons name="globe-outline" size={16} color={colors.primary} />
            <Text variant="caption" numberOfLines={1}>
              {business.website}
            </Text>
          </Pressable>
        ) : null}
        {business.address ? (
          <View style={styles.field}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text secondary variant="caption">
              {business.address}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        style={[styles.detailBtn, { borderColor: colors.border }]}
        onPress={() => router.push(`/detail/businesses/${business.id}` as never)}
      >
        <Text variant="caption" style={{ color: colors.primary }}>
          İşletme Detayları
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  logo: { width: 56, height: 56, borderRadius: radius.md },
  logoFrame: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fields: { gap: spacing.sm },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
