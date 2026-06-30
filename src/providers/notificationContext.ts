import { createContext, useContext } from 'react';

export type NotificationContextValue = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  resyncSounds: () => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications NotificationProvider içinde kullanılmalı.');
  return ctx;
}
