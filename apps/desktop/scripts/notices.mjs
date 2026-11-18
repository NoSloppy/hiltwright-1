#!/usr/bin/env node
// Generates THIRD-PARTY-NOTICES.md at the repo root. It lists the production dependencies that ship inside the
// packaged app: the dependencies of apps/desktop and packages/core, their transitive dependencies, and Electron
// (a devDependency that ships in the app). The hand-written part comes from docs/notices-header.md.
//
//   node scripts/notices.mjs [--modules <dir>] [--check]
//
//   --modules <dir>  node_modules folder to read from (default: <repo root>/node_modules)
//   --check          exit 1 if THIRD-PARTY-NOTICES.md on disk differs from what would be generated

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const roots = [join(repoRoot, 'apps', 'desktop', 'package.json'), join(repoRoot, 'packages', 'core', 'package.json')];
const extras = ['electron'];
const outputFile = join(repoRoot, 'THIRD-PARTY-NOTICES.md');
const headerFile = join(repoRoot, 'docs', 'notices-header.md');
const firstPartyScope = '@hiltwright/';

// Licences treated as permissive or GPL-compatible for bundling in a GPL-3.0-or-later app. Used only to print a
// warning list; the notices file does not depend on it.
const compatible = new Set([
  'MIT', 'MIT-0', 'ISC', 'BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'CC0-1.0', 'Unlicense',
  'BlueOak-1.0.0', 'Python-2.0', 'Zlib', 'MPL-2.0', 'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'LGPL-3.0', 'LGPL-3.0-only', 'LGPL-3.0-or-later', 'LGPL-2.1', 'LGPL-2.1-only', 'LGPL-2.1-or-later', 'Public Domain',
]);

function fail(message) {
  console.error(`notices: ${message}`);
  process.exit(2);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function readText(file) {
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

// ---- arguments -------------------------------------------------------------------------------------------------

let modulesDir = join(repoRoot, 'node_modules');
let check = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--check') check = true;
  else if (argv[i] === '--modules') {
    if (!argv[i + 1]) fail('--modules needs a directory');
    modulesDir = resolve(argv[++i]);
  } else fail(`unknown argument: ${argv[i]}`);
}
if (!existsSync(modulesDir)) fail(`node_modules folder not found: ${modulesDir}`);

// ---- resolution ------------------------------------------------------------------------------------------------

// Node-style lookup in a hoisted node_modules: nested copies under the dependant first, then the flat copy.
function findPackage(name, fromDir) {
  let dir = fromDir;
  while (dir !== modulesDir && dir.startsWith(modulesDir + sep)) {
    const nested = join(dir, 'node_modules', name);
    if (existsSync(join(nested, 'package.json'))) return nested;
    dir = dirname(dir);
  }
  const flat = join(modulesDir, name);
  return existsSync(join(flat, 'package.json')) ? flat : null;
}

// ---- field normalisation ---------------------------------------------------------------------------------------

function licenceOf(pj) {
  if (typeof pj.license === 'string' && pj.license.trim()) return pj.license.trim();
  if (pj.license && typeof pj.license.type === 'string' && pj.license.type.trim()) return pj.license.type.trim();
  if (Array.isArray(pj.licenses)) {
    const names = pj.licenses.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
    if (names.length) return names.join(' OR ');
  }
  return null;
}

function repositoryOf(pj) {
  let url = typeof pj.repository === 'string' ? pj.repository : pj.repository?.url;
  if (typeof url !== 'string' || !url.trim()) return null;
  url = url.trim()
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^github:/, 'https://github.com/')
    .replace(/\.git$/, '');
  if (/^[\w.-]+\/[\w.-]+$/.test(url)) url = `https://github.com/${url}`;
  return url;
}

const LICENCE_FILE = /^(licen[cs]e|copying)(\.[a-z0-9]+)?$/i;
function licenceTextOf(dir) {
  const names = readdirSync(dir).filter((n) => LICENCE_FILE.test(n)).sort();
  if (!names.length) return null;
  return readText(join(dir, names[0])).trimEnd();
}

function isCompatible(licence) {
  if (!licence || licence === 'UNKNOWN') return false;
  const tokens = licence.split(/\s+OR\s+|\s+AND\s+|[()/]/i).map((t) => t.trim()).filter(Boolean);
  return tokens.some((t) => compatible.has(t));
}

// ---- walk ------------------------------------------------------------------------------------------------------

const entries = [];
const seen = new Set();
const queue = [];

for (const file of roots) {
  if (!existsSync(file)) fail(`missing ${file}`);
  for (const name of Object.keys(readJson(file).dependencies ?? {})) queue.push({ name, from: modulesDir });
}
for (const name of extras) queue.push({ name, from: modulesDir, noWalk: true });

while (queue.length) {
  const { name, from, noWalk } = queue.shift();
  if (name.startsWith(firstPartyScope)) continue;
  const dir = findPackage(name, from);
  if (!dir) fail(`cannot find ${name} under ${modulesDir}; install dependencies in the main checkout first`);
  if (seen.has(dir)) continue;
  seen.add(dir);
  const pj = readJson(join(dir, 'package.json'));
  entries.push({
    name: pj.name ?? name,
    version: pj.version ?? '0.0.0',
    licence: licenceOf(pj),
    repository: repositoryOf(pj),
    licenceText: licenceTextOf(dir),
  });
  if (noWalk) continue;
  for (const dep of Object.keys(pj.dependencies ?? {})) queue.push({ name: dep, from: dir });
}

entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version < b.version ? -1 : a.version > b.version ? 1 : 0));

// ---- output ----------------------------------------------------------------------------------------------------

if (!existsSync(headerFile)) fail(`missing ${headerFile}`);
const out = [];
out.push(readText(headerFile).trimEnd(), '');
out.push('---', '');
out.push('## npm packages shipped in the app', '');
out.push(
  `Generated by \`npm run notices\` from the production dependencies of apps/desktop and packages/core, their ` +
  `transitive dependencies, and Electron. ${entries.length} packages. Do not edit this section by hand.`,
  '',
);
for (const e of entries) {
  out.push(`### ${e.name} ${e.version}`, '');
  out.push(`- Licence: ${e.licence ?? 'UNKNOWN'}`);
  if (e.repository) out.push(`- Repository: ${e.repository}`);
  out.push('');
  if (e.licenceText) out.push('````text', e.licenceText, '````', '');
  else out.push('The package ships no LICENSE, LICENCE or COPYING file.', '');
}
const generated = out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

// ---- check or write --------------------------------------------------------------------------------------------

const flagged = entries.filter((e) => !isCompatible(e.licence));
if (flagged.length) {
  console.warn(`notices: ${flagged.length} package(s) with a missing or non-permissive/GPL-compatible licence field:`);
  for (const e of flagged) console.warn(`  ${e.name} ${e.version}: ${e.licence ?? 'UNKNOWN'}`);
}

if (check) {
  const onDisk = existsSync(outputFile) ? readText(outputFile) : null;
  if (onDisk !== generated) {
    console.error('notices: THIRD-PARTY-NOTICES.md is out of date; run `npm run notices` in apps/desktop');
    process.exit(1);
  }
  console.log(`notices: THIRD-PARTY-NOTICES.md is up to date (${entries.length} packages)`);
} else {
  writeFileSync(outputFile, generated, 'utf8');
  console.log(`notices: wrote ${outputFile} (${entries.length} packages)`);
}
