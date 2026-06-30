import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { IZDIVAC_SPECIAL_BADGES } from '@/features/izdivac/constants';
import type { IzdivacSpecialBadgeType } from '@/features/izdivac/types';

export type IzdivacBadgeNoteOverride = {
  label: string | null;
  note: string;
};

export type IzdivacBadgeNoteMap = Partial<Record<IzdivacSpecialBadgeType, IzdivacBadgeNoteOverride>>;

const VALID: IzdivacSpecialBadgeType[] = ['jigolo', 'tilki', 'finansman'];

let cache: IzdivacBadgeNoteMap | null = null;
let inflight: Promise<IzdivacBadgeNoteMap> | null = null;

/** Admin tarafından override edilmiş notları getirir (in-memory cache). */
export async function fetchIzdivacBadgeNotes(force = false): Promise<IzdivacBadgeNoteMap> {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    const { data, error } = await supabase.rpc('izdivac_badge_notes');
    if (error || !Array.isArray(data)) {
      inflight = null;
      return cache ?? {};
    }
    const map: IzdivacBadgeNoteMap = {};
    for (const row of data as { badge_type: string; label: string | null; note: string }[]) {
      if (VALID.includes(row.badge_type as IzdivacSpecialBadgeType)) {
        map[row.badge_type as IzdivacSpecialBadgeType] = { label: row.label, note: row.note };
      }
    }
    cache = map;
    inflight = null;
    return map;
  })();

  return inflight;
}

/** Tek bir tikin gösterilecek etiket + notunu (override → varsayılan) döndürür. */
export async function resolveIzdivacBadgeNote(
  badge: IzdivacSpecialBadgeType,
): Promise<{ label: string; note: string }> {
  const def = IZDIVAC_SPECIAL_BADGES[badge];
  const map = await fetchIzdivacBadgeNotes();
  const override = map[badge];
  return {
    label: override?.label || def.label,
    note: override?.note || def.note,
  };
}

function invalidate() {
  cache = null;
  inflight = null;
}

export async function setIzdivacBadgeNote(
  badgeType: IzdivacSpecialBadgeType,
  note: string,
  label?: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_izdivac_badge_note', {
    p_badge_type: badgeType,
    p_note: note,
    p_label: label ?? null,
  });
  if (!error) invalidate();
  return { error: supabaseErrorMessage(error) };
}

export async function deleteIzdivacBadgeNote(
  badgeType: IzdivacSpecialBadgeType,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_izdivac_badge_note', {
    p_badge_type: badgeType,
  });
  if (!error) invalidate();
  return { error: supabaseErrorMessage(error) };
}
