// v3: back to the gullak. Warm clay + limewash, Indian folk accents, human chibi workers.
const { Spr } = require('./v2sprites');

const OUT = '#3F2622';
const K = {
  eye: '#2E1C1A', white: '#FFFFFF', blush: '#F08C7E', lip: '#9E4A3A',
  clay: '#D9825B', clayD: '#B9653F', clayH: '#EDA27A', clayDD: '#9E4F31',
  wood: '#A8683F', woodD: '#7E4A2B', woodH: '#C98A5A',
  brass: '#E5B94A', brassD: '#BE8F2A', brassH: '#F7DE8C',
  steel: '#D9DDE3', steelD: '#A9AFBA', steelH: '#F5F6F8',
  coin: '#F2C94C', coinD: '#C99A2E', coinH: '#FBE59A',
  cream: '#FBF3E4', creamD: '#E3D5BE',
  indigo: '#4F5FA8', indigoD: '#3A4784', mustard: '#E0A526', mustardD: '#B9841A',
  rani: '#D6457E', raniD: '#AE3363', leaf: '#5E9E4A', leafD: '#437A35', leafH: '#86C06A',
  teal: '#2F8C8A', tealD: '#236C6A', vermilion: '#D9542F', vermilionD: '#B03F20',
  khaki: '#B5A16A', khakiD: '#8F7E4B', hair: '#2E1F1C', grey: '#CFC8BE', greyD: '#A39B90',
};

// ring (for spectacles)
function ring(s, cx, cy, r, c) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r - 0.7 && d < r + 0.45) s.set(x, y, c);
    }
}

// chibi human: big head, short body. o = colours + hooks
function human(o) {
  const w = o.w || 24, s = new Spr(w, 34), cx = o.cx || 12;
  const sk = o.skin, skD = o.skinD, skH = o.skinH;
  if (!o.sitting) {
    s.rect(cx - 4, 28, 3, 4, o.bottom).rect(cx + 1, 28, 3, 4, o.bottomD || o.bottom);
    s.rect(cx - 5, 32, 4, 2, o.feet || K.woodD).rect(cx + 1, 32, 4, 2, o.feet || K.woodD);
  }
  o.behind && o.behind(s);
  s.ell(cx - 7.5, 23, 2.2, 4.2, o.sleeve || o.top, o.sleeveD || o.topD);
  s.ell(cx + 7.5, 23, 2.2, 4.2, o.sleeve || o.top, o.sleeveD || o.topD);
  s.ell(cx - 7.5, 27.3, 1.7, 1.7, sk, skD).ell(cx + 7.5, 27.3, 1.7, 1.7, sk, skD);
  s.ell(cx, 25, 7, 6.2, o.top, o.topD, o.topH);
  s.rect(cx - 6, 25, 13, 4, o.top).rect(cx + 3, 25, 4, 4, o.topD);
  o.torso && o.torso(s);
  s.ell(cx - 9.5, 12, 1.6, 2.1, sk, skD).ell(cx + 9.5, 12, 1.6, 2.1, sk, skD);
  s.ell(cx, 11, 9.5, 9.2, sk, skD, skH);
  o.hair && o.hair(s);
  s.rect(cx - 4, 11, 2, 3, K.eye).set(cx - 4, 11, K.white);
  s.rect(cx + 3, 11, 2, 3, K.eye).set(cx + 3, 11, K.white);
  s.rect(cx - 7, 15, 2, 1, K.blush).rect(cx + 6, 15, 2, 1, K.blush);
  if (!o.noMouth) s.rect(cx - 1, 16, 2, 1, K.lip);
  o.face && o.face(s);
  o.extra && o.extra(s);
  return s.outline(OUT);
}

// floor 2 — the munim: round spectacles, grey hair, white kurta + mustard bandi, pencil behind ear
const munim = () => human({
  skin: '#E2A77E', skinD: '#C98A62', skinH: '#F0C29E', sitting: true,
  top: K.cream, topD: K.creamD, topH: K.white, sleeve: K.cream, sleeveD: K.creamD,
  torso: (s) => s.rect(6, 20, 3, 9, K.mustard, true).rect(15, 20, 3, 9, K.mustardD, true).set(8, 23, K.brass).set(8, 26, K.brass),
  hair: (s) => {
    s.ell(4, 9, 2.4, 4.5, K.grey, K.greyD).ell(20, 9, 2.4, 4.5, K.grey, K.greyD);
    s.set(12, 5, '#C8402A').set(12, 6, '#C8402A');
    s.line(21, 3, 23, 9, K.mustard);
  },
  noMouth: true,
  face: (s) => {
    ring(s, 9, 12.5, 3.1, '#B8862E'); ring(s, 16, 12.5, 3.1, '#B8862E');
    s.set(12, 12, '#B8862E').set(13, 12, '#B8862E');
    s.rect(9, 16, 7, 1, K.grey).set(8, 17, K.grey).set(16, 17, K.grey);
  },
});

// floor 1 — the sorter: braids with red ribbons, bindi, rani-pink kurta, holding a coin
const sorter = () => human({
  skin: '#EDBB93', skinD: '#D39C74', skinH: '#F7D3B3',
  top: K.rani, topD: K.raniD, topH: '#E86C9A', bottom: K.mustard, bottomD: K.mustardD,
  behind: (s) => { s.rect(1, 10, 3, 12, K.hair).rect(20, 10, 3, 12, K.hair); s.rect(1, 21, 3, 2, K.vermilion).rect(20, 21, 3, 2, K.vermilion); },
  hair: (s) => { s.ell(12, 6.5, 10, 5.5, K.hair); s.rect(3, 6, 2, 7, K.hair).rect(19, 6, 2, 7, K.hair); s.set(12, 2, '#5A3A32').set(11, 3, '#5A3A32'); s.set(12, 8, '#D0342C'); },
  extra: (s) => { s.ell(20, 26.5, 2.6, 2.6, K.coin, K.coinD, K.coinH); },
});

// floor 1 — the catcher: a boy in an indigo half-shirt, holding up a wicker tokri
const catcher = () => human({
  skin: '#D4976C', skinD: '#B67A52', skinH: '#E7B48E',
  top: K.indigo, topD: K.indigoD, topH: '#6E7EC4', bottom: K.khaki, bottomD: K.khakiD,
  hair: (s) => { s.ell(12, 6, 10, 5.2, K.hair); for (const x of [6, 9, 13, 16]) s.set(x, 1, K.hair).set(x + 1, 2, K.hair); s.rect(3, 6, 2, 5, K.hair).rect(19, 6, 2, 5, K.hair); },
  extra: (s) => {
    s.ell(12, 25.5, 8, 3.5, '#E4B870', '#C49248');
    s.rect(4, 23, 17, 1, '#C49248');
    for (let x = 6; x < 19; x += 3) s.set(x, 25, '#C49248').set(x + 1, 27, '#C49248');
    s.ell(9, 22.3, 1.8, 1.3, K.coin, K.coinD).ell(13, 21.8, 1.8, 1.3, K.coin, K.coinD).ell(16, 22.3, 1.8, 1.3, K.coin, K.coinD);
  },
});

// floor 3 — the kumhar: red-check gamcha on his head, white baniyan, clay on his hands
const kumhar = () => human({
  skin: '#B87750', skinD: '#985E3B', skinH: '#CE916A', sitting: true,
  top: K.cream, topD: K.creamD, topH: K.white, sleeve: '#B87750', sleeveD: '#985E3B',
  hair: (s) => {
    s.ell(12, 5, 10.5, 4.5, '#D9463A', '#B23428');
    for (let x = 3; x < 22; x += 3) s.over(x, 4, K.cream).over(x + 1, 6, K.cream);
    s.rect(19, 5, 4, 3, '#D9463A').rect(21, 8, 2, 3, '#B23428');
  },
  face: (s) => s.rect(8, 16, 9, 1, K.hair).set(7, 17, K.hair).set(17, 17, K.hair),
  noMouth: true,
  extra: (s) => { s.rect(3, 26, 3, 3, K.clayH).rect(18, 26, 3, 3, K.clayH); },
});

// floor 4 — the chowkidar: khaki uniform, peaked cap, big moustache, a bamboo lathi
const chowkidar = () => human({
  w: 28, cx: 12,
  skin: '#C98A60', skinD: '#AA6D45', skinH: '#DDA47C',
  top: K.khaki, topD: K.khakiD, topH: '#CBB985', bottom: K.khakiD, bottomD: '#766738', feet: '#3F2622',
  behind: (s) => s.line(24, 4, 24, 33, '#C9A55A').line(25, 4, 25, 33, '#A88838'),
  torso: (s) => s.rect(5, 27, 14, 2, K.woodD).set(12, 27, K.brass).set(9, 22, '#D0342C').set(9, 23, K.brass),
  hair: (s) => { s.ell(12, 4.5, 10, 4, '#7F6C3A', '#655529'); s.rect(3, 6, 18, 2, '#5B4C24'); s.rect(10, 3, 4, 2, K.brass); },
  noMouth: true,
  face: (s) => s.rect(7, 15, 11, 2, K.hair).set(6, 16, K.hair).set(18, 16, K.hair).set(5, 17, K.hair).set(19, 17, K.hair),
});

// the cat: tabby loaf, tail curled around the front
function cat() {
  const O = '#EFA260', Od = '#CF7F3E', Oh = '#F8C48E';
  const s = new Spr(34, 22);
  s.ell(20, 13.5, 13, 7.5, O, Od, Oh);
  for (const x of [21, 25, 29]) s.rect(x, 7, 1, 3, Od).set(x - 1, 7, Od);
  s.ell(10, 11.5, 8.5, 7.5, O, Od, Oh);
  s.grid(['#.........#', '##.......##', '#p#.....#p#', '#pp#...#pp#'], { '#': O, p: '#F4A9A0' }, 5, 1);
  s.pts([[9, 6], [10, 6], [11, 6], [10, 7], [8, 7], [12, 7]], Od);
  s.ell(10, 14.5, 4.5, 2.6, K.cream).ell(10, 18, 3.5, 2.5, K.cream);
  s.pts([[6, 11], [7, 10], [8, 11]], K.eye).pts([[12, 11], [13, 10], [14, 11]], K.eye);
  s.set(10, 13, '#D9776E').pts([[9, 15], [11, 15]], K.eye).set(10, 14, K.eye);
  s.rect(4, 13, 2, 1, K.blush).rect(15, 13, 2, 1, K.blush);
  s.rect(13, 19, 18, 2, Od).rect(13, 19, 18, 1, O).rect(12, 19, 2, 2, K.cream);
  s.ell(7, 20, 2.5, 1.5, K.cream).ell(12.5, 20.3, 2, 1.3, K.cream);
  return s.outline(OUT);
}

// ---- props -------------------------------------------------------------------

const coin = () => new Spr(7, 7).ell(3.5, 3.5, 3.5, 3.5, K.coin, K.coinD, K.coinH).set(3, 3, K.coinD).outline(OUT);

function coinHeap(w, h) {
  const s = new Spr(w, h);
  s.ell(w / 2, h, w / 2, h - 1, K.coin, K.coinD, K.coinH);
  for (let i = 0; i < w / 2; i++) { const x = 2 + ((i * 7) % (w - 4)), y = h - 2 - ((i * 5) % (h - 3)); s.over(x, y, K.coinD).over(x + 1, y, K.coinH); }
  return s.outline(OUT);
}

// low wooden peedha for the catcher to stand on
function peedha() {
  const s = new Spr(26, 7);
  s.rect(0, 0, 26, 3, K.woodH).rect(0, 2, 26, 1, K.wood).rect(2, 3, 3, 4, K.woodD).rect(21, 3, 3, 4, K.woodD);
  for (let x = 4; x < 24; x += 6) s.set(x, 1, K.wood);
  return s.outline(OUT);
}

// sorting chowki with brass katoris
function chowki(n = 4) {
  const s = new Spr(46, 16);
  for (let i = 0; i < n; i++) {
    const x = 7 + i * 11;
    s.ell(x, 3.5, 4.5, 2.2, K.brass, K.brassD, K.brassH);
    s.ell(x, 2.2, 3.5, 1, K.brassD);
    s.set(x - 1, 2, K.coin).set(x + 1, 2, K.coinH);
  }
  s.rect(0, 5, 46, 4, K.woodH).rect(0, 8, 46, 1, K.wood).rect(1, 9, 44, 2, K.wood);
  s.rect(2, 11, 4, 5, K.woodD).rect(40, 11, 4, 5, K.woodD);
  s.rect(8, 10, 30, 1, K.brassD);
  return s.outline(OUT);
}

// the gaddi: white floor mattress, gol takiya bolster along the back
function gaddi() {
  const s = new Spr(84, 26);
  const M = '#A8382A', Md = '#7E261B', Mh = '#C9553F';
  s.rect(5, 0, 74, 10, M).rect(5, 0, 74, 2, Mh).rect(5, 7, 74, 3, Md);
  for (let x = 12; x < 76; x += 10) s.rect(x, 3, 1, 4, Md);
  s.ell(5, 5, 4, 5, K.brass, K.brassD, K.brassH).ell(79, 5, 4, 5, K.brass, K.brassD, K.brassH);
  s.rect(0, 9, 84, 12, K.cream).rect(0, 9, 84, 1, K.white);
  for (let x = 4; x < 82; x += 7) s.rect(x, 12, 1, 8, '#D6DDEE');
  s.rect(0, 21, 84, 5, K.creamD).rect(0, 21, 84, 1, '#CBBBA0');
  return s.outline(OUT);
}

// wall rack of past bahi-khatas — one per month (history)
function ledgerRack() {
  const s = new Spr(74, 44);
  const cols = [['#B8322A', '#8E2219'], ['#A8382A', '#7E261B'], [K.mustard, K.mustardD], ['#B8322A', '#8E2219'], [K.indigo, K.indigoD]];
  for (let row = 0; row < 2; row++) {
    const y = row * 21;
    for (let i = 0; i < 11; i++) {
      const [c, d] = cols[(i + row * 3) % cols.length], h = 15 - ((i * 7 + row) % 3);
      const x = 3 + i * 6;
      s.rect(x, y + 18 - h, 5, h, c).rect(x + 4, y + 18 - h, 1, h, d).rect(x, y + 18 - h + 3, 5, 1, K.cream);
    }
    s.rect(0, y + 18, 74, 3, K.woodH).rect(0, y + 20, 74, 1, K.woodD);
  }
  s.rect(0, 0, 2, 42, K.wood).rect(72, 0, 2, 42, K.wood);
  return s.outline(OUT);
}

// plain unpainted pot for the wall niches (a new category's pot, waiting)
function plainPot() {
  const s = new Spr(14, 14);
  s.ell(7, 9, 6.5, 5, K.clay, K.clayD, K.clayH).rect(4, 2, 6, 3, K.clay).ell(7, 2.5, 3.5, 1, K.clayDD);
  return s.outline(OUT);
}

// the munim's low slanted desk (peti) with brass corners
function peti() {
  const s = new Spr(40, 18);
  s.rect(0, 4, 40, 14, K.wood).rect(0, 15, 40, 3, K.woodD).rect(0, 0, 40, 5, K.woodH);
  s.rect(0, 4, 40, 1, K.woodD);
  s.rect(0, 0, 3, 3, K.brass).rect(37, 0, 3, 3, K.brass).rect(0, 15, 3, 3, K.brass).rect(37, 15, 3, 3, K.brass);
  s.rect(17, 8, 6, 5, K.brass).rect(19, 10, 2, 2, K.eye);
  return s.outline(OUT);
}

// red cloth-bound bahi-khata, open, with its white string
function bahi() {
  const s = new Spr(22, 9);
  s.rect(0, 7, 22, 2, '#B8322A');
  s.rect(1, 0, 10, 8, K.cream).rect(11, 0, 10, 8, K.cream).rect(10, 0, 2, 8, K.creamD);
  for (const y of [2, 4, 6]) { s.rect(2, y, 7, 1, '#8C6F9A'); s.rect(13, y, 6, 1, '#8C6F9A'); }
  s.rect(3, 2, 3, 1, '#C8402A');
  s.line(21, 7, 23, 9, K.white);
  return s.outline(OUT);
}

// steel filter-coffee davara + tumbler
function filterCoffee() {
  const s = new Spr(14, 13);
  s.ell(7, 10.5, 7, 2.5, K.steel, K.steelD, K.steelH);
  s.rect(0, 8, 14, 3, K.steel).rect(11, 8, 3, 3, K.steelD);
  s.rect(4, 1, 6, 9, K.steel).rect(8, 1, 2, 9, K.steelD).rect(4, 1, 1, 9, K.steelH);
  s.ell(7, 1.5, 3, 1, '#7A4A34');
  return s.outline(OUT);
}

// potter's chaak with a pot being shaped
function chaak() {
  const s = new Spr(34, 16);
  s.ell(17, 11, 17, 4.5, '#9C8E80', '#766A5E', '#B8AB9C');
  s.ell(17, 10, 12, 2.5, '#8A7D70');
  s.ell(17, 6, 5.5, 5, K.clayH, K.clay);
  s.rect(14, 1, 7, 2, K.clayH).ell(17, 1.5, 3, 1, K.clayD);
  return s.outline(OUT);
}

function clayLump() {
  const s = new Spr(16, 8);
  s.ell(5, 5, 5, 3, K.clay, K.clayD, K.clayH).ell(11, 5, 5, 3.2, K.clay, K.clayD, K.clayH).ell(8, 2.5, 3, 2.3, K.clay, K.clayD, K.clayH);
  return s.outline(OUT);
}

// terracotta matka with a painted band in the category colour + cream motif
const EMBLEMS = {
  rent: ['   #   ', '  ###  ', ' ##### ', '#######', ' ## ## ', ' ## ## ', ' ##### '],
  food: [' # # # ', '       ', '#######', '#######', ' ##### ', '  ###  ', '       '],
  shopping: ['  # #  ', ' #   # ', '#######', '#######', '#######', '#######', '#######'],
  groceries: ['  ##   ', '   ##  ', '  ###  ', ' ##### ', ' ##### ', '  ###  ', '   #   '],
  transport: ['  ###  ', ' ##### ', '#######', '# # # #', '#######', ' #   # ', '       '],
  hobbies: ['   #   ', '  ###  ', '#######', ' ##### ', '  ###  ', ' ## ## ', ' #   # '],
  subscriptions: ['  #    ', '  ##   ', '  ###  ', '  #### ', '  ###  ', '  ##   ', '  #    '],
  bills: ['    ## ', '   ##  ', '  ##   ', ' ##### ', '   ##  ', '  ##   ', ' ##    '],
  entertainment: ['#######', '#######', ' ##### ', '#######', ' ##### ', '#######', '#######'],
  health: ['  ###  ', '  ###  ', '#######', '#######', '#######', '  ###  ', '  ###  '],
  personal: [' ##### ', '#######', '#######', ' ##### ', '  ###  ', '   #   ', '   #   '],
  misc: ['       ', '       ', '## # ##', '## # ##', '       ', '       ', '       '],
};
function matka(emblem, band, bandD, fill) {
  const s = new Spr(28, 30);
  for (let k = 0; k < fill; k++) s.ell(8.5 + k * 5.5, 6 - (k % 2) * 2, 3.4, 3.4, K.coin, K.coinD, K.coinH);
  s.ell(14, 19, 13, 10.5, K.clay, K.clayD, K.clayH);
  s.rect(8, 7, 12, 3, K.clay);
  s.ell(14, 7.5, 7.5, 2.2, K.clayH, K.clay).ell(14, 7.5, 5, 1, K.clayDD);
  s.rect(1, 13, 26, 11, band, true);
  s.rect(1, 21, 26, 3, bandD, true);
  for (let x = 2; x < 27; x += 3) { s.over(x, 12, K.cream); s.over(x + 1, 25, K.cream); }
  s.grid(EMBLEMS[emblem], { '#': K.cream }, 11, 14);
  return s.outline(OUT);
}

// green steel tijori (the savings safe)
function tijori() {
  const G = '#5F8F6E', Gd = '#46705A', Gh = '#7FAE8C';
  const s = new Spr(30, 34);
  s.rect(0, 0, 30, 32, G).rect(24, 0, 6, 32, Gd).rect(0, 0, 30, 2, Gh);
  s.rect(3, 4, 21, 24, Gh).rect(4, 5, 19, 22, G);
  s.ell(13.5, 13, 4, 4, K.steel, K.steelD, K.steelH).set(13, 12, K.eye).set(14, 13, K.eye);
  s.rect(19, 18, 2, 7, K.brass).rect(6, 20, 5, 2, K.brass);
  s.rect(2, 32, 4, 2, K.eye).rect(24, 32, 4, 2, K.eye);
  return s.outline(OUT);
}

// copy one sprite into another (non-empty pixels only)
function blit(dst, src, x, y) {
  for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.d[j * src.w + i]; if (c) dst.set(x + i, y + j, c); }
}

// Tulsi, from reference photos (Ocimum tenuiflorum): many thin upright stems fanning out like a vase,
// oval pointed leaves in opposite pairs (successive pairs turned 90°), a leaf rosette at each tip,
// and long thin manjari spikes with purple whorls spaced along them, rising above the leaves.
function tulsiPlant() {
  const w = 70, h = 66, s = new Spr(w, h), bx = 35, by = h - 1;
  const LH = '#A2D06A', L = '#6FAA45', LM = '#5B963A', LD = '#45802F', ST = '#7C8A45';
  const paint = (rows, x, y) => rows.forEach((r, j) => [...r].forEach((ch, i) => {
    const c = { h: LH, l: L, m: LM, d: LD }[ch]; if (c) s.set(x + i, y + j, c);
  }));
  // big leaves (lower), tip pointing outward, base at the stem
  const bigL = ['.hh....', 'hhll...', 'hllmm..', '.lmmmd.', '..ddddd'];
  const bigR = [...bigL].map((r) => [...r].reverse().join(''));
  const smL = ['hh...', 'hlm..', '.lmd.', '..ddd'];
  const smR = [...smL].map((r) => [...r].reverse().join(''));
  const front = ['.hl.', 'hllm', 'lmmd', '.dd.'];

  // [tip dx, tip y, has manjari]
  const stems = [[-25, 34, 1], [-16, 24, 1], [-7, 18, 1], [2, 15, 1], [11, 19, 1], [20, 27, 1], [27, 37, 0], [-29, 45, 0], [-1, 33, 0]];
  const tips = [];
  for (const [dx, top, spike] of stems) {
    const x0 = bx + Math.sign(dx);
    const at = (y) => { const t = (by - y) / (by - top); return Math.round(x0 + dx * (1 - Math.pow(1 - t, 1.7))); };
    for (let y = by; y >= top; y--) s.set(at(y), y, ST);
    let k = 0;
    for (let y = by - 10; y > top + 5; y -= 7, k++) {
      const x = at(y), big = y > top + 14;
      if (k % 2 === 0) { if (big) { paint(bigL, x - 7, y - 4); paint(bigR, x + 1, y - 4); } else { paint(smL, x - 5, y - 3); paint(smR, x + 1, y - 3); } }
      else paint(front, x - 1, y - 2);
    }
    const tx = at(top);
    paint(smL, tx - 5, top - 1); paint(smR, tx + 1, top - 1); paint(front, tx - 1, top + 3);
    tips.push([tx, top, spike]);
  }
  const o = s.outline('#3A6A2C');
  // manjari: drawn after the outline so they stay fine and airy
  let seed = 4;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [tx, top, spike] of tips) {
    if (!spike) continue;
    const x = tx + 1, len = 13 + Math.round(r() * 6);
    for (let k = 0; k <= len; k++) {
      const y = top - k;
      o.set(x, y, '#6E5A55');
      if (k > 1 && k % 3 === 0) {
        const wdt = k > len - 3 ? 0 : 1;
        for (let i = -wdt; i <= wdt; i++) o.set(x + i, y, '#A58AB5');
        o.set(x, y - 1, '#D6C3E0');
      }
    }
    o.set(x, top - len - 1, '#C7AED3');
  }
  return o;
}

// the tulsi vrindavan: stepped square plinth, niche with a diya, corner horns on top
function tulsi() {
  const c = new Spr(76, 60), top = 4;
  const W = '#F4E6CF', Wd = '#DCC7A6', R = '#C8553A', Rd = '#A63F28';
  c.rect(4, 50, 68, 10, W).rect(4, 50, 68, 2, R).rect(60, 50, 12, 10, Wd);
  c.rect(10, 14, 56, 36, W).rect(56, 14, 10, 36, Wd);
  c.rect(10, 14, 56, 3, R).rect(10, 44, 56, 3, R);
  c.rect(6, 6, 64, 8, W).rect(6, 6, 64, 2, R).rect(6, 12, 64, 2, Rd).rect(62, 6, 8, 8, Wd);
  for (const x of [6, 66]) c.rect(x, top - 2, 4, 6, W).rect(x + 1, top - 4, 2, 2, W).set(x + 1, top - 5, R);
  c.rect(10, 4, 56, 2, '#5A3A28');
  c.rect(30, 22, 16, 20, '#5A2E24').ell(38, 22, 8, 5, '#5A2E24');
  c.ell(38, 38, 5, 2, K.clay, K.clayD);
  c.ell(38, 34, 1.5, 3, '#FFD36A', '#F29A3A');
  for (const x of [16, 52]) { c.rect(x, 26, 4, 4, K.mustard).set(x + 1, 27, K.cream).rect(x - 1, 34, 6, 1, K.indigo); }
  for (let x = 12; x < 66; x += 6) c.set(x, 9, K.cream);
  const chaura = c.outline(OUT);
  const plant = tulsiPlant();
  const s = new Spr(Math.max(chaura.w, plant.w), plant.h + chaura.h - 6);
  blit(s, plant, Math.round((s.w - plant.w) / 2), 0);
  blit(s, chaura, Math.round((s.w - chaura.w) / 2), plant.h - 6);
  return s;
}

function icedCoffee() {
  const s = new Spr(10, 16);
  s.rect(7, 0, 1, 4, K.vermilion);
  s.rect(1, 3, 8, 13, '#EEF4F6').rect(2, 6, 6, 9, '#B5794F').rect(2, 6, 6, 2, K.cream);
  s.rect(3, 9, 2, 2, K.white).rect(5, 11, 2, 2, K.white);
  return s.outline(OUT);
}

module.exports = {
  K, OUT, human, munim, sorter, catcher, kumhar, chowkidar, cat,
  coin, coinHeap, peedha, chowki, gaddi, ledgerRack, plainPot, peti, bahi, filterCoffee, chaak, clayLump, matka, tijori, tulsi, icedCoffee,
};
