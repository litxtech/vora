import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { DetailLoadingShell } from '@/components/ui/DetailLoadingShell';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { CapAttachment } from '@/features/caps/components/CapAttachment';
import { formatCapUsageCount } from '@/features/caps/constants';
import {
  addCapToLibrary,
  deleteOwnCap,
  fetchCapById,
  fetchCapUsageList,
  isCapInLibrary,
  removeCapFromLibrary,
} from '@/features/caps/services/capsData';
import type { Cap, CapUsageRow } from '@/features/caps/types';
import { formatFeedTime } from '@/features/feed/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function CapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [cap, setCap] = useState<Cap | null>(null);
  const [usage, setUsage] = useState<CapUsageRow[]>([]);
  const [inLibrary, setInLibrary] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const row = await fetchCapById(id);
      setCap(row);
      if (row && user?.id === row.creatorId) {
        setUsage(await fetchCapUsageList(row.id));
      } else {
        setUsage([]);
      }
      if (user && row) {
        setInLibrary(await isCapInLibrary(user.id, row.id));
      }
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return <DetailLoadingShell gradient />;
  }

  if (!cap) {
    return (
      <GradientBackground>
        <View style={[styles.root, { paddingTop: insets.top }]}>
          <AuthHeader title="Caps" />
          <Text secondary style={styles.empty}>
            Caps bulunamadı.
          </Text>
        </View>
      </GradientBackground>
    );
  }

  const isOwner = user?.id === cap.creatorId;

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
        <AuthHeader title={cap.title ?? 'Caps'} />
        <View style={styles.body}>
          {cap.creator ? (
            <CapAttachment
              capId={cap.id}
              imageUrl={cap.thumbUrl ?? cap.imageUrl}
              videoUrl={cap.videoUrl}
              width={cap.width}
              height={cap.height}
              startMs={cap.startMs}
              endMs={cap.endMs}
              overlay={cap.overlay}
              creator={cap.creator}
              size={240}
              showUsageHint
              uniqueUserCount={cap.uniqueUserCount}
            />
          ) : (
            <Image source={{ uri: cap.imageUrl }} style={styles.fallbackImage} contentFit="contain" />
          )}

          <Text variant="body" style={{ fontWeight: '600' }}>
            {formatCapUsageCount(cap.uniqueUserCount)}
          </Text>
          {cap.lastUsedAt ? (
            <Text secondary>Son kullanım: {formatFeedTime(cap.lastUsedAt)}</Text>
          ) : null}

          <View style={styles.actions}>
            {!isOwner && user ? (
              inLibrary ? (
                <Pressable
                  style={[styles.btn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => {
                    Alert.alert('Kaldır', 'Kütüphaneden çıkarılsın mı?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      {
                        text: 'Kaldır',
                        style: 'destructive',
                        onPress: async () => {
                          const { error } = await removeCapFromLibrary(cap.id);
                          if (error) Alert.alert('Hata', error);
                          else setInLibrary(false);
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Kütüphaneden kaldır</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    const { error } = await addCapToLibrary(cap.id);
                    if (error) Alert.alert('Hata', error);
                    else {
                      setInLibrary(true);
                      Alert.alert('Kaydedildi', 'Caps kütüphanenize eklendi.');
                    }
                  }}
                >
                  <Text style={styles.btnLight}>Kütüphaneye kaydet</Text>
                </Pressable>
              )
            ) : null}

            {cap.creator ? (
              <Pressable
                style={[styles.btn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => router.push(`/user/${cap.creatorId}` as Href)}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  @{cap.creator.username} profili
                </Text>
              </Pressable>
            ) : null}

            {isOwner ? (
              <Pressable
                style={[styles.btn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  Alert.alert('Caps silinsin mi?', 'Market ve kütüphanelerden kaldırılır.', [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: async () => {
                        const { error } = await deleteOwnCap(cap.id);
                        if (error) Alert.alert('Hata', error);
                        else router.back();
                      },
                    },
                  ]);
                }}
              >
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Caps’i sil</Text>
              </Pressable>
            ) : null}
          </View>

          {isOwner ? (
            <>
              <Text variant="h3" style={{ marginTop: spacing.md }}>
                Kullananlar
              </Text>
              <Text secondary style={{ marginBottom: spacing.sm }}>
                Her kullanıcı bir kez sayılır.
              </Text>
              <FlatList
                data={usage}
                keyExtractor={(item) => item.userId}
                scrollEnabled={false}
                ListEmptyComponent={<Text secondary>Henüz başka kimse kullanmadı.</Text>}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.usageRow, { backgroundColor: colors.surfaceElevated }]}
                    onPress={() => router.push(`/user/${item.userId}` as Href)}
                  >
                    <ProfileAvatar
                      username={item.username}
                      avatarUrl={item.avatarUrl}
                      size={40}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600' }}>@{item.username}</Text>
                      <Text secondary>
                        İlk: {formatFeedTime(item.firstUsedAt)}
                        {item.lastUsedAt !== item.firstUsedAt
                          ? ` · Son: ${formatFeedTime(item.lastUsedAt)}`
                          : ''}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            </>
          ) : null}
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  fallbackImage: {
    width: 200,
    height: 200,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLight: { color: '#fff', fontWeight: '700' },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
