import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import { formatCapClock } from '@/features/caps/constants';
import { fetchMyVoraVideosForCaps } from '@/features/caps/services/capsStudioData';
import type { CapVoraVideoOption } from '@/features/caps/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type CapsStudioVoraPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (video: CapVoraVideoOption) => void;
};

export function CapsStudioVoraPicker({
  visible,
  onClose,
  onSelect,
}: CapsStudioVoraPickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<CapVoraVideoOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await fetchMyVoraVideosForCaps(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="h3">Vora videolarım</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.videoId}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text secondary style={styles.empty}>
                  Hazır Vora videonuz yok. Önce bir video yükleyin veya galeriden seçin.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Image
                    source={{ uri: item.thumbnailUrl ?? undefined }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                  <View style={styles.meta}>
                    <Text numberOfLines={1} style={{ fontWeight: '600' }}>
                      {item.title?.trim() || 'Vora videosu'}
                    </Text>
                    <Text variant="caption" secondary>
                      {formatCapClock(item.durationMs)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              )}
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
    maxHeight: '78%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: '#000' },
  meta: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: spacing.xl },
});
