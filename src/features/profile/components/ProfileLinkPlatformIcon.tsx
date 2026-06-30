import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { SOCIAL_PLATFORM_MAP } from '@/features/profile/constants/profileLinks';
import type { ProfileSocialPlatform } from '@/features/profile/types';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileLinkPlatformIconProps = {
  platform: ProfileSocialPlatform;
  size?: number;
};

export function ProfileLinkPlatformIcon({ platform, size = 14 }: ProfileLinkPlatformIconProps) {
  const { colors } = useTheme();
  const def = SOCIAL_PLATFORM_MAP[platform];
  const color = def.color === '#000000' ? colors.text : def.color;

  if (def.iconSet === 'ionicons') {
    return (
      <Ionicons name={def.icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />
    );
  }

  return <FontAwesome5 name={def.icon} size={size} color={color} brand />;
}
