export function parseVersion(version: string): [number, number, number] {
  const parts = version.trim().split('.').map((part) => {
    const parsed = parseInt(part.replace(/[^0-9].*$/, ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });

  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function isVersionBelow(current: string, minimum: string): boolean {
  const [currentMajor, currentMinor, currentPatch] = parseVersion(current);
  const [minMajor, minMinor, minPatch] = parseVersion(minimum);

  if (currentMajor !== minMajor) return currentMajor < minMajor;
  if (currentMinor !== minMinor) return currentMinor < minMinor;
  return currentPatch < minPatch;
}
