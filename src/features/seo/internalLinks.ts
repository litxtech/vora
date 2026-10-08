import { SEO_LIMITS } from '@/features/seo/constants';
import type { SeoLink, SeoRecord } from '@/features/seo/types';

export type AnchorUse = Map<string, number>;

function take(anchor: string, href: string, used: AnchorUse, links: SeoLink[]): void {
  const key = anchor.toLocaleLowerCase('tr');
  const count = used.get(key) ?? 0;
  if (count >= SEO_LIMITS.anchorRepeatMax) return;
  if (links.some((link) => link.href === href)) return;
  used.set(key, count + 1);
  links.push({ href, text: anchor });
}

/**
 * InternalLinkManager.
 * Kullanıcı metninin içine link enjekte etmez. İlişkili blokta doğal çapa kullanır.
 */
export function relatedLinks(record: SeoRecord, catalog: SeoRecord[], used: AnchorUse): SeoLink[] {
  const links: SeoLink[] = [];
  const add = (href: string, text: string) => {
    if (!href || href === record.path) return;
    take(text, href, used, links);
  };

  if (record.city) add(record.city.path, `${record.city.name} sosyal topluluğu`);
  if (record.author?.path) add(record.author.path, record.author.name);

  if (record.entityType === 'city' || record.entityType === 'city_intent') {
    const slug = record.city?.slug;
    for (const candidate of catalog) {
      if (links.length >= 12) break;
      if (candidate.path === record.path || !candidate.hints.meaningful) continue;
      if (candidate.city?.slug !== slug) continue;
      if (candidate.entityType === 'post') add(candidate.path, candidate.h1);
      if (candidate.entityType === 'event') add(candidate.path, candidate.h1);
      if (candidate.entityType === 'blog') add(candidate.path, candidate.h1);
      if (candidate.entityType === 'profile') add(candidate.path, candidate.h1);
    }
    for (const other of catalog.filter((item) => item.entityType === 'city' && item.path !== record.path).slice(0, 4)) {
      add(other.path, other.h1);
    }
  }

  if (record.entityType === 'post') {
    const siblings = catalog.filter(
      (item) => item.entityType === 'post' && item.path !== record.path && item.city?.slug === record.city?.slug && item.hints.meaningful,
    );
    for (const sibling of siblings.slice(0, 3)) add(sibling.path, sibling.h1);
    const topic = catalog.find((item) => item.entityType === 'topic' && record.paragraphs.join(' ').toLocaleLowerCase('tr').includes(item.h1.toLocaleLowerCase('tr').replace(/^#/, '')));
    if (topic) add(topic.path, topic.h1);
  }

  if (record.entityType === 'blog' && record.city) {
    const eventsPath = `/sehirler/${record.city.slug}/etkinlikler`;
    const postsPath = `/sehirler/${record.city.slug}/paylasimlar`;
    if (catalog.some((item) => item.path === eventsPath)) add(eventsPath, `${record.city.name} etkinlikleri`);
    if (catalog.some((item) => item.path === postsPath)) add(postsPath, `${record.city.name} public paylaşımları`);
  }

  return links;
}

export function linkFirstCityMention(paragraph: string, cities: { name: string; path: string }[], used: AnchorUse): { text: string; links: SeoLink[] } {
  const links: SeoLink[] = [];
  for (const city of cities) {
    if (!paragraph.includes(city.name)) continue;
    const anchor = `${city.name} sayfası`;
    const key = anchor.toLocaleLowerCase('tr');
    if ((used.get(key) ?? 0) >= SEO_LIMITS.anchorRepeatMax) continue;
    used.set(key, (used.get(key) ?? 0) + 1);
    links.push({ href: city.path, text: anchor });
    break;
  }
  return { text: paragraph, links };
}
