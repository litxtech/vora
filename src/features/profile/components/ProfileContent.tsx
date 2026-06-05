import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import { useGuestMode } from '@/features/auth/hooks/useGuestMode';
import {
  createCollection,
  fetchSavedPosts,
  type SaveCollection,
} from '@/features/profile/services/savedPosts';
import type { FeedItem } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileTab = 'posts' | 'saved';

export function ProfileContent() {
  const { user, profile, signOut, isGuest, exitGuestMode } = useAuth();
  const { isGuest: guestBrowsing } = useGuestMode();
  const { colors, preference, setMode } = useTheme();

  const [tab, setTab] = useState<ProfileTab>('posts');
  const [savedPosts, setSavedPosts] = useState<FeedItem[]>([]);
  const [collections, setCollections] = useState<SaveCollection[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    if (tab !== 'saved' || !user) return;
    setLoadingSaved(true);
    fetchSavedPosts(user.id)
      .then(setSavedPosts)
      .finally(() => setLoadingSaved(false));
  }, [tab, user?.id]);

  const [collectionName, setCollectionName] = useState('');
  const [showCollectionInput, setShowCollectionInput] = useState(false);

  const handleNewCollection = async () => {
    if (!user || !collectionName.trim()) return;
    const { error } = await createCollection(user.id, collectionName.trim());
    if (!error) {
      setCollections((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, name: collectionName.trim(), postCount: 0 },
      ]);
      setCollectionName('');
      setShowCollectionInput(false);
    }
  };

  const updateSaved = (id: string, patch: Partial<FeedItem>) => {
    setSavedPosts((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text variant="h2">Profil</Text>

      {guestBrowsing ? (
        <GlassCard style={styles.guestCard}>
          <Text variant="label">Misafir Modu</Text>
          <Text secondary variant="caption">
            Canlı akışı, haritayı ve işletmeleri görüntüleyebilirsiniz.
          </Text>
          <View style={styles.guestActions}>
            <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
            <Button title="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
          </View>
        </GlassCard>
      ) : null}

      {user && profile ? (
        <GlassCard style={styles.profileCard}>
          <Text variant="h3">{profile.full_name ?? profile.username}</Text>
          <Text secondary>@{profile.username}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </GlassCard>
      ) : null}

      {user ? (
        <View style={styles.tabs}>
          {(['posts', 'saved'] as ProfileTab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                {
                  borderColor: tab === t ? colors.primary : colors.border,
                  backgroundColor: tab === t ? 'rgba(30,136,229,0.12)' : colors.surface,
                },
              ]}
            >
              <Text variant="caption" style={{ color: tab === t ? colors.primary : colors.textSecondary }}>
                {t === 'posts' ? 'Gönderiler' : 'Kaydedilenler'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {tab === 'saved' && user ? (
        <View style={styles.savedSection}>
          {showCollectionInput ? (
            <View style={styles.collectionInput}>
              <TextInput
                style={[styles.collectionField, { color: colors.text, borderColor: colors.border }]}
                placeholder="Koleksiyon adı"
                placeholderTextColor={colors.textMuted}
                value={collectionName}
                onChangeText={setCollectionName}
              />
              <Button title="Oluştur" onPress={handleNewCollection} fullWidth={false} />
            </View>
          ) : (
            <Pressable
              onPress={() => setShowCollectionInput(true)}
              style={[styles.collectionBtn, { borderColor: colors.border }]}
            >
              <Text variant="caption" style={{ color: colors.primary }}>
                + Koleksiyon oluştur
              </Text>
            </Pressable>
          )}
          {collections.map((c) => (
            <View key={c.id} style={[styles.collectionChip, { backgroundColor: colors.surfaceElevated }]}>
              <Text variant="caption">{c.name}</Text>
            </View>
          ))}
          {loadingSaved ? (
            <ActivityIndicator color={colors.primary} />
          ) : savedPosts.length === 0 ? (
            <Text secondary>Kaydedilen gönderi yok.</Text>
          ) : (
            savedPosts.map((item) => (
              <FeedPostCard key={item.id} item={item} onUpdate={(patch) => updateSaved(item.id, patch)} />
            ))
          )}
        </View>
      ) : tab === 'posts' && user ? (
        <Text secondary style={styles.emptyPosts}>
          Gönderileriniz akışta görünür. Henüz gönderi yoksa paylaşmaya başlayın.
        </Text>
      ) : null}

      {user ? (
        <>
          <Pressable
            style={[styles.menuBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => router.push('/settings/account')}
          >
            <Text>Hesap Güvenliği</Text>
          </Pressable>
          <Pressable
            style={[styles.menuBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => setMode(preference === 'dark' ? 'light' : 'dark')}
          >
            <Text>Tema: {preference === 'dark' ? 'Koyu' : preference === 'light' ? 'Açık' : 'Sistem'}</Text>
          </Pressable>
          <Pressable
            style={[styles.menuBtn, { backgroundColor: colors.danger }]}
            onPress={async () => {
              await signOut();
              if (isGuest) await exitGuestMode();
              router.replace('/(welcome)/lobby');
            }}
          >
            <Text style={{ color: '#fff' }}>Çıkış Yap</Text>
          </Pressable>
        </>
      ) : !guestBrowsing ? (
        <View style={styles.guestActions}>
          <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
          <Button title="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  guestCard: { gap: spacing.sm },
  guestActions: { gap: spacing.sm, marginTop: spacing.sm },
  profileCard: { gap: spacing.xs },
  bio: { marginTop: spacing.xs },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  savedSection: { gap: spacing.md },
  collectionBtn: { borderWidth: 1, borderRadius: radius.md, borderStyle: 'dashed', padding: spacing.md, alignItems: 'center' },
  collectionInput: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  collectionField: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  collectionChip: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  emptyPosts: { textAlign: 'center', paddingVertical: spacing.lg },
  menuBtn: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
});
