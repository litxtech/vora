import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type {
  BusinessCampaignPreview,
  BusinessEventPreview,
  BusinessJobPreview,
} from '@/features/businesses/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  campaigns: BusinessCampaignPreview[];
  events: BusinessEventPreview[];
  jobs: BusinessJobPreview[];
  accent: string;
  onOpenProfile: () => void;
};

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function ActivityCard({
  title,
  subtitle,
  imageUrl,
  icon,
  accent,
  onPress,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: `${accent}30`,
          backgroundColor: colors.surfaceElevated,
          opacity: pressed && onPress ? 0.9 : 1,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbPlaceholder, { backgroundColor: `${accent}14` }]}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text variant="label" numberOfLines={2} style={{ fontWeight: '800' }}>
          {title}
        </Text>
        <Text secondary variant="caption" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export function BusinessShopActivityStrip({
  campaigns,
  events,
  jobs,
  accent,
  onOpenProfile,
}: Props) {
  if (!campaigns.length && !events.length && !jobs.length) return null;

  return (
    <View style={styles.wrap}>
      {campaigns.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.head}>
            <Ionicons name="megaphone-outline" size={15} color={accent} />
            <Text variant="label" style={{ color: accent, fontWeight: '800' }}>
              Kampanyalar
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {campaigns.slice(0, 6).map((item) => (
              <ActivityCard
                key={item.id}
                title={item.title}
                subtitle={item.description}
                imageUrl={item.imageUrl}
                icon="megaphone-outline"
                accent={accent}
                onPress={onOpenProfile}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {events.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.head}>
            <Ionicons name="calendar-outline" size={15} color={accent} />
            <Text variant="label" style={{ color: accent, fontWeight: '800' }}>
              Yaklaşan etkinlikler
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {events.slice(0, 6).map((item) => (
              <ActivityCard
                key={item.id}
                title={item.title}
                subtitle={[formatEventDate(item.startsAt), item.locationName].filter(Boolean).join(' · ')}
                imageUrl={item.coverUrl}
                icon="calendar-outline"
                accent={accent}
                onPress={() => router.push(`/detail/events/${item.id}` as never)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {jobs.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.head}>
            <Ionicons name="briefcase-outline" size={15} color={accent} />
            <Text variant="label" style={{ color: accent, fontWeight: '800' }}>
              Açık ilanlar
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {jobs.slice(0, 6).map((item) => (
              <ActivityCard
                key={item.id}
                title={item.title}
                subtitle={item.salaryRange ?? 'Detaylar için dokunun'}
                imageUrl={null}
                icon="briefcase-outline"
                accent={accent}
                onPress={() => router.push(`/detail/jobs/${item.id}` as never)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const CARD_WIDTH = 220;

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  block: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scroll: { gap: spacing.sm, paddingRight: spacing.lg },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: 88 },
  thumbPlaceholder: {
    width: '100%',
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: spacing.sm, gap: 4 },
});
