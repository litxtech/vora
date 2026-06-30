import type { RideReservation } from '@/features/rides/types';

export function isPendingDriverApproval(reservation: RideReservation): boolean {
  return (
    reservation.status === 'pending' &&
    (reservation.paymentStatus === 'held' || reservation.paymentStatus === 'card_saved')
  );
}

export function filterPendingDriverReservations(reservations: RideReservation[]): RideReservation[] {
  return reservations.filter(isPendingDriverApproval);
}
