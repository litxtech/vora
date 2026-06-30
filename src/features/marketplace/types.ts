export type MarketplaceDescriptionBlock =
  | { type: 'text'; content: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'image'; url: string }
  | { type: 'video'; url: string };

export type MarketplaceCommentKind = 'general' | 'buyer_proof';

export type MarketplaceCategory =
  | 'electronics'
  | 'home_living'
  | 'furniture'
  | 'clothing'
  | 'baby_kids'
  | 'sports'
  | 'entertainment'
  | 'books_media'
  | 'vehicles'
  | 'garden_agri'
  | 'handmade'
  | 'pets'
  | 'office_business'
  | 'collectibles'
  | 'services'
  | 'real_estate'
  | 'other';

export type MarketplaceListingType = 'sale' | 'negotiable' | 'trade' | 'free';

export type MarketplacePricePoint = {
  day: string;
  price: number | null;
  listingType: MarketplaceListingType;
};

export type MarketplaceCondition = 'new' | 'like_new' | 'used' | 'for_parts';

export type MarketplaceListingStatus = 'active' | 'reserved' | 'sold' | 'removed' | 'archived';

export type MarketplaceDeliveryMode = 'meetup' | 'shipping';

export type MarketplaceOfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export type MarketplaceTab =
  | 'discover'
  | 'nearby'
  | 'free'
  | 'trade'
  | 'entertainment'
  | 'electronics'
  | 'furniture'
  | 'favorites'
  | 'mine';

export type MarketplaceSort = 'favorites' | 'newest' | 'price_asc' | 'price_desc' | 'nearest';

export type MarketplaceOrderStatus =
  | 'pending_payment'
  | 'paid_escrow'
  | 'seller_shipped'
  | 'buyer_confirmed'
  | 'platform_approved'
  | 'payout_scheduled'
  | 'payout_completed'
  | 'closed'
  | 'disputed'
  | 'refund_pending'
  | 'refunded'
  | 'cancelled';

export type MarketplaceListing = {
  id: string;
  authorId: string;
  businessId: string | null;
  regionId: string;
  district: string;
  category: MarketplaceCategory;
  subcategory: string;
  title: string;
  description: string;
  descriptionBlocks: MarketplaceDescriptionBlock[];
  price: number | null;
  currency: string;
  listingType: MarketplaceListingType;
  condition: MarketplaceCondition;
  status: MarketplaceListingStatus;
  deliveryMode: MarketplaceDeliveryMode;
  shippingNote: string | null;
  mediaUrls: string[];
  coverUrl: string | null;
  tags: string[];
  showPhone: boolean;
  contactPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  viewCount: number;
  favoriteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  soldAt?: string | null;
  distanceKm?: number | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  authorVerified?: boolean;
  isFavorite?: boolean;
  variantGroupId?: string | null;
  sourceListingId?: string | null;
};

export type MarketplaceComment = {
  id: string;
  listingId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  mediaUrls: string[];
  commentKind: MarketplaceCommentKind;
  createdAt: string;
  authorName: string | null;
  authorUsername: string | null;
  isSeller?: boolean;
  replies?: MarketplaceComment[];
};

export type MarketplaceFilters = {
  minPrice?: number | null;
  maxPrice?: number | null;
  condition?: MarketplaceCondition | null;
  listingType?: MarketplaceListingType | null;
  category?: MarketplaceCategory | null;
  subcategory?: string | null;
  radiusKm?: number | null;
  sort?: MarketplaceSort;
  businessOnly?: boolean;
};

export type CreateListingInput = {
  authorId: string;
  regionId: string;
  district: string;
  category: MarketplaceCategory;
  subcategory: string;
  title: string;
  description: string;
  descriptionBlocks?: MarketplaceDescriptionBlock[];
  price: number | null;
  listingType: MarketplaceListingType;
  condition: MarketplaceCondition;
  deliveryMode: MarketplaceDeliveryMode;
  shippingNote?: string | null;
  mediaUrls: string[];
  tags: string[];
  showPhone: boolean;
  contactPhone?: string | null;
  latitude?: number;
  longitude?: number;
  businessId?: string | null;
  sourceListingId?: string | null;
  variantGroupId?: string | null;
};

export type MarketplaceOrder = {
  id: string;
  orderNumber: string;
  listingId: string;
  listingTitle: string;
  listingCoverUrl: string | null;
  buyerId: string;
  sellerId: string;
  buyerName: string | null;
  sellerName: string | null;
  grossAmountCents: number;
  commissionCents: number;
  sellerNetCents: number;
  currency: string;
  status: MarketplaceOrderStatus;
  trackingNumber: string | null;
  paidAt: string | null;
  sellerShippedAt: string | null;
  buyerConfirmedAt: string | null;
  platformApprovedAt: string | null;
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
  payoutReference: string | null;
  createdAt: string;
};

export type MarketplaceOrderEvent = {
  id: string;
  eventType: string;
  actorRole: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SellerPayoutProfile = {
  userId: string;
  accountHolder: string;
  iban: string;
  bankName: string | null;
  verifiedAt: string | null;
};

export type MarketplaceOffer = {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string | null;
  amountCents: number | null;
  currency: string;
  message: string | null;
  status: MarketplaceOfferStatus;
  respondedAt: string | null;
  createdAt: string;
  listingTitle?: string | null;
  listingCoverUrl?: string | null;
  listingType?: MarketplaceListingType;
};

export type SellerSaleRecord = {
  id: string;
  source: 'order' | 'manual';
  orderId: string | null;
  listingId: string;
  listingTitle: string;
  listingCoverUrl: string | null;
  buyerName: string | null;
  grossAmountCents: number;
  commissionCents: number;
  sellerNetCents: number;
  currency: string;
  statusLabel: string;
  soldAt: string;
  orderNumber: string | null;
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
  isPlatformPayout: boolean;
};

export type MarketplaceAdminSummary = {
  activeListings: number;
  escrowTotalCents: number;
  awaitingPlatformApproval: number;
  payoutDueToday: number;
  payoutOverdue: number;
  totalCommission: number;
  pendingReports: number;
};
