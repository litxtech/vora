import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { formatFeedTime } from '@/features/feed/utils';
import { IncidentPulseDot } from '@/features/incidents/components/IncidentPulseDot';
import {
  INCIDENT_GRAPH_TITLE,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
} from '@/features/incidents/constants';
import type { IncidentThread } from '@/features/incidents/types';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { openIncidentInMap } from '@/features/incidents/services/incidentMapNavigation';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  thread: IncidentThread;
};

function severityGradient(severity: string): readonly [string, string, string] {
  const color = INCIDENT_SEVERITY[severity]?.color ?? '#E53935';
  return [`${color}E6`, `${color}AA`, '#1A1A2E99'] as const;
}

export function IncidentThreadHero({ thread }: Props) {
  const { colors } = useTheme();
  const severity = INCIDENT_SEVERITY[thread.severity] ?? INCIDENT_SEVERITY.medium;
  const status = INCIDENT_STATUS[thread.status] ?? INCIDENT_STATUS.open;
  const isLive = thread.status === 'open' || thread.status === 'verified';

  const openMaps = () => openIncidentInMap(thread);

  return (
    <Animated.View entering={FadeInDown.duration(380).springify()}>
      <LinearGradient
        colors={severityGradient(thread.severity)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.glowOrb} />

        <View style={styles.heroTop}>
          {isLive ? (
            <View style={styles.liveBadge}>
              <IncidentPulseDot color="#fff" size={8} />
              <Text variant="caption" style={styles.liveBadgeText}>
                Canlı takip
              </Text>
            </View>
          ) : (
            <View style={styles.liveBadge}>
              <Text variant="caption" style={styles.liveBadgeText}>
                {INCIDENT_GRAPH_TITLE}
              </Text>
            </View>
          )}
          {thread.isDemo ? (
            <View style={styles.demoBadge}>
              <Text variant="caption" style={styles.demoBadgeText}>
                Örnek
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.badges}>
          <View style={styles.badge}>
            <Ionicons name={severity.icon} size={12} color="#fff" />
            <Text variant="caption" style={styles.badgeText}>
              {severity.label}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              {status.label}
            </Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={12} color="#fff" />
            <Text variant="caption" style={styles.badgeText}>
              {thread.verificationCount} doğrulama
            </Text>
          </View>
        </View>

        <Text variant="h2" style={styles.title}>
          {thread.title}
        </Text>

        {thread.description ? (
          <Text variant="body" style={styles.description}>
            {thread.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <UserBadge author={thread.reporter} timeLabel={formatFeedTime(thread.createdAt)} />
        </View>

        <View style={styles.footerRow}>
          <Text variant="caption" style={styles.regionText}>
            {regionNameById(thread.regionId) ?? thread.regionId}
          </Text>
          {thread.latitude != null ? (
            <Pressable onPress={openMaps} style={styles.mapLink}>
              <Ionicons name="navigate-outline" size={14} color="#fff" />
              <Text variant="caption" style={styles.mapLinkText}>
                Haritada aç
              </Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  demoBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  demoBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 21,
  },
  metaRow: {
    marginTop: spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  regionText: {
    color: 'rgba(255,255,255,0.82)',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  mapLinkText: {
    color: '#fff',
    fontWeight: '600',
  },
});
