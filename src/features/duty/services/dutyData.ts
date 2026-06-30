import { demoArrayFallback } from '@/lib/demo/demoData';
import { supabase } from '@/lib/supabase/client';
import type { DutyListing, DutyListingType } from '@/features/duty/constants';

export async function fetchDutyListings(
  regionId: string | null,
  type: DutyListingType,
): Promise<DutyListing[]> {
  if (!regionId) return demoArrayFallback(DEMO_DUTY).filter((d) => d.listingType === type);

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('on_duty_listings')
    .select('id, listing_type, name, address, phone, open_until, is_open')
    .eq('region_id', regionId)
    .eq('listing_type', type)
    .eq('duty_date', today)
    .order('name');

  if (error || !data?.length) return demoArrayFallback(DEMO_DUTY).filter((d) => d.listingType === type);

  return data.map((row) => ({
    id: row.id,
    listingType: row.listing_type as DutyListingType,
    name: row.name,
    address: row.address,
    phone: row.phone,
    openUntil: row.open_until,
    isOpen: row.is_open,
  }));
}

const DEMO_DUTY: DutyListing[] = [
  { id: 'd1', listingType: 'pharmacy', name: 'Merkez Eczanesi', address: 'Ortahisar, Trabzon', phone: '0462 123 4567', openUntil: '08:00', isOpen: true },
  { id: 'd2', listingType: 'veterinary', name: 'Karadeniz Veteriner', address: 'Akçaabat', phone: '0462 987 6543', openUntil: '24:00', isOpen: true },
  { id: 'd3', listingType: 'hospital', name: 'Kanuni Eğitim Hastanesi', address: 'Ortahisar', phone: '0462 325 2525', openUntil: '24:00', isOpen: true },
  { id: 'd4', listingType: 'fuel', name: 'BP Akçaabat', address: 'D010 Karayolu', phone: null, openUntil: '24:00', isOpen: true },
];
