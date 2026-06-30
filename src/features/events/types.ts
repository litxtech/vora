export type EventCategory =
  | 'concert'
  | 'festival'
  | 'sports'
  | 'tournament'
  | 'meeting'
  | 'seminar'
  | 'education'
  | 'wedding_venue'
  | 'business'
  | 'municipality'
  | 'university'
  | 'social_responsibility';

export type EventMapCategory = 'entertainment' | 'sports' | 'education' | 'municipality' | 'business';

export type EventRsvpStatus = 'going' | 'maybe' | 'not_going';

export type EventTab = 'upcoming' | 'nearby' | 'mine' | 'attending' | 'following';

export type EventListing = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  mapCategory: EventMapCategory;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  coverUrl: string | null;
  regionId: string;
  organizerId: string;
  organizerName: string | null;
  organizerAvatar: string | null;
  businessName: string | null;
  maxAttendees: number | null;
  viewCount: number;
  goingCount: number;
  maybeCount: number;
  isFeatured: boolean;
  isSponsored: boolean;
  latitude: number | null;
  longitude: number | null;
  distanceKm?: number;
  myRsvp: EventRsvpStatus | null;
};

export type EventAttendee = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: EventRsvpStatus;
};

export type CreateEventInput = {
  organizerId: string;
  businessId: string | null;
  regionId: string;
  title: string;
  description: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  maxAttendees: number | null;
  coverUrl: string | null;
  ticketType?: 'free' | 'paid';
  ticketPriceCents?: number | null;
  latitude?: number;
  longitude?: number;
  communityId?: string | null;
};

export type UpdateEventInput = Omit<CreateEventInput, 'communityId'> & {
  eventId: string;
};

export type EventEditRecord = {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  maxAttendees: number | null;
  coverUrl: string | null;
  ticketType: 'free' | 'paid';
  ticketPriceCents: number | null;
  businessId: string | null;
  regionId: string;
};

export type EventStats = {
  viewCount: number;
  mapViewCount: number;
  goingCount: number;
  maybeCount: number;
  notGoingCount: number;
  checkinCount: number;
};
