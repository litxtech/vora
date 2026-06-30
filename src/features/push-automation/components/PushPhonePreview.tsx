import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_NOTIFICATION_SENDER } from '@/features/notifications/constants/branding';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const VORA_APP_ICON = require('../../../../assets/icon-ios.png');

type Props = {
  title: string;
  body: string;
  imageUrl?: string | null;
};

export function PushPhonePreview({ title, body, imageUrl }: Props) {
  const { colors } = useTheme();
  const displayTitle = title.trim() || 'Bildirim başlığı';
  const displayBody = body.trim() || 'Mesajınız burada görünür…';

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
      <View style={styles.header}>
        <Ionicons name="phone-portrait-outline" size={14} color={colors.textMuted} />
        <Text secondary variant="caption">
          Kilit ekranı / bildirim önizlemesi
        </Text>
      </View>

      <View style={[styles.banner, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.bannerRow}>
          <Image source={VORA_APP_ICON} style={styles.appIcon} contentFit="cover" />
          <View style={styles.bannerText}>
            <View style={styles.titleRow}>
              <Text variant="caption" style={styles.appName}>
                {VORA_NOTIFICATION_SENDER}
              </Text>
              <Text secondary variant="caption">
                şimdi
              </Text>
            </View>
            <Text variant="label" numberOfLines={2}>
              {displayTitle}
            </Text>
            <Text secondary variant="caption" numberOfLines={3}>
              {displayBody}
            </Text>
          </View>
        </View>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.bannerImage} contentFit="cover" />
        ) : null}
      </View>

      <Text secondary variant="caption" style={styles.hint}>
        Alıcılar bildirimi uygulama adı ve ikonuyla «{VORA_NOTIFICATION_SENDER}» olarak görür; admin hesap adı
        gösterilmez.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
  },
  bannerText: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appName: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bannerImage: {
    width: '100%',
    height: 96,
    borderRadius: radius.md,
  },
  hint: {
    lineHeight: 18,
  },
});
