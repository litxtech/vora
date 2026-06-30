import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { spacing } from '@/constants/theme';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  compact?: boolean;
  trailing?: ReactNode;
};

export function AuthHeader({ title, subtitle, showBack = true, compact = false, trailing }: AuthHeaderProps) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={[styles.topRow, compact && styles.topRowCompact]}>
        {showBack ? (
          <ScreenBackButton />
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      <View style={styles.titles}>
        <Text variant={compact ? 'h3' : 'h2'}>{title}</Text>
        {subtitle ? (
          <Text secondary variant={compact ? 'caption' : 'body'} style={compact ? undefined : styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  headerCompact: {
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  topRowCompact: {
    marginBottom: spacing.xs,
  },
  backPlaceholder: {
    width: 22,
    height: 22,
  },
  trailing: {
    alignItems: 'flex-end',
  },
  titles: {
    gap: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
