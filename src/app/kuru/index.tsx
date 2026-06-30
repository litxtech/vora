import { Redirect } from 'expo-router';
import { WALLET_ROUTE } from '@/features/wallet/constants';

export default function KuruLegacyRedirect() {
  return <Redirect href={WALLET_ROUTE} />;
}
