import { supabase } from '@/lib/supabase/client';
import { devWarn } from '@/lib/safeLog';

const HEARTBEAT_MS = 120_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let activeUserId: string | null = null;
/** null = henüz denenmedi; false = tablo/API hazır değil (schema cache vb.) */
let userPresenceTableReady: boolean | null = null;

function isUserPresenceSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('user_presence') && lower.includes('schema cache');
}

async function upsertUserPresence(
  userId: string,
  payload: { is_online: boolean; last_seen_at?: string; last_active_at?: string },
): Promise<boolean> {
  if (userPresenceTableReady === false) return false;

  const { error } = await supabase.from('user_presence').upsert(
    {
      user_id: userId,
      is_online: payload.is_online,
      last_seen_at: payload.last_seen_at ?? null,
      last_active_at: payload.last_active_at ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (!error) {
    userPresenceTableReady = true;
    return true;
  }

  if (isUserPresenceSchemaError(error.message)) {
    if (userPresenceTableReady !== false) {
      userPresenceTableReady = false;
      devWarn(
        'presence',
        'user_presence API henüz hazır değil; profiles fallback kullanılıyor (Supabase SQL: NOTIFY pgrst, \'reload schema\';)',
      );
    }
    return false;
  }

  devWarn('presence', 'user_presence upsert failed', error.message);
  return false;
}

async function updateProfilePresence(
  userId: string,
  payload: { is_online: boolean; last_seen_at?: string; last_active_at?: string },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);

  if (!error) return;

  devWarn('presence', 'profiles update failed, falling back', error.message);

  const now = new Date().toISOString();
  if (payload.is_online) {
    await supabase.from('profiles').update({ last_seen_at: now }).eq('id', userId);
  } else {
    await supabase.from('profiles').update({ last_seen_at: payload.last_seen_at ?? now }).eq('id', userId);
  }
}

async function writePresence(
  userId: string,
  payload: { is_online: boolean; last_seen_at?: string; last_active_at?: string },
): Promise<void> {
  const wrotePresence = await upsertUserPresence(userId, payload);
  if (!wrotePresence) {
    await updateProfilePresence(userId, payload);
  } else if (payload.is_online === false || payload.last_seen_at) {
    await updateProfilePresence(userId, payload);
  }
}

export async function setUserOnline(userId: string): Promise<void> {
  activeUserId = userId;
  const now = new Date().toISOString();

  await writePresence(userId, { is_online: true, last_active_at: now });

  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (!activeUserId) return;
    void writePresence(activeUserId, {
      is_online: true,
      last_active_at: new Date().toISOString(),
    });
  }, HEARTBEAT_MS);
}

export async function setUserOffline(userId: string): Promise<void> {
  if (activeUserId === userId) activeUserId = null;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  const now = new Date().toISOString();
  await writePresence(userId, { is_online: false, last_seen_at: now });
}

export function clearPresenceHeartbeat(): void {
  activeUserId = null;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export async function fetchParticipantPresence(userId: string): Promise<{
  last_seen_at: string | null;
  is_online: boolean;
  last_active_at: string | null;
} | null> {
  if (userPresenceTableReady !== false) {
    const { data: presence, error: presenceError } = await supabase
      .from('user_presence')
      .select('last_seen_at, is_online, last_active_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!presenceError && presence) {
      userPresenceTableReady = true;
      return {
        last_seen_at: presence.last_seen_at,
        is_online: presence.is_online ?? false,
        last_active_at: presence.last_active_at ?? null,
      };
    }

    if (presenceError && isUserPresenceSchemaError(presenceError.message)) {
      userPresenceTableReady = false;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('last_seen_at, is_online, last_active_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    last_seen_at: data.last_seen_at,
    is_online: data.is_online ?? false,
    last_active_at: data.last_active_at ?? null,
  };
}
