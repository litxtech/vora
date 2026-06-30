import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/Screen';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { ProfileEmptyState } from '@/features/profile/components/shared/ProfileEmptyState';
import { ProfileScreen } from '@/features/profile/components/ProfileScreen';
import { getCachedUserIdByUsername } from '@/features/profile/services/profileSessionCache';
import { resolveUsernameToUserId } from '@/features/profile/services/profileSessionLoad';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function UsernameProfileRoute() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const cleanUsername = username?.replace(/^@/, '').trim() ?? '';
  const [userId, setUserId] = useState<string | null>(() =>
    cleanUsername ? getCachedUserIdByUsername(cleanUsername) : null,
  );
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!cleanUsername) return;

    const cachedId = getCachedUserIdByUsername(cleanUsername);
    if (cachedId) {
      setUserId(cachedId);
      setNotFound(false);
      return;
    }

    let cancelled = false;

    void resolveUsernameToUserId(cleanUsername).then((id) => {
      if (cancelled) return;
      if (id) {
        setUserId(id);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cleanUsername]);

  if (notFound) {
    return (
      <Screen>
        <View style={{ flex: 1, paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <ScreenBackButton />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
            <Text variant="h3">Kullanıcı bulunamadı</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (!userId) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ProfileEmptyState loading />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ProfileScreen userId={userId} isOwnProfile={user?.id === userId} />
    </Screen>
  );
}
