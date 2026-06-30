import { memo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { navigateToFeedDetail, prefetchFeedDetail } from '@/features/feed/services/feedNavigation';
import { formatFeedTime } from '@/features/feed/utils';
import type { FeedItem } from '@/features/feed/types';
import { EmployerNameChip } from '@/features/personnel-center/components/EmployerNameChip';
import { PERSONNEL_ACCENT, PERSONNEL_GRADIENT, jobTypeLabel } from '@/features/personnel-center/constants';
import { employerNameDistinctFromAuthor } from '@/features/personnel-center/utils/employerDisplayName';
import type { JobType } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedJobCardProps = {
  item: FeedItem;
};

function MetaChip({
  icon,
  label,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: `${accent}14`, borderColor: `${accent}33` }]}>
      <Ionicons name={icon} size={11} color={accent} />
      <Text variant="caption" style={{ color: accent, fontWeight: '600', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

export const FeedJobCard = memo(function FeedJobCard({ item }: FeedJobCardProps) {
  const { colors, isDark } = useTheme();
  const coverUrl = item.mediaUrls[0] ?? null;
  const urgent = Boolean(item.jobIsUrgent ?? item.isFeatured);
  const salaryLabel = item.jobSalaryRange?.trim() || 'Görüşülecek';
  const jobType = item.jobType ? jobTypeLabel(item.jobType as JobType) : 'İş ilanı';
  const employerName = item.businessName?.trim() || null;
  const showEmployerName = employerNameDistinctFromAuthor(
    employerName,
    item.author.fullName,
    item.author.username,
  );
  const timeLabel = formatFeedTime(item.createdAt);

  const openDetail = () => {
    prefetchFeedDetail('job', item.sourceId);
    navigateToFeedDetail('job', item.sourceId, item.isDemo);
  };

  return (
    <Pressable
      onPress={openDetail}
      style={({ pressed }) => [
        styles.wrap,
        {
          borderColor: urgent ? `${colors.danger}55` : `${PERSONNEL_ACCENT}33`,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={styles.hero}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.heroImage} />
        ) : (
          <SafeLinearGradient
            colors={
              isDark
                ? [`${PERSONNEL_ACCENT}55`, `${PERSONNEL_GRADIENT[1]}33`]
                : [`${PERSONNEL_ACCENT}66`, `${PERSONNEL_GRADIENT[1]}44`]
            }
            style={styles.heroPlaceholder}
          >
            <Ionicons name="business-outline" size={42} color={`${PERSONNEL_ACCENT}88`} />
          </SafeLinearGradient>
        )}
        <SafeLinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.heroFade} />

        <View style={styles.heroTop}>
          <View style={[styles.badge, { backgroundColor: `${PERSONNEL_ACCENT}DD` }]}>
            <Ionicons name="briefcase" size={11} color="#fff" />
            <Text variant="caption" style={styles.badgeText}>
              İş İlanı
            </Text>
          </View>
          {urgent ? (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Ionicons name="flash" size={11} color="#fff" />
              <Text variant="caption" style={styles.badgeText}>
                Acil
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroBottom}>
          {showEmployerName ? <EmployerNameChip name={employerName!} variant="hero" /> : null}
          <Text variant="label" numberOfLines={2} style={styles.heroTitle}>
            {item.title ?? 'İş ilanı'}
          </Text>
          <Text variant="caption" style={styles.heroSalary}>
            {salaryLabel}
          </Text>
        </View>
      </View>

      {item.mediaUrls.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {item.mediaUrls.slice(1).map((uri, index) => (
            <Image key={`${uri}-${index}`} source={{ uri }} style={styles.thumb} />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.body}>
        <Text secondary variant="caption" numberOfLines={2} style={styles.description}>
          {item.content}
        </Text>

        <View style={styles.chips}>
          <MetaChip icon="time-outline" label={jobType} accent={PERSONNEL_ACCENT} />
          {item.jobHousingProvided ? (
            <MetaChip icon="bed-outline" label="Konaklama" accent={colors.success} />
          ) : null}
          {item.jobMealProvided ? (
            <MetaChip icon="restaurant-outline" label="Yemek" accent={colors.success} />
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.authorRow}>
            <UserBadge
              author={item.author}
              showUsername={!showEmployerName}
              timeLabel={timeLabel}
            />
          </View>

          <View style={styles.cta}>
            <SafeLinearGradient
              colors={[PERSONNEL_GRADIENT[0], PERSONNEL_GRADIENT[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text variant="caption" style={styles.ctaText}>
                İncele
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </SafeLinearGradient>
          </View>
        </View>

        {(item.locationLabel || item.district) ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text secondary variant="caption" numberOfLines={1}>
              {[item.district, item.locationLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  hero: {
    height: 168,
    position: 'relative',
    backgroundColor: '#1E88E522',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 10 },
  heroBottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    gap: 2,
  },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 16, lineHeight: 20 },
  heroSalary: { color: '#fff', fontWeight: '800', fontSize: 14 },
  thumbRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  description: {
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  authorRow: {
    flex: 1,
    minWidth: 0,
  },
  cta: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
