import { create } from 'zustand';

export type StoryPublishDraft = {
  mediaUri: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
};

type StoryPublishState = {
  draft: StoryPublishDraft | null;
  setDraft: (draft: StoryPublishDraft) => void;
  clearDraft: () => void;
};

/** file:// URI'leri route paramlarında bozulmaması için geçici taslak. */
export const useStoryPublishStore = create<StoryPublishState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
