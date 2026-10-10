export type PurchaseSource = 'premium' | 'platform_support' | 'shop_boost';

export type PurchaseUsage = 'using' | 'used' | 'unused';

export type DisputeStatus = 'open' | 'reviewing' | 'accepted' | 'rejected';

export type PurchaseDispute = {
  id: string;
  status: DisputeStatus;
  reason: string;
  createdAt: string;
};

export type PackagePurchase = {
  id: string;
  source: PurchaseSource;
  sourceId: string;
  title: string;
  detail: string | null;
  purchasedAt: string;
  usage: PurchaseUsage;
  hadProblem: boolean;
  dispute: PurchaseDispute | null;
};
