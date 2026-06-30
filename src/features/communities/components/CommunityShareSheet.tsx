import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { communityComposePath } from '@/features/communities/constants';
import type { Community } from '@/features/communities/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityShareSheetProps = {
  visible: boolean;
  communities: Community[];
  loading?: boolean;
  onClose: () => void;
};

export function CommunityShareSheet({ visible, communities, loading = false, onClose }: CommunityShareSheetProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const surface = glassSurface[mode];

  const handleSelect = (community: Community) => {
    onClose();
    router.push(communityComposePath(community.id, community.name) as never);
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            surface,
            { paddingBottom: insets.bottom + spacing.lg, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <Text variant="label">Hangi toplulukta paylaşacaksın?</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={communities}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => handleSelect(item)}
                >
                  {item.iconUrl ? (
                    <Image source={{ uri: item.iconUrl }} style={styles.icon} />
                  ) : (
                    <View style={[styles.iconFallback, { backgroundColor: `${colors.primary}22` }]}>
                      <Ionicons name="people" size={18} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.rowInfo}>
                    <Text variant="label" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text secondary variant="caption">
                      {item.memberCount} üye
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              )}
              ListEmptyComponent={
                <Text secondary variant="caption" style={styles.empty}>
                  Paylaşım yapmak için bir topluluğa katılın.
                </Text>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
  },
  iconFallback: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
