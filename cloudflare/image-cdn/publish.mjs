import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const workerDir = path.resolve(import.meta.dirname);

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnv(path.join(root, '.env'));
loadEnv(path.join(root, '.env.local'));

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!token || !accountId || !supabaseUrl || !anonKey) {
  console.error('missing-env');
  process.exit(1);
}

const script = fs.readFileSync(path.join(workerDir, 'src/index.js'));
const metadata = {
  main_module: 'index.js',
  compatibility_date: '2026-10-10',
  bindings: [
    { type: 'r2_bucket', name: 'BUCKET', bucket_name: 'vora-images' },
    { type: 'images', name: 'IMAGES' },
    { type: 'plain_text', name: 'SUPABASE_URL', text: supabaseUrl },
    { type: 'plain_text', name: 'SUPABASE_ANON_KEY', text: anonKey },
  ],
};

const form = new FormData();
form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
form.append('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');

const upload = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/vora-images`,
  { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form },
);
const uploadBody = await upload.json();
console.log('upload', upload.status, uploadBody.success, uploadBody.errors?.map((item) => item.message).join('; ') || '');
if (!upload.ok || !uploadBody.success) process.exit(1);

const subdomain = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/vora-images/subdomain`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: true }),
  },
);
const subdomainBody = await subdomain.json();
console.log('subdomain', subdomain.status, subdomainBody.success, JSON.stringify(subdomainBody.result ?? null), subdomainBody.errors?.map((item) => item.message).join('; ') || '');
