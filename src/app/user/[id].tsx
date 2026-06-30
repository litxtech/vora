import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ProfileScreen } from '@/features/profile/components/ProfileScreen';
import { useAuth } from '@/providers/AuthProvider';

export default function UserProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  if (!id) return null;

  return (
    <Screen padded={false}>
      <ProfileScreen userId={id} isOwnProfile={user?.id === id} />
    </Screen>
  );
}
