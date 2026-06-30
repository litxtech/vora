import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { VoraCard } from '@/features/vcts/components/VoraCard';
import { sharePostLink } from '@/lib/sharing/shareContent';
import type { FeedItem } from '@/features/feed/types';

type ShareCardSheetProps = {
  visible: boolean;
  item: FeedItem;
  trustCode: string;
  onClose: () => void;
};

export function ShareCardSheet({ visible, item, trustCode, onClose }: ShareCardSheetProps) {
  const { colors } = useTheme();

  const handleShare = async () => {
    await sharePostLink({
      postId: item.sourceId,
      title: item.title,
      content: item.content,
      authorUsername: item.author.username,
      authorDisplayName: item.author.fullName,
      verified: true,
    });
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text variant="h3" style={styles.title}>
            Paylaş Kartı Oluştur
          </Text>
          <Text secondary variant="caption" style={styles.subtitle}>
            Her kart VORA kaynak etiketi ve doğrulama linki taşır.
          </Text>

          <VoraCard item={item} trustCode={trustCode} />

          <View style={styles.actions}>
            <Button title="Paylaş" onPress={() => handleShare()} style={styles.actionBtn} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
