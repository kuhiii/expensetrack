// Kuhi in the shape of her reference: a big bumpy cloud of curls, small body, black outline.
// Pink pixels scattered through the curls are her highlights. 32x32 grid.
const { Spr } = require('./v2sprites');
const P = {
  hair: ['#0B0B0B', '#1C1C1C', '#262626'], pink: ['#D16FB4', '#F2A6D8', '#B4508F'],
  skin: '#C98A5E', blush: '#F5A3AE', eye: '#0B0B0B',
  tank: '#A3A7B0', tankD: '#868B96', tankL: '#BEC2CA',
  jean: '#5470CF', jeanD: '#4A5A9A', jeanL: '#9DB3F0', shoe: '#0B0B0B', out: '#0B0B0B',
};
// U-shaped hair: full and round on top, tapering smoothly as it falls to just below the shoulders.
// The edge is bumpy (curls) but the overall outline is a soft U, not a ball.
function hairMask(back, turn) {
  const m = [];
  for (let y = 0; y < 32; y++) { m.push([]); for (let x = 0; x < 32; x++) m[y].push(false); }
  const cx = 15.5, cy = 10;
  const halfW = (y) => {
    if (y < cy) return 12.3 * Math.sqrt(Math.max(0, 1 - ((y - cy) / 9.6) ** 2));
    let w = 12.3 - 0.022 * (y - cy) ** 2;          // gentle taper going down
    if (y > 20) w -= ((y - 20) / 2.4) ** 2 * 3.2;   // rounded bottom of the U
    return w;
  };
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const px = x + 0.5, py = y + 0.5, a = Math.atan2(py - cy, px - cx);
    const bump = 0.65 * Math.sin(a * 13) + 0.35 * Math.sin(a * 7 + 1);
    const w = halfW(py) + bump;
    if (w > 0 && Math.abs(px - cx) <= w) m[y][x] = true;
  }
  if (!back) for (let y = 17; y < 24; y++) for (let x = 10; x <= 21; x++) m[y][x] = false; // her chin, neck and shoulders show in front
  if (back && turn) for (let y = 18; y < 24; y++) for (let x = 14; x <= 22; x++) m[y][x] = false; // nothing under the turned face: neck and shoulder show
  return m;
}
function kuhi32({ back = false, turn = false, legs = 'stand', seed = 5 } = {}) {
  let sd = seed; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const s = new Spr(32, 32), m = hairMask(back, turn);
  // body
  const body = (x, y, c) => s.set(x, y, c);
  for (let y = 20; y < 25; y++) { body(10, y, P.skin); body(11, y, P.skin); body(20, y, P.skin); body(21, y, P.skin); for (let x = 12; x < 20; x++) body(x, y, x > 17 ? P.tankD : P.tank); }
  if (!back) { body(12, 20, P.skin); body(19, 20, P.skin); for (let x = 13; x < 19; x++) body(x, 20, x === 13 || x === 18 ? P.tankL : P.skin); }
  else { body(13, 20, P.tankL); body(18, 20, P.tankL); }
  // walking: the lifted leg ends a pixel higher, the planted one a pixel lower in the frame after
  const liftL = legs === 'A' ? 1 : 0, liftR = legs === 'B' ? 1 : 0;
  for (let y = 25; y < 30; y++) for (let x = 11 - (y > 27 ? 1 : 0); x < 21 + (y > 27 ? 1 : 0); x++) {
    if (y > 27 && (x === 15 || x === 16)) continue;
    if (x < 16 && y >= 30 - liftL) continue;
    if (x >= 16 && y >= 30 - liftR) continue;
    body(x, y, (x === 11 || x === 20) && y < 28 ? P.jeanD : P.jean);
  }
  [[12, 26], [14, 25], [13, 27], [18, 26], [17, 28], [19, 25], [10, 29 - liftL], [21, 29 - liftR]].forEach(([x, y]) => body(x, y, P.jeanL));
  body(12, 30 - liftL, P.skin); body(13, 30 - liftL, P.skin); body(18, 30 - liftR, P.skin); body(19, 30 - liftR, P.skin);
  // hair over everything above the shoulders
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (!m[y][x]) continue;
    const q = r();
    s.set(x, y, q < 0.12 ? P.pink[q < 0.04 ? 1 : 0] : q < 0.15 ? P.pink[2] : q < 0.27 ? P.hair[1] : q < 0.31 ? P.hair[2] : P.hair[0]);
  }
  if (back && turn) {
    // head turned to look back over her shoulder: a three-quarter face on the right, big smile
    const rows = { 11: [17, 21], 12: [16, 22], 13: [15, 22], 14: [15, 22], 15: [15, 22], 16: [15, 22], 17: [16, 21], 18: [17, 20] };
    const NECK = '#B07A55';
    for (const [y, [x0, x1]] of Object.entries(rows)) for (let x = x0; x <= x1; x++) s.set(x, +y, P.skin);
    // a rounded jaw with a soft shadow under it, then a slim neck down to the shoulders
    s.set(17, 18, NECK).set(20, 18, NECK);
    s.set(18, 19, NECK).set(19, 19, NECK);
    // happy closed eyes (^ ^) and a wide smile
    s.set(16, 14, P.eye).set(17, 13, P.eye).set(18, 14, P.eye);
    s.set(20, 14, P.eye).set(21, 13, P.eye).set(22, 14, P.eye);
    s.set(15, 15, P.blush).set(16, 16, P.blush).set(22, 16, P.blush);
    // small soft smile, same mauve as her reference portrait
    s.set(18, 17, '#A35473').set(19, 17, '#A35473').set(17, 16, '#C98A80').set(20, 16, '#C98A80');
    [[16, 11], [19, 11], [20, 11]].forEach(([x, y]) => s.set(x, y, P.hair[0]));
  }
  if (!back) {
    // face, as in the reference: small round face under the curls, tall single-pixel eyes, blush at the outer cheeks
    const rows = { 11: [13, 18], 12: [12, 19], 13: [11, 20], 14: [11, 20], 15: [11, 20], 16: [11, 20], 17: [12, 19], 18: [13, 18], 19: [11, 20] };
    for (const [y, [x0, x1]] of Object.entries(rows)) for (let x = x0; x <= x1; x++) s.set(x, +y, P.skin);
    for (const y of [13, 14, 15]) { s.set(13, y, P.eye); s.set(18, y, P.eye); }
    s.set(11, 15, P.blush).set(12, 16, P.blush).set(11, 16, P.blush).set(20, 15, P.blush).set(19, 16, P.blush).set(20, 16, P.blush);
    // a few curls of fringe falling over the forehead
    [[13, 11], [16, 11], [17, 11], [12, 12]].forEach(([x, y]) => s.set(x, y, P.hair[0]));
  }
  return s.outline(P.out);
}
// upscale a sprite by an integer factor (she is the closest thing to the camera)
function scaled(spr, k) {
  const o = new Spr(spr.w * k, spr.h * k);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = spr.d[Math.floor(y / k) * spr.w + Math.floor(x / k)];
  return o;
}
// Side view, facing right: the curl cloud sits back on her head, face in profile,
// one arm swinging, legs scissoring. legs: 'stand' | 'A' | 'B'.
function kuhiSide({ legs = 'stand', seed = 5 } = {}) {
  let sd = seed; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const s = new Spr(32, 32);
  const set = (x, y, c) => s.set(x, y, c);
  const JD = P.jeanD;
  // legs, hand-drawn per frame (x from 12, rows 26-30): J near leg, d far leg, S/s feet
  const LEGS = {
    stand: ['..JJJJ..', '..JJJJ..', '..JJJ...', '..JJJ...', '..SSSS..'],
    A: ['..JJJJ..', '.dJ..JJ.', '.dd...JJ', 'dd....JJ', 'ss....SSS'],
    B: ['..JJJJ..', '.JJ..dd.', 'JJ....dd', 'JJ.....dd', 'SSS....ss'],
  }[legs];
  s.grid(LEGS, { J: P.jean, d: JD, S: P.skin, s: '#B07A55' }, 12, 26);
  // hips + tank top
  for (let y = 24; y < 26; y++) for (let x = 13; x < 20; x++) set(x, y, P.jean);
  for (let y = 19; y < 24; y++) for (let x = 13; x < 20; x++) set(x, y, x < 15 ? P.tankD : P.tank);
  set(18, 19, P.tankL); set(19, 20, P.tankL);
  // neck
  set(17, 18, P.skin); set(18, 18, P.skin);
  // arm: swings opposite the near leg
  const sw = { stand: 0, A: -1, B: 1 }[legs];
  for (let y = 20; y < 25; y++) set(16 + Math.round(((y - 20) / 4) * sw * 2), y, P.skin);
  set(16 + sw * 2, 25, P.skin);
  // hair: the same curl cloud, shifted back
  const m = hairMask(true, false);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const sx = x + 2; // shift the cloud 2px back (left)
    if (!m[y][Math.min(31, sx)]) continue;
    if (y >= 18 && x >= 15) continue; // her front shows below the chin
    const q = r();
    set(x, y, q < 0.12 ? P.pink[q < 0.04 ? 1 : 0] : q < 0.15 ? P.pink[2] : q < 0.27 ? P.hair[1] : q < 0.31 ? P.hair[2] : P.hair[0]);
  }
  // face in profile on the right, peeking out of the curls
  const rows = { 11: [19, 21], 12: [18, 22], 13: [18, 22], 14: [18, 23], 15: [18, 22], 16: [18, 22], 17: [19, 21], 18: [19, 20] };
  for (const [y, [x0, x1]] of Object.entries(rows)) for (let x = x0; x <= x1; x++) set(x, +y, P.skin);
  set(21, 13, P.eye); set(21, 14, P.eye); set(21, 15, P.eye);
  set(19, 16, P.blush); set(20, 16, P.blush);
  set(22, 17, '#A35473');
  [[19, 11], [18, 12]].forEach(([x, y]) => set(x, y, P.hair[0]));
  return s.outline(P.out);
}

module.exports = { kuhi32, kuhiSide, scaled };
