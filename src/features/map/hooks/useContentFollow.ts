import { useCallback, useEffect, useState } from 'react';
import {
  isContentFollowed,
  toggleContentFollow,
} from '@/features/map/services/contentFollow';
import type { ContentFollowType } from '@/features/map/types';
import { useAuth } from '@/providers/AuthProvider';

export function useContentFollow(type: ContentFollowType, contentId: string | null | undefined) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !contentId) {
      setFollowing(false);
      return;
    }

    isContentFollowed(type, contentId, user.id).then(setFollowing);
  }, [type, contentId, user?.id]);

  const toggle = useCallback(async () => {
    if (!user?.id || !contentId) return { error: 'Giriş gerekli' };

    setLoading(true);
    const result = await toggleContentFollow(type, contentId, user.id, following);
    if (!result.error) setFollowing(result.following);
    setLoading(false);
    return result;
  }, [user?.id, contentId, following, type]);

  return { following, loading, toggle, canFollow: Boolean(user?.id && contentId) };
}
