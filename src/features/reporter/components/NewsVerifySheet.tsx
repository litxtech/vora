import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { NewsVerificationSheet } from '@/features/news-verification/components/NewsVerificationSheet';
import { fetchVerificationSummary } from '@/features/news-verification/services/newsVerificationData';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type NewsVerifySheetProps = {
  postId: string;
  regionId?: string;
  onDone: () => void;
  onClose: () => void;
};

/** @deprecated NewsVerificationSheet kullanın */
export function NewsVerifySheet({ postId, regionId = 'trabzon', onDone, onClose }: NewsVerifySheetProps) {
  const { colors } = useTheme();

  return (
    <NewsVerificationSheet
      visible
      target={{ type: 'post', id: postId, regionId }}
      onClose={onClose}
      onUpdated={() => onDone()}
    />
  );
}

/** Modal sarmalayıcı — eski kullanım için */
export function NewsVerifyModal({
  visible,
  postId,
  regionId = 'trabzon',
  onDone,
  onClose,
}: NewsVerifySheetProps & { visible: boolean }) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          {visible ? (
            <NewsVerificationSheet
              visible={visible}
              target={{ type: 'post', id: postId, regionId }}
              onClose={onClose}
              onUpdated={async () => {
                await fetchVerificationSummary({ type: 'post', id: postId, regionId });
                onDone();
              }}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: { borderRadius: 16, overflow: 'hidden' },
});
