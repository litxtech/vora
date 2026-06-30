import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { fetchBusinessCampaigns, type BusinessCampaign } from '@/features/profile/services/businessProfile';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BusinessCampaignsSectionProps = {
  businessId: string;
  isOwnBusiness?: boolean;
};

export function BusinessCampaignsSection({ businessId, isOwnBusiness = false }: BusinessCampaignsSectionProps) {
  const { colors } = useTheme();
  const [campaigns, setCampaigns] = useState<BusinessCampaign[]>([]);

  useEffect(() => {
    fetchBusinessCampaigns(businessId).then(setCampaigns);
  }, [businessId]);

  if (campaigns.length === 0) return null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="megaphone-outline" size={18} color={colors.warning} />
        <Text variant="label">Kampanyalar</Text>
        {isOwnBusiness ? (
          <Pressable
            style={styles.addBtn}
            onPress={() => router.push('/profile/campaigns/create' as never)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {campaigns.map((c) => (
        <View key={c.id} style={[styles.item, { borderColor: colors.border }]}>
          {c.imageUrl ? (
            <Image source={{ uri: c.imageUrl }} style={styles.image} />
          ) : null}
          <View style={styles.meta}>
            <Text variant="label">{c.title}</Text>
            <Text secondary variant="caption" numberOfLines={2}>
              {c.description}
            </Text>
          </View>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: { marginLeft: 'auto' },
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  image: { width: 56, height: 56, borderRadius: radius.md },
  meta: { flex: 1, gap: 2 },
});
