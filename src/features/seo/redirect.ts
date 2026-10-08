import type { SeoRedirect } from '@/features/seo/types';

export type FlatRedirect = {
  oldPath: string;
  newPath: string;
  redirectType: 301 | 302;
};

export type RedirectReport = {
  map: Map<string, FlatRedirect>;
  loops: string[];
  chainsCollapsed: number;
};

/**
 * RedirectManager.
 * A → B → C tek hedefe iner. Döngü halkadan çıkarılır.
 */
export function collapseRedirects(rows: SeoRedirect[]): RedirectReport {
  const direct = new Map<string, FlatRedirect>();
  for (const row of rows) {
    if (!row.oldPath.startsWith('/') || !row.newPath.startsWith('/')) continue;
    if (row.oldPath === row.newPath) continue;
    direct.set(row.oldPath, {
      oldPath: row.oldPath,
      newPath: row.newPath,
      redirectType: row.redirectType === 302 ? 302 : 301,
    });
  }

  const map = new Map<string, FlatRedirect>();
  const loops: string[] = [];
  let chainsCollapsed = 0;

  for (const [start, first] of direct) {
    const seen = new Set<string>([start]);
    let current = first.newPath;
    let type = first.redirectType;
    let hops = 0;
    let loop = false;
    while (direct.has(current) && hops < 10) {
      if (seen.has(current)) {
        loop = true;
        loops.push(start);
        break;
      }
      seen.add(current);
      const next = direct.get(current);
      if (!next) break;
      current = next.newPath;
      if (next.redirectType === 302) type = 302;
      hops += 1;
    }
    if (loop) continue;
    if (hops > 0) chainsCollapsed += 1;
    if (current === start) {
      loops.push(start);
      continue;
    }
    map.set(start, { oldPath: start, newPath: current, redirectType: type });
  }

  return { map, loops, chainsCollapsed };
}
