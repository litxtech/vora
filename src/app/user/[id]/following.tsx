import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { FollowListContent } from '@/features/profile/components/FollowListContent';

export default function FollowingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;

  return (
    <Screen padded={false}>
      <FollowListContent userId={id} type="following" />
    </Screen>
  );
}
