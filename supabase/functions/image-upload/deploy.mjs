import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');

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
const cliTokenPath = path.join(process.env.USERPROFILE ?? '', '.supabase', 'access-token');
process.env.SUPABASE_ACCESS_TOKEN = fs.readFileSync(cliTokenPath, 'utf8').trim();
const project = 'rojrsetndxvwsrbriuov';

function run(args) {
  const result = spawnSync('npx', ['--yes', 'supabase', ...args], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    shell: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['functions', 'deploy', 'image-upload', '--project-ref', project]);
console.log('image-upload-deployed');
