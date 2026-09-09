import {
  extractShareLinkPath,
  resolveAppRouteFromShareUrl,
} from '@/lib/sharing/resolveIncomingShareUrl';

export type InternalShareKind =
  | 'post'
  | 'reel'
  | 'verify'
  | 'profile'
  | 'marketplace'
  | 'shop';

export type InternalShareRef = {
  kind: InternalShareKind;
  id: string;
  /** expo-router path (tıklanınca uygulama içi navigasyon) */
  route: string;
};

const KIND_BY_SEGMENT: Record<string, InternalShareKind> = {
  p: 'post',
  r: 'reel',
  v: 'verify',
  u: 'profile',
  m: 'marketplace',
  s: 'shop',
};

const KIND_LABEL: Record<InternalShareKind, string> = {
  post: 'Gönderi',
  reel: 'Reel',
  verify: 'Doğrulama',
  profile: 'Profil',
  marketplace: 'İlan',
  shop: 'Mağaza',
};

const KIND_ICON: Record<InternalShareKind, string> = {
  post: 'document-text-outline',
  reel: 'play-circle-outline',
  verify: 'shield-checkmark-outline',
  profile: 'person-circle-outline',
  marketplace: 'pricetag-outline',
  shop: 'storefront-outline',
};

/** Bir URL Vora paylaşım linki mi? Öyleyse tür/kimlik/route döndürür. */
export function resolveInternalShare(url: string): InternalShareRef | null {
  const path = extractShareLinkPath(url);
  if (!path) return null;

  const match = path.match(/^(p|r|v|u|m|s)\/([^/?#]+)/);
  if (!match) return null;

  const kind = KIND_BY_SEGMENT[match[1]];
  if (!kind) return null;

  const route = resolveAppRouteFromShareUrl(url);
  if (!route) return null;

  return { kind, id: decodeURIComponent(match[2]), route };
}

export function internalShareLabel(kind: InternalShareKind): string {
  return KIND_LABEL[kind];
}

export function internalShareIcon(kind: InternalShareKind): string {
  return KIND_ICON[kind];
}
