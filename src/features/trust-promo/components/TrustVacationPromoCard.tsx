import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import {
  TRUST_PROMO_ACCENT,
  TRUST_PROMO_GRADIENT,
  TRUST_PROMO_GRADIENT_DEEP,
} from '@/features/trust-promo/constants';
import type { TrustVacationPromoConfig } from '@/features/trust-promo/types';
import { radius, spacing } from '@/constants/theme';

type Props = {
  config: TrustVacationPromoConfig;
  currentScore?: number | null;
  maxScore?: number;
  onDismiss?: () => void;
  compact?: boolean;
};

export function TrustVacationPromoCard({
  config,
  currentScore,
  maxScore = 100,
  onDismiss,
  compact = false,
}: Props) {
  const showProgress =
    typeof currentScore === 'number' && Number.isFinite(currentScore) && currentScore >= 0;
  const progress = showProgress ? Math.min(1, currentScore / maxScore) : null;

  const openCta = () => {
    const href = (config.cta_href.trim() || '/settings/insights') as Href;
    router.push(href);
  };

  return (
    <Pressable onPress={openCta} style={styles.pressable}>
      <LinearGradient
        colors={[
          `${TRUST_PROMO_GRADIENT[0]}F0`,
          `${TRUST_PROMO_GRADIENT[1]}E8`,
          `${TRUST_PROMO_GRADIENT[2]}D8`,
          TRUST_PROMO_GRADIENT_DEEP,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, compact && styles.cardCompact]}
      >
        <View style={[styles.orb, styles.orbA]} />
        <View style={[styles.orb, styles.orbB]} />

        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Ionicons name="airplane" size={12} color={TRUST_PROMO_ACCENT} />
            <Text variant="caption" style={styles.badgeText}>
              {config.badge.trim() || 'Tatil heyecanı'}
            </Text>
          </View>
          <View style={styles.liveDot}>
            <View style={styles.livePulse} />
            <Text variant="caption" style={styles.liveText}>
              Canlı
            </Text>
          </View>
          {config.dismissible && onDismiss ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
              hitSlop={10}
              accessibilityLabel="Kampanyayı kapat"
              style={styles.dismissBtn}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.copy}>
            <Text variant="label" style={styles.title} numberOfLines={compact ? 2 : 3}>
              {config.title}
            </Text>
            {config.highlight.trim() ? (
              <View style={styles.highlightChip}>
                <Ionicons name="trophy" size={12} color={TRUST_PROMO_ACCENT} />
                <Text variant="caption" style={styles.highlightText}>
                  {config.highlight}
                </Text>
              </View>
            ) : null}
            {config.message.trim() ? (
              <Text variant="caption" style={styles.message} numberOfLines={compact ? 3 : 5}>
                {config.message}
              </Text>
            ) : null}

            {progress != null ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressMeta}>
                  <Text variant="caption" style={styles.progressLabel}>
                    Güven puanın
                  </Text>
                  <Text variant="caption" style={styles.progressValue}>
                    {Math.round(currentScore!)}/{maxScore}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
              </View>
            ) : null}

            {config.cta_label.trim() ? (
              <View style={styles.cta}>
                <Text variant="caption" style={styles.ctaText}>
                  {config.cta_label}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={TRUST_PROMO_ACCENT} />
              </View>
            ) : null}
          </View>

          {config.image_url?.trim() ? (
            <Image source={{ uri: config.image_url.trim() }} style={styles.sideImage} resizeMode="cover" />
          ) : (
            <View style={styles.iconStack}>
              <View style={[styles.iconBubble, styles.iconBubbleBack]}>
                <Ionicons name="leaf" size={18} color="rgba(255,255,255,0.55)" />
              </View>
              <View style={[styles.iconBubble, styles.iconBubbleFront]}>
                <Ionicons name="water" size={22} color="#fff" />
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardCompact: {
    padding: spacing.sm + 2,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbA: {
    width: 120,
    height: 120,
    top: -40,
    right: -20,
  },
  orbB: {
    width: 80,
    height: 80,
    bottom: -30,
    left: -10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  liveDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
  },
  dismissBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
  },
  highlightChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(253,230,138,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.35)',
  },
  highlightText: {
    color: TRUST_PROMO_ACCENT,
    fontWeight: '700',
    fontSize: 11,
  },
  message: {
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },
  progressBlock: {
    gap: 4,
    marginTop: 2,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  progressValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  progressTrack: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: TRUST_PROMO_ACCENT,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ctaText: {
    color: TRUST_PROMO_ACCENT,
    fontWeight: '700',
  },
  sideImage: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconStack: {
    width: 56,
    height: 56,
    position: 'relative',
  },
  iconBubble: {
    position: 'absolute',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconBubbleBack: {
    width: 40,
    height: 40,
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconBubbleFront: {
    width: 44,
    height: 44,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
