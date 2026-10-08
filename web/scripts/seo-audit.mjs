import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

const cities = fs.readFileSync(path.join(root, 'lib', 'cities.ts'), 'utf8');
const intros = [...cities.matchAll(/intro:\n\s+'([^']+)'/g)].map((match) => match[1]);
const histories = [...cities.matchAll(/history:\n\s+'([^']+)'/g)].map((match) => match[1]);
if (intros.length < 18) fail(`expected 18 city intros, found ${intros.length}`);
if (new Set(intros).size !== intros.length) fail('duplicate city intro');
if (new Set(histories).size !== histories.length) fail('duplicate city history');

const webRoot = root;
const banned = ['1M kullanıcı', '500K', '10K şehir', 'aggregateRating', 'SUPABASE_SERVICE_ROLE'];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'seo-audit.mjs') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mjs|sql)$/.test(entry.name)) files.push(full);
  }
}
walk(webRoot);
const blob = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const phrase of banned) {
  if (blob.includes(phrase)) fail(`banned phrase present: ${phrase}`);
}
if (!blob.includes('web_search_visible') && !fs.readFileSync(path.join(root, '..', 'supabase', 'migrations', '20251008000001_web_public_seo.sql'), 'utf8').includes('web_search_visible')) {
  fail('missing search visibility flag');
}

const migration = fs.readFileSync(path.join(root, '..', 'supabase', 'migrations', '20251008000001_web_public_seo.sql'), 'utf8');
for (const needle of ['latitude', 'iban', 'qr_token']) {
  if (migration.includes(`p.${needle}`) || migration.includes(`e.${needle}`)) {
    fail(`public view selects ${needle}`);
  }
}

const base = process.env.SEO_AUDIT_BASE;
if (!base) {
  console.log('HTTP audit skipped. Set SEO_AUDIT_BASE=http://127.0.0.1:3456 after next start.');
} else {
  const paths = ['/', '/about', '/features', '/cities', '/city/trabzon', '/city/rize', '/blog', '/explore', '/discover', '/events', '/search', '/privacy', '/this-page-does-not-exist-vora'];
  for (const route of paths) {
    const response = await fetch(new URL(route, base), { redirect: 'manual' });
    const html = await response.text();
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    const description = html.match(/name="description" content="([^"]*)"/)?.[1] ?? '';
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? '';
    const robots = html.match(/name="robots" content="([^"]+)"/)?.[1] ?? '';
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] ?? '';
    console.log(`${response.status} ${route} title=${title} robots=${robots} h1=${h1.slice(0, 60)}`);
    if (route === '/this-page-does-not-exist-vora' && response.status !== 404) fail(`${route} expected 404`);
    if (route === '/search' && !robots.includes('noindex')) fail('search missing noindex');
    if (route !== '/search' && route !== '/this-page-does-not-exist-vora') {
      if (response.status !== 200) fail(`${route} status ${response.status}`);
      if (!title) fail(`${route} missing title`);
      if (!description) fail(`${route} missing description`);
      if (!canonical) fail(`${route} missing canonical`);
      if (!h1) fail(`${route} missing h1`);
      if (canonical.includes('?')) fail(`${route} canonical has query`);
    }
  }
  const robots = await fetch(new URL('/robots.txt', base));
  const robotsText = await robots.text();
  console.log('robots', robots.status);
  const blocksAll = /Disallow:\s*\//.test(robotsText);
  if (!blocksAll && !robotsText.includes('/admin')) fail('robots missing admin disallow');
  if (!blocksAll && !robotsText.includes('/search')) fail('robots missing search disallow');
  const sitemap = await fetch(new URL('/sitemap.xml', base));
  console.log('sitemap', sitemap.status);
}

if (failures.length > 0) {
  console.error(`SEO audit failed (${failures.length})`);
  process.exit(1);
}
console.log('SEO audit passed');
