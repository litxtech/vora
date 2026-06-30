import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { formatFeedTime } from '@/features/feed/utils';
import { IncidentMediaStrip } from '@/features/incidents/components/IncidentMediaStrip';
import { INCIDENT_UPDATE_LABELS } from '@/features/incidents/constants';
import type { IncidentUpdate, IncidentVerification } from '@/features/incidents/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const UPDATE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  initial: 'megaphone-outline',
  update: 'chatbubble-ellipses-outline',
  photo: 'image-outline',
  video: 'videocam-outline',
  verification: 'shield-checkmark-outline',
};

type Props = {
  updates: IncidentUpdate[];
  verifications: IncidentVerification[];
};

function UpdateRow({
  update,
  index,
  isLast,
}: {
  update: IncidentUpdate;
  index: number;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const icon = UPDATE_ICONS[update.updateType] ?? 'ellipse-outline';
  const label = INCIDENT_UPDATE_LABELS[update.updateType] ?? update.updateType;

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 350)).springify()}>
      <View style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name={icon} size={14} color={colors.primary} />
          </View>
          {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
        </View>
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              {label}
            </Text>
            <Text variant="caption" secondary>
              {formatFeedTime(update.createdAt)}
            </Text>
          </View>
          <UserBadge author={update.author} showUsername={false} />
          <Text>{update.content}</Text>
          {update.mediaUrls.length > 0 ? <IncidentMediaStrip urls={update.mediaUrls} /> : null}
        </GlassCard>
      </View>
    </Animated.View>
  );
}

function VerificationRow({
  verification,
  index,
}: {
  verification: IncidentVerification;
  index: number;
}) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 350)).springify()}>
      <View style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
          </View>
        </View>
        <GlassCard style={styles.card}>
          <UserBadge author={verification.verifier} timeLabel={formatFeedTime(verification.createdAt)} />
          {verification.note ? <Text secondary>{verification.note}</Text> : null}
        </GlassCard>
      </View>
    </Animated.View>
  );
}

export function IncidentUpdateTimeline({ updates, verifications }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="git-commit-outline" size={16} color={colors.primary} />
        </View>
        <Text variant="label">Gelişmeler</Text>
        <Text variant="caption" secondary>
          {updates.length}
        </Text>
      </View>

      {updates.map((update, index) => (
        <UpdateRow
          key={update.id}
          update={update}
          index={index}
          isLast={index === updates.length - 1 && verifications.length === 0}
        />
      ))}

      {verifications.length > 0 ? (
        <>
          <View style={[styles.sectionHeader, styles.verifyHeader]}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.success}14` }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            </View>
            <Text variant="label">Doğrulamalar</Text>
            <Text variant="caption" secondary>
              {verifications.length}
            </Text>
          </View>
          {verifications.map((verification, index) => (
            <VerificationRow key={verification.id} verification={verification} index={index} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  verifyHeader: {
    marginTop: spacing.md,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  rail: {
    alignItems: 'center',
    width: 32,
    paddingTop: spacing.md,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 4,
    borderRadius: 1,
  },
  card: {
    flex: 1,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
