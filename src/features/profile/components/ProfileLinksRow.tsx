import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ProfileLinkPlatformIcon } from '@/features/profile/components/ProfileLinkPlatformIcon';
import { getProfileLinkLabel } from '@/features/profile/services/profileLinks';
import { openProfileLink } from '@/features/profile/services/socialProfileUrls';
import type { ProfileLink } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileLinksRowProps = {
  links: ProfileLink[];
};

function SocialIcon({ link }: { link: ProfileLink }) {
  const { colors } = useTheme();

  if (!link.platform) {
    return <Ionicons name="link-outline" size={18} color={colors.primary} />;
  }

  return <ProfileLinkPlatformIcon platform={link.platform} size={18} />;
}

export function ProfileLinksRow({ links }: ProfileLinksRowProps) {
  const { colors } = useTheme();

  const socialLinks = links.filter((l) => l.kind === 'social');
  const websiteLinks = links.filter((l) => l.kind === 'website');

  if (socialLinks.length === 0 && websiteLinks.length === 0) return null;

  const openLink = (link: ProfileLink) => {
    void openProfileLink(link);
  };

  return (
    <View style={styles.container}>
      {socialLinks.length > 0 ? (
        <View style={styles.socialRow}>
          {socialLinks.map((link) => (
            <Pressable
              key={link.id}
              onPress={() => openLink(link)}
              style={({ pressed }) => [
                styles.socialBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="link"
              accessibilityLabel={getProfileLinkLabel(link)}
            >
              <SocialIcon link={link} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {websiteLinks.length > 0 ? (
        <View style={styles.websiteList}>
          {websiteLinks.map((link) => (
            <Pressable
              key={link.id}
              onPress={() => openLink(link)}
              style={({ pressed }) => [
                styles.websiteRow,
                {
                  backgroundColor: `${colors.primary}10`,
                  borderColor: `${colors.primary}28`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="link"
            >
              <Ionicons name="globe-outline" size={15} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {getProfileLinkLabel(link)}
              </Text>
              <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  websiteList: { gap: spacing.xs },
  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
