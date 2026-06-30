export type SavedLoginAccount = {
  loginId: string;
  userId: string | null;
  displayUsername: string | null;
  avatarUrl: string | null;
  lastUsedAt: number;
};

export type SavedLoginAccountInput = {
  loginId: string;
  userId?: string | null;
  displayUsername?: string | null;
  avatarUrl?: string | null;
};

export type SavedLoginProfileSnapshot = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  loginIds: string[];
};
