import { Screen } from '@/components/ui/Screen';
import { ProfileContent } from '@/features/profile/components/ProfileContent';

export default function ProfileScreen() {
  return (
    <Screen padded={false}>
      <ProfileContent />
    </Screen>
  );
}
