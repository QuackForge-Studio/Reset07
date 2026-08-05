/**
 * RESET//07 — artwork → WebP pipeline.
 * Reads PNG sources from artwork/, writes quality-80 WebP at identical
 * dimensions into public/art/ under the same relative paths.
 * Run: npm run optimize:art
 */
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'artwork');
const OUT = path.join(root, 'public', 'art');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.name.toLowerCase().endsWith('.png')) out.push(full);
  }
  return out;
}

const files = await walk(SRC);
if (files.length === 0) {
  console.error('No PNG sources found under artwork/');
  process.exit(1);
}
for (const f of files) {
  const rel = path.relative(SRC, f).replace(/\.png$/i, '.webp');
  const dest = path.join(OUT, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  const img = sharp(f);
  const meta = await img.metadata();
  await sharp(f)
    .webp({ quality: 80 })
    .toFile(dest);
  const outMeta = await stat(dest);
  console.log(`${rel}: ${meta.width}x${meta.height} ${(outMeta.size / 1024).toFixed(0)} KB`);
}
console.log(`OK — ${files.length} WebP written to ${path.relative(root, OUT)}`);
