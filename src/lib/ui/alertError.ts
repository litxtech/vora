import { Alert } from 'react-native';
import { toUserFacingError } from '@/lib/errors';

/** Kullanıcıya teknik hata detayı göstermeden Alert açar. */
export function alertUserError(
  title: string,
  error: string | null | undefined,
  fallback?: string,
): void {
  if (!error) return;
  Alert.alert(title, toUserFacingError(error, { fallback }));
}
