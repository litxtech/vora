export type DeletedBy = 'self' | 'platform';

export type DeletedAccountInfo = {
  accountStatus: 'active' | 'frozen' | 'deletion_pending' | 'deleted';
  deletedAt: string | null;
  deletedBy: DeletedBy | null;
  deletionRequestedAt: string | null;
};
