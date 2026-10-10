import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { SoundCard } from '@/features/sounds/components/SoundCard';
import { deleteSound, fetchMySounds } from '@/features/sounds/services/soundData';
import type { Sound } from '@/features/sounds/types';
import { useMusicPreview } from '@/features/music/hooks/useMusicPreview';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function SoundMineScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { togglePreview, stopPreview, playingId } = useMusicPreview();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSounds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setSounds(await fetchMySounds(user.id, 80));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => stopPreview();
    }, [load, stopPreview]),
  );

  const confirmDelete = (sound: Sound) => {
    if (!user) return;
    Alert.alert('Sesi kaldır', `"${sound.title}" listeden ve müzik kütüphanesinden kalkar.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: () => {
          void deleteSound(sound.id, user.id).then((result) => {
            if (result.error) {
              Alert.alert('Kaldırılamadı', result.error);
              return;
            }
            setSounds((current) => current.filter((item) => item.id !== sound.id));
          });
        },
      },
    ]);
  };

  const usage = sounds.reduce((sum, sound) => sum + sound.usageCount, 0);

  return (
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.top}>
          <ScreenBackButton />
          <View style={styles.titles}>
            <Text style={styles.title}>Seslerim</Text>
            <Text secondary variant="caption">Oluşturduğun sesler</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ses oluştur"
            onPress={() => router.push('/sounds/create' as Href)}
            style={[styles.create, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>

        {!loading && sounds.length > 0 ? (
          <View style={styles.stats}>
            <Stat label="Ses" value={String(sounds.length)} />
            <Stat label="Kullanım" value={usage.toLocaleString('tr-TR')} />
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={sounds}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 32, gap: spacing.sm }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={[styles.emptyMark, { backgroundColor: `${colors.accent}18` }]}>
                  <Ionicons name="mic-outline" size={28} color={colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>Henüz sesin yok</Text>
                <Text secondary style={styles.emptyBody}>Mikrofonla kaydet veya bir dosya yükle. Düzenleme ve kaldırma bu sayfada durur.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/sounds/create' as Href)}
                  style={[styles.emptyAction, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.emptyActionText}>Ses oluştur</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <SoundCard
                sound={item}
                playing={playingId === item.id}
                onPress={() => router.push(`/sounds/${item.id}` as Href)}
                onPreview={() => void togglePreview(item.id, item.audioUrl)}
                onEdit={() => router.push(`/sounds/${item.id}/edit` as Href)}
                onDelete={() => confirmDelete(item)}
              />
            )}
          />
        )}
      </View>
    </GradientBackground>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text secondary variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  titles: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: '800' },
  create: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  stat: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: spacing.md, gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: 48, paddingHorizontal: spacing.lg },
  emptyMark: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyBody: { textAlign: 'center', lineHeight: 20 },
  emptyAction: { marginTop: spacing.sm, borderRadius: radius.lg, paddingHorizontal: 18, paddingVertical: 12 },
  emptyActionText: { color: '#fff', fontWeight: '800' },
});
