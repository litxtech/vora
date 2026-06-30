export type CommerceModule = 'hotel' | 'marketplace' | 'rides' | 'personnel';

export type CommerceOpsTab = 'overview' | CommerceModule | 'finance';

export type CommerceQueueFilter = 'all' | 'pending' | 'escrow' | 'payout_due' | 'completed';

export type CommerceOpsSummary = {
  hotelPendingPayment: number;
  hotelConfirmed: number;
  hotelPayoutDue: number;
  hotelPayoutOverdue: number;
  hotelRevenue24hCents: number;
  hotelCommission24hCents: number;
  marketplaceEscrowCents: number;
  marketplaceApprovalPending: number;
  marketplacePayoutOverdue: number;
  ridesPendingReservations: number;
  ridesEscrowCents: number;
  ridesPayoutDue: number;
  personnelApplicationsPending: number;
  personnelStaffListings: number;
  personnelJobListings: number;
  transactions24h: number;
  totalEscrowCents: number;
};

export type CommerceTransactionRow = {
  id: string;
  module: Exclude<CommerceModule, 'personnel'>;
  referenceCode: string;
  title: string;
  fromPartyId: string;
  fromPartyName: string;
  toPartyId: string;
  toPartyName: string;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  status: string;
  paymentStatus: string | null;
  regionId: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
};

export type AdminHotelReservationRow = {
  id: string;
  reservationCode: string;
  hotelId: string;
  hotelName: string;
  guestId: string;
  guestName: string;
  ownerId: string;
  ownerName: string;
  regionId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  grossAmountCents: number;
  commissionCents: number;
  ownerPayoutCents: number;
  status: string;
  paymentStatus: string;
  paidAt: string | null;
  completedAt: string | null;
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
  createdAt: string;
};
