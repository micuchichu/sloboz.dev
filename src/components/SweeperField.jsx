// The board behind the Minesweeper panel. It runs a little past the panel's
// edges, a few players dig and flag on it, and every so often one of them flies
// off to another part of the board. Click a player to knock it out: it respawns
// at the launcher on the panel's corner and flies back to where it fell.
//
// The board is one canvas (drawn only when something changes, plus the flag
// waving); the players are buttons moved by one rAF loop. Game pieces from the
// game's own sprite sheets lie along the panel's edges.
import React, { useEffect, useMemo, useRef } from 'react';
import { usePalette } from '../lib/palettes';

const SPRITES = './minesweeper/sprites/';
const DPR = 2;

// the game's own number colours (ui/theme.hpp)
const NUMBER_COLORS = [null, '#3b82f6', '#22c55e', '#ef4444', '#9333ea', '#ea580c', '#0d9488', '#e4e4e7', '#f43f5e'];
const GREY_PALETTES = new Set(['mono', 'sketch', 'plate']);

// player skins and their colour in the game (for the burst when one is hit)
const CREW = [
  { skin: 'orange', hex: '#ff7800' },
  { skin: 'cyan', hex: '#00ffd2' },
  { skin: 'pink', hex: '#ff69b4' },
  { skin: 'green', hex: '#22c55e' },
];

const hash = (c, r) => {
  let h = Math.imul(c, 374761393) + Math.imul(r, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Pieces lying on the panel's edges, partly hanging off it. k scales them on phones.
function edgeDecor(w, h, k) {
  return [
    { id: 'launcher', name: 'launcher', x: -56 * k, y: h - 40 * k, w: 128 * k, h: 64 * k, rot: -8 },
    { name: 'roulette', x: w - 50 * k, y: h - 58 * k, w: 104 * k, h: 104 * k, cls: 'swf-spin' },
    { name: 'ship-mid', x: w - 18 * k, y: h * 0.36, w: 128 * k, h: 48 * k, cls: 'swf-dock' },
    { name: 'banana', x: w * 0.47, y: -22 * k, w: 32 * k, h: 32 * k, rot: 24 },
    { name: 'flag-red', x: w * 0.27, y: -28 * k, w: 32 * k, h: 32 * k, flag: true },
    { name: 'radar', x: w * 0.66, y: h - 12 * k, w: 32 * k, h: 32 * k, rot: -10 },
    { name: 'bubbles', x: -24 * k, y: h * 0.28, w: 32 * k, h: 32 * k },
    { name: 'flag-jade', x: -34 * k, y: h * 0.62, w: 32 * k, h: 32 * k, flag: true },
    { name: 'scrap', x: w * 0.34, y: h - 8 * k, w: 22 * k, h: 22 * k, rot: 30 },
    { name: 'scrap', x: w + 14 * k, y: h * 0.16, w: 20 * k, h: 20 * k, rot: -20 },
    { name: 'scrap', x: w * 0.58, y: -30 * k, w: 18 * k, h: 18 * k, rot: 50 },
    { name: 'scrap', x: -40 * k, y: h * 0.47, w: 18 * k, h: 18 * k },
  ];
}

// ───────────────────────── the board ─────────────────────────

function makeGrid(w, h, T, B) {
  const cols = Math.ceil((w + 2 * B) / T);
  const rows = Math.ceil((h + 2 * B) / T);
  const n = cols * rows;
  const exists = new Uint8Array(n);
  const inner = new Uint8Array(n); // well inside the panel, where players dig less
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = (i / cols) | 0;
    const cx = c * T + T / 2 - B, cy = r * T + T / 2 - B;
    const out = Math.max(0, -cx, cx - w, -cy, cy - h);
    // past the panel's edge the board frays out: fewer tiles the further out
    exists[i] = out <= 0 || hash(c, r) > (out / B) * 1.15 - 0.1 ? 1 : 0;
    inner[i] = cx > 2.5 * T && cx < w - 2.5 * T && cy > 2.5 * T && cy < h - 2.5 * T ? 1 : 0;
  }
  const neighbours = Array.from({ length: n }, (_, i) => {
    const c = i % cols, r = (i / cols) | 0, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dc && !dr) continue;
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue;
      const j = rr * cols + cc;
      if (exists[j]) out.push(j);
    }
    return out;
  });
  return { cols, rows, n, exists, inner, neighbours, mine: new Uint8Array(n), state: new Uint8Array(n), num: new Uint8Array(n) };
}

// 0 covered, 1 open, 2 flagged
function seedMines(g, keepSafe = []) {
  const safe = new Set(keepSafe.flatMap((i) => [i, ...g.neighbours[i]]));
  for (let i = 0; i < g.n; i++) {
    g.state[i] = 0;
    g.mine[i] = g.exists[i] && !safe.has(i) && Math.random() < 0.17 ? 1 : 0;
  }
  for (let i = 0; i < g.n; i++) g.num[i] = g.neighbours[i].reduce((s, j) => s + g.mine[j], 0);
}

function flood(g, start) {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (g.state[i] !== 0 || g.mine[i]) continue;
    g.state[i] = 1;
    if (g.num[i] === 0) stack.push(...g.neighbours[i]);
  }
}

// open a few empty pockets so the board looks like a game in progress
function openPockets(g, count) {
  const zeros = [];
  for (let i = 0; i < g.n; i++) if (g.exists[i] && !g.mine[i] && g.num[i] === 0 && g.state[i] === 0) zeros.push(i);
  for (let k = 0; k < count && zeros.length; k++) flood(g, zeros.splice((Math.random() * zeros.length) | 0, 1)[0]);
}

function parseColor(ctx, value, fallback) {
  ctx.fillStyle = fallback;
  ctx.fillStyle = value || fallback;
  const s = ctx.fillStyle;
  if (s[0] === '#') return [1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16));
  const m = s.match(/[\d.]+/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}

const mix = (a, b, t) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;

// ───────────────────────── the component ─────────────────────────

export default function SweeperField({ width: w, height: h, compact = false }) {
  const palette = usePalette();
  const T = compact ? 24 : 32;        // tile size, CSS px (the game's 16 px art at 1.5× / 2×)
  const B = compact ? 30 : 68;        // how far the board runs past the panel
  const S = T;                        // player sprite size
  const k = compact ? 0.7 : 1;
  const crew = compact ? CREW.slice(0, 3) : CREW;
  const decor = useMemo(() => edgeDecor(w, h, k), [w, h, k]);
  const launcher = decor.find((d) => d.id === 'launcher');
  // the launcher's purple core, where knocked-out players come back
  const spawn = { x: launcher.x + launcher.w * 0.61, y: launcher.y + launcher.h * 0.5 };

  const canvasRef = useRef();
  const overRef = useRef();
  const playerRefs = useRef([]);
  const shadowRefs = useRef([]);
  const api = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const over = overRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const g = makeGrid(w, h, T, B);
    const flagImg = new Image();
    flagImg.src = `${SPRITES}flag-red.png`;

    // tile centre in panel coordinates, and back
    const cx = (i) => (i % g.cols) * T + T / 2 - B;
    const cy = (i) => ((i / g.cols) | 0) * T + T / 2 - B;
    const tileAt = (x, y) => {
      const c = clamp(Math.floor((x + B) / T), 0, g.cols - 1);
      const r = clamp(Math.floor((y + B) / T), 0, g.rows - 1);
      return r * g.cols + c;
    };
    const nearestTile = (x, y) => {
      const i = tileAt(x, y);
      if (g.exists[i]) return i;
      let best = i, bd = Infinity;
      for (let j = 0; j < g.n; j++) {
        if (!g.exists[j]) continue;
        const d = (cx(j) - x) ** 2 + (cy(j) - y) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
      return best;
    };

    // ── drawing ──
    let colors;
    const readColors = () => {
      const cs = getComputedStyle(over);
      const panel = parseColor(ctx, cs.getPropertyValue('--panel').trim(), '#07090f');
      const text = parseColor(ctx, cs.getPropertyValue('--text').trim(), '#e8e8e8');
      const grey = GREY_PALETTES.has(document.documentElement.dataset.palette);
      colors = {
        panel: `rgb(${panel.join(',')})`,
        covered: mix(panel, text, 0.3),
        lip: mix(panel, text, 0.4),
        open: mix(panel, text, 0.07),
        number: (n) => (grey ? mix(panel, text, 0.85) : NUMBER_COLORS[n] || NUMBER_COLORS[7]),
      };
    };

    canvas.width = (w + 2 * B) * DPR;
    canvas.height = (h + 2 * B) * DPR;
    const draw = (time = performance.now()) => {
      if (!colors) readColors();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w + 2 * B, h + 2 * B);
      ctx.imageSmoothingEnabled = false;
      const m = Math.max(1, T * 0.06), s = T - 2 * m, rad = T * 0.14;
      ctx.font = `${Math.round(T * 0.42)}px Silkscreen, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < g.n; i++) {
        if (!g.exists[i]) continue;
        const x = (i % g.cols) * T + m, y = ((i / g.cols) | 0) * T + m;
        if (g.state[i] === 1) {
          ctx.fillStyle = colors.open;
          ctx.beginPath(); ctx.roundRect(x, y, s, s, rad); ctx.fill();
          if (g.num[i]) {
            ctx.fillStyle = colors.number(g.num[i]);
            ctx.fillText(String(g.num[i]), x + s / 2, y + s / 2 + 1);
          }
        } else {
          ctx.fillStyle = colors.covered;
          ctx.beginPath(); ctx.roundRect(x, y, s, s, rad); ctx.fill();
          ctx.fillStyle = colors.lip;
          ctx.fillRect(x + rad, y, s - 2 * rad, Math.max(1, T * 0.07));
          if (g.state[i] === 2 && flagImg.complete) {
            const frame = Math.floor(time / 330 + hash(i, 7) * 3) % 3;
            ctx.drawImage(flagImg, frame * 16, 0, 16, 16, x, y - m, s, s);
          }
        }
      }
      // the panel itself: the board shows through it faintly
      ctx.globalAlpha = 0.93;
      ctx.fillStyle = colors.panel;
      ctx.fillRect(B, B, w, h);
      ctx.globalAlpha = 1;
    };

    let dirty = true;
    const markDirty = () => { dirty = true; };
    flagImg.onload = markDirty;
    document.fonts?.load(`${Math.round(T * 0.42)}px Silkscreen`).then(markDirty, () => {});
    api.current.recolor = () => { colors = null; dirty = true; };

    // ── the game ──
    const claimed = new Set();
    let safeTotal = 0;

    const newBoard = (keep) => {
      seedMines(g, keep);
      keep.forEach((i) => flood(g, i));
      openPockets(g, compact ? 3 : 6);
      safeTotal = 0;
      for (let i = 0; i < g.n; i++) if (g.exists[i] && !g.mine[i]) safeTotal++;
      claimed.clear();
      dirty = true;
    };

    const bandTile = () => {
      // somewhere near the panel's edge, where the players spend most of their time
      for (let t = 0; t < 200; t++) {
        const i = (Math.random() * g.n) | 0;
        if (g.exists[i] && !g.inner[i]) return i;
      }
      return 0;
    };

    const players = crew.map((c, idx) => ({
      ...c,
      el: playerRefs.current[idx],
      shadow: shadowRefs.current[idx],
      x: 0, y: 0, lift: 0, rot: 0, sx: 1, sy: 1, face: 1,
      state: 'think', t: 0, wait: Math.random() * 0.8,
    }));
    const starts = players.map(() => bandTile());
    players.forEach((p, idx) => { p.x = cx(starts[idx]); p.y = cy(starts[idx]); });
    newBoard(starts);

    const hasOpenNeighbour = (i) => g.neighbours[i].some((j) => g.state[j] === 1);

    const pickJob = (p) => {
      const here = tileAt(p.x, p.y);
      const hc = here % g.cols, hr = (here / g.cols) | 0;
      const R = 7;
      let best = -1, score = 0;
      for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
        const c = hc + dc, r = hr + dr;
        if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) continue;
        const i = r * g.cols + c;
        if (!g.exists[i] || g.state[i] !== 0 || claimed.has(i) || !hasOpenNeighbour(i)) continue;
        const sc = (Math.random() * (g.inner[i] ? 0.3 : 1)) / (1 + Math.hypot(dc, dr) * 0.5);
        if (sc > score) { score = sc; best = i; }
      }
      return best;
    };

    const startFlight = (p, x1, y1, then) => {
      const d = Math.hypot(x1 - p.x, y1 - p.y);
      p.state = 'fly';
      p.t = 0;
      p.from = { x: p.x, y: p.y };
      p.to = { x: x1, y: y1 };
      p.dur = clamp(d / 380, 0.6, 1.7);
      p.arc = Math.min(170, 30 + d * 0.38);
      p.spin = (x1 >= p.x ? 1 : -1) * (d > 160 ? 360 : 0);
      p.then = then;
      p.face = x1 >= p.x ? 1 : -1;
    };

    const think = (p) => {
      if (!reduced && Math.random() < 0.09) {
        // fly off to another part of the board
        let i = bandTile();
        for (let t = 0; t < 20 && Math.hypot(cx(i) - p.x, cy(i) - p.y) < 6 * T; t++) i = bandTile();
        startFlight(p, cx(i), cy(i), 'think');
        return;
      }
      const job = pickJob(p);
      if (job < 0) {
        // nothing to do nearby: open a fresh pocket somewhere and go there
        const i = bandTile();
        if (!g.mine[i]) { flood(g, i); dirty = true; }
        if (reduced) { p.x = cx(i); p.y = cy(i); p.wait = 2; return; }
        startFlight(p, cx(i), cy(i), 'think');
        return;
      }
      claimed.add(job);
      p.job = job;
      p.state = 'walk';
      p.t = 0;
      p.step = null;
    };

    const finishJob = (p) => {
      const i = p.job;
      claimed.delete(i);
      p.job = null;
      if (g.state[i] !== 0) return;
      if (g.mine[i]) g.state[i] = 2;
      else flood(g, i);
      dirty = true;
      let left = 0;
      for (let j = 0; j < g.n; j++) if (g.exists[j] && !g.mine[j] && g.state[j] === 0) left++;
      if (left < safeTotal * 0.12) newBoard(players.map((q) => tileAt(q.x, q.y)));
    };

    // ── knocking players out ──
    const burst = (x, y, color) => {
      if (reduced) return;
      for (let b = 0; b < 10; b++) {
        const el = document.createElement('i');
        const a = (b / 10) * Math.PI * 2 + Math.random() * 0.4;
        const r = S * (0.8 + Math.random() * 0.9);
        el.className = 'swf-bit';
        el.style.cssText = `left:${x}px;top:${y}px;--c:${color};--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - S * 0.3}px`;
        el.addEventListener('animationend', () => el.remove());
        over.appendChild(el);
      }
      const ring = document.createElement('i');
      ring.className = 'swf-ring';
      ring.style.cssText = `left:${x}px;top:${y}px;--c:${color}`;
      ring.addEventListener('animationend', () => ring.remove());
      over.appendChild(ring);
    };

    const dropScrap = (x, y) => {
      const el = document.createElement('img');
      el.src = `${SPRITES}scrap.png`;
      el.alt = '';
      el.className = 'swf-scrap px';
      el.style.cssText = `left:${x - S * 0.35}px;top:${y - S * 0.35}px;width:${S * 0.7}px;height:${S * 0.7}px`;
      el.addEventListener('animationend', () => el.remove());
      over.appendChild(el);
    };

    api.current.knock = (idx) => {
      const p = players[idx];
      if (!p || p.state === 'dead' || p.state === 'spawn') return;
      if (p.job != null) { claimed.delete(p.job); p.job = null; }
      // the old spot is the tile under where it was hit
      const spot = nearestTile(p.x, p.y);
      p.home = { x: cx(spot), y: cy(spot) };
      burst(p.x, p.y - p.lift, p.hex);
      dropScrap(p.home.x, p.home.y);
      p.state = 'dead';
      p.t = 0;
      p.lift = 0;
      p.el.classList.add('is-down');
    };

    // ── the loop ──
    let raf, last = performance.now(), flagTick = 0;
    const HOP = 0.22;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      for (const p of players) {
        p.t += dt;
        p.sx += (1 - p.sx) * Math.min(1, dt * 14);
        p.sy += (1 - p.sy) * Math.min(1, dt * 14);
        if (p.state === 'think') {
          p.wait -= dt;
          if (p.wait <= 0) think(p);
        } else if (p.state === 'walk') {
          if (reduced) { p.x = cx(p.job); p.y = cy(p.job); p.state = 'work'; p.t = 0; continue; }
          if (!p.step) {
            const here = tileAt(p.x, p.y);
            if (here === p.job) { p.state = 'work'; p.t = 0; continue; }
            const dc = Math.sign((p.job % g.cols) - (here % g.cols));
            const dr = Math.sign(((p.job / g.cols) | 0) - ((here / g.cols) | 0));
            const next = here + dr * g.cols + dc;
            p.step = { x0: p.x, y0: p.y, x1: cx(next), y1: cy(next) };
            if (dc) p.face = dc;
            p.t = 0;
          }
          const q = Math.min(1, p.t / HOP);
          p.x = p.step.x0 + (p.step.x1 - p.step.x0) * q;
          p.y = p.step.y0 + (p.step.y1 - p.step.y0) * q;
          p.lift = Math.sin(q * Math.PI) * T * 0.18;
          if (q >= 1) { p.step = null; p.sx = 1.18; p.sy = 0.84; }
        } else if (p.state === 'work') {
          // a little dig wiggle, then the tile opens (or gets a flag)
          p.lift = 0;
          p.rot = reduced ? 0 : Math.sin(p.t * 30) * 8;
          if (p.t > 0.45) {
            p.rot = 0;
            finishJob(p);
            p.state = 'think';
            p.wait = 0.15 + Math.random() * 0.5;
          }
        } else if (p.state === 'fly') {
          const q = Math.min(1, p.t / p.dur);
          p.x = p.from.x + (p.to.x - p.from.x) * q;
          p.y = p.from.y + (p.to.y - p.from.y) * q;
          p.lift = Math.sin(q * Math.PI) * p.arc;
          p.rot = p.spin * q;
          if (q >= 1) {
            p.rot = 0;
            p.lift = 0;
            p.sx = 1.35; p.sy = 0.7;
            p.state = 'think';
            p.wait = 0.25;
          }
        } else if (p.state === 'dead') {
          if (p.t > 0.9) {
            p.el.classList.remove('is-down');
            if (reduced) { p.x = p.home.x; p.y = p.home.y; p.state = 'think'; p.wait = 0.5; continue; }
            p.x = spawn.x; p.y = spawn.y;
            p.state = 'spawn';
            p.t = 0;
            burst(spawn.x, spawn.y, '#be50ff');
          }
        } else if (p.state === 'spawn') {
          const q = Math.min(1, p.t / 0.35);
          p.sx = p.sy = q * (1 + Math.sin(q * Math.PI) * 0.3);
          if (q >= 1) startFlight(p, p.home.x, p.home.y, 'think');
        }

        const lift = p.lift;
        p.el.style.transform = `translate(${p.x - S / 2}px, ${p.y - S * 0.75 - lift}px) rotate(${p.rot}deg) scale(${p.sx * p.face}, ${p.sy})`;
        const sh = clamp(1 - lift / 220, 0.35, 1);
        p.shadow.style.transform = `translate(${p.x - S * 0.35}px, ${p.y + S * 0.12}px) scale(${sh})`;
        p.shadow.style.opacity = p.state === 'dead' ? 0 : (0.5 * sh).toFixed(2);
      }

      flagTick += dt;
      if (flagTick > 0.33) { flagTick = 0; if (!reduced) dirty = true; }
      if (dirty) { dirty = false; draw(now); }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, T, B, compact]);

  // new theme: new tile colours
  useEffect(() => {
    const id = requestAnimationFrame(() => api.current.recolor?.());
    return () => cancelAnimationFrame(id);
  }, [palette.id]);

  return (
    <>
      <div className="swf-under" aria-hidden="true">
        <canvas ref={canvasRef} className="swf-board" style={{ left: -B, top: -B, width: w + 2 * B, height: h + 2 * B }} />
      </div>
      <div ref={overRef} className="swf-over" aria-hidden="true">
        {decor.map((d, i) => (
          <span
            key={i}
            className={`swf-decor ${d.cls || ''} ${d.flag ? 'swf-decor--flag' : ''}`}
            style={{
              left: d.x, top: d.y, width: d.w, height: d.h,
              rotate: d.rot ? `${d.rot}deg` : undefined,
              backgroundImage: `url(${SPRITES}${d.name}.png)`,
            }}
          />
        ))}
        {crew.map((c, i) => <i key={`s${c.skin}`} ref={(el) => { shadowRefs.current[i] = el; }} className="swf-shadow" style={{ width: S * 0.7, height: S * 0.24 }} />)}
        {crew.map((c, i) => (
          <button
            key={c.skin}
            ref={(el) => { playerRefs.current[i] = el; }}
            type="button"
            tabIndex={-1}
            className="swf-player"
            style={{ width: S, height: S }}
            onPointerDown={(e) => { e.stopPropagation(); api.current.knock?.(i); }}
          >
            <img className="px" src={`${SPRITES}blob-${c.skin}.png`} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </>
  );
}
