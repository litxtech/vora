import { demoArrayFallback } from '@/lib/demo/demoData';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import {
  HELP_MAX_DESCRIPTION_LENGTH,
  HELP_MAX_TITLE_LENGTH,
  HELP_MIN_DESCRIPTION_LENGTH,
  HELP_MIN_TITLE_LENGTH,
  type HelpCategory,
  type HelpRequest,
  type HelpUrgency,
} from '@/features/help/constants';

export type CreateHelpRequestInput = {
  authorId: string;
  regionId: string;
  category: HelpCategory;
  urgency: HelpUrgency;
  title: string;
  description: string;
  contactInfo?: string | null;
};

function validateHelpText(title: string, description: string): string | null {
  const t = title.trim();
  const d = description.trim();
  if (t.length < HELP_MIN_TITLE_LENGTH || t.length > HELP_MAX_TITLE_LENGTH) {
    return `Başlık ${HELP_MIN_TITLE_LENGTH}–${HELP_MAX_TITLE_LENGTH} karakter arasında olmalıdır.`;
  }
  if (d.length < HELP_MIN_DESCRIPTION_LENGTH || d.length > HELP_MAX_DESCRIPTION_LENGTH) {
    return `Açıklama ${HELP_MIN_DESCRIPTION_LENGTH}–${HELP_MAX_DESCRIPTION_LENGTH} karakter arasında olmalıdır.`;
  }
  return null;
}

function mapRow(row: {
  id: string;
  author_id?: string;
  category: string;
  urgency: string;
  title: string;
  description: string;
  contact_info: string | null;
  is_resolved?: boolean;
  created_at: string;
}): HelpRequest {
  return {
    id: row.id,
    authorId: row.author_id,
    category: row.category as HelpCategory,
    urgency: row.urgency as HelpRequest['urgency'],
    title: row.title,
    description: row.description,
    contactInfo: row.contact_info,
    isResolved: row.is_resolved,
    createdAt: row.created_at,
  };
}

export async function fetchHelpRequests(
  regionId: string | null,
  category?: HelpCategory | 'all',
): Promise<HelpRequest[]> {
  if (!regionId) return demoArrayFallback(DEMO_HELP);

  let query = supabase
    .from('help_requests')
    .select('id, author_id, category, urgency, title, description, contact_info, is_resolved, created_at')
    .eq('region_id', regionId)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(30);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error || !data?.length) return demoArrayFallback(DEMO_HELP);

  return data.map(mapRow);
}

export async function fetchHelpRequestById(id: string): Promise<HelpRequest | null> {
  const { data, error } = await supabase
    .from('help_requests')
    .select('id, author_id, category, urgency, title, description, contact_info, is_resolved, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

export async function createHelpRequest(
  input: CreateHelpRequestInput,
): Promise<{ id: string | null; error: string | null }> {
  const validationError = validateHelpText(input.title, input.description);
  if (validationError) return { id: null, error: validationError };

  const { data, error } = await supabase
    .from('help_requests')
    .insert({
      author_id: input.authorId,
      region_id: input.regionId,
      category: input.category,
      urgency: input.urgency,
      title: input.title.trim(),
      description: input.description.trim(),
      contact_info: input.contactInfo?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { id: null, error: supabaseErrorMessage(error.message) };
  return { id: data?.id ?? null, error: null };
}

export async function resolveHelpRequest(
  requestId: string,
  authorId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('help_requests')
    .update({ is_resolved: true })
    .eq('id', requestId)
    .eq('author_id', authorId);

  return { error: error ? supabaseErrorMessage(error.message) : null };
}

const DEMO_HELP: HelpRequest[] = [
  { id: 'h1', category: 'blood', urgency: 'critical', title: 'A Rh+ kan ihtiyacı', description: 'Trabzon Kan Merkezi acil kan aranıyor', contactInfo: '0462 325 2525', createdAt: new Date().toISOString() },
  { id: 'h2', category: 'medicine', urgency: 'high', title: 'İnsülin ihtiyacı', description: 'Diyabet hastası için acil insülin', contactInfo: null, createdAt: new Date(Date.now() - 7200000).toISOString() },
];
