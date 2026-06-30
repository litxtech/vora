import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { expressJobInterest, showApplicationSuccessAlert } from '@/features/jobs/services/jobData';
import type { JobApplicationFormData, ListingType } from '@/features/personnel-center/types';

type ApplyTarget = {
  listingType: ListingType;
  listingId: string;
  listingTitle: string;
};

export function usePersonnelApply(
  userId: string | null | undefined,
  options?: { onSubmitted?: () => void },
) {
  const [target, setTarget] = useState<ApplyTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openApplySheet = useCallback((listingType: ListingType, listingId: string, listingTitle: string) => {
    setTarget({ listingType, listingId, listingTitle });
  }, []);

  const closeApplySheet = useCallback(() => {
    if (!submitting) setTarget(null);
  }, [submitting]);

  const submitApplication = useCallback(
    async (form: JobApplicationFormData, attachProfile: boolean) => {
      if (!userId || !target) return;

      setSubmitting(true);
      const result = await expressJobInterest(target.listingId, userId, target.listingType, form, {
        attachProfile,
      });
      setSubmitting(false);

      if (result.error) {
        Alert.alert('Hata', result.error);
        return;
      }

      setTarget(null);
      options?.onSubmitted?.();
      showApplicationSuccessAlert(result.conversationId);
    },
    [options, target, userId],
  );

  return {
    applyTarget: target,
    openApplySheet,
    closeApplySheet,
    submitApplication,
    submitting,
  };
}
