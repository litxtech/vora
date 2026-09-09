import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { DATE_ACCENT } from '@/features/date/constants';
import { dateAccessBlockReason } from '@/features/date/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

type DateAccessGateProps = {
  children: ReactNode;
};

export function DateAccessGate({ children }: DateAccessGateProps) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const reason = dateAccessBlockReason(profile);

  if (!reason) return <>{children}</>;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${DATE_ACCENT}18` }]}>
          <Ionicons name="calendar-outline" size={32} color={DATE_ACCENT} />
        </View>
        <Text variant="h2" style={styles.title}>
          Date
        </Text>
        <Text secondary variant="body" style={styles.reason}>
          {reason}
        </Text>
        {profile?.onboarding_completed === false ? (
          <Button
            title="Profili tamamla"
            onPress={() => router.push('/(onboarding)/profile-setup')}
            style={styles.btn}
          />
        ) : (
          <Button
            title="Profili düzenle"
            onPress={() => router.push('/profile/edit')}
            style={styles.btn}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  reason: {
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
