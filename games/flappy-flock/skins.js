/* Flappy Flock skins: the catalog (prices and unlock rules, which the server also reads) and the code that draws each bird.
   Every bird is drawn with canvas shapes, facing right, centered on (0,0), about 34 x 24 units before hats. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlappySkins = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const LIST = [
  { id: 'classic',  name: 'Sunny',        price: 0 },
  { id: 'bluejay',  name: 'Blue Jay',     price: 20 },
  { id: 'cardinal', name: 'Cardinal',     price: 30 },
  { id: 'flamingo', name: 'Flamingo',     price: 30 },
  { id: 'chick',    name: 'Chick',        price: 40 },
  { id: 'parrot',   name: 'Parrot',       price: 60 },
  { id: 'penguin',  name: 'Penguin',      price: 80 },
  { id: 'cool',     name: 'Cool Bird',    price: 100 },
  { id: 'ninja',    name: 'Ninja',        price: 150 },
  { id: 'pirate',   name: 'Pirate',       price: 150 },
  { id: 'robot',    name: 'Robot',        price: 200 },
  { id: 'zombie',   name: 'Zombie',       price: 200 },
  { id: 'ghost',    name: 'Spooky',       price: 250 },
  { id: 'rainbow',  name: 'Rainbow',      price: 400 },
  { id: 'phoenix',  name: 'Phoenix',      price: 500 },
  { id: 'galaxy',   name: 'Galaxy',       price: 750 },
  { id: 'king',     name: 'King',         price: 1000 },
  { id: 'golden',   name: 'Golden',       req: { best: 30 },     hint: 'Score 30 in one flight' },
  { id: 'diamond',  name: 'Diamond',      req: { best: 100 },    hint: 'Score 100 in one flight' },
  { id: 'party',    name: 'Party Animal', req: { raceWins: 1 },  hint: 'Win a game-night race' },
  { id: 'aviator',  name: 'Aviator',      req: { flights: 100 }, hint: 'Fly 100 times' },
];
const BY_ID = {};
for (const s of LIST) BY_ID[s.id] = s;

// which achievement skins a player has earned, from their lifetime stats
function earned(stats) {
  return LIST.filter(s => s.req && Object.keys(s.req).every(k => (stats[k] || 0) >= s.req[k])).map(s => s.id);
}

const LOOK = {
  classic:  { body: '#f8d23a', belly: '#fbeec0', wing: '#f6f1dc', beak: '#f0632d', line: '#3b2a14' },
  bluejay:  { body: '#4a90e2', belly: '#e8f1fb', wing: '#2d5fa8', beak: '#2b2b2b', line: '#1b2c45', hat: 'crest', crest: '#3f7fd0' },
  cardinal: { body: '#e0322f', belly: '#f0564d', wing: '#b52220', beak: '#f59a2a', line: '#4a0f0e', hat: 'crest', crest: '#d42a27', mask: '#1b1b1b' },
  flamingo: { body: '#ff8fb8', belly: '#ffc2d8', wing: '#ff6fa3', beak: '#fff1f5', beakTip: '#222', line: '#6b2340' },
  chick:    { body: '#ffe867', belly: '#fff4a8', wing: '#ffd83a', beak: '#ff9a1f', line: '#6b5410', hat: 'shell' },
  parrot:   { body: '#2fc15a', belly: '#9be86b', wing: '#e53935', beak: '#f4d35e', line: '#10421f', tail: 'parrot' },
  penguin:  { body: '#23262e', belly: '#f7f7f2', wing: '#15171c', beak: '#ff9d1c', line: '#050608', bigBelly: true },
  cool:     { body: '#39c6d6', belly: '#b7f2f5', wing: '#1f9aa9', beak: '#ff7b3a', line: '#0f3b41', hat: 'cap', eyes: 'shades' },
  ninja:    { body: '#2a2d3a', belly: '#3c4152', wing: '#1b1d27', beak: '#f0a23b', line: '#07080c', hat: 'headband', band: '#e23b3b', trail: 'smoke' },
  pirate:   { body: '#c7823c', belly: '#f0c48a', wing: '#8e5523', beak: '#ffb13b', line: '#3a2410', hat: 'tricorn', eyes: 'patch' },
  robot:    { body: '#aeb8c4', belly: '#d8e0e8', wing: '#7c8896', beak: '#5f6b78', line: '#2c343d', hat: 'antenna', eyes: 'visor', extra: 'bolts', trail: 'sparks' },
  zombie:   { body: '#8fb56a', belly: '#b6cf8f', wing: '#6b8f4a', beak: '#7a6a4f', line: '#2d3b1f', eyes: 'x', extra: 'stitches' },
  ghost:    { body: '#eef2ff', belly: '#ffffff', wing: '#d7ddf7', beak: '#c9d0ee', line: '#8d95c2', alpha: 0.75, eyes: 'hollow', trail: 'wisp' },
  rainbow:  { body: 'rainbow', belly: '#ffffff', wing: 'rainbow2', beak: '#ffb13b', line: '#2b2440', trail: 'rainbow' },
  phoenix:  { body: '#ff6a1a', belly: '#ffc53d', wing: '#e0301e', beak: '#ffd84a', line: '#5a1406', hat: 'flame', trail: 'fire' },
  galaxy:   { body: 'galaxy', belly: 'rgba(160,120,255,.35)', wing: '#2a1b6b', beak: '#f6d365', line: '#0d0826', extra: 'stars', trail: 'stars' },
  king:     { body: '#7b3fe4', belly: '#c9a7ff', wing: '#5a26b8', beak: '#ffc53d', line: '#26104f', hat: 'crown', trail: 'sparkle' },
  golden:   { body: 'gold', belly: '#fff1b0', wing: '#e0a800', beak: '#ff8a1f', line: '#6b4a00', extra: 'shine', trail: 'sparkle' },
  diamond:  { body: 'diamond', belly: 'rgba(255,255,255,.5)', wing: '#8fe3ff', beak: '#bdf3ff', line: '#1d5a73', extra: 'facets', trail: 'ice' },
  party:    { body: '#ff5fa2', belly: '#ffd0e4', wing: '#7c5cff', beak: '#ffc53d', line: '#4a1030', hat: 'party', trail: 'confetti' },
  aviator:  { body: '#c9a26b', belly: '#efdcbc', wing: '#8e6a3c', beak: '#e8892e', line: '#3b2a14', hat: 'goggles', extra: 'scarf' },
};

const TAU = Math.PI * 2;
const trailOf = id => (LOOK[id] || LOOK.classic).trail || null;
// a single representative color, for dots and name tags
const COLOR = { rainbow: '#ff5fa2', galaxy: '#7b5cff', gold: '#ffc53d', diamond: '#8fe3ff' };
const colorOf = id => { const b = (LOOK[id] || LOOK.classic).body; return COLOR[b] || b; };

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

function paint(g, v, t) {
  if (v === 'rainbow') return `hsl(${(t * 140) % 360},88%,60%)`;
  if (v === 'rainbow2') return `hsl(${(t * 140 + 150) % 360},88%,55%)`;
  if (v === 'gold') { const gr = g.createLinearGradient(0, -12, 0, 12); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.45, '#ffc53d'); gr.addColorStop(1, '#d98f00'); return gr; }
  if (v === 'galaxy') { const gr = g.createRadialGradient(-5, -5, 1, 0, 0, 20); gr.addColorStop(0, '#8a6bff'); gr.addColorStop(0.5, '#3a2296'); gr.addColorStop(1, '#0d0826'); return gr; }
  if (v === 'diamond') { const gr = g.createLinearGradient(-16, -12, 16, 12); gr.addColorStop(0, '#f4fdff'); gr.addColorStop(0.35, '#8fe3ff'); gr.addColorStop(0.6, '#d6f7ff'); gr.addColorStop(1, '#4fb8e6'); return gr; }
  return v;
}

function shape(g, fill, line) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (line) { g.strokeStyle = line; g.stroke(); }
}

// o: { x, y, rot, scale, alpha, t (seconds, for animation), wing (-1 up .. 1 down) }
function draw(g, id, o) {
  const L = LOOK[id] || LOOK.classic;
  const t = o.t || 0, wing = o.wing || 0, line = L.line;
  g.save();
  g.translate(o.x || 0, o.y || 0);
  if (o.rot) g.rotate(o.rot);
  if (o.scale && o.scale !== 1) g.scale(o.scale, o.scale);
  const a = (o.alpha == null ? 1 : o.alpha) * (L.alpha || 1);
  if (a !== 1) g.globalAlpha *= a;
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 1.8;

  // ---- behind the body ----
  if (L.tail === 'parrot') {
    const cols = ['#1e5fd6', '#e53935', '#f4d35e'];
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(-14, 1 + i * 2); g.rotate(0.25 - i * 0.22 + Math.sin(t * 9 + i) * 0.05);
      g.beginPath(); g.ellipse(-8, 0, 10, 2.8, 0, 0, TAU); shape(g, cols[i], line); g.restore();
    }
  }
  if (L.hat === 'headband') {
    g.fillStyle = L.band; g.strokeStyle = line; g.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) {
      const w = Math.sin(t * 14 + i * 1.7) * 3;
      g.beginPath(); g.moveTo(-12, -8 + i * 2); g.quadraticCurveTo(-20, -9 + i * 4 + w, -29, -6 + i * 6 - w);
      g.lineTo(-28, -3 + i * 6 - w); g.quadraticCurveTo(-19, -5 + i * 4 + w, -12, -4 + i * 2); g.closePath(); shape(g, L.band, line);
    }
    g.lineWidth = 1.8;
  }
  if (L.extra === 'scarf') {
    const w = Math.sin(t * 12) * 3;
    g.beginPath(); g.moveTo(-8, 5); g.quadraticCurveTo(-18, 4 + w, -30, 8 - w); g.lineTo(-29, 13 - w); g.quadraticCurveTo(-18, 10 + w, -6, 10); g.closePath();
    shape(g, '#e23b3b', line);
  }

  // ---- body ----
  const body = () => { g.beginPath(); g.ellipse(0, 0, 16.5, 12, 0, 0, TAU); };
  body(); g.fillStyle = paint(g, L.body, t); g.fill();
  g.save(); body(); g.clip();
  g.beginPath();
  if (L.bigBelly) g.ellipse(5, 5, 13, 10, 0, 0, TAU); else g.ellipse(3, 7.5, 12, 7, 0, 0, TAU);
  g.fillStyle = paint(g, L.belly, t); g.fill();
  if (L.mask) { g.beginPath(); g.ellipse(14, 1, 7.5, 6.5, 0, 0, TAU); g.fillStyle = L.mask; g.fill(); }
  if (L.hat === 'headband') { g.fillStyle = L.band; g.fillRect(-17, -10, 34, 4.5); }
  if (L.hat === 'goggles') { g.fillStyle = '#5a3a1a'; g.fillRect(-17, -9.5, 34, 3); }
  if (L.extra === 'stars') {
    const st = [[-9, -4, 1.2], [-1, -7, 1], [5, 4, 1.3], [-5, 5, .9], [-12, 2, 1], [2, -2, .8], [-6, -1, .7]];
    st.forEach(([x, y, r], i) => { g.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 5 + i * 2.1)); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#fff'; g.fill(); });
    g.globalAlpha = a;
  }
  if (L.extra === 'facets') {
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-16, -2); g.lineTo(-6, -11); g.lineTo(4, -3); g.lineTo(-6, 11); g.moveTo(4, -3); g.lineTo(12, -9); g.moveTo(4, -3); g.lineTo(16, 4); g.stroke();
    g.lineWidth = 1.8;
  }
  if (L.extra === 'shine' || L.body === 'diamond') {
    const sx = ((t * 40) % 80) - 40;
    const gr = g.createLinearGradient(sx - 6, 0, sx + 6, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.save(); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(sx - 6, -14, 12, 28); g.restore();
  }
  if (L.extra === 'stitches') {
    g.strokeStyle = '#3d2a1a'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-12, -3); g.lineTo(-2, 5); g.stroke();
    for (let i = 0; i < 4; i++) { const x = -11 + i * 3, y = -2 + i * 2.4; g.beginPath(); g.moveTo(x - 1.5, y + 2); g.lineTo(x + 1.5, y - 2); g.stroke(); }
    g.lineWidth = 1.8;
  }
  if (L.extra === 'bolts') {
    for (const [x, y] of [[-11, -4], [-11, 5], [-4, 9]]) { g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fillStyle = '#5f6b78'; g.fill(); }
  }
  g.restore();
  body(); g.strokeStyle = line; g.stroke();
  if (L.extra === 'shine') { g.beginPath(); g.ellipse(-3, -6.5, 7, 2.4, -0.2, 0, TAU); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); }

  // ---- eye ----
  const eyes = L.eyes;
  if (eyes === 'hollow') {
    g.beginPath(); g.ellipse(8.5, -4, 3, 4.5, 0, 0, TAU); g.fillStyle = '#2b2f4a'; g.fill();
  } else if (eyes === 'visor') {
    g.save(); g.shadowColor = '#ff3b3b'; g.shadowBlur = 6;
    rr(g, 2, -8.5, 15, 6, 3); g.fillStyle = `rgba(255,${50 + 40 * Math.sin(t * 6)},59,1)`; g.fill(); g.restore();
    rr(g, 2, -8.5, 15, 6, 3); g.strokeStyle = line; g.stroke();
  } else {
    g.beginPath(); g.arc(8, -4.5, 6, 0, TAU); shape(g, '#fff', line);
    if (eyes === 'x') {
      g.strokeStyle = '#222'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(7.5, -7); g.lineTo(12, -2); g.moveTo(12, -7); g.lineTo(7.5, -2); g.stroke(); g.lineWidth = 1.8;
    } else if (eyes !== 'shades' && eyes !== 'patch') {
      const blink = (t % 3.7) < 0.12;
      if (blink) { g.beginPath(); g.moveTo(5.5, -4.5); g.lineTo(12.5, -4.5); g.strokeStyle = line; g.stroke(); }
      else { g.beginPath(); g.arc(10.2, -4.5, 2.5, 0, TAU); g.fillStyle = '#1a1a1a'; g.fill(); g.beginPath(); g.arc(10.9, -5.4, 0.8, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
    }
    if (eyes === 'shades') {
      g.beginPath(); g.moveTo(3, -6); g.lineTo(-6, -6.5); g.strokeStyle = '#111'; g.lineWidth = 1.6; g.stroke(); g.lineWidth = 1.8;
      rr(g, 2.5, -8.5, 14, 7, 3); g.fillStyle = '#111'; g.fill();
      g.beginPath(); g.moveTo(5, -7); g.lineTo(8, -7); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; g.stroke(); g.lineWidth = 1.8;
    }
    if (eyes === 'patch') {
      g.beginPath(); g.moveTo(-4, -11); g.lineTo(15, 1); g.strokeStyle = '#111'; g.lineWidth = 1.4; g.stroke(); g.lineWidth = 1.8;
      g.beginPath(); g.ellipse(8.5, -4.5, 5.5, 5, 0.3, 0, TAU); g.fillStyle = '#111'; g.fill();
    }
  }

  // ---- beak ----
  rr(g, 9, -0.5, 13, 4.4, 2.1); shape(g, L.beak, line);
  rr(g, 9, 3.6, 11, 3.8, 1.9); shape(g, L.beak, line);
  if (L.beakTip) { g.beginPath(); g.moveTo(18, -0.5); g.lineTo(22, 1.5); g.lineTo(20, 7.4); g.lineTo(17, 7.4); g.closePath(); g.fillStyle = L.beakTip; g.fill(); }

  // ---- wing ----
  g.save(); g.translate(-6, 1.5 + wing * 3); g.rotate(wing * 0.5);
  g.beginPath(); g.ellipse(0, 0, 8.5, 5.2, 0, 0, TAU); shape(g, paint(g, L.wing, t), line);
  g.restore();

  // ---- hats ----
  const hat = L.hat;
  if (hat === 'crest') {
    g.beginPath(); g.moveTo(-3, -10); g.lineTo(-1, -19); g.lineTo(3, -11.5); g.lineTo(6, -18); g.lineTo(8, -10); g.closePath(); shape(g, L.crest, line);
  } else if (hat === 'shell') {
    g.beginPath(); g.moveTo(-10, -7); g.quadraticCurveTo(-8, -19, 3, -19); g.quadraticCurveTo(13, -18, 12, -8);
    g.lineTo(9, -10); g.lineTo(6, -7); g.lineTo(3, -10); g.lineTo(0, -7); g.lineTo(-3, -10); g.lineTo(-6, -7); g.closePath();
    shape(g, '#fffaf0', '#b9ad8f');
    g.beginPath(); g.ellipse(-1, -15, 2, 1.2, 0, 0, TAU); g.fillStyle = '#efe6d0'; g.fill();
  } else if (hat === 'cap') {
    rr(g, -19, -10.5, 13, 4, 2); shape(g, '#ff4f81', line);
    g.beginPath(); g.ellipse(1, -9.5, 10.5, 6.5, 0, Math.PI, TAU); g.closePath(); shape(g, '#ff4f81', line);
    g.beginPath(); g.arc(1, -16, 1.5, 0, TAU); g.fillStyle = '#fff'; g.fill();
  } else if (hat === 'tricorn') {
    g.beginPath(); g.moveTo(-12, -10); g.quadraticCurveTo(-6, -24, 3, -22); g.quadraticCurveTo(13, -24, 17, -10);
    g.quadraticCurveTo(3, -14, -12, -10); g.closePath(); shape(g, '#1c1c22', '#000');
    g.beginPath(); g.moveTo(-12, -10); g.quadraticCurveTo(3, -14, 17, -10); g.strokeStyle = '#c9a227'; g.lineWidth = 1.3; g.stroke(); g.lineWidth = 1.8;
    g.beginPath(); g.arc(3, -16.5, 2, 0, TAU); g.fillStyle = '#fff'; g.fill();
    g.fillStyle = '#1c1c22'; g.fillRect(2, -16.3, 0.8, 0.9); g.fillRect(3.4, -16.3, 0.8, 0.9);
  } else if (hat === 'antenna') {
    g.beginPath(); g.moveTo(1, -11.5); g.lineTo(1, -20); g.strokeStyle = line; g.stroke();
    g.beginPath(); g.arc(1, -21.5, 2.6, 0, TAU); shape(g, (t % 1) < 0.5 ? '#ff3b3b' : '#7a1c1c', line);
  } else if (hat === 'flame') {
    for (let i = 0; i < 3; i++) {
      const h = 9 + Math.sin(t * 17 + i * 2) * 2.5 + (i === 1 ? 4 : 0), x = -5 + i * 5;
      g.beginPath(); g.moveTo(x - 3.5, -9); g.quadraticCurveTo(x - 3, -9 - h * 0.6, x + 1, -9 - h); g.quadraticCurveTo(x + 1.5, -9 - h * 0.5, x + 3.5, -9); g.closePath();
      shape(g, i === 1 ? '#ffd84a' : '#ff9a1f', null);
    }
  } else if (hat === 'crown') {
    g.beginPath(); g.moveTo(-6, -9.5); g.lineTo(-7, -20); g.lineTo(-2, -15); g.lineTo(3, -23); g.lineTo(8, -15); g.lineTo(13, -20); g.lineTo(11, -9.5); g.closePath();
    shape(g, '#ffc53d', '#8a5a00');
    for (const [x, c] of [[-2, '#ff4f81'], [3, '#3fd9c4'], [8, '#ff4f81']]) { g.beginPath(); g.arc(x, -12, 1.5, 0, TAU); g.fillStyle = c; g.fill(); }
    g.beginPath(); g.arc(3, -23, 1.4, 0, TAU); g.fillStyle = '#fff'; g.fill();
  } else if (hat === 'party') {
    g.save(); g.translate(2, -10); g.rotate(0.25);
    g.beginPath(); g.moveTo(-7, 0); g.lineTo(0, -19); g.lineTo(7, 0); g.closePath(); g.fillStyle = '#3fd9c4'; g.fill();
    g.save(); g.clip(); g.fillStyle = '#ffc53d'; for (let i = 0; i < 4; i++) g.fillRect(-8, -3 - i * 5.5, 16, 2.4); g.restore();
    g.beginPath(); g.moveTo(-7, 0); g.lineTo(0, -19); g.lineTo(7, 0); g.closePath(); g.strokeStyle = line; g.stroke();
    g.beginPath(); g.arc(0, -20, 2.8, 0, TAU); shape(g, '#ff4f81', line);
    g.restore();
  } else if (hat === 'goggles') {
    for (const [x, y] of [[-3, -10.5], [6, -10]]) {
      g.beginPath(); g.arc(x, y, 3.8, 0, TAU); shape(g, '#b8862f', line);
      g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fillStyle = '#8fe3ff'; g.fill();
      g.beginPath(); g.arc(x - 0.8, y - 0.8, 0.8, 0, TAU); g.fillStyle = '#fff'; g.fill();
    }
  }
  g.restore();
}

// small still picture of a bird, for leaderboards and the skin shop
const iconCache = new Map();
function icon(id, px) {
  const key = id + '@' + px;
  if (iconCache.has(key)) return iconCache.get(key);
  if (typeof document === 'undefined') return '';
  const dpr = Math.min(3, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(px * dpr);
  const g = c.getContext('2d');
  const s = (px * dpr) / 50;
  g.scale(s, s);
  draw(g, id, { x: 24, y: 29, t: 0.4, wing: -0.3 });
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}

return { LIST, BY_ID, LOOK, earned, draw, icon, trailOf, colorOf };
});
