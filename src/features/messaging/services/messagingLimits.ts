export const CONVERSATION_PIN_LIMIT = 20;

/** Mesajlaşma günlük limiti yok; RPC uyumluluğu için -1 = sınırsız. */
export async function fetchMessageDailyRemaining(): Promise<number> {
  return -1;
}
