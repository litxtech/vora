import { forwardRef } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { APP_SHARE_CARD_WIDTH } from '@/features/app-share/constants';
import type { AppSharePlatform } from '@/features/app-share/types';
import { APP_ICON } from '@/constants/branding';
import { radius, spacing } from '@/constants/theme';

const CARD_GRADIENT = ['#5E35B1', '#4527A0', '#00897B'] as const;
const CARD_BG = '#0A0E14';

type AppShareCardProps = {
  title: string;
  subtitle: string;
  message: string;
  storeLabel: string;
  storeUrl: string;
  platform: AppSharePlatform;
  referrerLabel?: string | null;
  width?: number;
};

function shortenStoreUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').slice(0, 42);
  }
}

export const AppShareCard = forwardRef<View, AppShareCardProps>(function AppShareCard(
  { title, subtitle, message, storeLabel, storeUrl, platform, referrerLabel, width = APP_SHARE_CARD_WIDTH },
  ref,
) {
  const shortUrl = shortenStoreUrl(storeUrl);
  const storeIcon = platform === 'ios' ? 'logo-apple' : 'logo-google-playstore';

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.captureRoot, { width, borderRadius: radius.xl }]}
    >
      <LinearGradient colors={[...CARD_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardFill}>
        <View style={styles.glowOrb} />
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Image source={APP_ICON} style={styles.appIcon} resizeMode="cover" />
          </View>
          <Text style={styles.brand}>VORA X</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.messageBox}>
          <Text style={styles.message}>{message}</Text>
        </View>

        <View style={styles.storeRow}>
          <View style={styles.storeBadge}>
            <Ionicons name={storeIcon} size={18} color="#FFFFFF" />
            <Text style={styles.storeBadgeText}>{storeLabel}</Text>
          </View>
          <Text style={styles.storeHint}>Ücretsiz indir</Text>
        </View>

        {referrerLabel ? (
          <View style={styles.referrerRow}>
            <Ionicons name="person-circle-outline" size={14} color="rgba(255,255,255,0.88)" />
            <Text style={styles.referrerText}>{referrerLabel} seni davet ediyor</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.link} numberOfLines={1}>
            {shortUrl}
          </Text>
          <Text style={styles.watermark}>Karadeniz'in dijital ağı · {Platform.OS === 'ios' ? 'App Store' : 'Vora'}</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  captureRoot: {
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    overflow: 'hidden',
  },
  cardFill: {
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 420,
  },
  glowOrb: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  appIcon: {
    width: 56,
    height: 56,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  messageBox: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  message: {
    color: '#ECEFF1',
    fontSize: 15,
    lineHeight: 22,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  storeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  storeHint: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '600',
  },
  referrerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  referrerText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
    gap: 6,
    alignItems: 'center',
  },
  link: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  watermark: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
