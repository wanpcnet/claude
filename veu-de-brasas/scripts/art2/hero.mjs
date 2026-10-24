// Heróis em estilo cartoon moderno (chibi 3/4, visão de cima). Cada quadro é montado a partir de
// uma "pose" (deslocamentos de membros, inclinação, estado da arma) — animação por partes.
import { part, flat, line, spec, aura, gem, capsule, circle, ellipse, rrect, path, smooth, poly, tr, g, shift, mix, whiteFlash, mirror, f, TAU, OUT } from './lib.mjs';

export const LOOKS = {
  lysa: { cape: '#9a2d4c', cloth: '#efe2c4', trim: '#c98a3a', metal: '#d89a40', hair: '#c4683a', skin: '#f4c9a3', accent: '#ffb347', boots: '#5a3a2a', head: 'hood', weapon: 'bow', robe: false, bulk: 1 },
  orin: { cape: '#3152b0', cloth: '#4d3d86', trim: '#e8c052', metal: '#e8c052', hair: '#6e4a30', skin: '#f2c49e', accent: '#5ee8ff', boots: '#2e2448', head: 'hat', weapon: 'staff', robe: true, bulk: 1 },
  brann: { cape: '#b23a2a', cloth: '#5e5a66', trim: '#e0a040', metal: '#a9b4c8', hair: '#d8742c', skin: '#e9b48e', accent: '#ff6a2a', boots: '#3a3440', head: 'helm', weapon: 'sword', robe: false, bulk: 1.14 },
  nyx: { cape: '#3a2c60', cloth: '#2a5a66', trim: '#b080ff', metal: '#b080ff', hair: '#efe8fa', skin: '#dcbfd0', accent: '#b57cff', boots: '#1e1830', head: 'veil', weapon: 'orb', robe: true, bulk: 0.96 },
};

const W = 64, H = 64, FY = 57.5; // pés em y = 57,5 (âncora 0,9)
const SW = 1.25;
const P = (shape, c, o = {}) => part(shape, c, { sw: SW, ...o });

// ---------------------------------------------------------------- armas
function bow(L, x, y0, y1, drawn = 0, horizontal = false, arrowDir = 0) {
  // arco curvo: madeira com pontas metálicas, corda e flecha
  const wood = '#7a4a2c';
  let s = '';
  if (!horizontal) {
    const bend = 4.2;
    const my = (y0 + y1) / 2;
    const d = `M${f(x)} ${f(y0)} Q${f(x - bend * 2.2)} ${f(my)} ${f(x)} ${f(y1)}`;
    s += line(d, OUT, 3.6) + line(d, wood, 2.2) + line(d, shift(wood, 0.18), 0.8, 0.8);
    const sx = x + drawn;
    s += line(`M${f(x)} ${f(y0)} L${f(sx)} ${f(my)} L${f(x)} ${f(y1)}`, '#f4ead8', 0.6);
    s += P(circle(x, y0, 1.3), L.metal, { sw: 0.9, k: 0.6 }) + P(circle(x, y1, 1.3), L.metal, { sw: 0.9, k: 0.6 });
    s += P(rrect(x - bend * 1.1 - 1.4, my - 2.5, 2.8, 5, 1), L.metal, { sw: 0.9, k: 0.6 });
    if (arrowDir) s += arrow(L, sx, my, x - bend * 1.2 - 8, my);
  } else {
    const bend = 4.2;
    const mx = (y0 + y1) / 2; // aqui y0/y1 são x0/x1
    const y = x;
    const d = `M${f(y0)} ${f(y)} Q${f(mx)} ${f(y + bend * 2.2 * arrowDir)} ${f(y1)} ${f(y)}`;
    s += line(d, OUT, 3.6) + line(d, wood, 2.2) + line(d, shift(wood, 0.18), 0.8, 0.8);
    const sy = y - drawn * arrowDir;
    s += line(`M${f(y0)} ${f(y)} L${f(mx)} ${f(sy)} L${f(y1)} ${f(y)}`, '#f4ead8', 0.6);
    s += P(circle(y0, y, 1.3), L.metal, { sw: 0.9, k: 0.6 }) + P(circle(y1, y, 1.3), L.metal, { sw: 0.9, k: 0.6 });
    if (drawn > 0) s += arrow(L, mx, sy, mx, y + (bend * 1.2 + 8) * arrowDir);
  }
  return s;
}
function arrow(L, x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const c = Math.cos(a), si = Math.sin(a);
  let s = line(`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`, OUT, 2.4) + line(`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`, '#e8d2a8', 1.1);
  s += P(poly([[x2 + c * 3.2, y2 + si * 3.2], [x2 - si * 1.6, y2 + c * 1.6], [x2 + si * 1.6, y2 - c * 1.6]]), L.accent, { sw: 0.8, k: 0.5, glow: true });
  s += flat(poly([[x1, y1], [x1 - si * 1.8 - c * 2, y1 + c * 1.8 - si * 2], [x1 + c * 1.5, y1 + si * 1.5], [x1 + si * 1.8 - c * 2, y1 - c * 1.8 - si * 2]]), L.cape);
  return s;
}
function staff(L, x, y0, y1, power = 0) {
  const wood = '#6a4428';
  let s = P(capsule(x, y0 + 4, x, y1, 1.25, 1.1), wood, { sw: 1, k: 0.6 });
  s += P(rrect(x - 2.2, y0 + 5.5, 4.4, 2, 0.8), L.metal, { sw: 0.9, k: 0.5 });
  s += line(`M${f(x - 3.5)} ${f(y0 + 5)} Q${f(x - 4.5)} ${f(y0 - 1)} ${f(x)} ${f(y0 - 3)} Q${f(x + 4.5)} ${f(y0 - 1)} ${f(x + 3.5)} ${f(y0 + 5)}`, OUT, 2.6) + line(`M${f(x - 3.5)} ${f(y0 + 5)} Q${f(x - 4.5)} ${f(y0 - 1)} ${f(x)} ${f(y0 - 3)} Q${f(x + 4.5)} ${f(y0 - 1)} ${f(x + 3.5)} ${f(y0 + 5)}`, L.metal, 1.3);
  s += aura(x, y0 + 1, 7 + power * 6, L.accent, 0.55 + power * 0.3);
  s += gem(x, y0 + 1, 4.4, 3.6, L.accent);
  return s;
}
function sword(L, x, y, ang, slash = 0) {
  // espada curta com lâmina larga; ang em graus (0 = apontando para baixo)
  let s = '';
  if (slash > 0) {
    const r = 15;
    const a0 = (ang - 110) * Math.PI / 180, a1 = (ang - 10) * Math.PI / 180;
    const p = (a, rr) => [x - Math.sin(a) * rr, y + Math.cos(a) * rr];
    const [ax, ay] = p(a0, r), [bx, by] = p(a1, r), [cx, cy] = p(a1, r * 0.55), [dx, dy] = p(a0, r * 0.55);
    s += `<path d="M${f(ax)} ${f(ay)} A${r} ${r} 0 0 0 ${f(bx)} ${f(by)} L${f(cx)} ${f(cy)} A${r * 0.55} ${r * 0.55} 0 0 1 ${f(dx)} ${f(dy)} Z" fill="${L.accent}" opacity="${0.45 * slash}"/>`;
    s += `<path d="M${f(ax)} ${f(ay)} A${r} ${r} 0 0 0 ${f(bx)} ${f(by)}" fill="none" stroke="#fff" stroke-width="1.2" opacity="${0.8 * slash}"/>`;
  }
  const blade = poly([[-1.9, 2.5], [1.9, 2.5], [1.6, 13], [0, 16], [-1.6, 13]]);
  let w = P(blade, '#dfe6f2', { sw: 1, k: 0.6, lt: 0.12 }) + line('M0 3 L0 14', '#ffffff', 0.6, 0.7);
  w += P(rrect(-3.6, 1, 7.2, 2, 0.9), L.trim, { sw: 0.9, k: 0.5 });
  w += P(capsule(0, -3, 0, 1, 1, 1), '#4a2e22', { sw: 0.9, k: 0.4 });
  w += P(circle(0, -3.6, 1.2), L.accent, { sw: 0.8, k: 0.4, glow: true });
  return s + tr(w, x, y, ang);
}
function orb(L, x, y, power = 0, t = 0) {
  let s = aura(x, y, 9 + power * 6, L.accent, 0.5 + power * 0.35);
  s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(6.5 + power)}" ry="${f(2.2)}" fill="none" stroke="${L.accent}" stroke-width="0.8" opacity="0.8" transform="rotate(${f(-20 + t * 360)} ${f(x)} ${f(y)})"/>`;
  s += P(circle(x, y, 3.4 + power * 0.6), mix(L.accent, '#2a1050', 0.35), { sw: 1, k: 0.9, lt: 0.25 });
  s += flat(circle(x - 0.4, y + 0.4, 1.6), '#fff', { op: 0.35 }) + spec(x - 1.2, y - 1.3, 1, 0.7, 0.9);
  return s;
}

// ---------------------------------------------------------------- cabeça
function headFront(L, cx, cy, o) {
  const r = 11.2;
  let back = '', front = '';
  // camadas traseiras (capuz/cabelo atrás da cabeça)
  if (L.head === 'hood') back += P(smooth([[cx - 13, cy + 3], [cx - 12.5, cy - 8], [cx, cy - 14], [cx + 12.5, cy - 8], [cx + 13, cy + 3], [cx + 8, cy + 10], [cx - 8, cy + 10]]), L.cape);
  if (L.head === 'veil') back += P(smooth([[cx - 13.5, cy + 6], [cx - 13, cy - 8], [cx, cy - 14.5], [cx + 13, cy - 8], [cx + 13.5, cy + 6], [cx + 9, cy + 14], [cx - 9, cy + 14]]), L.cape);
  if (L.head === 'veil') back += P(smooth([[cx - 11, cy], [cx - 9, cy + 12], [cx - 4, cy + 13], [cx + 4, cy + 13], [cx + 9, cy + 12], [cx + 11, cy]]), L.hair, { k: 1 });
  if (L.head === 'helm') back += P(capsule(cx - 10, cy + 2, cx - 11.5, cy + 12, 2.2, 1.8), L.hair, { k: 0.8 }) + P(capsule(cx + 10, cy + 2, cx + 11.5, cy + 12, 2.2, 1.8), L.hair, { k: 0.8 });
  if (L.head === 'hat') back += P(smooth([[cx - 11, cy - 2], [cx - 11.5, cy + 6], [cx - 7, cy + 8], [cx + 7, cy + 8], [cx + 11.5, cy + 6], [cx + 11, cy - 2]]), L.hair, { k: 1 });
  // rosto
  front += P(circle(cx, cy, r), L.skin, { lt: 0.06, dk: 0.08, sd: 0.12 });
  front += flat(ellipse(cx - 6.2, cy + 4.2, 2.2, 1.3), '#ff7a8a', { op: 0.35 }) + flat(ellipse(cx + 6.2, cy + 4.2, 2.2, 1.3), '#ff7a8a', { op: 0.35 });
  // olhos
  const ey = cy + 1.8;
  if (o.hurt) {
    front += line(`M${f(cx - 6)} ${f(ey - 1.5)} L${f(cx - 3)} ${f(ey)} L${f(cx - 6)} ${f(ey + 1.5)}`, OUT, 1.2) + line(`M${f(cx + 6)} ${f(ey - 1.5)} L${f(cx + 3)} ${f(ey)} L${f(cx + 6)} ${f(ey + 1.5)}`, OUT, 1.2);
    front += flat(ellipse(cx, cy + 6.5, 1.6, 1.3), '#5a1a2a');
  } else if (o.blink) {
    front += line(`M${f(cx - 6)} ${f(ey)} Q${f(cx - 4.3)} ${f(ey + 1.2)} ${f(cx - 2.6)} ${f(ey)}`, OUT, 1.1) + line(`M${f(cx + 2.6)} ${f(ey)} Q${f(cx + 4.3)} ${f(ey + 1.2)} ${f(cx + 6)} ${f(ey)}`, OUT, 1.1);
  } else {
    const glow = L.head === 'veil' ? L.accent : null;
    for (const sg of [-1, 1]) {
      const x = cx + sg * 4.3;
      if (glow) front += aura(x, ey, 4, glow, 0.5);
      front += `<ellipse cx="${f(x)}" cy="${f(ey)}" rx="1.75" ry="2.35" fill="${glow ? mix(glow, '#2a1050', 0.3) : '#2b1b30'}"/>`;
      front += `<ellipse cx="${f(x)}" cy="${f(ey + 0.9)}" rx="1.2" ry="1" fill="${glow ?? L.accent}" opacity="0.55"/>`;
      front += `<circle cx="${f(x - 0.55)}" cy="${f(ey - 0.9)}" r="0.75" fill="#fff"/>`;
    }
    front += line(`M${f(cx - 1.3)} ${f(cy + 6.3)} Q${f(cx)} ${f(cy + 7.2)} ${f(cx + 1.3)} ${f(cy + 6.3)}`, '#6a2a2a', 0.8);
  }
  // cabelo / chapéu / elmo à frente
  if (L.head === 'hood') {
    front += P(smooth([[cx - 9.5, cy - 3], [cx - 6, cy - 7.5], [cx - 1, cy - 6], [cx + 3, cy - 7.8], [cx + 8, cy - 6], [cx + 10, cy - 2], [cx + 6, cy - 3.8], [cx + 1, cy - 2.5], [cx - 4, cy - 3.6]]), L.hair, { k: 0.8 });
    front += P(path(`M${f(cx - 13)} ${f(cy + 3)} C${f(cx - 14)} ${f(cy - 16)} ${f(cx + 14)} ${f(cy - 16)} ${f(cx + 13)} ${f(cy + 3)} C${f(cx + 11)} ${f(cy - 6)} ${f(cx + 7)} ${f(cy - 9)} ${f(cx)} ${f(cy - 9)} C${f(cx - 7)} ${f(cy - 9)} ${f(cx - 11)} ${f(cy - 6)} ${f(cx - 13)} ${f(cy + 3)} Z`), L.cape);
    front += line(`M${f(cx - 11)} ${f(cy - 2)} C${f(cx - 9)} ${f(cy - 9.5)} ${f(cx + 9)} ${f(cy - 9.5)} ${f(cx + 11)} ${f(cy - 2)}`, L.trim, 0.9, 0.9);
    front += gem(cx, cy - 9.8, 2.4, 2, L.accent);
  } else if (L.head === 'hat') {
    front += P(smooth([[cx - 10.5, cy - 2], [cx - 7, cy - 6.5], [cx, cy - 5], [cx + 7, cy - 6.5], [cx + 10.5, cy - 2], [cx + 5, cy - 3.6], [cx - 5, cy - 3.6]]), L.hair, { k: 0.8 });
    front += P(ellipse(cx, cy - 6.5, 16, 4.4), L.cape, { k: 1 });
    front += P(path(`M${f(cx - 9.5)} ${f(cy - 7)} C${f(cx - 7)} ${f(cy - 16)} ${f(cx - 1)} ${f(cy - 21)} ${f(cx + 10)} ${f(cy - 23)} C${f(cx + 6)} ${f(cy - 18)} ${f(cx + 7)} ${f(cy - 13)} ${f(cx + 9.5)} ${f(cy - 7)} Z`), L.cape);
    front += P(path(`M${f(cx - 9.5)} ${f(cy - 7)} L${f(cx + 9.5)} ${f(cy - 7)} L${f(cx + 9.2)} ${f(cy - 9.6)} L${f(cx - 9.1)} ${f(cy - 9.6)} Z`), L.trim, { sw: 1, k: 0.5 });
    front += gem(cx + 1, cy - 14, 2, 2.2, L.accent);
  } else if (L.head === 'helm') {
    front += P(path(`M${f(cx - 11.8)} ${f(cy + 2)} C${f(cx - 13)} ${f(cy - 15)} ${f(cx + 13)} ${f(cy - 15)} ${f(cx + 11.8)} ${f(cy + 2)} L${f(cx + 9)} ${f(cy + 1.5)} C${f(cx + 9)} ${f(cy - 3)} ${f(cx + 5)} ${f(cy - 3.5)} ${f(cx)} ${f(cy - 3.5)} C${f(cx - 5)} ${f(cy - 3.5)} ${f(cx - 9)} ${f(cy - 3)} ${f(cx - 9)} ${f(cy + 1.5)} Z`), L.metal, { lt: 0.18 });
    front += P(rrect(cx - 1.4, cy - 4.5, 2.8, 7.5, 1.2), shift(L.metal, -0.05), { sw: 1, k: 0.5 });
    front += P(smooth([[cx - 2.5, cy - 11.5], [cx - 1.5, cy - 17], [cx + 3, cy - 20], [cx + 9, cy - 19], [cx + 5, cy - 16], [cx + 2.5, cy - 11]]), L.accent, { k: 1 });
    front += spec(cx - 5.5, cy - 7, 2.2, 1, 0.6);
  } else if (L.head === 'veil') {
    front += P(smooth([[cx - 10.8, cy + 2], [cx - 8, cy - 7], [cx - 2, cy - 4.5], [cx + 3, cy - 7], [cx + 9, cy - 6], [cx + 10.8, cy + 2], [cx + 7, cy - 2.5], [cx, cy - 2], [cx - 7, cy - 2.5]]), L.hair, { k: 0.8 });
    front += P(path(`M${f(cx - 13.5)} ${f(cy + 6)} C${f(cx - 15)} ${f(cy - 17)} ${f(cx + 15)} ${f(cy - 17)} ${f(cx + 13.5)} ${f(cy + 6)} C${f(cx + 12)} ${f(cy - 5)} ${f(cx + 7)} ${f(cy - 9.5)} ${f(cx)} ${f(cy - 9.5)} C${f(cx - 7)} ${f(cy - 9.5)} ${f(cx - 12)} ${f(cy - 5)} ${f(cx - 13.5)} ${f(cy + 6)} Z`), L.cape);
    front += line(`M${f(cx - 8)} ${f(cy - 7.5)} Q${f(cx)} ${f(cy - 10.5)} ${f(cx + 8)} ${f(cy - 7.5)}`, L.trim, 0.9);
    front += gem(cx, cy - 7.8, 2.2, 2.6, L.accent);
  }
  return { back, front };
}

function headBack(L, cx, cy) {
  const r = 11.2;
  let s = P(circle(cx, cy, r), L.head === 'helm' ? L.metal : L.hair, { lt: 0.1 });
  if (L.head === 'hood') s += P(smooth([[cx - 13, cy + 3], [cx - 12.5, cy - 8], [cx, cy - 14], [cx + 12.5, cy - 8], [cx + 13, cy + 3], [cx + 6, cy + 13], [cx, cy + 15], [cx - 6, cy + 13]]), L.cape) + line(`M${f(cx)} ${f(cy - 12)} L${f(cx)} ${f(cy + 12)}`, shift(L.cape, -0.15), 1, 0.6);
  if (L.head === 'veil') s += P(smooth([[cx - 13.5, cy + 6], [cx - 13, cy - 8], [cx, cy - 14.5], [cx + 13, cy - 8], [cx + 13.5, cy + 6], [cx + 9, cy + 17], [cx, cy + 19], [cx - 9, cy + 17]]), L.cape) + line(`M${f(cx - 8)} ${f(cy - 7.5)} Q${f(cx)} ${f(cy - 11.5)} ${f(cx + 8)} ${f(cy - 7.5)}`, L.trim, 0.9);
  if (L.head === 'hat') {
    s += P(ellipse(cx, cy - 6.5, 16, 4.4), L.cape, { k: 1 });
    s += P(path(`M${f(cx - 9.5)} ${f(cy - 7)} C${f(cx - 7)} ${f(cy - 16)} ${f(cx + 1)} ${f(cy - 21)} ${f(cx - 10)} ${f(cy - 23)} C${f(cx - 6)} ${f(cy - 18)} ${f(cx + 7)} ${f(cy - 13)} ${f(cx + 9.5)} ${f(cy - 7)} Z`), L.cape);
    s += P(path(`M${f(cx - 9.5)} ${f(cy - 7)} L${f(cx + 9.5)} ${f(cy - 7)} L${f(cx + 9.2)} ${f(cy - 9.6)} L${f(cx - 9.1)} ${f(cy - 9.6)} Z`), L.trim, { sw: 1, k: 0.5 });
  }
  if (L.head === 'helm') {
    s += P(smooth([[cx - 2.5, cy - 11], [cx - 2, cy - 16], [cx, cy - 19], [cx + 2, cy - 16], [cx + 2.5, cy - 11], [cx + 1.5, cy + 4], [cx - 1.5, cy + 4]]), L.accent, { k: 1 });
    s += P(capsule(cx - 10, cy + 2, cx - 11, cy + 12, 2.2, 1.8), L.hair, { k: 0.8 }) + P(capsule(cx + 10, cy + 2, cx + 11, cy + 12, 2.2, 1.8), L.hair, { k: 0.8 });
  }
  return s;
}

function headSide(L, cx, cy, o) {
  // perfil voltado para a direita
  const r = 11;
  let back = '', front = '';
  if (L.head === 'hood') back += P(smooth([[cx + 9, cy + 6], [cx + 10, cy - 8], [cx - 2, cy - 14], [cx - 13, cy - 7], [cx - 15, cy + 4], [cx - 9, cy + 12]]), L.cape);
  if (L.head === 'veil') back += P(smooth([[cx + 9, cy + 7], [cx + 10, cy - 8], [cx - 2, cy - 14.5], [cx - 13, cy - 7], [cx - 16, cy + 8], [cx - 10, cy + 17], [cx - 3, cy + 13]]), L.cape) + P(smooth([[cx - 4, cy - 2], [cx - 10, cy + 2], [cx - 11, cy + 13], [cx - 5, cy + 12], [cx - 2, cy + 4]]), L.hair, { k: 1 });
  if (L.head === 'helm') back += P(capsule(cx - 8, cy + 2, cx - 11, cy + 13, 2.3, 1.8), L.hair, { k: 0.8 });
  if (L.head === 'hat') back += P(smooth([[cx - 3, cy - 3], [cx - 11, cy - 1], [cx - 11, cy + 7], [cx - 4, cy + 8]]), L.hair, { k: 1 });
  front += P(path(`M${f(cx + 6)} ${f(cy - 9)} C${f(cx + 13)} ${f(cy - 5)} ${f(cx + 12.5)} ${f(cy + 0)} ${f(cx + 12.2)} ${f(cy + 1.8)} L${f(cx + 13.6)} ${f(cy + 4)} L${f(cx + 11.5)} ${f(cy + 5)} C${f(cx + 11)} ${f(cy + 9)} ${f(cx + 5)} ${f(cy + 11.5)} ${f(cx - 1)} ${f(cy + 10.5)} C${f(cx - 10)} ${f(cy + 9.5)} ${f(cx - 11.5)} ${f(cy - 3)} ${f(cx - 6)} ${f(cy - 8.5)} C${f(cx - 2)} ${f(cy - 12)} ${f(cx + 3)} ${f(cy - 11)} ${f(cx + 6)} ${f(cy - 9)} Z`), L.skin, { lt: 0.06, dk: 0.08, sd: 0.12 });
  front += flat(ellipse(cx + 6.5, cy + 4.6, 2, 1.2), '#ff7a8a', { op: 0.35 });
  const ex = cx + 6.8, ey = cy + 1.4;
  if (o.hurt) front += line(`M${f(ex - 1.6)} ${f(ey - 1.6)} L${f(ex + 1.2)} ${f(ey)} L${f(ex - 1.6)} ${f(ey + 1.6)}`, OUT, 1.2);
  else if (o.blink) front += line(`M${f(ex - 1.5)} ${f(ey)} Q${f(ex)} ${f(ey + 1.2)} ${f(ex + 1.5)} ${f(ey)}`, OUT, 1.1);
  else {
    const glow = L.head === 'veil' ? L.accent : null;
    if (glow) front += aura(ex, ey, 4, glow, 0.5);
    front += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="1.45" ry="2.3" fill="${glow ? mix(glow, '#2a1050', 0.3) : '#2b1b30'}"/><circle cx="${f(ex - 0.2)}" cy="${f(ey - 0.9)}" r="0.7" fill="#fff"/>`;
  }
  if (L.head === 'hood') {
    front += P(smooth([[cx + 9.5, cy - 3], [cx + 5, cy - 8.5], [cx - 3, cy - 8], [cx - 6, cy - 2], [cx - 1, cy - 4], [cx + 4, cy - 4.5]]), L.hair, { k: 0.8 });
    front += P(path(`M${f(cx + 9)} ${f(cy + 6)} C${f(cx + 14)} ${f(cy - 4)} ${f(cx + 9)} ${f(cy - 15)} ${f(cx - 2)} ${f(cy - 14)} C${f(cx - 12)} ${f(cy - 13)} ${f(cx - 15)} ${f(cy - 2)} ${f(cx - 11)} ${f(cy + 7)} C${f(cx - 7)} ${f(cy + 2)} ${f(cx - 4)} ${f(cy - 6)} ${f(cx + 2)} ${f(cy - 8)} C${f(cx + 7)} ${f(cy - 9)} ${f(cx + 9)} ${f(cy - 2)} ${f(cx + 9)} ${f(cy + 6)} Z`), L.cape);
    front += line(`M${f(cx + 8.5)} ${f(cy + 3)} C${f(cx + 9.5)} ${f(cy - 7)} ${f(cx + 3)} ${f(cy - 10)} ${f(cx - 4)} ${f(cy - 7)}`, L.trim, 0.9, 0.9);
  } else if (L.head === 'hat') {
    front += P(smooth([[cx + 8, cy - 4], [cx + 4, cy - 7.5], [cx - 4, cy - 7], [cx - 7, cy - 2], [cx - 2, cy - 4.5], [cx + 3, cy - 4.5]]), L.hair, { k: 0.8 });
    front += P(ellipse(cx + 1, cy - 6.5, 15.5, 3.8, -6), L.cape, { k: 1 });
    front += P(path(`M${f(cx - 8)} ${f(cy - 7.5)} C${f(cx - 8)} ${f(cy - 16)} ${f(cx - 3)} ${f(cy - 21)} ${f(cx - 14)} ${f(cy - 23)} C${f(cx - 2)} ${f(cy - 22)} ${f(cx + 7)} ${f(cy - 15)} ${f(cx + 9.5)} ${f(cy - 8.5)} Z`), L.cape);
    front += P(path(`M${f(cx - 8)} ${f(cy - 7.5)} L${f(cx + 9.5)} ${f(cy - 8.5)} L${f(cx + 9)} ${f(cy - 11)} L${f(cx - 8)} ${f(cy - 10)} Z`), L.trim, { sw: 1, k: 0.5 });
  } else if (L.head === 'helm') {
    front += P(path(`M${f(cx + 11)} ${f(cy + 1)} C${f(cx + 13)} ${f(cy - 14)} ${f(cx - 12)} ${f(cy - 16)} ${f(cx - 11.5)} ${f(cy + 3)} L${f(cx - 6)} ${f(cy + 5)} C${f(cx - 6)} ${f(cy - 2)} ${f(cx - 1)} ${f(cy - 3)} ${f(cx + 3)} ${f(cy - 3)} L${f(cx + 10.5)} ${f(cy - 2.5)} Z`), L.metal, { lt: 0.18 });
    front += P(smooth([[cx - 4, cy - 12], [cx - 6, cy - 17], [cx - 12, cy - 19], [cx - 16, cy - 14], [cx - 11, cy - 13], [cx - 7, cy - 10]]), L.accent, { k: 1 });
    front += spec(cx + 2, cy - 8, 2.2, 1, 0.6);
  } else if (L.head === 'veil') {
    front += P(smooth([[cx + 9.5, cy + 1], [cx + 6, cy - 7], [cx - 2, cy - 6], [cx - 5, cy], [cx + 1, cy - 3], [cx + 6, cy - 2.5]]), L.hair, { k: 0.8 });
    front += P(path(`M${f(cx + 9.5)} ${f(cy + 7)} C${f(cx + 15)} ${f(cy - 4)} ${f(cx + 9)} ${f(cy - 15.5)} ${f(cx - 2)} ${f(cy - 14.5)} C${f(cx - 12)} ${f(cy - 13.5)} ${f(cx - 15)} ${f(cy - 2)} ${f(cx - 12)} ${f(cy + 8)} C${f(cx - 8)} ${f(cy + 2)} ${f(cx - 4)} ${f(cy - 7)} ${f(cx + 2)} ${f(cy - 8.5)} C${f(cx + 7)} ${f(cy - 9.5)} ${f(cx + 9.5)} ${f(cy - 2)} ${f(cx + 9.5)} ${f(cy + 7)} Z`), L.cape);
    front += gem(cx + 7.5, cy - 7, 1.8, 2.2, L.accent);
  }
  return { back, front };
}

// ---------------------------------------------------------------- corpo
/**
 * pose: { bob, lean, sq (achatamento), legL:[dx,dy], legR:[dx,dy], armL, armR (graus, 0 = para baixo),
 *         wpn: 'rest'|'aim'|'shoot', power, slash, blink, hurt, cape (vento 0..1), t }
 */
function drawDown(L, o) {
  const cx = 32, b = L.bulk;
  const hy = 22.5 - o.bob, ty = 33 - o.bob * 0.7;
  let s = '';
  // capa atrás
  const cw = 13 * b + o.cape * 2;
  s += P(smooth([[cx - 8 * b, ty], [cx - cw, 52 + o.cape], [cx - cw * 0.4, 54.5], [cx + cw * 0.4, 54.5], [cx + cw, 52 + o.cape], [cx + 8 * b, ty]]), L.cape, { lt: 0.04, dk: 0.16 });
  if (L.weapon === 'bow') s += P(rrect(cx + 6, ty - 6, 5, 13, 2, 22), '#6a3e26', { sw: 1, k: 0.6 }) + flat(poly([[cx + 9, ty - 9], [cx + 13, ty - 7], [cx + 11, ty - 4]]), L.cape);
  // pernas
  const leg = (sx, [dx, dy]) => {
    const x = cx + sx * 4 * b + dx, y0 = ty + 12, y1 = FY - 3 + dy;
    return P(capsule(x, y0, x, y1, 2.8 * b, 2.4 * b), shift(L.cloth, -0.18), { sw: SW, k: 0.7 }) + P(path(`M${f(x - 3.2 * b)} ${f(y1 - 1)} Q${f(x - 3.4 * b)} ${f(y1 + 3.6)} ${f(x)} ${f(y1 + 3.4)} Q${f(x + 3.4 * b)} ${f(y1 + 3.6)} ${f(x + 3.2 * b)} ${f(y1 - 1)} Z`), L.boots, { sw: SW, k: 0.7 });
  };
  s += leg(-1, o.legL) + leg(1, o.legR);
  // torso / túnica
  const tw = 9.5 * b;
  if (L.robe) s += P(smooth([[cx - tw + 0.5, ty + 1], [cx - tw - 3, 53 - o.bob * 0.3], [cx, 54.5 - o.bob * 0.3], [cx + tw + 3, 53 - o.bob * 0.3], [cx + tw - 0.5, ty + 1]]), L.cloth, { lt: 0.08 });
  s += P(path(`M${f(cx - tw)} ${f(ty + 2)} Q${f(cx - tw)} ${f(ty - 1)} ${f(cx - tw + 3)} ${f(ty - 1)} L${f(cx + tw - 3)} ${f(ty - 1)} Q${f(cx + tw)} ${f(ty - 1)} ${f(cx + tw)} ${f(ty + 2)} L${f(cx + tw - 1)} ${f(ty + 13)} Q${f(cx)} ${f(ty + 15)} ${f(cx - tw + 1)} ${f(ty + 13)} Z`), L.cloth, { lt: 0.1 });
  s += P(rrect(cx - tw + 0.6, ty + 9.5, (tw - 0.6) * 2, 2.6, 1.2), L.trim, { sw: 1, k: 0.5 }) + P(circle(cx, ty + 10.8, 1.6), L.accent, { sw: 0.9, k: 0.5, glow: true });
  s += line(`M${f(cx - 3)} ${f(ty - 0.5)} L${f(cx)} ${f(ty + 4)} L${f(cx + 3)} ${f(ty - 0.5)}`, shift(L.cloth, -0.25), 1, 0.7);
  if (L.head === 'helm' || b > 1.05) for (const sg of [-1, 1]) s += P(ellipse(cx + sg * (tw - 0.5), ty + 1.5, 4.6, 3.6, sg * 15), L.metal, { k: 0.8, lt: 0.16 }) + spec(cx + sg * (tw - 0.5) - 1.5, ty + 0.3, 1.4, 0.7, 0.6);
  // braços
  const arm = (sg, ang) => {
    const sx = cx + sg * (tw - 0.5), sy = ty + 1.5;
    const a = (ang * Math.PI) / 180;
    const ex = sx + Math.sin(a) * 9.5 * sg, ey = sy + Math.cos(a) * 9.5;
    return { sh: P(capsule(sx, sy, ex, ey, 2.5 * b, 2.1 * b), L.cloth, { sw: SW, k: 0.6 }) + P(circle(ex, ey + 0.4, 2.3 * b), L.skin, { sw: SW, k: 0.6 }), ex, ey };
  };
  const A = arm(-1, o.armL ?? 0), B = arm(1, o.armR ?? 0);
  // arma atrás das mãos quando em repouso
  let wpnBack = '', wpnFront = '';
  if (L.weapon === 'bow') {
    if (o.wpn === 'rest') wpnBack += bow(L, A.ex - 1, A.ey - 11, A.ey + 11);
    else wpnFront += bow(L, ty + 12, cx - 12, cx + 12, o.wpn === 'shoot' ? 1 : 5, true, 1);
  } else if (L.weapon === 'staff') {
    wpnBack += staff(L, B.ex + 1, o.wpn === 'rest' ? 13 - o.bob : 8 - o.bob, B.ey + 13, o.power);
  } else if (L.weapon === 'sword') {
    wpnFront += sword(L, B.ex, B.ey, o.swordAng ?? -20, o.slash);
  } else if (L.weapon === 'orb') {
    wpnFront += orb(L, B.ex + 3, B.ey - 4 - (o.power ?? 0) * 3, o.power, o.t);
  }
  s += wpnBack + A.sh + B.sh;
  // cabeça
  const hd = headFront(L, cx, hy, o);
  s += hd.back + hd.front + wpnFront;
  return s;
}

function drawUp(L, o) {
  const cx = 32, b = L.bulk;
  const hy = 22.5 - o.bob, ty = 33 - o.bob * 0.7;
  let s = '';
  const tw = 9.5 * b;
  // arma à frente do corpo (fica atrás, visto de costas)
  if (L.weapon === 'staff') s += staff(L, cx + tw + 3, o.wpn === 'rest' ? 12 - o.bob : 6 - o.bob, 50, o.power);
  if (L.weapon === 'orb') s += orb(L, cx + tw + 4, ty + 2 - (o.power ?? 0) * 4, o.power, o.t);
  if (L.weapon === 'bow' && o.wpn !== 'rest') s += bow(L, ty - 1, cx - 12, cx + 12, o.wpn === 'shoot' ? 1 : 5, true, -1);
  const leg = (sx, [dx, dy]) => {
    const x = cx + sx * 4 * b + dx, y0 = ty + 12, y1 = FY - 3 + dy;
    return P(capsule(x, y0, x, y1, 2.8 * b, 2.4 * b), shift(L.cloth, -0.22), { sw: SW, k: 0.7 }) + P(ellipse(x, y1 + 1.4, 3.2 * b, 2.6), L.boots, { sw: SW, k: 0.7 });
  };
  s += leg(-1, o.legL) + leg(1, o.legR);
  s += P(rrect(cx - tw, ty - 1, tw * 2, 15, 4), shift(L.cloth, -0.06));
  const arm = (sg, ang) => {
    const sx = cx + sg * (tw - 0.5), sy = ty + 1.5;
    const a = (ang * Math.PI) / 180;
    const ex = sx - Math.sin(a) * 9.5 * sg, ey = sy + Math.cos(a) * 9.5;
    return P(capsule(sx, sy, ex, ey, 2.5 * b, 2.1 * b), shift(L.cloth, -0.08), { sw: SW, k: 0.6 }) + P(circle(ex, ey + 0.4, 2.3 * b), L.skin, { sw: SW, k: 0.6 });
  };
  s += arm(-1, o.armL ?? 0) + arm(1, o.armR ?? 0);
  if (L.weapon === 'sword') s += sword(L, cx + tw + 1, ty + 10, o.swordAng ?? -20, o.slash);
  // capa cobrindo as costas
  const cw = 12.5 * b + o.cape * 2;
  s += P(smooth([[cx - 8.5 * b, ty - 1], [cx - cw, 51 + o.cape], [cx - cw * 0.35, 54.5], [cx, 53.5], [cx + cw * 0.35, 54.5], [cx + cw, 51 + o.cape], [cx + 8.5 * b, ty - 1]]), L.cape, { lt: 0.08, dk: 0.12 });
  s += line(`M${f(cx - 4)} ${f(ty + 4)} Q${f(cx - 5)} ${f(ty + 12)} ${f(cx - 6.5)} 52`, shift(L.cape, -0.18), 0.9, 0.7) + line(`M${f(cx + 4)} ${f(ty + 4)} Q${f(cx + 5)} ${f(ty + 12)} ${f(cx + 6.5)} 52`, shift(L.cape, -0.18), 0.9, 0.7);
  if (L.weapon === 'bow') s += P(rrect(cx - 3, ty - 4, 6, 15, 2.4, 14), '#6a3e26', { sw: 1, k: 0.6 }) + flat(poly([[cx - 2, ty - 7], [cx + 3, ty - 5], [cx, ty - 2]]), L.cape) + (o.wpn === 'rest' ? bow(L, cx - tw - 3, ty - 6, ty + 16) : '');
  if (L.head === 'helm' || b > 1.05) for (const sg of [-1, 1]) s += P(ellipse(cx + sg * (tw - 0.5), ty + 1.5, 4.6, 3.6, sg * 15), L.metal, { k: 0.8, lt: 0.16 });
  s += headBack(L, cx, hy);
  return s;
}

function drawSide(L, o) {
  // perfil para a direita; membros "de trás" mais escuros
  const cx = 31, b = L.bulk;
  const hy = 22.5 - o.bob, ty = 33 - o.bob * 0.7;
  const tw = 6.8 * b;
  let s = '';
  const legSide = (dx, dy, dark) => {
    const x0 = cx, y0 = ty + 12;
    const x1 = cx + dx, y1 = FY - 3 + dy;
    const c = shift(L.cloth, dark ? -0.3 : -0.18);
    return P(capsule(x0, y0, x1, y1, 2.8 * b, 2.4 * b), c, { sw: SW, k: 0.7 }) + P(path(`M${f(x1 - 2.6 * b)} ${f(y1 - 1)} Q${f(x1 - 3)} ${f(y1 + 3.4)} ${f(x1 + 1)} ${f(y1 + 3.4)} L${f(x1 + 4.6 * b)} ${f(y1 + 3.2)} Q${f(x1 + 4.8 * b)} ${f(y1 + 0.5)} ${f(x1 + 2.6 * b)} ${f(y1 - 1)} Z`), dark ? shift(L.boots, -0.08) : L.boots, { sw: SW, k: 0.7 });
  };
  const armSide = (ang, dark, lift = 0) => {
    const sx = cx + 0.5, sy = ty + 1.8;
    const a = (ang * Math.PI) / 180;
    const ex = sx + Math.sin(a) * 9.5, ey = sy + Math.cos(a) * 9.5 - lift;
    return { s: P(capsule(sx, sy, ex, ey, 2.5 * b, 2.1 * b), shift(L.cloth, dark ? -0.15 : 0), { sw: SW, k: 0.6 }) + P(circle(ex, ey + 0.4, 2.3 * b), shift(L.skin, dark ? -0.1 : 0), { sw: SW, k: 0.6 }), ex, ey };
  };
  // braço de trás + perna de trás
  const back = armSide(-(o.armL ?? 0), true);
  s += back.s;
  s += legSide(o.legL[0], o.legL[1], true);
  // capa ao vento (para trás = esquerda)
  const cl = 9 + o.cape * 6;
  s += P(smooth([[cx - 3, ty - 1], [cx - 5 - cl * 0.4, ty + 8], [cx - 4 - cl, 51 - o.cape * 4], [cx - 3, 54], [cx + 1, 50], [cx + 1, ty + 4]]), L.cape, { lt: 0.04, dk: 0.16 });
  if (L.weapon === 'bow') s += P(rrect(cx - 9, ty - 5, 5, 13, 2, -28), '#6a3e26', { sw: 1, k: 0.6 }) + flat(poly([[cx - 10, ty - 8], [cx - 6, ty - 8], [cx - 8, ty - 4]]), L.cape);
  s += legSide(o.legR[0], o.legR[1], false);
  if (L.robe) s += P(smooth([[cx - tw + 1, ty + 1], [cx - tw - 2, 53 - o.bob * 0.3], [cx + 2, 54.5 - o.bob * 0.3], [cx + tw + 3, 52.5 - o.bob * 0.3], [cx + tw - 0.5, ty + 1]]), L.cloth, { lt: 0.08 });
  s += P(path(`M${f(cx - tw)} ${f(ty + 2)} Q${f(cx - tw)} ${f(ty - 1)} ${f(cx - tw + 3)} ${f(ty - 1)} L${f(cx + tw - 2)} ${f(ty - 1)} Q${f(cx + tw + 1)} ${f(ty)} ${f(cx + tw + 0.5)} ${f(ty + 4)} L${f(cx + tw - 0.5)} ${f(ty + 13)} Q${f(cx)} ${f(ty + 14.5)} ${f(cx - tw + 1)} ${f(ty + 13)} Z`), L.cloth, { lt: 0.1 });
  s += P(rrect(cx - tw + 0.6, ty + 9.5, (tw - 0.6) * 2 + 0.4, 2.6, 1.2), L.trim, { sw: 1, k: 0.5 });
  if (L.head === 'helm' || b > 1.05) s += P(ellipse(cx + 1, ty + 1.5, 5, 3.8, 10), L.metal, { k: 0.8, lt: 0.16 }) + spec(cx - 0.5, ty + 0.3, 1.4, 0.7, 0.6);
  const hd = headSide(L, cx + 1, hy, o);
  s += hd.back + hd.front;
  // braço da frente + arma
  const fa = armSide(o.armR ?? 0, false, o.wpn !== 'rest' ? 1 : 0);
  if (L.weapon === 'bow') s += o.wpn === 'rest' ? bow(L, fa.ex + 1, fa.ey - 11, fa.ey + 11) + fa.s : fa.s + bow(L, cx + 13, ty - 7, ty + 15, o.wpn === 'shoot' ? 0.5 : -6, false, 1);
  else if (L.weapon === 'staff') s += staff(L, cx + 16, o.wpn === 'rest' ? 13 - o.bob : 7 - o.bob, fa.ey + 13, o.power) + fa.s;
  else if (L.weapon === 'sword') s += fa.s + sword(L, fa.ex, fa.ey, o.swordAng ?? -20, o.slash);
  else s += fa.s + orb(L, fa.ex + 4 + (o.power ?? 0) * 3, fa.ey - 4, o.power, o.t);
  return s;
}

// ---------------------------------------------------------------- poses e animações
const base = () => ({ bob: 0, lean: 0, sq: 0, legL: [0, 0], legR: [0, 0], armL: 8, armR: 8, wpn: 'rest', power: 0, slash: 0, blink: false, hurt: false, cape: 0, t: 0 });

function pose(anim, dir, i, n, L) {
  const o = base();
  const t = i / n;
  o.t = t;
  const p = t * TAU;
  const side = dir === 'right';
  if (anim === 'idle') {
    o.bob = Math.sin(p) * 0.7;
    o.armL = o.armR = 8 + Math.sin(p) * 2;
    o.cape = 0.15 + Math.sin(p) * 0.15;
    o.blink = i === n - 1;
    o.power = 0.15 + Math.sin(p) * 0.15;
  } else if (anim === 'walk') {
    o.bob = Math.abs(Math.sin(p)) * 1.4;
    const sw = Math.sin(p);
    if (side) {
      o.legL = [-sw * 5, -Math.max(0, -Math.cos(p)) * 1.5];
      o.legR = [sw * 5, -Math.max(0, Math.cos(p)) * 1.5];
      o.armL = sw * 28;
      o.armR = -sw * 28;
    } else {
      o.legL = [0, -Math.max(0, sw) * 2.4];
      o.legR = [0, -Math.max(0, -sw) * 2.4];
      o.armL = 10 + sw * 18;
      o.armR = 10 - sw * 18;
    }
    o.cape = 0.6 + Math.abs(sw) * 0.4;
    o.lean = side ? 5 : 0;
    o.power = 0.2;
  } else if (anim === 'shoot') {
    const k = [0.3, 1, 0.8, 0.4][i] ?? 0.5;
    o.wpn = i === 0 ? 'aim' : i === 1 ? 'shoot' : 'aim';
    o.power = k;
    if (L.weapon === 'bow') {
      o.armL = side ? -70 : 50;
      o.armR = side ? -70 : 50;
      if (i >= 2) o.wpn = 'aim';
    } else if (L.weapon === 'sword') {
      o.swordAng = [-130, -40, 50, 80][i];
      o.slash = [0, 1, 0.8, 0.3][i];
      o.armR = side ? [-150, -60, 30, 40][i] : [120, 60, -10, -20][i];
    } else {
      o.armR = side ? -60 - k * 30 : 70 + k * 40;
    }
    o.lean = side ? -3 + k * 6 : 0;
  } else if (anim === 'dash') {
    o.lean = side ? 16 : 0;
    o.sq = [0.12, -0.1, 0][i] ?? 0;
    o.cape = 1.6;
    o.armL = side ? -50 : 35;
    o.armR = side ? -50 : 35;
    o.legL = side ? [-6, -2] : [0, -2.5];
    o.legR = side ? [5, 0] : [0, -1];
    o.bob = 2;
  } else if (anim === 'hurt') {
    o.hurt = true;
    o.lean = side ? -12 : 0;
    o.sq = -0.06;
    o.armL = o.armR = 40;
    o.bob = -0.5;
  }
  return o;
}

function frameSvg(L, dir, o) {
  const fn = dir === 'up' ? drawUp : dir === 'down' ? drawDown : drawSide;
  let s = fn(L, o);
  const sx = 1 - o.sq * 0.6, sy = 1 + o.sq;
  s = `<g transform="translate(32 ${FY}) rotate(${f(o.lean)}) scale(${f(sx)} ${f(sy)}) translate(-32 ${-FY})">${s}</g>`;
  if (dir === 'left') s = mirror(s, W);
  return s;
}

function deathFrame(L, i) {
  const o = base();
  o.hurt = true;
  const k = i / 7;
  const ang = Math.min(1, k * 1.5) ** 2 * 88;
  o.bob = -Math.min(1, k * 3) * 3;
  o.armL = o.armR = 30 + k * 50;
  let s = drawSide(L, o);
  s = `<g transform="translate(32 ${FY}) rotate(${f(-ang)}) translate(-32 ${-FY})" opacity="${f(i >= 6 ? 0.85 - (i - 6) * 0.2 : 1)}">${s}</g>`;
  if (i >= 4) {
    // centelhas da alma subindo
    for (let j = 0; j < 4; j++) {
      const y = 46 - (i - 4) * 7 - j * 4;
      s += aura(20 + j * 8, y, 4, L.accent, 0.7 - (i - 4) * 0.12);
    }
  }
  return s;
}

export function heroSprites(id) {
  const L = LOOKS[id];
  const sprites = [];
  const animations = {};
  const counts = { idle: 4, walk: 8, shoot: 4, dash: 3, hurt: 2 };
  for (const dir of ['down', 'up', 'right', 'left']) {
    for (const [anim, n] of Object.entries(counts)) {
      const name = `hero_${id}_${anim}_${dir}`;
      animations[name] = [];
      for (let i = 0; i < n; i++) {
        const o = pose(anim, dir === 'left' ? 'right' : dir, i, n, L);
        sprites.push({ name: `${name}_${i}`, w: W, h: H, svg: frameSvg(L, dir, o) });
        animations[name].push(`${name}_${i}`);
      }
    }
    sprites.push({ name: `hero_${id}_flash_${dir}`, w: W, h: H, svg: whiteFlash(frameSvg(L, dir, pose('hurt', dir === 'left' ? 'right' : dir, 0, 2, L))) });
  }
  animations[`hero_${id}_death`] = [];
  for (let i = 0; i < 8; i++) {
    sprites.push({ name: `hero_${id}_death_${i}`, w: W, h: H, svg: deathFrame(L, i) });
    animations[`hero_${id}_death`].push(`hero_${id}_death_${i}`);
  }
  return { sprites, animations };
}

/** retrato (corpo inteiro, frente) */
export function heroPortrait(id) {
  const L = LOOKS[id];
  const o = base();
  o.power = 0.4;
  return frameSvg(L, 'down', o);
}
