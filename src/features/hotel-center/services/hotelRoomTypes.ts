import {
  deriveHotelListingFromRoomTypes,
  hotelListPriceDisplay,
} from '@/features/hotel-center/constants';
import type {
  DraftHotelRoomType,
  HotelRoomType,
  SaveHotelRoomTypeInput,
} from '@/features/hotel-center/types';
import { uploadHotelImages } from '@/features/hotel-center/services/hotelMediaUpload';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type RoomTypeRow = {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  price_per_night: number;
  list_price_per_night: number | null;
  total_count: number;
  occupied_count: number;
  max_guests: number;
  media_urls: string[];
  sort_order: number;
  created_at: string;
};

function mapRow(row: RoomTypeRow): HotelRoomType {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    name: row.name,
    description: row.description,
    pricePerNight: row.price_per_night,
    listPricePerNight: row.list_price_per_night,
    totalCount: row.total_count,
    occupiedCount: row.occupied_count,
    maxGuests: row.max_guests,
    mediaUrls: row.media_urls ?? [],
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function createEmptyDraftRoomType(presetName?: string): DraftHotelRoomType {
  return {
    clientKey: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: presetName ?? '',
    description: '',
    pricePerNight: '',
    listPricePerNight: '',
    showListPrice: false,
    totalCount: '1',
    occupiedCount: '0',
    maxGuests: '2',
    photoUris: [],
  };
}

export function draftRoomTypeToSaveInput(
  draft: DraftHotelRoomType,
  sortOrder: number,
  mediaUrls: string[],
): SaveHotelRoomTypeInput {
  const pricePerNight = parseInt(draft.pricePerNight.replace(/\D/g, ''), 10) || 0;
  const listPriceNum = parseInt(draft.listPricePerNight.replace(/\D/g, ''), 10) || 0;
  const totalCount = Math.max(1, parseInt(draft.totalCount.replace(/\D/g, ''), 10) || 1);
  const occupiedCount = Math.min(
    totalCount,
    Math.max(0, parseInt(draft.occupiedCount.replace(/\D/g, ''), 10) || 0),
  );
  const maxGuests = Math.min(12, Math.max(1, parseInt(draft.maxGuests.replace(/\D/g, ''), 10) || 2));

  return {
    id: draft.id,
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    pricePerNight,
    listPricePerNight: hotelListPriceDisplay(draft.showListPrice ? listPriceNum : null, pricePerNight),
    totalCount,
    occupiedCount,
    maxGuests,
    mediaUrls,
    sortOrder,
  };
}

export function hotelRoomTypeToDraft(room: HotelRoomType): DraftHotelRoomType {
  return {
    clientKey: room.id,
    id: room.id,
    name: room.name,
    description: room.description ?? '',
    pricePerNight: String(room.pricePerNight),
    listPricePerNight: room.listPricePerNight ? String(room.listPricePerNight) : '',
    showListPrice: room.listPricePerNight != null && room.listPricePerNight > room.pricePerNight,
    totalCount: String(room.totalCount),
    occupiedCount: String(room.occupiedCount),
    maxGuests: String(room.maxGuests),
    photoUris: room.mediaUrls,
  };
}

export async function fetchHotelRoomTypes(hotelId: string): Promise<HotelRoomType[]> {
  const { data, error } = await supabase
    .from('hotel_room_types')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as RoomTypeRow[]).map(mapRow);
}

async function uploadDraftRoomPhotos(ownerId: string, photoUris: string[]): Promise<string[]> {
  const localPhotos = photoUris.filter((u) => !u.startsWith('http'));
  const remotePhotos = photoUris.filter((u) => u.startsWith('http'));
  const uploaded = localPhotos.length ? await uploadHotelImages(ownerId, localPhotos) : [];
  return [...remotePhotos, ...uploaded];
}

export async function saveHotelRoomTypes(
  hotelId: string,
  ownerId: string,
  drafts: DraftHotelRoomType[],
): Promise<{ error: string | null }> {
  const existing = await fetchHotelRoomTypes(hotelId);
  const existingIds = new Set(existing.map((r) => r.id));
  const nextIds = new Set(drafts.filter((d) => d.id).map((d) => d.id!));

  const toDelete = [...existingIds].filter((id) => !nextIds.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from('hotel_room_types').delete().in('id', toDelete);
    if (error) return { error: supabaseErrorMessage(error) };
  }

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    const mediaUrls = await uploadDraftRoomPhotos(ownerId, draft.photoUris);
    const input = draftRoomTypeToSaveInput(draft, index, mediaUrls.slice(0, 3));

    if (draft.id && existingIds.has(draft.id)) {
      const { error } = await supabase
        .from('hotel_room_types')
        .update({
          name: input.name,
          description: input.description ?? null,
          price_per_night: input.pricePerNight,
          list_price_per_night: input.listPricePerNight,
          total_count: input.totalCount,
          occupied_count: input.occupiedCount,
          max_guests: input.maxGuests,
          media_urls: input.mediaUrls,
          sort_order: input.sortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft.id)
        .eq('hotel_id', hotelId);

      if (error) return { error: supabaseErrorMessage(error) };
    } else {
      const { error } = await supabase.from('hotel_room_types').insert({
        hotel_id: hotelId,
        name: input.name,
        description: input.description ?? null,
        price_per_night: input.pricePerNight,
        list_price_per_night: input.listPricePerNight,
        total_count: input.totalCount,
        occupied_count: input.occupiedCount,
        max_guests: input.maxGuests,
        media_urls: input.mediaUrls,
        sort_order: input.sortOrder,
      });

      if (error) return { error: supabaseErrorMessage(error) };
    }
  }

  const saved = await fetchHotelRoomTypes(hotelId);
  const derived = deriveHotelListingFromRoomTypes(saved);
  const { error: syncError } = await supabase
    .from('hotel_listings')
    .update({
      price_per_night: derived.pricePerNight,
      list_price_per_night: derived.listPricePerNight,
      total_rooms: derived.totalRooms,
      occupied_rooms: derived.occupiedRooms,
      updated_at: new Date().toISOString(),
    })
    .eq('id', hotelId)
    .eq('owner_id', ownerId);

  if (syncError) return { error: supabaseErrorMessage(syncError) };
  return { error: null };
}

export function parseDraftRoomTypesForValidation(drafts: DraftHotelRoomType[]) {
  return drafts.map((draft) => {
    const input = draftRoomTypeToSaveInput(draft, 0, draft.photoUris);
    return {
      name: input.name,
      pricePerNight: input.pricePerNight,
      totalCount: input.totalCount,
      occupiedCount: input.occupiedCount,
      maxGuests: input.maxGuests,
    };
  });
}
