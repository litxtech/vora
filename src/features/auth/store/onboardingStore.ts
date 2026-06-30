import { create } from 'zustand';
import type { InterestId, NotificationPrefId } from '@/constants/auth';

type OnboardingState = {
  avatarUri: string | null;
  regionId: string | null;
  district: string | null;
  bio: string;
  occupation: string;
  interests: InterestId[];
  notificationPrefs: Partial<Record<NotificationPrefId, boolean>>;
  setAvatarUri: (uri: string | null) => void;
  setRegionId: (id: string) => void;
  setDistrict: (district: string) => void;
  setBio: (bio: string) => void;
  setOccupation: (occupation: string) => void;
  toggleInterest: (id: InterestId) => void;
  toggleNotification: (id: NotificationPrefId) => void;
  reset: () => void;
};

const initialState = {
  avatarUri: null as string | null,
  regionId: null as string | null,
  district: null as string | null,
  bio: '',
  occupation: '',
  interests: [] as InterestId[],
  notificationPrefs: {
    likes: true,
    comments: true,
    follows: true,
    friend_requests: true,
    messages: true,
    mentions: true,
    feed: true,
    channels: true,
    businesses: true,
    nearby_events: true,
    emergency: true,
    jobs: false,
    marketplace: true,
    rides: false,
    vora_needs: true,
    vora_hizmetler: true,
    hotels: true,
    system: true,
  } as Partial<Record<NotificationPrefId, boolean>>,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setAvatarUri: (uri) => set({ avatarUri: uri }),
  setRegionId: (id) => set({ regionId: id, district: null }),
  setDistrict: (district) => set({ district }),
  setBio: (bio) => set({ bio }),
  setOccupation: (occupation) => set({ occupation }),
  toggleInterest: (id) =>
    set((state) => ({
      interests: state.interests.includes(id)
        ? state.interests.filter((item) => item !== id)
        : [...state.interests, id],
    })),
  toggleNotification: (id) =>
    set((state) => ({
      notificationPrefs: {
        ...state.notificationPrefs,
        [id]: !state.notificationPrefs[id],
      },
    })),
  reset: () => set(initialState),
}));
