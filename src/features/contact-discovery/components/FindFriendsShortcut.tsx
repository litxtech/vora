import { Pressable, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '@/constants/theme';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { CONTACT_DISCOVERY_FEATURE_ID, FIND_FRIENDS_ROUTE } from '@/features/contact-discovery/constants';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

/** Arkadaş arama kutusunun yanındaki sade rehber düğmesi. */
export function FindFriendsShortcut() {
  const { user, isGuest } = useAuth();
  const { colors } = useTheme();
  if (!user || isGuest) return null;

  return (
    <FeatureGate featureId={CONTACT_DISCOVERY_FEATURE_ID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rehberindeki kişileri bul"
        accessibilityHint="Telefon rehberini açar"
        onPress={() => router.push(FIND_FRIENDS_ROUTE as Href)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="people-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
