import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { IZDIVAC_ACCENT } from '@/features/izdivac/constants';
import { radius, spacing } from '@/constants/theme';

export function IzdivacChatBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <Ionicons name="heart-half" size={14} color={IZDIVAC_ACCENT} />
        <Text variant="caption" style={styles.title}>
          İzdivaç sohbeti
        </Text>
        <Pressable
          onPress={() => router.push('/izdivac-center?tab=messages' as never)}
          hitSlop={8}
          style={styles.linkBtn}
        >
          <Text variant="caption" style={styles.linkText}>
            Mesajlar
          </Text>
          <Ionicons name="chevron-forward" size={12} color={IZDIVAC_ACCENT} />
        </Pressable>
      </View>
      <Text secondary variant="caption" style={styles.hint}>
        Bu sohbet yalnızca İzdivaç üyeleri arasında. Tüm mesajlaşma özellikleri kullanılabilir.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(233,30,99,0.28)',
    backgroundColor: 'rgba(233,30,99,0.08)',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    color: '#E91E63',
    fontWeight: '800',
    fontSize: 11,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: '#E91E63',
    fontWeight: '700',
    fontSize: 10,
  },
  hint: {
    fontSize: 10,
    lineHeight: 14,
  },
});
