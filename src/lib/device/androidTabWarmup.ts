import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { isAndroid } from '@/lib/device/androidPerfProfile';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';

let warmed = false;

function getMessageWarmupMs(): number {
  // Akış ilk boyadan hemen sonra — Reels/Profil lazy olduğu için erken ısıt kritik.
  return isAndroidTablet() ? 160 : 40;
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

/** Ana sekme modülleri — akış etkileşilebilir olduktan sonra ısıt. Dev'de Metro her import'ta bundle yapar → kasma. */
export function warmupAndroidTabModules(): { cancel: () => void } {
  if (__DEV__ || !isAndroid() || warmed) {
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
      void import('@/features/discovery/components/DiscoveryScreen');
      void import('@/features/reels/components/ReelsFeed');
      void import('@/features/profile/components/ProfileScreen');
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
