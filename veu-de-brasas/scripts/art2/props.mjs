// Props de cenário no estilo cartoon moderno. Base do objeto em y = 0,92·h (âncora do jogo).
import { part, flat, line, spec, aura, gem, capsule, circle, ellipse, rrect, path, smooth, poly, shift, mix, f, TAU, OUT, rng } from './lib.mjs';

const P = (shape, c, o = {}) => part(shape, c, { sw: 1.3, ...o });
const STONE = '#7a7f94', STONE2 = '#5e6278', BRONZE = '#c0803a', COPPER = '#c86a3a';

function groundShadow(cx, by, rx) {
  return `<ellipse cx="${f(cx)}" cy="${f(by)}" rx="${f(rx)}" ry="${f(rx * 0.28)}" fill="#0a0612" opacity="0.28"/>`;
}

const DEFS = {
  tree_petrified: { w: 72, h: 100, n: 2, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2, r = rng(v * 9 + 1);
    let s = groundShadow(cx, by, 24);
    s += P(path(`M${cx - 9} ${by} C${cx - 7} ${by - 20} ${cx - 6} ${by - 34} ${cx - 3} ${by - 48} L${cx + 4} ${by - 48} C${cx + 6} ${by - 32} ${cx + 8} ${by - 18} ${cx + 11} ${by} Q${cx} ${by + 3} ${cx - 9} ${by} Z`), '#8a7a6e', { lt: 0.1 });
    s += line(`M${cx - 2} ${by - 6} Q${cx} ${by - 25} ${cx - 1} ${by - 44}`, '#5a4a44', 1, 0.6);
    const branches = [[-1, 58, 18], [1, 54, 20], [-1, 70, 13], [1, 72, 12]];
    for (const [sg, y, l] of branches) {
      const x0 = cx + sg * 2, y0 = by - y + 18;
      const x1 = cx + sg * l, y1 = by - y - 2 + r() * 4;
      s += P(capsule(x0, y0, x1, y1, 3, 1.6), '#8a7a6e', { k: 0.8 });
    }
    // copa de folhas de cinza (brasas)
    for (const [x, y, rr, c] of [[cx - 14, by - 64, 15, '#d06a3a'], [cx + 13, by - 62, 14, '#c05a34'], [cx, by - 76, 17, '#e07a40'], [cx - 6, by - 58, 11, '#b8502e'], [cx + 6, by - 84, 10, '#f08a48']]) s += P(circle(x + (v ? 2 : 0), y, rr), c, { lt: 0.14, k: 1.8 });
    for (let i = 0; i < 6; i++) s += aura(cx - 16 + r() * 32, by - 90 + r() * 34, 3, '#ffd080', 0.8);
    return s;
  } },
  glass_tree: { w: 76, h: 104, n: 2, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2, r = rng(v * 5 + 2);
    let s = groundShadow(cx, by, 22) + aura(cx, by - 62, 40, '#60e0f0', 0.25);
    s += P(path(`M${cx - 6} ${by} C${cx - 5} ${by - 22} ${cx - 3} ${by - 36} ${cx - 2} ${by - 50} L${cx + 3} ${by - 50} C${cx + 4} ${by - 34} ${cx + 6} ${by - 20} ${cx + 8} ${by} Z`), '#d8f0ff', { lt: 0.1, ho: 0.8 });
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.32 + (r() - 0.5) * 0.2;
      const d = 24 + r() * 14;
      s += gem(cx + Math.cos(a) * d * 0.9, by - 56 + Math.sin(a) * d * 0.9, 6 + r() * 4, 9 + r() * 6, i % 3 ? '#6ae8ff' : '#a8f4ff', (a + Math.PI / 2) * 57);
    }
    s += gem(cx, by - 74, 9, 14, '#bff8ff');
    return s;
  } },
  anchor_off: { w: 56, h: 92, n: 1, name: 'anchor_off', fn: (v, w, h) => anchor(w, h, false) },
  anchor_on: { w: 56, h: 92, n: 1, name: 'anchor_on', fn: (v, w, h) => anchor(w, h, true) },
  monument: { w: 104, h: 124, n: 1, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    let s = groundShadow(cx, by, 46) + aura(cx, by - 70, 50, '#ff7030', 0.3);
    s += P(path(`M${cx - 40} ${by} L${cx - 36} ${by - 14} L${cx + 36} ${by - 14} L${cx + 40} ${by} Z`), STONE2);
    s += P(path(`M${cx - 26} ${by - 14} L${cx - 22} ${by - 96} Q${cx} ${by - 112} ${cx + 22} ${by - 96} L${cx + 26} ${by - 14} Z`), STONE, { lt: 0.1, k: 2.2 });
    s += line(`M${cx - 4} ${by - 104} L${cx + 3} ${by - 80} L${cx - 5} ${by - 60} L${cx + 6} ${by - 36}`, '#2a1a20', 2.4) + line(`M${cx - 4} ${by - 104} L${cx + 3} ${by - 80} L${cx - 5} ${by - 60} L${cx + 6} ${by - 36}`, '#ff8a3a', 1.2);
    s += aura(cx, by - 70, 16, '#ffa040', 0.8) + flat(circle(cx, by - 70, 4), '#ffe0a0');
    for (const y of [40, 56, 86]) s += line(`M${cx - 18} ${by - y} L${cx - 10} ${by - y}`, '#ff9a4a', 1.2, 0.8) + line(`M${cx + 10} ${by - y} L${cx + 18} ${by - y}`, '#ff9a4a', 1.2, 0.8);
    return s;
  } },
  pillar: { w: 34, h: 92, n: 1, fn: (v, w, h) => pillar(w, h, 0) },
  pillar_broken: { w: 34, h: 64, n: 1, fn: (v, w, h) => pillar(w, h, 1) },
  pillar_ruined: { w: 34, h: 64, n: 1, fn: (v, w, h) => pillar(w, h, 2) },
  crystal_tall: { w: 52, h: 84, n: 2, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    let s = groundShadow(cx, by, 20) + aura(cx, by - 34, 30, '#40d8f0', 0.35);
    s += P(ellipse(cx, by - 2, 16, 5), STONE2, { k: 1 });
    const set = v ? [[-9, 30, 7, 18, -18], [8, 26, 6, 16, 16], [0, 44, 9, 30, 0]] : [[-8, 28, 6, 17, -12], [9, 34, 7, 22, 20], [-1, 46, 9, 30, -4]];
    for (const [dx, y, ww, hh, r] of set) s += gem(cx + dx, by - y, ww, hh, '#58e4ff', r);
    return s;
  } },
  crystal_small: { w: 28, h: 28, n: 1, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    return groundShadow(cx, by, 10) + aura(cx, by - 9, 12, '#40d8f0', 0.4) + gem(cx - 4, by - 7, 4, 7, '#58e4ff', -20) + gem(cx + 3, by - 10, 5, 10, '#7aecff', 10);
  } },
  altar: { w: 88, h: 64, n: 1, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    let s = groundShadow(cx, by, 40) + aura(cx, by - 30, 34, '#d08040', 0.3);
    s += P(rrect(cx - 40, by - 14, 80, 14, 3), STONE2);
    s += P(rrect(cx - 32, by - 34, 64, 22, 4), STONE, { lt: 0.1 });
    s += P(rrect(cx - 36, by - 40, 72, 8, 3), shift(STONE, 0.05));
    for (const dx of [-22, 0, 22]) s += P(circle(cx + dx, by - 24, 4.5), COPPER, { k: 0.8, sw: 1 });
    s += aura(cx, by - 46, 12, '#ffb060', 0.8) + P(ellipse(cx, by - 44, 9, 3.5), BRONZE, { k: 0.8 });
    return s;
  } },
  stele: { w: 28, h: 56, n: 1, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    let s = groundShadow(cx, by, 12);
    s += P(path(`M${cx - 10} ${by} L${cx - 9} ${by - 40} Q${cx} ${by - 50} ${cx + 9} ${by - 40} L${cx + 10} ${by} Z`), STONE, { lt: 0.1 });
    s += aura(cx, by - 30, 10, '#ffa040', 0.7);
    s += line(`M${cx - 4} ${by - 36} L${cx + 4} ${by - 36} M${cx} ${by - 40} L${cx} ${by - 18} M${cx - 4} ${by - 24} L${cx + 4} ${by - 28}`, '#ffb050', 1.4);
    return s;
  } },
  coral_formation: { w: 48, h: 52, n: 1, fn: (v, w, h) => coral(w, h, 3, '#ff5a54', 8) },
  coral_red: { w: 36, h: 40, n: 2, fn: (v, w, h) => coral(w, h, 2 + v, '#ff6a5a', 3 + v) },
  coral_vine: { w: 40, h: 24, n: 1, fn: (v, w, h) => {
    const by = h * 0.92;
    let s = '';
    for (let i = 0; i < 4; i++) {
      const d = `M${4 + i * 9} ${by} Q${8 + i * 9} ${by - 10} ${3 + i * 9} ${by - 16 + (i % 2) * 4}`;
      s += line(d, OUT, 4) + line(d, '#e05a6a', 2.4) + aura(3 + i * 9, by - 16 + (i % 2) * 4, 3, '#ff9aa0', 0.7);
    }
    return s;
  } },
  lantern: { w: 20, h: 48, n: 1, fn: (v, w, h) => lantern(w, h, '#ffb050') },
  lantern_crystal: { w: 20, h: 48, n: 1, fn: (v, w, h) => lantern(w, h, '#50e8ff') },
  brazier: { w: 26, h: 40, n: 1, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    let s = groundShadow(cx, by, 11) + aura(cx, by - 26, 16, '#ff7a30', 0.6);
    s += P(path(`M${cx - 4} ${by} L${cx - 2} ${by - 16} L${cx + 2} ${by - 16} L${cx + 4} ${by} Z`), COPPER);
    s += P(path(`M${cx - 11} ${by - 22} Q${cx} ${by - 12} ${cx + 11} ${by - 22} L${cx + 9} ${by - 16} Q${cx} ${by - 11} ${cx - 9} ${by - 16} Z`), BRONZE);
    s += P(smooth([[cx - 7, by - 22], [cx - 5, by - 30], [cx - 1, by - 27], [cx + 1, by - 35], [cx + 4, by - 28], [cx + 7, by - 22]]), '#ff8a30', { glow: true, k: 1 });
    s += flat(smooth([[cx - 3, by - 22], [cx - 1, by - 28], [cx + 1, by - 25], [cx + 3, by - 22]]), '#ffe080');
    return s;
  } },
  boulder: { w: 48, h: 36, n: 2, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    let s = groundShadow(cx, by, 21);
    const pts = v ? [[cx - 20, by], [cx - 18, by - 16], [cx - 6, by - 28], [cx + 10, by - 26], [cx + 21, by - 12], [cx + 19, by]] : [[cx - 21, by], [cx - 15, by - 20], [cx + 2, by - 29], [cx + 17, by - 20], [cx + 21, by]];
    s += P(smooth(pts), STONE, { lt: 0.12, k: 2.4 });
    s += flat(ellipse(cx - 6, by - 20, 7, 3, -10), '#5aa860', { op: 0.85 }) + flat(ellipse(cx - 3, by - 22, 4, 1.6, -10), '#8ad88a', { op: 0.7 });
    s += line(`M${cx + 4} ${by - 22} L${cx + 8} ${by - 12} L${cx + 5} ${by - 4}`, '#3e4256', 1, 0.6);
    return s;
  } },
  copper_sigil: { w: 48, h: 30, n: 1, fn: (v, w, h) => {
    const cx = w / 2, cy = h * 0.6;
    let s = aura(cx, cy, 22, '#ff9050', 0.3);
    s += P(ellipse(cx, cy, 21, 11), COPPER, { k: 1, lt: 0.1 });
    s += `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="7.5" fill="none" stroke="#ffc080" stroke-width="1.2"/>`;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      s += flat(circle(cx + Math.cos(a) * 15, cy + Math.sin(a) * 7.5, 1.4), '#ffe0b0');
    }
    return s;
  } },
  shrub_dead: { w: 34, h: 30, n: 1, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    let s = '';
    for (const [a, l] of [[-60, 14], [-30, 18], [0, 20], [30, 17], [60, 13], [-80, 9], [80, 9]]) {
      const r = (a * Math.PI) / 180;
      const d = `M${cx} ${by} Q${cx + Math.sin(r) * l * 0.4} ${by - l * 0.6} ${cx + Math.sin(r) * l} ${by - Math.cos(r) * l}`;
      s += line(d, OUT, 3.4) + line(d, '#9a7a5a', 1.8);
    }
    return s;
  } },
  urn: { w: 24, h: 30, n: 1, fn: (v, w, h) => {
    const by = h * 0.92, cx = w / 2;
    return groundShadow(cx, by, 9) + P(smooth([[cx - 4, by], [cx - 9, by - 8], [cx - 7, by - 18], [cx - 4, by - 22], [cx + 4, by - 22], [cx + 7, by - 18], [cx + 9, by - 8], [cx + 4, by]]), COPPER, { lt: 0.12 }) + P(rrect(cx - 5, by - 25, 10, 4, 1.5), BRONZE, { k: 0.6 }) + line(`M${cx - 8} ${by - 12} L${cx + 8} ${by - 12}`, '#ffd090', 1, 0.6);
  } },
  roots: { w: 64, h: 28, n: 1, fn: (v, w, h) => {
    const by = h * 0.92;
    let s = '';
    for (const d of [`M2 ${by - 4} Q16 ${by - 14} 30 ${by - 8} T62 ${by - 10}`, `M10 ${by} Q22 ${by - 8} 36 ${by - 2} T58 ${by - 2}`, `M20 ${by - 10} Q28 ${by - 20} 40 ${by - 16}`]) s += line(d, OUT, 4.4) + line(d, '#6e5a48', 2.8) + line(d, '#9a8068', 0.8, 0.6);
    return s;
  } },
  glass_mushroom: { w: 26, h: 28, n: 1, fn: (v, w, h) => mushroom(w, h, '#60e8ff', '#c8f8ff') },
  fungus_glow: { w: 30, h: 26, n: 2, fn: (v, w, h) => mushroom(w, h, v ? '#3ad8b0' : '#3ad8d0', '#c0fff0', true) },
  debris: { w: 36, h: 20, n: 1, fn: (v, w, h) => {
    const by = h * 0.92;
    return P(poly([[3, by], [6, by - 7], [14, by - 8], [16, by]]), STONE2, { k: 0.8 }) + P(poly([[18, by], [21, by - 10], [30, by - 9], [33, by]]), STONE, { k: 0.8 }) + P(circle(12, by - 2, 2.6), STONE, { k: 0.6, sw: 1 });
  } },
  fossil_flower: { w: 26, h: 20, n: 1, fn: (v, w, h) => {
    const cx = w / 2, cy = h * 0.6;
    let s = '';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      s += P(ellipse(cx + Math.cos(a) * 5, cy + Math.sin(a) * 3, 4, 2.2, (a * 180) / Math.PI), '#e8c8a0', { k: 0.5, sw: 0.9 });
    }
    return s + aura(cx, cy, 6, '#ffc060', 0.7) + P(circle(cx, cy, 2.2), '#ffb050', { glow: true, k: 0.5, sw: 0.9 });
  } },
  bones: { w: 30, h: 18, n: 1, fn: (v, w, h) => {
    const by = h * 0.85;
    let s = P(capsule(4, by - 2, 22, by - 6, 1.6), '#e8e0cc', { k: 0.5, sw: 1 });
    for (const [x, y] of [[4, by - 2], [22, by - 6]]) s += P(circle(x - 1, y - 1, 2), '#e8e0cc', { k: 0.5, sw: 1 }) + P(circle(x + 1, y + 1, 2), '#e8e0cc', { k: 0.5, sw: 1 });
    s += P(path(`M18 ${by} C18 ${by - 7} 28 ${by - 7} 28 ${by} Z`), '#e8e0cc', { k: 0.6, sw: 1 }) + flat(circle(21.5, by - 2.5, 1.1), OUT) + flat(circle(25, by - 2.5, 1.1), OUT);
    return s;
  } },
  crystal_shards: { w: 34, h: 16, n: 1, fn: (v, w, h) => {
    const by = h * 0.92;
    return gem(8, by - 4, 3, 4, '#58e4ff', -40) + gem(17, by - 5, 3.4, 5, '#7aecff', 10) + gem(26, by - 3, 2.6, 3.4, '#58e4ff', 50);
  } },
  rift: { w: 260, h: 140, n: 1, fn: (v, w, h) => {
    const cx = w / 2, cy = h / 2;
    let s = aura(cx, cy, 120, '#a060ff', 0.45);
    s += P(smooth([[cx - 110, cy + 4], [cx - 70, cy - 22], [cx - 20, cy - 30], [cx + 40, cy - 26], [cx + 100, cy - 8], [cx + 112, cy + 8], [cx + 60, cy + 26], [cx - 10, cy + 30], [cx - 80, cy + 22]]), '#2a1046', { k: 4, sw: 2 });
    s += flat(smooth([[cx - 90, cy + 2], [cx - 50, cy - 14], [cx + 30, cy - 16], [cx + 90, cy], [cx + 40, cy + 16], [cx - 40, cy + 18]]), '#6a30c0', { op: 0.85 });
    s += aura(cx, cy, 50, '#e0b0ff', 0.7);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      s += aura(cx + Math.cos(a) * 80, cy + Math.sin(a) * 18, 5, '#d8a8ff', 0.8);
    }
    return s;
  } },
};

function anchor(w, h, on) {
  const by = h * 0.92, cx = w / 2;
  const glow = on ? '#ffb040' : '#6a6080';
  let s = groundShadow(cx, by, 24);
  if (on) s += aura(cx, by - 50, 44, '#ff9a30', 0.55);
  s += P(rrect(cx - 22, by - 12, 44, 12, 4), STONE2);
  s += P(path(`M${cx - 12} ${by - 12} L${cx - 9} ${by - 62} L${cx + 9} ${by - 62} L${cx + 12} ${by - 12} Z`), STONE, { lt: 0.1 });
  s += P(path(`M${cx - 16} ${by - 60} Q${cx} ${by - 90} ${cx + 16} ${by - 60} Z`), BRONZE, { lt: 0.14 });
  s += aura(cx, by - 70, on ? 22 : 8, glow, on ? 0.9 : 0.4);
  s += gem(cx, by - 72, 7, 11, on ? '#ffc060' : '#8a80a0');
  s += line(`M${cx - 5} ${by - 50} L${cx + 5} ${by - 50} M${cx} ${by - 56} L${cx} ${by - 22} M${cx - 5} ${by - 30} L${cx + 5} ${by - 34}`, on ? '#ffd080' : '#3e3a50', 1.6);
  return s;
}
function pillar(w, h, kind) {
  const by = h * 0.92, cx = w / 2;
  const top = kind === 0 ? by - 80 : by - 50;
  let s = groundShadow(cx, by, 15);
  s += P(rrect(cx - 15, by - 9, 30, 9, 2), STONE2);
  if (kind === 0) s += P(path(`M${cx - 10} ${by - 9} L${cx - 9} ${top + 8} L${cx + 9} ${top + 8} L${cx + 10} ${by - 9} Z`), STONE, { lt: 0.1 });
  else s += P(path(`M${cx - 10} ${by - 9} L${cx - 9} ${top + 6} L${cx - 4} ${top} L${cx + 1} ${top + 5} L${cx + 5} ${top - 2} L${cx + 9} ${top + 4} L${cx + 10} ${by - 9} Z`), STONE, { lt: 0.1 });
  for (const dx of [-5, 0, 5]) s += line(`M${cx + dx} ${by - 11} L${cx + dx} ${top + 9}`, '#4e5266', 1, 0.5);
  if (kind === 0) s += P(rrect(cx - 13, top, 26, 9, 2), shift(STONE, 0.06));
  if (kind === 2) s += flat(ellipse(cx - 3, top + 12, 6, 3), '#5aa860', { op: 0.85 }) + line(`M${cx + 6} ${by - 12} Q${cx + 9} ${by - 22} ${cx + 5} ${by - 30}`, '#5aa860', 2);
  return s;
}
function coral(w, h, n, c, seed) {
  const by = h * 0.92, cx = w / 2, r = rng(seed);
  let s = groundShadow(cx, by, w * 0.35);
  for (let i = 0; i < n + 2; i++) {
    const x = cx + (i - (n + 1) / 2) * (w / (n + 3));
    const top = by - h * (0.45 + r() * 0.4);
    const d = `M${f(x)} ${f(by)} Q${f(x + (r() - 0.5) * 10)} ${f((by + top) / 2)} ${f(x + (r() - 0.5) * 6)} ${f(top)}`;
    s += line(d, OUT, 6) + line(d, c, 4) + line(d, shift(c, 0.2), 1.2, 0.7);
    s += P(circle(x + (r() - 0.5) * 6, top, 3), shift(c, 0.06), { k: 0.6, sw: 1 });
  }
  return s;
}
function lantern(w, h, light) {
  const by = h * 0.92, cx = w / 2;
  let s = groundShadow(cx, by, 7) + aura(cx, by - 32, 14, light, 0.7);
  s += P(capsule(cx, by, cx, by - 26, 1.4), '#3e3448', { k: 0.5, sw: 1 });
  s += P(rrect(cx - 6, by - 40, 12, 14, 3), '#3e3448', { k: 0.8 });
  s += flat(rrect(cx - 4, by - 38, 8, 10, 2), light) + flat(rrect(cx - 2, by - 36, 4, 6, 1.5), '#fff8d0', { op: 0.9 });
  s += P(path(`M${cx - 8} ${by - 40} L${cx} ${by - 46} L${cx + 8} ${by - 40} Z`), '#3e3448', { k: 0.6, sw: 1 });
  return s;
}
function mushroom(w, h, c, hi, cluster = false) {
  const by = h * 0.92, cx = w / 2;
  let s = aura(cx, by - 10, 14, c, 0.45);
  const caps = cluster ? [[cx - 6, 10, 6], [cx + 5, 14, 7.5], [cx + 11, 7, 4]] : [[cx - 5, 8, 5], [cx + 3, 15, 8]];
  for (const [x, hh, r] of caps) {
    s += P(capsule(x, by, x, by - hh, 1.6, 1.4), '#e8f4f0', { k: 0.5, sw: 1 });
    s += P(path(`M${x - r} ${by - hh + 1} Q${x - r} ${by - hh - r * 1.1} ${x} ${by - hh - r * 1.1} Q${x + r} ${by - hh - r * 1.1} ${x + r} ${by - hh + 1} Z`), c, { glow: true, k: 0.8 });
    s += flat(circle(x - r * 0.4, by - hh - r * 0.4, r * 0.18), hi) + flat(circle(x + r * 0.3, by - hh - r * 0.6, r * 0.14), hi);
  }
  return s;
}

export function propSprites() {
  const sprites = [];
  for (const [id, D] of Object.entries(DEFS)) {
    for (let v = 0; v < D.n; v++) sprites.push({ name: D.name ?? `${id}_${v}`, w: D.w, h: D.h, svg: D.fn(v, D.w, D.h), ay: 0.92 });
  }
  return { sprites, animations: {} };
}
