export type ServiceCategory =
  | 'elektrik'
  | 'su_tesisati'
  | 'boya'
  | 'alci'
  | 'insaat'
  | 'klima'
  | 'kombi'
  | 'mobilya'
  | 'marangoz'
  | 'oto_tamir'
  | 'cekici'
  | 'lastik'
  | 'bilgisayar'
  | 'yazilim'
  | 'web_tasarim'
  | 'fotografci'
  | 'kameraman'
  | 'dugun_organizasyon'
  | 'kuafor'
  | 'guzellik'
  | 'temizlik'
  | 'nakliye'
  | 'veteriner'
  | 'bahcivan'
  | 'ozel_ders'
  | 'avukat'
  | 'muhasebeci'
  | 'diger';

export type ServiceUrgency = 'now' | 'today' | 'tomorrow' | 'this_week';

export type ServiceRequestStatus =
  | 'pending_offers'
  | 'offer_accepted'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'rated'
  | 'cancelled';

export type ServiceOfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export type ServicePaymentMethod = 'stripe';

export type ProviderBadge =
  | 'verified'
  | 'top_choice'
  | 'emergency'
  | 'premium'
  | 'best_service'
  | 'fast_response';

export type ProviderAccountType = 'individual' | 'business';

/** Ana merkez sekmeleri — tek düzey, rol seçimi yok */
export type ServiceHubTab = 'jobs' | 'active' | 'providers' | 'mine' | 'offers';

/** @deprecated HIZMET_HUB_TABS kullanın */
export type ServiceRole = 'customer' | 'provider';

/** @deprecated HIZMET_HUB_TABS kullanın */
export type ServiceCustomerTab = 'discover' | 'requests' | 'offers';

/** @deprecated HIZMET_HUB_TABS kullanın */
export type ServiceProviderTab = 'jobs' | 'profile' | 'offers';

/** @deprecated Rol + alt sekme kullanın */
export type ServiceMainTab = 'discover' | 'seeking' | 'providing' | 'offers';

export type ProviderDiscoverItem = ServiceProviderProfile & {
  latestReviewComment?: string | null;
};

export type ServiceCompletionProof = {
  imageUrl: string | null;
  videoUrl: string | null;
  submittedAt: string | null;
};

export type ServiceRequestListing = {
  id: string;
  requesterId: string;
  requesterName: string | null;
  requesterAvatar: string | null;
  regionId: string | null;
  city: string | null;
  title: string;
  description: string;
  category: ServiceCategory;
  urgency: ServiceUrgency;
  status: ServiceRequestStatus;
  budgetMin: number | null;
  budgetMax: number | null;
  imageUrls: string[];
  completionProof: ServiceCompletionProof;
  latitude: number | null;
  longitude: number | null;
  distanceKm?: number;
  offerCount: number;
  isEmergency: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateServiceRequestInput = {
  requesterId: string;
  regionId: string | null;
  city: string | null;
  title: string;
  description: string;
  category: ServiceCategory;
  urgency: ServiceUrgency;
  budgetMin?: number | null;
  budgetMax?: number | null;
  imageUrls?: string[];
  latitude?: number;
  longitude?: number;
  isEmergency?: boolean;
};

export type UpdateServiceRequestInput = {
  requestId: string;
  requesterId: string;
  title: string;
  description: string;
  category: ServiceCategory;
  urgency: ServiceUrgency;
  city?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  imageUrls?: string[];
};

export type ServiceOfferListing = {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string | null;
  providerAvatar: string | null;
  providerRating: number;
  providerJobCount: number;
  providerCompletionRate: number;
  providerResponseMinutes: number | null;
  providerIsPremium: boolean;
  price: number;
  estimatedArrival: string | null;
  message: string | null;
  warrantyMonths: number | null;
  status: ServiceOfferStatus;
  distanceKm?: number;
  createdAt: string;
};

export type CreateServiceOfferInput = {
  requestId: string;
  providerId: string;
  price: number;
  estimatedArrival?: string | null;
  message?: string | null;
  warrantyMonths?: number | null;
};

export type ServiceOfferInboxItem = ServiceOfferListing & {
  requestTitle: string;
  requestStatus: ServiceRequestStatus;
  direction: 'incoming' | 'outgoing';
};

export type ServiceProviderProfile = {
  id: string;
  userId: string;
  displayName: string;
  profession: string;
  city: string | null;
  regionId: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  phoneVerified: boolean;
  identityVerified: boolean;
  workplaceVerified: boolean;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  completionRate: number;
  responseMinutes: number | null;
  membershipYears: number;
  accountType: ProviderAccountType;
  categories: ServiceCategory[];
  badges: ProviderBadge[];
  isPremium: boolean;
  isSponsored: boolean;
  isActive: boolean;
  showOnProfile: boolean;
  latitude: number | null;
  longitude: number | null;
  isFavorited?: boolean;
  isSubscribed?: boolean;
  createdAt: string;
};

export type ProviderPortfolioItem = {
  id: string;
  providerId: string;
  title: string;
  description: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  mediaUrls: string[];
  createdAt: string;
};

/** Portfolyo + platformda tamamlanan işler (profilde herkese açık) */
export type ProviderPublicWork = {
  id: string;
  source: 'portfolio' | 'completed_job';
  title: string;
  description: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  mediaUrls: string[];
  completedAt: string;
};

export type ProviderCertificate = {
  id: string;
  providerId: string;
  title: string;
  documentUrl: string | null;
  issuedAt: string | null;
};

export type ServiceReviewInput = {
  jobId: string;
  reviewerId: string;
  quality: number;
  punctuality: number;
  cleanliness: number;
  valueForMoney: number;
  communication: number;
  wouldRecommend: boolean;
  comment?: string | null;
};

export type ServiceReviewListing = {
  id: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  overallRating: number;
  quality: number;
  punctuality: number;
  cleanliness: number;
  valueForMoney: number;
  communication: number;
  wouldRecommend: boolean;
  comment: string | null;
  createdAt: string;
};

export type AiRequestAssistResult = {
  category: ServiceCategory;
  categoryLabel: string;
  estimatedDuration: string;
  nearbyProviders: number;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
};

export type ServiceHistoryItem = {
  id: string;
  title: string;
  category: ServiceCategory;
  status: ServiceRequestStatus;
  providerName: string | null;
  price: number | null;
  completedAt: string | null;
  rating: number | null;
};
