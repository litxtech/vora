import { Screen } from '@/components/ui/Screen';
import { CloseFriendsManager } from '@/features/profile/components/CloseFriendsManager';

export default function CloseFriendsRoute() {
  return (
    <Screen padded={false}>
      <CloseFriendsManager />
    </Screen>
  );
}
