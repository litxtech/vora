import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
  console.error('missing-env', {
    token: Boolean(token),
    accountId: Boolean(accountId),
    supabaseUrl: Boolean(supabaseUrl),
    anonKey: Boolean(anonKey),
  });
  process.exit(1);
}

process.env.CLOUDFLARE_API_TOKEN = token;
process.env.CLOUDFLARE_ACCOUNT_ID = accountId;

function run(args, input) {
  const result = spawnSync('npx', ['--yes', 'wrangler', ...args], {
    cwd: workerDir,
    env: process.env,
    input,
    encoding: 'utf8',
    shell: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['deploy']);
run(['secret', 'put', 'SUPABASE_URL'], `${supabaseUrl}\n`);
run(['secret', 'put', 'SUPABASE_ANON_KEY'], `${anonKey}\n`);
console.log('deploy-ok');
