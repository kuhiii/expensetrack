// Compiles the 5x7 bitmap pixel font (font.js) into TrueType files Android can load:
// GullakPixel-Regular.ttf and GullakPixel-Bold.ttf. Every lit font pixel becomes a square,
// rows of pixels merge into one rectangle contour. 8 font pixels per em, so a fontSize of
// 8n/3 dp lands each font pixel on exactly n device pixels on a 3x phone.
const fs = require('fs');
const path = require('path');
const { G } = require('./font');

const P = 125, EM = 1000, ASC = 7 * P, DESC = 2 * P;

function metrics(ch) {
  const g = G[ch];
  if (ch === ' ') return { g, left: 0, w: 3 };
  let l = 5, r = -1;
  for (const row of g) for (let i = 0; i < 5; i++) if (row[i] === '#') { l = Math.min(l, i); r = Math.max(r, i); }
  return r < 0 ? { g, left: 0, w: 3 } : { g, left: l, w: r - l + 1 };
}

function glyphFor(ch, bold) {
  const { g, left, w } = metrics(ch), bw = bold ? P / 2 : 0;
  const rects = [];
  g.forEach((row, j) => {
    let i = 0;
    while (i < 5) {
      if (row[i] !== '#') { i++; continue; }
      let k = i; while (k < 5 && row[k] === '#') k++;
      const y1 = (7 - j) * P, y0 = y1 - P;
      rects.push([(i - left) * P, y0, (k - left) * P + bw, y1]);
      i = k;
    }
  });
  return { rects, advance: (w + 1) * P + bw };
}

// ---- binary helpers
class Buf {
  constructor() { this.b = []; }
  u8(v) { this.b.push(v & 255); return this; }
  u16(v) { this.b.push((v >> 8) & 255, v & 255); return this; }
  i16(v) { return this.u16(v < 0 ? v + 65536 : v); }
  u32(v) { this.b.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); return this; }
  tag(s) { for (const c of s) this.b.push(c.charCodeAt(0)); return this; }
  bytes(a) { for (const x of a) this.b.push(x); return this; }
  pad4() { while (this.b.length % 4) this.b.push(0); return this; }
  get length() { return this.b.length; }
  buffer() { return Buffer.from(this.b); }
}
const checksum = (buf) => {
  let sum = 0;
  const b = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
  for (let i = 0; i < b.length; i += 4) sum = (sum + b.readUInt32BE(i)) >>> 0;
  return sum;
};

function build(bold) {
  const chars = Object.keys(G).filter((c) => c.length === 1 || [...c].length === 1);
  const glyphs = [{ rects: [], advance: 4 * P }]; // .notdef
  const cmap = new Map();
  for (const ch of chars) { cmap.set(ch.codePointAt(0), glyphs.length); glyphs.push(glyphFor(ch, bold)); }
  // uppercase falls back to the lowercase shapes (the app's voice is lowercase anyway)
  for (let c = 65; c <= 90; c++) {
    const lower = String.fromCharCode(c + 32);
    if (!cmap.has(c) && cmap.has(lower.codePointAt(0))) cmap.set(c, cmap.get(lower.codePointAt(0)));
  }
  if (!cmap.has(0x2212) && cmap.has(45)) cmap.set(0x2212, cmap.get(45)); // − minus

  // glyf + loca
  const glyf = new Buf(), loca = [];
  let maxPts = 0, maxCont = 0, xMin = 0, yMin = 0, xMax = 0, yMax = 0;
  for (const gl of glyphs) {
    loca.push(glyf.length);
    if (!gl.rects.length) continue;
    const gx0 = Math.min(...gl.rects.map((r) => r[0])), gy0 = Math.min(...gl.rects.map((r) => r[1]));
    const gx1 = Math.max(...gl.rects.map((r) => r[2])), gy1 = Math.max(...gl.rects.map((r) => r[3]));
    xMin = Math.min(xMin, gx0); yMin = Math.min(yMin, gy0); xMax = Math.max(xMax, gx1); yMax = Math.max(yMax, gy1);
    glyf.i16(gl.rects.length).i16(gx0).i16(gy0).i16(gx1).i16(gy1);
    gl.rects.forEach((_, i) => glyf.u16(i * 4 + 3));
    glyf.u16(0); // no instructions
    const pts = [];
    for (const [x0, y0, x1, y1] of gl.rects) pts.push([x0, y0], [x0, y1], [x1, y1], [x1, y0]); // clockwise
    pts.forEach(() => glyf.u8(1));
    let px = 0; for (const [x] of pts) { glyf.i16(x - px); px = x; }
    let py = 0; for (const [, y] of pts) { glyf.i16(y - py); py = y; }
    glyf.pad4();
    maxPts = Math.max(maxPts, pts.length); maxCont = Math.max(maxCont, gl.rects.length);
  }
  loca.push(glyf.length);
  const locaB = new Buf(); loca.forEach((o) => locaB.u32(o));

  const n = glyphs.length;
  const head = new Buf().u32(0x00010000).u32(0x00010000).u32(0).u32(0x5f0f3cf5).u16(0x000b).u16(EM)
    .u32(0).u32(0).u32(0).u32(0).i16(xMin).i16(yMin).i16(xMax).i16(yMax).u16(bold ? 1 : 0).u16(8).i16(2).i16(1).i16(0);
  const advMax = Math.max(...glyphs.map((g) => g.advance));
  const hhea = new Buf().u32(0x00010000).i16(ASC).i16(-DESC).i16(0).u16(advMax).i16(0).i16(0).i16(xMax)
    .i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).u16(n);
  const hmtx = new Buf(); glyphs.forEach((g) => hmtx.u16(Math.round(g.advance)).i16(g.rects.length ? Math.min(...g.rects.map((r) => r[0])) : 0));
  const maxp = new Buf().u32(0x00010000).u16(n).u16(maxPts).u16(maxCont).u16(0).u16(0).u16(2)
    .u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);

  // cmap format 4, one segment per code point
  const codes = [...cmap.keys()].filter((c) => c < 0xffff).sort((a, b) => a - b);
  const segs = codes.map((c) => ({ s: c, e: c, d: (cmap.get(c) - c + 65536) % 65536 })).concat([{ s: 0xffff, e: 0xffff, d: 1 }]);
  const segX2 = segs.length * 2, sr = 2 * 2 ** Math.floor(Math.log2(segs.length)), es = Math.floor(Math.log2(segs.length));
  const sub = new Buf().u16(4).u16(16 + segs.length * 8).u16(0).u16(segX2).u16(sr).u16(es).u16(segX2 - sr);
  segs.forEach((g) => sub.u16(g.e)); sub.u16(0); segs.forEach((g) => sub.u16(g.s)); segs.forEach((g) => sub.u16(g.d)); segs.forEach(() => sub.u16(0));
  const cmapT = new Buf().u16(0).u16(2).u16(0).u16(3).u32(20).u16(3).u16(1).u32(20).bytes(sub.b);

  const family = 'Gullak Pixel', style = bold ? 'Bold' : 'Regular';
  const names = [[1, family], [2, style], [3, `${family} ${style}`], [4, `${family} ${style}`], [5, 'Version 1.0'], [6, `GullakPixel-${style}`]];
  const strs = names.map(([, s]) => Buffer.from([...s].flatMap((c) => [0, c.charCodeAt(0)])));
  const name = new Buf().u16(0).u16(names.length).u16(6 + names.length * 12);
  let off = 0;
  names.forEach(([id], i) => { name.u16(3).u16(1).u16(0x409).u16(id).u16(strs[i].length).u16(off); off += strs[i].length; });
  strs.forEach((s) => name.bytes(s));

  const os2 = new Buf().u16(4).i16(Math.round(glyphs.reduce((a, g) => a + g.advance, 0) / n)).u16(bold ? 700 : 400).u16(5).u16(0)
    .i16(650).i16(700).i16(0).i16(140).i16(650).i16(700).i16(0).i16(480).i16(P).i16(3 * P).i16(0)
    .bytes([2, 0, 0, 0, 0, 0, 0, 0, 0, 0]).u32(1).u32(0).u32(0).u32(0).tag('GLKP')
    .u16(bold ? 0x20 : 0x40).u16(32).u16(0xffff).i16(ASC).i16(-DESC).i16(0).u16(ASC).u16(DESC)
    .u32(1).u32(0).i16(5 * P).i16(7 * P).u16(0).u16(32).u16(1);
  const post = new Buf().u32(0x00030000).u32(0).i16(-P).i16(P / 2).u32(0).u32(0).u32(0).u32(0).u32(0);

  const tables = { 'OS/2': os2, cmap: cmapT, glyf, head, hhea, hmtx, loca: locaB, maxp, name, post };
  const tags = Object.keys(tables).sort();
  const nt = tags.length, srT = 16 * 2 ** Math.floor(Math.log2(nt)), esT = Math.floor(Math.log2(nt));
  const dir = new Buf().u32(0x00010000).u16(nt).u16(srT).u16(esT).u16(nt * 16 - srT);
  let offset = 12 + nt * 16;
  const bodies = [];
  let headOffset = 0;
  for (const t of tags) {
    const buf = tables[t].buffer();
    dir.tag(t.padEnd(4, ' ')).u32(checksum(buf)).u32(offset).u32(buf.length);
    if (t === 'head') headOffset = offset;
    const padded = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
    bodies.push(padded); offset += padded.length;
  }
  const font = Buffer.concat([dir.buffer(), ...bodies]);
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headOffset + 8);
  return font;
}

function buildFonts(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'GullakPixel-Regular.ttf'), build(false));
  fs.writeFileSync(path.join(dir, 'GullakPixel-Bold.ttf'), build(true));
}
module.exports = { buildFonts };
if (require.main === module) buildFonts(process.argv[2] || '.');
