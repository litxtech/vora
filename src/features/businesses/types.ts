export type BusinessDetail = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  district: string | null;
  regionName: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  latitude: number | null;
  longitude: number | null;
  ownerId: string | null;
  viewCount: number;
  createdAt: string | null;
  isDemo?: boolean;
};

export type BusinessCampaignPreview = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
};

export type BusinessEventPreview = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  locationName: string | null;
  coverUrl: string | null;
};

export type BusinessJobPreview = {
  id: string;
  title: string;
  description: string;
  jobType: string;
  salaryRange: string | null;
  createdAt: string;
};
