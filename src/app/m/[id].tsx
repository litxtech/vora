import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MarketplaceShareLinkScreen() {
  const { id, buy } = useLocalSearchParams<{ id: string; buy?: string }>();

  if (!id) {
    return <Redirect href="/marketplace-center" />;
  }

  const query = buy === '1' ? '?buy=1' : '';
  return <Redirect href={`/detail/marketplace/${id}${query}`} />;
}
