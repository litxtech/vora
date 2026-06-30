import { useLocalSearchParams } from 'expo-router';
import { CreateListingScreen } from '@/features/marketplace/components/CreateListingScreen';

export default function EditMarketplaceListingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreateListingScreen editListingId={id} />;
}
