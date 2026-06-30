import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  getTrustScoreColor,
  getTrustScoreTier,
  TRUST_REWARD_POOL_MIN,
  TRUST_SCORE_MAX,
  TRUST_VACATION_TEASER_MIN,
} from '@/features/profile/constants';
import {
  INSIGHTS_GRADIENT,
  INSIGHTS_GRADIENT_DEEP,
} from '@/features/insights/constants';
import { radius, spacing } from '@/constants/theme';

type Props = {
  trustScore: number;
  verifiedCount: number;
  contributionScore: number;
};

function getNextMilestone(score: number): { target: number; label: string; floor: number } | null {
  if (score >= TRUST_REWARD_POOL_MIN) return null;
  if (score >= 85) return { target: TRUST_REWARD_POOL_MIN, label: 'Zirve Üye', floor: 85 };
  if (score >= TRUST_VACATION_TEASER_MIN) return { target: 85, label: 'Elit Aday', floor: TRUST_VACATION_TEASER_MIN };
  if (score >= 55) return { target: TRUST_VACATION_TEASER_MIN, label: 'Güvenilir Lider', floor: 55 };
  return { target: 55, label: 'Aktif Üye', floor: 0 };
}

export function InsightsHeroCard({ trustScore, verifiedCount, contributionScore }: Props) {
  const tier = getTrustScoreTier(trustScore);
  const tierColor = getTrustScoreColor(trustScore);
  const next = getNextMilestone(trustScore);
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((trustScore - next.floor) / (next.target - next.floor)) * 100)))
    : 100;

  return (
    <LinearGradient
      colors={[`${INSIGHTS_GRADIENT[0]}F2`, `${INSIGHTS_GRADIENT[1]}E6`, `${INSIGHTS_GRADIENT[2]}CC`, INSIGHTS_GRADIENT_DEEP]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.orb, styles.orbA]} />
      <View style={[styles.orb, styles.orbB]} />

      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={13} color="#fff" />
          <Text variant="caption" style={styles.badgeText}>
            Güven Puanı
          </Text>
        </View>
        <View style={[styles.tierPill, { backgroundColor: `${tierColor}33`, borderColor: `${tierColor}66` }]}>
          <Text variant="caption" style={[styles.tierText, { color: tierColor }]}>
            {tier}
          </Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreValue}>{trustScore}</Text>
        <Text style={styles.scoreMax}>/{TRUST_SCORE_MAX}</Text>
      </View>

      {next ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressMeta}>
            <Text variant="caption" style={styles.progressLabel}>
              Sonraki seviye: {next.label}
            </Text>
            <Text variant="caption" style={styles.progressPct}>
              %{progressPct}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: tierColor }]} />
          </View>
        </View>
      ) : (
        <Text variant="caption" style={styles.maxLabel}>
          Maksimum seviyeye ulaştınız
        </Text>
      )}

      <View style={styles.footer}>
        <FooterChip icon="checkmark-done" label="Doğrulanmış" value={String(verifiedCount)} />
        <FooterChip icon="trophy" label="Katkı" value={String(contributionScore)} />
      </View>
    </LinearGradient>
  );
}

function FooterChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.85)" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" style={styles.chipLabel}>
          {label}
        </Text>
        <Text variant="caption" style={styles.chipValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 180,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  orbA: { width: 120, height: 120, top: -36, right: -24 },
  orbB: { width: 80, height: 80, bottom: -16, left: -8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badgeText: { color: '#fff', fontWeight: '600' },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tierText: { fontWeight: '700', fontSize: 11 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: spacing.md,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -1.5,
  },
  scoreMax: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressBlock: { gap: 6, marginBottom: spacing.md },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  progressPct: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 11 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  maxLabel: { color: 'rgba(255,255,255,0.8)', marginBottom: spacing.md, fontSize: 12 },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  chipLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },
  chipValue: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
