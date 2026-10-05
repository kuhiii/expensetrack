// v2 sprites: built from shaded shapes, then auto-outlined. 1 unit = 1 art px (= 2 dp in the app).
const OUT = '#4A3A4E';
const C = {
  dark: '#3E3044', white: '#FFFFFF', cream: '#FFF7EA', creamD: '#EADBC4',
  pink: '#F7A6B8', pinkD: '#E07F98', blush: '#FF9FB1',
  coin: '#FAD66E', coinD: '#E2B347', coinH: '#FFF1B8',
  gold: '#E8BE4F',
  orange: '#F7A35C', orangeD: '#DA7F3A',
  leaf: '#7CC474', leafD: '#58A356', leafH: '#AEE29B',
  steel: '#DCE1EA', steelD: '#AEB6C6', steelH: '#F4F6FA',
  sky: '#BFE3F7', skyD: '#9BCDEB',
};

class Spr {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x]; }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
    return this;
  }
  // only paint over pixels that already exist
  over(x, y, c) { if (this.get(Math.floor(x), Math.floor(y))) this.set(x, y, c); return this; }
  rect(x, y, w, h, c, onlyOver = false) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) (onlyOver ? this.over : this.set).call(this, x + i, y + j, c);
    return this;
  }
  // shaded ellipse: base, lower-right shade, upper-left highlight
  ell(cx, cy, rx, ry, c, shade, hi, onlyOver = false) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        let col = c;
        if (shade && nx * 0.4 + ny * 0.92 > 0.52) col = shade;
        if (hi && -nx * 0.55 - ny * 0.8 > 0.5) col = hi;
        onlyOver ? this.over(x, y, col) : this.set(x, y, col);
      }
    return this;
  }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
    return this;
  }
  pts(list, c) { for (const [x, y] of list) this.set(x, y, c); return this; }
  // glossy 2x2 eye with a white glint
  eye(x, y, h = 2) { this.rect(x, y, 2, h, C.dark); this.set(x, y, C.white); return this; }
  grid(rows, pal, x = 0, y = 0) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) this.set(x + i, y + j, pal[ch]); }));
    return this;
  }
  // new sprite, 1px larger each side, with the outline around the silhouette
  outline(col = OUT) {
    const o = new Spr(this.w + 2, this.h + 2);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.d[(y + 1) * o.w + x + 1] = this.d[y * this.w + x];
    const add = [];
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++)
        if (!o.get(x, y) && (o.get(x - 1, y) || o.get(x + 1, y) || o.get(x, y - 1) || o.get(x, y + 1))) add.push([x, y]);
    for (const [x, y] of add) o.set(x, y, col);
    return o;
  }
  stamp(cv, x, y, flip = false) {
    for (let j = 0; j < this.h; j++)
      for (let i = 0; i < this.w; i++) {
        const c = this.d[j * this.w + (flip ? this.w - 1 - i : i)];
        if (c) cv.px(x + i, y + j, c);
      }
  }
}

// ---- creatures ---------------------------------------------------------------

// floor 2 — the bookkeeper owl with round gold glasses
function owl() {
  const B = '#C3CBF2', Bd = '#97A2DA', Bh = '#E4E8FB';
  const s = new Spr(28, 30);
  s.ell(3.5, 19, 3.5, 7, Bd, '#7F8AC6');
  s.ell(24.5, 19, 3.5, 7, Bd, '#7F8AC6');
  s.ell(6.5, 6, 3, 4.5, B, Bd);
  s.ell(21.5, 6, 3, 4.5, B, Bd);
  s.ell(14, 17, 11.5, 12, B, Bd, Bh);
  s.ell(14, 22, 7, 6.5, C.cream, C.creamD, null, true);
  for (const y of [19, 22, 25]) for (const x of [11, 14, 17]) s.pts([[x, y], [x - 1, y - 1], [x + 1, y - 1]], C.creamD);
  for (const ex of [9, 19]) {
    s.ell(ex, 13, 4.6, 4.6, C.gold);
    s.ell(ex, 13, 3.4, 3.4, C.white);
    s.rect(ex - 1, 12, 2, 3, C.dark).set(ex - 1, 12, C.white);
  }
  s.pts([[13, 13], [14, 13], [15, 13]], C.gold);
  s.rect(13, 17, 2, 2, C.orange).set(14, 18, C.orangeD);
  s.rect(4, 17, 2, 1, C.blush).rect(22, 17, 2, 1, C.blush);
  s.rect(9, 28, 3, 2, C.orange).rect(16, 28, 3, 2, C.orange);
  return s.outline();
}

// floor 1 — the sorter mouse, in a mint apron, holding a coin
function mouse() {
  const G = '#DCD6EA', Gd = '#B4ACCD', Gh = '#F2EFF8';
  const s = new Spr(26, 24);
  s.pts([[21, 20], [22, 19], [23, 18], [23, 17], [22, 16]], C.pinkD);
  s.ell(6, 6, 5.5, 5.5, G, Gd);
  s.ell(18, 6, 5.5, 5.5, G, Gd);
  s.ell(6, 6.5, 3.2, 3.2, C.pink);
  s.ell(18, 6.5, 3.2, 3.2, C.pink);
  s.ell(12, 15, 9.5, 8.5, G, Gd, Gh);
  s.rect(5, 18, 14, 6, '#A9E3CF', true);
  s.rect(5, 18, 14, 1, '#86CDB5', true);
  s.set(12, 20, '#FFFFFF');
  s.eye(8, 12).eye(15, 12);
  s.set(12, 15, C.pinkD).set(11, 15, C.pink);
  s.pts([[11, 16], [13, 16]], C.dark);
  s.rect(5, 15, 2, 1, C.blush).rect(18, 15, 2, 1, C.blush);
  s.ell(21.5, 17, 3.3, 3.3, C.coin, C.coinD, C.coinH);
  s.set(21, 17, C.coinD);
  return s.outline();
}

// floor 1 — the catcher frog with a wicker basket under the slot
function frog() {
  const G = '#B2E2A2', Gd = '#86C579', Gh = '#D6F2CB', W = '#F4CF8E', Wd = '#D9A860';
  const s = new Spr(28, 24);
  s.ell(7.5, 6, 5, 5, G, Gd, Gh);
  s.ell(20.5, 6, 5, 5, G, Gd, Gh);
  s.ell(14, 14, 12.5, 8, G, Gd, Gh);
  for (const ex of [7.5, 20.5]) { s.ell(ex, 6, 3, 3, C.white); s.rect(Math.floor(ex) - 1, 5, 2, 3, C.dark).set(Math.floor(ex) - 1, 5, C.white); }
  s.pts([[10, 12], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 12]], C.dark);
  s.set(13, 14, C.pinkD).set(14, 14, C.pinkD);
  s.rect(4, 12, 3, 1, C.blush).rect(21, 12, 3, 1, C.blush);
  // basket held in front
  s.ell(14, 20, 8, 4, W, Wd);
  s.rect(6, 17, 17, 1, Wd);
  for (let x = 8; x < 21; x += 3) s.set(x, 19, Wd).set(x + 1, 21, Wd);
  s.ell(11, 16.5, 2, 1.5, C.coin, C.coinD).ell(15, 16, 2, 1.5, C.coin, C.coinD).ell(18, 16.5, 2, 1.5, C.coin, C.coinD);
  s.ell(4.5, 18, 2, 2, G, Gd).ell(23.5, 18, 2, 2, G, Gd);
  return s.outline();
}

// floor 3 — a little clay-pot creature with a sprout (mitti from the gullak itself)
function clayling() {
  const K = '#F2AA86', Kd = '#D5835F', Kh = '#F9CBAE';
  const s = new Spr(24, 28);
  s.ell(8.5, 3, 3.2, 1.8, C.leaf, C.leafD);
  s.ell(15.5, 3, 3.2, 1.8, C.leaf, C.leafD);
  s.rect(11, 3, 2, 5, C.leafD);
  s.ell(3, 19, 2.5, 3.2, Kd).ell(21, 19, 2.5, 3.2, Kd);
  s.ell(12, 18.5, 10, 9.5, K, Kd, Kh);
  s.rect(6, 7, 12, 3, K);
  s.ell(12, 7.5, 6.5, 2, Kh, K);
  s.ell(12, 7.5, 4, 1, '#B86A4C');
  s.eye(8, 14, 3).eye(14, 14, 3);
  s.pts([[11, 18], [12, 18]], C.dark);
  s.rect(5, 17, 2, 1, C.blush).rect(17, 17, 2, 1, C.blush);
  s.rect(3, 21, 18, 1, C.cream, true);
  for (let x = 4; x < 21; x += 3) s.over(x, 23, C.cream);
  return s.outline();
}

// floor 4 — the guard tortoise in a little blue cap
function tortoise() {
  const S = '#A2DCC6', Sd = '#72BBA3', Sh = '#CDEFE2', K = '#F7DDA0', Kd = '#E2BD76', Kh = '#FFF0C8';
  const s = new Spr(32, 24);
  s.ell(12, 20.5, 3, 2.5, K, Kd).ell(24, 20.5, 3, 2.5, K, Kd);
  s.pts([[30, 17], [31, 17]], Kd);
  s.ell(19, 13, 11.5, 9, S, Sd, Sh);
  for (let y = 17; y < 24; y++) for (let x = 0; x < 32; x++) if (s.get(x, y) && y > 16) s.set(x, y, null);
  s.rect(8, 16, 23, 2, '#F4E3B5').rect(8, 17, 23, 1, '#DCC790');
  s.pts([[15, 7], [16, 6], [17, 6], [18, 7], [18, 9], [17, 10], [16, 10], [15, 9]], Sd);
  s.pts([[22, 8], [23, 7], [24, 8], [24, 10], [23, 11], [22, 10]], Sd);
  s.pts([[13, 12], [12, 13], [13, 14]], Sd).pts([[20, 12], [21, 13], [20, 14]], Sd);
  s.ell(12, 20.5, 3, 2.5, K, Kd).ell(24, 20.5, 3, 2.5, K, Kd);
  s.ell(6.5, 13, 6, 5.5, K, Kd, Kh);
  s.eye(4, 12).eye(9, 12);
  s.pts([[6, 16], [7, 16]], C.dark);
  s.rect(2, 15, 2, 1, C.blush).rect(10, 15, 2, 1, C.blush);
  s.rect(1, 6, 11, 3, '#8397DD').rect(0, 8, 13, 1, '#6477C2').set(6, 7, C.gold);
  return s.outline();
}

// the cat: a tabby loaf with its tail curled round the front
function cat() {
  const O = '#F9BA80', Od = '#E39458', Oh = '#FFD9B0';
  const s = new Spr(34, 22);
  s.ell(20, 13.5, 13, 7.5, O, Od, Oh);
  for (const x of [21, 25, 29]) s.rect(x, 7, 1, 3, Od).set(x - 1, 7, Od);
  s.ell(10, 11.5, 8.5, 7.5, O, Od, Oh);
  s.grid(['#.........#', '##.......##', '#p#.....#p#', '#pp#...#pp#'], { '#': O, p: C.pink }, 5, 1);
  s.pts([[9, 6], [10, 6], [11, 6], [10, 7], [8, 7], [12, 7]], Od);
  s.ell(10, 14.5, 4.5, 2.6, C.white);
  s.ell(10, 18, 3.5, 2.5, C.white);
  s.pts([[6, 11], [7, 10], [8, 11]], C.dark).pts([[12, 11], [13, 10], [14, 11]], C.dark);
  s.set(10, 13, C.pinkD).pts([[9, 15], [11, 15]], C.dark).set(10, 14, C.dark);
  s.rect(4, 13, 2, 1, C.blush).rect(15, 13, 2, 1, C.blush);
  // tail wraps the front, white tip
  s.rect(13, 19, 18, 2, Od).rect(13, 19, 18, 1, O);
  s.rect(12, 19, 2, 2, C.white);
  s.ell(7, 20, 2.5, 1.5, C.white).ell(12.5, 20.3, 2, 1.3, C.white);
  return s.outline();
}

// ---- props -------------------------------------------------------------------

const coin = () => new Spr(7, 7).ell(3.5, 3.5, 3.5, 3.5, C.coin, C.coinD, C.coinH).set(3, 3, C.coinD).outline();

function coinPile(w = 26, h = 12) {
  const s = new Spr(w, h);
  s.ell(w / 2, h, w / 2, h - 1, C.coin, C.coinD, C.coinH);
  for (let i = 0; i < 9; i++) {
    const x = 3 + ((i * 7) % (w - 6)), y = h - 3 - ((i * 5) % (h - 4));
    s.over(x, y, C.coinD); s.over(x + 1, y, C.coinH);
  }
  return s.outline();
}

function desk() {
  const P = '#9DD6D2', Pd = '#72B7B2', Ph = '#C9ECE9';
  const s = new Spr(44, 18);
  s.rect(0, 0, 44, 4, Ph).rect(0, 3, 44, 1, P);
  s.rect(2, 4, 40, 11, P).rect(2, 13, 40, 2, Pd);
  s.rect(5, 6, 14, 6, Ph).rect(25, 6, 14, 6, Ph);
  s.rect(11, 8, 2, 2, C.gold).rect(31, 8, 2, 2, C.gold);
  s.rect(3, 15, 3, 3, Pd).rect(38, 15, 3, 3, Pd);
  return s.outline();
}

function ledger() {
  const s = new Spr(18, 8);
  s.rect(0, 6, 18, 2, '#E3717A');
  s.rect(1, 0, 8, 7, C.cream).rect(9, 0, 8, 7, C.cream).rect(8, 0, 2, 7, C.creamD);
  for (const y of [2, 4]) { s.rect(2, y, 5, 1, '#9FB3E0'); s.rect(11, y, 5, 1, '#9FB3E0'); }
  return s.outline();
}

function filterCoffee() {
  const s = new Spr(12, 12);
  s.ell(6, 10, 6, 2, C.steel, C.steelD);
  s.rect(3, 2, 6, 8, C.steel).rect(7, 2, 2, 8, C.steelD).rect(3, 2, 1, 8, C.steelH);
  s.ell(6, 2, 3, 1, '#9A6A52');
  return s.outline();
}

function mug(col = '#F7A6B8', dark = '#E07F98') {
  const s = new Spr(10, 9);
  s.rect(0, 1, 7, 8, col).rect(5, 1, 2, 8, dark).rect(0, 0, 7, 2, '#8E5D46');
  s.pts([[7, 3], [8, 3], [9, 4], [9, 5], [8, 6], [7, 6]], dark);
  s.pts([[2, 4], [4, 4], [2, 5], [3, 5], [4, 5], [3, 6]], C.white);
  return s.outline();
}

function icedCoffee() {
  const s = new Spr(10, 16);
  s.rect(7, 0, 1, 4, C.pinkD);
  s.rect(1, 3, 8, 13, '#E8F4FB').rect(2, 6, 6, 9, '#C8906D').rect(2, 6, 6, 2, C.cream);
  s.rect(3, 9, 2, 2, C.white).rect(5, 11, 2, 2, C.white);
  return s.outline();
}

// arched window looking out onto the sky
function window_(w = 26, h = 30) {
  const F = C.cream, Fd = C.creamD;
  const s = new Spr(w, h);
  s.ell(w / 2, w / 2, w / 2, w / 2, F).rect(0, w / 2, w, h - w / 2, F);
  s.ell(w / 2, w / 2, w / 2 - 3, w / 2 - 3, C.sky).rect(3, w / 2, w - 6, h - w / 2 - 3, C.sky);
  s.rect(3, h - 7, w - 6, 4, C.skyD);
  s.ell(w / 2 - 3, w / 2 + 2, 4, 2, C.white).ell(w / 2 + 2, w / 2 + 1, 3, 2.2, C.white);
  s.rect(w / 2 - 1, 3, 2, h - 6, F).rect(3, w / 2 + 3, w - 6, 2, F);
  s.rect(0, h - 3, w, 3, Fd).rect(-1, h - 3, w + 2, 1, F);
  return s.outline();
}

function lantern(col = '#FFD27A') {
  const s = new Spr(10, 22);
  s.rect(5, 0, 1, 8, '#8E7A92');
  s.rect(2, 8, 7, 2, '#E3717A');
  s.ell(5.5, 14, 4.5, 5, col, '#F2B24E', '#FFF0B8');
  s.rect(2, 19, 7, 2, '#E3717A');
  s.rect(5, 21, 1, 1, '#E3717A');
  return s.outline();
}

function shelf(items) {
  const s = new Spr(48, 24);
  const W = '#F3D6B4', Wd = '#DDB68E';
  items.forEach(([kind, x, col, dark]) => {
    if (kind === 'book') s.rect(x, 1, 3, 10, col).rect(x + 2, 1, 1, 10, dark).rect(x, 3, 3, 1, C.cream);
    if (kind === 'jar') s.ell(x + 3, 7, 3.5, 4, col, dark).rect(x + 1, 1, 5, 2, C.cream);
    if (kind === 'pot') s.ell(x + 3.5, 7, 4, 4, col, dark).rect(x + 1, 2, 5, 2, col);
    if (kind === 'plant') s.rect(x, 7, 6, 4, '#F2AA86').ell(x + 1, 4, 2.5, 3, C.leaf, C.leafD).ell(x + 5, 3, 2.5, 3.5, C.leaf, C.leafD);
    if (kind === 'coin') s.ell(x + 3, 8, 3, 3, C.coin, C.coinD, C.coinH);
  });
  s.rect(0, 11, 48, 3, W).rect(0, 13, 48, 1, Wd);
  s.rect(3, 14, 2, 4, Wd).rect(43, 14, 2, 4, Wd);
  return s.outline();
}

function plant(potCol = '#F2AA86', potDark = '#D5835F') {
  const s = new Spr(18, 26);
  s.ell(5, 10, 4, 6, C.leaf, C.leafD, C.leafH);
  s.ell(13, 9, 4, 6.5, C.leaf, C.leafD, C.leafH);
  s.ell(9, 6, 4, 6, C.leafH, C.leaf);
  s.rect(8, 8, 1, 8, C.leafD);
  s.rect(3, 15, 12, 3, potDark).rect(4, 17, 10, 9, potCol).rect(11, 17, 3, 9, potDark);
  s.rect(4, 20, 10, 1, C.cream);
  return s.outline();
}

function clock() {
  const s = new Spr(14, 14);
  s.ell(7, 7, 7, 7, '#F7A6B8', '#E07F98');
  s.ell(7, 7, 5, 5, C.cream);
  s.rect(7, 3, 1, 4, C.dark).rect(7, 7, 3, 1, C.dark);
  return s.outline();
}

function frame(inner) {
  const s = new Spr(20, 16);
  s.rect(0, 0, 20, 16, '#F4C6D6').rect(2, 2, 16, 12, C.sky);
  s.rect(2, 10, 16, 4, '#B2E2A2');
  inner && inner(s);
  return s.outline();
}

function corkboard() {
  const s = new Spr(36, 24);
  s.rect(0, 0, 36, 24, '#F3D6B4').rect(2, 2, 32, 20, '#E9BE92');
  const chits = [[4, 4, '#FFF7EA'], [13, 6, '#FDE3A7'], [23, 4, '#CFE8FB'], [6, 13, '#F9CFDD'], [17, 14, '#D8F0CC'], [26, 13, '#FFF7EA']];
  for (const [x, y, c] of chits) { s.rect(x, y, 8, 7, c); s.rect(x + 1, y + 3, 5, 1, '#C9B9C9'); s.set(x + 4, y, '#E3717A'); }
  return s.outline();
}

function sortTable(colors) {
  const s = new Spr(40, 16);
  s.rect(0, 0, 40, 4, '#F9CFDD').rect(0, 3, 40, 1, '#EAA9BF');
  colors.forEach(([c, d], i) => s.rect(2 + i * 9, -1 + 0, 8, 3, c).rect(2 + i * 9, 2, 8, 1, d));
  s.rect(2, 4, 3, 12, '#EAA9BF').rect(35, 4, 3, 12, '#EAA9BF');
  return s.outline();
}

function sack() {
  const K = '#F0DDB0', Kd = '#D5BD86';
  const s = new Spr(18, 18);
  s.ell(9, 12, 8.5, 6.5, K, Kd);
  s.rect(6, 3, 6, 5, K).rect(5, 5, 8, 1, '#E3717A');
  s.ell(9, 2.5, 3, 1.5, C.coin, C.coinD);
  s.pts([[6, 13], [7, 14], [12, 12], [13, 13]], Kd);
  return s.outline();
}

function crate(col = '#F9CFDD', dark = '#E3A6BD') {
  const s = new Spr(16, 13);
  s.rect(0, 0, 16, 13, col).rect(0, 0, 16, 2, dark).rect(0, 6, 16, 1, dark).rect(0, 11, 16, 2, dark);
  s.ell(5, -1, 2.5, 2, C.coin, C.coinD).ell(10, -0.5, 2.5, 2, C.coin, C.coinD);
  return s.outline();
}

function cushion(col, dark) {
  const s = new Spr(20, 8);
  s.ell(10, 4, 10, 4, col, dark, C.white);
  s.set(10, 4, dark);
  return s.outline();
}

function wheel() {
  const s = new Spr(24, 14);
  s.rect(9, 5, 6, 9, '#DDB68E').rect(4, 12, 16, 2, '#C79F77');
  s.ell(12, 4, 12, 3, '#E8E1F5', '#BDB3D6');
  s.ell(12, 2, 4, 2.5, '#F2AA86', '#D5835F');
  return s.outline();
}

function clayLumps() {
  const s = new Spr(16, 8);
  s.ell(4, 5, 4, 3, '#F2AA86', '#D5835F', '#F9CBAE').ell(11, 5, 5, 3.2, '#F2AA86', '#D5835F', '#F9CBAE').ell(8, 2.5, 3, 2.3, '#F2AA86', '#D5835F', '#F9CBAE');
  return s.outline();
}

// category pot, glazed in the category's colour, with a cream emblem and coins on top
const EMBLEMS = {
  rent: ['   #   ', '  ###  ', ' ##### ', '#######', ' ## ## ', ' ## ## ', ' ##### '],
  food: [' # # # ', '       ', '#######', '#######', ' ##### ', '  ###  ', '       '],
  shopping: ['  # #  ', ' #   # ', '#######', '#######', '#######', '#######', '#######'],
  groceries: ['  ##   ', '   ##  ', '  ###  ', ' ##### ', ' ##### ', '  ###  ', '   #   '],
  transport: ['  ###  ', ' ##### ', '#######', '# # # #', '#######', ' #   # ', '       '],
  hobbies: ['   #   ', '  ###  ', '#######', ' ##### ', '  ###  ', ' ## ## ', ' #   # '],
};
function catPot(emblem, [col, dark, hi], fill) {
  const s = new Spr(26, 28);
  for (let k = 0; k < fill; k++) s.ell(8 + k * 5, 6 - (k % 2) * 2, 3.4, 3.4, C.coin, C.coinD, C.coinH);
  s.ell(13, 18, 12, 9.5, col, dark, hi);
  s.rect(7, 7, 12, 3, col);
  s.ell(13, 7.5, 7, 2.2, hi, col);
  s.ell(13, 7.5, 4.5, 1, dark);
  s.grid(EMBLEMS[emblem], { '#': C.cream }, 10, 14);
  s.rect(2, 23, 22, 1, hi, true);
  return s.outline();
}

function chest() {
  const P = '#F7B2B6', Pd = '#E08990', Ph = '#FDD3D5';
  const s = new Spr(34, 26);
  for (let k = 0; k < 4; k++) s.ell(9 + k * 5.5, 5 - (k % 2), 3.4, 3.4, C.coin, C.coinD, C.coinH);
  s.ell(17, 10, 17, 5, P, Pd, Ph).rect(0, 10, 34, 16, P).rect(26, 10, 8, 16, Pd);
  s.rect(0, 12, 34, 2, C.gold).rect(4, 5, 3, 21, C.gold).rect(27, 5, 3, 21, C.gold);
  s.rect(14, 12, 6, 7, C.gold).rect(16, 15, 2, 2, C.dark);
  return s.outline();
}

// the tulsi centre piece: a big painted chaura and a full, flowering tulsi
function tulsi() {
  return tulsiBig();
}
function tulsiOld() {
  const s = new Spr(64, 84);
  const L = ['#5FA85E', '#7CC474', '#A6DE93'];
  // bush: many leaves in a dome, darker at the bottom right
  s.ell(32, 30, 27, 21, L[1], L[0], L[2]);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 150; i++) {
    const a = r() * Math.PI, d = Math.sqrt(r());
    const x = 32 + Math.cos(a + Math.PI) * d * 26, y = 36 - Math.sin(a) * d * 26 + 4;
    const shade = x > 36 && y > 28 ? 0 : r() > 0.6 ? 2 : 1;
    s.ell(x, y, 2.6, 1.7, L[shade], L[Math.max(0, shade - 1)]);
  }
  s.rect(31, 30, 2, 14, '#6E8F4E');
  // flower spikes
  for (const [x, y] of [[20, 16], [27, 11], [36, 10], [44, 15], [15, 24], [49, 23], [32, 8]])
    s.rect(x, y, 1, 5, '#A988DA').set(x, y - 1, '#D3C0F2').set(x - 1, y + 2, '#8F6CC9');
  // chaura: two painted tiers
  const W = '#FFF3E4', Wd = '#EBD3BA', T = '#EE9C7B';
  s.rect(12, 42, 40, 16, W).rect(44, 42, 8, 16, Wd).rect(10, 40, 44, 3, T).rect(12, 56, 40, 2, T);
  s.rect(6, 58, 52, 24, W).rect(48, 58, 10, 24, Wd).rect(4, 57, 56, 3, T).rect(6, 80, 52, 2, T);
  // painted motifs
  for (let x = 16; x < 48; x += 8) s.rect(x, 48, 3, 3, '#F7A6B8').set(x + 1, 49, C.white);
  for (let x = 12; x < 54; x += 10) { s.ell(x + 2, 69, 3, 3, '#9DD6D2', '#72B7B2'); s.set(x + 2, 69, C.gold); }
  s.rect(28, 64, 8, 12, '#F9CFDD').ell(32, 64, 4, 3, '#F9CFDD');
  s.ell(32, 72, 2, 2, C.gold);
  return s.outline();
}

// bigger centre-piece version: ~96 x 124 art px
function tulsiBig() {
  const s = new Spr(96, 124);
  const L = ['#5FA85E', '#7CC474', '#A6DE93'];
  const cx = 48;
  s.ell(cx, 44, 40, 32, L[1], L[0], L[2]);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 320; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = cx + Math.cos(a) * d * 38, y = 44 + Math.sin(a) * d * 30;
    const shade = x > cx + 6 && y > 44 ? 0 : r() > 0.55 ? 2 : 1;
    s.ell(x, y, 3.2, 2, L[shade], L[Math.max(0, shade - 1)]);
  }
  for (let i = 0; i < 14; i++) {
    const x = 16 + i * 5 + Math.round(r() * 3), top = 20 - Math.round(Math.sin((i / 13) * Math.PI) * 12) + Math.round(r() * 4);
    s.rect(x, top, 1, 7, '#A988DA').set(x, top - 1, '#D8C6F5').set(x - 1, top + 2, '#8F6CC9').set(x + 1, top + 4, '#8F6CC9');
  }
  s.rect(cx - 1, 54, 3, 18, '#6E8F4E');
  const W = '#FFF3E4', Wd = '#EBD3BA', T = '#EE9C7B';
  s.rect(20, 66, 56, 20, W).rect(66, 66, 10, 20, Wd).rect(17, 63, 62, 4, T).rect(20, 84, 56, 2, T);
  s.rect(10, 86, 76, 36, W).rect(72, 86, 14, 36, Wd).rect(7, 85, 82, 4, T).rect(10, 120, 76, 3, T);
  for (let x = 26; x < 70; x += 10) s.rect(x, 73, 4, 4, '#F7A6B8').set(x + 1, 74, C.white).set(x + 2, 75, C.white);
  for (let x = 16; x < 82; x += 13) { s.ell(x + 2, 104, 4, 4, '#9DD6D2', '#72B7B2'); s.set(x + 2, 104, C.gold).set(x + 1, 104, C.gold); }
  s.rect(40, 94, 16, 24, '#F9CFDD').ell(48, 94, 8, 5, '#F9CFDD');
  s.ell(48, 105, 3, 3, C.gold, '#C99A2E');
  return s.outline();
}

function coffeeCart() {
  const P = '#F7B2B6', Pd = '#E08990';
  const s = new Spr(36, 32);
  s.rect(6, 0, 2, 6, C.steelD).rect(3, 4, 10, 10, C.steel).rect(10, 4, 3, 10, C.steelD).rect(3, 4, 1, 10, C.steelH);
  s.rect(4, 2, 8, 2, '#8E5D46');
  s.rect(17, 8, 6, 6, '#9DD6D2').rect(17, 8, 6, 1, '#8E5D46').rect(26, 8, 6, 6, '#FAD66E').rect(26, 8, 6, 1, '#8E5D46');
  s.rect(0, 14, 36, 4, Ph()).rect(1, 18, 34, 9, P).rect(1, 25, 34, 2, Pd);
  s.rect(5, 20, 26, 3, C.cream);
  s.ell(7, 29, 3, 3, C.steelD, '#8B93A5').ell(29, 29, 3, 3, C.steelD, '#8B93A5');
  return s.outline();
  function Ph() { return '#FDD3D5'; }
}

function floorLamp() {
  const s = new Spr(16, 44);
  s.ell(8, 6, 8, 6, '#FAD66E', '#E2B347', '#FFF1B8').rect(0, 6, 16, 6, '#FAD66E').rect(11, 6, 5, 6, '#E2B347');
  s.rect(7, 12, 2, 30, '#8E7A92').rect(3, 41, 10, 3, '#8E7A92');
  return s.outline();
}

function ledgerStack() {
  const s = new Spr(18, 16);
  const cols = [['#E3717A', '#C45862'], ['#9DBEF0', '#6E93D1'], ['#E3717A', '#C45862'], ['#A6D98F', '#77B865']];
  cols.forEach(([c, d], i) => s.rect(i % 2, 12 - i * 4, 17, 4, c).rect(i % 2, 15 - i * 4, 17, 1, d).rect(i % 2 + 13, 13 - i * 4, 3, 2, C.cream));
  return s.outline();
}

function diya() {
  const s = new Spr(10, 10);
  s.ell(5, 4, 1.4, 2.8, '#FFD27A', '#F7A35C');
  s.ell(5, 8, 5, 2.4, '#F2AA86', '#D5835F');
  s.rect(1, 6, 8, 1, '#F9CBAE');
  return s.outline();
}

module.exports = {
  Spr, C, OUT,
  owl, mouse, frog, clayling, tortoise, cat,
  coin, coinPile, desk, ledger, filterCoffee, mug, icedCoffee, window_, lantern, shelf, plant, clock, frame,
  corkboard, sortTable, coffeeCart, floorLamp, ledgerStack, sack, crate, cushion, wheel, clayLumps, catPot, chest, tulsi, diya,
};
