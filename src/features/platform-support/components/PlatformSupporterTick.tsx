import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlatformSupporterInfoModal } from '@/features/platform-support/components/PlatformSupporterInfoModal';

const SUPPORT_COLOR = '#10B981';

type PlatformSupporterTickProps = {
  size?: number;
  /** Destekçi olunan tarih (ISO). Bilgi modalında gösterilir. */
  since?: string | null;
};

/** İsim yanında her yerde görünen yeşil platform destekçisi tiki. */
export function PlatformSupporterTick({ size = 14, since }: PlatformSupporterTickProps) {
  const [infoVisible, setInfoVisible] = useState(false);

  const handlePress = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    setInfoVisible(true);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Platform destekçisi tiki"
        style={styles.tick}
      >
        <Ionicons name="checkmark-circle" size={size} color={SUPPORT_COLOR} />
      </Pressable>
      <PlatformSupporterInfoModal
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
        since={since}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tick: { flexShrink: 0, alignSelf: 'center' },
});
