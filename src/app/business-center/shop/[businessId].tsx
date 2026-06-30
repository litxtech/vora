import { useLocalSearchParams } from 'expo-router';
import { BusinessShopScreen } from '@/features/business-center/components/BusinessShopScreen';

export default function BusinessShopRoute() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  if (!businessId) return null;
  return <BusinessShopScreen businessId={businessId} />;
}
