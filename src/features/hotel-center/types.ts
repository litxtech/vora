import type { RegionId } from '@/constants/regions';

export type HotelListingStatus = 'draft' | 'published' | 'paused';

export type HotelGuestType = 'student' | 'guest' | 'other';

export type HotelFeedTab = 'explore' | 'student_deals' | 'top_rated' | 'nearby' | 'mine';

export type HotelHub = 'browse' | 'manage';

export type HotelReservationStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'refunded';

export type HotelReservation = {
  id: string;
  reservationCode: string;
  hotelId: string;
  hotelName?: string;
  hotelCoverUrl?: string | null;
  guestId: string;
  ownerId: string;
  guestName?: string | null;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestPhone?: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  studentDiscountPct: number;
  grossAmountCents: number;
  commissionCents?: number;
  ownerPayoutCents?: number;
  guestNote?: string | null;
  ownerReceiptSentAt?: string | null;
  completedAt?: string | null;
  payoutDueAt?: string | null;
  payoutCompletedAt?: string | null;
  status: HotelReservationStatus;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
};

export type HotelOwnerEarningRow = {
  reservationId: string;
  reservationCode: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  grossCents: number;
  commissionCents: number;
  ownerPayoutCents: number;
  status: HotelReservationStatus;
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
};

export type HotelOwnerEarningsSummary = {
  reservationCount: number;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  totalPaidCents: number;
  scheduledPayoutCents: number;
  pendingEscrowCents: number;
  rows: HotelOwnerEarningRow[];
};

export type HotelListing = {
  id: string;
  ownerId: string;
  regionId: RegionId;
  district: string | null;
  name: string;
  description: string;
  pricePerNight: number;
  listPricePerNight: number | null;
  studentDiscountPct: number;
  studentDiscountNote: string | null;
  coverUrl: string | null;
  mediaUrls: string[];
  videoUrls: string[];
  totalRooms: number;
  occupiedRooms: number;
  amenities: string[];
  phone: string | null;
  whatsapp: string | null;
  latitude: number | null;
  longitude: number | null;
  status: HotelListingStatus;
  avgRating: number;
  reviewCount: number;
  viewCount: number;
  isFeatured: boolean;
  createdAt: string;
  distanceKm?: number;
  isFavorited?: boolean;
};

export type HotelListingDetail = HotelListing & {
  businessId: string | null;
  businessName: string | null;
  businessLogoUrl: string | null;
  ownerUsername: string | null;
  ownerAvatarUrl: string | null;
  ownerAccountType: 'personal' | 'business' | null;
  myReview: HotelReview | null;
  roomTypes: HotelRoomType[];
};

export type HotelRoomType = {
  id: string;
  hotelId: string;
  name: string;
  description: string | null;
  pricePerNight: number;
  listPricePerNight: number | null;
  totalCount: number;
  occupiedCount: number;
  maxGuests: number;
  mediaUrls: string[];
  sortOrder: number;
  createdAt: string;
};

export type DraftHotelRoomType = {
  clientKey: string;
  id?: string;
  name: string;
  description: string;
  pricePerNight: string;
  listPricePerNight: string;
  showListPrice: boolean;
  totalCount: string;
  occupiedCount: string;
  maxGuests: string;
  photoUris: string[];
};

export type SaveHotelRoomTypeInput = {
  id?: string;
  name: string;
  description?: string;
  pricePerNight: number;
  listPricePerNight: number | null;
  totalCount: number;
  occupiedCount: number;
  maxGuests: number;
  mediaUrls: string[];
  sortOrder: number;
};

export type HotelReview = {
  id: string;
  hotelId: string;
  reviewerId: string;
  guestType: HotelGuestType;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerUsername: string | null;
  reviewerAvatarUrl: string | null;
};

export type CreateHotelInput = {
  name: string;
  description: string;
  district: string;
  pricePerNight: number;
  listPricePerNight: number | null;
  studentDiscountPct: number;
  studentDiscountNote?: string;
  amenities: string[];
  phone?: string;
  whatsapp?: string;
  mediaUrls: string[];
  videoUrls?: string[];
  totalRooms?: number;
  occupiedRooms?: number;
  status: HotelListingStatus;
  latitude?: number;
  longitude?: number;
};

export type UpdateHotelInput = Partial<CreateHotelInput>;

export type HotelCenterStats = {
  activeHotels: number;
  activeDiscounts: number;
  reviews24h: number;
};
