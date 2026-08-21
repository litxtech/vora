import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { isAndroid } from '@/lib/device/androidPerfProfile';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';

let warmed = false;

function getMessageWarmupMs(): number {
  // Akış ilk boyadan hemen sonra — 900ms gecikme Mesajlar’ı soğuk bırakıyordu.
  return isAndroidTablet() ? 250 : 160;
}

async function prefetchInboxListCache(): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase/client');
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    const { getCachedConversationList, setCachedConversationList } = await import(
      '@/features/messaging/services/conversationListCache'
    );
    if (getCachedConversationList(userId, false)?.length) return;

    const { fetchConversationList } = await import(
      '@/features/messaging/services/conversationData'
    );
    const list = await fetchConversationList(false);
    setCachedConversationList(userId, false, list);
  } catch {
    // best-effort
  }
}

/** Mesaj sekmesi modülü + inbox cache — akış etkileşilebilir olduktan sonra. */
export function warmupAndroidTabModules(): { cancel: () => void } {
  if (!isAndroid() || warmed) {
    return { cancel: () => {} };
  }

  let messageTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const deferTask = deferBackgroundWork(() => {
    if (cancelled) return;

    messageTimer = setTimeout(() => {
      if (cancelled) return;
      warmed = true;
      void import('@/features/messaging/components/ConversationInbox');
      void import('@/features/messaging/components/MessagesTabBar');
      void import('@/features/messaging/hooks/useConversationList');
      void import('@/features/compose/components/ComposeScreen');
      void prefetchInboxListCache();
    }, getMessageWarmupMs());
  });

  return {
    cancel: () => {
      cancelled = true;
      deferTask.cancel();
      if (messageTimer) clearTimeout(messageTimer);
    },
  };
}
