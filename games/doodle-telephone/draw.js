/* Doodle Telephone drawing helpers, shared by the phone, the TV and the gallery.
   A drawing is { bg, s: [{ c, w, p: [x0, y0, x1, y1, ...] }] } on a 1000 x 1000 square; c is a hex color or 'bg' (eraser). */
(function (root) {
  'use strict';
  const colorOf = (st, d) => (st.c === 'bg' ? d.bg : st.c);

  // draws the first `n` points of one stroke (all of it when n is undefined), smoothed through the midpoints
  function stroke(g, st, d, k, n) {
    const p = st.p, m = Math.min(n == null ? Infinity : n, p.length / 2);
    if (m < 1) return;
    const col = colorOf(st, d), w = st.w * k;
    if (m === 1 || (p.length === 4 && p[0] === p[2] && p[1] === p[3])) {
      g.beginPath(); g.arc(p[0] * k, p[1] * k, w / 2, 0, Math.PI * 2); g.fillStyle = col; g.fill(); return;
    }
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(p[0] * k, p[1] * k);
    for (let i = 1; i < m - 1; i++) {
      const x = p[2 * i] * k, y = p[2 * i + 1] * k, nx = p[2 * i + 2] * k, ny = p[2 * i + 3] * k;
      g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    g.lineTo(p[2 * (m - 1)] * k, p[2 * (m - 1) + 1] * k);
    g.stroke();
  }

  // sizes a canvas for crisp lines at `css` pixels wide (square) and returns its 2d context
  function fit(canvas, css) {
    const dpr = Math.min(3, root.devicePixelRatio || 1), px = Math.max(1, Math.round(css * dpr));
    if (canvas.width !== px || canvas.height !== px) { canvas.width = px; canvas.height = px; }
    canvas.style.width = css + 'px'; canvas.style.height = css + 'px';
    return canvas.getContext('2d');
  }

  // the whole drawing at once
  function render(canvas, d, opts) {
    opts = opts || {};
    const g = canvas.getContext('2d'), k = canvas.width / 1000;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = (d && d.bg) || '#ffffff'; g.fillRect(0, 0, canvas.width, canvas.height);
    if (!d || opts.hide) return;
    for (const st of d.s) stroke(g, st, d, k);
  }

  // stroke by stroke over `ms` milliseconds, like watching someone draw it. Returns a function that stops it.
  function replay(canvas, d, ms, onDone) {
    let stop = false, raf = 0;
    if (!d || !d.s.length || root.matchMedia('(prefers-reduced-motion: reduce)').matches) { render(canvas, d); if (onDone) onDone(); return () => {}; }
    const g = canvas.getContext('2d'), k = canvas.width / 1000;
    const total = d.s.reduce((a, st) => a + st.p.length / 2, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = d.bg || '#ffffff'; g.fillRect(0, 0, canvas.width, canvas.height);
    let si = 0, t0 = performance.now(), drawnBefore = 0;       // points in strokes already finished
    const frame = now => {
      if (stop) return;
      const want = Math.min(total, Math.ceil(total * Math.min(1, (now - t0) / ms)));
      while (si < d.s.length) {
        const len = d.s[si].p.length / 2;
        if (drawnBefore + len <= want) { stroke(g, d.s[si], d, k); drawnBefore += len; si++; }
        else { stroke(g, d.s[si], d, k, want - drawnBefore); break; }
      }
      if (si >= d.s.length) { if (onDone) onDone(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { stop = true; cancelAnimationFrame(raf); };
  }

  root.Doodle = { stroke, fit, render, replay };
})(window);
