import { useLocalSearchParams } from 'expo-router';
import { CreateListingScreen } from '@/features/marketplace/components/CreateListingScreen';

export default function CreateListingRoute() {
  const { cloneFrom, businessId } = useLocalSearchParams<{ cloneFrom?: string; businessId?: string }>();
  const cloneFromId = typeof cloneFrom === 'string' ? cloneFrom : undefined;
  const linkedBusinessId = typeof businessId === 'string' ? businessId : undefined;
  return <CreateListingScreen cloneFromId={cloneFromId} businessId={linkedBusinessId} />;
}
