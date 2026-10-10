import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { canOpenCanlarUser, useCanlarUserSheetOptional } from '@/features/vora-canlar/components/CanlarUserSheet';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { supabase } from '@/lib/supabase/client';
import { spacing } from '@/constants/theme';

const avatarCache = new Map<string, string | null>();

export function useCanlarAvatar(username?: string | null) {
  const key = username?.trim() || '';
  const [url, setUrl] = useState<string | null>(key ? avatarCache.get(key) ?? null : null);

  useEffect(() => {
    if (!key || avatarCache.has(key)) return;
    let alive = true;
    void supabase
      .from('profiles')
      .select('avatar_url')
      .eq('username', key)
      .limit(1)
      .then(({ data }) => {
        const next = data?.[0]?.avatar_url ?? null;
        avatarCache.set(key, next);
        if (alive) setUrl(next);
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return url;
}

export function CanlarAuthorRow({
  name,
  meta,
  userId,
  onBeforeOpen,
}: {
  name: string;
  meta?: string | null;
  userId?: string | null;
  onBeforeOpen?: () => void;
}) {
  const sheet = useCanlarUserSheetOptional();
  const username = name.replace(/^@/, '').trim();
  const avatar = useCanlarAvatar(username);
  const label = username || 'Topluluk';
  const initial = label.slice(0, 1).toUpperCase();
  const openable = Boolean(sheet && canOpenCanlarUser(userId, username));

  const row = (
    <View style={styles.row}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" accessibilityLabel="" />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>{label}</Text>
        {meta ? <Text secondary numberOfLines={1}>{meta}</Text> : null}
      </View>
    </View>
  );

  if (!openable) return row;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} profili`}
      onPress={() => {
        onBeforeOpen?.();
        sheet?.openUser({ userId, username });
      }}
    >
      {row}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  fallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${CANLAR_ACCENT}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: CANLAR_ACCENT, fontWeight: '800' },
  copy: { flex: 1, gap: 2 },
  name: { fontWeight: '800', fontSize: 15 },
});
