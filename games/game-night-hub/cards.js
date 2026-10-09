/* Playing cards for the Hold'em pages. A card is a number 0-51 (rank = n % 13, 0 is a two and 12 an ace;
   suit = floor(n / 13): spades, hearts, diamonds, clubs). -1 is a face-down card. Four colors, so suits read at a glance. */
(function (root) {
  'use strict';
  const RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const SUIT = ['♠', '♥', '♦', '♣'], SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];
  const COLOR = ['#16161d', '#d92b3a', '#1f6fd6', '#1c8a3e'];
  const NAME = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
  function html(c, cls, hi) {
    if (c == null) return `<span class="card empty ${cls || ''}"></span>`;
    if (c < 0) return `<span class="card back ${cls || ''}" aria-label="Face-down card"></span>`;
    const r = c % 13, s = Math.floor(c / 13);
    return `<span class="card ${cls || ''}${hi ? ' hi' : ''}" style="--c:${COLOR[s]}" aria-label="${NAME[r]} of ${SUIT_NAME[s]}"><b>${RANK[r]}</b><i>${SUIT[s]}</i></span>`;
  }
  // styles both pages share; each page sizes cards with --w
  const css = `.card{--w:56px;position:relative;display:inline-grid;place-items:center;width:var(--w);height:calc(var(--w)*1.4);border-radius:calc(var(--w)*.12);background:#fff;color:var(--c);
    box-shadow:0 3px 10px rgba(0,0,0,.35);font-family:"Barlow",Arial,sans-serif;line-height:1;flex:none;vertical-align:middle}
  .card b{position:absolute;top:calc(var(--w)*.08);left:calc(var(--w)*.1);font-weight:800;font-size:calc(var(--w)*.36);letter-spacing:-.04em}
  .card i{font-style:normal;font-size:calc(var(--w)*.62);margin-top:calc(var(--w)*.3)}
  .card.back{background:repeating-linear-gradient(45deg,#ff4f81 0 6px,#d63a68 6px 12px);border:calc(var(--w)*.06) solid #fff}
  .card.empty{background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 2px rgba(255,255,255,.18)}
  .card.hi{box-shadow:0 0 0 3px #ffc53d,0 3px 14px rgba(255,197,61,.6)}
  .card.dim{filter:brightness(.55)}
  .card.deal{animation:deal .35s cubic-bezier(.2,1.2,.4,1)}
  @keyframes deal{from{transform:translateY(-30px) rotate(-8deg);opacity:0}}
  @media (prefers-reduced-motion:reduce){.card.deal{animation:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  root.Cards = { html, RANK, SUIT, NAME };
})(window);
