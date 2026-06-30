import type { SessionEndReason } from '@/features/auth/services/sessionPolicy';

export type AccountAccessScenario = 'frozen' | 'deleted' | 'deletion_pending' | 'banned';

export type AccountAccessReviewPayload = {
  scenario: AccountAccessScenario;
  createdAt: string;
  frozenAt: string | null;
  deletionRequestedAt: string | null;
  deletedAt: string | null;
  permanentDeletionAt: string | null;
  remainingMs: number | null;
  daysSinceDeletion: number | null;
  /** Silme iptali için oturum açık kalır */
  keepSession: boolean;
};

export type PostLoginAccessResult =
  | {
      action: 'continue';
      destination: '/(tabs)' | '/(onboarding)/profile-setup';
    }
  | {
      action: 'review';
      payload: AccountAccessReviewPayload;
      signOutReason?: SessionEndReason;
    };
