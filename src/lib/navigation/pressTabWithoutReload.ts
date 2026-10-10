import { Platform, type GestureResponderEvent } from 'react-native';

type WebClick = GestureResponderEvent & {
  metaKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  button?: number;
  currentTarget?: { target?: string };
};

/**
 * Web sekme düğmesi `href` yüzünden `<a>` olur.
 * Sol tıklamada tarayıcının tam sayfa yenilemesini kes, uygulama içi geçişi çalıştır.
 * Ctrl/Cmd tıklaması yeni sekmede açılsın diye tarayıcıya bırakılır.
 */
export function pressTabWithoutReload(
  event: GestureResponderEvent,
  onPress?: (event: GestureResponderEvent) => void,
): void {
  if (Platform.OS !== 'web') {
    onPress?.(event);
    return;
  }

  const click = event as WebClick;
  const hasModifierKey = Boolean(click.metaKey || click.altKey || click.ctrlKey || click.shiftKey);
  const isLeftClick = click.button == null || click.button === 0;
  const target = click.currentTarget?.target;
  const isSelfTarget = target == null || target === '' || target === 'self';

  if (!hasModifierKey && isLeftClick && isSelfTarget) {
    event.preventDefault();
    onPress?.(event);
  }
}
