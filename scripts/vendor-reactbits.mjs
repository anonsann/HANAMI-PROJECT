#!/usr/bin/env node
/**
 * Vendor ReactBits components straight from the upstream repo.
 *
 * ReactBits is a copy-paste library, so there is no npm package to depend on:
 * we pull the exact upstream source (TS + Tailwind variant by default) into
 * `src/reactbits/`. This script exists so the imports can be refreshed later
 * with `npm run reactbits:sync` instead of hand-copying files.
 *
 * Usage:  node scripts/vendor-reactbits.mjs [ComponentName ...]
 *         node scripts/vendor-reactbits.mjs --all
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const REPO = 'DavidHDev/react-bits';
const REF = 'main';
const OUT = new URL('../src/reactbits/', import.meta.url).pathname;
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function gh(path) {
  // Node's fetch cannot verify the sandbox proxy CA, but curl can — shell out to it.
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const url = `https://api.github.com/repos/${REPO}/${path}`;
  const args = ['-sS', '-L', '--fail', url];
  if (TOKEN) args.push('-H', `Authorization: Bearer ${TOKEN}`);
  const { stdout } = await run('curl', args, { maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(stdout);
}

/** Fetch a file as text (base64 decode to survive files that break JSON encoding). */
async function getFile(path) {
  const meta = await gh(`contents/${encodeURI(path)}?ref=${REF}`);
  if (meta.encoding !== 'base64') return meta.content;
  return Buffer.from(meta.content, 'base64').toString('utf8');
}

let treeCache = null;
async function listTree() {
  if (treeCache) return treeCache;
  const data = await gh(`git/trees/${REF}?recursive=1`);
  treeCache = data.tree.filter((x) => x.type === 'blob').map((x) => x.path);
  return treeCache;
}

const CATEGORIES = ['Animations', 'Backgrounds', 'Components', 'TextAnimations'];

async function resolve(name) {
  const tree = await listTree();
  for (const cat of CATEGORIES) {
    const hit = tree.find((p) => p.startsWith(`src/ts-tailwind/${cat}/${name}/`) && p.endsWith('.tsx'));
    if (hit) return { path: hit, variant: 'ts-tailwind', category: cat };
  }
  for (const cat of CATEGORIES) {
    const hit = tree.find((p) => p.startsWith(`src/ts-default/${cat}/${name}/`) && p.endsWith('.tsx'));
    if (hit) return { path: hit, variant: 'ts-default', category: cat };
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/vendor-reactbits.mjs [--all] [ComponentName ...]');
    process.exit(1);
  }

  let names = args;
  if (args[0] === '--all') {
    const tree = await listTree();
    const seen = new Set();
    names = [];
    for (const cat of CATEGORIES) {
      for (const p of tree) {
        const m = p.match(new RegExp(`^src/ts-tailwind/${cat}/([^/]+)/[^/]+\\.tsx$`));
        if (m && !seen.has(m[1])) { seen.add(m[1]); names.push(m[1]); }
      }
    }
  }

  await mkdir(OUT, { recursive: true });
  const manifest = {};
  const failed = [];

  for (const name of names) {
    const found = await resolve(name);
    if (!found) { failed.push(name); continue; }
    const src = await getFile(found.path);
    const target = join(OUT, `${name}.tsx`);
    await writeFile(target, src, 'utf8');
    manifest[name] = { upstream: found.path, category: found.category, variant: found.variant };
    console.log(`✓ ${name.padEnd(22)} ${found.category}/${found.variant}`);
  }

  const manifestPath = join(OUT, 'manifest.json');
  let existing = {};
  try { existing = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* first run */ }
  await writeFile(manifestPath, `${JSON.stringify({ ...existing, ...manifest }, null, 2)}\n`, 'utf8');

  if (failed.length) console.error(`\n✗ not found: ${failed.join(', ')}`);
  console.log(`\nWrote ${Object.keys(manifest).length} component(s) → src/reactbits/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
