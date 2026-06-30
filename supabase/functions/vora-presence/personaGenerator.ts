import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  generatePersonaProfile,
  resolveGenderFilter,
  type GeneratedPersona,
  type PersonaGender,
  type PersonaGenerateOptions,
} from './personaCatalog.ts';

export async function generatePersonas(
  admin: SupabaseClient,
  count: number,
  genderFilter?: string | null,
  options?: PersonaGenerateOptions,
  maxBatch = 100,
): Promise<{ created: number; skipped: number; items: GeneratedPersona[] }> {
  const cap = Math.max(1, Math.min(maxBatch, 200));
  const target = Math.max(1, Math.min(count, cap));
  const { data: existing } = await admin.from('ai_personas').select('persona_key');
  const keys = new Set((existing ?? []).map((row: { persona_key: string }) => row.persona_key));

  let created = 0;
  let skipped = 0;
  const items: GeneratedPersona[] = [];

  for (let i = 0; i < target; i++) {
    const gender: PersonaGender =
      genderFilter === 'female' || genderFilter === 'male'
        ? genderFilter
        : resolveGenderFilter(null);

    const profile = generatePersonaProfile(gender, options?.regionId, keys, options);
    keys.add(profile.personaKey);

    const { data, error } = await admin.rpc('admin_create_ai_persona', {
      p_username: profile.username,
      p_full_name: profile.fullName,
      p_gender: profile.gender,
      p_region_id: profile.regionId,
      p_district: profile.district,
      p_bio: profile.bio,
      p_tone: profile.tone,
      p_avatar_url: profile.avatarUrl,
    });

    if (error || !data || (data as { ok?: boolean }).ok === false) {
      skipped += 1;
      continue;
    }

    const row = data as { profile_id?: string; persona_key?: string };
    if (row.profile_id) {
      await admin
        .from('ai_personas')
        .update({ interests: profile.interests })
        .eq('profile_id', row.profile_id);
    }

    created += 1;
    items.push(profile);
  }

  return { created, skipped, items };
}

export async function personasCreatedToday(admin: SupabaseClient): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from('ai_personas')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start.toISOString());
  return count ?? 0;
}
