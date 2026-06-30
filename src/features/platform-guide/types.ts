export type PlatformGuideCategory = 'wallet' | 'points' | 'features' | 'policy' | 'general';

export type PlatformGuideSection = {
  heading: string;
  body: string;
};

export type PlatformGuideListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  category: PlatformGuideCategory;
  sortOrder: number;
  publishedAt: string | null;
  hasImage: boolean;
  hasVideo: boolean;
};

export type PlatformGuideDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  category: PlatformGuideCategory;
  sections: PlatformGuideSection[];
  imageUrl: string | null;
  videoUrl: string | null;
  footerNote: string | null;
  publishedAt: string | null;
};

export type PlatformGuideAdminRow = PlatformGuideDetail & {
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlatformGuideDraft = {
  id: string | null;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  category: PlatformGuideCategory;
  sections: PlatformGuideSection[];
  imageUrl: string | null;
  videoUrl: string | null;
  footerNote: string;
  sortOrder: number;
  isPublished: boolean;
};
