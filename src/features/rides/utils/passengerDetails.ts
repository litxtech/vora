import type { GenderId } from '@/constants/registration';
import { GENDER_OPTIONS } from '@/constants/registration';
import type { RideReservation } from '@/features/rides/types';

export type RidePassengerDetails = {
  firstName: string;
  lastName: string;
  age: number;
  gender: GenderId;
};

export function splitRidePassengerName(fullName: string | null | undefined): { first: string; last: string } {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export function ridePassengerDisplayName(reservation: RideReservation): string {
  const guest = [reservation.passengerFirstName, reservation.passengerLastName].filter(Boolean).join(' ').trim();
  if (guest) return guest;
  return reservation.passengerName ?? reservation.passengerUsername ?? 'Yolcu';
}

export function ridePassengerGenderLabel(gender: GenderId | null | undefined): string | null {
  if (!gender) return null;
  return GENDER_OPTIONS.find((option) => option.id === gender)?.label ?? gender;
}

export function ridePassengerMetaLine(reservation: RideReservation): string | null {
  const parts: string[] = [];
  if (reservation.passengerAge) parts.push(`${reservation.passengerAge} yaş`);
  const gender = ridePassengerGenderLabel(reservation.passengerGender);
  if (gender) parts.push(gender);
  return parts.length ? parts.join(' · ') : null;
}

export function validateRidePassengerDetails(
  details: RidePassengerDetails,
  womenOnly: boolean,
): string | null {
  if (!details.firstName.trim()) return 'Yolcu adı gerekli';
  if (!details.lastName.trim()) return 'Yolcu soyadı gerekli';
  if (!Number.isFinite(details.age) || details.age < 18 || details.age > 99) {
    return 'Geçerli bir yaş girin (18-99)';
  }
  if (!details.gender || details.gender === 'prefer_not_to_say') return 'Cinsiyet seçimi gerekli';
  if (womenOnly && details.gender !== 'female') {
    return 'Bu yolculuk yalnızca kadın yolcular içindir';
  }
  return null;
}
