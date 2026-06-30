import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PioneerInfoModal } from '@/features/pioneer/components/PioneerInfoModal';
import { PIONEER_COLOR, PIONEER_ICON, PIONEER_TITLE } from '@/features/pioneer/constants';
import { radius, spacing } from '@/constants/theme';

type PioneerBadgeProps = {
  earnedAt?: string | null;
  compact?: boolean;
};

export function PioneerBadge({ earnedAt, compact = false }: PioneerBadgeProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const iconSize = compact ? 10 : 10;
  const fontSize = compact ? 10 : 10;

  return (
    <>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          setModalVisible(true);
        }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={PIONEER_TITLE}
        style={[styles.badge, compact && styles.badgeInline, { backgroundColor: `${PIONEER_COLOR}22` }]}
      >
        <Ionicons name={PIONEER_ICON} size={iconSize} color={PIONEER_COLOR} />
        <Text variant="caption" style={{ color: PIONEER_COLOR, fontSize, fontWeight: '600' }}>
          {PIONEER_TITLE}
        </Text>
      </Pressable>

      <PioneerInfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        earnedAt={earnedAt}
      />
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: spacing.xs,
  },
  badgeInline: {
    flexShrink: 0,
    alignSelf: 'center',
  },
});
