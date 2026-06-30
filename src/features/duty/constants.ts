export type DutyListingType = 'pharmacy' | 'veterinary' | 'hospital' | 'fuel';

export type DutyListing = {
  id: string;
  listingType: DutyListingType;
  name: string;
  address: string | null;
  phone: string | null;
  openUntil: string | null;
  isOpen: boolean;
};

export const DUTY_TYPES: Record<DutyListingType, { label: string; icon: string; color: string }> = {
  pharmacy: { label: 'Nöbetçi Eczane', icon: 'medical', color: '#E53935' },
  veterinary: { label: 'Açık Veteriner', icon: 'paw', color: '#8E24AA' },
  hospital: { label: 'Açık Hastane', icon: 'fitness', color: '#1E88E5' },
  fuel: { label: 'Akaryakıt', icon: 'water', color: '#FB8C00' },
};

export const DUTY_TABS = [
  { id: 'pharmacy', label: 'Eczane', icon: 'medical-outline' },
  { id: 'veterinary', label: 'Veteriner', icon: 'paw-outline' },
  { id: 'hospital', label: 'Hastane', icon: 'fitness-outline' },
  { id: 'fuel', label: 'Akaryakıt', icon: 'water-outline' },
];
