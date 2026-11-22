// Photo pipeline for the Optics Archive.
//
//   photos/            ← drop original photos here (git-ignored: originals keep GPS etc.)
//   photos/night/, photos/day/ ← optional: forces a photo into that half of the
//                        gallery; photos at the top level are sorted by their light level
//   public/gallery/    ← generated web copies, metadata stripped (committed)
//   src/data/gallery.json ← generated list + EXIF details the site reads (committed)
//
// Runs automatically inside `npm run dev` (watching photos/) and `npm run build`,
// or by hand with `npm run photos`. When photos/ doesn't exist (e.g. in CI) it
// leaves the committed output alone.

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PHOTOS_DIR = path.join(ROOT, 'photos');
const OUT_DIR = path.join(ROOT, 'public', 'gallery');
const FULL_DIR = path.join(OUT_DIR, 'full');
const THUMB_DIR = path.join(OUT_DIR, 'thumb');
const MANIFEST = path.join(ROOT, 'src', 'data', 'gallery.json');

const PIPELINE_VERSION = 2; // bump to force every photo to be regenerated
const FULL_MAX = 1600;      // long edge of the lightbox image
const THUMB_WIDTH = 540;    // grid thumbnail width (2x a ~270px card)
const PLACEHOLDER_WIDTH = 16;
const INPUT_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif', '.heic', '.heif']);

// ───────────────────────── formatting helpers ─────────────────────────

const LIGHT_SOURCES = {
  1: 'Daylight', 2: 'Fluorescent', 3: 'Tungsten', 4: 'Flash', 9: 'Daylight', 10: 'Cloudy',
  11: 'Shade', 12: 'Fluorescent', 13: 'Fluorescent', 14: 'Fluorescent', 15: 'Fluorescent',
  17: 'Standard A', 18: 'Standard B', 19: 'Standard C', 20: 'D55', 21: 'D65', 22: 'D75', 23: 'D50', 24: 'Tungsten',
};

const first = (v) => (Array.isArray(v) ? v[0] : v);
const num = (v) => {
  const n = Number(first(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};

function formatShutter(t) {
  if (!t) return null;
  return t >= 1 ? `${+t.toFixed(1)}s` : `1/${Math.round(1 / t)}s`;
}

function formatEV(v) {
  const n = Number(first(v));
  if (!Number.isFinite(n) || Math.abs(n) < 0.05) return null;
  return `${n > 0 ? '+' : '−'}${+Math.abs(n).toFixed(1)} EV`;
}

function formatWhiteBalance(exif) {
  const kelvin = num(exif.Temperature ?? exif.ColorTemperature); // XMP (Lightroom, etc.)
  if (kelvin && kelvin > 1000 && kelvin < 50000) return `${Math.round(kelvin)}K`;
  const light = LIGHT_SOURCES[first(exif.LightSource)];
  if (first(exif.WhiteBalance) === 1) return light ? `Manual · ${light}` : 'Manual';
  if (first(exif.WhiteBalance) === 0) return 'Auto';
  return light ?? null;
}

function formatCamera(exif) {
  let make = String(exif.Make ?? '').replace(/\b(corporation|corp\.?|co\.?,? ?ltd\.?|imaging|electronics|optical)\b/gi, '').trim();
  const model = String(exif.Model ?? '').trim();
  if (make && (make === make.toLowerCase() || make === make.toUpperCase()) && make.length > 3) {
    make = make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
  }
  if (!model) return make || null;
  if (!make || model.toLowerCase().startsWith(make.split(' ')[0].toLowerCase())) return model;
  return `${make} ${model}`;
}

function toLocalISO(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function slugify(name) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'photo'
  );
}

// ───────────────────────── pipeline ─────────────────────────

async function readManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  } catch {
    return null;
  }
}

async function writeIfChanged(file, contents) {
  try {
    if ((await fs.readFile(file, 'utf8')) === contents) return false;
  } catch { /* missing */ }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents);
  return true;
}

async function processPhoto(file, slug, libs) {
  const { sharp, exifr } = libs;
  const buf = await fs.readFile(file);
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  const name = `${slug}-${hash}.webp`;

  // GPS is never read; outputs are written without any metadata.
  const exif = (await exifr.parse(buf, {
    gps: false, interop: false, ifd1: false, xmp: true,
    translateValues: false, reviveValues: true, mergeOutput: true,
  }).catch(() => null)) ?? {};

  const base = sharp(buf, { failOn: 'none' }).rotate(); // bake in EXIF orientation

  const full = await base.clone()
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(path.join(FULL_DIR, name));

  const thumb = await base.clone()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 76, effort: 5 })
    .toFile(path.join(THUMB_DIR, name));

  const placeholder = await base.clone()
    .resize({ width: PLACEHOLDER_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();

  const focal35 = num(exif.FocalLengthIn35mmFormat);
  const focal = num(exif.FocalLength);
  const aperture = num(exif.FNumber);
  const iso = num(exif.ISO ?? exif.PhotographicSensitivity ?? exif.ISOSpeedRatings);
  const lens = exif.LensModel ? String(exif.LensModel).trim() : null;

  return {
    id: slug,
    src: `./gallery/full/${name}`,
    thumb: `./gallery/thumb/${name}`,
    width: full.width,
    height: full.height,
    thumbWidth: thumb.width,
    thumbHeight: thumb.height,
    placeholder: `data:image/webp;base64,${placeholder.toString('base64')}`,
    takenAt: toLocalISO(exif.DateTimeOriginal ?? exif.CreateDate),
    exif: {
      camera: formatCamera(exif),
      lens,
      focal: focal35 ? `${focal35}mm` : focal ? `${+focal.toFixed(1)}mm` : null,
      aperture: aperture ? `f/${+aperture.toFixed(1)}` : null,
      shutter: formatShutter(num(exif.ExposureTime)),
      iso: iso ? `ISO ${Math.round(iso)}` : null,
      ev: formatEV(exif.ExposureCompensation ?? exif.ExposureBiasValue),
      wb: formatWhiteBalance(exif),
    },
  };
}

let libsPromise;
function loadLibs() {
  libsPromise ??= Promise.all([import('sharp'), import('exifr')]).then(([s, e]) => ({
    sharp: s.default,
    exifr: e.default ?? e,
  }));
  return libsPromise;
}

/**
 * Sync photos/ → public/gallery/ + src/data/gallery.json.
 * Unchanged photos are skipped, removed photos are pruned.
 */
export async function syncGallery({ log = console.log } = {}) {
  if (!existsSync(PHOTOS_DIR)) {
    if (!existsSync(MANIFEST)) await writeIfChanged(MANIFEST, JSON.stringify({ version: PIPELINE_VERSION, photos: [] }, null, 2) + '\n');
    return { skipped: true };
  }

  const previous = await readManifest();
  const cache = new Map(
    previous?.version === PIPELINE_VERSION ? (previous.photos ?? []).map((p) => [p.source?.file, p]) : []
  );

  const isPhoto = (d) => d.isFile() && !d.name.startsWith('.') && INPUT_EXTS.has(path.extname(d.name).toLowerCase());
  const list = async (sub, light) => {
    const dir = sub ? path.join(PHOTOS_DIR, sub) : PHOTOS_DIR;
    if (!existsSync(dir)) return [];
    return (await fs.readdir(dir, { withFileTypes: true }))
      .filter(isPhoto)
      .map((d) => ({ rel: sub ? `${sub}/${d.name}` : d.name, name: d.name, light }));
  };
  // Top-level photos get light: null (the site decides from the exposure)
  const entries = [...await list('', null), ...await list('night', 'night'), ...await list('day', 'day')]
    .sort((a, b) => a.rel.localeCompare(b.rel));

  await fs.mkdir(FULL_DIR, { recursive: true });
  await fs.mkdir(THUMB_DIR, { recursive: true });

  const usedSlugs = new Set();
  const photos = [];
  let added = 0;
  let failed = 0;

  for (const { rel: fileName, name, light } of entries) {
    const file = path.join(PHOTOS_DIR, fileName);
    const stat = await fs.stat(file);
    const key = `${stat.size}-${Math.round(stat.mtimeMs)}`;

    let slug = slugify(name);
    for (let i = 2; usedSlugs.has(slug); i++) slug = `${slugify(name)}-${i}`;
    usedSlugs.add(slug);

    const cached = cache.get(fileName);
    if (
      cached && cached.source?.key === key && cached.id === slug &&
      existsSync(path.join(OUT_DIR, cached.src.replace('./gallery/', ''))) &&
      existsSync(path.join(OUT_DIR, cached.thumb.replace('./gallery/', '')))
    ) {
      photos.push({ ...cached, light });
      continue;
    }

    try {
      const libs = await loadLibs();
      const entry = await processPhoto(file, slug, libs);
      entry.takenAt ??= toLocalISO(stat.mtime);
      entry.light = light;
      entry.source = { file: fileName, key };
      photos.push(entry);
      added++;
      log(`  ✓ ${fileName}  ${[entry.exif.iso, entry.exif.shutter, entry.exif.aperture, entry.exif.focal].filter(Boolean).join(' · ')}`);
    } catch (err) {
      failed++;
      const hint = /\.hei[cf]$/i.test(fileName) ? ' (HEIC isn\'t supported here — export it as JPEG)' : '';
      log(`  ✗ ${fileName}: ${err.message}${hint}`);
    }
  }

  // Newest first
  photos.sort((a, b) => (b.takenAt ?? '').localeCompare(a.takenAt ?? '') || a.id.localeCompare(b.id));

  // Prune web copies that no longer belong to any photo (public/gallery is fully generated)
  const keep = new Set(photos.flatMap((p) => [path.basename(p.src), path.basename(p.thumb)]));
  let removed = 0;
  for (const dir of [FULL_DIR, THUMB_DIR]) {
    for (const f of await fs.readdir(dir)) {
      if (f.endsWith('.webp') && !keep.has(f)) {
        await fs.unlink(path.join(dir, f));
        removed++;
      }
    }
  }

  const changed = await writeIfChanged(MANIFEST, JSON.stringify({ version: PIPELINE_VERSION, photos }, null, 2) + '\n');
  if (added || removed || failed || changed) {
    log(`[gallery] ${photos.length} photos (${added} processed, ${removed / 2 | 0} removed${failed ? `, ${failed} failed` : ''})`);
  }
  return { photos: photos.length, added, removed, failed };
}

/** Vite plugin: syncs on startup/build and live-updates while `npm run dev` is running. */
export function galleryPlugin() {
  let running = null;
  let again = false;
  let timer = null;

  const run = (log) => {
    if (running) {
      again = true;
      return running;
    }
    running = syncGallery({ log })
      .catch((err) => log(`[gallery] ${err.stack || err}`))
      .finally(() => {
        running = null;
        if (again) {
          again = false;
          run(log);
        }
      });
    return running;
  };

  return {
    name: 'sloboz-gallery',
    async buildStart() {
      await run(console.log);
    },
    configureServer(server) {
      const log = (m) => server.config.logger.info(m, { timestamp: true });
      server.watcher.add(PHOTOS_DIR);
      const onFsEvent = (file) => {
        if (!path.resolve(file).startsWith(PHOTOS_DIR + path.sep)) return;
        clearTimeout(timer);
        timer = setTimeout(() => run(log), 400); // batch multi-file drops
      };
      server.watcher.on('add', onFsEvent);
      server.watcher.on('change', onFsEvent);
      server.watcher.on('unlink', onFsEvent);
    },
  };
}

// `npm run photos`
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!existsSync(PHOTOS_DIR)) {
    console.log('No photos/ folder found. Create it and drop your photos in.');
  } else {
    syncGallery().then((r) => console.log(`[gallery] done: ${r.photos} photos`));
  }
}
