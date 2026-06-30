export function resolveEmployerDisplayName(
  employerDisplayName: string | null | undefined,
  linkedBusinessName: string | null | undefined,
): string | null {
  const custom = employerDisplayName?.trim();
  if (custom) return custom;
  const linked = linkedBusinessName?.trim();
  return linked || null;
}

/** İşletme adı kişisel isimle aynıysa kartta iki kez göstermeyi önler. */
export function employerNameDistinctFromAuthor(
  employerName: string | null,
  authorFullName: string | null,
  authorUsername: string,
): boolean {
  if (!employerName) return false;
  const normalized = employerName.trim().toLowerCase();
  if (authorFullName && normalized === authorFullName.trim().toLowerCase()) return false;
  if (normalized === authorUsername.trim().toLowerCase()) return false;
  return true;
}
