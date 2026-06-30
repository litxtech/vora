import type { ListingType, PersonnelListing } from '@/features/personnel-center/types';
import { enrichListingsWithApplicationStats } from '@/features/personnel-center/services/listingApplicationStats';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchFavoriteIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('job_favorites')
    .select('listing_type, listing_id')
    .eq('user_id', userId);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add(`${row.listing_type}:${row.listing_id}`);
  }
  return ids;
}

export async function toggleFavorite(
  userId: string,
  listingType: ListingType,
  listingId: string,
  isFavorite: boolean,
): Promise<{ error: string | null }> {
  if (isFavorite) {
    const { error } = await supabase
      .from('job_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_type', listingType)
      .eq('listing_id', listingId);
    return { error: supabaseErrorMessage(error) };
  }

  const { error } = await supabase.from('job_favorites').insert({
    user_id: userId,
    listing_type: listingType,
    listing_id: listingId,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function fetchFavoriteListings(userId: string): Promise<PersonnelListing[]> {
  const { data: favorites } = await supabase
    .from('job_favorites')
    .select('listing_type, listing_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!favorites?.length) return [];

  const jobIds = favorites.filter((f) => f.listing_type === 'job').map((f) => f.listing_id);
  const staffIds = favorites.filter((f) => f.listing_type === 'staff').map((f) => f.listing_id);

  const [jobsResult, staffResult] = await Promise.all([
    jobIds.length
      ? supabase
          .from('job_listings')
          .select(
            `id, author_id, title, description, job_type, salary_range, housing_provided, meal_provided,
             district, location_label, is_urgent, latitude, longitude, created_at,
             businesses (name, phone)`,
          )
          .in('id', jobIds)
          .eq('status', 'published')
      : Promise.resolve({ data: [] }),
    staffIds.length
      ? supabase
          .from('staff_requests')
          .select(
            `id, author_id, title, description, job_type, salary_range, housing_provided, meal_provided,
             district, location_label, is_urgent, latitude, longitude, created_at,
             businesses (name, phone)`,
          )
          .in('id', staffIds)
          .eq('status', 'published')
      : Promise.resolve({ data: [] }),
  ]);

  const listings: PersonnelListing[] = [];

  for (const row of jobsResult.data ?? []) {
    const b = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    listings.push({
      id: row.id,
      type: 'job',
      ownerId: row.author_id,
      title: row.title,
      description: row.description,
      jobType: row.job_type,
      salaryRange: row.salary_range,
      housingProvided: row.housing_provided,
      mealProvided: row.meal_provided ?? false,
      district: row.district,
      locationLabel: row.location_label,
      businessName: b?.name ?? null,
      phone: b?.phone ?? null,
      isUrgent: row.is_urgent,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
    });
  }

  for (const row of staffResult.data ?? []) {
    const b = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    listings.push({
      id: row.id,
      type: 'staff',
      ownerId: row.author_id,
      title: row.title,
      description: row.description,
      jobType: row.job_type ?? 'full_time',
      salaryRange: row.salary_range,
      housingProvided: row.housing_provided ?? false,
      mealProvided: row.meal_provided ?? false,
      district: row.district,
      locationLabel: row.location_label,
      businessName: b?.name ?? null,
      phone: b?.phone ?? null,
      isUrgent: row.is_urgent,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
    });
  }

  const order = new Map(favorites.map((f, i) => [`${f.listing_type}:${f.listing_id}`, i]));
  listings.sort(
    (a, b) =>
      (order.get(`${a.type}:${a.id}`) ?? 999) - (order.get(`${b.type}:${b.id}`) ?? 999),
  );

  await enrichListingsWithApplicationStats(listings);
  return listings;
}
