type PostgresErrorLike = { code?: string; message?: string } | null | undefined;

/** PostgreSQL unique_violation (23505) — örn. zaten beğenilmiş / takip edilmiş kayıt. */
export function isUniqueViolation(error: PostgresErrorLike): boolean {
  if (!error) return false;
  if (error.code === '23505') return true;
  const message = error.message ?? '';
  return /duplicate key|unique constraint|follows_pkey/i.test(message);
}
