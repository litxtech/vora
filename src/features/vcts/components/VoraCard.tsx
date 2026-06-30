import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { buildVerifyUrl, formatTrustCodeShort } from '@/features/vcts/constants';
import type { FeedItem } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';

type VoraCardProps = {
  item: FeedItem;
  trustCode: string;
  width?: number;
};

export function VoraCard({ item, trustCode, width = 320 }: VoraCardProps) {
  const verifyUrl = buildVerifyUrl(trustCode);
  const preview = item.content.length > 120 ? `${item.content.slice(0, 120)}…` : item.content;

  return (
    <View style={[styles.wrap, { width }]}>
      <LinearGradient colors={['#0A0E14', '#141B26', '#0A0E14']} style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.brand}>VORA</Text>
          <View style={styles.qrMini}>
            <QRCode value={verifyUrl} size={48} backgroundColor="transparent" color="#80DEEA" />
          </View>
        </View>

        <Text style={styles.username}>@{item.author.username}</Text>

        {item.title ? (
          <Text variant="label" style={styles.title}>
            {item.title}
          </Text>
        ) : null}

        <Text style={styles.content}>{preview}</Text>

        <View style={styles.footer}>
          <Text style={styles.meta}>{formatFeedTime(item.createdAt)}</Text>
          <Text style={styles.meta}>ID: {formatTrustCodeShort(trustCode)}</Text>
        </View>

        <View style={styles.watermarkRow}>
          <Text style={styles.watermark}>🔒 Orijinal Kaynak · VORA</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(128, 222, 234, 0.25)',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#80DEEA',
  },
  qrMini: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  username: {
    color: '#B0BEC5',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#ECEFF1',
    fontSize: 15,
  },
  content: {
    color: '#CFD8DC',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  meta: {
    color: '#78909C',
    fontSize: 11,
  },
  watermarkRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  watermark: {
    color: 'rgba(128, 222, 234, 0.7)',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
