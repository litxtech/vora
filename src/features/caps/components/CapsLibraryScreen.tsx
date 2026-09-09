import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { CapGridItem } from '@/features/caps/components/CapGridItem';
import {
  deleteOwnCap,
  fetchLibraryCaps,
  removeCapFromLibrary,
} from '@/features/caps/services/capsData';
import type { Cap } from '@/features/caps/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function CapsLibraryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [caps, setCaps] = useState<Cap[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setCaps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCaps(await fetchLibraryCaps(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handlePress = (cap: Cap) => {
    router.push(`/caps/${cap.id}` as Href);
  };

  const handleLongPress = (cap: Cap) => {
    if (!user) return;

    if (cap.librarySource === 'created' || cap.creatorId === user.id) {
      Alert.alert('Caps', undefined, [
        {
          text: 'Detay / kullanım',
          onPress: () => router.push(`/caps/${cap.id}` as Href),
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Caps silinsin mi?', 'Market ve kütüphanelerden kaldırılır.', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  const { error } = await deleteOwnCap(cap.id);
                  if (error) Alert.alert('Hata', error);
                  else void load();
                },
              },
            ]);
          },
        },
        { text: 'İptal', style: 'cancel' },
      ]);
      return;
    }

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
  };

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <AuthHeader title="Caps Kütüphanem" />
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/caps/create' as Href)}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text variant="caption" style={styles.actionText}>
              Oluştur
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/caps' as Href)}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <Ionicons name="compass-outline" size={18} color={colors.primary} />
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Merkez
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <FlatList
            data={caps}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
            columnWrapperStyle={styles.row}
            ListEmptyComponent={
              <Text secondary style={styles.empty}>
                Henüz caps yok. Kendi caps’inizi oluşturun veya marketten ekleyin.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.cell}>
                <CapGridItem
                  cap={item}
                  onPress={handlePress}
                  onLongPress={handleLongPress}
                  showCreator
                  showUsage
                />
              </View>
            )}
          />
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  actionText: { color: '#fff', fontWeight: '600' },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  row: { gap: spacing.sm },
  cell: { flex: 1 / 3 },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});
