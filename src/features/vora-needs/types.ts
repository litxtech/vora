export type VoraNeedCategory = 'product' | 'service' | 'help' | 'job';

export type VoraNeedVisibility = 'global' | 'city' | 'nearby';

export type VoraNeedUrgency = 'normal' | 'urgent';

export type VoraNeedStatus = 'active' | 'hidden' | 'removed' | 'reported' | 'reviewing';

export type VoraNeedFeedTab =
  | 'all'
  | 'global'
  | 'city'
  | 'nearby'
  | 'urgent'
  | 'favorites'
  | 'mine';

export type VoraNeedListing = {
  id: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  regionId: string | null;
  city: string | null;
  title: string;
  description: string;
  category: VoraNeedCategory;
  visibility: VoraNeedVisibility;
  urgency: VoraNeedUrgency;
  status: VoraNeedStatus;
  imageUrl: string | null;
  isFeatured: boolean;
  viewCount: number;
  favoriteCount: number;
  reportCount: number;
  latitude: number | null;
  longitude: number | null;
  isFavorited?: boolean;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateVoraNeedInput = {
  authorId: string;
  regionId: string | null;
  city: string | null;
  title: string;
  description: string;
  category: VoraNeedCategory;
  visibility: VoraNeedVisibility;
  urgency: VoraNeedUrgency;
  imageUrl: string | null;
  latitude?: number;
  longitude?: number;
};

export type UpdateVoraNeedInput = Partial<
  Pick<
    CreateVoraNeedInput,
    'title' | 'description' | 'category' | 'visibility' | 'urgency' | 'city' | 'imageUrl'
  >
> & {
  status?: VoraNeedStatus;
};

export type VoraNeedFeedFilters = {
  category?: VoraNeedCategory;
  visibility?: VoraNeedVisibility;
  urgentOnly?: boolean;
  query?: string;
};
