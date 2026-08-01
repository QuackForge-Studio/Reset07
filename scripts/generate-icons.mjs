/**
 * RESET//07 — icon raster pipeline.
 *
 * Generates every raster icon from the single supplied asset
 * `public/brand/reset07-icon.png`:
 *
 *   public/icons/icon-{16,32,48,180,192,256,384,512}.png
 *   public/icons/icon-512-maskable.png   (Core Black background, 60% safe zone)
 *   public/favicon.ico                   (16/32/48 embedded PNGs)
 *
 * Run:  npm run generate:icons
 * Rerun after replacing the supplied icon asset.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconSource = join(root, 'public', 'brand', 'reset07-icon.png');
const outDir = join(root, 'public', 'icons');

const SIZES = [16, 32, 48, 180, 192, 256, 384, 512];
const MASKABLE_BG = '#070A0F'; // Core Black extended background
const SAFE_ZONE_RATIO = 0.6; // maskable safe central area (never crop essential geometry)

/** Build a multi-size ICO file from PNG buffers (PNG-compressed entries). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dirSize = 16 * entries.length;
  const chunks = [header];
  let offset = 6 + dirSize;

  for (const entry of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = entry.size === 256 ? 0 : entry.size;
    dir[1] = entry.size === 256 ? 0 : entry.size;
    dir[2] = 0; // palette colors
    dir[3] = 0; // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(entry.png.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += entry.png.length;
    chunks.push(dir, entry.png);
  }
  return Buffer.concat(chunks);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const source = sharp(iconSource);
  const meta = await source.metadata();

  const fit = meta.width && meta.height ? { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } } : undefined;
  const resize = (size) => (fit ? source.clone().resize(size, size, fit) : source.clone().resize(size, size));

  const pngs = {};
  for (const size of SIZES) {
    const png = await resize(size).png().toBuffer();
    pngs[size] = png;
    await writeFile(join(outDir, `icon-${size}.png`), png);
    console.log(`✓ public/icons/icon-${size}.png`);
  }

  // Maskable: supplied icon contained in the safe zone on Core Black.
  const safe = Math.round(512 * SAFE_ZONE_RATIO);
  const icon = await resize(safe).png().toBuffer();
  const maskable = await sharp({
    create: { width: 512, height: 512, channels: 3, background: MASKABLE_BG },
  })
    .composite([{ input: icon, left: Math.round((512 - safe) / 2), top: Math.round((512 - safe) / 2) }])
    .png()
    .toBuffer();
  await writeFile(join(outDir, 'icon-512-maskable.png'), maskable);
  console.log('✓ public/icons/icon-512-maskable.png');

  await writeFile(join(root, 'public', 'favicon.ico'), buildIco([16, 32, 48].map((size) => ({ size, png: pngs[size] }))));
  console.log('✓ public/favicon.ico');

  console.log('\nIcon pipeline complete.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
