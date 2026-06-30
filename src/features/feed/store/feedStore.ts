import { create } from 'zustand';
import type { FeedCategory } from '@/features/feed/types';
import type { RegionId } from '@/constants/regions';

type FeedStore = {
  regionId: RegionId | null;
  district: string | null;
  category: FeedCategory;
  searchQuery: string;
  newPostsCount: number;
  setRegionId: (id: RegionId | null) => void;
  setDistrict: (district: string | null) => void;
  setCategory: (category: FeedCategory) => void;
  setSearchQuery: (query: string) => void;
  incrementNewPosts: () => void;
  resetNewPosts: () => void;
};

export const useFeedStore = create<FeedStore>((set) => ({
  regionId: null,
  district: null,
  category: 'all',
  searchQuery: '',
  newPostsCount: 0,
  setRegionId: (id) => set({ regionId: id, district: null }),
  setDistrict: (district) => set({ district }),
  setCategory: (category) => set({ category }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  incrementNewPosts: () => set((s) => ({ newPostsCount: s.newPostsCount + 1 })),
  resetNewPosts: () => set({ newPostsCount: 0 }),
}));
