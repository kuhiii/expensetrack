// Tulsi where every month of saving is one leaf (leaf style from Kuhi's plant reference:
// purple stems, chunky two-tone green leaves). Leaf size ∝ √(saved / best month); a month you
// withdrew from shrinks and yellows. Branch tips without a leaf carry tulsi manjari.
const { Spr } = require('./v2sprites');
const { K, OUT } = require('./v3sprites');

const STEM = '#6B3A6E', STEM_L = '#8C5490';
const GREEN = ['#33C27F', '#1F9E6B', '#1B6E55'];
const WILT = ['#C3D477', '#A0B858', '#7C9140'];

function bez(p0, c, p1, t) {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
  return [a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]];
}

function leaf(s, cx, cy, ang, rx, ry, pal) {
  const R = Math.ceil(rx) + 2, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const u = x * ca + y * sa, v = -x * sa + y * ca;
    const ryE = ry * (1 - 0.32 * Math.max(-1, Math.min(1, u / rx)));
    const q = (u / rx) ** 2 + (v / ryE) ** 2;
    if (q > 1) continue;
    let c = pal[1];
    if (v < -0.1 * ryE) c = pal[0];
    if (q > 0.55 && v > 0.1 * ryE) c = pal[2];
    if (Math.abs(v) < 0.6 && u > -rx * 0.75 && u < rx * 0.55) c = pal[2];
    s.set(cx + x, cy + y, c);
  }
}

// dotted outline of a leaf's former size
function ghost(s, cx, cy, ang, rx, ry) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let a = 0; a < Math.PI * 2; a += 0.09) {
    const u = Math.cos(a) * rx, v = Math.sin(a) * ry * (1 - 0.32 * Math.cos(a));
    const x = Math.round(cx + u * ca - v * sa), y = Math.round(cy + u * sa + v * ca);
    if (!s.get(x, y) && Math.round(a / 0.09) % 2 === 0) s.set(x, y, '#9BCFA8');
  }
}

// months: [{ m, amt, peak? }] oldest first. A young tulsi: one stem that grows a node per month;
// leaves alternate left/right, base at the stem, pointing outward and up. Newest at the top, with a bud.
function tulsiMonths(months) {
  const W = 96, H = 30 + months.length * 14 + 14, s = new Spr(W, H), bx = 48, by = H - 1;
  const max = Math.max(...months.map((m) => m.peak || m.amt));
  const nodeY = (i) => by - 16 - i * 14;
  const topY = nodeY(months.length - 1) - 10;
  // main stem with a slight sway, two pixels wide, lit on the left
  const sx = (y) => bx + Math.round(Math.sin((by - y) / 18) * 1.5);
  for (let y = by; y >= topY; y--) s.set(sx(y), y, STEM).set(sx(y) + 1, y, STEM).set(sx(y) - 1, y, y > by - 20 ? STEM_L : null);
  // tip bud
  s.ell(sx(topY), topY - 1, 2, 2.5, GREEN[0], GREEN[1]);
  const placed = [];
  months.forEach((mo, i) => {
    const y = nodeY(i), x = sx(y), side = i % 2 === 0 ? -1 : 1;
    const ang = side < 0 ? Math.PI + 0.5 : -0.5; // outward and up
    const rx = 6 + 9 * Math.sqrt(mo.amt / max), ry = rx * 0.62;
    // short petiole
    for (let k = 1; k <= 3; k++) s.set(x + side * (k + 1), y - Math.round(k * 0.5), STEM);
    const px = x + side * 4, py = y - 2;
    const cx = px + Math.cos(ang) * rx * 0.95, cy = py + Math.sin(ang) * rx * 0.95;
    leaf(s, cx, cy, ang, rx, ry, mo.peak && mo.amt < mo.peak / 2 ? WILT : GREEN);
    if (mo.peak) { // a faint outline of the size it had grown to before the withdrawal
      const prx = 6 + 9 * Math.sqrt(mo.peak / max), pcx = px + Math.cos(ang) * prx * 0.95, pcy = py + Math.sin(ang) * prx * 0.95;
      ghost(s, pcx, pcy, ang, prx, prx * 0.62);
    }
    placed.push({ ...mo, x: cx, y: cy, side });
  });
  return { spr: s, placed };
}

// the vrindavan on its own (from the v3 shrine)
function chaura() {
  const c = new Spr(76, 60), top = 4;
  const W = '#F4E6CF', Wd = '#DCC7A6', R = '#E58A6E', Rd = '#C8705A';
  c.rect(4, 50, 68, 10, W).rect(4, 50, 68, 2, R).rect(60, 50, 12, 10, Wd);
  c.rect(10, 14, 56, 36, W).rect(56, 14, 10, 36, Wd);
  c.rect(10, 14, 56, 3, R).rect(10, 44, 56, 3, R);
  c.rect(6, 6, 64, 8, W).rect(6, 6, 64, 2, R).rect(6, 12, 64, 2, Rd).rect(62, 6, 8, 8, Wd);
  for (const x of [6, 66]) c.rect(x, top - 2, 4, 6, W).rect(x + 1, top - 4, 2, 2, W).set(x + 1, top - 5, R);
  c.rect(10, 4, 56, 2, '#7A4E3C');
  c.rect(30, 22, 16, 20, '#7A4A3C').ell(38, 22, 8, 5, '#7A4A3C');
  c.ell(38, 38, 5, 2, '#E8A07F', '#CC7F5F');
  c.ell(38, 34, 1.5, 3, '#FFE08A', '#F6B060');
  for (const x of [16, 52]) { c.rect(x, 26, 4, 4, '#F3D98A').set(x + 1, 27, K.cream).rect(x - 1, 34, 6, 1, '#8FA3E0'); }
  for (let x = 12; x < 66; x += 6) c.set(x, 9, K.cream);
  return c.outline('#8A5A48');
}

// One leaf on its own, with its petiole, for the app to place on the stem.
// The petiole starts at the anchor (LEAF_ANCHOR), which the app puts on the stem node.
const LEAF_W = 38, LEAF_H = 30, LEAF_ANCHOR = { R: [1, 27], L: [36, 27] };
function leafSprite(side, bucket, state) {
  const s = new Spr(LEAF_W, LEAF_H), dir = side === 'R' ? 1 : -1, [ax, ay] = LEAF_ANCHOR[side];
  const ang = dir > 0 ? -0.5 : Math.PI + 0.5;
  const rx = 6 + 9 * Math.sqrt((bucket + 1) / 10), ry = rx * 0.62;
  for (let k = 0; k <= 3; k++) s.set(ax + dir * k, ay - Math.round(k * 0.5), STEM);
  const px = ax + dir * 4, py = ay - 2;
  const cx = px + Math.cos(ang) * rx * 0.95, cy = py + Math.sin(ang) * rx * 0.95;
  if (state === 'ghost') ghost(s, cx, cy, ang, rx, ry);
  else leaf(s, cx, cy, ang, rx, ry, state === 'wilt' ? WILT : GREEN);
  return s;
}

module.exports = { tulsiMonths, chaura, leafSprite, LEAF_W, LEAF_H, LEAF_ANCHOR, STEM, STEM_L, GREEN };
