// Compositor for the art preview: sprites -> canvas (1 art px) -> nearest-neighbour upscale -> PNG.
const fs = require('fs');
const path = require('path');
const { encodePNG } = require('./png');
const { PALETTE, OUTLINE, S } = require('./sprites');

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

class Canvas {
  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
    if (bg) this.rect(0, 0, w, h, bg);
  }
  px(x, y, c, a = 1) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const [r, g, b] = typeof c === 'string' ? hex(c) : c;
    this.d[i] = this.d[i] * (1 - a) + r * a;
    this.d[i + 1] = this.d[i + 1] * (1 - a) + g * a;
    this.d[i + 2] = this.d[i + 2] * (1 - a) + b * a;
    this.d[i + 3] = 255;
  }
  rect(x, y, w, h, c, a = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a);
  }
  // soft oval shadow, darker tone of whatever is under it
  shadow(cx, cy, rx, ry, a = 0.18) {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.px(cx + x, cy + y, '#000000', a);
  }
  sprite(grid, x, y, { outline = true, flip = false } = {}) {
    const rows = grid.map((r) => (flip ? [...r].reverse().join('') : r));
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const at = (i, j) => {
      if (j < 0 || j >= h) return ' ';
      const ch = rows[j][i];
      return ch === undefined || ch === '.' ? ' ' : ch;
    };
    if (outline) {
      for (let j = -1; j <= h; j++)
        for (let i = -1; i <= w; i++) {
          if (at(i, j) !== ' ') continue;
          if (at(i - 1, j) !== ' ' || at(i + 1, j) !== ' ' || at(i, j - 1) !== ' ' || at(i, j + 1) !== ' ')
            this.px(x + i, y + j, OUTLINE);
        }
    }
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const ch = at(i, j);
        if (ch === ' ') continue;
        const col = PALETTE[ch];
        if (!col) throw new Error(`unknown palette key '${ch}'`);
        this.px(x + i, y + j, col);
      }
    return { w, h };
  }
  save(file, scale) {
    const W = this.w * scale, H = this.h * scale;
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const si = (((y / scale) | 0) * this.w + ((x / scale) | 0)) * 4;
        const di = (y * W + x) * 4;
        out[di] = this.d[si]; out[di + 1] = this.d[si + 1]; out[di + 2] = this.d[si + 2]; out[di + 3] = 255;
      }
    fs.writeFileSync(file, encodePNG(W, H, out));
    return file;
  }
}

const dims = (g) => ({ w: Math.max(...g.map((r) => r.length)), h: g.length });

// Place a sprite standing on a baseline, with its shadow — the ref-1 look.
function stand(cv, grid, cx, baseY, opts = {}) {
  const { w, h } = dims(grid);
  const x = Math.round(cx - w / 2);
  cv.shadow(cx, baseY, Math.max(3, Math.round(w / 2)), 2, opts.shadowA ?? 0.16);
  cv.sprite(grid, x, baseY - h, opts);
}

module.exports = { Canvas, stand, dims, S, PALETTE };

if (require.main === module) {
  const out = path.join(__dirname, 'out');
  fs.mkdirSync(out, { recursive: true });

  // cast sheet on the dusk purple of reference 2
  const cv = new Canvas(150, 92, '#3E3160');
  const cast = ['catcher', 'sorter', 'munim', 'kumhar', 'chowkidar'];
  cast.forEach((k, i) => stand(cv, S[k], 16 + i * 29, 30, { shadowA: 0.22 }));
  stand(cv, S.cat, 16, 52, { shadowA: 0.22 });
  stand(cv, S.pigeon, 38, 52, { shadowA: 0.22 });
  const objs = ['coin', 'coinPile', 'pot', 'tulsi', 'mug', 'icedCoffee', 'chest'];
  objs.forEach((k, i) => stand(cv, S[k], 58 + i * 14 + (i > 1 ? 4 : 0), 52, { shadowA: 0.22 }));
  stand(cv, S.gullak, 20, 84, { shadowA: 0.22 });
  stand(cv, S.wheel, 48, 84, { shadowA: 0.22 });
  // palette swatches
  Object.values(PALETTE).forEach((c, i) => cv.rect(64 + (i % 12) * 7, 64 + ((i / 12) | 0) * 7, 6, 6, c));
  console.log(cv.save(path.join(out, 'cast.png'), 6));
}
