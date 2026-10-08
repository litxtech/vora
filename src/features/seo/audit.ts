import { hreflangIssues } from '@/features/seo/hreflang';
import { normalizeForCompare } from '@/features/seo/text';
import type { AuditIssue, GraphNode, SeoPage, SeoRedirect } from '@/features/seo/types';
import { collapseRedirects } from '@/features/seo/redirect';

/** Yinelenen başlık, zayıf içerik, yetim sayfa, noindex/sitemap çakışması. */
export function auditPages(pages: SeoPage[], redirects: SeoRedirect[] = []): { issues: AuditIssue[]; graph: GraphNode[] } {
  const issues: AuditIssue[] = [];
  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  const bodies = new Map<string, string[]>();
  const canonicals = new Map<string, string[]>();
  const sitemapPaths = new Set(pages.filter((page) => page.inSitemap).map((page) => page.path));

  for (const page of pages) {
    if (page.status !== 200) continue;
    const titleKey = normalizeForCompare(page.title);
    const descriptionKey = normalizeForCompare(page.description);
    const bodyKey = normalizeForCompare(page.paragraphs.join(' '));
    push(titles, titleKey, page.path);
    push(descriptions, descriptionKey, page.path);
    if (bodyKey.length > 40) push(bodies, bodyKey, page.path);
    push(canonicals, page.canonical, page.path);

    if (!page.title.trim()) issues.push(issue('critical', 'missing_title', page.path, 'Başlık yok.'));
    if (!page.description.trim()) issues.push(issue('warning', 'missing_description', page.path, 'Açıklama yok.'));
    if (!page.canonical.startsWith('http')) issues.push(issue('critical', 'invalid_canonical', page.path, 'Canonical mutlak değil.'));
    if (!page.h1.trim()) issues.push(issue('critical', 'missing_h1', page.path, 'H1 yok.'));
    if (page.indexable && page.wordCount < 40) issues.push(issue('warning', 'thin_content', page.path, 'Indexlenen sayfa çok kısa.'));
    if (!page.indexable && sitemapPaths.has(page.path)) {
      issues.push(issue('critical', 'noindex_sitemap_conflict', page.path, 'Noindex sayfa sitemap içinde.'));
    }
    if (page.status === 200 && page.robots.includes('noindex') && page.inSitemap) {
      issues.push(issue('critical', 'noindex_sitemap_conflict', page.path, 'Noindex ve sitemap aynı anda.'));
    }
    if (page.images.some((image) => !image.alt.trim())) {
      issues.push(issue('warning', 'missing_alt', page.path, 'Görsel alternatif metni yok.'));
    }
    if (page.indexable && !page.openGraph['og:title']) {
      issues.push(issue('warning', 'missing_og', page.path, 'Open Graph başlığı yok.'));
    }
    for (const code of hreflangIssues(page.hreflang)) {
      issues.push(issue('warning', code, page.path, 'Hreflang doğrulanamadı.'));
    }
    if (JSON.stringify(page.jsonLd).includes('aggregateRating') || JSON.stringify(page.jsonLd).includes('reviewCount')) {
      issues.push(issue('critical', 'fake_structured_data', page.path, 'Uydurma puan şeması var.'));
    }
  }

  reportDuplicates(issues, titles, 'duplicate_title', 'Aynı başlık birden fazla sayfada.');
  reportDuplicates(issues, descriptions, 'duplicate_description', 'Aynı açıklama birden fazla sayfada.');
  reportDuplicates(issues, bodies, 'duplicate_content', 'Aynı gövde birden fazla sayfada.');

  const graph = buildGraph(pages);
  for (const node of graph) {
    if (node.orphan) issues.push(issue('warning', 'orphan_page', node.path, 'Indexlenen sayfanın iç linki yok.'));
    if (node.clickDepth !== null && node.clickDepth > 3 && node.indexable) {
      issues.push(issue('warning', 'deep_click', node.path, `Tıklama derinliği ${node.clickDepth}.`));
    }
  }

  const collapsed = collapseRedirects(redirects);
  for (const loop of collapsed.loops) {
    issues.push(issue('critical', 'redirect_loop', loop, 'Yönlendirme döngüsü.'));
  }
  for (const redirect of collapsed.map.values()) {
    const target = pages.find((page) => page.path === redirect.newPath);
    if (target && target.canonical.endsWith(redirect.oldPath)) {
      issues.push(issue('critical', 'canonical_redirect_conflict', redirect.oldPath, 'Yönlenen adres canonical olarak duruyor.'));
    }
    if (!target) issues.push(issue('warning', 'redirect_target_missing', redirect.oldPath, 'Yönlendirme hedefi yok.'));
  }

  const broken = new Set<string>();
  const known = new Set(pages.filter((page) => page.status === 200).map((page) => page.path.split('?')[0]));
  for (const page of pages) {
    for (const link of page.links) {
      const href = link.href.split('?')[0] ?? link.href;
      if (!href.startsWith('/') || href.startsWith('/ara')) continue;
      if (!known.has(href) && !broken.has(`${page.path}->${href}`)) {
        broken.add(`${page.path}->${href}`);
        issues.push(issue('warning', 'broken_internal_link', page.path, `Kırık iç link: ${href}`));
      }
    }
  }

  return { issues, graph };
}

function buildGraph(pages: SeoPage[]): GraphNode[] {
  const live = pages.filter((page) => page.status === 200);
  const inbound = new Map<string, number>();
  for (const page of live) {
    for (const link of page.links) {
      const href = link.href.split('?')[0] ?? link.href;
      inbound.set(href, (inbound.get(href) ?? 0) + 1);
    }
    for (const crumb of page.breadcrumbs) {
      if (crumb.path === page.path) continue;
      inbound.set(crumb.path, (inbound.get(crumb.path) ?? 0) + 1);
    }
  }

  const depth = new Map<string, number>();
  const queue: { path: string; depth: number }[] = [{ path: '/', depth: 0 }];
  depth.set('/', 0);
  const byPath = new Map(live.map((page) => [page.path.split('?')[0], page]));
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const page = byPath.get(current.path);
    if (!page) continue;
    for (const link of page.links) {
      const href = link.href.split('?')[0] ?? link.href;
      if (depth.has(href) || !byPath.has(href)) continue;
      depth.set(href, current.depth + 1);
      queue.push({ path: href, depth: current.depth + 1 });
    }
  }

  return live.map((page) => {
    const path = page.path.split('?')[0] ?? page.path;
    const clicks = depth.get(path) ?? null;
    const incoming = path === '/' ? 1 : inbound.get(path) ?? 0;
    return {
      path,
      entityType: page.entityType,
      indexable: page.indexable,
      quality: page.score.quality,
      seoScore: page.score.total,
      inbound: incoming,
      outbound: page.links.length,
      clickDepth: clicks,
      orphan: page.indexable && path !== '/' && incoming === 0,
      title: page.title,
    };
  });
}

function push(map: Map<string, string[]>, key: string, path: string): void {
  if (!key) return;
  const list = map.get(key) ?? [];
  list.push(path);
  map.set(key, list);
}

function reportDuplicates(issues: AuditIssue[], map: Map<string, string[]>, code: string, message: string): void {
  for (const paths of map.values()) {
    if (paths.length < 2) continue;
    for (const path of paths) issues.push(issue('warning', code, path, message));
  }
}

function issue(severity: AuditIssue['severity'], code: string, path: string, message: string): AuditIssue {
  return { severity, code, path, message };
}

export function healthScore(pages: SeoPage[], issues: AuditIssue[]): number {
  const indexable = pages.filter((page) => page.indexable);
  if (indexable.length === 0) return issues.some((item) => item.severity === 'critical') ? 40 : 70;
  const average = indexable.reduce((sum, page) => sum + page.score.total, 0) / indexable.length;
  const penalty = Math.min(40, issues.filter((item) => item.severity === 'critical').length * 8);
  return Math.max(0, Math.min(100, Math.round(average - penalty)));
}
