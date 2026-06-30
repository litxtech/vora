import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  APPLICATION_STATUS_LABELS,
  EMPLOYER_STATUS_ACTIONS,
} from '@/features/personnel-center/constants';
import { respondToApplication } from '@/features/personnel-center/services/applicationData';
import {
  shouldOfferContactAfterStatus,
  showEmployerContactOptions,
} from '@/features/personnel-center/services/employerContact';
import type { EmployerApplication, JobApplicationStatus } from '@/features/personnel-center/types';

export function useEmployerApplicationActions(
  application: EmployerApplication | null,
  employerId: string | undefined,
  options?: { onUpdated?: () => void },
) {
  const [loadingStatus, setLoadingStatus] = useState<JobApplicationStatus | null>(null);

  const updateStatus = useCallback(
    (status: JobApplicationStatus, displayName: string) => {
      if (!employerId || !application) return;

      const action = EMPLOYER_STATUS_ACTIONS.find((a) => a.status === status);
      Alert.alert(
        action?.label ?? 'Durum güncelle',
        `${displayName} için durumu "${APPLICATION_STATUS_LABELS[status]}" yapmak istiyor musunuz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Onayla',
            onPress: async () => {
              setLoadingStatus(status);
              const result = await respondToApplication(application.id, employerId, status);
              setLoadingStatus(null);
              if (result.error) {
                Alert.alert('Hata', result.error);
                return;
              }
              options?.onUpdated?.();
              if (shouldOfferContactAfterStatus(status)) {
                showEmployerContactOptions({ ...application, status }, status);
              }
            },
          },
        ],
      );
    },
    [application, employerId, options],
  );

  return { loadingStatus, updateStatus };
}
