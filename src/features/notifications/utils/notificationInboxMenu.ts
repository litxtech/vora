import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type NotificationInboxMenuOptions = {
  hasItems: boolean;
  hasUnread: boolean;
  onSelect?: () => void;
  onSettings: () => void;
  onMarkAllRead: () => void;
  onDeleteAll: () => void;
};

export function showNotificationInboxMenu(options: NotificationInboxMenuOptions) {
  const actions: string[] = [];
  const handlers: Array<() => void> = [];

  if (options.hasItems && options.onSelect) {
    actions.push('Seç');
    handlers.push(options.onSelect);
  }

  actions.push('Ayarlar');
  handlers.push(options.onSettings);

  if (options.hasUnread) {
    actions.push('Tümünü okundu işaretle');
    handlers.push(options.onMarkAllRead);
  }
  if (options.hasItems) {
    actions.push('Tümünü sil');
    handlers.push(options.onDeleteAll);
  }

  actions.push('İptal');

  const run = (index: number) => {
    if (index < 0 || index >= handlers.length) return;
    handlers[index]();
  };

  const deleteIndex = actions.indexOf('Tümünü sil');

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: actions,
        cancelButtonIndex: actions.length - 1,
        destructiveButtonIndex: deleteIndex >= 0 ? deleteIndex : undefined,
      },
      run,
    );
    return;
  }

  Alert.alert(undefined, undefined, [
    ...actions.slice(0, -1).map((label, i) => ({
      text: label,
      style: label === 'Tümünü sil' ? ('destructive' as const) : ('default' as const),
      onPress: () => run(i),
    })),
    { text: 'İptal', style: 'cancel' },
  ]);
}
