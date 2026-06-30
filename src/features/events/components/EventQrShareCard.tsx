import { forwardRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '@/components/ui/Text';
import {
  buildEventCheckInDeepLink,
  EVENT_CENTER_DEF,
  EVENT_SHARE_CARD_WIDTH,
  formatEventDate,
  formatEventShareDisplayPath,
} from '@/features/events/constants';
import { radius, spacing } from '@/constants/theme';

const ACCENT = '#80DEEA';
const EVENT_ACCENT = EVENT_CENTER_DEF.accent;
const CARD_BG = '#0A0E14';
const CARD_GRADIENT = ['#0A0E14', '#121A24', '#0D1219'] as const;
const QR_SIZE = 188;

export type EventQrShareCardProps = {
  token: string;
  title: string;
  eventId: string;
  startsAt?: string | null;
  locationName?: string | null;
  width?: number;
  onReady?: () => void;
};

export const EventQrShareCard = forwardRef<View, EventQrShareCardProps>(function EventQrShareCard(
  { token, title, eventId, startsAt, locationName, width = EVENT_SHARE_CARD_WIDTH, onReady },
  ref,
) {
  const payload = buildEventCheckInDeepLink(token);
  const shortPath = formatEventShareDisplayPath(eventId);

  useEffect(() => {
    const timer = setTimeout(() => onReady?.(), 280);
    return () => clearTimeout(timer);
  }, [onReady, token, title, eventId]);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.captureRoot, { width, borderRadius: radius.xl }]}
    >
      <LinearGradient colors={[...CARD_GRADIENT]} style={styles.cardFill}>
        <View style={styles.accentBar} />

        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.eventBadge}>
              <Ionicons name="calendar" size={14} color={EVENT_ACCENT} />
              <Text style={styles.eventBadgeText}>Etkinlik Girişi</Text>
            </View>
          </View>
          <Text style={styles.brand}>VORA</Text>
        </View>

        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>

        {startsAt ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={ACCENT} />
            <Text style={styles.metaText}>{formatEventDate(startsAt)}</Text>
          </View>
        ) : null}

        {locationName ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={ACCENT} />
            <Text style={styles.metaText} numberOfLines={2}>
              {locationName}
            </Text>
          </View>
        ) : null}

        <View style={styles.qrWrap}>
          <View style={styles.qrBox}>
            <QRCode value={payload} size={QR_SIZE} backgroundColor="#FFFFFF" color="#0A0E14" />
          </View>
          <Text style={styles.qrHint}>Katılımcılar bu kodu okutarak giriş yapabilir</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.link} numberOfLines={1}>
            {shortPath}
          </Text>
          <Text style={styles.watermark}>Etkinlik girişi · VORA</Text>
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
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  badgeRow: {
    flex: 1,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(233, 30, 99, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(233, 30, 99, 0.35)',
  },
  eventBadgeText: {
    color: EVENT_ACCENT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  brand: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: '#F5F7FA',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  metaText: {
    flex: 1,
    color: '#90A4AE',
    fontSize: 12,
    lineHeight: 17,
  },
  qrWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  qrBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128, 222, 234, 0.25)',
  },
  qrHint: {
    color: '#78909C',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: spacing.md,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 6,
    alignItems: 'center',
  },
  link: {
    color: '#78909C',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  watermark: {
    color: 'rgba(128, 222, 234, 0.65)',
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
});
