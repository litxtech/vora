import { IDENTITY_STORAGE_BUCKET } from '@/features/identity-verification/constants';
import type { PickedImage } from '@/features/identity-verification/types';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

function fileNameFromUri(uri: string, fallback: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || fallback;
}

async function uploadSingle(
  userId: string,
  file: PickedImage,
  suffix: string,
): Promise<{ path: string | null; error: string | null }> {
  const arrayBuffer = await readLocalFileBytes(file.uri);
  const contentType = guessContentType(file.uri);
  const ext = contentType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}_${suffix}.${ext}`;

  const { error } = await supabase.storage.from(IDENTITY_STORAGE_BUCKET).upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });

  if (error) return { path: null, error: supabaseErrorMessage(error)! };
  return { path, error: null };
}

export async function uploadIdentityDocuments(
  userId: string,
  files: {
    idFront: PickedImage;
    idBack: PickedImage | null;
    selfie: PickedImage;
  },
): Promise<{
  idFrontPath: string | null;
  idBackPath: string | null;
  selfiePath: string | null;
  error: string | null;
}> {
  const idFront = await uploadSingle(userId, files.idFront, 'front');
  if (idFront.error) return { idFrontPath: null, idBackPath: null, selfiePath: null, error: idFront.error };

  let idBackPath: string | null = null;
  if (files.idBack) {
    const idBack = await uploadSingle(userId, files.idBack, 'back');
    if (idBack.error) return { idFrontPath: null, idBackPath: null, selfiePath: null, error: idBack.error };
    idBackPath = idBack.path;
  }

  const selfie = await uploadSingle(userId, {
    uri: files.selfie.uri,
    name: fileNameFromUri(files.selfie.uri, 'selfie.jpg'),
  }, 'selfie');
  if (selfie.error) return { idFrontPath: null, idBackPath: null, selfiePath: null, error: selfie.error };

  return {
    idFrontPath: idFront.path,
    idBackPath,
    selfiePath: selfie.path,
    error: null,
  };
}
