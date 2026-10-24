// Atlas de efeitos: texturas brancas suaves (tingidas no jogo), projéteis, coletáveis,
// avisos de perigo e magias em estilo vetorial com brilho.
import { part, flat, line, spec, aura, gem, capsule, circle, ellipse, rrect, path, smooth, poly, shift, mix, f, TAU, OUT, rng, uid } from './lib.mjs';

const P = (shape, c, o = {}) => part(shape, c, { sw: 1, k: 0.8, ...o });
const radial = (cx, cy, r, stops) => {
  const id = uid('r');
  return `<defs><radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient></defs>`;
};
const softDisc = (w, h, stops) => {
  const id = uid('r');
  return `<defs><radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient></defs><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="url(#${id})"/>`;
};
const linGrad = (x1, y1, x2, y2, stops) => {
  const id = uid('l');
  return [`<defs><linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient></defs>`, `url(#${id})`];
};
const ringStroke = (cx, cy, r, w, color = '#fff', op = 1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`;
const blurDef = (sd) => {
  const id = uid('b');
  return [`<defs><filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter></defs>`, `filter="url(#${id})"`];
};

const S = [];
const A = {};
const add = (name, w, h, svg) => S.push({ name, w, h, svg });
const anim = (name, n, w, h, fn) => {
  A[name] = [];
  for (let i = 0; i < n; i++) {
    add(`${name}_${i}`, w, h, fn(i, n));
    A[name].push(`${name}_${i}`);
  }
};

export function fxSprites() {
  S.length = 0;
  for (const k of Object.keys(A)) delete A[k];
  // ---------------------------------------------------------------- texturas suaves (tingidas)
  {
    const id = uid('v');
    add('vignette', 256, 256, `<defs><radialGradient id="${id}" cx="0.5" cy="0.5" r="0.72"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="0.8" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.8"/></radialGradient></defs><rect width="256" height="256" fill="url(#${id})"/>`);
  }
  add('light', 128, 128, softDisc(128, 128, [[0, '#fff', 1], [0.35, '#fff', 0.7], [0.7, '#fff', 0.2], [1, '#fff', 0]]));
  add('glow', 64, 64, softDisc(64, 64, [[0, '#fff', 1], [0.3, '#fff', 0.55], [0.65, '#fff', 0.15], [1, '#fff', 0]]));
  add('glow_hard', 32, 32, softDisc(32, 32, [[0, '#fff', 1], [0.55, '#fff', 0.85], [0.8, '#fff', 0.3], [1, '#fff', 0]]));
  add('dot', 4, 4, softDisc(4, 4, [[0, '#fff', 1], [0.6, '#fff', 0.9], [1, '#fff', 0]]));
  add('ember', 6, 6, softDisc(6, 6, [[0, '#fff', 1], [0.45, '#fff', 0.85], [1, '#fff', 0]]));
  add('spark', 12, 3, softDisc(12, 3, [[0, '#fff', 1], [0.5, '#fff', 0.8], [1, '#fff', 0]]));
  add('streak', 32, 4, softDisc(32, 4, [[0, '#fff', 1], [0.5, '#fff', 0.6], [1, '#fff', 0]]));
  add('star', 16, 16, aura(8, 8, 8, '#ffffff', 0.6) + flat(path('M8 0.5 L9.4 6.6 L15.5 8 L9.4 9.4 L8 15.5 L6.6 9.4 L0.5 8 L6.6 6.6 Z'), '#fff'));
  add('shadow', 32, 14, softDisc(32, 14, [[0, '#000', 0.75], [0.6, '#000', 0.5], [1, '#000', 0]]));
  for (let i = 0; i < 4; i++) {
    const r = rng(i * 7 + 3);
    let s = '';
    const [bd, ba] = blurDef(1.6);
    s += bd + `<g ${ba}>`;
    for (let j = 0; j < 5; j++) s += `<circle cx="${f(10 + r() * 12)}" cy="${f(10 + r() * 12)}" r="${f(5 + r() * 4)}" fill="#fff" opacity="${f(0.35 + r() * 0.25)}"/>`;
    s += '</g>';
    add(`smoke_${i}`, 32, 32, s);
  }
  {
    const [d1, u1] = linGrad(0, 0, 48, 0, [[0, '#ff7a20', 0], [0.6, '#ffb040', 0.7], [1, '#fff0b0', 1]]);
    add('trail_amber', 48, 6, d1 + `<path d="M0 3 L44 0.6 Q48 3 44 5.4 Z" fill="${u1}"/>`);
    const [d2, u2] = linGrad(0, 0, 48, 0, [[0, '#fff', 0], [0.7, '#fff', 0.6], [1, '#fff', 1]]);
    add('trail_white', 48, 6, d2 + `<path d="M0 3 L44 0.8 Q48 3 44 5.2 Z" fill="${u2}"/>`);
  }
  // anéis
  add('ring', 128, 128, ringStroke(64, 64, 59, 3.5, '#fff', 0.95) + ringStroke(64, 64, 59, 9, '#fff', 0.18));
  add('ring_thick', 128, 128, ringStroke(64, 64, 48, 12, '#fff', 0.25) + ringStroke(64, 64, 48, 6, '#fff', 0.85) + ringStroke(64, 64, 48, 2, '#fff', 1));
  add('beam', 40, 160, (() => { const [d, u] = linGrad(0, 0, 40, 0, [[0, '#fff', 0], [0.5, '#fff', 0.9], [1, '#fff', 0]]); const [d2, u2] = linGrad(0, 0, 0, 160, [[0, '#fff', 0], [0.3, '#fff', 1], [1, '#fff', 1]]); return d + d2 + `<mask id="bm"><rect width="40" height="160" fill="${u2}"/></mask><rect width="40" height="160" fill="${u}" mask="url(#bm)"/>`; })());
  // avisos de perigo (brancos, tingidos de vermelho/laranja no jogo)
  add('tele_circle', 128, 128, `<circle cx="64" cy="64" r="60" fill="#fff" opacity="0.28"/>` + ringStroke(64, 64, 60, 3, '#fff', 1) + ringStroke(64, 64, 52, 1.2, '#fff', 0.55));
  add('tele_line', 128, 24, `<rect x="0" y="2" width="128" height="20" rx="10" fill="#fff" opacity="0.3"/><rect x="1" y="2" width="126" height="20" rx="10" fill="none" stroke="#fff" stroke-width="2"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${14 + i * 20} 7 L${22 + i * 20} 12 L${14 + i * 20} 17" fill="none" stroke="#fff" stroke-width="2" opacity="0.7"/>`).join(''));
  {
    const a = (32 * Math.PI) / 180;
    const x = 126 * Math.cos(a), y = 126 * Math.sin(a);
    add('tele_cone', 128, 128, `<path d="M0 64 L${f(x)} ${f(64 - y)} A126 126 0 0 1 ${f(x)} ${f(64 + y)} Z" fill="#fff" opacity="0.28"/><path d="M0 64 L${f(x)} ${f(64 - y)} A126 126 0 0 1 ${f(x)} ${f(64 + y)} Z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>`);
  }
  // coroa de brasas
  const crown = (R, sz, tint = '#e8b04a') => {
    let s = '';
    s += ringStroke(sz / 2, sz / 2, R, 5.5, OUT) + ringStroke(sz / 2, sz / 2, R, 3.5, tint) + ringStroke(sz / 2, sz / 2, R - 1, 1, '#fff2b0', 0.8);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const x = sz / 2 + Math.cos(a) * R, y = sz / 2 + Math.sin(a) * R;
      s += i % 3 === 0 ? gem(x, y, 3, 3.6, '#ff8a3a', (a * 180) / Math.PI + 90) : `<circle cx="${f(x)}" cy="${f(y)}" r="1.3" fill="#fff2b0"/>`;
    }
    return s;
  };
  add('crown_ring', 128, 128, crown(55, 128));
  add('crown_ring_small', 96, 96, crown(40, 96));
  add('sigil', 128, 128, (() => {
    let s = ringStroke(64, 64, 58, 2.4, '#fff', 0.9) + ringStroke(64, 64, 50, 1.2, '#fff', 0.6) + ringStroke(64, 64, 30, 1.6, '#fff', 0.8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      s += line(`M${f(64 + Math.cos(a) * 30)} ${f(64 + Math.sin(a) * 30)} L${f(64 + Math.cos(a) * 50)} ${f(64 + Math.sin(a) * 50)}`, '#fff', 1.4, 0.7);
      s += `<circle cx="${f(64 + Math.cos(a + 0.39) * 54)}" cy="${f(64 + Math.sin(a + 0.39) * 54)}" r="2.2" fill="#fff"/>`;
    }
    return s + `<path d="M64 40 L84 64 L64 88 L44 64 Z" fill="none" stroke="#fff" stroke-width="1.6"/>`;
  })());
  add('levelup', 128, 128, (() => {
    let s = aura(64, 64, 60, '#fff', 0.5);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const l = i % 2 ? 40 : 60;
      s += `<path d="M64 64 L${f(64 + Math.cos(a - 0.06) * 14)} ${f(64 + Math.sin(a - 0.06) * 14)} L${f(64 + Math.cos(a) * l)} ${f(64 + Math.sin(a) * l)} L${f(64 + Math.cos(a + 0.06) * 14)} ${f(64 + Math.sin(a + 0.06) * 14)} Z" fill="#fff" opacity="${i % 2 ? 0.6 : 0.95}"/>`;
    }
    return s;
  })());
  add('ice_ring', 128, 128, (() => {
    let s = ringStroke(64, 64, 59, 8, '#bff0ff', 0.35) + ringStroke(64, 64, 59, 3, '#e8fbff', 1);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      s += gem(64 + Math.cos(a) * 59, 64 + Math.sin(a) * 59, 3, 6, '#9ae8ff', (a * 180) / Math.PI + 90);
    }
    return s;
  })());
  add('thorns', 128, 128, (() => {
    let s = ringStroke(64, 64, 52, 6, OUT) + ringStroke(64, 64, 52, 4, '#5a8a3a');
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      const b = a + 0.12;
      s += P(poly([[64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50], [64 + Math.cos(b) * 62, 64 + Math.sin(b) * 62], [64 + Math.cos(a + 0.2) * 52, 64 + Math.sin(a + 0.2) * 52]]), '#8ac860', { sw: 0.8, k: 0.4 });
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.2;
      s += P(circle(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52, 3), '#ff5a7a', { sw: 0.8, k: 0.4 });
    }
    return s;
  })());
  add('crack', 96, 96, (() => {
    const r = rng(5);
    let s = aura(48, 48, 44, '#2a1810', 0.5);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + r() * 0.3;
      let x = 48, y = 48, d = `M48 48`;
      for (let j = 1; j <= 4; j++) {
        x = 48 + Math.cos(a + (r() - 0.5) * 0.4) * j * 11;
        y = 48 + Math.sin(a + (r() - 0.5) * 0.4) * j * 11;
        d += ` L${f(x)} ${f(y)}`;
      }
      s += line(d, '#1a0e0a', 3.4, 0.9) + line(d, '#ffb070', 1, 0.7);
    }
    return s;
  })());
  add('scorch', 48, 48, softDisc(48, 48, [[0, '#1a0e0a', 0.85], [0.5, '#2a1410', 0.6], [0.8, '#3a1a10', 0.25], [1, '#000', 0]]) + aura(24, 24, 10, '#ff7a30', 0.4));
  // ---------------------------------------------------------------- animações de magia
  anim('flame', 6, 24, 32, (i, n) => flame(i, n, ['#ff4a1a', '#ff9a2a', '#ffe070']));
  anim('flame_blue', 6, 24, 32, (i, n) => flame(i, n, ['#2a6aff', '#5ac8ff', '#e0f8ff']));
  anim('explosion', 6, 56, 56, (i, n) => {
    const k = i / (n - 1);
    let s = aura(28, 28, 10 + k * 18, '#ff9a3a', 0.9 * (1 - k * 0.7));
    const r = rng(11);
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * TAU + r() * 0.4;
      const d = 4 + k * 16;
      const rr = (7 - k * 4) * (0.7 + r() * 0.6);
      s += `<circle cx="${f(28 + Math.cos(a) * d)}" cy="${f(28 + Math.sin(a) * d)}" r="${f(Math.max(0.5, rr))}" fill="${k < 0.5 ? '#ffd060' : '#ff7a3a'}" opacity="${f(1 - k * 0.7)}"/>`;
    }
    if (k > 0.3) for (let j = 0; j < 6; j++) {
      const a = (j / 6) * TAU + 0.3;
      s += `<circle cx="${f(28 + Math.cos(a) * (8 + k * 14))}" cy="${f(28 + Math.sin(a) * (8 + k * 14))}" r="${f(5 * k)}" fill="#5a4a5a" opacity="${f(0.5 * (1 - k))}"/>`;
    }
    s += `<circle cx="28" cy="28" r="${f(Math.max(0.5, 9 - k * 9))}" fill="#fffbe0" opacity="${f(1 - k)}"/>`;
    return s;
  });
  anim('wind', 4, 80, 80, (i, n) => {
    const k = i / (n - 1);
    let s = '';
    for (let j = 0; j < 3; j++) {
      const r = 22 + j * 9 + k * 6;
      s += `<path d="M${f(40 + Math.cos(-0.9) * r)} ${f(40 + Math.sin(-0.9) * r)} A${r} ${r} 0 0 1 ${f(40 + Math.cos(0.9) * r)} ${f(40 + Math.sin(0.9) * r)}" fill="none" stroke="#f4f0e8" stroke-width="${f(5 - j * 1.4)}" stroke-linecap="round" opacity="${f((0.9 - j * 0.2) * (1 - k * 0.5))}"/>`;
    }
    return s;
  });
  anim('lotus', 4, 72, 72, (i, n) => {
    const k = (i + 1) / n;
    let s = aura(36, 36, 30 * k, '#7af0ff', 0.6);
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * TAU;
      s += `<g transform="rotate(${f((a * 180) / Math.PI)} 36 36)">${P(path(`M36 36 Q${f(36 + 6 * k)} ${f(36 - 14 * k)} 36 ${f(36 - 26 * k)} Q${f(36 - 6 * k)} ${f(36 - 14 * k)} 36 36 Z`), j % 2 ? '#6ae8ff' : '#aaf6ff', { sw: 0.8, k: 0.6 })}</g>`;
    }
    return s + gem(36, 36, 6 * k + 2, 7 * k + 2, '#e8fdff');
  });
  anim('bolt', 4, 64, 18, (i) => {
    const r = rng(i * 13 + 2);
    const pts = [[0, 9]];
    for (let j = 1; j < 8; j++) pts.push([j * 8, 9 + (r() - 0.5) * 12]);
    pts.push([64, 9]);
    const d = 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');
    return line(d, '#7aa8ff', 6, 0.35) + line(d, '#bfe0ff', 3, 0.9) + line(d, '#ffffff', 1.2);
  });
  anim('lance', 3, 56, 16, (i) => {
    let s = aura(44, 8, 12, '#ffb040', 0.7);
    const [d, u] = linGrad(0, 0, 56, 0, [[0, '#ff6a1a', 0], [0.5, '#ffa030', 0.8], [1, '#ffe080', 1]]);
    s += d + `<path d="M2 8 L40 ${f(3 - i * 0.4)} L56 8 L40 ${f(13 + i * 0.4)} Z" fill="${u}"/>`;
    return s + `<path d="M30 8 L44 5 L54 8 L44 11 Z" fill="#fff8d8"/>`;
  });
  anim('missile', 3, 20, 12, (i) => aura(13, 6, 7 + i, '#b080ff', 0.8) + P(circle(13, 6, 3.6), '#c8a0ff', { glow: true }) + flat(circle(12.2, 5.2, 1.4), '#fff') + `<path d="M0 6 L9 ${f(3.5 - i * 0.3)} L9 ${f(8.5 + i * 0.3)} Z" fill="#a070ff" opacity="0.6"/>`);
  anim('meteor', 3, 28, 40, (i) => {
    const [d, u] = linGrad(0, 0, 0, 40, [[0, '#ff6a1a', 0], [0.6, '#ff9a2a', 0.7], [1, '#ffe080', 1]]);
    let s = d + `<path d="M${8 - i} 2 L14 28 L${20 + i} 2 Z" fill="${u}"/>` + aura(14, 30, 12, '#ff8a2a', 0.8);
    s += P(circle(14, 30, 7.5), '#7a4a3a', { lt: 0.1 }) + flat(circle(12, 28, 2), '#ffb060', { op: 0.9 }) + flat(circle(17, 32, 1.4), '#ff8030', { op: 0.9 });
    return s;
  });
  anim('spike', 4, 24, 32, (i) => {
    const k = [0.4, 1, 0.9, 0.6][i];
    let s = flat(ellipse(12, 29, 10, 3), '#2a1a30', { op: 0.6 });
    for (const [dx, hh] of [[-5, 16], [0, 26], [5, 18]]) s += P(poly([[12 + dx - 3.5, 30], [12 + dx, 30 - hh * k], [12 + dx + 3.5, 30]]), '#5a3a8a', { lt: 0.2, sw: 0.9, k: 0.6 });
    return s + aura(12, 12, 6, '#b080ff', 0.5 * k);
  });
  anim('totem', 4, 24, 44, (i) => {
    let s = aura(12, 8, 8 + (i % 2) * 2, '#8ac8ff', 0.7);
    s += P(rrect(5, 14, 14, 26, 3), '#5a6a8a', { lt: 0.1 }) + P(rrect(3, 38, 18, 5, 2), '#3e4a62');
    s += flat(rrect(9, 20, 6, 3, 1), '#8ac8ff') + flat(rrect(9, 28, 6, 3, 1), '#8ac8ff');
    s += gem(12, 8, 4.5, 6, '#9ad8ff');
    if (i % 2) s += line('M4 6 L1 2 M20 6 L23 3', '#dff2ff', 1);
    return s;
  });
  const wisp = (i, c, c2) => {
    const y = 10 + Math.sin((i / 4) * TAU) * 1;
    return aura(8, y, 8, c, 0.7) + `<path d="M8 ${f(y + 3)} Q${f(4 + i)} ${f(y + 9)} ${f(8 + Math.sin(i) * 2)} 21 Q${f(12 - i * 0.5)} ${f(y + 8)} 8 ${f(y + 3)} Z" fill="${c2}" opacity="0.7"/>` + `<circle cx="8" cy="${f(y)}" r="4.2" fill="${c2}"/><circle cx="8" cy="${f(y)}" r="2.6" fill="#fff"/>` + `<circle cx="6.8" cy="${f(y - 0.3)}" r="0.7" fill="${OUT}"/><circle cx="9.2" cy="${f(y - 0.3)}" r="0.7" fill="${OUT}"/>`;
  };
  anim('wisp', 4, 16, 22, (i) => wisp(i, '#9ff4ff', '#7ae8ff'));
  anim('wisp_v', 4, 16, 22, (i) => wisp(i, '#b080ff', '#a070ff'));
  anim('slash', 4, 72, 48, (i, n) => {
    const k = i / (n - 1);
    const a0 = -1.3 + k * 0.4, a1 = 1.3 - (1 - k) * 0.6;
    const R = 40, r = 26 + k * 6;
    const p = (a, rr) => [36 - 20 + Math.cos(a) * rr, 24 + Math.sin(a) * rr * 0.55];
    const [ax, ay] = p(a0, R), [bx, by] = p(a1, R), [cx, cy] = p(a1, r), [dx, dy] = p(a0, r);
    return `<path d="M${f(ax)} ${f(ay)} A${R} ${R * 0.55} 0 0 1 ${f(bx)} ${f(by)} L${f(cx)} ${f(cy)} A${r} ${r * 0.55} 0 0 0 ${f(dx)} ${f(dy)} Z" fill="#fff" opacity="${f(0.85 - k * 0.5)}"/>` + `<path d="M${f(ax)} ${f(ay)} A${R} ${R * 0.55} 0 0 1 ${f(bx)} ${f(by)}" fill="none" stroke="#fff" stroke-width="2" opacity="${f(1 - k * 0.5)}"/>`;
  });
  anim('void', 6, 56, 56, (i, n) => {
    const a = (i / n) * 360;
    let s = aura(28, 28, 27, '#8a50ff', 0.6);
    for (let j = 0; j < 3; j++) s += `<path d="M28 28 m-${16 - j * 3} 0 a${16 - j * 3} ${16 - j * 3} 0 1 1 ${f((16 - j * 3) * 1.6)} ${f((16 - j * 3) * 0.6)}" fill="none" stroke="${j % 2 ? '#c8a0ff' : '#7a40e0'}" stroke-width="2.4" stroke-linecap="round" transform="rotate(${f(a + j * 120)} 28 28)" opacity="0.9"/>`;
    return s + `<circle cx="28" cy="28" r="9" fill="#12081e" stroke="#c8a0ff" stroke-width="1.4"/>` + `<circle cx="28" cy="28" r="4" fill="#3a1a6a"/>`;
  });
  // ---------------------------------------------------------------- projéteis e objetos pequenos
  add('arrow', 20, 7, line('M1 3.5 L15 3.5', OUT, 2.6) + line('M1 3.5 L15 3.5', '#e8d2a8', 1.3) + P(poly([[19.5, 3.5], [13.5, 0.6], [14.5, 3.5], [13.5, 6.4]]), '#ffc860', { sw: 0.8, k: 0.4, glow: true }) + flat(poly([[0, 1], [4, 3.5], [0, 6], [2, 3.5]]), '#d04a5a'));
  add('dagger', 18, 8, aura(9, 4, 8, '#b0a8ff', 0.5) + P(poly([[17.5, 4], [7, 1.4], [5, 4], [7, 6.6]]), '#e8e4ff', { sw: 0.8, k: 0.4, lt: 0.2 }) + P(rrect(3.6, 1, 2, 6, 0.8), '#8a70e0', { sw: 0.7, k: 0.3 }) + P(capsule(0.8, 4, 3.6, 4, 1), '#4a3a7a', { sw: 0.7, k: 0.3 }));
  add('moon', 22, 22, aura(11, 11, 11, '#fff2c0', 0.6) + P(path('M15 2.5 A9 9 0 1 0 15 19.5 A7 7 0 1 1 15 2.5 Z'), '#fff4c8', { sw: 0.9, k: 0.6, glow: true }));
  add('lava_glob', 18, 18, aura(9, 9, 9, '#ff6a2a', 0.8) + P(circle(9, 9, 5), '#ff7a2a', { glow: true }) + flat(circle(7.6, 7.6, 1.8), '#ffe080'));
  add('orb_violet', 14, 14, aura(7, 7, 7, '#b080ff', 0.8) + P(circle(7, 7, 3.6), '#c8a0ff', { glow: true, sw: 0.8 }) + flat(circle(6, 6, 1.3), '#fff'));
  add('orb_cyan', 14, 14, aura(7, 7, 7, '#5af0ff', 0.8) + P(circle(7, 7, 3.6), '#9af4ff', { glow: true, sw: 0.8 }) + flat(circle(6, 6, 1.3), '#fff'));
  for (let i = 0; i < 3; i++) {
    const sh = [[[1, 4], [6, 0.8], [11.5, 4], [6, 7.2]], [[0.5, 5], [5, 1], [11.5, 3], [7, 7]], [[1, 3], [8, 1], [11, 5], [4, 7]]][i];
    add(`shard_${i}`, 12, 8, P(poly(sh), '#9af4ff', { sw: 0.7, k: 0.4, lt: 0.2 }));
    add(`shard_coral_${i}`, 12, 8, P(poly(sh), '#ff7a6a', { sw: 0.7, k: 0.4, lt: 0.2 }));
  }
  add('snowflake', 10, 10, [0, 60, 120].map((a) => `<path d="M5 0.5 L5 9.5" stroke="#fff" stroke-width="1.1" stroke-linecap="round" transform="rotate(${a} 5 5)"/>`).join('') + `<circle cx="5" cy="5" r="1.4" fill="#fff"/>`);
  add('heal_cross', 10, 10, P(path('M3.5 0.8 H6.5 V3.5 H9.2 V6.5 H6.5 V9.2 H3.5 V6.5 H0.8 V3.5 H3.5 Z'), '#7af0a0', { sw: 0.7, k: 0.4, glow: true }));
  // runas orbitais da coroa (três paletas de aparência)
  const runeShapes = ['M7 2 L7 12 M3 5 L11 9', 'M3 3 L11 3 L7 12 Z', 'M3 12 L7 2 L11 12 M5 8 L9 8', 'M7 2 L11 7 L7 12 L3 7 Z', 'M3 2 L3 12 L11 12', 'M3 3 Q11 3 11 7 Q11 11 3 11', 'M3 12 L7 2 L11 12', 'M7 2 L7 12 M3 4 L11 4 M3 10 L11 10'];
  for (let i = 0; i < 8; i++) {
    for (const [suf, c] of [['', '#ffb347'], ['_v', '#c890ff'], ['_c', '#8ad8ff']]) add(`rune${suf}_${i}`, 14, 14, aura(7, 7, 7, c, 0.6) + line(runeShapes[i], c, 2.6, 0.5) + line(runeShapes[i], mix(c, '#ffffff', 0.5), 1.3));
  }
  // coletáveis
  add('gem_s', 10, 12, aura(5, 6, 6, '#5af0b0', 0.6) + gem(5, 6, 3.6, 4.6, '#4ef0a8'));
  add('gem_m', 12, 14, aura(6, 7, 7, '#5ab8ff', 0.6) + gem(6, 7, 4.4, 5.6, '#5ab0ff'));
  add('gem_l', 14, 16, aura(7, 8, 8, '#d070ff', 0.7) + gem(7, 8, 5.2, 6.6, '#c868ff'));
  add('pick_coin', 14, 14, aura(7, 7, 7, '#ffc850', 0.6) + P(circle(7, 7, 4.8), '#f0b030', { sw: 0.9, k: 0.6, lt: 0.2 }) + `<circle cx="7" cy="7" r="2.8" fill="none" stroke="#fff0a0" stroke-width="0.8"/>` + flat(path('M7 4.6 L7.8 6.4 L9.6 7 L7.8 7.6 L7 9.4 L6.2 7.6 L4.4 7 L6.2 6.4 Z'), '#fff6c0'));
  add('pick_heal', 16, 16, aura(8, 8, 8, '#ff6a8a', 0.6) + P(path('M8 13.5 C3 10 1.5 7 3 4.6 C4.5 2.6 7 3 8 5 C9 3 11.5 2.6 13 4.6 C14.5 7 13 10 8 13.5 Z'), '#ff5a7a', { sw: 0.9, k: 0.6, lt: 0.18 }) + spec(5.5, 5.5, 1.3, 0.8, 0.8));
  add('pick_energy', 14, 16, aura(7, 8, 8, '#ffb040', 0.7) + P(path('M8.5 1 L3 9 L6.5 9 L5.5 15 L11 7 L7.5 7 Z'), '#ffc040', { sw: 0.9, k: 0.5, glow: true }));
  add('pick_essence', 14, 18, aura(7, 9, 9, '#b080ff', 0.7) + P(path('M7 1.5 C10 6 12 9 12 11.5 A5 5 0 0 1 2 11.5 C2 9 4 6 7 1.5 Z'), '#b080ff', { sw: 0.9, k: 0.6, lt: 0.2 }) + spec(5, 10, 1.4, 0.9, 0.8));
  const chest = (open) => {
    let s = aura(14, 14, 14, '#ffc060', open ? 0.7 : 0.3);
    s += P(rrect(3, 10, 22, 12, 2.5), '#9a5a32', { lt: 0.1 }) + P(rrect(3, 14, 22, 2.4, 1), '#e8b040', { sw: 0.8, k: 0.4 });
    if (open) s += P(path('M3 10 L6 2 L22 2 L25 10 Z'), '#7a4428', { sw: 1 }) + aura(14, 9, 9, '#fff0a0', 0.9);
    else s += P(path('M3 11 Q3 4 14 4 Q25 4 25 11 Z'), '#a8643a', { lt: 0.14 }) + P(rrect(11.5, 9, 5, 6, 1.5), '#e8b040', { sw: 0.8, k: 0.4 });
    return s;
  };
  add('chest', 28, 24, chest(false));
  add('chest_open', 28, 24, chest(true));
  return { sprites: [...S], animations: { ...A } };
}

function flame(i, n, [c0, c1, c2]) {
  const p = (i / n) * TAU;
  const sway = Math.sin(p) * 2;
  const outer = smooth([[12, 31], [4.5, 24], [5 + sway * 0.4, 15], [9 + sway, 8], [12 + sway * 1.5, 1 + Math.cos(p) * 1.5], [14 + sway, 9], [19 + sway * 0.4, 15], [19.5, 24]]);
  const mid = smooth([[12, 30], [7.5, 24], [9 + sway * 0.6, 16], [12 + sway, 9], [15 + sway * 0.6, 16], [16.5, 24]]);
  const core = smooth([[12, 29.5], [9.5, 25], [11 + sway * 0.4, 19], [12 + sway * 0.6, 15], [13.5 + sway * 0.4, 19], [14.5, 25]]);
  return aura(12, 22, 12, c1, 0.5) + `<g fill="${c0}">${outer}</g><g fill="${c1}">${mid}</g><g fill="${c2}">${core}</g>`;
}
