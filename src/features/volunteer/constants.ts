export type VolunteerCategory = 'search_rescue' | 'veterinary' | 'blood_donation' | 'relief';

export type VolunteerTeam = {
  id: string;
  category: VolunteerCategory;
  name: string;
  description: string | null;
  memberCount: number;
  isActive: boolean;
};

export const VOLUNTEER_CATEGORIES: Record<VolunteerCategory, { label: string; icon: string; color: string }> = {
  search_rescue: { label: 'Arama Kurtarma', icon: 'search', color: '#E53935' },
  veterinary: { label: 'Veteriner Desteği', icon: 'paw', color: '#8E24AA' },
  blood_donation: { label: 'Kan Bağışı', icon: 'water', color: '#C62828' },
  relief: { label: 'Yardım Ekipleri', icon: 'people', color: '#26A69A' },
};

export const VOLUNTEER_TABS = [
  { id: 'all', label: 'Tümü', icon: 'people-outline' },
  { id: 'search_rescue', label: 'Arama Kurtarma', icon: 'search-outline' },
  { id: 'veterinary', label: 'Veteriner', icon: 'paw-outline' },
  { id: 'blood_donation', label: 'Kan Bağışı', icon: 'water-outline' },
  { id: 'relief', label: 'Yardım', icon: 'heart-outline' },
];
