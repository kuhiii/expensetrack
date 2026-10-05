// Builds the gullak world's art: room backgrounds, sprites, leaves and the pixel font.
// Run: node scripts/gullak/build.js
//
// Everything is drawn at 1 art px = 2 dp and exported at 6 device px per art px — the phone is
// 1080x2340 at 3x density (360x780 dp), so the bitmaps are shown 1:1 and never resampled.
// A layout file (src/world/gullakLayout.ts) carries the dp positions the app needs.
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./render');
const { encodePNG } = require('./png');
const { Spr } = require('./v2sprites');
const V3 = require('./v3sprites');
const { kuhi32, kuhiSide } = require('./kuhi2');
const { doorFront, doorOnWall, doorOpening } = require('./door');
const { chaura, leafSprite, LEAF_W, LEAF_H, LEAF_ANCHOR, STEM, STEM_L, GREEN } = require('./tulsiMonths');
const { buildFonts } = require('./ttf');
const { K, OUT } = V3;

const ROOT = path.join(__dirname, '..', '..');
const ASSETS = path.join(ROOT, 'assets', 'gullak');
const Z = 6; // device px per art px
fs.mkdirSync(ASSETS, { recursive: true });

// ---------------------------------------------------------------- export helpers
function saveCanvas(cv, name, x0 = 0, w = cv.w) {
  const W = w * Z, H = cv.h * Z, out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const si = (((y / Z) | 0) * cv.w + x0 + ((x / Z) | 0)) * 4, di = (y * W + x) * 4;
    out[di] = cv.d[si]; out[di + 1] = cv.d[si + 1]; out[di + 2] = cv.d[si + 2]; out[di + 3] = 255;
  }
  fs.writeFileSync(path.join(ASSETS, name), encodePNG(W, H, out));
  return { w: W / 3, h: H / 3 };
}
// a sprite with transparency, each sprite pixel = k art px
function saveSprite(spr, name, k = 1) {
  const px = Z * k, W = spr.w * px, H = spr.h * px, out = new Uint8Array(W * H * 4);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = spr.d[((y / px) | 0) * spr.w + ((x / px) | 0)];
    if (!c) continue;
    const [r, g, b] = hex(c), di = (y * W + x) * 4;
    out[di] = r; out[di + 1] = g; out[di + 2] = b; out[di + 3] = 255;
  }
  fs.writeFileSync(path.join(ASSETS, name), encodePNG(W, H, out));
  return { w: W / 3, h: H / 3 };
}

// ---------------------------------------------------------------- shared room drawing (pastel clay)
const C = {
  wall: '#EDB89C', wallD: '#E0A587', side: '#E3A88B', sideD: '#D6967A',
  floor: '#F3C6AB', floorD: '#E8B497', floorL: '#F8D6C0', deep: '#A86A55', light: '#FFF3D6', pore: '#D49579',
  niche: '#C98A70', nicheD: '#B57760', ledge: '#F8D6C0',
};
const shade = (hex, f) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
let seed = 8;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const nz = (t, k = 0) => Math.sin(t * 0.21 + k) * 1.2 + Math.sin(t * 0.57 + k * 2) * 0.6;
const VH = 390;

function room(RW, BL, BR, HZ, KS) {
  const le = (y) => (y <= HZ ? BL : BL - (y - HZ) * KS) + nz(y, 1);
  const re = (y) => (y <= HZ ? BR : BR + (y - HZ) * KS) + nz(y, 3);
  const cv = new Canvas(RW, VH, C.wall);
  for (let y = 0; y < VH; y++) for (let x = 0; x < RW; x++) {
    let c;
    if (x < le(y) || x >= re(y)) {
      const t = x < le(y) ? (le(y) - x) / 50 : (x - re(y)) / 50;
      c = Math.floor((y - HZ) / (1 + t * 1.8) + 400) % 9 === 0 && rnd() < 0.5 ? C.sideD : C.side;
    } else if (y < HZ + nz(x, 5) * 0.6) {
      c = Math.floor(y + nz(x * 0.7, 2)) % 11 === 0 && rnd() < 0.5 ? C.wallD : C.wall;
    } else {
      const z = 260 / (y - HZ + 8);
      c = Math.floor(z * 3) % 2 === 0 && rnd() < 0.35 ? C.floorD : C.floor;
    }
    const r = rnd();
    if (r < 0.015) c = C.pore; else if (r < 0.03) c = C.floorL;
    cv.px(x, y, c);
  }
  for (let y = 0; y < VH; y++) for (let x = 0; x < RW; x++) {
    const d = Math.min(Math.abs(x - le(y)), Math.abs(x - re(y)), x > le(y) && x < re(y) ? Math.abs(y - HZ) * 2 : 99);
    if (d < 12) cv.px(x, y, C.deep, 0.22 * (1 - d / 12));
  }
  return cv;
}
function shadow(cv, x, y, rx, ry = 2, a = 0.16) {
  for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++)
    if ((xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1) cv.px(x + xx, y + yy, '#7A4A3C', a);
}

const layout = {};

// ---------------------------------------------------------------- level 1: the main room
// A rounder, squarer hollow: the back wall is about as tall as it is wide, its top arches into a
// domed ceiling, and the floor line dips at the sides like the inside of a pot.
function roundRoom(RW, BL, BR, HZ, KS, TOP) {
  const mid = (BL + BR) / 2, half = (BR - BL) / 2;
  const u = (x) => Math.max(-1, Math.min(1, (x - mid) / half));
  const horizon = (x) => HZ + 7 * u(x) ** 2 + nz(x, 5) * 0.5; // floor line dips at the sides
  const ceil = (x) => TOP - 22 * Math.sqrt(Math.max(0, 1 - u(x) ** 2)); // arched top of the back wall
  const le = (y) => (y <= HZ ? BL : BL - (y - HZ) * KS) + nz(y, 1);
  const re = (y) => (y <= HZ ? BR : BR + (y - HZ) * KS) + nz(y, 3);
  const cv = new Canvas(RW, VH, C.wall);
  for (let y = 0; y < VH; y++) for (let x = 0; x < RW; x++) {
    let c;
    const inBack = x >= le(y) && x < re(y);
    if (inBack && y < ceil(x)) {
      // the dome: rings curving overhead
      const d = Math.hypot((x - mid) / 1.2, y - (TOP + 30));
      c = Math.floor(d) % 10 === 0 && rnd() < 0.5 ? C.sideD : C.side;
    } else if (!inBack) {
      const t = x < le(y) ? (le(y) - x) / 40 : (x - re(y)) / 40;
      c = Math.floor((y - HZ) / (1 + t * 1.8) + 400) % 9 === 0 && rnd() < 0.5 ? C.sideD : C.side;
    } else if (y < horizon(x)) {
      c = Math.floor(y - u(x) ** 2 * 6 + nz(x * 0.7, 2)) % 11 === 0 && rnd() < 0.5 ? C.wallD : C.wall;
    } else {
      const z = 260 / (y - HZ + 8);
      c = Math.floor(z * 3) % 2 === 0 && rnd() < 0.35 ? C.floorD : C.floor;
    }
    const r = rnd();
    if (r < 0.015) c = C.pore; else if (r < 0.03) c = C.floorL;
    cv.px(x, y, c);
  }
  // soft rounded shading where the surfaces meet — no hard corners anywhere
  for (let y = 0; y < VH; y++) for (let x = 0; x < RW; x++) {
    const inBack = x >= le(y) && x < re(y);
    let d = 99;
    if (inBack) d = Math.min(Math.abs(y - horizon(x)) * 1.6, Math.abs(y - ceil(x)) * 1.4, Math.abs(x - le(y)), Math.abs(x - re(y)));
    else d = Math.min(Math.abs(x - le(y)), Math.abs(x - re(y)));
    if (d < 16) cv.px(x, y, C.deep, 0.2 * (1 - d / 16));
    const vx = (x - mid) / 120, vy = (y - 200) / 230;
    cv.px(x, y, C.deep, Math.min(0.18, Math.max(0, vx * vx + vy * vy - 0.35) * 0.35));
  }
  return { cv, horizon };
}
{
  const HZ = 214, BL = 30, BR = 150, KS = 1.25;
  const { cv } = roundRoom(180, BL, BR, HZ, KS, 104);
  for (let y = 0; y < 250; y++) { const w = 14 + y / 10; cv.rect(90 - w, y, w * 2, 1, C.light, 0.07); }
  for (let y = -7; y <= 7; y++) for (let x = -34; x <= 34; x++)
    if ((x * x) / 1156 + (y * y) / 49 <= 1) cv.px(84 + x, 240 + y, C.light, 0.22);
  // shelves moulded out of the same mud as the walls, full of old bahi-khatas and books
  const BOOKS = ['#A8382A', '#8E2E22', '#8FA3E0', '#E0A526', '#6FA866', '#B6A0E0', '#C98A70', '#F4E6CF', '#D6457E'];
  function mudShelf(x, y, w, levels, gap) {
    const lip = C.floorL, front = '#D9967A', recess = '#DFA285';
    // the hollow behind the shelves, sunk into the wall, and the mud sides holding them
    cv.rect(x, y - gap + 3, w, gap * levels - 3, recess);
    for (let yy = y - gap + 3; yy < y + gap * (levels - 1) + 3; yy++) { cv.px(x - 1, yy, front); cv.px(x - 2, yy, lip); cv.px(x + w, yy, front); cv.px(x + w + 1, yy, C.wallD); }
    for (let i = 0; i < levels; i++) {
      const ly = y + i * gap;
      // books standing on this ledge (and the odd one lying down)
      let bx = x + 1;
      while (bx < x + w - 2) {
        const bw = 2 + Math.floor(rnd() * 2), bh = gap - 6 - Math.floor(rnd() * 4), col = BOOKS[Math.floor(rnd() * BOOKS.length)];
        if (bx + bw > x + w - 1) break;
        if (rnd() < 0.12 && bx + 7 < x + w) {
          cv.rect(bx, ly - 3, 7, 3, col); cv.rect(bx, ly - 1, 7, 1, shade(col, 0.75)); cv.rect(bx, ly - 5, 6, 2, BOOKS[(BOOKS.indexOf(col) + 2) % BOOKS.length]);
          bx += 8; continue;
        }
        cv.rect(bx, ly - bh, bw, bh, col);
        cv.rect(bx + bw - 1, ly - bh, 1, bh, shade(col, 0.75));
        cv.rect(bx, ly - bh + 2, bw, 1, '#F4E6CF', 0.6);
        bx += bw + (rnd() < 0.2 ? 1 : 0);
      }
      // the mud ledge itself: a thick lip, lit on top, shadow beneath
      cv.rect(x - 2, ly, w + 4, 2, lip);
      cv.rect(x - 2, ly + 2, w + 4, 2, front);
      cv.rect(x - 1, ly + 4, w + 2, 1, C.deep, 0.35);
    }
  }
  mudShelf(34, 124, 38, 5, 16);
  mudShelf(108, 124, 38, 5, 16);

  // the stairs door, cut into the right-hand wall
  const fx = 153, nx = 177;
  const door = doorOnWall(cv, doorFront({ stairs: true }), fx, nx, HZ + 4, HZ + 26, 50, 66);
  layout.openings = { main: doorOpening(fx, nx, HZ + 4, HZ + 26, 50, 66) };
  // munimji on his gaddi at the peti, in the light at the centre
  const gx = 90, gy = 232;
  shadow(cv, gx, gy - 1, 22, 2, 0.15);
  V3.gaddi().stamp(cv, gx - 43, gy - 27);
  V3.munim().stamp(cv, gx - 13, gy - 40);
  V3.peti().stamp(cv, gx - 21, gy - 10);
  V3.bahi().stamp(cv, gx - 13, gy - 16);
  saveCanvas(cv, 'main-room.png');
  layout.main = {
    munim: { x: (gx - 44) * 2, y: (gy - 42) * 2, w: 88 * 2, h: 50 * 2 },
    door: { x: (fx - 2) * 2, y: (HZ + 4 - 54) * 2, w: (nx - fx + 4) * 2, h: 76 * 2 },
    doorLabel: { x: door.x * 2, y: (door.y - 8) * 2 },
    coinLand: [[62, 246], [76, 251], [90, 247], [104, 250], [56, 252], [118, 246], [70, 256], [96, 256], [110, 255]].map(([x, y]) => ({ x: x * 2, y: y * 2 })),
  };
}

// ---------------------------------------------------------------- level 2: categories room (built from segments)
{
  const HZ = 262, BL = 46, COL = 58, COLS = 6, firstCx = 82, BR = firstCx + (COLS - 1) * COL + 29 + 9, RW = BR + 46;
  const cv = room(RW, BL, BR, HZ, 1.25);
  const upDoor = doorOnWall(cv, doorFront({ stairs: true }), BL - 3, BL - 42, HZ, HZ + 40, 58, 92);
  const svDoor = doorOnWall(cv, doorFront(), BR + 3, BR + 42, HZ, HZ + 40, 58, 92);
  layout.openings.up = doorOpening(BL - 3, BL - 42, HZ, HZ + 40, 58, 92);
  const so = doorOpening(BR + 3, BR + 42, HZ, HZ + 40, 58, 92);
  layout.openings.savingsFromRightStrip = { ...so, x: so.x - (firstCx + COLS * COL - 29) * 2 };
  const leftW = firstCx - 29, rightX = firstCx + COLS * COL - 29;
  const l = saveCanvas(cv, 'cat-left.png', 0, leftW);
  const m = saveCanvas(cv, 'cat-mid.png', leftW, COL);
  const r = saveCanvas(cv, 'cat-right.png', rightX, RW - rightX);
  layout.categories = {
    leftW: l.w, colW: m.w, rightW: r.w, rows: [96 * 2, 178 * 2],
    upDoor: { x: (BL - 44) * 2, y: (HZ - 72) * 2, w: 48 * 2, h: 112 * 2, labelX: upDoor.x * 2, labelY: (upDoor.y - 8) * 2 },
    svDoorFromRight: { x: (BR - rightX - 2) * 2, y: (HZ - 72) * 2, w: 48 * 2, h: 112 * 2, labelX: (svDoor.x - rightX) * 2, labelY: (svDoor.y - 8) * 2 },
  };
  // a niche, saved on its own so any number can be laid out on the wall
  const niche = new Spr(50, 50), w = 46, h = 46, rr = w / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!(y >= rr * 0.7 || (x + 0.5 - rr) ** 2 + ((y + 0.5 - rr * 0.7) * 1.4) ** 2 <= rr * rr)) continue;
    niche.set(x + 2, y, x < 2 || x > w - 3 || y < 8 || x < 5 ? C.nicheD : C.niche);
  }
  niche.rect(0, h, 50, 3, C.ledge).rect(0, h + 3, 50, 1, C.wallD);
  saveSprite(niche, 'niche.png');
}

// ---------------------------------------------------------------- level 2: savings room
{
  const HZ = 262, BL = 46, BR = 254, RW = 280, cx = 136;
  const cv = room(RW, BL, BR, HZ, 1.25);
  for (let y = -80; y <= 80; y++) for (let x = -90; x <= 90; x++) {
    const d = Math.hypot(x / 90, y / 80);
    if (d < 1) cv.px(cx + x, 200 + y, '#E9F5D6', 0.28 * (1 - d));
  }
  const back = doorOnWall(cv, doorFront(), BL - 3, BL - 42, HZ, HZ + 40, 58, 92);
  layout.openings.back = doorOpening(BL - 3, BL - 42, HZ, HZ + 40, 58, 92);
  const ch = chaura();
  for (let y = -3; y <= 3; y++) for (let x = -42; x <= 42; x++) if ((x * x) / 1764 + (y * y) / 9 <= 1) cv.px(cx + x, 301 + y, '#7A4A3C', 0.18);
  const chTop = 302 - ch.h;
  ch.stamp(cv, cx - Math.round(ch.w / 2), chTop);
  saveCanvas(cv, 'savings-room.png');
  layout.savings = {
    width: RW * 2, soilX: cx * 2, soilY: (chTop + 6) * 2,
    shrine: { x: (cx - 40) * 2, y: chTop * 2, w: 80 * 2, h: ch.h * 2 },
    backDoor: { x: (BL - 44) * 2, y: (HZ - 72) * 2, w: 48 * 2, h: 112 * 2, labelX: back.x * 2, labelY: (back.y - 8) * 2 },
  };
}

// ---------------------------------------------------------------- sprites
// Kuhi: the 32px character at 5 art px per pixel (she is closest to the camera)
// every walk frame at every distance: k = art px per sprite px (5 = right by the camera, 2 = far away)
const FRAMES = {
  back: () => kuhi32({ back: true }), backA: () => kuhi32({ back: true, legs: 'A' }), backB: () => kuhi32({ back: true, legs: 'B' }),
  front: () => kuhi32(), frontA: () => kuhi32({ legs: 'A' }), frontB: () => kuhi32({ legs: 'B' }),
  side: () => kuhiSide(), sideA: () => kuhiSide({ legs: 'A' }), sideB: () => kuhiSide({ legs: 'B' }),
  turn: () => kuhi32({ back: true, turn: true }),
};
const kuhiKeys = [];
for (const [name, make] of Object.entries(FRAMES)) for (const k of [1, 2, 3, 4, 5]) {
  if (name === 'turn' && k !== 5) continue;
  saveSprite(make(), `kuhi-${name}-${k}.png`, k);
  kuhiKeys.push(`${name}-${k}`);
}
const one = kuhi32();
layout.kuhi = { size: one.w * 2, feet: 32 * 2 }; // dp per k: sprite is size*k square, feet row at feet*k
fs.writeFileSync(path.join(ROOT, 'src', 'world', 'kuhiImages.ts'), `// Generated by scripts/gullak/build.js — do not edit by hand.\n/* eslint-disable */\nexport const KUHI_IMAGES: Record<string, any> = {\n${kuhiKeys.map((k) => `  '${k}': require('../../assets/gullak/kuhi-${k}.png'),`).join('\n')}\n};\n`);

// coins: plain, falling (face-on and edge-on) and lying flat
const METAL = {
  gold: ['#F2C94C', '#C99A2E', '#FFF0A8', '#A87B1E'], steel: ['#DADEE5', '#A6ADBA', '#FFFFFF', '#7F8796'],
  bimetal: ['#F2C94C', '#C99A2E', '#FFF0A8', '#A6ADBA'],
};
function coinFace(metal) {
  const [c, d, h, rim] = METAL[metal], s = new Spr(18, 18);
  s.ell(9, 8.5, 8.5, 8.5, rim);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) s.set(Math.round(9 + Math.cos(a) * 8.2), Math.round(8.5 + Math.sin(a) * 8.2), d);
  s.ell(9, 8.5, 6.6, 6.6, c, d, h);
  for (let a = 0; a < Math.PI * 2; a += 0.05) s.over(Math.round(9 + Math.cos(a) * 5.6), Math.round(8.5 + Math.sin(a) * 5.6), d);
  s.pts([[4, 4], [5, 3], [6, 3]], '#FFFFFF');
  s.grid(['#####', '..#..', '#####', '.##..', '..#..', '...#.', '....#'], { '#': d }, 7, 5);
  return s.outline(OUT);
}
function coinFlat(metal) {
  const [c, d, h] = { gold: ['#F6D77A', '#DDB55A', '#FFF0B8'], steel: ['#E4E7EC', '#BCC2CD', '#FFFFFF'], bimetal: ['#F6D77A', '#BCC2CD', '#FFF0B8'] }[metal];
  const s = new Spr(12, 6);
  s.ell(6, 3, 6, 3, d).ell(6, 2.6, 5, 2.2, c, d, h).set(6, 2, d).set(5, 2, d);
  return s.outline('#8A5A48');
}
for (const m of Object.keys(METAL)) { saveSprite(coinFace(m), `coin-${m}.png`); saveSprite(coinFlat(m), `coin-flat-${m}.png`); }

// category pots: every preset's emblem and pastel band, at fill levels 0-3
const EMBLEM_GRIDS = {
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
  travel: ['  ###  ', '  # #  ', '#######', '#######', '#######', '#######', ' #   # '],
  gifts: [' #   # ', '  # #  ', '#######', '#######', '   #   ', '#######', '#######'],
  gym: ['       ', '#     #', '##   ##', '#######', '##   ##', '#     #', '       '],
  savings: ['  ###  ', ' #   # ', '#  #  #', '# ### #', '#  #  #', ' #   # ', '  ###  '],
  paycheck: ['#######', '#     #', '# ### #', '# ### #', '#     #', '#######', '       '],
  cash: ['#######', '#  #  #', '# ### #', '#  #  #', '#######', '       ', '       '],
  untagged: ['  ###  ', ' #   # ', '    #  ', '   #   ', '   #   ', '       ', '   #   '],
};
// One distinct colour per category, in a fixed order (that order also hands out the shapes).
const POTS = {
  rent: '#8FA3E0', 'food-dining': '#F29A7E', shopping: '#F09CC4', groceries: '#A6D49A', hobbies: '#7FCBC4',
  transport: '#F3D98A', subscriptions: '#B6A0E0', 'bills-utilities': '#8EC3EA', entertainment: '#F6B76E',
  health: '#E57A8A', 'personal-care': '#D2DE7E', paycheck: '#6FCF9F', travel: '#5FA8D3', 'investments-savings': '#4FA36A',
  'gifts-donations': '#C77DDB', 'cash-withdrawal': '#C9A86A', miscellaneous: '#AEB8C6', gym: '#8C7FD6', untagged: '#C9C2BA',
};
const CUSTOM_BANDS = ['#E0907A', '#9CB8F0', '#D9A6E8', '#9AD1A0', '#E8C25A', '#F2A0B0', '#6FC0C8', '#B89A7A'];
const { gharonda } = require('./gharonda');
function pot(index, _band, fill) {
  return gharonda(index, fill, true);
}
const potKeys = [];
Object.entries(POTS).forEach(([id, band], i) => { for (let f = 0; f < 4; f++) { saveSprite(pot(i, band, f), `pot-${id}-${f}.png`); potKeys.push(`${id}-${f}`); } });
const nPresets = Object.keys(POTS).length;
CUSTOM_BANDS.forEach((band, i) => { for (let f = 0; f < 4; f++) { saveSprite(pot(nPresets + i, band, f), `pot-custom${i}-${f}.png`); potKeys.push(`custom${i}-${f}`); } });
// a plain, unpainted gharonda: the "add a category" niche
saveSprite(gharonda(1, 0, false), 'pot-plain.png');
layout.pot = { w: 32 * 2, h: 36 * 2 };
layout.niche = { w: 50 * 2, h: 50 * 2 };

// tulsi leaves: left/right, 10 sizes, fresh and wilted, plus the dotted outline of a leaf's former size
for (const side of ['L', 'R']) for (let b = 0; b < 10; b++) {
  for (const state of ['green', 'wilt', 'ghost']) saveSprite(leafSprite(side, b, state), `leaf-${side}-${b}-${state}.png`);
}
layout.leaf = { sizes: 10, w: LEAF_W * 2, h: LEAF_H * 2, anchorR: { x: LEAF_ANCHOR.R[0] * 2, y: LEAF_ANCHOR.R[1] * 2 }, anchorL: { x: LEAF_ANCHOR.L[0] * 2, y: LEAF_ANCHOR.L[1] * 2 }, stem: STEM, stemLight: STEM_L, bud: GREEN[0], budDark: GREEN[1] };

// ---------------------------------------------------------------- the transaction scroll: rolled paper on wooden rods
{
  const W2 = 180, H2 = 16, s2 = new Spr(W2, H2);
  const P1 = '#F1DDB5', P2 = '#E0C493', P3 = '#C9A473', PL = '#FAEBCC', WD = '#8A5A3C', WDD = '#5E3A26', WDL = '#B07A52';
  // the wooden rod with round knobs at each end
  for (const kx of [5, W2 - 6]) s2.ell(kx, 8, 5, 6, WD, WDD, WDL);
  s2.rect(8, 6, W2 - 16, 4, WD).rect(8, 9, W2 - 16, 1, WDD).rect(8, 6, W2 - 16, 1, WDL);
  // the rolled paper around it, shaded like a cylinder, with a frayed old edge
  for (let x = 12; x < W2 - 12; x++) for (let y = 2; y < 15; y++) {
    const t = (y - 2) / 12;
    let c = t < 0.15 ? PL : t < 0.55 ? P1 : t < 0.85 ? P2 : P3;
    if ((x * 7 + y * 3) % 23 === 0) c = P3; // age spots
    s2.set(x, y, c);
  }
  for (let x = 12; x < W2 - 12; x += 3) { s2.set(x, 2, null); if (x % 9 === 0) s2.set(x + 1, 14, P3); }
  saveSprite(s2.outline('#5E3A26'), 'scroll-end.png');
  layout.scroll = { w: 182 * 2, h: 18 * 2, paper: P1, paperDark: P2, paperEdge: P3, ink: '#4A2E22', inkSoft: '#8A6448', red: '#A8402F', green: '#3F7A3A' };
}

// ---------------------------------------------------------------- layout + pixel font
const ts = `// Generated by scripts/gullak/build.js — do not edit by hand.\n// All values are dp.\nexport const GULLAK_LAYOUT = ${JSON.stringify(layout, null, 2)} as const;\n`;
fs.writeFileSync(path.join(ROOT, 'src', 'world', 'gullakLayout.ts'), ts);

const pots = `// Generated by scripts/gullak/build.js — do not edit by hand.\n/* eslint-disable */\nexport const POT_IMAGES: Record<string, any> = {\n${potKeys.map((k) => `  '${k}': require('../../assets/gullak/pot-${k}.png'),`).join('\n')}\n};\nexport const CUSTOM_POT_COUNT = ${CUSTOM_BANDS.length};\n`;
fs.writeFileSync(path.join(ROOT, 'src', 'world', 'potImages.ts'), pots);

const leaves = [];
for (const side of ['L', 'R']) for (let b = 0; b < 10; b++) for (const state of ['green', 'wilt', 'ghost']) leaves.push(`  '${side}-${b}-${state}': require('../../assets/gullak/leaf-${side}-${b}-${state}.png'),`);
fs.writeFileSync(path.join(ROOT, 'src', 'world', 'leafImages.ts'), `// Generated by scripts/gullak/build.js — do not edit by hand.\n/* eslint-disable */\nexport const LEAF_IMAGES: Record<string, any> = {\n${leaves.join('\n')}\n};\n`);

buildFonts(path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'fonts'));
console.log('gullak art built');
