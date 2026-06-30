const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Veritabanına yazılabilir müzik parçası kimliği (posts / reels FK). */
export function isPersistableMusicTrackId(trackId: string | null | undefined): boolean {
  if (!trackId?.trim()) return false;
  return UUID_RE.test(trackId.trim());
}
