import { useShakeToCompose } from '@/features/compose/hooks/useShakeToCompose';

/** Kök layout'ta mount edilir; görsel çıktısı yoktur. */
export function ShakeToComposeListener() {
  useShakeToCompose();
  return null;
}
