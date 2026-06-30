export type LostItemType = 'lost' | 'found';

export type LostItemCategory = 'animal' | 'person' | 'item' | 'document' | 'other';

export type LostItemStatus = 'open' | 'resolved';

export type LostTab = 'lost' | 'found' | 'nearby' | 'recent' | 'mine' | 'resolved' | 'urgent';

export type LostListing = {
  id: string;
  itemType: LostItemType;
  category: LostItemCategory;
  title: string;
  description: string;
  contactInfo: string | null;
  mediaUrls: string[];
  regionId: string;
  district: string | null;
  locationName: string | null;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  status: LostItemStatus;
  isUrgent: boolean;
  rewardAmount: string | null;
  viewCount: number;
  latitude: number | null;
  longitude: number | null;
  lastSeenAt: string | null;
  createdAt: string;
  distanceKm?: number;
};

export type CreateLostItemInput = {
  authorId: string;
  regionId: string;
  itemType: LostItemType;
  category: LostItemCategory;
  title: string;
  description: string;
  contactInfo: string | null;
  locationName: string | null;
  district: string | null;
  mediaUrls: string[];
  isUrgent: boolean;
  rewardAmount: string | null;
  lastSeenAt: string | null;
  latitude?: number;
  longitude?: number;
};

export type UpdateLostItemInput = CreateLostItemInput & {
  itemId: string;
};

export type LostItemTip = {
  id: string;
  message: string;
  contactInfo: string | null;
  reporterName: string | null;
  createdAt: string;
};
