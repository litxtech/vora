import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export type AuthClients = {
  user: User;
  userClient: SupabaseClient;
  admin: SupabaseClient;
};

export async function requireAuth(req: Request): Promise<AuthClients | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'Supabase credentials missing' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  return { user: authData.user, userClient, admin };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** İstemciye iç detay sızdırmadan hata döner; sunucu logunda tam hata kalır. */
export function jsonSafeError(error: unknown, status = 500): Response {
  console.error('[edge-error]', error);

  if (status === 401) return json({ error: 'Unauthorized' }, 401);
  if (status === 403) return json({ error: 'Forbidden' }, 403);
  if (status === 404) return json({ error: 'Not found' }, 404);
  if (status >= 500) return json({ error: 'Internal server error' }, status);

  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Bad request';
  return json({ error: message }, status);
}
