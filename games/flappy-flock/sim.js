/* Flappy Flock rules. The browser runs this to play; the server runs the same file to replay every flight
   from its list of taps, so a score can't be typed in from the browser console.
   Only + - * / and 32-bit integer math in here, so every JavaScript engine gets bit-identical results. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlappySim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

// World in logical units, same proportions as the 2013 original (288 x 512, ground at ~400).
const W = 288, H = 512, GROUND = 400, BIRD_X = 64, PIPE_W = 52, HZ = 60;
const START_Y = 230, TOP_LIMIT = -60;
const CENTER_MIN = 128, CENTER_MAX = 278;     // where a gap's middle can sit
const HIT_RX = 13.5, HIT_RY = 9.5;           // hitbox is a little smaller than the 34 x 24 bird, so near misses feel fair
const CLOSE_CALL = 5;                         // clearing a pipe by less than this is a close call (bonus coin)
const COIN_R = 6.5;                           // sky coins float in some gaps, a little off-center so grabbing them is a risk

// Per-tick values at 60 ticks a second. Classic matches FlapPyBird's numbers for the original
// (gravity 900 px/s², a flap sets speed to -270 px/s, 300 px/s top fall speed, pipes 1.25 s apart).
const MODES = {
  classic: { name: 'Classic', gap: 100, speed: 2,   spacing: 150, gravity: 0.25, flap: -4.5, maxFall: 5.2, moving: 0 },
  easy:    { name: 'Easy',    gap: 128, speed: 1.8, spacing: 172, gravity: 0.23, flap: -4.4, maxFall: 5,   moving: 0 },
  hard:    { name: 'Hard',    gap: 90,  speed: 2.4, spacing: 142, gravity: 0.27, flap: -4.7, maxFall: 5.6, moving: 0 },
  chaos:   { name: 'Chaos',   gap: 112, speed: 2.1, spacing: 160, gravity: 0.25, flap: -4.5, maxFall: 5.2, moving: 1 },
};

// Host effects. "sim" effects change the physics, so they are part of the replay; the rest only change the picture.
// Effects in the same group replace each other (Big then Tiny = Tiny).
const EFFECTS = {
  smite:  { label: 'Smite',   sim: true,  desc: 'crash right now' },
  ghost:  { label: 'Ghost',   sim: true,  desc: 'fly through pipes' },
  big:    { label: 'Big',     sim: true,  group: 'size', scale: 1.7,  desc: 'giant bird' },
  tiny:   { label: 'Tiny',    sim: true,  group: 'size', scale: 0.55, desc: 'tiny bird' },
  turbo:  { label: 'Turbo',   sim: true,  group: 'time', time: 1.45,  desc: 'everything 45% faster' },
  slowmo: { label: 'Slow-mo', sim: true,  group: 'time', time: 0.6,   desc: 'everything slower' },
  moon:   { label: 'Moon',    sim: true,  group: 'grav', grav: 0.5, flap: 0.72, desc: 'floaty low gravity' },
  heavy:  { label: 'Heavy',   sim: true,  group: 'grav', grav: 1.55, flap: 1.25, desc: 'heavy, fast gravity' },
  flip:   { label: 'Flip',    sim: true,  desc: 'gravity pulls up, the sky kills' },
  narrow: { label: 'Squeeze', sim: true,  group: 'gap', gap: 0.72, desc: 'pipes squeeze shut' },
  wide:   { label: 'Wide',    sim: true,  group: 'gap', gap: 1.5,  desc: 'pipes open wide' },
  fog:    { label: 'Fog',     sim: false, desc: 'can barely see' },
  drunk:  { label: 'Dizzy',   sim: false, desc: 'the screen sways' },
  mirror: { label: 'Mirror',  sim: false, desc: 'screen flipped left to right' },
};

const MEDALS = [[40, 'platinum'], [30, 'gold'], [20, 'silver'], [10, 'bronze']];
const medalFor = s => { for (const [n, m] of MEDALS) if (s >= n) return m; return null; };

// mulberry32: tiny seeded random number generator, integer math only
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ellipse vs axis-aligned rectangle: squash x so the ellipse becomes a circle, then circle vs rect
function hitRect(bx, by, rx, ry, x0, y0, x1, y1) {
  const cx = bx < x0 ? x0 : bx > x1 ? x1 : bx;
  const cy = by < y0 ? y0 : by > y1 ? y1 : by;
  const dx = (bx - cx) * ry / rx, dy = by - cy;
  return dx * dx + dy * dy < ry * ry;
}

function Sim(seed, mode) {
  this.mode = MODES[mode] ? mode : 'classic';
  this.cfg = MODES[this.mode];
  this.rand = rng(seed);
  this.tick = 0;
  this.x = BIRD_X;
  this.y = START_Y;
  this.vy = this.cfg.flap;        // the tap that starts the flight is a flap
  this.score = 0;
  this.dead = false;
  this.cause = '';
  this.pipes = [];
  this.count = 0;
  this.nextX = W + 110;
  this.lastCenter = (CENTER_MIN + CENTER_MAX) / 2;
  this.dist = 0;
  this.effects = [];
  this.gapMul = 1;
  this.scale = 1;
  this.m = null;
  this.flaps = 1;
  // sky coins get their own random stream, so the pipe layout for a seed never changes
  this.crand = rng((seed ^ 0x5bd1e995) >>> 0);
  this.close = 0;       // close calls
  this.coins = 0;       // sky coins grabbed
  this.missBy = 0;      // how far off a pipe crash was
}

Sim.prototype.addEffect = function (type, ticks) {
  if (this.dead) return false;
  if (type === 'clear') {           // the host took every effect off
    for (const f of this.effects) if (f.to > this.tick) f.to = this.tick;
    return true;
  }
  const e = EFFECTS[type];
  if (!e || !e.sim) return false;
  this.effects.push({ type, from: this.tick, to: this.tick + Math.max(1, ticks | 0) });
  return true;
};

Sim.prototype.mods = function () {
  const m = { time: 1, grav: 1, flap: 1, gap: 1, scale: 1, ghost: false, flip: false, smite: false };
  const seen = {};
  for (let i = this.effects.length - 1; i >= 0; i--) {      // newest first, so the newest in a group wins
    const f = this.effects[i];
    if (this.tick < f.from || this.tick >= f.to) continue;
    const e = EFFECTS[f.type];
    if (e.group) { if (seen[e.group]) continue; seen[e.group] = true; }
    if (f.type === 'smite') m.smite = true;
    else if (f.type === 'ghost') m.ghost = true;
    else if (f.type === 'flip') m.flip = true;
    if (e.time) m.time = e.time;
    if (e.grav) m.grav = e.grav;
    if (e.flap) m.flap = e.flap;
    if (e.gap) m.gap = e.gap;
    if (e.scale) m.scale = e.scale;
  }
  return m;
};

Sim.prototype.spawn = function (x) {
  const r = this.rand, n = this.count++;
  // early gaps stay close to each other, then the full range opens up by about pipe 12
  const step = Math.min(CENTER_MAX - CENTER_MIN, 50 + n * 9);
  const lo = Math.max(CENTER_MIN, this.lastCenter - step), hi = Math.min(CENTER_MAX, this.lastCenter + step);
  const p = { x, center: lo + r() * (hi - lo), gap: this.cfg.gap, passed: false, amp: 0, off: 0, dir: 1, mv: 0, n };
  if (this.cfg.moving && n >= 3 && r() < 0.6) {
    p.amp = 14 + r() * 26;
    p.mv = 0.35 + r() * 0.55;
    p.dir = r() < 0.5 ? -1 : 1;
    p.center = Math.max(CENTER_MIN + p.amp, Math.min(CENTER_MAX - p.amp, p.center));
  }
  if (n >= 2) {
    const c = this.crand(), o = this.crand();
    // always off-center (18-32% of the gap toward one edge), so grabbing one means flying close to a pipe
    if (c < 0.32) p.coin = { off: (o < 0.5 ? -1 : 1) * (0.18 + (o % 0.5) * 0.28), got: false, tick: 0 };
  }
  this.lastCenter = p.center;
  this.pipes.push(p);
};

// top and bottom edge of a pipe's gap right now
Sim.prototype.gapOf = function (p) {
  const half = p.gap * this.gapMul / 2, c = p.center + p.off;
  return [c - half, c + half];
};

Sim.prototype.die = function (cause) {
  this.dead = true;
  this.cause = cause;
};

// advance one tick (1/60 s). flap = the player tapped during this tick.
Sim.prototype.step = function (flap) {
  if (this.dead) return;
  const c = this.cfg, m = this.m = this.mods(), ts = m.time, dir = m.flip ? -1 : 1;
  if (m.smite) return this.die('smite');

  if (flap) { this.vy = c.flap * m.flap * dir; this.flaps++; }
  else this.vy += c.gravity * m.grav * dir * ts;
  const maxFall = c.maxFall * m.flap;
  if (dir > 0 ? this.vy > maxFall : this.vy < -maxFall) this.vy = maxFall * dir;
  this.y += this.vy * ts;

  // size and gap changes ease in so everyone can see them happen
  this.scale += (m.scale - this.scale) * 0.12;
  this.gapMul += (m.gap - this.gapMul) * 0.06;

  this.moveWorld(ts);

  for (let i = 0; i < this.pipes.length; i++) {
    const p = this.pipes[i];
    if (!p.passed && p.x + PIPE_W / 2 <= this.x) { p.passed = true; this.score++; }
  }

  const rx = HIT_RX * this.scale, ry = HIT_RY * this.scale;
  if (this.y + ry >= GROUND) { this.y = GROUND - ry; return this.die('ground'); }
  if (dir < 0 && this.y - ry <= 0) { this.y = ry; return this.die('sky'); }
  if (this.y < TOP_LIMIT) { this.y = TOP_LIMIT; if (this.vy < 0) this.vy = 0; }
  if (!m.ghost) {
    for (let i = 0; i < this.pipes.length; i++) {
      const p = this.pipes[i];
      if (p.x > this.x + rx || p.x + PIPE_W < this.x - rx) continue;
      const g = this.gapOf(p);
      const up = hitRect(this.x, this.y, rx, ry, p.x, -1e9, p.x + PIPE_W, g[0]);
      if (up || hitRect(this.x, this.y, rx, ry, p.x, g[1], p.x + PIPE_W, 1e9)) {
        this.missBy = up ? g[0] - (this.y - ry) : this.y + ry - g[1];
        return this.die('pipe');
      }
    }
  }
  // close calls and sky coins only pay coins; they never change the flight
  for (let i = 0; i < this.pipes.length; i++) {
    const p = this.pipes[i];
    if (p.coin && !p.coin.got) {
      const g = this.gapOf(p), cy = (g[0] + g[1]) / 2 + p.coin.off * (g[1] - g[0]);
      const dx = (this.x - (p.x + PIPE_W / 2)) / (rx + COIN_R), dy = (this.y - cy) / (ry + COIN_R);
      if (dx * dx + dy * dy < 1) { p.coin.got = true; p.coin.tick = this.tick; this.coins++; }
    }
    if (p.judged) continue;
    if (p.x <= this.x + rx && p.x + PIPE_W >= this.x - rx) {
      if (m.ghost) { p.judged = true; continue; }
      const g = this.gapOf(p), clear = Math.min(this.y - ry - g[0], g[1] - this.y - ry);
      if (p.minClear === undefined || clear < p.minClear) p.minClear = clear;
    } else if (p.minClear !== undefined && p.x + PIPE_W < this.x - rx) {
      p.judged = true;
      if (p.minClear < CLOSE_CALL) { this.close++; p.closeTick = this.tick; }
    }
  }
  if (this.effects.length > 8) this.effects = this.effects.filter(f => f.to > this.tick);
  this.tick++;
};

Sim.prototype.moveWorld = function (ts) {
  const c = this.cfg, dx = c.speed * ts;
  this.dist += dx;
  this.nextX -= dx;
  for (let i = 0; i < this.pipes.length; i++) {
    const p = this.pipes[i];
    p.x -= dx;
    if (p.amp) {
      p.off += p.dir * p.mv * ts;
      if (p.off > p.amp) { p.off = p.amp; p.dir = -1; } else if (p.off < -p.amp) { p.off = -p.amp; p.dir = 1; }
    }
  }
  while (this.nextX <= W + 60) { this.spawn(this.nextX); this.nextX += c.spacing; }
  while (this.pipes.length && this.pipes[0].x + PIPE_W < -80) this.pipes.shift();
};

// after a crash in a race, keep the pipes coming so the player can watch everyone else
Sim.prototype.scrollWorld = function () {
  this.moveWorld(1);
  this.tick++;
};

// Replay a flight from its taps. flaps: sorted tick numbers. events: [{tick, type, ticks}] host effects.
// Stops at the crash or after endTick, whichever comes first.
function replay(seed, mode, flaps, events, endTick, maxTicks) {
  const s = new Sim(seed, mode);
  const stop = Math.min(endTick, maxTicks || Infinity);
  let fi = 0, ei = 0;
  while (!s.dead && s.tick <= stop) {
    while (ei < events.length && events[ei].tick <= s.tick) {
      if (events[ei].tick === s.tick) s.addEffect(events[ei].type, events[ei].ticks);
      ei++;
    }
    let f = false;
    while (fi < flaps.length && flaps[fi] <= s.tick) { if (flaps[fi] === s.tick) f = true; fi++; }
    s.step(f);
  }
  return s;
}

// coins a flight earns: 1 per pipe, 1 per close call, 2 per sky coin, plus a medal bonus
const MEDAL_COINS = { bronze: 5, silver: 10, gold: 20, platinum: 30 };
function coinsFor(s) {
  const m = medalFor(s.score);
  return s.score + s.close + s.coins * 2 + (m ? MEDAL_COINS[m] : 0);
}

return { W, H, GROUND, BIRD_X, PIPE_W, HZ, START_Y, HIT_RX, HIT_RY, CLOSE_CALL, COIN_R, MODES, EFFECTS, MEDALS, MEDAL_COINS, medalFor, coinsFor, rng, Sim, replay };
});
