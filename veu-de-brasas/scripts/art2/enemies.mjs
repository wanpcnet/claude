// Bestiário em estilo cartoon moderno: vista 3/4 voltada para a direita (o jogo espelha).
// Cada criatura: animação de movimento, ataques, quadros de flash (_f) e morte em estilhaços.
import { part, flat, line, spec, aura, gem, capsule, circle, ellipse, rrect, path, smooth, poly, tr, g, shift, mix, whiteFlash, f, TAU, OUT, rng } from './lib.mjs';

const P = (shape, c, o = {}) => part(shape, c, { sw: 1.15, ...o });
const eye = (x, y, r, glow, look = 0.5) =>
  aura(x, y, r * 2.8, glow, 0.6) + `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 1.2)}" fill="${mix(glow, '#ffffff', 0.35)}" stroke="${OUT}" stroke-width="0.7"/><circle cx="${f(x + look)}" cy="${f(y + 0.2)}" r="${f(r * 0.5)}" fill="${OUT}"/><circle cx="${f(x - r * 0.25)}" cy="${f(y - r * 0.4)}" r="${f(r * 0.3)}" fill="#fff"/>`;

// ---------------------------------------------------------------- Ferrugíneo (besouro enferrujado)
function rust(t, st) {
  const p = t * TAU;
  const bob = Math.abs(Math.sin(p * 2)) * 0.8;
  let s = '';
  for (let i = 0; i < 3; i++) {
    const ph = p * 2 + i * 2.1;
    const x = 7 + i * 4.5, sw = Math.sin(ph) * 1.8;
    s += line(`M${f(x)} 13 L${f(x - 1.5 + sw)} 16.8`, OUT, 2.2) + line(`M${f(x)} 13 L${f(x - 1.5 + sw)} 16.8`, '#6a3a2a', 1.1);
  }
  const body = smooth([[4, 12.5 - bob], [6, 6 - bob], [12, 4 - bob], [17, 6.5 - bob], [18.5, 11.5 - bob], [15, 14.5 - bob], [8, 14.8 - bob]]);
  s += P(body, '#c2562e', { lt: 0.12, k: 1.2 });
  s += line(`M7 ${f(6.2 - bob)} Q11 ${f(9 - bob)} 10.5 ${f(14.5 - bob)}`, '#6a2416', 0.9, 0.8);
  s += flat(circle(8, 9 - bob, 1.1), '#e88a3a', { op: 0.7 }) + flat(circle(13.2, 7.4 - bob, 0.9), '#e88a3a', { op: 0.7 }) + flat(circle(6, 12 - bob, 0.7), '#4a1a10', { op: 0.6 });
  s += spec(9, 6.3 - bob, 2.4, 1, 0.55);
  s += P(ellipse(19, 11.5 - bob, 3.6, 3), '#5a2a22', { k: 0.6 });
  s += eye(20.2, 10.8 - bob, 1.2, '#ffb030', 0.4);
  s += line(`M20 ${f(8.5 - bob)} Q22 ${f(5.5 - bob)} 23.5 ${f(6 - bob)}`, OUT, 0.8);
  return s;
}

// ---------------------------------------------------------------- Mordalume (aranha de cristal)
function spider(t, st) {
  const p = t * TAU;
  const lunge = st === 'lunge' ? [0.3, 1, 0.6][Math.round(t * 3)] ?? 0.5 : 0;
  let s = '';
  for (let i = 0; i < 4; i++) {
    const ph = p * 2 + i * 1.6;
    const bx = 11 + i * 3;
    for (const sg of [-1, 1]) {
      const kx = bx + Math.sin(ph * sg) * 2 + (i - 1.5) * 1.6 + lunge * (i >= 2 ? 3 : 0);
      const ky = sg < 0 ? 9 - lunge * 4 : 10.5;
      const fx = bx + (i - 1.5) * 4 + Math.sin(ph * sg) * 2.4 + lunge * (i >= 2 ? 5 : -1);
      const d = `M${f(bx)} 12 Q${f(kx)} ${f(ky - 3)} ${f(fx)} ${f(sg < 0 ? 14.5 - (i >= 2 ? lunge * 6 : 0) : 15.5)}`;
      s += line(d, OUT, sg < 0 ? 2 : 2.4) + line(d, sg < 0 ? '#2e5a72' : '#4a86a2', sg < 0 ? 0.9 : 1.2);
    }
  }
  const dy = -lunge * 2;
  s += P(ellipse(8.5, 11 + dy * 0.3, 7, 5.2, -8), '#3f7896', { lt: 0.14 });
  s += gem(7, 7 + dy * 0.3, 2.4, 3.2, '#4ef0e0', -20) + gem(10.5, 6.6 + dy * 0.3, 1.8, 2.6, '#4ef0e0', 15);
  s += P(ellipse(18, 11.5 + dy, 5, 4, 10), '#4a88a8', { lt: 0.14 });
  s += line(`M21 ${f(13 + dy)} L23.5 ${f(15 + dy)}`, OUT, 1.8) + line(`M21 ${f(13 + dy)} L23.5 ${f(15 + dy)}`, '#b0fff4', 0.8);
  s += eye(19.5, 10.6 + dy, 1, '#4ef0e0', 0.3) + eye(21.6, 11.4 + dy, 0.8, '#4ef0e0', 0.3);
  return s;
}

// ---------------------------------------------------------------- Filho do Lodo (gosma)
function slime(t, st) {
  const p = t * TAU;
  let sq = Math.sin(p * 1) * 0.08, up = 0;
  if (st === 'attack') {
    const k = [0.2, -0.25, 0.35, 0.05][Math.round(t * 4)] ?? 0;
    sq = k;
    up = k < 0 ? 5 : 0;
  }
  const w = 13 * (1 + sq), h = 11 * (1 - sq);
  const gy = 27.9 - up;
  const id = 'sl';
  let s = aura(17, gy - h * 0.8, 16, '#7af06a', 0.18);
  const bodyD = `M${f(17 - w)} ${f(gy)} C${f(17 - w - 1)} ${f(gy - h * 1.2)} ${f(17 - w * 0.4)} ${f(gy - h * 2)} ${f(17 + w * 0.15)} ${f(gy - h * 2.05)} C${f(17 + w * 0.9)} ${f(gy - h * 1.9)} ${f(17 + w + 1)} ${f(gy - h * 1)} ${f(17 + w)} ${f(gy)} Q17 ${f(gy + 2)} ${f(17 - w)} ${f(gy)} Z`;
  s += P(path(bodyD), '#58c24a', { lt: 0.16, dk: 0.12, ho: 0.8 });
  s += flat(ellipse(13, gy - h * 0.7, 2.2, 1.6), '#2a6a24', { op: 0.5 }) + flat(circle(21, gy - h * 0.5, 1.4), '#2a6a24', { op: 0.5 }) + flat(circle(10, gy - h * 1.2, 1), '#b8ff9a', { op: 0.6 });
  s += spec(12, gy - h * 1.6, 3.2, 1.6, 0.75) + spec(9, gy - h * 1.1, 0.9, 0.9, 0.7);
  s += `<ellipse cx="${f(19)}" cy="${f(gy - h * 1.15)}" rx="2" ry="2.6" fill="${OUT}"/><ellipse cx="${f(24)}" cy="${f(gy - h * 1.05)}" rx="1.7" ry="2.3" fill="${OUT}"/><circle cx="18.4" cy="${f(gy - h * 1.15 - 0.9)}" r="0.8" fill="#fff"/><circle cx="23.5" cy="${f(gy - h * 1.05 - 0.8)}" r="0.65" fill="#fff"/>`;
  s += line(`M19.5 ${f(gy - h * 0.6)} Q21.5 ${f(gy - h * 0.4)} 23.5 ${f(gy - h * 0.6)}`, OUT, 0.9);
  return s;
}

// ---------------------------------------------------------------- Vespa de Vidro
function wasp(t, st) {
  const p = t * TAU;
  const dive = st === 'dive';
  const flap = Math.sin(p * 3);
  const rot = dive ? 28 : Math.sin(p) * 4;
  let s = '';
  const wing = (dx, a, op) => `<g transform="rotate(${f(a)} 15 11)"><ellipse cx="${f(15 + dx)}" cy="4.5" rx="4.2" ry="7" fill="#d8faff" opacity="${op}" stroke="${OUT}" stroke-width="0.8"/><path d="M${f(15 + dx)} 10 L${f(15 + dx)} 0" stroke="#7ad8f0" stroke-width="0.5" opacity="0.8"/></g>`;
  s += wing(-3, -20 + flap * 25, 0.45);
  let b = P(smooth([[3, 12], [6, 9], [12, 9.5], [13.5, 13], [11, 16], [5, 15.5]]), '#f0a830', { lt: 0.15 });
  b += line('M6 9.6 L5.5 15.6 M9 9.4 L8.6 15.9', OUT, 1.1, 0.85);
  b += P(poly([[2, 12.6], [-0.5, 13.8], [2.5, 14.2]]), '#2a2030', { sw: 0.8, k: 0.4 });
  b += P(ellipse(17, 12, 4.6, 3.6), '#5ad8f0', { lt: 0.2, ho: 0.8 }) + spec(15.8, 10.5, 1.6, 0.8, 0.8);
  b += P(circle(23, 11.5, 3.6), '#3a3048', { k: 0.8 }) + eye(24.4, 11, 1.4, '#ff5a3a', 0.3);
  b += line('M23.5 8 Q25 4.5 27 4.6', OUT, 0.8) + line('M22 8.3 Q22.5 4.5 24 4', OUT, 0.8);
  for (let i = 0; i < 2; i++) b += line(`M${f(15 + i * 3)} 15 L${f(14 + i * 3 + Math.sin(p * 2 + i) * 0.8)} 19`, OUT, 1);
  s += `<g transform="rotate(${f(rot)} 15 13)">${b}</g>`;
  s += wing(1.5, 10 + flap * 30, 0.6);
  return s;
}

// ---------------------------------------------------------------- Carapaça Rubra
function shell(t, st) {
  const p = t * TAU;
  const wind = st === 'windup', charge = st === 'charge';
  const low = charge ? 2.5 : wind ? -1.5 + Math.sin(p * 4) * 0.8 : 0;
  const bob = Math.abs(Math.sin(p * 2)) * 0.8;
  let s = '';
  for (let i = 0; i < 3; i++) {
    const ph = p * 2 + i * 2;
    const x = 12 + i * 8, sw = charge ? Math.sin(ph * 2) * 3 : Math.sin(ph) * 2;
    s += P(capsule(x, 24, x + sw, 29.5, 2.4, 2), '#7a2a22', { k: 0.6 });
  }
  const y0 = low - bob;
  s += P(ellipse(34, 21 + y0 * 0.4, 6, 5), '#8a3a2c', { k: 0.8 });
  s += eye(36, 19.5 + y0 * 0.4, 1.4, '#ffd040', 0.4) + eye(38.6, 21 + y0 * 0.4, 1.1, '#ffd040', 0.3);
  s += P(path(`M${f(38)} ${f(23.5 + y0 * 0.4)} L${f(41.5)} ${f(25 + y0 * 0.4)} L${f(38.5)} ${f(25.8 + y0 * 0.4)} Z`), '#f0e0c0', { sw: 0.8, k: 0.4 });
  const shellD = smooth([[4, 25 + y0], [6, 13 + y0], [14, 6 + y0], [24, 5 + y0], [32, 9 + y0], [35, 18 + y0], [33, 25 + y0], [18, 27 + y0]]);
  s += P(shellD, '#d23a2a', { lt: 0.14, k: 1.8 });
  for (const [x, y, r] of [[12, 13, 3], [20, 10, 3.4], [27, 13.5, 2.8], [17, 19, 2.6], [25, 20, 2.2]]) s += P(circle(x, y + y0, r), '#ff6a44', { k: 0.6, sw: 0.9 });
  for (const [x, y] of [[9, 9], [17, 5], [26, 6], [32, 12]]) s += P(poly([[x - 2, y + 2 + y0], [x + 0.5, y - 3 + y0], [x + 2, y + 2.5 + y0]]), '#f0d8b8', { sw: 0.9, k: 0.5 });
  s += spec(13, 9 + y0, 3, 1.2, 0.5);
  if (wind) s += aura(36, 16, 6, '#ffffff', 0.35);
  if (charge) for (let i = 0; i < 3; i++) s += line(`M${f(2 - i * 0.5)} ${f(12 + i * 5)} L${f(-4)} ${f(12 + i * 5)}`, '#fff', 1, 0.6);
  return s;
}

// ---------------------------------------------------------------- Sapo da Fenda
function frog(t, st) {
  const p = t * TAU;
  let sq = 0, up = 0, legs = 0;
  if (st === 'idle') sq = Math.sin(p) * 0.04;
  if (st === 'crouch') sq = 0.18;
  if (st === 'jump') { sq = -0.22; up = 6; legs = 1; }
  if (st === 'land') sq = 0.26;
  const gy = 27.2 - up;
  const cx = 19;
  const S = (x, y) => [cx + (x - cx) * (1 + sq * 0.7), gy + (y - gy) * (1 - sq)];
  let s = '';
  // pernas traseiras
  if (legs) s += P(capsule(...S(10, 22), 4, gy + 6, 2.4, 1.6), '#2aa890', { k: 0.6 });
  else s += P(ellipse(...S(11, 24.5), 5.5 * (1 + sq), 3.6), '#2aa890', { k: 0.8 }) + P(ellipse(...S(9, 27), 4, 1.6), '#1e8070', { k: 0.4 });
  const body = smooth([S(7, 25), S(8, 17), S(16, 11.5), S(25, 12), S(31, 17), S(31, 24), S(19, 27.5)]);
  s += P(body, '#36c4a6', { lt: 0.14, k: 1.4 });
  s += P(smooth([S(14, 25), S(17, 20.5), S(25, 20), S(30, 23.5), S(24, 27)]), '#e8f0c0', { k: 0.6, sw: 0.9 });
  for (const [x, y, r] of [[13, 16, 1.6], [18, 14, 1.2], [11, 20, 1]]) s += aura(...S(x, y), r * 3, '#c080ff', 0.6) + flat(circle(...S(x, y), r), '#d0a0ff');
  s += P(ellipse(...S(22, 12), 3.4, 3.4), '#36c4a6', { k: 0.6 }) + P(ellipse(...S(28, 13), 3.2, 3.2), '#36c4a6', { k: 0.6 });
  s += `<circle cx="${f(S(22.4, 11.6)[0])}" cy="${f(S(22.4, 11.6)[1])}" r="2" fill="#fff6b0" stroke="${OUT}" stroke-width="0.6"/><rect x="${f(S(22.4, 11.6)[0] - 0.4)}" y="${f(S(22.4, 11.6)[1] - 1.6)}" width="0.8" height="3.2" fill="${OUT}"/>`;
  s += `<circle cx="${f(S(28.3, 12.6)[0])}" cy="${f(S(28.3, 12.6)[1])}" r="1.8" fill="#fff6b0" stroke="${OUT}" stroke-width="0.6"/><rect x="${f(S(28.3, 12.6)[0] - 0.4)}" y="${f(S(28.3, 12.6)[1] - 1.4)}" width="0.8" height="2.8" fill="${OUT}"/>`;
  s += line(`M${f(S(24, 19)[0])} ${f(S(24, 19)[1])} Q${f(S(28, 20.5)[0])} ${f(S(28, 20.5)[1])} ${f(S(31, 18.5)[0])} ${f(S(31, 18.5)[1])}`, OUT, 0.9);
  if (!legs) s += P(ellipse(...S(27, 26.5), 3, 1.6), '#2aa890', { k: 0.4 });
  else s += P(capsule(...S(26, 24), 30, gy + 5, 1.8, 1.4), '#2aa890', { k: 0.5 });
  return s;
}

// ---------------------------------------------------------------- Sussurrante (fantasma)
function ghost(t, st) {
  const p = t * TAU;
  const bob = Math.sin(p) * 1.4;
  const cast = st === 'cast' ? [0.4, 1, 0.6][Math.round(t * 3)] ?? 0.5 : 0;
  const y = -bob;
  let s = aura(14, 14 + y, 14, '#9aa0ff', 0.25 + cast * 0.3);
  const tail = Math.sin(p * 2) * 2;
  const body = `M7 ${f(14 + y)} C7 ${f(4 + y)} 21 ${f(4 + y)} 21 ${f(14 + y)} L21 ${f(22 + y)} C19 ${f(25 + y + tail)} 17 ${f(29 + y)} ${f(13 + tail)} ${f(31 + y)} C14 ${f(27 + y)} 11 ${f(25 + y)} 8 ${f(26 + y - tail)} C9 ${f(23 + y)} 7 ${f(20 + y)} 7 ${f(14 + y)} Z`;
  s += P(path(body), '#b4b8ff', { lt: 0.12, dk: 0.2, ho: 0.8 });
  s += P(path(`M6 ${f(15 + y)} C5 ${f(2 + y)} 23 ${f(2 + y)} 22 ${f(15 + y)} C20 ${f(9 + y)} 8 ${f(9 + y)} 6 ${f(15 + y)} Z`), '#6a64c8', { k: 0.8 });
  s += flat(ellipse(15, 15 + y, 5.2, 4.4), '#1c1640');
  s += aura(13.5, 15 + y, 3, '#c8f0ff', 0.9) + aura(17.5, 15 + y, 3, '#c8f0ff', 0.9);
  s += flat(ellipse(13.5, 15 + y, 1.1, 1.5), '#e8fbff') + flat(ellipse(17.5, 15 + y, 1.1, 1.5), '#e8fbff');
  const ax = 20 + cast * 3, ay = 18 + y - cast * 4;
  s += P(capsule(19, 17 + y, ax, ay, 1.6, 1.4), '#9a9ef0', { k: 0.5 });
  if (cast) s += aura(ax + 2, ay - 1, 5 + cast * 3, '#b090ff', 0.8) + P(circle(ax + 2, ay - 1, 1.8 + cast), '#c8a8ff', { k: 0.5, glow: true });
  return s;
}

// ---------------------------------------------------------------- Guardião de Coral (elite)
function guardian(t, st) {
  const p = t * TAU;
  const broken = st === 'broken';
  const wind = st === 'windup' ? [0.3, 0.8, 1][Math.round(t * 3)] ?? 1 : 0;
  const bob = Math.abs(Math.sin(p * 2)) * 1.4;
  const gy = 45.9;
  let s = '';
  const step = Math.sin(p * 2) * 3;
  // pernas
  s += P(capsule(24, 34 - bob, 22 - step, gy - 2, 4.4, 4), '#4a6a7a', { k: 1 }) + P(ellipse(22 - step, gy - 1, 5.5, 3), '#3a5262', { k: 0.6 });
  s += P(capsule(36, 34 - bob, 38 + step, gy - 2, 4.4, 4), '#557a8c', { k: 1 }) + P(ellipse(38 + step, gy - 1, 5.5, 3), '#3a5262', { k: 0.6 });
  // tronco de pedra
  const y = -bob;
  s += P(smooth([[16, 34 + y], [15, 20 + y], [22, 12 + y], [36, 11 + y], [45, 18 + y], [44, 33 + y], [30, 38 + y]]), '#5a7e90', { lt: 0.12, k: 1.8 });
  s += line(`M22 ${f(20 + y)} L27 ${f(25 + y)} L25 ${f(31 + y)}`, '#2e4250', 1, 0.7);
  // núcleo
  s += aura(31, 24 + y, 9, '#5af0ff', 0.6) + gem(31, 24 + y, 4, 4.6, '#6af6ff');
  // braços
  const armA = -wind * 70;
  for (const [sx, dark] of [[17, true], [44, false]]) {
    const a = ((dark ? armA * 0.6 : armA) * Math.PI) / 180;
    const ex = sx + Math.sin(-a) * 4 + (dark ? -3 : 3), ey = 20 + y + Math.cos(a) * 14;
    s += P(capsule(sx, 18 + y, ex, ey, 4, 3.6), dark ? '#46667a' : '#5e8698', { k: 1 });
    s += P(circle(ex, ey + 1, 5.2), dark ? '#4e7082' : '#6a94a8', { k: 1, lt: 0.14 });
    if (!broken) s += P(smooth([[ex - 4, ey - 2], [ex - 2, ey - 7], [ex + 1, ey - 4], [ex + 3, ey - 8], [ex + 4.5, ey - 1]]), '#ff6a5a', { k: 0.8, sw: 0.9 });
  }
  // cabeça
  s += P(rrect(26, 4 + y, 13, 10, 4), '#6a90a2', { lt: 0.14 });
  s += eye(35, 9 + y, 1.4, '#5af0ff', 0.4) + eye(30.5, 9 + y, 1.2, '#5af0ff', 0.4);
  // armadura de coral (quebra)
  if (!broken) {
    s += P(smooth([[17, 22 + y], [19, 13 + y], [27, 8 + y], [26, 16 + y], [22, 24 + y]]), '#ff5a4a', { k: 1, lt: 0.16 });
    s += P(smooth([[38, 10 + y], [46, 13 + y], [47, 22 + y], [42, 20 + y], [38, 15 + y]]), '#ff6a54', { k: 1, lt: 0.16 });
    for (const [x, yy] of [[20, 14], [24, 10], [43, 12], [46, 18]]) s += P(smooth([[x - 1.5, yy + 2 + y], [x - 2, yy - 2 + y], [x, yy - 4 + y], [x + 2, yy - 2 + y], [x + 1.5, yy + 2 + y]]), '#ff8a6a', { k: 0.5, sw: 0.8 });
    s += P(smooth([[25, 5 + y], [27, -0.5 + y], [30, 3 + y], [33, -1 + y], [36, 3 + y], [39, 0 + y], [39, 6 + y], [26, 6 + y]]), '#ff5a4a', { k: 0.8, sw: 0.9 });
  } else {
    for (const [x, yy] of [[20, 16], [44, 15], [30, 4]]) s += flat(circle(x, yy + y, 1.8), '#ff8a6a', { op: 0.7 });
  }
  if (wind) s += aura(30, 30, 18 * wind, '#ffffff', 0.18);
  return s;
}

// ---------------------------------------------------------------- Sacerdotisa de Vidro (elite)
function priestess(t, st) {
  const p = t * TAU;
  const bob = Math.sin(p) * 1.6;
  const cast = st === 'cast' ? [0.3, 0.8, 1, 0.5][Math.round(t * 4)] ?? 0.5 : 0;
  const y = -bob - 3;
  let s = aura(24, 30 + y, 26, '#7ae8ff', 0.22 + cast * 0.2);
  // halo
  s += `<ellipse cx="24" cy="${f(9 + y)}" rx="11" ry="3.2" fill="none" stroke="#bff8ff" stroke-width="1.4" opacity="0.85"/>`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + p;
    s += gem(24 + Math.cos(a) * 11, 9 + y + Math.sin(a) * 3.2, 1.3, 1.8, '#8af4ff');
  }
  // vestido de vidro
  const hem = Math.sin(p * 2) * 1.5;
  s += P(path(`M17 ${f(24 + y)} C14 ${f(36 + y)} 10 ${f(46 + y)} 8 ${f(54 + y + hem)} L14 ${f(51 + y)} L19 ${f(55 + y - hem)} L24 ${f(51 + y)} L29 ${f(55 + y + hem)} L34 ${f(51 + y)} L40 ${f(54 + y - hem)} C38 ${f(46 + y)} 34 ${f(36 + y)} 31 ${f(24 + y)} Z`), '#6ad8f0', { lt: 0.2, dk: 0.2, ho: 0.8 });
  s += line(`M20 ${f(30 + y)} L15 ${f(51 + y)} M24 ${f(29 + y)} L24 ${f(51 + y)} M28 ${f(30 + y)} L33 ${f(51 + y)}`, '#d8fcff', 0.8, 0.6);
  // tronco
  s += P(path(`M17.5 ${f(24 + y)} Q17 ${f(17 + y)} 24 ${f(16.5 + y)} Q31 ${f(17 + y)} 30.5 ${f(24 + y)} Q24 ${f(27 + y)} 17.5 ${f(24 + y)} Z`), '#8aeaff', { lt: 0.2 });
  s += gem(24, 21 + y, 2.4, 3, '#ffffff');
  // braços / cajado
  const ra = cast * 50;
  s += P(capsule(30, 18.5 + y, 35 + cast * 3, 26 + y - cast * 8, 1.8, 1.5), '#9af0ff', { k: 0.6 });
  s += P(capsule(18, 18.5 + y, 14, 27 + y, 1.8, 1.5), '#7ad8f0', { k: 0.6 });
  s += P(capsule(37 + cast * 3, 6 + y - cast * 6, 36 + cast * 3, 40 + y - cast * 4, 1, 1), '#d8f8ff', { k: 0.4, sw: 0.9 });
  s += aura(37 + cast * 3, 5 + y - cast * 6, 6 + cast * 6, '#7af0ff', 0.8) + gem(37 + cast * 3, 5 + y - cast * 6, 3, 4, '#aaf8ff');
  void ra;
  // cabeça com véu
  s += P(path(`M17 ${f(20 + y)} C14 ${f(6 + y)} 34 ${f(6 + y)} 31 ${f(20 + y)} C29 ${f(14 + y)} 19 ${f(14 + y)} 17 ${f(20 + y)} Z`), '#bff4ff', { lt: 0.15, ho: 0.8 });
  s += P(ellipse(24, 14 + y, 4.8, 5.2), '#e8fbff', { k: 0.6 });
  s += aura(22.5, 14 + y, 2.2, '#40d8ff', 0.9) + aura(26, 14 + y, 2.2, '#40d8ff', 0.9);
  s += flat(ellipse(22.5, 14 + y, 0.8, 1.1), '#0a4a6a') + flat(ellipse(26, 14 + y, 0.8, 1.1), '#0a4a6a');
  return s;
}

// ---------------------------------------------------------------- morte: estilhaços
function death(drawFn, w, h, ay, tint, i, n = 5) {
  const k = i / (n - 1);
  const r = rng(i * 17 + w * 31);
  const cx = w / 2, cy = h * ay - h * 0.35;
  let s = '';
  if (i < 2) s += `<g opacity="${f(1 - k * 0.6)}" transform="translate(${f(cx)} ${f(h * ay)}) scale(${f(1 + k * 0.25)} ${f(1 - k * 0.35)}) translate(${f(-cx)} ${f(-h * ay)})">${whiteFlash(drawFn(0, 'move')).replace('#ffffff', mix(tint, '#ffffff', 0.5))}</g>`;
  s += aura(cx, cy, Math.min(w, h) * (0.3 + k * 0.4), tint, 0.7 * (1 - k));
  const N = 9;
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU + r() * 0.6;
    const d = (3 + k * Math.min(w, h) * 0.45) * (0.7 + r() * 0.6);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8 + k * k * 6;
    const sz = (1.4 + r() * 1.6) * (1 - k * 0.5) * Math.max(1, w / 30);
    s += `<g opacity="${f(1 - k * 0.85)}">${part(poly([[x, y - sz], [x + sz * 0.8, y], [x, y + sz * 0.9], [x - sz * 0.7, y]]), j % 2 ? tint : shift(tint, -0.15), { sw: 0.7, k: 0.4 })}</g>`;
  }
  return s;
}

// ---------------------------------------------------------------- catálogo
export const ENEMY_ART = {
  rust: { w: 24, h: 24, ay: 0.6, fn: rust, tint: '#ff7a4a', anims: { walk: ['move', 8] } },
  spider: { w: 30, h: 22, ay: 0.62, fn: spider, tint: '#4ef0e0', anims: { walk: ['move', 8], lunge: ['lunge', 3] } },
  slime: { w: 34, h: 34, ay: 0.82, fn: slime, tint: '#8af07a', anims: { walk: ['move', 8], attack: ['attack', 4] } },
  wasp: { w: 34, h: 30, ay: 0.6, fn: wasp, tint: '#9ff4ff', anims: { fly: ['move', 6], dive: ['dive', 2] } },
  shell: { w: 42, h: 36, ay: 0.82, fn: shell, tint: '#ff6a4a', anims: { walk: ['move', 8], windup: ['windup', 2], charge: ['charge', 2] } },
  frog: { w: 38, h: 34, ay: 0.8, fn: frog, tint: '#5af0c8', anims: { idle: ['idle', 2], crouch: ['crouch', 1], jump: ['jump', 1], land: ['land', 1] } },
  ghost: { w: 28, h: 34, ay: 0.75, fn: ghost, tint: '#b0b8ff', anims: { float: ['move', 6], cast: ['cast', 3] } },
  guardian: { w: 60, h: 54, ay: 0.85, fn: guardian, tint: '#80ffff', anims: { walk: ['move', 8], windup: ['windup', 3], broken: ['broken', 6] } },
  priestess: { w: 48, h: 62, ay: 0.9, fn: priestess, tint: '#80ffff', anims: { float: ['float', 4], cast: ['cast', 4] } },
};

export function enemySprites() {
  const sprites = [];
  const animations = {};
  for (const [id, E] of Object.entries(ENEMY_ART)) {
    for (const [anim, [st, n]] of Object.entries(E.anims)) {
      const key = `${id}_${anim}`;
      animations[key] = [];
      animations[key + '_f'] = [];
      for (let i = 0; i < n; i++) {
        const svg = E.fn(i / n, st);
        sprites.push({ name: `${key}_${i}`, w: E.w, h: E.h, svg, ay: E.ay });
        sprites.push({ name: `${key}_${i}_f`, w: E.w, h: E.h, svg: whiteFlash(svg) });
        animations[key].push(`${key}_${i}`);
        animations[key + '_f'].push(`${key}_${i}_f`);
      }
    }
    animations[`${id}_death`] = [];
    for (let i = 0; i < 5; i++) {
      sprites.push({ name: `${id}_death_${i}`, w: E.w, h: E.h, svg: death(E.fn, E.w, E.h, E.ay, E.tint, i), ay: E.ay });
      animations[`${id}_death`].push(`${id}_death_${i}`);
    }
  }
  return { sprites, animations };
}
