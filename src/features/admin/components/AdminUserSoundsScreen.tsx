import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { Text } from '@/components/ui/Text';
import { searchSounds } from '@/features/sounds/services/soundData';
import type { Sound } from '@/features/sounds/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export function AdminUserSoundsScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (value: string) => {
    setLoading(true);
    const items = value.trim() ? await searchSounds(value, 50) : [];
    setSounds(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  const moderate = async (soundId: string, action: 'delete' | 'suspend' | 'restore' | 'hide') => {
    const { error } = await supabase.rpc('admin_moderate_sound', {
      p_sound_id: soundId,
      p_action: action,
    });
    if (error) {
      Alert.alert('Hata', supabaseErrorMessage(error)!);
      return;
    }
    Alert.alert('Tamam', 'İşlem uygulandı.');
    void load(query);
  };

  const confirmModerate = (sound: Sound, action: 'delete' | 'suspend' | 'restore' | 'hide', label: string) => {
    Alert.alert(label, `"${sound.title}" için devam edilsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: label, style: 'destructive', onPress: () => void moderate(sound.id, action) },
    ]);
  };

  return (
    <AdminShell title="Kullanıcı Sesleri">
      <AdminSearchInput value={query} onChangeText={setQuery} placeholder="Ses veya kullanıcı ara" />

      <AdminSectionHeader title="Sesler" subtitle={loading ? 'Yükleniyor…' : `${sounds.length} sonuç`} />

      <ScrollView contentContainerStyle={styles.list}>
        {sounds.length === 0 && !loading ? (
          <AdminEmptyState icon="musical-notes-outline" title="Ses bulunamadı" />
        ) : (
          sounds.map((sound) => (
            <View key={sound.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Text variant="label">{sound.title}</Text>
                <Text secondary variant="caption">
                  @{sound.author?.username ?? sound.authorId} · {sound.status}
                </Text>
              </View>
              <Text secondary variant="caption">
                {sound.usageCount} kullanım · {sound.likeCount} beğeni · {sound.favoriteCount} kayıt
              </Text>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => confirmModerate(sound, 'hide', 'Gizle')}>
                  <Ionicons name="eye-off-outline" size={16} color={colors.text} />
                  <Text variant="caption">Geçici</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => confirmModerate(sound, 'suspend', 'Askıya al')}>
                  <Ionicons name="pause-circle-outline" size={16} color={colors.warning} />
                  <Text variant="caption">Askıya al</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => confirmModerate(sound, 'delete', 'Sil')}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text variant="caption">Sil</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => confirmModerate(sound, 'restore', 'Geri yükle')}>
                  <Ionicons name="refresh-outline" size={16} color={colors.success} />
                  <Text variant="caption">Geri yükle</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: { gap: 2 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
