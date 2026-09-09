import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CapGridItem } from '@/features/caps/components/CapGridItem';
import { CAP_PICKER_TABS } from '@/features/caps/constants';
import {
  addCapToLibrary,
  fetchLibraryCaps,
  fetchMarketCaps,
  fetchMyCreatedCaps,
  removeCapFromLibrary,
} from '@/features/caps/services/capsData';
import type { Cap, CapPickerTabId } from '@/features/caps/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type CapsPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (cap: Cap) => void;
};

export function CapsPickerSheet({ visible, onClose, onSelect }: CapsPickerSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<CapPickerTabId>('library');
  const [caps, setCaps] = useState<Cap[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setCaps([]);
      return;
    }
    setLoading(true);
    try {
      if (tab === 'library') setCaps(await fetchLibraryCaps(user.id));
      else if (tab === 'mine') setCaps(await fetchMyCreatedCaps(user.id));
      else {
        const market = await fetchMarketCaps();
        const lib = await fetchLibraryCaps(user.id);
        const libIds = new Set(lib.map((c) => c.id));
        setCaps(market.map((c) => ({ ...c, inLibrary: libIds.has(c.id) })));
      }
    } finally {
      setLoading(false);
    }
  }, [tab, user]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  const handleSelect = (cap: Cap) => {
    onSelect(cap);
    onClose();
  };

  const handleLongPress = (cap: Cap) => {
    if (!user) return;

    if (tab === 'market' && !cap.inLibrary) {
      Alert.alert('Kütüphaneye ekle', `@${cap.creator?.username ?? 'kullanici'} caps'ini ekle?`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: async () => {
            const { error } = await addCapToLibrary(cap.id);
            if (error) Alert.alert('Hata', error);
            else void load();
          },
        },
      ]);
      return;
    }

    if (tab === 'library' && cap.librarySource === 'market') {
      Alert.alert('Kütüphaneden kaldır', 'Bu caps kütüphanenizden çıkarılsın mı?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeCapFromLibrary(cap.id);
            if (error) Alert.alert('Hata', error);
            else void load();
          },
        },
      ]);
    }
  };

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
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="h3">Caps</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  onClose();
                  router.push('/caps/create' as Href);
                }}
                hitSlop={8}
                accessibilityLabel="Caps oluştur"
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.tabs}>
            {CAP_PICKER_TABS.map((item) => {
              const active = tab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setTab(item.id)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '600' }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={caps}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.list}
              columnWrapperStyle={styles.row}
              ListEmptyComponent={
                <Text secondary style={styles.empty}>
                  {tab === 'library'
                    ? 'Kütüphaneniz boş. Marketten ekleyin veya kendi caps’inizi oluşturun.'
                    : tab === 'mine'
                      ? 'Henüz caps üretmediniz.'
                      : 'Markette henüz caps yok.'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.cell}>
                  <CapGridItem
                    cap={item}
                    onPress={handleSelect}
                    onLongPress={handleLongPress}
                    selected={false}
                    showCreator={tab !== 'mine'}
                  />
                </View>
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
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  cell: {
    flex: 1 / 3,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
