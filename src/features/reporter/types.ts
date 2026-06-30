export type ReporterApplicationStatus = 'pending' | 'approved' | 'rejected';

export type ReporterApplication = {
  id: string;
  userId: string;
  motivation: string;
  experience: string | null;
  sampleLinks: string[];
  regionId: string | null;
  status: ReporterApplicationStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type NewsVerificationResult = 'correct' | 'incorrect' | 'unverified';

export type ReporterLevelProgress = {
  level: number;
  correctVerifications: number;
  trustScore: number;
  isReporter: boolean;
  maxLevel: boolean;
  nextLevel: number | null;
  nextLevelCorrect: number | null;
  nextLevelTrust: number | null;
};
