export type TourismCategory = 'place' | 'waterfall' | 'plateau' | 'restaurant' | 'hotel';

export type TourismPlace = {
  id: string;
  category: TourismCategory;
  name: string;
  description: string | null;
  address: string | null;
  rating: number | null;
  isFeatured: boolean;
};

export const TOURISM_CATEGORIES: Record<TourismCategory, { label: string; icon: string; color: string }> = {
  place: { label: 'Gezilecek Yer', icon: 'location', color: '#00897B' },
  waterfall: { label: 'Şelale', icon: 'water', color: '#1E88E5' },
  plateau: { label: 'Yayla', icon: 'leaf', color: '#43A047' },
  restaurant: { label: 'Restoran', icon: 'restaurant', color: '#FB8C00' },
  hotel: { label: 'Otel', icon: 'bed', color: '#9C27B0' },
};

export const TOURISM_TABS = [
  { id: 'all', label: 'Tümü', icon: 'compass-outline' },
  { id: 'waterfall', label: 'Şelaleler', icon: 'water-outline' },
  { id: 'plateau', label: 'Yaylalar', icon: 'leaf-outline' },
  { id: 'restaurant', label: 'Restoranlar', icon: 'restaurant-outline' },
  { id: 'hotel', label: 'Oteller', icon: 'bed-outline' },
];
