/** Hikâyeye müzik ekleyen kullanıcı */
export type StoryMusicAddedBy = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
};
