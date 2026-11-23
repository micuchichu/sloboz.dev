// Theme switches as View Transitions. The browser keeps a picture of the page in
// the old theme (::view-transition-old) under a live view of the new one
// (::view-transition-new); each theme brings itself in with a move taken from
// what the theme is: an orbit sweeps, frost clears, a sodium lamp warms up.
// The few CSS rules they need are in index.css under [data-theme-switch].
// Browsers without View Transitions, and reduced motion, just switch.

const OLD = '::view-transition-old(root)';
const NEW = '::view-transition-new(root)';
const root = () => document.documentElement;

// Animations on a pseudo-element target it by name, not by instance, so a filled
// animation would carry on into the next switch: every one is cancelled at the end.
let live = [];
const play = (pseudo, keyframes, duration, easing = 'linear') => {
  const a = root().animate(keyframes, { duration, easing, fill: 'both', pseudoElement: pseudo });
  live.push(a);
  return a;
};
const clearLive = () => { live.forEach((a) => a.cancel()); live = []; };

// An element that rides along in the new view (it's live, so it can move)
function fxElement(className) {
  const el = document.createElement('div');
  el.className = `theme-fx ${className}`;
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

// The same filter functions in every keyframe, so the browser can blend them
const lamp = (b, sepia, sat, hue) => `brightness(${b}) sepia(${sepia}) saturate(${sat}) hue-rotate(${hue}deg)`;

const TRANSITIONS = {
  // Orbit: the start of a night at the observatory. The dome lights go down, the
  // shutter slit opens from the top of the dome downwards, then slides wide onto
  // the new sky.
  orbit: {
    run() {
      const W = innerWidth, H = innerHeight;
      const slit = Math.max(90, W * 0.11);
      const side = (W - slit) / 2;
      play(OLD, [
        { filter: 'brightness(1)' },
        { filter: 'brightness(0.3)', offset: 0.2 },
        { filter: 'brightness(0.3)' },
      ], 1450, 'linear');
      play(NEW, [
        { clipPath: `inset(0px ${side}px ${H}px ${side}px)` },
        { clipPath: `inset(0px ${side}px ${H}px ${side}px)`, offset: 0.2, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
        { clipPath: `inset(0px ${side}px 0px ${side}px)`, offset: 0.55, easing: 'cubic-bezier(0.6, 0, 0.25, 1)' },
        { clipPath: 'inset(0px 0px 0px 0px)' },
      ], 1450, 'linear');
    },
  },

  // Mono: the colour drains out of the old page, then a hard cut to black and white
  mono: {
    run() {
      play(OLD, [{ filter: 'grayscale(0) contrast(1)' }, { filter: 'grayscale(1) contrast(1.35)' }], 520, 'ease-in');
      play(NEW, [{ opacity: 0 }, { opacity: 0, offset: 0.68 }, { opacity: 1, offset: 0.7 }, { opacity: 1 }], 760);
    },
  },

  // Sketch: a notebook page turns over from the folded bottom-left corner
  sketch: {
    run() {
      const W = innerWidth, H = innerHeight, S = W + H;
      const page = (s) => `polygon(0px ${H}px, 0px ${H - s}px, ${s}px ${H}px)`;
      play(NEW, [{ clipPath: page(0) }, { clipPath: page(S) }], 820, 'cubic-bezier(0.55, 0.05, 0.3, 1)');
      play(OLD, [{ filter: 'brightness(1)' }, { filter: 'brightness(0.78)' }], 820);
    },
  },

  // Signal: written onto the screen line by line, behind a bright orange scan line
  signal: {
    setup: () => fxElement('theme-fx--scan'),
    run(el) {
      const d = 720;
      play(NEW, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], d);
      if (el) live.push(el.animate([{ top: '0%', opacity: 1 }, { top: '100%', opacity: 1, offset: 0.97 }, { top: '100%', opacity: 0 }], { duration: d, fill: 'both' }));
    },
  },

  // Ice: frost creeps in from the edges with a jagged, crystal edge (the corners,
  // being furthest out, go first), then the frosted glass clears
  ice: {
    run() {
      const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
      const R = Math.hypot(W, H) * 0.5 * 1.4;
      const N = 30;
      const hash = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
      const jag = Array.from({ length: N }, (_, i) => 0.72 + 0.28 * hash(i)); // spike lengths
      // the whole screen minus a shrinking, spiky hole in the middle (evenodd cuts the hole out)
      const frost = (s) => {
        const hole = [];
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2, r = R * s * jag[i % N];
          hole.push(`${(cx + r * Math.cos(a)).toFixed(1)}px ${(cy + r * Math.sin(a)).toFixed(1)}px`);
        }
        return `polygon(evenodd, 0px 0px, ${W}px 0px, ${W}px ${H}px, 0px ${H}px, 0px 0px, ${hole.join(', ')}, 0px 0px)`;
      };
      const frames = [];
      for (let k = 0; k <= 12; k++) frames.push({ clipPath: frost(1 - k / 12) });
      play(NEW, frames, 950, 'cubic-bezier(0.4, 0, 0.35, 1)');
      play(NEW, [
        { filter: 'blur(14px) brightness(1.45) saturate(0.4)' },
        { filter: 'blur(9px) brightness(1.3) saturate(0.55)', offset: 0.55 },
        { filter: 'blur(0px) brightness(1) saturate(1)' },
      ], 1250, 'ease-out');
    },
  },

  // H-alpha: a red filter swings into the light path, like a filter wheel turning,
  // and the new view is what you see through it
  halpha: {
    run() {
      play(OLD, [{ filter: 'sepia(0) saturate(1) hue-rotate(0deg) brightness(1)' }, { filter: 'sepia(1) saturate(5) hue-rotate(-50deg) brightness(0.7)' }], 380, 'ease-out');
      play(NEW, [
        { clipPath: 'circle(0vmax at -15% 115%)' },
        { clipPath: 'circle(30vmax at 20% 70%)', offset: 0.45 },
        { clipPath: 'circle(130vmax at 50% 50%)' },
      ], 1000, 'cubic-bezier(0.5, 0, 0.25, 1)');
    },
  },

  // Phosphor: the new picture lights up with a flash while the old one lingers as a
  // green afterglow that decays (the layers add up as light; see index.css)
  phosphor: {
    run() {
      play(OLD, [
        { filter: 'sepia(0) hue-rotate(0deg) saturate(1) brightness(1)' },
        { filter: 'sepia(1) hue-rotate(62deg) saturate(3) brightness(0.8)', offset: 0.12 },
        { filter: 'sepia(1) hue-rotate(62deg) saturate(3) brightness(0.3)', offset: 0.4 },
        { filter: 'sepia(1) hue-rotate(62deg) saturate(3) brightness(0)' },
      ], 1300, 'ease-out');
      play(NEW, [
        { opacity: 0, filter: 'brightness(2.6)' },
        { opacity: 1, filter: 'brightness(2.2)', offset: 0.08 },
        { opacity: 1, filter: 'brightness(1)' },
      ], 900, 'ease-out');
    },
  },

  // Normals: rendered in buckets, tile by tile in rows, the way a renderer fills a frame
  normals: {
    setup: () => fxElement('theme-fx--bucket'),
    run(el) {
      const W = innerWidth, H = innerHeight;
      const tw = Math.ceil(W / Math.max(4, Math.round(W / 170)));
      const th = Math.ceil(H / Math.max(3, Math.round(H / 170)));
      const cols = Math.ceil(W / tw), rows = Math.ceil(H / th), total = cols * rows;
      const d = 1150;
      const clip = [], bucket = [];
      for (let k = 0; k <= total; k++) {
        const r = Math.floor(k / cols), c = k % cols;
        const y0 = Math.min(H, r * th), y1 = Math.min(H, (r + 1) * th), x = c * tw;
        // done: every row above, plus this row up to the current tile
        clip.push({ clipPath: `polygon(0px 0px, ${W}px 0px, ${W}px ${y0}px, ${x}px ${y0}px, ${x}px ${y1}px, 0px ${y1}px)`, offset: k / total, easing: 'step-end' });
        bucket.push({ transform: `translate(${x}px, ${y0}px)`, opacity: k < total ? 1 : 0, offset: k / total, easing: 'step-end' });
      }
      play(NEW, clip, d);
      if (el) {
        el.style.width = `${tw}px`;
        el.style.height = `${th}px`;
        live.push(el.animate(bucket, { duration: d, fill: 'both' }));
      }
    },
  },

  // Plate: the old view flips to its negative, then the new one develops out of
  // the white like a print in the tray
  plate: {
    run() {
      play(OLD, [
        { filter: 'invert(0) grayscale(0) brightness(1)' },
        { filter: 'invert(1) grayscale(1) brightness(1)', offset: 0.2 },
        { filter: 'invert(1) grayscale(1) brightness(1.8)' },
      ], 420, 'ease-in');
      play(NEW, [
        { opacity: 0, filter: 'brightness(3) contrast(0.2) blur(2px)' },
        { opacity: 0, filter: 'brightness(3) contrast(0.2) blur(2px)', offset: 0.22 },
        { opacity: 1, filter: 'brightness(2.4) contrast(0.3) blur(1.5px)', offset: 0.32 },
        { opacity: 1, filter: 'brightness(1) contrast(1) blur(0px)' },
      ], 1400, 'ease-out');
    },
  },

  // Sodium: the lights go out, then a sodium lamp strikes: a dim red-pink glow from
  // its neon, a flicker, and a slow warm-up to full amber
  sodium: {
    run() {
      play(OLD, [{ filter: 'brightness(1)' }, { filter: 'brightness(0)', offset: 0.12 }, { filter: 'brightness(0)' }], 1800);
      play(NEW, [
        { opacity: 0, filter: lamp(0, 1, 4, -40) },
        { opacity: 0, filter: lamp(0, 1, 4, -40), offset: 0.16 },
        { opacity: 1, filter: lamp(0.3, 1, 4, -40), offset: 0.26 },
        { opacity: 1, filter: lamp(0.08, 1, 4, -40), offset: 0.31 },
        { opacity: 1, filter: lamp(0.36, 1, 4, -36), offset: 0.37 },
        { opacity: 1, filter: lamp(0.62, 0.7, 2.4, -20), offset: 0.68 },
        { opacity: 1, filter: lamp(1, 0, 1, 0) },
      ], 1800, 'ease-out');
    },
  },
};

let running = null;

// update: applies the new theme (synchronously, so the new view is ready to capture)
export function playThemeTransition(id, update) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduced || document.hidden) {
    update();
    return;
  }
  running?.skipTransition();
  clearLive();

  const moves = TRANSITIONS[id] ?? TRANSITIONS.orbit;
  let fx = null;
  root().dataset.themeSwitch = id;
  const t = document.startViewTransition(async () => {
    update();
    fx = moves.setup?.() ?? null;
    // one frame for the 3D canvas to draw itself in the new theme
    await new Promise((r) => { requestAnimationFrame(r); setTimeout(r, 80); });
  });
  running = t;
  const quiet = (e) => { if (import.meta.env.DEV && e?.name !== 'AbortError') console.warn('theme transition:', e); };
  t.ready.then(() => moves.run(fx)).catch(quiet);
  t.finished.catch(quiet).finally(() => {
    fx?.remove();
    if (running === t) {
      running = null;
      clearLive();
      delete root().dataset.themeSwitch;
    }
  });
}
