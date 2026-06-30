import type { GenderId } from '@/constants/registration';

export type RideVehicleType = 'car' | 'minibus' | 'van';

export type RideVehicleVerificationStatus = 'pending' | 'approved' | 'rejected';

export type RideTripType = 'one_way' | 'round_trip' | 'recurring' | 'event_route';

export type RideTripStatus = 'draft' | 'published' | 'full' | 'in_progress' | 'completed' | 'cancelled';

export type RideLuggageSize = 'none' | 'small' | 'medium' | 'large';

export type RideMusicPreference = 'any' | 'quiet' | 'driver_choice' | 'passenger_choice';

export type RideReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type RidePaymentStatus =
  | 'pending'
  | 'card_saved'
  | 'charge_pending'
  | 'held'
  | 'released'
  | 'refund_pending'
  | 'refunded'
  | 'failed';

export type RideReviewRole = 'driver_to_passenger' | 'passenger_to_driver';

export type RideTab = 'discover' | 'ongoing' | 'today' | 'week' | 'routes' | 'favorites' | 'mine';

export type RideSort = 'departure' | 'contribution_asc' | 'contribution_desc' | 'seats';

export type RideTripStop = {
  id?: string;
  cityId: string;
  stopOrder: number;
  latitude?: number | null;
  longitude?: number | null;
};

export type RideVehicle = {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string;
  color: string | null;
  vehicleType: RideVehicleType;
  seatsTotal: number;
  photoUrls: string[];
  coverUrl: string | null;
  verificationStatus: RideVehicleVerificationStatus;
  isActive: boolean;
  createdAt: string;
};

export type RideTrip = {
  id: string;
  driverId: string;
  vehicleId: string | null;
  regionId: string;
  fromCityId: string;
  toCityId: string;
  fromLat: number | null;
  fromLng: number | null;
  toLat: number | null;
  toLng: number | null;
  meetingPoint: string | null;
  dropoffPoint: string | null;
  tripType: RideTripType;
  contributionCents: number;
  currency: string;
  seatsTotal: number;
  availableSeats: number;
  departureDate: string;
  departureTime: string;
  estimatedDurationMinutes: number | null;
  description: string | null;
  luggage: RideLuggageSize;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  womenOnly: boolean;
  musicPreference: RideMusicPreference;
  status: RideTripStatus;
  cancellationReason: string | null;
  viewCount: number;
  favoriteCount: number;
  publishedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stops?: RideTripStop[];
  driverName?: string | null;
  driverUsername?: string | null;
  driverAvatarUrl?: string | null;
  driverVerified?: boolean;
  driverRating?: number | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehiclePhotoUrl?: string | null;
  isFavorite?: boolean;
  conversationId?: string | null;
};

export type RideReservation = {
  id: string;
  tripId: string;
  passengerId: string;
  seatCount: number;
  status: RideReservationStatus;
  paymentStatus: RidePaymentStatus;
  amountCents: number;
  commissionCents: number;
  driverPayoutCents: number;
  pickupStopId: string | null;
  passengerNote: string | null;
  passengerFirstName?: string | null;
  passengerLastName?: string | null;
  passengerAge?: number | null;
  passengerGender?: GenderId | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  passengerName?: string | null;
  passengerUsername?: string | null;
  passengerAvatarUrl?: string | null;
  trip?: RideTrip | null;
};

export type RideReview = {
  id: string;
  tripId: string;
  reservationId: string;
  reviewerId: string;
  reviewedUserId: string;
  role: RideReviewRole;
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
};

export type RideLiveLocation = {
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  currentCityId: string | null;
  etaMinutes: number | null;
  updatedAt: string;
};

export type RideFilters = {
  fromCityId?: string | null;
  toCityId?: string | null;
  departureDate?: string | null;
  minSeats?: number;
  womenOnly?: boolean;
  petsAllowed?: boolean;
  noSmoking?: boolean;
  maxContributionCents?: number;
  sort?: RideSort;
};

export type CreateTripInput = {
  vehicleId: string;
  regionId: string;
  fromCityId: string;
  toCityId: string;
  meetingPoint?: string;
  dropoffPoint?: string;
  tripType: RideTripType;
  contributionCents: number;
  seatsTotal: number;
  departureDate: string;
  departureTime: string;
  estimatedDurationMinutes?: number;
  description?: string;
  luggage: RideLuggageSize;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  womenOnly: boolean;
  musicPreference: RideMusicPreference;
  stops: RideTripStop[];
  publish?: boolean;
};

export type UpdateTripDraftInput = Omit<CreateTripInput, 'regionId' | 'publish'>;

export type CreateVehicleInput = {
  brand: string;
  model: string;
  year?: number;
  plate: string;
  color?: string;
  vehicleType: RideVehicleType;
  seatsTotal: number;
  photoUris: string[];
};

export type UpdateVehicleInput = CreateVehicleInput;

export type RideTrustBadges = {
  phoneVerified: boolean;
  emailVerified: boolean;
  identityVerified: boolean;
  licenseVerified: boolean;
  vehicleVerified: boolean;
};

export type AdminRidesSummary = {
  publishedTrips: number;
  inProgress: number;
  pendingReservations: number;
  openComplaints: number;
  totalCommissionCents: number;
  escrowCents?: number;
  payoutDue?: number;
  pendingLicenses?: number;
  pendingVehicles?: number;
};

export type AdminRideTripRow = {
  id: string;
  driverId: string;
  fromCityId: string;
  toCityId: string;
  status: RideTripStatus;
  departureDate: string;
  contributionCents: number;
  availableSeats: number;
  seatsTotal: number;
  createdAt: string;
};
