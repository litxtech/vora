import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { isAndroid } from '@/lib/device/androidPerfProfile';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';

let warmed = false;

function getMessageWarmupMs(): number {
  return isAndroidTablet() ? 300 : 900;
}

/** Mesaj sekmesi modülü — akış etkileşilebilir olduktan sonra yüklenir. Profil AuthProvider'da ısınır. */
export function warmupAndroidTabModules(): { cancel: () => void } {
  if (!isAndroid() || warmed) {
    return { cancel: () => {} };
  }

  let messageTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const deferTask = deferBackgroundWork(() => {
    if (cancelled) return;
    warmed = true;

    messageTimer = setTimeout(() => {
      if (!cancelled) void import('@/features/messaging/components/ConversationInbox');
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
