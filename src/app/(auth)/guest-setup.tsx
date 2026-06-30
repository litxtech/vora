import { Redirect } from 'expo-router';

/** Misafir profil adımı kaldırıldı — eski bağlantılar doğrudan akışa yönlendirilir. */
export default function GuestSetupRoute() {
  return <Redirect href="/(tabs)" />;
}
