/* Copied from Code games/game-night-hub/holdem.js by scripts/sync-games.sh. Edit the original, then run npm run sync-games. */
(function () {
var module = { exports: {} }, exports = module.exports;
var require = function (m) {
  if (m !== 'crypto') throw new Error('No browser version of ' + m);
  return {
    // a fair random whole number in [min, max), like Node's crypto.randomInt
    randomInt: function (min, max) {
      if (max === undefined) { max = min; min = 0; }
      var range = max - min, limit = Math.floor(4294967296 / range) * range, buf = new Uint32Array(1), x;
      do { window.crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      return min + (x % range);
    }
  };
};
// Texas Hold'em rules engine for Game Night Hub: no-limit, one table, up to 10 seats. Pure game logic with no timers
// or network code, so it can be tested on its own (tests/holdem-test.js). The server drives it: startHand(), act(),
// and advance() whenever a betting round closes, pausing between streets for drama.
'use strict';
const crypto = require('crypto');

const RANKS = '23456789TJQKA', SUITS = 'shdc';
const RN = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
const PL = ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];
const rankOf = c => c % 13, suitOf = c => Math.floor(c / 13);
const cardStr = c => RANKS[rankOf(c)] + SUITS[suitOf(c)];

// ---------- hand strength ----------
// score: bigger is better. Category first, then the ranks that break ties, packed base 13.
function eval5(cs) {
  const rs = cs.map(rankOf).sort((a, b) => b - a);
  const s0 = suitOf(cs[0]), flush = cs.every(c => suitOf(c) === s0);
  const cnt = new Map();
  for (const r of rs) cnt.set(r, (cnt.get(r) || 0) + 1);
  const g = [...cnt.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  let straight = -1;
  if (cnt.size === 5) { if (rs[0] - rs[4] === 4) straight = rs[0]; else if (rs[0] === 12 && rs[1] === 3) straight = 3; }   // A-2-3-4-5 counts as five high
  let cat, ks;
  if (straight >= 0 && flush) { cat = 8; ks = [straight]; }
  else if (g[0][1] === 4) { cat = 7; ks = [g[0][0], g[1][0]]; }
  else if (g[0][1] === 3 && g[1][1] === 2) { cat = 6; ks = [g[0][0], g[1][0]]; }
  else if (flush) { cat = 5; ks = rs; }
  else if (straight >= 0) { cat = 4; ks = [straight]; }
  else if (g[0][1] === 3) { cat = 3; ks = [g[0][0], g[1][0], g[2][0]]; }
  else if (g[0][1] === 2 && g[1][1] === 2) { cat = 2; ks = [g[0][0], g[1][0], g[2][0]]; }
  else if (g[0][1] === 2) { cat = 1; ks = [g[0][0], g[1][0], g[2][0], g[3][0]]; }
  else { cat = 0; ks = rs; }
  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 13 + (ks[i] || 0);
  return { score, cat, ks };
}
const COMBOS = {};
function combos(n) {
  if (COMBOS[n]) return COMBOS[n];
  const out = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) out.push([a, b, c, d, e]);
  return (COMBOS[n] = out);
}
// the best five of 5 to 7 cards
function best(cards) {
  let top = null;
  for (const ix of combos(cards.length)) {
    const five = ix.map(i => cards[i]), r = eval5(five);
    if (!top || r.score > top.score) top = Object.assign(r, { five });
  }
  return top;
}
function handName(r) {
  const [a, b] = r.ks;
  switch (r.cat) {
    case 8: return a === 12 ? 'Royal Flush' : `Straight Flush, ${RN[a]} high`;
    case 7: return `Four of a Kind, ${PL[a]}`;
    case 6: return `Full House, ${PL[a]} full of ${PL[b]}`;
    case 5: return `Flush, ${RN[a]} high`;
    case 4: return `Straight, ${RN[a]} high`;
    case 3: return `Three of a Kind, ${PL[a]}`;
    case 2: return `Two Pair, ${PL[a]} and ${PL[b]}`;
    case 1: return `Pair of ${PL[a]}`;
    default: return `${RN[a]} High`;
  }
}
// what a player is holding right now, in words (preflop too)
function describe(hole, board) {
  if (!hole || hole.length < 2) return '';
  if (!board || board.length < 3) {
    const [x, y] = hole.map(rankOf).sort((p, q) => q - p);
    if (x === y) return `Pocket ${PL[x]}`;
    return `${RN[x]}-${RN[y]}${suitOf(hole[0]) === suitOf(hole[1]) ? ' suited' : ''}`;
  }
  return handName(best(hole.concat(board)));
}

// chance each hand wins (ties split), by trying every remaining board, or a big random sample preflop
function equity(hands, board, rng) {
  const used = new Set(board.concat(...hands));
  const deck = [];
  for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
  const need = 5 - board.length, win = hands.map(() => 0);
  let runs = 0;
  const score = full => {
    const s = hands.map(h => best(h.concat(full)).score), top = Math.max(...s), w = s.filter(x => x === top).length;
    s.forEach((x, i) => { if (x === top) win[i] += 1 / w; });
    runs++;
  };
  if (need === 0) score(board);
  else if (need <= 2) {
    for (let i = 0; i < deck.length; i++) {
      if (need === 1) { score(board.concat(deck[i])); continue; }
      for (let j = i + 1; j < deck.length; j++) score(board.concat(deck[i], deck[j]));
    }
  } else {
    const r = rng || (n => crypto.randomInt(n));
    for (let k = 0; k < 1500; k++) {
      const pickd = new Set();
      while (pickd.size < need) pickd.add(deck[r(deck.length)]);
      score(board.concat([...pickd]));
    }
  }
  return win.map(w => Math.round((w / runs) * 1000) / 10);
}

function shuffledDeck(rng) {
  const d = Array.from({ length: 52 }, (_, i) => i), r = rng || (n => crypto.randomInt(n));
  for (let i = 51; i > 0; i--) { const j = r(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

// ---------- the table ----------
class Table {
  constructor(opts) {
    this.opts = Object.assign({ seats: 10, sb: 5, bb: 10 }, opts || {});
    this.seats = Array(this.opts.seats).fill(null);     // { pid, stack, out (sitting out), timeouts }
    this.button = -1;
    this.hand = null;
    this.handNo = 0;
  }
  seatOf(pid) { return this.seats.findIndex(s => s && s.pid === pid); }
  sit(pid, idx, stack) {
    if (this.seatOf(pid) >= 0) throw new Error("You're already sitting down.");
    if (idx == null || idx < 0) idx = this.seats.findIndex(s => !s);
    if (idx < 0 || idx >= this.seats.length) throw new Error('The table is full.');
    if (this.seats[idx]) throw new Error('Someone is sitting there.');
    if (!(stack > 0)) throw new Error('You need chips to sit down.');
    this.seats[idx] = { pid, stack: Math.floor(stack), out: false, timeouts: 0 };
    return idx;
  }
  // stand up: folds you out of a running hand first. Returns the chips you take with you.
  leave(pid) {
    const i = this.seatOf(pid);
    if (i < 0) return 0;
    const h = this.hand, pl = h && !h.done ? h.players.find(p => p.pid === pid) : null;
    if (pl && !pl.folded) this.fold(pl);
    const chips = this.seats[i].stack;
    this.seats[i] = null;
    return chips;
  }
  eligible() { return this.seats.map((s, i) => (s && s.stack > 0 && !s.out ? i : -1)).filter(i => i >= 0); }
  canStart() { return this.eligible().length >= 2 && (!this.hand || this.hand.done); }
  nextSeat(from, list) { for (let k = 1; k <= this.seats.length; k++) { const i = (from + k) % this.seats.length; if (list.includes(i)) return i; } return -1; }

  startHand(rng) {
    if (!this.canStart()) throw new Error('Need at least two players with chips.');
    const live = this.eligible(), { sb, bb } = this.opts;
    this.button = this.nextSeat(this.button < 0 ? live[live.length - 1] : this.button, live);
    const headsUp = live.length === 2;
    const sbSeat = headsUp ? this.button : this.nextSeat(this.button, live);
    const bbSeat = this.nextSeat(sbSeat, live);
    const deck = shuffledDeck(rng);
    // everyone in seat order, starting left of the button
    const order = [];
    for (let k = 1; k <= this.seats.length; k++) { const i = (this.button + k) % this.seats.length; if (live.includes(i)) order.push(i); }
    const h = this.hand = {
      no: ++this.handNo, deck, board: [], street: 'preflop', button: this.button, sbSeat, bbSeat, headsUp,
      players: order.map(seat => ({ pid: this.seats[seat].pid, seat, cards: [deck.pop(), deck.pop()], committed: 0, bet: 0, folded: false, allin: false, acted: false, seen: -1, last: null })),
      currentBet: 0, minRaise: bb, fullSeq: 0, toAct: -1, stage: 'betting', done: false, result: null, log: [],
    };
    this.post(this.pl(sbSeat), sb, 'SB');
    this.post(this.pl(bbSeat), bb, 'BB');
    h.currentBet = bb;
    // preflop the player after the big blind starts (heads-up: the button, who posted the small blind)
    this.setTurn(this.nextToAct(h.players.indexOf(this.pl(bbSeat))));
    if (h.toAct < 0) h.stage = 'between';
    return h;
  }
  pl(seat) { return this.hand.players.find(p => p.seat === seat); }
  post(pl, amt, label) {
    const s = this.seats[pl.seat], a = Math.min(amt, s.stack);
    s.stack -= a; pl.bet += a; pl.committed += a;
    if (s.stack === 0) pl.allin = true;
    pl.last = label;
  }
  // the next player (after index i) who still has a decision to make this round, or -1
  nextToAct(i) {
    const h = this.hand, n = h.players.length;
    for (let k = 1; k <= n; k++) {
      const p = h.players[(i + k) % n];
      if (p.folded || p.allin) continue;
      if (!p.acted || p.bet < h.currentBet) return (i + k) % n;
    }
    return -1;
  }
  setTurn(idx) { this.hand.toAct = idx; }
  inHand() { return this.hand.players.filter(p => !p.folded); }
  current() { const h = this.hand; return h && !h.done && h.stage === 'betting' && h.toAct >= 0 ? h.players[h.toAct] : null; }

  // what the player whose turn it is may do
  legal(pid) {
    const p = this.current();
    if (!p || p.pid !== pid) return null;
    const h = this.hand, s = this.seats[p.seat], toCall = Math.max(0, h.currentBet - p.bet);
    const maxTo = p.bet + s.stack;
    const canRaise = s.stack > toCall && (p.seen !== h.fullSeq || !p.acted) && this.inHand().filter(q => !q.allin && q !== p).length > 0;
    const minTo = Math.min(maxTo, h.currentBet + h.minRaise);
    return { toCall: Math.min(toCall, s.stack), canCheck: toCall === 0, canRaise, minTo, maxTo, currentBet: h.currentBet, bet: p.bet, stack: s.stack, pot: this.potTotal() };
  }
  act(pid, move, amount) {
    const h = this.hand, p = this.current();
    if (!p) throw new Error('Nobody can act right now.');
    if (p.pid !== pid) throw new Error("It's not your turn.");
    const L = this.legal(pid), s = this.seats[p.seat];
    if (move === 'allin') { move = L.canRaise && L.maxTo > h.currentBet ? 'raise' : 'call'; amount = L.maxTo; }
    if (move === 'fold') { h.log.push([pid, 'fold']); s.timeouts = 0; this.fold(p); return h; }
    if (move === 'check') {
      if (!L.canCheck) throw new Error(`You need to call ${L.toCall} or fold.`);
      p.last = 'check'; h.log.push([pid, 'check']);
    } else if (move === 'call') {
      if (L.canCheck) { p.last = 'check'; h.log.push([pid, 'check']); }
      else {
        const a = Math.min(L.toCall, s.stack);
        s.stack -= a; p.bet += a; p.committed += a;
        if (s.stack === 0) p.allin = true;
        p.last = p.allin ? 'allin' : 'call'; h.log.push([pid, 'call', a]);
      }
    } else if (move === 'raise' || move === 'bet') {
      if (!L.canRaise) throw new Error(L.canCheck ? 'You can only check or fold here.' : 'You can only call or fold here.');
      let to = Math.floor(Number(amount));
      if (!Number.isFinite(to)) throw new Error('How much?');
      to = Math.min(to, L.maxTo);
      if (to < L.minTo && to < L.maxTo) throw new Error(`The smallest ${h.currentBet ? 'raise' : 'bet'} is to ${L.minTo}.`);
      if (to <= h.currentBet) throw new Error(`That's not a raise. Call ${L.toCall} instead.`);
      const a = to - p.bet, size = to - h.currentBet, facing = h.currentBet > 0;
      s.stack -= a; p.bet = to; p.committed += a;
      if (s.stack === 0) p.allin = true;
      if (size >= h.minRaise) { h.minRaise = size; h.fullSeq += 1; }       // a full raise reopens the betting for everyone
      h.currentBet = to;
      p.last = p.allin ? 'allin' : facing ? 'raise' : 'bet';
      h.log.push([pid, facing ? 'raise' : 'bet', to, h.street]);
    } else throw new Error('Unknown move.');
    p.acted = true; p.seen = h.fullSeq; s.timeouts = 0;
    return this.afterAct(p);
  }
  fold(p) {
    const h = this.hand;
    p.folded = true; p.last = 'fold'; p.acted = true;
    if (h.players[h.toAct] === p || this.inHand().length <= 1) this.afterAct(p);
  }
  afterAct(p) {
    const h = this.hand;
    if (this.inHand().length === 1) { h.stage = 'between'; h.toAct = -1; return h; }
    const idx = h.players.indexOf(p), nx = this.nextToAct(h.toAct >= 0 ? h.toAct : idx);
    if (nx < 0) { h.stage = 'between'; h.toAct = -1; }
    else if (h.toAct === idx || h.toAct < 0) this.setTurn(nx);
    return h;
  }
  potTotal() { return this.hand ? this.hand.players.reduce((a, p) => a + p.committed, 0) : 0; }

  // a betting round is over: return any uncalled chips, then deal the next street or settle the hand
  advance() {
    const h = this.hand;
    if (!h || h.done || h.stage !== 'between') return h;
    this.refundUncalled();
    for (const p of h.players) { p.bet = 0; p.acted = false; p.last = p.folded ? 'fold' : p.allin ? 'allin' : null; }
    h.currentBet = 0; h.minRaise = this.opts.bb; h.fullSeq += 1;
    if (this.inHand().length === 1) return this.settle();
    if (h.board.length >= 5) return this.settle();
    h.deck.pop();                                                   // burn
    if (h.board.length === 0) { h.board.push(h.deck.pop(), h.deck.pop(), h.deck.pop()); h.street = 'flop'; }
    else { h.board.push(h.deck.pop()); h.street = h.board.length === 4 ? 'turn' : 'river'; }
    const canBet = this.inHand().filter(p => !p.allin);
    if (canBet.length >= 2) {
      h.stage = 'betting';
      // after the flop, the first player left of the button still in the hand starts
      this.setTurn(this.nextToAct(h.players.length - 1));
      if (h.toAct < 0) h.stage = 'between';
    } else h.stage = 'between';                                     // everyone's all in: just deal it out
    return h;
  }
  refundUncalled() {
    // the biggest bet nobody matched goes back to whoever made it (a folded player's chips stay in the pot)
    const h = this.hand, bets = h.players.map(p => p.bet).sort((a, b) => b - a);
    if (bets[0] > (bets[1] || 0)) {
      const p = h.players.find(q => q.bet === bets[0]), back = bets[0] - (bets[1] || 0), seat = this.seats[p.seat];
      if (p.folded || !seat || seat.pid !== p.pid) return;
      p.bet -= back; p.committed -= back; seat.stack += back;
      if (p.allin && seat.stack > 0) p.allin = false;
    }
  }
  // split the pot(s) between the best hands
  settle() {
    const h = this.hand, live = this.inHand();
    this.refundUncalled();
    const pots = [];
    const levels = [...new Set(live.map(p => p.committed))].sort((a, b) => a - b);
    let prev = 0;
    for (const L of levels) {
      let amount = 0;
      for (const p of h.players) amount += Math.max(0, Math.min(p.committed, L) - prev);
      const eligible = live.filter(p => p.committed >= L);
      if (amount > 0) pots.push({ amount, eligible });
      prev = L;
    }
    // chips from folded players above the last live level (can't happen after refunds, but never lose chips)
    const counted = pots.reduce((a, x) => a + x.amount, 0), total = this.potTotal();
    if (total > counted && pots.length) pots[pots.length - 1].amount += total - counted;
    const showdown = live.length > 1;
    const ranks = new Map();
    if (showdown) for (const p of live) { const b = best(p.cards.concat(h.board)); ranks.set(p.pid, b); }
    const won = new Map();
    const result = { pots: [], showdown, board: h.board.slice(), hands: {} };
    const leftOfButton = p => (p.seat - h.button - 1 + 2 * this.seats.length) % this.seats.length;     // odd chips go to the first winner left of the button
    for (const pot of pots) {
      let winners;
      if (!showdown) winners = pot.eligible;
      else {
        const top = Math.max(...pot.eligible.map(p => ranks.get(p.pid).score));
        winners = pot.eligible.filter(p => ranks.get(p.pid).score === top);
      }
      winners.sort((a, b) => leftOfButton(a) - leftOfButton(b));
      const share = Math.floor(pot.amount / winners.length);
      let odd = pot.amount - share * winners.length;
      for (const w of winners) { const got = share + (odd > 0 ? 1 : 0); if (odd > 0) odd--; won.set(w.pid, (won.get(w.pid) || 0) + got); }
      result.pots.push({ amount: pot.amount, winners: winners.map(w => w.pid), hand: showdown ? handName(ranks.get(winners[0].pid)) : null });
    }
    for (const [pid, amt] of won) { const i = this.seatOf(pid); if (i >= 0) this.seats[i].stack += amt; else result.lost = (result.lost || 0) + amt; }
    if (showdown) for (const p of live) { const b = ranks.get(p.pid); result.hands[p.pid] = { cards: p.cards, name: handName(b), best: b.five, score: b.score }; }
    result.won = Object.fromEntries(won);
    h.result = result; h.done = true; h.stage = 'done'; h.toAct = -1;
    for (const p of h.players) p.bet = 0;
    return h;
  }
}

module.exports = { Table, best, eval5, handName, describe, equity, cardStr, shuffledDeck, RANKS, SUITS };

window.Holdem = module.exports;
})();
