import { useEffect, useState } from 'react';
import { ProfileShopButton } from '@/features/business-center/components/ProfileShopButton';
import { fetchBusinessAccountById, fetchBusinessShopSnapshot } from '@/features/business-center/services/businessShopData';
import { fetchProfileVisibleShopBusinessId } from '@/features/business-center/services/profileShopVisibility';
import type { ActingMode } from '@/features/account-switch/types';

type Props = {
  profileUserId: string;
  accountType: 'personal' | 'business';
  isOwnProfile: boolean;
  actingAs: ActingMode;
  /** Ziyaretçi profilinde aksiyon satırında göster (Instagram mağaza butonu). */
  variant?: 'section' | 'action';
};

type ShopMeta = {
  businessId: string;
  businessName: string;
  shopTagline: string | null;
  shopAccent: string | null;
  productCount: number;
  hotelCount: number;
};

export function ProfileShopSection({
  profileUserId,
  accountType,
  isOwnProfile,
  actingAs,
  variant = 'section',
}: Props) {
  const [shop, setShop] = useState<ShopMeta | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchProfileVisibleShopBusinessId(profileUserId).then(async (id) => {
      if (cancelled) return;
      if (!id) {
        setShop(null);
        return;
      }
      if (accountType === 'business' && isOwnProfile && actingAs === 'personal') {
        setShop(null);
        return;
      }

      const business = await fetchBusinessAccountById(id);
      if (cancelled || !business) {
        setShop(null);
        return;
      }

      const snapshot = await fetchBusinessShopSnapshot(id);
      setShop({
        businessId: id,
        businessName: business.name,
        shopTagline: business.shopTagline,
        shopAccent: business.shopAccent,
        productCount: snapshot?.products.length ?? 0,
        hotelCount: snapshot?.hotels.length ?? 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [profileUserId, accountType, isOwnProfile, actingAs]);

  if (!shop) return null;

  return (
    <ProfileShopButton
      businessId={shop.businessId}
      businessName={shop.businessName}
      shopTagline={shop.shopTagline}
      shopAccent={shop.shopAccent}
      productCount={shop.productCount}
      hotelCount={shop.hotelCount}
      isOwnProfile={variant === 'section' && isOwnProfile && actingAs === 'business'}
    />
  );
}
