import { memo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';

type ProfileTabBarIconProps = {
  color: string;
  focused: boolean;
  size?: number;
};

/** Profil sekmesi — avatar verisini layout yerine burada okur (tab bar re-render azalır). */
export const ProfileTabBarIcon = memo(function ProfileTabBarIcon({
  color,
  focused,
  size = 28,
}: ProfileTabBarIconProps) {
  const { profile } = useAuth();
  return (
    <ProfileTabIcon
      avatarUrl={profile?.avatar_url ?? null}
      username={profile?.username ?? ''}
      color={color}
      size={size}
      focused={focused}
    />
  );
});
