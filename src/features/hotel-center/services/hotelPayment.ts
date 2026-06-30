import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';
import { edgeFunctionErrorMessage, supabaseErrorMessage } from '@/lib/errors';

export type HotelReservationInput = {
  hotelId: string;
  roomTypeId?: string | null;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  applyStudentDiscount: boolean;
  guestFirstName: string;
  guestLastName: string;
  guestPhone: string;
  guestNote?: string;
};

type CreateReservationResponse = {
  reservation_id?: string;
  reservation_code?: string;
  gross_amount_cents?: number;
};

function formatTry(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺`;
}

export async function createHotelReservation(
  input: HotelReservationInput,
): Promise<{ reservationId: string | null; reservationCode: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_hotel_reservation', {
    p_hotel_id: input.hotelId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guests_count: input.guestsCount,
    p_apply_student_discount: input.applyStudentDiscount,
    p_guest_first_name: input.guestFirstName.trim(),
    p_guest_last_name: input.guestLastName.trim(),
    p_guest_phone: input.guestPhone.trim(),
    p_guest_note: input.guestNote ?? null,
    p_room_type_id: input.roomTypeId ?? null,
  });

  if (error) {
    return { reservationId: null, reservationCode: null, error: supabaseErrorMessage(error) };
  }

  const row = (data ?? {}) as CreateReservationResponse;
  return {
    reservationId: row.reservation_id ?? null,
    reservationCode: row.reservation_code ?? null,
    error: row.reservation_id ? null : 'Rezervasyon oluşturulamadı.',
  };
}

export function formatReservationTotal(cents: number): string {
  return formatTry(cents);
}

function hotelCheckoutReturnUrl(hotelId: string, result: 'success' | 'cancelled'): string {
  return Linking.createURL(`detail/hotels/${hotelId}`, { queryParams: { checkout: result } });
}

export async function startHotelStripeCheckout(
  input: HotelReservationInput,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-hotel-checkout',
    {
      body: {
        hotelId: input.hotelId,
        roomTypeId: input.roomTypeId ?? null,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guestsCount: input.guestsCount,
        applyStudentDiscount: input.applyStudentDiscount,
        guestFirstName: input.guestFirstName.trim(),
        guestLastName: input.guestLastName.trim(),
        guestPhone: input.guestPhone.trim(),
        guestNote: input.guestNote ?? null,
        successUrl: hotelCheckoutReturnUrl(input.hotelId, 'success'),
        cancelUrl: hotelCheckoutReturnUrl(input.hotelId, 'cancelled'),
      },
    },
  );

  if (error) {
    return {
      error: await edgeFunctionErrorMessage(error, data, {
        fallback: 'Ödeme sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
      }),
    };
  }
  if (data?.error) return { error: data.error };
  if (!data?.url) return { error: 'Ödeme sayfası açılamadı.' };

  await WebBrowser.openAuthSessionAsync(data.url, hotelCheckoutReturnUrl(input.hotelId, 'success'));
  return { error: null };
}
