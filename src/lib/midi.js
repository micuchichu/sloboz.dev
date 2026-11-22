// Minimal Standard MIDI File parser (formats 0 and 1).
// Returns notes in seconds with the tempo map applied and the sustain pedal
// (CC64) folded in: a note released while the pedal is down rings until the
// pedal comes up. Each note also keeps `release`, the moment the key itself
// came up, so the keyboard can follow the fingers while the sound rings on.

function readVarLen(view, pos) {
  let value = 0;
  let byte;
  do {
    byte = view.getUint8(pos.i++);
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return value;
}

export function parseMidi(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const str = (o, n) => String.fromCharCode(...new Uint8Array(arrayBuffer, o, n));
  if (str(0, 4) !== 'MThd') throw new Error('Not a MIDI file');

  const headerLen = view.getUint32(4);
  const ntrks = view.getUint16(10);
  const division = view.getUint16(12);
  if (division & 0x8000) throw new Error('SMPTE time division is not supported');
  const ppq = division;

  const events = []; // { tick, type, ... }
  let title = null;
  let offset = 8 + headerLen;

  for (let t = 0; t < ntrks && offset < view.byteLength; t++) {
    if (str(offset, 4) !== 'MTrk') break;
    const len = view.getUint32(offset + 4);
    const end = offset + 8 + len;
    const pos = { i: offset + 8 };
    let tick = 0;
    let status = 0;

    while (pos.i < end) {
      tick += readVarLen(view, pos);
      let b = view.getUint8(pos.i);
      if (b & 0x80) {
        status = b;
        pos.i++;
      } // else running status: reuse previous

      if (status === 0xff) {
        const type = view.getUint8(pos.i++);
        const mlen = readVarLen(view, pos);
        if (type === 0x51 && mlen === 3) {
          const uspq = (view.getUint8(pos.i) << 16) | (view.getUint8(pos.i + 1) << 8) | view.getUint8(pos.i + 2);
          events.push({ tick, type: 'tempo', uspq });
        } else if (type === 0x03 && !title && mlen > 0) {
          title = str(pos.i, mlen).trim() || null;
        }
        pos.i += mlen;
        status = 0; // meta events cancel running status
      } else if (status === 0xf0 || status === 0xf7) {
        pos.i += readVarLen(view, pos);
        status = 0;
      } else {
        const kind = status & 0xf0;
        const ch = status & 0x0f;
        const d1 = view.getUint8(pos.i++);
        const d2 = kind === 0xc0 || kind === 0xd0 ? 0 : view.getUint8(pos.i++);
        if (kind === 0x90 && d2 > 0) events.push({ tick, type: 'on', ch, note: d1, vel: d2 });
        else if (kind === 0x80 || (kind === 0x90 && d2 === 0)) events.push({ tick, type: 'off', ch, note: d1 });
        else if (kind === 0xb0 && d1 === 64) events.push({ tick, type: 'pedal', ch, down: d2 >= 64 });
      }
    }
    offset = end;
  }

  // Stable sort by tick; at equal ticks process tempo first, then offs, then ons
  const order = { tempo: 0, pedal: 1, off: 2, on: 3 };
  events.sort((a, b) => a.tick - b.tick || order[a.type] - order[b.type]);

  // Tick → seconds with the tempo map
  let uspq = 500000;
  let lastTick = 0;
  let lastSec = 0;
  const toSec = (tick) => lastSec + ((tick - lastTick) * uspq) / ppq / 1e6;

  const notes = [];
  const open = new Map();        // `${ch}:${note}` → note object awaiting release
  const sustained = new Set();   // notes released while the pedal was down
  const pedal = new Array(16).fill(false);
  const pedals = [];             // [{ start, end }] spans where any channel holds the sustain pedal
  let downCount = 0;
  let downAt = 0;

  for (const ev of events) {
    const time = toSec(ev.tick);
    if (ev.type === 'tempo') {
      lastSec = time;
      lastTick = ev.tick;
      uspq = ev.uspq;
      continue;
    }
    const key = `${ev.ch}:${ev.note}`;
    if (ev.type === 'on') {
      // Re-striking a held/sustained key ends the previous one
      const prev = open.get(key);
      if (prev) { prev.end = prev.release = time; open.delete(key); sustained.delete(prev); }
      for (const n of sustained) if (n.ch === ev.ch && n.note === ev.note) { n.end = time; sustained.delete(n); }
      const n = { note: ev.note, ch: ev.ch, vel: ev.vel / 127, start: time, end: null, release: null };
      notes.push(n);
      open.set(key, n);
    } else if (ev.type === 'off') {
      const n = open.get(key);
      if (!n) continue;
      open.delete(key);
      n.release = time;
      if (pedal[ev.ch]) sustained.add(n);
      else n.end = time;
    } else if (ev.type === 'pedal') {
      if (pedal[ev.ch] !== ev.down) {
        if (ev.down) { if (downCount++ === 0) downAt = time; }
        else if (--downCount === 0) pedals.push({ start: downAt, end: time });
      }
      pedal[ev.ch] = ev.down;
      if (!ev.down) {
        for (const n of sustained) if (n.ch === ev.ch) { n.end = time; sustained.delete(n); }
      }
    }
  }

  const lastEventSec = events.length ? toSec(events[events.length - 1].tick) : 0;
  for (const n of open.values()) n.end = n.release = lastEventSec;
  for (const n of sustained) n.end = lastEventSec;
  if (downCount > 0) pedals.push({ start: downAt, end: lastEventSec });
  for (const n of notes) {
    if (n.end <= n.start) n.end = n.start + 0.05;
    if (n.release == null || n.release <= n.start) n.release = Math.min(n.end, n.start + 0.05);
  }

  notes.sort((a, b) => a.start - b.start);
  const duration = notes.reduce((m, n) => Math.max(m, n.end), 0);
  let low = 127, high = 0;
  for (const n of notes) { low = Math.min(low, n.note); high = Math.max(high, n.note); }

  return { title, notes, pedals, duration, range: notes.length ? [low, high] : [60, 72] };
}
