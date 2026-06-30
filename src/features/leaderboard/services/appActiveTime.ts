import { supabase } from '@/lib/supabase/client';

/**
 * Uygulamada geçirilen aktif dakikayı sunucuda artırır (liderlik "Ekran Süresi"
 * metriği için). Sunucu tarafı dakika kovasına göre idempotenttir.
 */
export async function trackAppActiveMinute(): Promise<void> {
  const { error } = await supabase.rpc('track_app_active_minute');
  if (error) {
    console.warn('[leaderboard] active minute track failed:', error.message);
  }
}
