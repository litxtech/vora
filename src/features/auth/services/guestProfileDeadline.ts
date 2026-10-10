export const GUEST_PROFILE_DEADLINE_MS = 24 * 60 * 60 * 1000;

export function isGuestProfileDeadlineReached(
  createdAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return now - created >= GUEST_PROFILE_DEADLINE_MS;
}

/** Misafir hesap 24 saati doldurduysa kart, hesap misafir olmaktan çıkana kadar açık kalır. */
export function needsMandatoryGuestProfileCard(input: {
  createdAt: string | null | undefined;
  guestAccount: boolean;
  now?: number;
}): boolean {
  if (!input.guestAccount) return false;
  return isGuestProfileDeadlineReached(input.createdAt, input.now);
}
