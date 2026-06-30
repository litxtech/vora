export type JobType = 'full_time' | 'part_time' | 'seasonal' | 'remote' | 'daily' | 'weekly';

export type SalaryType = 'net' | 'range' | 'negotiable';

export type ListingType = 'job' | 'staff';

export type JobApplicationStatus = 'sent' | 'reviewing' | 'interview' | 'accepted' | 'rejected';

export type MilitaryStatus = 'completed' | 'exempt' | 'postponed' | 'not_applicable';

export type PersonnelHub = 'seek' | 'hire' | 'applications';

export type PersonnelSeekFilter = 'all' | 'urgent' | 'nearby' | 'recent' | 'favorites';

export type PersonnelApplicationsView = 'incoming' | 'mine';

export type PersonnelTab =
  | 'live'
  | 'seeking'
  | 'hiring'
  | 'urgent'
  | 'recent'
  | 'nearby'
  | 'applications'
  | 'incoming'
  | 'favorites'
  | 'saved_searches';

export type ListingApplicationStats = {
  total: number;
  pending: number;
  accepted: number;
};

export type JobApplicationFormData = {
  firstName: string;
  lastName: string;
  age: string;
  email: string;
  phone: string;
  resume: string;
};

export type PersonnelListing = {
  id: string;
  type: ListingType;
  ownerId: string;
  title: string;
  description: string;
  jobType: JobType;
  salaryRange: string | null;
  housingProvided: boolean;
  mealProvided: boolean;
  district: string | null;
  locationLabel: string | null;
  businessName: string | null;
  phone: string | null;
  isUrgent: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  distanceKm?: number;
  applicationStats?: ListingApplicationStats;
};

export type JobSeekerListing = {
  id: string;
  userId: string;
  displayName: string | null;
  title: string;
  occupation: string;
  experienceYears: number;
  skills: string[];
  isReady: boolean;
  phoneVisible: boolean;
  district: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  distanceKm?: number;
};

export type ApplicantProfileSnapshot = JobApplicationFormData & {
  title: string | null;
  occupation: string | null;
  experienceYears: number | null;
  skills: string[];
  education: string | null;
  intro: string | null;
  isReady: boolean;
  salaryExpectation: string | null;
};

export type JobApplication = {
  id: string;
  status: JobApplicationStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  listingType: ListingType;
  listingId: string;
  listingTitle: string;
  employerId: string;
  employerName: string | null;
  conversationId: string | null;
};

export type EmployerApplication = JobApplication & {
  applicantProfileSnapshot: ApplicantProfileSnapshot | null;
  applicantId: string;
  applicantName: string | null;
  applicantAvatar: string | null;
  applicantOccupation: string | null;
  applicantExperienceYears: number | null;
  applicantTrustScore: number | null;
  applicantSkills: string[];
  applicantIsReady: boolean;
};

export type CreateJobInput = {
  authorId: string;
  businessId: string | null;
  employerDisplayName?: string | null;
  regionId: string;
  title: string;
  description: string;
  jobType: JobType;
  salaryRange: string | null;
  salaryType: SalaryType;
  district: string | null;
  housingProvided: boolean;
  mealProvided: boolean;
  experienceRequired: string | null;
  startDate: string | null;
  isUrgent: boolean;
  latitude?: number;
  longitude?: number;
  workplaceMediaUrls?: string[];
};

export type JobListingDetail = {
  id: string;
  authorId: string;
  title: string;
  description: string;
  jobType: JobType;
  salaryRange: string | null;
  salaryType: SalaryType;
  district: string | null;
  locationLabel: string | null;
  housingProvided: boolean;
  mealProvided: boolean;
  experienceRequired: string | null;
  isUrgent: boolean;
  status: string;
  employerDisplayName: string | null;
  businessName: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  regionId: string;
  createdAt: string;
  viewCount: number;
  workplaceMediaUrls: string[];
};

export type UpdateJobInput = {
  employerDisplayName?: string | null;
  title?: string;
  description?: string;
  jobType?: JobType;
  salaryRange?: string | null;
  salaryType?: SalaryType;
  district?: string | null;
  housingProvided?: boolean;
  mealProvided?: boolean;
  experienceRequired?: string | null;
  isUrgent?: boolean;
  workplaceMediaUrls?: string[];
};

export type CreateStaffInput = {
  authorId: string;
  businessId: string | null;
  regionId: string;
  title: string;
  description: string;
  positions: string[];
  positionsCount: number | null;
  jobType: JobType;
  salaryRange: string | null;
  district: string | null;
  housingProvided: boolean;
  mealProvided: boolean;
  isUrgent: boolean;
  neededBy: string | null;
  latitude?: number;
  longitude?: number;
};

export type UpdateStaffInput = {
  title?: string;
  description?: string;
  positions?: string[];
  positionsCount?: number | null;
  jobType?: JobType;
  salaryRange?: string | null;
  district?: string | null;
  housingProvided?: boolean;
  mealProvided?: boolean;
  isUrgent?: boolean;
  neededBy?: string | null;
};

export type StaffListingDetail = {
  id: string;
  authorId: string;
  title: string;
  description: string;
  positions: string[];
  positionsCount: number | null;
  jobType: JobType;
  salaryRange: string | null;
  district: string | null;
  locationLabel: string | null;
  housingProvided: boolean;
  mealProvided: boolean;
  isUrgent: boolean;
  neededBy: string | null;
  status: string;
  businessName: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  regionId: string;
  createdAt: string;
};

export type ListingFilters = {
  regionId?: string | null;
  district?: string | null;
  jobType?: JobType | null;
  housingProvided?: boolean | null;
  urgentOnly?: boolean;
  center?: { latitude: number; longitude: number };
  radiusKm?: number;
};
