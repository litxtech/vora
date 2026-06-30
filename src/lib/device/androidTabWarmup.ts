import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { isAndroid } from '@/lib/device/androidPerfProfile';

let warmed = false;

const MESSAGE_WARMUP_MS = 2_500;

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
    }, MESSAGE_WARMUP_MS);
  });

  return {
    cancel: () => {
      cancelled = true;
      deferTask.cancel();
      if (messageTimer) clearTimeout(messageTimer);
    },
  };
}
