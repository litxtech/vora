import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { FriendsListContent } from '@/features/profile/components/FriendsListContent';

export default function FriendsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;

  return (
    <Screen padded={false}>
      <FriendsListContent userId={id} />
    </Screen>
  );
}
