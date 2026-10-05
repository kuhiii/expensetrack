// Gharondas: little hand-made whitewashed clay houses — wobbly, rounded, impractical — with
// openings ringed in paint and curls painted over the walls in the category's colour.
// Ten different silhouettes, each with two window layouts, so every category gets its own house.
const { Spr } = require('./v2sprites');
const { K } = require('./v3sprites');

const shade = (hex, f) => '#' + [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)).toString(16).padStart(2, '0')).join('');
// darken toward the clay's plum rather than to black, so openings stay soft
const mixDark = (hex, f) => '#' + [1, 3, 5].map((i, k) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f + [0x4e, 0x2a, 0x30][k] * (1 - f) * 0.9).toString(16).padStart(2, '0')).join('');

const GW = 30, GH = 34, G = 33; // canvas, ground line

class Mask {
  constructor() { this.m = Array.from({ length: GH }, () => new Array(GW).fill(false)); }
  get(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH && this.m[y][x]; }
  set(x, y, v = true) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) this.m[y][x] = v; return this; }
  rect(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y); return this; }
  ell(cx, cy, rx, ry, yMax = GH) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (y <= yMax && ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y);
    return this;
  }
  /** a rectangle with a round top */
  arch(x0, x1, yTop, yBot) {
    const r = (x1 - x0 + 1) / 2, cx = x0 + r;
    this.ell(cx, yTop + r, r, r, yTop + r).rect(x0, Math.round(yTop + r), x1, yBot);
    return this;
  }
  /** an onion dome sitting on yBase */
  onion(cx, yBase, w, h) {
    for (let y = 0; y < h; y++) {
      const t = y / h; // 0 at the tip
      const half = t < 0.3 ? (w / 2) * 0.8 * Math.pow(t / 0.3, 1.3) : (w / 2) * Math.max(0.55, Math.sin(Math.PI * (0.2 + 0.62 * t)));
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) if (Math.abs(x + 0.5 - cx) <= half + 0.3) this.set(x, yBase - h + y);
    }
    this.set(cx, yBase - h - 1).set(cx, yBase - h - 2);
    return this;
  }
  /** shave hard corners so every outline reads soft and hand-pressed */
  round(passes = 1) {
    for (let p = 0; p < passes; p++) {
      const kill = [];
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        if (!this.get(x, y) || y >= G) continue;
        const n = this.get(x - 1, y) + this.get(x + 1, y) + this.get(x, y - 1) + this.get(x, y + 1);
        if (n <= 2 && !(this.get(x - 1, y) && this.get(x + 1, y)) && !(this.get(x, y - 1) && this.get(x, y + 1))) kill.push([x, y]);
      }
      kill.forEach(([x, y]) => (this.m[y][x] = false));
    }
    return this;
  }
}

// ---- the ten silhouettes. Each returns { mask, openings } for layout variant v (0/1).
// openings: ['arch', x, y, w, h] | ['round', cx, cy, r]; the lowest openings hold the coins.
const SHAPES = [
  // 0 · box with a spire on one side (the reference)
  (v) => {
    const m = new Mask().rect(2, 15, 27, G);
    const sx = v ? 22 : 7;
    for (let y = 2; y < 15; y++) { const h = Math.round((y - 2) * 0.55); m.rect(sx - h, y, sx + h, y); }
    return { m, o: [['arch', 4, 23, 7, 10], ['arch', 12, 23, 6, 10], ['arch', 19, 23, 7, 10], ...(v ? [['arch', 6, 16, 5, 5], ['arch', 13, 16, 5, 5]] : [['arch', 13, 16, 5, 5], ['arch', 20, 16, 5, 5]]), ['round', sx, 10, 1.5]] };
  },
  // 1 · round hut with a little finial
  (v) => {
    const m = new Mask().ell(15, 24, 13.5, 11, G).rect(3, 24, 26, G);
    m.rect(14, 10, 15, 13);
    return { m, o: v ? [['arch', 11, 22, 8, 11], ['round', 22, 21, 1.8]] : [['arch', 6, 24, 6, 9], ['arch', 18, 24, 6, 9]] };
  },
  // 2 · temple with an onion dome
  (v) => {
    const m = new Mask().rect(5, 19, 24, G).onion(15, 20, 18, 15);
    if (v) m.rect(3, 26, 26, G);
    return { m, o: v ? [['arch', 6, 26, 5, 7], ['arch', 13, 24, 5, 9], ['arch', 20, 26, 5, 7]] : [['arch', 8, 23, 5, 10], ['arch', 17, 23, 5, 10]] };
  },
  // 3 · long low house with three small domes
  (v) => {
    const m = new Mask().rect(1, 21, 28, G);
    for (const cx of v ? [8, 22] : [6, 15, 24]) m.ell(cx, 21, v ? 6 : 4.5, v ? 7 : 5.5, 21);
    if (v) m.ell(15, 19, 3, 3.5, 21);
    return { m, o: v ? [['arch', 3, 25, 6, 8], ['arch', 12, 25, 6, 8], ['arch', 21, 25, 6, 8], ['round', 8, 18, 1.5], ['round', 22, 18, 1.5]] : [['arch', 3, 26, 5, 7], ['arch', 9, 26, 5, 7], ['arch', 16, 26, 5, 7], ['arch', 22, 26, 5, 7]] };
  },
  // 4 · one big arch: the whole house is a rounded arch
  (v) => {
    const m = new Mask().arch(3, 26, v ? 4 : 8, G);
    return { m, o: v ? [['arch', 10, 20, 10, 13], ['round', 15, 12, 2.4]] : [['arch', 6, 23, 6, 10], ['arch', 18, 23, 6, 10], ['arch', 12, 15, 6, 6]] };
  },
  // 5 · stepped like a wedding cake, a little dome on top
  (v) => {
    const m = new Mask().rect(1, 25, 28, G).rect(5, 17, 24, 25).rect(9, 10, 20, 17).ell(15, 10, 4, 4.5, 10);
    return { m, o: v ? [['arch', 3, 27, 5, 6], ['arch', 22, 27, 5, 6], ['arch', 12, 26, 6, 7], ['round', 15, 13, 1.6]] : [['arch', 4, 27, 4, 6], ['arch', 10, 27, 4, 6], ['arch', 16, 27, 4, 6], ['arch', 22, 27, 4, 6], ['arch', 8, 19, 4, 5], ['arch', 18, 19, 4, 5]] };
  },
  // 6 · a tall round-topped tower with a low annex
  (v) => {
    const ax0 = v ? 2 : 20, ax1 = v ? 10 : 27;
    const tx0 = v ? 11 : 6, tx1 = v ? 22 : 17;
    const m = new Mask().arch(tx0, tx1, 2, G).rect(ax0, 22, ax1, G).ell((ax0 + ax1) / 2, 22, (ax1 - ax0) / 2, 3, 22);
    return { m, o: [['arch', tx0 + 3, 23, 6, 10], ['round', (tx0 + tx1) / 2, 15, 1.8], ['round', (tx0 + tx1) / 2, 9, 1.5], ['arch', ax0 + 2, 26, 4, 7]] };
  },
  // 7 · twin round towers joined by a low wall
  (v) => {
    const m = new Mask().rect(3, 20, 26, G).arch(2, 10, v ? 4 : 7, G).arch(19, 27, v ? 7 : 4, G);
    return { m, o: [['arch', 4, 24, 5, 9], ['arch', 21, 24, 5, 9], ['arch', 12, 23, 6, 10], ['round', 6, v ? 12 : 14, 1.6], ['round', 23, v ? 14 : 12, 1.6]] };
  },
  // 8 · a crooked leaning house with a pointy roof and a flag
  (v) => {
    const m = new Mask(), lean = v ? -0.22 : 0.22;
    for (let y = 12; y <= G; y++) { const off = (G - y) * lean; m.rect(Math.round(5 + off), y, Math.round(24 + off), y); }
    const rx = 14.5 + (G - 12) * lean;
    for (let y = 3; y < 12; y++) { const h = Math.round((y - 3) * 1.15); m.rect(Math.round(rx - h), y, Math.round(rx + h), y); }
    m.rect(Math.round(rx), 0, Math.round(rx), 3);
    return { m, o: [['arch', 7, 24, 6, 9], ['arch', 16, 24, 6, 9], ['arch', Math.round(12 + 9 * lean), 15, 5, 6]], flag: [Math.round(rx), 0] };
  },
  // 9 · a beehive of stacked rounded tiers
  (v) => {
    const m = new Mask().ell(15, 29, 14, 5, G).rect(2, 29, 27, G).ell(15, 22, v ? 12 : 11, 5).ell(15, 15, v ? 9 : 8, 5).ell(15, 9, 5, 4).rect(15, 3, 15, 5);
    return { m, o: v ? [['arch', 12, 26, 6, 7], ['arch', 6, 20, 4, 4], ['arch', 19, 20, 4, 4], ['round', 15, 14, 1.8]] : [['arch', 5, 27, 5, 6], ['arch', 20, 27, 5, 6], ['arch', 12, 27, 6, 6], ['arch', 11, 19, 3, 4], ['arch', 16, 19, 3, 4]] };
  },
];

function gharonda(index, fill, painted = true) {
  const shape = index % SHAPES.length, v = Math.floor(index / SHAPES.length) % 2;
  const { wall, decor } = painted ? coloursFor(index) : { wall: '#F7F1EA', decor: '#F7F1EA' };
  const WH = wall, WD = shade(wall, 0.9), WL = shade(wall, 1.05), HOLE = mixDark(decor, 0.38), HOLED = mixDark(decor, 0.24);
  const band = decor;
  const { m, o, flag } = SHAPES[shape](v);
  m.round(2);
  const s = new Spr(GW, GH);
  const paint = shade(band, 0.84), paintL = band;
  let sd = index * 7919 + 17;
  const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  // whitewash, lit from the left and from above, shaded on the right
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (!m.get(x, y)) continue;
    let c = WH;
    if (!m.get(x + 1, y) || !m.get(x + 2, y)) c = WD;
    else if (!m.get(x - 1, y) || !m.get(x, y - 1)) c = WL;
    s.set(x, y, c);
  }
  // openings, each ringed in paint
  const lowest = [];
  for (const op of o) {
    const inside = [];
    if (op[0] === 'arch') {
      const [, x, y, w, h] = op, rr = w / 2, peak = Math.ceil(rr) + 1;
      const half = (yy) => (yy >= peak ? rr : rr * Math.pow((yy + 1) / (peak + 1), 0.55));
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (Math.abs(xx + 0.5 - rr) <= half(yy)) inside.push([x + xx, y + yy, yy < 2 || xx === 0]);
      if (y + h >= G - 1) lowest.push([x + w / 2, G - 1]);
    } else {
      const [, cx, cy, rad] = op;
      for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++)
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad) inside.push([x, y, y < cy]);
    }
    const set = new Set(inside.map(([x, y]) => `${x},${y}`));
    if (painted) for (const [x, y] of inside) for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]]) {
      if (!set.has(`${x + dx},${y + dy}`) && m.get(x + dx, y + dy)) s.set(x + dx, y + dy, paint);
    }
    for (const [x, y, dark] of inside) s.set(x, y, dark ? HOLED : HOLE);
  }
  // painted curls and dots over the walls
  if (painted) {
    const isWall = (x, y) => [WH, WD, WL].includes(s.get(x, y));
    const CURLS = [[[0, 0], [1, 0], [1, 1]], [[0, 1], [0, 0], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [0, 1]], [[0, 0]], [[0, 0], [1, 1]]];
    for (let i = 0; i < 70; i++) {
      const x = 1 + Math.floor(r() * 28), y = 1 + Math.floor(r() * 31);
      const curl = CURLS[Math.floor(r() * CURLS.length)];
      if (!curl.every(([dx, dy]) => isWall(x + dx, y + dy))) continue;
      const col = r() < 0.6 ? paint : paintL;
      curl.forEach(([dx, dy]) => s.set(x + dx, y + dy, col));
    }
    for (let x = 0; x < GW; x += 2) if (m.get(x, G)) s.set(x, G, paint);
    if (flag) s.rect(flag[0] + 1, flag[1], 3, 2, paintL);
  }
  // coins resting in the lowest openings
  lowest.slice(0, fill).forEach(([cx, cy]) => {
    s.ell(cx, cy - 0.5, 2.6, 1.6, K.coin, K.coinD, K.coinH);
    if (fill >= 3) s.ell(cx - 0.5, cy - 2.5, 2.2, 1.4, K.coin, K.coinD, K.coinH);
  });
  return s.outline('#6B4A40');
}

// ---- colours: one hand-picked colour family per house, all clearly different from each other.
// The decor is the colour itself; the walls are white or a pale wash of that same colour,
// so a house never borrows another house's colour.
const FAMILIES = [
  '#3F6FD8', // cobalt
  '#F07A5A', // coral
  '#E8508F', // hot pink
  '#4FAF4A', // leaf green
  '#1FA39A', // teal
  '#E0A526', // mustard
  '#8A5CD1', // violet
  '#5BB8F0', // sky blue
  '#F28C28', // orange
  '#C8323C', // crimson
  '#A8C830', // lime
  '#2B3F8C', // navy
  '#C03FC0', // magenta
  '#A0522D', // terracotta brown
  '#6E7C8C', // slate grey
  '#F2D04A', // butter yellow
  '#2E7A44', // forest green
  '#F4A6C0', // rose
  '#36C5D6', // turquoise
  '#7E2A3A', // maroon
  '#7D8A2E', // olive
  '#B79CE8', // lavender
  '#D2B48C', // tan
  '#4B3FA0', // indigo
  '#F6B48A', // peach
  '#3A3A3A', // charcoal
  '#5FD6B0', // mint
];
const mixWhite = (hex, f) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - f) + 247 * f).toString(16).padStart(2, '0')).join('');
function coloursFor(index) {
  const decor = FAMILIES[index % FAMILIES.length];
  const wall = index % 3 === 0 ? '#F7F1EA' : mixWhite(decor, 0.8);
  return { wall, decor };
}
module.exports = { gharonda, coloursFor, SHAPE_COUNT: SHAPES.length };
