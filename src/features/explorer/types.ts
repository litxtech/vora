export type ExplorerMarker = {
  id: string;
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string;
};

export type ExplorerPresenceRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  latitude: number;
  longitude: number;
  heading: number | null;
  updated_at: string;
};
