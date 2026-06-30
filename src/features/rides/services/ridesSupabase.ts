import { supabase } from '@/lib/supabase/client';

/** Ride tabloları henüz generated database types'a eklenmedi */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ridesDb = supabase as any;

export const ridesSupabase = {
  from(table: string) {
    return ridesDb.from(table);
  },
  rpc(fn: string, args?: Record<string, unknown>) {
    return ridesDb.rpc(fn, args);
  },
};
