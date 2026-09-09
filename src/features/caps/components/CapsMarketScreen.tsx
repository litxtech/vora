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
  addCapToLibrary,
  fetchLibraryCaps,
  fetchMarketCaps,
} from '@/features/caps/services/capsData';
import type { Cap } from '@/features/caps/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function CapsMarketScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [caps, setCaps] = useState<Cap[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const market = await fetchMarketCaps(80);
      if (!user) {
        setCaps(market);
        return;
      }
      const lib = await fetchLibraryCaps(user.id);
      const libIds = new Set(lib.map((c) => c.id));
      setCaps(market.map((c) => ({ ...c, inLibrary: libIds.has(c.id) })));
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
    if (!user) {
      Alert.alert('Giriş gerekli', 'Marketten caps eklemek için giriş yapın.');
      return;
    }
    if (cap.inLibrary) {
      router.push(`/caps/${cap.id}` as Href);
      return;
    }
    Alert.alert('Kütüphaneye ekle', `@${cap.creator?.username ?? 'kullanici'} caps’ini ekle?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ekle',
        onPress: async () => {
          const { error } = await addCapToLibrary(cap.id);
          if (error) Alert.alert('Hata', error);
          else {
            Alert.alert('Eklendi', 'Caps kütüphanenize kaydedildi.');
            void load();
          }
        },
      },
      {
        text: 'Detay',
        onPress: () => router.push(`/caps/${cap.id}` as Href),
      },
    ]);
  };

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <AuthHeader title="Caps Market" />
        <Pressable
          onPress={() => router.push('/caps' as Href)}
          style={[styles.centerLink, { backgroundColor: colors.surfaceElevated }]}
        >
          <Ionicons name="compass-outline" size={16} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            Caps Merkezi · Keşfet & sıralama
          </Text>
        </Pressable>
        <Text secondary style={styles.hint}>
          Popüler caps’ler. Beğendiğinizi kütüphaneye ekleyin.
        </Text>
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
                Markette henüz caps yok.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.cell}>
                <CapGridItem cap={item} onPress={handlePress} showCreator showUsage />
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
  centerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  hint: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
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
