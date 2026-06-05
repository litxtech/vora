import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/providers/AuthProvider';
import { fetchSoundSettings, getUnreadCount } from '@/features/notifications/services/notificationData';
import { deactivatePushTokens, registerPushTokens } from '@/lib/notifications/register';
import { syncNotificationSounds } from '@/lib/notifications/soundSync';
import { supabase } from '@/lib/supabase/client';

type NotificationContextValue = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    registerPushTokens(user.id).catch(() => undefined);
    refreshUnread();

    fetchSoundSettings()
      .then(syncNotificationSounds)
      .catch(() => undefined);

    const received = Notifications.addNotificationReceivedListener(() => {
      refreshUnread();
    });

    const response = Notifications.addNotificationResponseReceivedListener(() => {
      refreshUnread();
    });

    const channel = supabaseRealtime(user.id, refreshUnread);

    return () => {
      received.remove();
      response.remove();
      channel?.unsubscribe();
    };
  }, [user?.id]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnread }),
    [unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

function supabaseRealtime(userId: string, onUpdate: () => void) {
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onUpdate(),
    )
    .subscribe();
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications NotificationProvider içinde kullanılmalı.');
  return ctx;
}
