import { hasApprovedLicense } from '@/features/rides/services/licenseData';
import { fetchVehicle, isVehicleApprovedForPublish } from '@/features/rides/services/vehicleData';
import type { RideVehicleVerificationStatus } from '@/features/rides/types';

export type RidePublishReadiness = {
  licenseApproved: boolean;
  vehicleApproved: boolean;
  vehicleStatus: RideVehicleVerificationStatus | null;
  vehicleLabel: string | null;
};

export async function fetchRidePublishReadiness(
  userId: string,
  vehicleId: string | null,
): Promise<RidePublishReadiness> {
  const [licenseApproved, vehicle] = await Promise.all([
    hasApprovedLicense(userId),
    vehicleId ? fetchVehicle(vehicleId) : Promise.resolve(null),
  ]);

  return {
    licenseApproved,
    vehicleApproved: isVehicleApprovedForPublish(vehicle),
    vehicleStatus: vehicle?.verificationStatus ?? null,
    vehicleLabel: vehicle ? `${vehicle.brand} ${vehicle.model}` : null,
  };
}

export function describeRidePublishBlockers(readiness: RidePublishReadiness): string[] {
  const blockers: string[] = [];
  if (!readiness.licenseApproved) {
    blockers.push('Ehliyetiniz henüz doğrulanmadı.');
  }
  if (!readiness.vehicleApproved) {
    if (readiness.vehicleStatus === 'pending') {
      blockers.push(
        readiness.vehicleLabel
          ? `${readiness.vehicleLabel} aracınız admin onayı bekliyor.`
          : 'Aracınız admin onayı bekliyor.',
      );
    } else if (readiness.vehicleStatus === 'rejected') {
      blockers.push('Aracınız reddedildi. Araç bilgilerinizi güncelleyip tekrar gönderin.');
    } else {
      blockers.push('Yayınlamak için onaylı bir araç seçmelisiniz.');
    }
  }
  return blockers;
}
