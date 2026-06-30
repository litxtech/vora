export type ActingMode = 'personal' | 'business';

export type LinkedSiblingProfile = {
  siblingId: string;
  username: string;
  accountType: 'personal' | 'business';
  avatarUrl: string | null;
  fullName: string | null;
};

export type AccountSwitchTarget = {
  mode: ActingMode;
  kind: 'context' | 'session';
  label: string;
  username: string;
  avatarUrl: string | null;
  profileId: string;
};

/** Profilde gösterilen hesap geçiş butonu metni */
export type AccountSwitchPreview = {
  title: string;
  subtitle: string;
  target: AccountSwitchTarget;
};

export type StoredSiblingSession = {
  refreshToken: string;
  accessToken: string;
};

export type AccountLinkRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type LinkableSiblingProfile = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
};
