export type NewsVerificationStatus = 'verified' | 'misinfo' | 'reviewing' | 'none';

export type NewsVerificationVote = 'correct' | 'incorrect' | 'unverified';

export type NewsVerificationSummary = {
  status: NewsVerificationStatus;
  correctCount: number;
  incorrectCount: number;
  unverifiedCount: number;
  verifiedVotes: number;
  misinfoVotes: number;
  reviewingVotes: number;
  latestNote: string | null;
  latestReporter: string | null;
};

export type NewsVerificationNote = {
  id: string;
  reporterId: string;
  result: NewsVerificationVote;
  note: string;
  createdAt: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
};

export type NewsVerificationTarget =
  | { type: 'post'; id: string; regionId: string }
  | { type: 'reel'; id: string; regionId: string };
