export type CanlarPrivacy = {
  showAnimals: boolean;
  showRescues: boolean;
  showDonations: boolean;
  showInKind: boolean;
  showVolunteer: boolean;
};

export const DEFAULT_CANLAR_PRIVACY: CanlarPrivacy = {
  showAnimals: false,
  showRescues: false,
  showDonations: false,
  showInKind: false,
  showVolunteer: false,
};

export type CanlarStats = {
  animalsSupported: number;
  verifiedRescues: number;
  donationNetOfRefundsMinor: number;
  inKindCount: number;
  verifiedInKindValueMinor: number | null;
  volunteerCount: number;
};

export type PublicCanlarStats = {
  animalsSupported: number | null;
  verifiedRescues: number | null;
  donationNetOfRefundsMinor: number | null;
  inKindCount: number | null;
  verifiedInKindValueMinor: number | null;
  volunteerCount: number | null;
};

export function presentContributionStats(
  stats: CanlarStats,
  privacy: CanlarPrivacy,
  viewerIsSubject: boolean,
): PublicCanlarStats {
  if (viewerIsSubject) {
    return {
      animalsSupported: stats.animalsSupported,
      verifiedRescues: stats.verifiedRescues,
      donationNetOfRefundsMinor: stats.donationNetOfRefundsMinor,
      inKindCount: stats.inKindCount,
      verifiedInKindValueMinor: stats.verifiedInKindValueMinor,
      volunteerCount: stats.volunteerCount,
    };
  }
  return {
    animalsSupported: privacy.showAnimals ? stats.animalsSupported : null,
    verifiedRescues: privacy.showRescues ? stats.verifiedRescues : null,
    donationNetOfRefundsMinor: privacy.showDonations ? stats.donationNetOfRefundsMinor : null,
    inKindCount: privacy.showInKind ? stats.inKindCount : null,
    verifiedInKindValueMinor: privacy.showInKind ? stats.verifiedInKindValueMinor : null,
    volunteerCount: privacy.showVolunteer ? stats.volunteerCount : null,
  };
}

export const GUEST_BLOCKED_ACTIONS = [
  'post',
  'like',
  'comment',
  'message',
  'donate',
  'campaign',
  'volunteer',
  'role',
] as const;

export type CanlarAction = (typeof GUEST_BLOCKED_ACTIONS)[number] | 'view';

export function guestCan(action: CanlarAction, isGuest: boolean): boolean {
  if (action === 'view') return true;
  if (!isGuest) return true;
  return false;
}

const TERMINAL_RESCUE_STATUSES = new Set(['completed', 'lost', 'cancelled', 'duplicate']);

/** Durumlar yüzde çubuğuna indirgenmez. Terminal sonuçlarda da ilerleme yüzdesi yoktur. */
export function rescueProgressPercent(_status: string): null {
  return null;
}

export function isTerminalRescueStatus(status: string): boolean {
  return TERMINAL_RESCUE_STATUSES.has(status);
}

const OPEN_STATUSES = new Set([
  'new_report',
  'awaiting_review',
  'verifying',
  'rescue_planned',
  'team_dispatched',
  'rescued',
  'vet_assessment',
  'treatment',
  'recovery',
  'rehomed',
]);

export type DuplicateCandidate = {
  id: string;
  reporterId: string;
  species: string;
  name: string | null;
  cityLabel: string;
  status: string;
};

export function normalizeAnimalName(name: string | null | undefined): string | null {
  const value = name?.trim().toLocaleLowerCase('tr') ?? '';
  return value.length > 0 ? value : null;
}

export function blockingDuplicateId(
  existing: DuplicateCandidate[],
  candidate: { reporterId: string; species: string; name: string | null; cityLabel: string },
): string | null {
  const name = normalizeAnimalName(candidate.name);
  if (!name) return null;
  const match = existing.find(
    (row) =>
      OPEN_STATUSES.has(row.status) &&
      row.reporterId === candidate.reporterId &&
      row.species === candidate.species &&
      normalizeAnimalName(row.name) === name &&
      row.cityLabel.trim().toLocaleLowerCase('tr') === candidate.cityLabel.trim().toLocaleLowerCase('tr'),
  );
  return match?.id ?? null;
}

export function possibleDuplicateIds(
  existing: DuplicateCandidate[],
  candidate: { species: string; cityLabel: string },
): string[] {
  const city = candidate.cityLabel.trim().toLocaleLowerCase('tr');
  return existing
    .filter(
      (row) =>
        OPEN_STATUSES.has(row.status) &&
        row.species === candidate.species &&
        row.cityLabel.trim().toLocaleLowerCase('tr') === city,
    )
    .map((row) => row.id);
}
