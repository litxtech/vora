import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  formatDeletedAccountNotice,
  isDeletedAccount,
} from '@/features/account-deletion/utils';
import type { DeletedBy } from '@/features/account-deletion/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type DeletedAccountNoticeProps = {
  accountStatus?: string | null;
  deletedAt?: string | null;
  deletedBy?: DeletedBy | null;
  compact?: boolean;
};

export function DeletedAccountNotice({
  accountStatus,
  deletedAt,
  deletedBy,
  compact = false,
}: DeletedAccountNoticeProps) {
  const { colors } = useTheme();

  if (!isDeletedAccount(accountStatus)) return null;

  return (
    <View
      style={[
        styles.wrap,
        compact ? styles.compact : null,
        { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}33` },
      ]}
    >
      <Ionicons name="person-remove-outline" size={compact ? 16 : 20} color={colors.danger} />
      <Text variant={compact ? 'caption' : 'body'} style={{ color: colors.danger, flex: 1 }}>
        {formatDeletedAccountNotice(deletedAt, deletedBy)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  compact: {
    padding: spacing.sm,
  },
});
