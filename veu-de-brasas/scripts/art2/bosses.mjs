// Chefes: Batráquio Colossal (sapo mineral gigante) e Coração do Véu (núcleo cristalino vivo).
import { part, flat, line, spec, aura, gem, capsule, circle, ellipse, path, smooth, poly, shift, mix, whiteFlash, f, TAU, OUT, rng } from './lib.mjs';

const P = (shape, c, o = {}) => part(shape, c, { sw: 2.2, k: 3, ...o });

// ---------------------------------------------------------------- Batráquio Colossal (176×150, solo em y≈123)
function toad(st, i, n) {
  const t = i / n, p = t * TAU;
  let sq = Math.sin(p) * 0.025, up = 0, mouth = 0, rage = 0, legsOut = 0, throat = 0.5 + Math.sin(p) * 0.5;
  if (st === 'rage') { rage = 1; mouth = 0.6 + Math.sin(p * 2) * 0.2; sq = Math.sin(p * 2) * 0.04; }
  if (st === 'crouch') sq = 0.12 + i * 0.06;
  if (st === 'air') { sq = -0.16; up = 16 + i * 4; legsOut = 1; }
  if (st === 'land') sq = [0.24, 0.1][i] ?? 0.1;
  if (st === 'spit') { mouth = [0.4, 1, 0.6][i] ?? 0.5; throat = [1.4, 0.2, 0.4][i] ?? 0.5; }
  const gy = 123 - up, cx = 88;
  const S = (x, y) => [cx + (x - cx) * (1 + sq * 0.8), gy + (y - gy) * (1 - sq)];
  const skin = rage ? '#3aa08a' : '#3a9a86';
  let s = '';
  if (rage) s += aura(cx, gy - 40, 90, '#ff4a2a', 0.25);
  // pernas traseiras
  if (legsOut) {
    s += P(capsule(...S(40, 100), 26, gy + 18, 13, 9), shift(skin, -0.06));
    s += P(capsule(...S(136, 100), 150, gy + 18, 13, 9), shift(skin, -0.06));
  } else {
    s += P(ellipse(...S(40, 105), 30 * (1 + sq * 0.5), 20), shift(skin, -0.05));
    s += P(ellipse(...S(136, 105), 30 * (1 + sq * 0.5), 20), shift(skin, -0.05));
    s += P(ellipse(...S(30, 120), 20, 7), shift(skin, -0.14), { k: 1.5 }) + P(ellipse(...S(146, 120), 20, 7), shift(skin, -0.14), { k: 1.5 });
  }
  // corpo
  s += P(smooth([S(22, 112), S(26, 70), S(52, 40), S(88, 30), S(124, 40), S(150, 70), S(154, 112), S(120, 124), S(56, 124)]), skin, { lt: 0.12, k: 4 });
  // barriga
  s += P(smooth([S(52, 118), S(58, 92), S(88, 84), S(118, 92), S(124, 118), S(88, 125)]), '#e6e6b8', { k: 2 });
  for (let j = 0; j < 4; j++) s += line(`M${f(S(62 + j * 16, 98)[0])} ${f(S(62, 98)[1])} Q${f(S(66 + j * 16, 110)[0])} ${f(S(66, 110)[1])} ${f(S(64 + j * 16, 120)[0])} ${f(S(64, 120)[1])}`, '#b8b88a', 1.4, 0.7);
  // cristais nas costas
  for (const [x, y, w, h, r] of [[50, 50, 9, 16, -25], [70, 36, 10, 20, -8], [95, 32, 11, 22, 6], [118, 40, 9, 17, 22], [134, 56, 8, 13, 35]]) {
    const [X, Y] = S(x, y);
    s += aura(X, Y, h * 1.5, rage ? '#ff8a40' : '#c070ff', 0.45) + gem(X, Y - h * 0.4, w, h, rage ? '#ff9a50' : '#b97cff', r);
  }
  // manchas bioluminescentes
  for (const [x, y, r] of [[40, 80, 4], [140, 82, 3.6], [60, 62, 3], [118, 64, 3.2], [30, 98, 2.6], [148, 100, 2.6]]) s += aura(...S(x, y), r * 3, '#7affd8', 0.5) + flat(circle(...S(x, y), r), '#aaffe8', { op: 0.85 });
  // boca
  const mo = mouth * 22;
  if (mouth > 0.05) {
    s += P(path(`M${f(S(50, 82)[0])} ${f(S(50, 82)[1])} Q${f(S(88, 92 + mo)[0])} ${f(S(88, 92 + mo)[1] + mo)} ${f(S(126, 82)[0])} ${f(S(126, 82)[1])} Q${f(S(88, 88)[0])} ${f(S(88, 88)[1])} ${f(S(50, 82)[0])} ${f(S(50, 82)[1])} Z`), '#5a1a2a', { k: 2 });
    s += P(ellipse(...S(88, 88 + mo * 0.6), 14, 5 + mo * 0.2), '#e05a6a', { k: 1.5 });
    if (st === 'spit' && i === 1) s += aura(...S(88, 86 + mo * 0.5), 26, '#ff8a2a', 0.8) + P(circle(...S(88, 86 + mo * 0.5), 9), '#ff7a2a', { glow: true });
  } else {
    s += line(`M${f(S(48, 80)[0])} ${f(S(48, 80)[1])} Q${f(S(88, 92)[0])} ${f(S(88, 92)[1])} ${f(S(128, 80)[0])} ${f(S(128, 80)[1])}`, OUT, 2.4);
  }
  // papo
  if (throat > 0.6 && mouth < 0.3) s += P(ellipse(...S(88, 96), 16 * throat, 9 * throat), '#f0d8a0', { k: 1.5 });
  // olhos
  for (const sx of [56, 120]) {
    const [X, Y] = S(sx, 46);
    s += P(circle(X, Y, 15), skin, { k: 2 });
    s += aura(X, Y, 18, rage ? '#ff5a2a' : '#ffe060', 0.55);
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="10" fill="${rage ? '#ffb070' : '#fff1a0'}" stroke="${OUT}" stroke-width="1.6"/><rect x="${f(X - 2.2)}" y="${f(Y - 8)}" width="4.4" height="16" rx="2" fill="${OUT}"/><circle cx="${f(X - 4)}" cy="${f(Y - 4)}" r="2.6" fill="#fff"/>`;
    if (rage) s += line(`M${f(X - 12)} ${f(Y - 14)} L${f(X + 10)} ${f(Y - 8)}`, OUT, 3);
  }
  s += spec(70, gy - 82 * (1 - sq), 12, 4, 0.35);
  // patas dianteiras
  s += P(ellipse(...S(56, 122), 13, 6), shift(skin, -0.1), { k: 1.5 }) + P(ellipse(...S(120, 122), 13, 6), shift(skin, -0.1), { k: 1.5 });
  if (st === 'land') for (let j = 0; j < 6; j++) s += aura(cx - 70 + j * 28, gy + 4, 14, '#d8d0c0', 0.5);
  return s;
}

// ---------------------------------------------------------------- Coração do Véu (180×180, centro ≈ 99)
const HEART = [
  { body: '#7a4ad8', vein: '#5af0ff', core: '#c8f8ff', glow: '#8a60ff' },
  { body: '#a43ac8', vein: '#ff7af0', core: '#ffe0ff', glow: '#d050ff' },
  { body: '#c02a4a', vein: '#ffb04a', core: '#fff0c0', glow: '#ff4a3a' },
];
function heart(ph, st, i, n) {
  const C = HEART[ph];
  const t = i / n, p = t * TAU;
  const flare = st === 'flare' ? [0.5, 1, 0.6][i] ?? 0.5 : 0;
  const beat = st === 'flare' ? 0.06 + flare * 0.06 : Math.max(0, Math.sin(p)) ** 3 * 0.06;
  const cx = 90, cy = 96;
  const k = 1 + beat;
  const H = (x, y) => [cx + (x - cx) * k, cy + (y - cy) * k];
  let s = aura(cx, cy, 88, C.glow, 0.35 + flare * 0.3);
  // tentáculos/raízes
  const r = rng(ph * 7 + 3);
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * TAU + 0.3;
    const wob = Math.sin(p + j) * 4;
    const x1 = cx + Math.cos(a) * 34, y1 = cy + Math.sin(a) * 30;
    const x2 = cx + Math.cos(a + 0.2) * (70 + r() * 10) + wob, y2 = cy + Math.sin(a + 0.2) * (62 + r() * 10);
    const x3 = cx + Math.cos(a - 0.1) * (86 + r() * 4), y3 = cy + Math.sin(a - 0.1) * (78 + r() * 4) + wob;
    const d = `M${f(x1)} ${f(y1)} Q${f(x2)} ${f(y2)} ${f(x3)} ${f(y3)}`;
    s += line(d, OUT, 9) + line(d, shift(C.body, -0.15), 6.5) + line(d, C.vein, 1.6, 0.8);
    s += aura(x3, y3, 7, C.vein, 0.6);
  }
  // casca cristalina (forma de coração)
  const shellD = `M${H(90, 150).map(f).join(' ')} C${H(40, 120).map(f).join(' ')} ${H(28, 78).map(f).join(' ')} ${H(44, 56).map(f).join(' ')} C${H(58, 38).map(f).join(' ')} ${H(82, 42).map(f).join(' ')} ${H(90, 58).map(f).join(' ')} C${H(98, 42).map(f).join(' ')} ${H(122, 38).map(f).join(' ')} ${H(136, 56).map(f).join(' ')} C${H(152, 78).map(f).join(' ')} ${H(140, 120).map(f).join(' ')} ${H(90, 150).map(f).join(' ')} Z`;
  s += P(path(shellD), C.body, { lt: 0.16, dk: 0.16, k: 5 });
  // facetas
  const fac = [[[60, 60], [80, 64], [70, 92]], [[100, 64], [122, 60], [112, 92]], [[70, 92], [90, 82], [110, 92], [90, 130]]];
  for (const pts of fac) s += flat(poly(pts.map(([x, y]) => H(x, y))), '#ffffff', { op: 0.1 });
  // rachaduras por fase
  const cracks = ph === 0 ? 1 : ph === 1 ? 3 : 6;
  for (let j = 0; j < cracks; j++) {
    const a0 = -0.6 + j * 1.05;
    const d = `M${f(cx)} ${f(cy)} L${f(cx + Math.cos(a0) * 22)} ${f(cy + Math.sin(a0) * 20 + 4)} L${f(cx + Math.cos(a0 + 0.3) * 38)} ${f(cy + Math.sin(a0 + 0.3) * 34)}`;
    s += line(d, OUT, 3.4) + line(d, C.vein, 1.8);
  }
  // veias
  s += line(`M${H(60, 70).join(' ')} Q${H(75, 100).join(' ')} ${H(90, 128).join(' ')}`, C.vein, 1.8, 0.7) + line(`M${H(120, 70).join(' ')} Q${H(105, 100).join(' ')} ${H(90, 128).join(' ')}`, C.vein, 1.8, 0.7);
  // núcleo
  const cr = 15 + beat * 60 + flare * 8;
  s += aura(cx, cy, cr * 2.4, C.core, 0.8);
  s += P(circle(cx, cy, cr * 0.75), C.core, { glow: true, k: 2, sw: 1.8 });
  s += flat(circle(cx, cy, cr * 0.35), '#ffffff', { op: 0.9 });
  // olho do véu
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${f(cr * 0.18)}" ry="${f(cr * 0.5)}" fill="${OUT}" opacity="0.85"/>`;
  s += spec(66, 58, 10, 4, 0.45);
  if (flare) for (let j = 0; j < 12; j++) {
    const a = (j / 12) * TAU;
    s += line(`M${f(cx + Math.cos(a) * 60)} ${f(cy + Math.sin(a) * 56)} L${f(cx + Math.cos(a) * (70 + flare * 16))} ${f(cy + Math.sin(a) * (66 + flare * 14))}`, C.core, 3, 0.8 * flare);
  }
  return s;
}

function bossDeath(fn, w, h, cx, cy, tint, i) {
  const k = i / 5;
  const r = rng(i * 13 + w);
  let s = '';
  if (i < 3) s += `<g opacity="${f(1 - k)}" transform="translate(${cx} ${cy}) scale(${f(1 + k * 0.15)}) translate(${-cx} ${-cy})">${fn()}</g>`;
  s += aura(cx, cy, 40 + k * 70, tint, 0.9 * (1 - k * 0.8));
  for (let j = 0; j < 18; j++) {
    const a = (j / 18) * TAU + r();
    const d = 10 + k * 80 * (0.6 + r() * 0.5);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8 + k * k * 20;
    const sz = (4 + r() * 6) * (1 - k * 0.4);
    s += `<g opacity="${f(1 - k * 0.8)}">${part(poly([[x, y - sz], [x + sz * 0.7, y], [x, y + sz], [x - sz * 0.7, y]]), j % 2 ? tint : shift(tint, -0.2), { sw: 1.2, k: 1 })}</g>`;
  }
  return s;
}

export function bossSprites() {
  const sprites = [];
  const animations = {};
  const add = (key, n, w, h, fn, flash = true) => {
    animations[key] = [];
    if (flash) animations[key + '_f'] = [];
    for (let i = 0; i < n; i++) {
      const svg = fn(i, n);
      sprites.push({ name: `${key}_${i}`, w, h, svg });
      animations[key].push(`${key}_${i}`);
      if (flash) {
        sprites.push({ name: `${key}_${i}_f`, w, h, svg: whiteFlash(svg) });
        animations[key + '_f'].push(`${key}_${i}_f`);
      }
    }
  };
  for (const [st, n] of [['idle', 4], ['rage', 4], ['crouch', 2], ['air', 2], ['land', 2], ['spit', 3]]) add(`toad_${st}`, n, 176, 150, (i, nn) => toad(st, i, nn));
  add('toad_death', 6, 176, 150, (i) => bossDeath(() => toad('idle', 0, 4), 176, 150, 88, 90, '#5af0c8', i), false);
  for (let ph = 0; ph < 3; ph++) {
    add(`heart_p${ph}`, 6, 180, 180, (i, nn) => heart(ph, 'beat', i, nn));
    add(`heart_flare${ph}`, 3, 180, 180, (i, nn) => heart(ph, 'flare', i, nn));
  }
  add('heart_death', 6, 180, 180, (i) => bossDeath(() => heart(2, 'beat', 0, 6), 180, 180, 90, 96, '#ff8a6a', i), false);
  return { sprites, animations };
}
