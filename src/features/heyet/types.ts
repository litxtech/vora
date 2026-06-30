export type HeyetSubjectType =
  | 'ride_reservation'
  | 'marketplace_order'
  | 'hotel_reservation'
  | 'vora_service_request'
  | 'general';

export type HeyetStatus = 'open' | 'closed';

export type HeyetCase = {
  id: string;
  conversationId: string;
  subjectType: HeyetSubjectType;
  subjectId: string | null;
  partyAId: string;
  partyBId: string;
  openedBy: string;
  status: HeyetStatus;
  decisionText: string | null;
  decisionBy: string | null;
  decisionAt: string | null;
  closedAt: string | null;
  createdAt: string;
  customTitle: string | null;
};

export type HeyetCaseListItem = HeyetCase & {
  partyAUsername: string | null;
  partyBUsername: string | null;
};
