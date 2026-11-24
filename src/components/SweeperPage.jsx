// The Minesweeper station's panel: downloads for the v1.0.0 release, a small
// board you can play in 2D, 3D or 4D (the cube beside the panel follows the
// choice), the numbers behind the engine, multiplayer, and the campaign that's
// in development.
import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { sweeper, useSweeper, RELEASE } from '../lib/sweeperStore';

const SPRITES = './minesweeper/sprites/';
const SHOTS = './minesweeper/shots/';

// ───────────────────────── the N-dimensional board ─────────────────────────

// Board shape per dimension: [x, y, z, w]. The 4D one is 3×3×3×3, so its centre
// cell touches every other cell on the board: all 80 of them.
const SHAPES = { 2: [8, 8], 3: [5, 5, 3], 4: [3, 3, 3, 3] };
const MINES = { 2: 10, 3: 9, 4: 8 };

function boardGeometry(dim) {
  const shape = SHAPES[dim];
  const count = shape.reduce((a, b) => a * b, 1);
  const coords = [];
  for (let i = 0; i < count; i++) {
    let r = i;
    coords.push(shape.map((n) => { const c = r % n; r = Math.floor(r / n); return c; }));
  }
  // Two cells touch when every coordinate is within one step
  const neighbours = coords.map((a, i) => {
    const out = [];
    coords.forEach((b, j) => {
      if (i !== j && a.every((v, k) => Math.abs(v - b[k]) <= 1)) out.push(j);
    });
    return out;
  });
  return { shape, count, coords, neighbours };
}

const fresh = (count) => Array.from({ length: count }, () => ({ mine: false, open: false, flag: false, n: 0 }));

function NBoard() {
  const { dim } = useSweeper();
  const geo = useMemo(() => boardGeometry(dim), [dim]);
  const [cells, setCells] = useState(() => fresh(geo.count));
  const [state, setState] = useState('new');
  const [hover, setHover] = useState(null);
  const [forDim, setForDim] = useState(dim);
  if (forDim !== dim) { // a new dimension gets a new board
    setForDim(dim);
    setCells(fresh(geo.count));
    setState('new');
    setHover(null);
  }
  const near = useMemo(() => new Set(hover == null ? [] : geo.neighbours[hover]), [hover, geo]);
  const mines = MINES[dim];

  const open = (i) => {
    if (state === 'lost' || state === 'won' || cells[i].flag || cells[i].open) return;
    const board = cells.map((c) => ({ ...c }));
    if (state === 'new') {
      // the first dig is always safe, and so is everything it touches
      const safe = new Set([i, ...geo.neighbours[i]]);
      const pool = board.map((_, j) => j).filter((j) => !safe.has(j));
      for (let k = 0; k < mines && pool.length; k++) {
        const j = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        board[j].mine = true;
      }
      board.forEach((c, j) => { c.n = geo.neighbours[j].filter((k) => board[k].mine).length; });
    }
    if (board[i].mine) {
      board.forEach((c) => { if (c.mine) c.open = true; });
      setCells(board);
      setState('lost');
      return;
    }
    const stack = [i];
    while (stack.length) {
      const j = stack.pop();
      if (board[j].open || board[j].flag) continue;
      board[j].open = true;
      if (board[j].n === 0) stack.push(...geo.neighbours[j]);
    }
    setCells(board);
    setState(board.some((c) => !c.open && !c.mine) ? 'play' : 'won');
  };

  const flag = (e, i) => {
    e.preventDefault();
    if (state === 'lost' || state === 'won' || cells[i].open) return;
    setCells((b) => b.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)));
  };

  const [X, Y, Z = 1, W = 1] = geo.shape;
  const flags = cells.filter((c) => c.flag).length;
  const slice = (z, w) => (
    <div className="nb-slice" key={`${z}-${w}`}>
      <div className="nb-grid" style={{ gridTemplateColumns: `repeat(${X}, var(--cell))` }}>
        {Array.from({ length: X * Y }, (_, k) => {
          const i = (k % X) + X * (Math.floor(k / X) + Y * (z + Z * w));
          const c = cells[i];
          if (!c) return null;
          const cls = ['nb-cell', c.open && 'is-open', c.open && c.mine && 'is-mine', c.flag && 'is-flag', near.has(i) && 'is-near', hover === i && 'is-hover']
            .filter(Boolean).join(' ');
          return (
            <button
              key={i}
              type="button"
              className={cls}
              data-n={c.open && !c.mine ? c.n : undefined}
              onClick={() => open(i)}
              onContextMenu={(e) => flag(e, i)}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              aria-label={`Cell ${geo.coords[i].join(', ')}`}
            >
              {c.open ? (c.mine ? '✶' : c.n || '') : c.flag ? <i className="nb-flag" /> : ''}
            </button>
          );
        })}
      </div>
    </div>
  );

  const touching = hover == null ? null : geo.neighbours[hover].length;
  return (
    <div className={`nboard nboard--${dim}d`} onMouseLeave={() => setHover(null)}>
      <div className="nb-dims" role="tablist" aria-label="Dimensions">
        {[2, 3, 4].map((d) => (
          <button key={d} type="button" role="tab" aria-selected={d === dim} onClick={() => sweeper.setDim(d)}>
            {d}D
          </button>
        ))}
      </div>

      <div className="nb-board">
        {dim > 2 && (
          <div className="nb-axis nb-axis--z" aria-hidden="true">
            {Array.from({ length: Z }, (_, z) => <span key={z}>z {z}</span>)}
          </div>
        )}
        <div className="nb-rows">
          {Array.from({ length: W }, (_, w) => (
            <div className="nb-row" key={w}>
              {dim === 4 && <span className="nb-axis nb-axis--w" aria-hidden="true">w {w}</span>}
              {Array.from({ length: Z }, (_, z) => slice(z, w))}
            </div>
          ))}
        </div>
      </div>

      <p className="nb-foot">
        {state === 'lost' ? 'Boom. ' : state === 'won' ? 'Board cleared. ' : `${mines - flags} mines left. `}
        {touching != null
          ? `This cell touches ${touching} other${touching === 1 ? '' : 's'}.`
          : `Hover a cell to see what it touches: up to ${3 ** dim - 1} cells in ${dim}D.`}
        {(state === 'lost' || state === 'won') && (
          <button type="button" onClick={() => { setCells(fresh(geo.count)); setState('new'); }}>New board</button>
        )}
      </p>
    </div>
  );
}

// ───────────────────────── the page ─────────────────────────

const Sprite = ({ name, size = 32, className = '', style }) => (
  <img className={`px ${className}`} style={style} src={`${SPRITES}${name}.png`} width={size} height={size} alt="" draggable={false} />
);

const CAMPAIGN = [
  { shot: 'planet', title: 'Tartarus-IV', text: 'The first planet, mapped as a globe of hex sectors. Pick one to read its intel, then deploy solo or host a co-op run.' },
  { shot: 'minefield', title: 'Outpost Alpha', text: 'A fortress minefield on the planet surface, with a radar in the corner tracking the expedition base.' },
  { shot: 'foundry', title: 'Foundry Wastes', text: 'Merchant ships dock beside the field, there is a roulette to gamble your salvage on, and an orbital launcher out.' },
  { shot: 'editor', title: 'Sector builder', text: 'Every sector is built in a visual editor: walls, docks, tiles and progression, exported as JSON.' },
];

const CONTROLS = [
  ['Reveal a cell', 'Left click'],
  ['Flag', 'Right click'],
  ['Chord', 'Middle click or C'],
  ['Pan and zoom', 'Drag and scroll'],
  ['Restart', 'R'],
];

// The full page isn't public yet: until it is, the station shows a short
// work-in-progress page with the downloads. Flip this to bring it back.
const PAGE_READY = false;

function Downloads() {
  return (
    <div className="sw-get">
      <a className="sw-dl" href={RELEASE.windows}>
        <Download size={16} strokeWidth={1.75} />
        <span>Windows<em>x64 · zip · 5 MB</em></span>
      </a>
      <a className="sw-dl" href={RELEASE.mac}>
        <Download size={16} strokeWidth={1.75} />
        <span>macOS<em>zip · 4 MB</em></span>
      </a>
      <div className="sw-links">
        <a href={RELEASE.page} target="_blank" rel="noopener noreferrer">Release notes <ArrowUpRight size={13} strokeWidth={1.5} /></a>
        <a href={RELEASE.repo} target="_blank" rel="noopener noreferrer">Source <ArrowUpRight size={13} strokeWidth={1.5} /></a>
      </div>
    </div>
  );
}

function WorkInProgress() {
  return (
    <section className="sweeper sweeper--wip">
      <div className="sw-head sw-wip-body reveal">
        <p className="sw-kicker"><span className="sw-crew-flag sw-kicker-flag" aria-hidden="true" />Work in progress</p>
        <h2 className="display">ND Minesweeper</h2>
        <p className="sw-lede">
          This page is still being built. The game isn't waiting on it: {RELEASE.tag} is out
          for Windows and macOS, with boards in two, three and four dimensions.
        </p>
        <Downloads />
        <p className="sw-note">Portable: unzip and run. The builds are called DimensionSweeper.</p>
        <p className="sw-wip-hint">Until then, the players on the board around this panel can be knocked out. They come back.</p>
      </div>
    </section>
  );
}

export default function SweeperPage() {
  return PAGE_READY ? <FullPage /> : <WorkInProgress />;
}

function FullPage() {
  return (
    <section className="sweeper">
      <header className="sw-head reveal">
        <p className="sw-kicker"><span className="sw-crew-flag sw-kicker-flag" aria-hidden="true" />Game · {RELEASE.tag} · Windows and macOS</p>
        <h2 className="display">ND Minesweeper</h2>
        <p className="sw-lede">
          Minesweeper in two, three and four dimensions. In 4D every cell can touch 80 others,
          so a single number tells you a lot less than you're used to.
        </p>
        <Downloads />
        <p className="sw-note">Portable: unzip and run. The builds are called DimensionSweeper.</p>
      </header>

      <section className="sw-block reveal" style={{ '--i': 1 }}>
        <h3 className="sw-h">Try a board</h3>
        <NBoard />
      </section>

      <section className="sw-block sw-numbers reveal" style={{ '--i': 2 }}>
        <div><strong>1,000,000</strong><span>cells and 150,000 mines generated in under 12 ms</span></div>
        <div><strong>125 KB</strong><span>for a million-cell board: one bit per cell, so it sits in L2 cache</span></div>
        <div><strong>1 seed</strong><span>one board on Windows, macOS and Linux: a SplitMix64 generator, not the compiler's</span></div>
      </section>

      <section className="sw-block sw-mp reveal" style={{ '--i': 3 }}>
        <h3 className="sw-h">Together</h3>
        <p>
          Co-op over direct IP or Steam. Everyone gets a coloured cursor, and each flag shows who planted it;
          if that player leaves, their flags go with them. Players can join a game already in progress.
        </p>
        <div className="sw-crew" aria-hidden="true">
          {['orange', 'cyan', 'pink', 'green', 'purple', 'red', 'blue', 'white'].map((c, i) => (
            <Sprite key={c} name={`blob-${c}`} size={32} className="sw-blob" style={{ '--i': i }} />
          ))}
          <span className="sw-crew-flag" />
          <span className="sw-crew-flag sw-crew-flag--jade" />
        </div>
      </section>

      <section className="sw-block reveal" style={{ '--i': 4 }}>
        <h3 className="sw-h">Next: the campaign <span className="sw-wip">in development · not in {RELEASE.tag}</span></h3>
        <div className="sw-shots">
          {CAMPAIGN.map((c) => (
            <figure key={c.shot}>
              <img src={`${SHOTS}${c.shot}.webp`} alt={`${c.title}, a screenshot from the campaign in development`} loading="lazy" width="1000" height="900" />
              <figcaption><b>{c.title}</b>{c.text}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="sw-block sw-foot reveal" style={{ '--i': 5 }}>
        <dl className="sw-controls">
          {CONTROLS.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <p className="sw-credits">C++20 · Raylib · ENet · Steamworks. MIT licence.</p>
      </section>
    </section>
  );
}
