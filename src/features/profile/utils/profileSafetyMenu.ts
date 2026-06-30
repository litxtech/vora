import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type ProfileSafetyMenuOptions = {
  username: string;
  blockedByMe: boolean;
  onRestrict: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: () => void;
};

export function showProfileSafetyMenu(options: ProfileSafetyMenuOptions) {
  const actions: string[] = [];
  const handlers: Array<() => void> = [];

  if (options.blockedByMe) {
    actions.push('Engeli Kaldır');
    handlers.push(options.onUnblock);
  } else {
    actions.push('Kısıtla');
    handlers.push(options.onRestrict);
    actions.push('Engelle');
    handlers.push(options.onBlock);
  }

  actions.push('Şikayet Et');
  handlers.push(options.onReport);
  actions.push('İptal');

  const run = (index: number) => {
    if (index < 0 || index >= handlers.length) return;
    handlers[index]();
  };

  const blockIndex = actions.indexOf('Engelle');

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: actions,
        cancelButtonIndex: actions.length - 1,
        destructiveButtonIndex: blockIndex >= 0 ? blockIndex : undefined,
        title: `@${options.username}`,
      },
      run,
    );
    return;
  }

  Alert.alert(`@${options.username}`, undefined, [
    ...actions.slice(0, -1).map((label, i) => ({
      text: label,
      style: label === 'Engelle' ? ('destructive' as const) : ('default' as const),
      onPress: () => run(i),
    })),
    { text: 'İptal', style: 'cancel' },
  ]);
}
