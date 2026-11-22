// Optics: a pin board. Every photo is a print stuck to a dark wall with a pin
// or a strip of tape, scattered at a slight angle. Drag (or scroll) to move
// around the wall; a small map in the corner shows where you are.
//
// Prints are sorted into two clusters by how much light the scene had (EV,
// worked out from ISO, shutter and aperture): night shots on instant film with
// a handwritten caption, day shots as plain glossy prints. The layout is seeded
// from each photo's id, so it stays the same between visits.
import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Moon, Sun, Move, ZoomIn, ZoomOut } from 'lucide-react';
// Generated from the photos/ folder by scripts/gallery.mjs — don't edit by hand.
import gallery from '../data/gallery.json';

const NIGHT_EV = 10;      // scenes darker than this count as night
const PRINT_W = 190;      // base print width in px (before each print's own scale)
const MAX_PRINT_H = 380;  // tall photos are cropped to this
const CELL_W = 290;       // grid cell a print is scattered inside
const CELL_H = 520;
const MARGIN = 190;       // empty wall around the prints
const GROUP_GAP = 160;    // between the night and day clusters
const PHONE_ZOOM = 0.62;
const PULL_MS = 280;      // the print curling off the wall before the lightbox takes it
const TOP_Y = 60;         // wall y the view lines up with when showing a cluster (just above its label)

// ───────────────────────── exposure maths ─────────────────────────

const numIn = (s) => {
  const m = String(s ?? '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
};

function shutterSeconds(s) {
  if (!s) return null;
  const frac = s.match(/^1\/([\d.]+)/);
  if (frac) return 1 / parseFloat(frac[1]);
  return numIn(s);
}

// Scene brightness at ISO 100: EV100 = log2(N² / t) − log2(ISO / 100)
function sceneEV(exif) {
  const N = numIn(exif.aperture), t = shutterSeconds(exif.shutter), iso = numIn(exif.iso);
  if (!N || !t || !iso) return null;
  return Math.log2((N * N) / t) - Math.log2(iso / 100);
}

function formatDate(takenAt, withTime = false) {
  if (!takenAt) return null;
  const [y, m, d] = takenAt.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: withTime ? undefined : 'numeric' });
  return withTime && takenAt.length > 15 ? `${date} · ${takenAt.slice(11, 16)}` : date;
}

const altText = (photo) => {
  const date = formatDate(photo.takenAt);
  const when = photo.light === 'night' ? 'Night photo' : 'Day photo';
  return date ? `${when} taken ${date}` : when;
};

const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ───────────────────────── seeded scatter ─────────────────────────

// Small deterministic random from a string, so every print keeps its spot and tilt
function rng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const PIN_COLORS = ['accent', 'red', 'yellow', 'white'];

// Night first, darkest to brightest; the folder override (photos/night, photos/day) wins over the EV guess
const photos = gallery.photos
  .map((p) => {
    const ev = sceneEV(p.exif);
    const light = p.light ?? (ev != null && ev < NIGHT_EV ? 'night' : 'day');
    return { ...p, ev, light };
  })
  .sort((a, b) =>
    (a.light === b.light ? 0 : a.light === 'night' ? -1 : 1) ||
    (a.ev ?? 99) - (b.ev ?? 99) ||
    (a.takenAt ?? '').localeCompare(b.takenAt ?? '')
  );

const nightCount = photos.filter((p) => p.light === 'night').length;

// Each cluster is a loose grid: alternate columns drop by a third of a cell and every
// print wanders inside its cell, tilts a few degrees and is held up its own way.
function layoutWall() {
  const rows = Math.max(1, Math.round(Math.sqrt(photos.length / 2.2)));
  const groups = [photos.slice(0, nightCount), photos.slice(nightCount)].filter((g) => g.length);
  const placed = [];
  const clusters = [];
  let x = MARGIN;
  let idx = 0;

  for (const group of groups) {
    const cols = Math.ceil(group.length / rows);
    const light = group[0].light;
    const evs = group.map((p) => p.ev).filter((v) => v != null);
    const range = evs.length ? [Math.min(...evs), Math.max(...evs)].map((v) => v.toFixed(1)) : null;
    clusters.push({ light, x, w: cols * CELL_W, count: group.length, range: range && (range[0] === range[1] ? `EV ${range[0]}` : `EV ${range[0]}–${range[1]}`) });
    group.forEach((p, k) => {
      const col = Math.floor(k / rows), row = k % rows;
      const r = rng(p.id);
      const scale = 0.86 + r() * 0.3;
      const w = Math.round(PRINT_W * scale);
      const imgH = Math.min(Math.round(MAX_PRINT_H * scale), Math.round(w * (p.thumbHeight / p.thumbWidth)));
      const film = light === 'night';
      // Instant film has a deep bottom border for the caption, glossy prints a thin one
      const h = imgH + (film ? 66 : 20);
      const cellX = x + col * CELL_W, cellY = MARGIN + row * CELL_H + (col % 2 ? CELL_H * 0.33 : 0);
      const mount = r();
      placed.push({
        p,
        idx: idx++,
        film,
        w,
        imgH,
        h,
        x: Math.round(cellX + (CELL_W - w) / 2 + (r() - 0.5) * 80),
        y: Math.round(cellY + (CELL_H - h) / 2 + (r() - 0.5) * 100),
        rot: +((r() - 0.5) * 13).toFixed(2),
        // pin, a strip of tape across the top, or tape on two corners
        mount: mount < 0.42 ? 'pin' : mount < 0.75 ? 'tape' : 'corners',
        pin: PIN_COLORS[Math.floor(r() * PIN_COLORS.length)],
        tapeRot: +((r() - 0.5) * 14).toFixed(1),
      });
    });
    x += cols * CELL_W + GROUP_GAP;
  }

  const width = x - GROUP_GAP + MARGIN;
  const height = MARGIN * 2 + rows * CELL_H + (groups.some((g) => Math.ceil(g.length / rows) > 1) ? CELL_H * 0.33 : 0);
  return { prints: placed, clusters, width, height };
}

const WALL = layoutWall();

// ───────────────────────── pieces ─────────────────────────

function Thumb({ photo, eager }) {
  const [loaded, setLoaded] = useState(false);
  // Cached images can finish before React attaches onLoad
  const ref = useCallback((img) => {
    if (img?.complete && img.naturalWidth) setLoaded(true);
  }, []);
  return (
    <img
      ref={ref}
      src={photo.thumb}
      alt={altText(photo)}
      width={photo.thumbWidth}
      height={photo.thumbHeight}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={loaded ? 'is-loaded' : undefined}
      onLoad={() => setLoaded(true)}
    />
  );
}

// state: 'pulling' (coming off the wall), 'off' (in the lightbox), 'back' (just pinned back up)
function Print({ item, state, onOpen, onFocus }) {
  const { p, idx, film, w, imgH, x, y, rot, mount, pin, tapeRot } = item;
  const caption = film ? formatDate(p.takenAt, true) : null;
  const settings = [p.exif.iso, p.exif.shutter?.replace(/s$/, ''), p.exif.aperture].filter(Boolean).join(' · ');
  const copy = <img className="is-loaded" src={p.thumb} alt="" draggable={false} decoding="async" />;
  const face = (img) => (
    <>
      <span className="print-img" style={{ height: imgH, backgroundImage: `url(${p.placeholder})` }}>{img}</span>
      {film ? (
        <span className="print-note">
          {caption}
          <em>{p.ev != null ? `EV ${p.ev.toFixed(1)}` : settings}</em>
        </span>
      ) : (
        <span className="print-back">{pad(idx + 1)} · {settings}</span>
      )}
    </>
  );
  return (
    <button
      type="button"
      className={`print print--${film ? 'film' : 'gloss'} print--${mount}${state ? ` is-${state}` : ''}`}
      style={{ left: x, top: y, width: w, '--rot': `${rot}deg`, '--tape-rot': `${tapeRot}deg`, '--i': Math.min(idx + 1, 10) }}
      onClick={(e) => onOpen(idx, e.currentTarget)}
      onFocus={() => onFocus(item)}
      aria-label={`Open ${altText(p).toLowerCase()}`}
    >
      <span className="print-face">{face(<Thumb photo={p} eager={idx < 16} />)}</span>
      {/* The bottom third again on its own hinge, and its bottom half on a second one, so
          the paper bends off the wall in a curve when you pick at it */}
      <span className="print-flap" aria-hidden="true">
        <span className="print-flap-inner">{face(copy)}</span>
        <span className="print-flap print-flap--tip">
          <span className="print-flap-inner">{face(copy)}</span>
        </span>
      </span>
      {mount === 'pin' && <span className={`pin pin--${pin}`} aria-hidden="true" />}
      {mount === 'tape' && <span className="tape tape--top" aria-hidden="true" />}
      {mount === 'corners' && (
        <>
          <span className="tape tape--tl" aria-hidden="true" />
          <span className="tape tape--tr" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

// The wall shrunk into a corner: one dot per print and a box for what's in view
function MiniMap({ view, onJump }) {
  const S = 150 / WALL.width;
  const ref = useRef(null);
  const jumpTo = (e) => {
    const r = ref.current.getBoundingClientRect();
    // r is in screen pixels (the panel is CSS-3D transformed); work in fractions of the map
    onJump(((e.clientX - r.left) / r.width) * WALL.width, ((e.clientY - r.top) / r.height) * WALL.height);
  };
  return (
    <div
      ref={ref}
      className="wall-map"
      style={{ width: WALL.width * S, height: WALL.height * S }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        jumpTo(e);
      }}
      onPointerMove={(e) => e.buttons && jumpTo(e)}
      aria-hidden="true"
    >
      {WALL.prints.map((it) => (
        <span
          key={it.p.id}
          className={`wall-map-dot wall-map-dot--${it.p.light}`}
          style={{ left: it.x * S, top: it.y * S, width: it.w * S, height: it.h * S, transform: `rotate(${it.rot}deg)` }}
        />
      ))}
      <span
        className="wall-map-view"
        style={{ left: view.x * S, top: view.y * S, width: Math.min(view.w, WALL.width) * S, height: Math.min(view.h, WALL.height) * S }}
      />
    </div>
  );
}

// The print as it sits in the lightbox: as large as the window allows next to the
// info card (or above it on a phone), paper border included.
function fitPrint(photo) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const film = photo.light === 'night';
  const side = film ? 14 : 10, bottom = film ? 78 : 32;
  const wide = vw >= 900;
  const maxW = wide ? vw - 320 - 64 - 2 * 72 : vw - 40;
  const maxH = wide ? vh - 2 * 64 : vh * 0.6;
  const ar = photo.width / photo.height;
  let w = maxW - 2 * side, h = w / ar;
  const hMax = maxH - side - bottom;
  if (h > hMax) { h = hMax; w = h * ar; }
  return { w: Math.round(w), h: Math.round(h) };
}

const tilt = (idx) => ((idx * 37) % 5 - 2) * 0.45; // a hand never holds a print quite straight
const strip = (v, re) => (v ? String(v).replace(re, '').trim() : null);

// ───────────────────────── colours from the photo ─────────────────────────

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

const hsl = (h, s, l) => `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
const paletteCache = new Map();

// Shrink the thumbnail onto a canvas, bucket its pixels and read off the main colours:
// five swatches, a vivid accent for text and highlights, and a deep base for the screen.
function loadPalette(photo) {
  if (paletteCache.has(photo.id)) return paletteCache.get(photo.id);
  const job = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const W = 36, H = Math.max(8, Math.round((W * img.naturalHeight) / img.naturalWidth));
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, W, H);
        const px = ctx.getImageData(0, 0, W, H).data;
        const buckets = new Map();
        for (let i = 0; i < px.length; i += 4) {
          const key = ((px[i] >> 5) << 6) | ((px[i + 1] >> 5) << 3) | (px[i + 2] >> 5);
          let b = buckets.get(key);
          if (!b) buckets.set(key, (b = { n: 0, r: 0, g: 0, b: 0 }));
          b.n++; b.r += px[i]; b.g += px[i + 1]; b.b += px[i + 2];
        }
        const cols = [...buckets.values()]
          .map((b) => {
            const c = { n: b.n, r: b.r / b.n, g: b.g / b.n, b: b.b / b.n };
            c.hsl = rgbToHsl(c.r, c.g, c.b);
            return c;
          })
          .sort((a, b) => b.n - a.n);

        const swatches = [];
        for (const c of cols) {
          if (swatches.every((s) => Math.hypot(s.r - c.r, s.g - c.g, s.b - c.b) > 48)) swatches.push(c);
          if (swatches.length === 5) break;
        }

        // Accent: colourful, not too dark or blown out, and covering a fair part of the frame
        let accent = cols[0], best = -1;
        for (const c of cols) {
          const [, s, l] = c.hsl;
          if (l < 0.16 || l > 0.92) continue;
          const score = s * (1 - Math.abs(l - 0.55)) * Math.pow(c.n / (W * H), 0.35);
          if (score > best) { best = score; accent = c; }
        }
        const [ah, as] = accent.hsl;
        const [bh, bs] = cols[0].hsl;
        const grey = as < 0.12; // don't invent a colour for a black-and-white-ish photo
        resolve({
          swatches: swatches.sort((a, b) => a.hsl[2] - b.hsl[2]).map((c) => `rgb(${c.r | 0} ${c.g | 0} ${c.b | 0})`),
          accent: hsl(ah, grey ? as : clamp(as, 0.4, 0.85), 0.74),
          glow: hsl(ah, grey ? as : clamp(as, 0.45, 0.9), 0.5),
          base: hsl(bh, Math.min(bs, 0.4), 0.075),
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = photo.thumb;
  });
  paletteCache.set(photo.id, job);
  return job;
}

// ───────────────────────── zoomable photo ─────────────────────────

const MAX_ZOOM = 4;

// Scroll or pinch to zoom around the pointer, drag to look around, click (or tap)
// to jump in to 2.5× and back out; + / − / 0 on the keyboard.
function ZoomPhoto({ photo, w, h }) {
  const boxRef = useRef(null);
  const imgRef = useRef(null);
  const z = useRef({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const [level, setLevel] = useState(1);
  const [panning, setPanning] = useState(false);

  const write = useCallback((s, x, y, animate) => {
    s = clamp(s, 1, MAX_ZOOM);
    x = clamp(x, w - w * s, 0);
    y = clamp(y, h - h * s, 0);
    z.current = { s, x, y };
    const img = imgRef.current;
    if (!img) return;
    img.style.transition = animate ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    img.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    setLevel(s);
  }, [w, h]);

  // Zoom to s2 keeping the photo point under (px, py) where it is
  const zoomAt = useCallback((s2, px, py, animate) => {
    const { s, x, y } = z.current;
    const k = clamp(s2, 1, MAX_ZOOM) / s;
    write(s * k, px - (px - x) * k, py - (py - y) * k, animate);
  }, [write]);

  // Pointer position in the photo's own pixels (the print is tilted and may still be flying in)
  const local = (cx, cy) => {
    const r = boxRef.current.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * w, y: ((cy - r.top) / r.height) * h };
  };

  useEffect(() => { write(1, 0, 0, false); }, [write]); // start fresh when the size changes

  useEffect(() => {
    const box = boxRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      // trackpad pinches arrive as small ctrl+wheel steps
      zoomAt(z.current.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)), p.x, p.y, false);
    };
    const onKey = (e) => {
      if (e.key === '+' || e.key === '=') zoomAt(z.current.s * 1.5, w / 2, h / 2, true);
      else if (e.key === '-' || e.key === '_') zoomAt(z.current.s / 1.5, w / 2, h / 2, true);
      else if (e.key === '0') write(1, 0, 0, true);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      box.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }); // re-bound each render so it always sees the current size

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const { s, x, y } = z.current;
    if (pts.length === 1) {
      gesture.current = { type: 'pan', sx: pts[0].x, sy: pts[0].y, ox: x, oy: y, moved: false };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ox: x, oy: y, moved: true };
    }
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
    startGesture();
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    if (g.type === 'pan') {
      const dx = pts[0].x - g.sx, dy = pts[0].y - g.sy;
      if (!g.moved && Math.hypot(dx, dy) > 4) { g.moved = true; setPanning(true); }
      if (g.moved && z.current.s > 1) write(z.current.s, g.ox + dx, g.oy + dy, false);
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      const s2 = clamp((g.s0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0, 1, MAX_ZOOM);
      const k = s2 / g.s0;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      write(s2, mx - (g.mx - g.ox) * k, my - (g.my - g.oy) * k, false);
    }
  };

  const onPointerUp = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) { startGesture(); gesture.current.moved = true; return; }
    gesture.current = null;
    setPanning(false);
    if (g?.type === 'pan' && !g.moved && e.type === 'pointerup') {
      if (z.current.s > 1.05) write(1, 0, 0, true);
      else zoomAt(2.5, p.x, p.y, true);
    }
  };

  const zoomed = level > 1.01;
  return (
    <div
      ref={boxRef}
      className={`lb-photo${zoomed ? ' is-zoomed' : ''}${panning ? ' is-panning' : ''}`}
      style={{ width: w, height: h, backgroundImage: `url(${photo.placeholder})` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img ref={imgRef} src={photo.src} alt={altText(photo)} width={photo.width} height={photo.height} draggable={false} />
      <div className="lb-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoomAt(z.current.s / 1.5, w / 2, h / 2, true)} disabled={!zoomed} aria-label="Zoom out"><ZoomOut size={13} /></button>
        <button type="button" className="lb-zoom-level" onClick={() => write(1, 0, 0, true)} aria-label="Reset zoom">
          {zoomed ? `${level.toFixed(1)}×` : <><span className="hint-fine">scroll to zoom</span><span className="hint-touch">pinch to zoom</span></>}
        </button>
        <button type="button" onClick={() => zoomAt(z.current.s * 1.5, w / 2, h / 2, true)} disabled={level >= MAX_ZOOM - 0.01} aria-label="Zoom in"><ZoomIn size={13} /></button>
      </div>
    </div>
  );
}

// ───────────────────────── lightbox ─────────────────────────

function Lightbox({ index, origin, onClose, onStep, onJump }) {
  const photo = photos[index];
  const film = photo.light === 'night';
  const printRef = useRef(null);
  const stripRef = useRef(null);
  const firstId = useRef(photo.id);
  const [, relayout] = useState(0);
  const [pal, setPal] = useState(null);
  const { w, h } = fitPrint(photo);
  const rot = tilt(index);
  const [y, mo, d] = (photo.takenAt ?? '').slice(0, 10).split('-').map(Number);
  const day = photo.takenAt ? new Date(y, mo - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Undated';
  const time = photo.takenAt?.length > 15 ? photo.takenAt.slice(11, 16) : null;
  const specs = [
    ['ISO', strip(photo.exif.iso, /^ISO\s*/i)],
    ['Shutter', photo.exif.shutter],
    ['Aperture', photo.exif.aperture],
    ['Focal length', photo.exif.focal],
    ['Exposure', photo.exif.ev],
    ['White balance', photo.exif.wb],
  ].filter(([, v]) => v);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    const onResize = () => relayout((n) => n + 1);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [onClose, onStep]);

  // This photo's colours (the previous ones stay until they're ready, then blend over),
  // and warm the neighbours' photos and colours so stepping through feels instant
  useEffect(() => {
    let live = true;
    loadPalette(photo).then((p) => { if (live && p) setPal(p); });
    [1, -1].forEach((dd) => {
      const n = photos[(index + dd + photos.length) % photos.length];
      new Image().src = n.src;
      loadPalette(n);
    });
    // keep the current thumbnail in the middle of the strip
    const s = stripRef.current, el = s?.children[index];
    if (s && el) s.scrollTo({ left: el.offsetLeft - (s.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
    return () => { live = false; };
  }, [index, photo]);

  // Fly the print from where it hung on the wall to its place here
  useLayoutEffect(() => {
    const el = printRef.current;
    if (!el || !origin) return;
    const r = el.getBoundingClientRect();
    const dx = origin.x + origin.w / 2 - (r.left + r.width / 2);
    const dy = origin.y + origin.h / 2 - (r.top + r.height / 2);
    const s = Math.max(0.05, origin.w / r.width);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${origin.rot}deg) scale(${s})` },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 30}px) rotate(${origin.rot * 0.3}deg) scale(${s + (1 - s) * 0.75})`, offset: 0.55 },
        { transform: `translate(0, 0) rotate(${rot}deg) scale(1)` },
      ],
      { duration: 720, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const swapped = !origin || photo.id !== firstId.current;
  const colours = pal ? { '--lb-accent': pal.accent, '--lb-glow': pal.glow, '--lb-base': pal.base } : undefined;

  // Portal to <body>: inside drei's CSS-3D transform, position: fixed would be
  // relative to the tilted monitor instead of the viewport.
  return createPortal(
    <div className={`lightbox lightbox--${photo.light}`} style={colours} role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${photos.length}`} onClick={onClose}>
      <div key={photo.id} className="lb-backdrop" style={{ backgroundImage: `url(${photo.thumb})` }} aria-hidden="true" />

      <button className="lb-close" onClick={onClose} autoFocus>
        <X size={15} />
        <span>Close</span>
      </button>

      <div className="lb-stage">
        <figure
          key={photo.id}
          ref={printRef}
          className={`lb-print lb-print--${film ? 'film' : 'gloss'}${swapped ? ' is-swap' : ''}`}
          style={{ transform: `rotate(${rot}deg)` }}
          onClick={(e) => e.stopPropagation()}
        >
          <ZoomPhoto photo={photo} w={w} h={h} />
          {film ? (
            <figcaption className="lb-note">
              {formatDate(photo.takenAt, true) ?? 'after dark'}
              {photo.ev != null && <em>EV {photo.ev.toFixed(1)}</em>}
            </figcaption>
          ) : (
            <figcaption className="lb-stamp">{pad(index + 1)} · {[photo.exif.iso, photo.exif.shutter, photo.exif.aperture].filter(Boolean).join(' · ')}</figcaption>
          )}
        </figure>

        <aside className="lb-card" onClick={(e) => e.stopPropagation()}>
          <div className="lb-card-top">
            <span className="lb-count">{pad(index + 1)} <i>/</i> {pad(photos.length)}</span>
            <span className="lb-light" aria-label={film ? 'Night photo' : 'Day photo'}>
              {film ? <Moon size={14} strokeWidth={1.75} /> : <Sun size={14} strokeWidth={1.75} />}
            </span>
          </div>

          <div key={photo.id} className="lb-info">
            <h3 className="lb-day">{day}</h3>
            <p className="lb-sub">{[time, photo.exif.camera, photo.exif.lens].filter(Boolean).join(' · ')}</p>
          </div>

          <div className="lb-swatches" aria-label="Main colours in this photo">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} style={{ background: pal?.swatches[i] ?? 'transparent' }} title={pal?.swatches[i]} />
            ))}
          </div>

          {specs.length > 0 && (
            <dl key={`specs-${photo.id}`} className="lb-specs">
              {specs.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}

          {photos.length > 1 && (
            <>
              <div className="lb-strip" ref={stripRef}>
                {photos.map((q, i) => (
                  <button key={q.id} type="button" className={i === index ? 'is-current' : undefined} onClick={() => onJump(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index || undefined}>
                    <img src={q.thumb} alt="" loading="lazy" decoding="async" draggable={false} />
                  </button>
                ))}
              </div>
              <div className="lb-steps">
                <button type="button" onClick={() => onStep(-1)} aria-label="Previous photo"><ChevronLeft size={16} />Prev</button>
                <button type="button" onClick={() => onStep(1)} aria-label="Next photo">Next<ChevronRight size={16} /></button>
              </div>
            </>
          )}
          <p className="lb-keys">← → browse · + − zoom · esc close</p>
        </aside>
      </div>
    </div>,
    document.body
  );
}

// ───────────────────────── the wall ─────────────────────────

export default function OpticsArchive() {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false); // hides the "drag to look around" hint
  const viewportRef = useRef(null);
  const wallRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const size = useRef({ w: 1, h: 1, z: 1 });
  const glide = useRef(0);
  const drag = useRef(null);
  const suppressClick = useRef(false);

  // Clicking a print pulls it off the wall: the pin pops or the tape peels, the print
  // curls up towards you, then flies into the lightbox from where it hung. Closing pins
  // the photo you were last looking at back up.
  const [pulling, setPulling] = useState(null);
  const [back, setBack] = useState(null);
  const [origin, setOrigin] = useState(null);
  const pullTimer = useRef(0);
  const backTimer = useRef(0);
  useEffect(() => () => { clearTimeout(pullTimer.current); clearTimeout(backTimer.current); }, []);

  const open = useCallback((idx, el) => {
    if (pullTimer.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lift = () => {
      pullTimer.current = 0;
      const r = el?.getBoundingClientRect();
      setOrigin(r && !reduced ? { x: r.left, y: r.top, w: r.width, h: r.height, rot: WALL.prints[idx]?.rot ?? 0 } : null);
      setPulling(null);
      setSelected(idx);
    };
    if (reduced) { lift(); return; }
    setPulling(idx);
    pullTimer.current = setTimeout(lift, PULL_MS);
  }, []);

  const selectedRef = useRef(null);
  selectedRef.current = selected;
  const close = useCallback(() => {
    setBack(selectedRef.current);
    clearTimeout(backTimer.current);
    backTimer.current = setTimeout(() => setBack(null), 900);
    setSelected(null);
    setOrigin(null);
  }, []);
  const step = useCallback((d) => setSelected((i) => (i + d + photos.length) % photos.length), []);

  // The wall moves by a transform written straight to the DOM; React only hears
  // about it (for the map and the Night/Day switch) once per frame at most.
  const publish = useRef(0);
  const apply = useCallback((x, y) => {
    const { w, h, z } = size.current;
    const W = WALL.width * z, H = WALL.height * z;
    // A wall smaller than the view sits centred and doesn't move on that axis
    const nx = W <= w ? (w - W) / 2 : clamp(x, w - W, 0);
    const ny = H <= h ? (h - H) / 2 : clamp(y, h - H, 0);
    pos.current = { x: nx, y: ny };
    if (wallRef.current) wallRef.current.style.transform = `translate3d(${nx}px, ${ny}px, 0) scale(${z})`;
    cancelAnimationFrame(publish.current);
    publish.current = requestAnimationFrame(() => setView({ x: -nx / z, y: -ny / z, w: w / z, h: h / z }));
    return pos.current;
  }, []);

  const stopGlide = () => cancelAnimationFrame(glide.current);

  // Ease to a wall position (used by the map, the switch and keyboard focus)
  const panTo = useCallback((tx, ty, instant = false) => {
    stopGlide();
    if (instant) { apply(tx, ty); return; }
    const from = { ...pos.current };
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 650);
      const e = 1 - Math.pow(1 - k, 4);
      apply(from.x + (tx - from.x) * e, from.y + (ty - from.y) * e);
      if (k < 1) glide.current = requestAnimationFrame(tick);
    };
    glide.current = requestAnimationFrame(tick);
  }, [apply]);

  // Centre a wall point in the view
  const lookAt = useCallback((wx, wy, instant) => {
    const { w, h, z } = size.current;
    panTo(w / 2 - wx * z, h / 2 - wy * z, instant);
  }, [panTo]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let first = true;
    const fit = () => {
      // Phones see the wall from further back
      const z = vp.clientWidth < 600 ? PHONE_ZOOM : 1;
      size.current = { w: vp.clientWidth, h: vp.clientHeight, z };
      if (first) {
        first = false;
        // Start at the top of the first cluster, nudged left so the next one peeks in
        const c = WALL.clusters[0];
        lookAt(c.x + c.w / 2 + (z === 1 ? size.current.w * 0.22 : 0), TOP_Y + size.current.h / (2 * z), true);
      } else apply(pos.current.x, pos.current.y);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(vp);
    fit();

    // Wheel and trackpad pan the wall; shift turns a vertical wheel sideways
    const onWheel = (e) => {
      e.preventDefault();
      stopGlide();
      setMoved(true);
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      apply(pos.current.x - dx, pos.current.y - dy);
    };
    // A soft light follows the cursor across the wall
    const onMove = (e) => {
      const r = vp.getBoundingClientRect();
      vp.style.setProperty('--lx', `${((e.clientX - r.left) / r.width) * 100}%`);
      vp.style.setProperty('--ly', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('pointermove', onMove);
    return () => {
      ro.disconnect();
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('pointermove', onMove);
      stopGlide();
      cancelAnimationFrame(publish.current);
    };
  }, [apply, lookAt]);

  // ── drag to pan, with a little momentum when you let go ──
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    stopGlide();
    const vp = viewportRef.current;
    // Screen pixels per wall pixel: the panel is scaled by its CSS-3D transform
    const scale = vp.getBoundingClientRect().width / vp.offsetWidth || 1;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.current.x, oy: pos.current.y, scale, active: false, samples: [] };
    suppressClick.current = false;
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = (e.clientX - d.sx) / d.scale, dy = (e.clientY - d.sy) / d.scale;
    if (!d.active) {
      if (Math.hypot(dx, dy) < 5) return; // still a click
      d.active = true;
      suppressClick.current = true;
      viewportRef.current.setPointerCapture(e.pointerId);
      setDragging(true);
      setMoved(true);
    }
    const p = apply(d.ox + dx, d.oy + dy);
    d.samples.push({ t: performance.now(), x: p.x, y: p.y });
    if (d.samples.length > 5) d.samples.shift();
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    setDragging(false);
    const s = d.samples;
    if (s.length < 2) return;
    const a = s[0], b = s[s.length - 1];
    const dt = b.t - a.t;
    if (dt <= 0 || performance.now() - b.t > 80) return; // held still before letting go
    let vx = ((b.x - a.x) / dt) * 16, vy = ((b.y - a.y) / dt) * 16;
    const tick = () => {
      vx *= 0.92; vy *= 0.92;
      if (Math.hypot(vx, vy) < 0.3) return;
      apply(pos.current.x + vx, pos.current.y + vy);
      glide.current = requestAnimationFrame(tick);
    };
    glide.current = requestAnimationFrame(tick);
  };

  // A drag that started on a print shouldn't open it
  const onClickCapture = (e) => {
    if (suppressClick.current) {
      e.stopPropagation();
      e.preventDefault();
      suppressClick.current = false;
    }
  };

  const onKeyDown = (e) => {
    const k = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!k || selected !== null || e.target.closest('.print')) return;
    e.preventDefault();
    setMoved(true);
    panTo(pos.current.x + k[0] * 220, pos.current.y + k[1] * 220);
  };

  // Tabbing to a print brings it into view
  const focusPrint = useCallback((it) => {
    const { w, h, z } = size.current;
    const left = it.x * z + pos.current.x, top = it.y * z + pos.current.y;
    if (left > 20 && top > 20 && left + it.w * z < w - 20 && top + it.h * z < h - 20) return;
    lookAt(it.x + it.w / 2, it.y + it.h / 2);
  }, [lookAt]);

  const jump = (light) => {
    const c = WALL.clusters.find((cl) => cl.light === light);
    if (c) { setMoved(true); lookAt(c.x + c.w / 2, TOP_Y + size.current.h / (2 * size.current.z)); }
  };

  // Which cluster is in the middle of the view lights up its half of the switch
  const zone = useMemo(() => {
    const mid = view.x + view.w / 2;
    let best = WALL.clusters[0]?.light ?? 'night', bestD = Infinity;
    WALL.clusters.forEach((c) => {
      const d = Math.abs(c.x + c.w / 2 - mid);
      if (d < bestD) { bestD = d; best = c.light; }
    });
    return best;
  }, [view]);

  if (photos.length === 0) {
    return (
      <section className="optics">
        <p className="mono" style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
          No photos yet. Drop some into the photos/ folder.
        </p>
      </section>
    );
  }

  const days = photos.length - nightCount;

  return (
    <section className="optics">
      <header className="optics-head reveal">
        <div className="optics-title">
          <h2 className="display">Optics</h2>
          <p>Pin board · {photos.length} prints · {nightCount} after dark, {days} in daylight</p>
        </div>
        <div className="optics-switch" role="group" aria-label="Move the wall to the night or day prints">
          <button type="button" aria-pressed={zone === 'night'} disabled={!nightCount} onClick={() => jump('night')}>
            <Moon size={13} strokeWidth={1.75} />Night<em>{pad(nightCount)}</em>
          </button>
          <button type="button" aria-pressed={zone === 'day'} disabled={!days} onClick={() => jump('day')}>
            <Sun size={13} strokeWidth={1.75} />Day<em>{pad(days)}</em>
          </button>
        </div>
      </header>

      <div
        ref={viewportRef}
        className={`wall-view reveal${dragging ? ' is-dragging' : ''}`}
        tabIndex={0}
        aria-label="Photo wall. Drag, scroll or use the arrow keys to move around."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        style={{ '--i': 2 }}
      >
        <div ref={wallRef} className="wall" style={{ width: WALL.width, height: WALL.height }}>
          {WALL.clusters.map((c) => (
            <div key={c.light} className={`wall-cluster wall-cluster--${c.light}`} style={{ left: c.x - 70, width: c.w + 140 }} aria-hidden="true">
              <span className="wall-label">
                {c.light === 'night' ? <Moon size={13} strokeWidth={2} /> : <Sun size={13} strokeWidth={2} />}
                {c.light === 'night' ? 'after dark' : 'daylight'}
                {c.range && <em>{c.range}</em>}
              </span>
            </div>
          ))}
          {WALL.prints.map((it) => (
            <Print
              key={it.p.id}
              item={it}
              state={it.idx === pulling ? 'pulling' : it.idx === selected ? 'off' : it.idx === back ? 'back' : null}
              onOpen={open}
              onFocus={focusPrint}
            />
          ))}
        </div>

        <div className={`wall-hint${moved ? ' is-gone' : ''}`} aria-hidden="true">
          <Move size={13} strokeWidth={1.75} />drag to look around
        </div>
        <MiniMap view={view} onJump={(wx, wy) => { setMoved(true); lookAt(wx, wy, true); }} />
      </div>

      {selected !== null && photos[selected] && <Lightbox index={selected} origin={origin} onClose={close} onStep={step} onJump={setSelected} />}
    </section>
  );
}
