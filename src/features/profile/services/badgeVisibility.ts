import type { Ionicons } from '@expo/vector-icons';
import { IZDIVAC_SPECIAL_BADGES, type IzdivacSpecialBadgeType } from '@/features/izdivac';
import { BUSINESS_VERIFIED_COLOR } from '@/features/profile/services/businessIdentity';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { UserRole } from '@/constants/roles';

/** Profilde isim yanında gösterilen ve kullanıcının gizleyebileceği tikler. */
export type ProfileBadgeKey =
  | 'verified'
  | 'business'
  | 'premium'
  | 'platform_charm'
  | 'pioneer'
  | 'platform_supporter'
  | 'admin'
  | 'moderator'
  | 'reporter'
  | IzdivacSpecialBadgeType;

/** Kullanıcının rolüne karşılık gelen gizlenebilir tik anahtarı (yoksa null). */
export function roleBadgeKey(role: UserRole | null | undefined): ProfileBadgeKey | null {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return 'admin';
    case 'moderator':
      return 'moderator';
    case 'verified_reporter':
      return 'reporter';
    default:
      return null;
  }
}

export type ProfileBadgeVisibilityDef = {
  key: ProfileBadgeKey;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const PROFILE_BADGE_VISIBILITY_DEFS: ProfileBadgeVisibilityDef[] = [
  {
    key: 'finansman',
    label: IZDIVAC_SPECIAL_BADGES.finansman.label,
    description: 'İzdivaç finansman tiki',
    icon: IZDIVAC_SPECIAL_BADGES.finansman.icon,
    color: IZDIVAC_SPECIAL_BADGES.finansman.color,
  },
  {
    key: 'jigolo',
    label: IZDIVAC_SPECIAL_BADGES.jigolo.label,
    description: 'İzdivaç jigolo tiki',
    icon: IZDIVAC_SPECIAL_BADGES.jigolo.icon,
    color: IZDIVAC_SPECIAL_BADGES.jigolo.color,
  },
  {
    key: 'tilki',
    label: IZDIVAC_SPECIAL_BADGES.tilki.label,
    description: 'İzdivaç tilki tiki',
    icon: IZDIVAC_SPECIAL_BADGES.tilki.icon,
    color: IZDIVAC_SPECIAL_BADGES.tilki.color,
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Yönetici (admin) tiki',
    icon: 'star',
    color: '#D32F2F',
  },
  {
    key: 'moderator',
    label: 'Moderatör',
    description: 'Moderatör (topluluk yöneticisi) tiki',
    icon: 'shield-checkmark',
    color: '#7B1FA2',
  },
  {
    key: 'reporter',
    label: 'Muhabir',
    description: 'Doğrulanmış muhabir tiki',
    icon: 'mic',
    color: '#1E88E5',
  },
  {
    key: 'verified',
    label: 'Doğrulanmış',
    description: 'Kimlik doğrulanmış hesap tiki',
    icon: 'checkmark-circle',
    color: '#1E88E5',
  },
  {
    key: 'business',
    label: 'Kurumsal',
    description: 'Kurumsal hesap doğrulama tiki',
    icon: 'storefront',
    color: BUSINESS_VERIFIED_COLOR,
  },
  {
    key: 'premium',
    label: 'Premium',
    description: 'Premium üyelik rozeti',
    icon: 'diamond',
    color: '#FFB300',
  },
  {
    key: 'platform_charm',
    label: 'Vora İkonu',
    description: 'Platform tarafından verilen ikon rozeti',
    icon: 'sparkles',
    color: '#818CF8',
  },
  {
    key: 'pioneer',
    label: 'Öncü',
    description: 'Öncü üye rozeti',
    icon: 'compass',
    color: '#0891B2',
  },
  {
    key: 'platform_supporter',
    label: 'Platform Destekçisi',
    description: 'Platforma destek sağlayan üye rozeti',
    icon: 'heart-circle',
    color: '#10B981',
  },
];

export function isBadgeHidden(
  hidden: string[] | null | undefined,
  key: ProfileBadgeKey,
): boolean {
  return Array.isArray(hidden) && hidden.includes(key);
}

/** Kullanıcının sahip olduğu (dolayısıyla gizleyebileceği) tik anahtarları. */
export function ownedProfileBadgeKeys(input: {
  isVerified?: boolean | null;
  isBusinessVerified?: boolean | null;
  isPremium?: boolean | null;
  isPlatformCharm?: boolean | null;
  isPioneer?: boolean | null;
  isPlatformSupporter?: boolean | null;
  role?: UserRole | null;
  izdivacBadges?: IzdivacSpecialBadgeType[] | null;
}): ProfileBadgeKey[] {
  const owned: ProfileBadgeKey[] = [];
  for (const badge of input.izdivacBadges ?? []) owned.push(badge);
  const roleKey = roleBadgeKey(input.role);
  if (roleKey) owned.push(roleKey);
  if (input.isVerified) owned.push('verified');
  if (input.isBusinessVerified) owned.push('business');
  if (input.isPremium) owned.push('premium');
  if (input.isPlatformCharm) owned.push('platform_charm');
  if (input.isPioneer) owned.push('pioneer');
  if (input.isPlatformSupporter) owned.push('platform_supporter');
  return owned;
}

/** Tek bir tikin görünürlüğünü günceller (gizle / göster). */
export async function setBadgeHidden(
  userId: string,
  key: ProfileBadgeKey,
  hidden: boolean,
): Promise<{ error: string | null }> {
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('hidden_badges')
    .eq('id', userId)
    .maybeSingle();

  if (readError) return { error: supabaseErrorMessage(readError) };

  const current = new Set<string>((existing?.hidden_badges ?? []) as string[]);
  if (hidden) {
    current.add(key);
  } else {
    current.delete(key);
  }

  const { error } = await supabase
    .from('profiles')
    .update({ hidden_badges: Array.from(current), updated_at: new Date().toISOString() })
    .eq('id', userId);

  return { error: supabaseErrorMessage(error) };
}
