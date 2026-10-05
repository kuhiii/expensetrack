// A gullak-house doorway: thick clay arch with painted dots and a mustard band, teal double doors
// standing half open with brass studs, light beyond, a clay threshold, a small mango-leaf toran.
// Drawn flat (front-on), then mapped onto a side wall in perspective.
const { Spr } = require('./v2sprites');

function doorFront({ glow = '#4A291D', stairs = false } = {}) {
  const W = 40, H = 60, s = new Spr(W, H), cx = W / 2, R = W / 2, archY = R, RIM = 6;
  const inArch = (x, y, r) => y >= archY || (x + 0.5 - cx) ** 2 + (y + 0.5 - archY) ** 2 <= r * r;
  const C = { frame: '#7A4A32', frameL: '#946042', frameD: '#5E3624', dark: '#3A1F16',
    cur: '#9A3F32', curD: '#76291F', curL: '#B4584A' };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inArch(x, y, R)) continue;
    const inner = inArch(x, y, R - RIM) && x >= RIM && x < W - RIM;
    if (!inner) {
      // thick plain brown frame, lit on its inner edge
      const d = y >= archY ? Math.min(x, W - 1 - x) : R - Math.hypot(x + 0.5 - cx, y + 0.5 - archY);
      s.set(x, y, d > RIM - 1.5 ? C.frameL : d < 1.2 ? C.frameD : C.frame);
      continue;
    }
    s.set(x, y, y < 14 ? C.dark : glow);
    if (stairs && y > H - 20) { const k = (y - (H - 20)) % 5; s.set(x, y, k < 2 ? '#6E4232' : '#56321F'); }
    if (y >= H - 1) s.set(x, y, '#3A1F16');
  }
  // brown-red curtains, gathered to each side, soft vertical folds
  for (const side of [0, 1]) {
    for (let y = RIM; y < H; y++) {
      // hanging straight down to the floor, flaring a little where the fabric pools
      const w = 8 + (y > H - 6 ? Math.round((y - (H - 6)) / 2) : 0);
      for (let i = 0; i < w; i++) {
        const x = side ? W - RIM - 1 - i : RIM + i;
        if (!inArch(x, y, R - RIM)) continue;
        const fold = i % 3;
        s.set(x, y, i === w - 1 ? C.curD : fold === 0 ? C.curL : fold === 1 ? C.cur : C.curD);
      }
    }
  }
  return s.outline('#4A2A1E');
}

// map the front-on door onto a side wall: far jamb at fx (short), near jamb at nx (tall)
function doorOnWall(cv, spr, fx, nx, farBottom, nearBottom, farH, nearH) {
  const n = Math.abs(nx - fx), dir = Math.sign(nx - fx);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = fx + dir * i, bot = farBottom + (nearBottom - farBottom) * t, h = farH + (nearH - farH) * t;
    const u = Math.min(spr.w - 1, Math.floor((dir > 0 ? t : 1 - t) * spr.w));
    for (let y = Math.round(bot - h); y < bot; y++) {
      const v = Math.min(spr.h - 1, Math.floor(((y - (bot - h)) / h) * spr.h));
      const c = spr.d[v * spr.w + (dir > 0 ? u : u)];
      if (c) cv.px(x, y, c);
    }
  }
  return { x: (fx + nx) / 2, y: farBottom - farH - 8 };
}

// The door's opening (inside the frame), as a rectangle she can be visible in while she
// passes through it: the lowest top and the threshold at the door's middle.
function doorOpening(fx, nx, farBottom, nearBottom, farH, nearH) {
  const n = Math.abs(nx - fx), dir = Math.sign(nx - fx);
  let x0 = Infinity, x1 = -Infinity, top = -Infinity, bots = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = fx + dir * i, bot = farBottom + (nearBottom - farBottom) * t, h = farH + (nearH - farH) * t;
    const u = dir > 0 ? t : 1 - t;
    if (u < 7 / 40 || u > 33 / 40) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1);
    top = Math.max(top, bot - h + h * (15 / 60));
    bots.push(bot);
  }
  const bottom = bots.reduce((a, b) => a + b, 0) / bots.length;
  return { x: x0 * 2, y: Math.round(top * 2), w: (x1 - x0) * 2, h: Math.round((bottom - top) * 2) };
}

module.exports = { doorFront, doorOnWall, doorOpening };
