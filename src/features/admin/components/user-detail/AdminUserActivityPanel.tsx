import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminUserActivityTimeline } from '@/features/admin/components/AdminUserActivityTimeline';
import { AdminUserTrustLedger } from '@/features/admin/components/user-detail/AdminUserTrustLedger';
import { spacing } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';

type AdminUserActivityPanelProps = {
  userId: string;
};

export function AdminUserActivityPanel({ userId }: AdminUserActivityPanelProps) {
  return (
    <View style={styles.wrap}>
      <AdminSectionHeader title="Aktivite geçmişi" hint="Gönderi, ban, karantina ve moderasyon" />
      <AdminUserActivityTimeline userId={userId} />
      <AdminUserTrustLedger userId={userId} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
});
