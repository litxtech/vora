import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  ProviderBadgeRow,
  RatingStars,
} from '@/features/vora-hizmetler/components/ProviderBadgeRow';
import { ProviderLivePulse } from '@/features/vora-hizmetler/components/ProviderLivePulse';
import {
  VORA_HIZMETLER_ACCENT,
  VORA_HIZMETLER_GRADIENT,
} from '@/features/vora-hizmetler/constants';
import type { ServiceProviderProfile } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProviderProfileHeroProps = {
  provider: ServiceProviderProfile;
};

function resolveLiveStatus(responseMinutes: number | null): {
  label: string;
  color: string;
  pulse: boolean;
} {
  if (responseMinutes != null && responseMinutes <= 30) {
    return { label: 'Çevrimiçi · Hızlı yanıt', color: '#22C55E', pulse: true };
  }
  if (responseMinutes != null && responseMinutes <= 120) {
    return { label: 'Genelde aktif', color: '#06B6D4', pulse: true };
  }
  return { label: 'Profesyonel usta', color: VORA_HIZMETLER_ACCENT, pulse: false };
}

export function ProviderProfileHero({ provider }: ProviderProfileHeroProps) {
  const { colors } = useTheme();
  const live = resolveLiveStatus(provider.responseMinutes);
  const accountLabel =
    provider.accountType === 'business' ? 'İşletme Hesabı' : 'Bireysel Usta';

  return (
    <View style={styles.wrap}>
      <View style={styles.coverWrap}>
        {provider.coverUrl ? (
          <Image source={{ uri: provider.coverUrl }} style={styles.cover} />
        ) : (
          <LinearGradient
            colors={[...VORA_HIZMETLER_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cover}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.coverFade}
        />
        <View style={styles.coverBadges}>
          {provider.isSponsored ? (
            <View style={[styles.statusPill, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="megaphone" size={11} color="#fff" />
              <Text variant="caption" style={styles.statusPillText}>
                SPONSOR
              </Text>
            </View>
          ) : null}
          {provider.isPremium ? (
            <View style={[styles.statusPill, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="star" size={11} color="#fff" />
              <Text variant="caption" style={styles.statusPillText}>
                PREMIUM
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.identity}>
        <View style={[styles.avatarRing, { borderColor: colors.background }]}>
          {provider.avatarUrl ? (
            <Image source={{ uri: provider.avatarUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[...VORA_HIZMETLER_GRADIENT]}
              style={[styles.avatar, styles.avatarFallback]}
            >
              <Text variant="h2" style={{ color: '#fff' }}>
                {provider.displayName[0]?.toUpperCase() ?? 'U'}
              </Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.meta}>
          <Text variant="h2" numberOfLines={2}>
            {provider.displayName}
          </Text>
          <Text secondary variant="body" numberOfLines={1}>
            {provider.profession}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text secondary variant="caption" numberOfLines={1}>
              {provider.city ?? 'Türkiye'}
              {' · '}
              {accountLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.liveRow, { backgroundColor: `${live.color}12`, borderColor: `${live.color}30` }]}>
        {live.pulse ? <ProviderLivePulse color={live.color} size={9} /> : null}
        {!live.pulse ? (
          <Ionicons name="construct-outline" size={14} color={live.color} />
        ) : null}
        <Text variant="caption" style={{ color: live.color, fontWeight: '700' }}>
          {live.label}
        </Text>
        {provider.responseMinutes != null ? (
          <Text secondary variant="caption">
            · Ort. {provider.responseMinutes} dk yanıt
          </Text>
        ) : null}
      </View>

      <View style={styles.ratingRow}>
        <RatingStars rating={provider.rating} reviewCount={provider.reviewCount} size={16} />
      </View>

      <ProviderBadgeRow badges={provider.badges} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  coverWrap: {
    height: 168,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  coverBadges: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginTop: -36,
    paddingHorizontal: spacing.xs,
  },
  avatarRing: {
    borderWidth: 4,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  ratingRow: {
    marginTop: -4,
  },
});
