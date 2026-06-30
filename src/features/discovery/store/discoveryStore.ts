import { create } from 'zustand';
import type { RegionId } from '@/constants/regions';
import type { DiscoveryPeriod, DiscoveryScope, DiscoveryTab } from '@/features/discovery/types';

type DiscoveryState = {
  tab: DiscoveryTab;
  scope: DiscoveryScope;
  period: DiscoveryPeriod;
  regionId: RegionId;
  userSearchOpen: boolean;
  userSearchQuery: string;
  setTab: (tab: DiscoveryTab) => void;
  setScope: (scope: DiscoveryScope) => void;
  setPeriod: (period: DiscoveryPeriod) => void;
  setRegionId: (regionId: RegionId) => void;
  setUserSearchOpen: (open: boolean) => void;
  setUserSearchQuery: (query: string) => void;
  closeUserSearch: () => void;
};

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  tab: 'posts',
  scope: 'region',
  period: '7d',
  regionId: 'trabzon',
  userSearchOpen: false,
  userSearchQuery: '',
  setTab: (tab) => set({ tab }),
  setScope: (scope) => set({ scope }),
  setPeriod: (period) => set({ period }),
  setRegionId: (regionId) => set({ regionId }),
  setUserSearchOpen: (userSearchOpen) => set({ userSearchOpen }),
  setUserSearchQuery: (userSearchQuery) => set({ userSearchQuery }),
  closeUserSearch: () => set({ userSearchOpen: false, userSearchQuery: '' }),
}));
