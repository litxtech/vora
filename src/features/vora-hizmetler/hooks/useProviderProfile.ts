import { useCallback, useEffect, useState } from 'react';
import {
  fetchProviderById,
  fetchProviderByUserId,
  fetchProviderCertificates,
} from '@/features/vora-hizmetler/services/providerData';
import { fetchPublicProviderWorks } from '@/features/vora-hizmetler/services/providerWorkData';
import { fetchProviderReviews } from '@/features/vora-hizmetler/services/reviewData';
import type {
  ProviderCertificate,
  ProviderPublicWork,
  ServiceProviderProfile,
  ServiceReviewListing,
} from '@/features/vora-hizmetler/types';

export function useProviderProfile(providerId: string | null, viewerId?: string | null) {
  const [provider, setProvider] = useState<ServiceProviderProfile | null>(null);
  const [publicWorks, setPublicWorks] = useState<ProviderPublicWork[]>([]);
  const [certificates, setCertificates] = useState<ProviderCertificate[]>([]);
  const [reviews, setReviews] = useState<ServiceReviewListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadProfile = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    setError(null);

    const [profileRes, worksRes, certRes, reviewRes] = await Promise.all([
      fetchProviderById(providerId, viewerId),
      fetchPublicProviderWorks(providerId, 30),
      fetchProviderCertificates(providerId),
      fetchProviderReviews(providerId, 5),
    ]);

    setProvider(profileRes.provider);
    setPublicWorks(worksRes.items);
    setCertificates(certRes.items);
    setReviews(reviewRes.reviews);
    if (profileRes.error) setError(profileRes.error);
    setLoading(false);
  }, [providerId, viewerId]);

  useEffect(() => {
    void reloadProfile();
  }, [reloadProfile]);

  return { provider, publicWorks, certificates, reviews, loading, error, reloadProfile };
}

export function useMyProviderProfile(userId: string | null) {
  const [provider, setProvider] = useState<ServiceProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadProfile = useCallback(async () => {
    if (!userId) {
      setProvider(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchProviderByUserId(userId);
    setProvider(result.provider);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reloadProfile();
  }, [reloadProfile]);

  return { provider, loading, reloadProfile };
}
