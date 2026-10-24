// Ilustração do menu (960×540 lógico), emblema e cursor no estilo vetorial.
import { part, flat, line, spec, aura, gem, circle, ellipse, path, smooth, poly, shift, mix, f, TAU, OUT, rng, uid } from './lib.mjs';
import { heroPortrait } from './hero.mjs';

export function emblemSvg() {
  let s = aura(48, 50, 46, '#ff8a30', 0.45);
  s += `<circle cx="48" cy="50" r="30" fill="none" stroke="${OUT}" stroke-width="9"/><circle cx="48" cy="50" r="30" fill="none" stroke="#e8b04a" stroke-width="6"/><circle cx="48" cy="50" r="30" fill="none" stroke="#fff2b0" stroke-width="1.4" opacity="0.8"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    s += gem(48 + Math.cos(a) * 30, 50 + Math.sin(a) * 30, 3.4, 4.2, i % 2 ? '#ff7a3a' : '#ffc060', (a * 180) / Math.PI + 90);
  }
  s += part(path('M48 74 C36 66 30 56 34 44 C38 50 41 52 44 50 C40 40 44 30 48 22 C50 32 56 36 57 44 C60 42 62 38 63 35 C68 50 60 66 48 74 Z'), '#ff7a2a', { glow: true, sw: 2.4, k: 2 });
  s += flat(path('M48 70 C41 64 39 57 42 51 C45 55 48 55 50 52 C54 57 54 64 48 70 Z'), '#ffe080');
  return s;
}

export function cursorSvg() {
  return part(path('M2 2 L13 8 L8.5 9 L11 14 L9 15 L6.5 10 L3 13 Z'), '#ffd070', { sw: 1.2, k: 0.8, lt: 0.2 });
}

export function keyartSvg() {
  const W = 960, H = 540;
  const r = rng(42);
  const lg = (stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => {
    const id = uid('k');
    return [`<defs><linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`, `url(#${id})`];
  };
  let s = '';
  // céu crepuscular
  const [d0, sky] = lg([[0, '#140c28'], [0.45, '#3a1a4a'], [0.75, '#8a3a4a'], [1, '#e0784a']]);
  s += d0 + `<rect width="${W}" height="${H}" fill="${sky}"/>`;
  for (let i = 0; i < 70; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * H * 0.5)}" r="${f(0.4 + r() * 1.1)}" fill="#fff" opacity="${f(0.3 + r() * 0.6)}"/>`;
  // lua/fenda
  s += aura(690, 150, 170, '#ffb070', 0.45) + aura(690, 150, 80, '#ffe0b0', 0.6);
  s += `<circle cx="690" cy="150" r="54" fill="#ffe4c0" opacity="0.95"/>`;
  // montanhas distantes
  const ridge = (y, amp, col, seed) => {
    const rr = rng(seed);
    const pts = [[0, H]];
    for (let x = 0; x <= W; x += 40) pts.push([x, y - rr() * amp]);
    pts.push([W, H]);
    return `<path d="M${pts.map(([x, yy]) => `${f(x)} ${f(yy)}`).join(' L')} Z" fill="${col}"/>`;
  };
  s += ridge(330, 70, '#4a2448', 3) + ridge(370, 60, '#33193a', 5);
  // ruínas em silhueta
  for (const [x, w, h] of [[560, 26, 120], [610, 18, 80], [820, 30, 150], [870, 20, 96], [740, 16, 60]]) s += `<rect x="${x}" y="${380 - h}" width="${w}" height="${h}" fill="#26122c"/><rect x="${x - 4}" y="${380 - h}" width="${w + 8}" height="8" fill="#26122c"/>`;
  s += ridge(410, 30, '#1e0f26', 9);
  // névoa
  const [d1, fog] = lg([[0, 'rgba(255,150,110,0)'], [1, 'rgba(255,150,110,0.28)']]);
  s += d1 + `<rect y="330" width="${W}" height="120" fill="${fog}"/>`;
  // penhasco em primeiro plano
  s += part(smooth([[330, 560], [360, 470], [440, 440], [600, 430], [760, 438], [900, 450], [1000, 480], [1000, 560]]), '#2c1c34', { sw: 3, k: 6, lt: 0.06 });
  s += flat(smooth([[380, 462], [470, 446], [640, 440], [800, 446], [940, 462], [800, 452], [600, 448], [460, 454]]), '#5a3a4a', { op: 0.8 });
  // coroa gigante (halo) atrás dos heróis
  s += aura(640, 330, 210, '#ff8a30', 0.35);
  s += `<circle cx="640" cy="330" r="150" fill="none" stroke="${OUT}" stroke-width="16"/><circle cx="640" cy="330" r="150" fill="none" stroke="#e8b04a" stroke-width="11"/><circle cx="640" cy="330" r="150" fill="none" stroke="#fff2b0" stroke-width="2.4" opacity="0.8"/>`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    s += gem(640 + Math.cos(a) * 150, 330 + Math.sin(a) * 150, 7, 9, i % 2 ? '#ff7a3a' : '#ffc060', (a * 180) / Math.PI + 90);
    if (i % 4 === 1) s += `<g transform="translate(${f(640 + Math.cos(a) * 150 - 12)} ${f(330 + Math.sin(a) * 150 - 40)}) scale(1.6)">${part(path('M8 24 C3 20 2 14 5 9 C6 13 8 14 9 13 C8 8 10 4 12 1 C13 6 16 8 16 13 C17 11 18 9 19 8 C21 16 16 22 8 24 Z'), '#ff8a2a', { glow: true, sw: 1.4, k: 1 })}</g>`;
  }
  // heróis (retratos de corpo inteiro ampliados)
  const heroes = [['brann', 371, 272, 3.1], ['nyx', 724, 277, 3.0], ['orin', 479, 277, 3.0], ['lysa', 565, 243, 3.6]];
  for (const [id, x, y, sc] of heroes) s += `<ellipse cx="${x + 32 * sc}" cy="${y + 57.5 * sc}" rx="${24 * sc}" ry="${6 * sc}" fill="#000" opacity="0.35"/><g transform="translate(${x} ${y}) scale(${sc})">${heroPortrait(id)}</g>`;
  // brasas no ar
  for (let i = 0; i < 60; i++) {
    const x = 300 + r() * 660, y = 80 + r() * 440;
    s += aura(x, y, 3 + r() * 5, r() < 0.2 ? '#9ff4ff' : '#ffb050', 0.8);
  }
  // escurecimento à esquerda (coluna do menu)
  const [d2, side] = lg([[0, 'rgba(10,6,16,0.85)'], [0.4, 'rgba(10,6,16,0.35)'], [1, 'rgba(10,6,16,0)']], 0, 0, 1, 0);
  s += d2 + `<rect width="${W * 0.55}" height="${H}" fill="${side}"/>`;
  return s;
}
