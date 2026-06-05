export type JobListing = {
  id: string;
  title: string;
  description: string;
  jobType: string;
  salaryRange: string | null;
  housingProvided: boolean;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  businessName: string | null;
  createdAt: string;
};

export type JobApplicationInput = {
  jobId: string;
  applicantId: string;
  message: string;
};
