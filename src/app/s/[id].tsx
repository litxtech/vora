import { Redirect, useLocalSearchParams } from 'expo-router';

/** Paylaşım deep link: vora://s/{id} veya vora.app/s/{id} */
export default function BusinessShopShareLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return <Redirect href="/business-center" />;
  }

  return <Redirect href={`/business-center/shop/${id}`} />;
}
