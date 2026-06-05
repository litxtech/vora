import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useGuestMode } from '@/features/auth/hooks/useGuestMode';

export function GuestBanner() {
  const { isGuest } = useGuestMode();

  if (!isGuest) return null;

  return (
    <GlassCard style={styles.card}>
      <Text variant="label">Misafir Modu</Text>
      <Text secondary variant="caption">
        Canlı akışı, haritayı ve işletmeleri görüntüleyebilirsiniz. Paylaşım, mesaj, yorum ve beğeni için kayıt gerekir.
      </Text>
      <View style={styles.actions}>
        <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
        <Button title="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
