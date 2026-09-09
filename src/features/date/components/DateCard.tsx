import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { Text } from '@/components/ui/Text';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';
import {
  DATE_ACCENT,
  DATE_GRADIENT,
  dateSoughtGenderLabel,
  dateStatusLabel,
} from '@/features/date/constants';
import type { DateOuting } from '@/features/date/types';
import { formatDateSchedule, spotsRemaining } from '@/features/date/utils';
import { formatFeedTime } from '@/features/feed/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type DateCardProps = {
  outing: DateOuting;
  onPress: () => void;
  onJoinPress?: () => void;
  showJoinAction?: boolean;
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
    <View style={[styles.metaChip, { backgroundColor: `${accent}12`, borderColor: `${accent}28` }]}>
      <Ionicons name={icon} size={12} color={accent} />
      <Text variant="caption" style={{ color: accent, fontWeight: '600', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

export function DateCard({ outing, onPress, onJoinPress, showJoinAction = true }: DateCardProps) {
  const { colors, isDark } = useTheme();
  const remaining = spotsRemaining(outing.seekingCount, outing.approvedCount);
  const schedule = formatDateSchedule(outing.scheduledAt);
  const canJoin =
    outing.status === 'open' &&
    remaining > 0 &&
    !outing.isOrganizer &&
    !outing.isApprovedMember &&
    !outing.myPendingRequestId;

  const statusColor =
    outing.status === 'open' ? DATE_ACCENT : outing.status === 'full' ? colors.success : colors.textMuted;

  const leadOrganizer = outing.organizers.find((p) => p.isCreator) ?? outing.organizers[0];
  const avatarStack = outing.organizers.slice(0, 3);
  const extraOrganizers = Math.max(0, outing.organizerCount - avatarStack.length);
  const nudge =
    outing.status === 'open' && remaining > 0
      ? remaining === outing.seekingCount
        ? 'İlk sen ol — katılım isteği gönder'
        : `Son ${remaining} kişilik kontenjan`
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? `${DATE_ACCENT}33` : `${DATE_ACCENT}22`,
        },
      ]}
    >
      <SafeLinearGradient
        colors={[`${DATE_GRADIENT[0]}22`, `${DATE_GRADIENT[1]}08`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.accentBand}
      />

      <InstantPressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardPressable, pressed && { opacity: 0.94 }]}
        accessibilityRole="button"
        accessibilityLabel={`Date: ${outing.title}`}
      >
        <View style={styles.topRow}>
          <View style={styles.authorBlock}>
            <View style={styles.avatarStack}>
              {avatarStack.length > 0 ? (
                avatarStack.map((p, index) => (
                  <View
                    key={p.userId}
                    style={[
                      styles.avatarStackItem,
                      { marginLeft: index === 0 ? 0 : -10, zIndex: avatarStack.length - index },
                    ]}
                  >
                    <ProfileTabIcon
                      avatarUrl={p.avatarUrl}
                      username={p.username}
                      color={DATE_ACCENT}
                      size={34}
                    />
                  </View>
                ))
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${DATE_ACCENT}18` }]}>
                  <Ionicons name="people" size={16} color={DATE_ACCENT} />
                </View>
              )}
              {extraOrganizers > 0 ? (
                <View style={[styles.extraCount, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text variant="caption" style={{ fontWeight: '700', fontSize: 10 }}>
                    +{extraOrganizers}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.authorCopy}>
              <Text variant="caption" numberOfLines={1} style={{ fontWeight: '700' }}>
                {leadOrganizer
                  ? leadOrganizer.fullName ?? leadOrganizer.username
                  : `${outing.organizerCount} kişilik grup`}
              </Text>
              <Text secondary variant="caption" numberOfLines={1}>
                {outing.organizerCount} kişi · {formatFeedTime(outing.createdAt)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusPill, { backgroundColor: `${statusColor}16` }]}>
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>
              {dateStatusLabel(outing.status)}
            </Text>
          </View>
        </View>

        <Text variant="label" numberOfLines={2} style={styles.title}>
          {outing.title}
        </Text>

        <View style={styles.metaChips}>
          <MetaChip icon="sparkles-outline" label={outing.activity} accent={DATE_ACCENT} />
          <MetaChip icon="location-outline" label={outing.destination} accent={colors.textMuted} />
          {outing.category ? (
            <MetaChip icon="pricetag-outline" label={outing.category} accent={colors.textMuted} />
          ) : null}
        </View>

        <View style={[styles.lookingBlock, { backgroundColor: `${DATE_ACCENT}08`, borderColor: `${DATE_ACCENT}20` }]}>
          <Text variant="caption" style={{ color: DATE_ACCENT, fontWeight: '700' }}>
            Aranan
          </Text>
          <Text secondary variant="caption" numberOfLines={2} style={styles.lookingText}>
            {outing.lookingFor}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Text variant="caption" style={{ color: DATE_ACCENT, fontWeight: '700' }}>
            {outing.organizerCount} → {remaining}/{outing.seekingCount} kişi
          </Text>
          <Text secondary variant="caption">
            {dateSoughtGenderLabel(outing.soughtGender)}
          </Text>
        </View>

        {schedule ? (
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text secondary variant="caption">
              {schedule}
            </Text>
          </View>
        ) : null}

        {outing.approvedMembers.length > 0 ? (
          <View style={styles.joinedRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
              {outing.approvedMembers.length} kişi katıldı
            </Text>
          </View>
        ) : null}

        {nudge ? (
          <Text variant="caption" style={[styles.nudge, { color: DATE_ACCENT }]}>
            {nudge}
          </Text>
        ) : null}

        {outing.myPendingRequestId ? (
          <View style={[styles.pendingBanner, { backgroundColor: `${colors.warning}14` }]}>
            <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
              İsteğiniz bekliyor
            </Text>
          </View>
        ) : null}
      </InstantPressable>

      {showJoinAction && canJoin && onJoinPress ? (
        <InstantPressable
          onPress={onJoinPress}
          style={({ pressed }) => [styles.joinWrap, pressed && { opacity: 0.92 }]}
        >
          <SafeLinearGradient
            colors={[DATE_GRADIENT[0], DATE_GRADIENT[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.joinBtn}
          >
            <Ionicons name="hand-right-outline" size={15} color="#fff" />
            <Text variant="label" style={styles.joinBtnText}>
              Katılmak istiyorum
            </Text>
          </SafeLinearGradient>
        </InstantPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  accentBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  cardPressable: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  authorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackItem: {
    borderRadius: radius.full,
    backgroundColor: 'transparent',
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraCount: {
    marginLeft: -8,
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  lookingBlock: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  lookingText: {
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nudge: {
    fontWeight: '700',
    fontStyle: 'italic',
  },
  joinWrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  pendingBanner: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
