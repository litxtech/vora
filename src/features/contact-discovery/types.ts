export type ContactsPermissionStatus = 'undetermined' | 'granted' | 'denied';

export type ContactsAccessPrivileges = 'all' | 'limited' | 'none';

export type ContactsPlatform = 'ios' | 'android' | 'web' | 'other';

export type ContactsPermissionSnapshot = {
  status: ContactsPermissionStatus;
  canAskAgain: boolean;
  accessPrivileges: ContactsAccessPrivileges | null;
};

export type ContactsAccessStep =
  | { type: 'unavailable' }
  | { type: 'request-system' }
  | { type: 'read'; scope: 'all' | 'limited' }
  | { type: 'choose-contacts' }
  | { type: 'open-settings' };

export type MatchPlan =
  | { ok: true; batches: string[][]; omitted: number }
  | { ok: false; reason: 'empty' | 'daily-limit' };

export type ContactMatch = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  viewerFollows: boolean;
  followsViewer: boolean;
  isFriend: boolean;
  matchedE164: string | null;
};

export type DiscoveryStatus = {
  enabled: boolean;
  phoneHint: string | null;
  consentedAt: string | null;
};
