import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminMarketplaceStatusBadge } from '@/features/admin/components/marketplace/AdminMarketplaceStatusBadge';
import { formatIbanInput } from '@/features/auth/services/validation';
import { formatMarketplaceDate } from '@/features/marketplace/constants';
import type { AdminMarketplacePayoutProfileRow } from '@/features/marketplace/services/adminMarketplace';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminMarketplacePayoutCardProps = {
  profile: AdminMarketplacePayoutProfileRow;
  onVerify: () => void;
  verifyLoading?: boolean;
};

function sellerDisplayName(profile: AdminMarketplacePayoutProfileRow): string {
  return profile.seller_name ?? profile.seller_username ?? profile.user_id.slice(0, 8);
}

export function AdminMarketplacePayoutCard({ profile, onVerify, verifyLoading = false }: AdminMarketplacePayoutCardProps) {
  const { colors } = useTheme();
  const formattedIban = formatIbanInput(profile.iban);
  const isVerified = Boolean(profile.verified_at);

  const copyIban = async () => {
    await Clipboard.setStringAsync(profile.iban.replace(/\s/g, ''));
    Alert.alert('Kopyalandı', 'IBAN panoya kopyalandı.');
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text variant="label">{profile.account_holder}</Text>
          <Text secondary variant="caption">
            {sellerDisplayName(profile)}
          </Text>
        </View>
        <AdminMarketplaceStatusBadge
          label={isVerified ? 'Doğrulandı' : 'Bekliyor'}
          tone={isVerified ? 'success' : 'warning'}
        />
      </View>

      <Pressable
        onPress={() => void copyIban()}
        style={[styles.ibanBlock, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="IBAN kopyala"
      >
        <View style={styles.ibanHeader}>
          <Ionicons name="card-outline" size={16} color={colors.textMuted} />
          <Text secondary variant="caption" style={{ fontWeight: '600' }}>
            IBAN
          </Text>
          <Ionicons name="copy-outline" size={14} color={colors.primary} style={styles.copyIcon} />
        </View>
        <Text variant="label" style={styles.ibanText}>
          {formattedIban}
        </Text>
        {profile.bank_name ? (
          <Text secondary variant="caption">
            {profile.bank_name}
          </Text>
        ) : null}
      </Pressable>

      <Text secondary variant="caption">
        Son güncelleme: {formatMarketplaceDate(profile.updated_at)}
        {profile.verified_at ? ` · Doğrulama: ${formatMarketplaceDate(profile.verified_at)}` : ''}
      </Text>

      {!isVerified ? (
        <AdminActionChip
          label="IBAN doğrula"
          icon="shield-checkmark-outline"
          tone="primary"
          onPress={onVerify}
          loading={verifyLoading}
        />
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  ibanBlock: {
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  ibanHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  copyIcon: { marginLeft: 'auto' },
  ibanText: { letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
});
