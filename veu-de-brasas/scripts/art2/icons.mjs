// Ícones de habilidades/passivas: glifos vetoriais 32×32 com contorno, sombreado e brilho.
import { part, flat, line, spec, aura, gem, capsule, circle, ellipse, rrect, path, smooth, poly, shift, mix, f, TAU, OUT } from './lib.mjs';

const P = (shape, c, o = {}) => part(shape, c, { sw: 1.4, k: 1.2, ...o });
const glow = (c, r = 15) => aura(16, 16, r, c, 0.45);
const ray = (d, c, w = 2.4) => line(d, OUT, w + 1.6) + line(d, c, w);

const I = {
  w_arrow: () => glow('#ffb347') + ray('M6 26 L24 8', '#e8d2a8', 2) + P(poly([[27, 5], [19, 8], [24, 13]]), '#ffc860', { glow: true }) + P(poly([[6, 26], [4, 20], [8, 22], [10, 24], [12, 28]]), '#d04a5a'),
  w_crown: () => glow('#ff9a40') + P(path('M5 22 L7 10 L12 16 L16 7 L20 16 L25 10 L27 22 Z'), '#f0b040', { lt: 0.2 }) + P(rrect(5, 21, 22, 5, 2), '#d08a30') + gem(16, 23.5, 2.4, 2.4, '#ff6a3a') + flame(16, 5, 0.6) + flame(7, 8, 0.4) + flame(25, 8, 0.4),
  w_lance: () => glow('#ff9030') + P(poly([[4, 28], [22, 6], [28, 4], [26, 10]]), '#ffa040', { glow: true }) + flat(poly([[10, 22], [22, 8], [26, 6], [24, 10]]), '#fff0b0', { op: 0.8 }),
  w_chain: () => glow('#7ab0ff') + P(path('M18 2 L8 17 L14 17 L11 30 L24 12 L17 12 L21 2 Z'), '#8ac0ff', { glow: true, lt: 0.2 }) + flat(path('M17 5 L11 15 L15 15'), 'none'),
  w_lotus: () => glow('#7af0ff') + [0, 1, 2, 3, 4].map((i) => `<g transform="rotate(${-60 + i * 30} 16 24)">${P(path('M16 24 Q20 15 16 5 Q12 15 16 24 Z'), i % 2 ? '#6ae8ff' : '#aaf6ff', { k: 0.6 })}</g>`).join('') + gem(16, 22, 3, 3.6, '#e8fdff'),
  w_wind: () => glow('#e8e0d0') + ray('M4 12 Q16 6 22 10 Q27 13 23 17 Q20 19 18 16', '#f4f0e8', 2.6) + ray('M4 20 Q14 17 22 21 Q26 24 22 27', '#d8d0c0', 2.2),
  w_dagger: () => glow('#b0a8ff') + `<g transform="rotate(-45 16 16)">${P(poly([[16, 2], [19.5, 18], [16, 20], [12.5, 18]]), '#e8e4ff', { lt: 0.2 })}${P(rrect(10, 18, 12, 3, 1.4), '#8a70e0')}${P(capsule(16, 21, 16, 28, 1.8), '#4a3a7a')}</g>`,
  w_missile: () => glow('#b080ff') + [[10, 22, 4], [20, 12, 5], [24, 25, 3.4]].map(([x, y, r]) => aura(x, y, r * 2, '#b080ff', 0.6) + P(circle(x, y, r), '#c8a0ff', { glow: true }) + flat(circle(x - r * 0.3, y - r * 0.3, r * 0.35), '#fff')).join(''),
  w_meteor: () => glow('#ff8a2a') + `<path d="M4 4 L18 16 L13 21 Z" fill="#ffb040" opacity="0.7"/>` + P(circle(20, 20, 8), '#7a4a3a') + flat(circle(17, 17, 2.4), '#ffb060') + flat(circle(23, 23, 1.6), '#ff7a30'),
  w_frost: () => glow('#8ad8ff') + [0, 60, 120].map((a) => `<g transform="rotate(${a} 16 16)">${ray('M16 3 L16 29', '#e8fbff', 2.2)}${ray('M16 8 L12 5 M16 8 L20 5 M16 24 L12 27 M16 24 L20 27', '#bff0ff', 1.4)}</g>`).join('') + gem(16, 16, 3.6, 3.6, '#9ae8ff'),
  w_spikes: () => glow('#b080ff') + [[8, 18], [16, 26], [24, 16]].map(([x, h]) => P(poly([[x - 5, 29], [x, 29 - h], [x + 5, 29]]), '#6a4aa8', { lt: 0.2 })).join(''),
  w_totem: () => glow('#8ac8ff') + P(rrect(10, 10, 12, 18, 3), '#5a6a8a') + flat(rrect(13, 14, 6, 2.6, 1), '#8ac8ff') + flat(rrect(13, 20, 6, 2.6, 1), '#8ac8ff') + gem(16, 6, 4, 5, '#9ad8ff') + ray('M5 4 L8 9 M27 4 L24 9', '#dff2ff', 1.4),
  w_wisp: () => glow('#7ae8ff') + P(path('M16 26 Q8 20 10 12 Q12 5 16 4 Q20 5 22 12 Q24 20 16 26 Z'), '#7ae8ff', { glow: true }) + flat(circle(16, 13, 4.5), '#fff') + flat(circle(14.4, 13, 1), OUT) + flat(circle(17.6, 13, 1), OUT),
  w_whip: () => glow('#ff5060') + ray('M6 26 Q8 12 18 10 Q27 9 26 18 Q25 24 19 23', '#d03040', 2.8) + P(capsule(4, 28, 8, 24, 2.4), '#4a2e22'),
  w_moon: () => glow('#fff2c0') + P(path('M21 3 A13 13 0 1 0 21 29 A10 10 0 1 1 21 3 Z'), '#fff4c8', { glow: true }),
  w_void: () => glow('#8a50ff', 16) + [0, 120, 240].map((a) => `<path d="M16 16 m-11 0 a11 11 0 1 1 17 4" fill="none" stroke="#c8a0ff" stroke-width="2.2" stroke-linecap="round" transform="rotate(${a} 16 16)"/>`).join('') + `<circle cx="16" cy="16" r="6" fill="#12081e" stroke="#c8a0ff" stroke-width="1.4"/>`,
  w_rain: () => glow('#ffd890') + [[8, 4], [16, 8], [24, 3], [12, 14], [21, 15]].map(([x, y]) => ray(`M${x} ${y} L${x} ${y + 10}`, '#e8d2a8', 1.4) + P(poly([[x, y + 14], [x - 2.4, y + 9.5], [x + 2.4, y + 9.5]]), '#ffc860', { sw: 1, glow: true })).join(''),
  w_thorns: () => glow('#8ac860') + `<circle cx="16" cy="16" r="10" fill="none" stroke="${OUT}" stroke-width="4.6"/><circle cx="16" cy="16" r="10" fill="none" stroke="#5a8a3a" stroke-width="3"/>` + Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU; return P(poly([[16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9], [16 + Math.cos(a + 0.2) * 15, 16 + Math.sin(a + 0.2) * 15], [16 + Math.cos(a + 0.35) * 10, 16 + Math.sin(a + 0.35) * 10]]), '#9ad870', { sw: 1, k: 0.5 }); }).join(''),
  p_vigor: () => glow('#ff6a8a') + P(path('M16 28 C6 21 3 14 6 9 C9 5 14 6 16 10 C18 6 23 5 26 9 C29 14 26 21 16 28 Z'), '#ff4a6a', { lt: 0.2 }) + spec(10, 11, 2.4, 1.4, 0.8),
  p_speed: () => glow('#7af0c8') + P(path('M8 20 L20 20 Q26 20 26 25 L26 27 L6 27 L6 23 Q6 20 8 20 Z'), '#5ac8a8') + P(path('M10 20 Q12 12 18 8 L22 12 Q18 15 18 20 Z'), '#7ae8c8') + ray('M2 12 L9 12 M3 16 L8 16', '#e8fff8', 1.6),
  p_cooldown: () => glow('#8ad8ff') + P(path('M8 4 L24 4 L24 7 Q24 13 18 16 Q24 19 24 25 L24 28 L8 28 L8 25 Q8 19 14 16 Q8 13 8 7 Z'), '#9ad8ff', { lt: 0.2 }) + flat(path('M11 25 Q16 19 21 25 Z'), '#ffd070') + flat(path('M11 7 L21 7 Q18 12 16 13 Q14 12 11 7 Z'), '#ffd070', { op: 0.6 }),
  p_area: () => glow('#ffd070') + `<circle cx="16" cy="16" r="12" fill="none" stroke="${OUT}" stroke-width="3.6"/><circle cx="16" cy="16" r="12" fill="none" stroke="#ffd070" stroke-width="2"/><circle cx="16" cy="16" r="6.5" fill="none" stroke="#ffb040" stroke-width="2" stroke-dasharray="3 2"/>` + P(circle(16, 16, 2.6), '#fff0a0', { glow: true }),
  p_lifesteal: () => glow('#ff5060') + P(path('M16 4 C20 11 24 15 24 20 A8 8 0 0 1 8 20 C8 15 12 11 16 4 Z'), '#d02a40', { lt: 0.2 }) + spec(12, 18, 2, 1.2, 0.8) + P(poly([[22, 6], [26, 3], [25, 9]]), '#f0f0f0', { sw: 1 }),
  p_armor: () => glow('#a9b4c8') + P(path('M16 3 L27 7 L26 17 Q24 25 16 29 Q8 25 6 17 L5 7 Z'), '#a9b4c8', { lt: 0.2 }) + P(path('M16 7 L23 9.5 L22.5 17 Q21 22 16 25 Z'), '#d8e0ee', { k: 0.6, sw: 1 }),
  p_magnet: () => glow('#ff6a6a') + P(path('M6 6 L12 6 L12 17 A4 4 0 0 0 20 17 L20 6 L26 6 L26 17 A10 10 0 0 1 6 17 Z'), '#e04a4a', { lt: 0.15 }) + P(rrect(6, 4, 6, 5, 1), '#e8e8f0', { sw: 1 }) + P(rrect(20, 4, 6, 5, 1), '#e8e8f0', { sw: 1 }),
  p_pierce: () => glow('#ffc860') + ray('M3 16 L25 16', '#e8d2a8', 2) + P(poly([[30, 16], [22, 11.5], [22, 20.5]]), '#ffc860', { glow: true }) + P(rrect(11, 7, 4, 18, 2), '#7a7f94', { sw: 1.2 }),
  p_multi: () => glow('#ffc860') + [-0.5, 0, 0.5].map((a) => `<g transform="rotate(${a * 57} 6 26)">${ray('M6 26 L22 10', '#e8d2a8', 1.6)}${P(poly([[25, 7], [18, 9.5], [22.5, 14]]), '#ffc860', { sw: 1, glow: true })}</g>`).join(''),
  p_regen: () => glow('#7af0a0') + P(path('M16 28 C16 20 8 18 6 10 C12 10 16 14 16 20 C16 12 20 6 27 5 C26 14 18 16 16 28 Z'), '#5ad880', { lt: 0.2 }) + line('M16 26 L16 18', OUT, 1),
  p_focus: () => glow('#ffb347') + `<circle cx="16" cy="16" r="11" fill="none" stroke="${OUT}" stroke-width="3.6"/><circle cx="16" cy="16" r="11" fill="none" stroke="#ffb347" stroke-width="2"/>` + P(path('M16 7 Q22 16 16 25 Q10 16 16 7 Z'), '#ffd070', { glow: true }) + flat(circle(16, 16, 2.4), '#fff'),
  p_might: () => glow('#ff7a3a') + gem(16, 17, 9, 12, '#ff6a3a') + ray('M9 9 L16 3 L23 9', '#ffd070', 2) + ray('M11 13 L16 8.5 L21 13', '#ffb040', 1.6),
  p_crit: () => glow('#ffd040') + `<circle cx="16" cy="16" r="11" fill="none" stroke="${OUT}" stroke-width="3.6"/><circle cx="16" cy="16" r="11" fill="none" stroke="#ffd040" stroke-width="2"/>` + ray('M16 2 L16 10 M16 22 L16 30 M2 16 L10 16 M22 16 L30 16', '#ffd040', 1.6) + P(circle(16, 16, 3), '#ff5a3a', { glow: true }),
  p_critdmg: () => glow('#ffd040') + P(path('M16 2 L19 12 L29 13 L21 19 L24 29 L16 23 L8 29 L11 19 L3 13 L13 12 Z'), '#ffd040', { lt: 0.2 }) + flat(path('M14 10 L18 10 L17 18 L15 18 Z M15 20 L17 20 L17 22.5 L15 22.5 Z'), '#c03020'),
  p_duration: () => glow('#8ad8ff') + P(circle(16, 17, 11), '#e8f0ff', { lt: 0.1 }) + P(rrect(13, 2, 6, 4, 1.2), '#a9b4c8', { sw: 1 }) + ray('M16 17 L16 10 M16 17 L21 20', '#3a4a6a', 1.6) + `<path d="M16 6 A11 11 0 0 1 27 17" fill="none" stroke="#5ab0ff" stroke-width="2.4"/>`,
  p_projspeed: () => glow('#e8f0ff') + P(path('M4 26 Q10 12 26 4 Q22 14 10 22 Z'), '#e8f0ff', { lt: 0.1 }) + line('M8 22 L24 6', '#a9b4c8', 1) + ray('M14 26 L20 26 M18 22 L24 22', '#bfe8ff', 1.4),
  p_luck: () => glow('#7af0a0') + [0, 90, 180, 270].map((a) => `<g transform="rotate(${a} 16 15)">${P(path('M16 15 C12 13 10 8 13 6 C15 5 16 7 16 9 C16 7 17 5 19 6 C22 8 20 13 16 15 Z'), '#5ad880', { k: 0.8 })}</g>`).join('') + line('M16 15 Q18 23 15 29', OUT, 3) + line('M16 15 Q18 23 15 29', '#3a9a5a', 1.6),
  p_xp: () => glow('#5af0b0') + P(path('M6 7 Q11 5 16 8 Q21 5 26 7 L26 26 Q21 24 16 27 Q11 24 6 26 Z'), '#e8e0cc', { lt: 0.1 }) + line('M16 8 L16 27', OUT, 1) + gem(23, 7, 3, 4, '#4ef0a8'),
  p_revive: () => glow('#ff8a3a', 16) + P(path('M16 28 C9 24 4 18 6 11 C9 14 11 15 13 14 C10 9 13 4 16 2 C17 7 21 9 22 13 C24 12 25 10 26 9 C29 18 23 25 16 28 Z'), '#ff7a3a', { glow: true, lt: 0.2 }) + flat(path('M16 26 C12 23 11 19 13 16 C15 18 17 18 18 16 C20 19 20 23 16 26 Z'), '#ffe080'),
  p_dash: () => glow('#9ff4ff') + P(path('M10 6 L20 16 L10 26 L6 22 L12 16 L6 10 Z'), '#9ff4ff', { glow: true }) + P(path('M18 6 L28 16 L18 26 L14 22 L20 16 L14 10 Z'), '#5ad8f0', { glow: true }),
  p_amount: () => glow('#ffd070') + [[11, 11], [21, 11], [16, 21]].map(([x, y]) => P(circle(x, y, 5.4), '#ffc040', { lt: 0.2 }) + spec(x - 1.6, y - 1.8, 1.4, 0.8, 0.8)).join('') + ray('M24 22 L30 22 M27 19 L27 25', '#fff', 1.6),
  p_guard: () => glow('#a9b4c8') + P(circle(16, 16, 12), '#7a8aa8', { lt: 0.15 }) + P(circle(16, 16, 7), '#a9b4c8') + gem(16, 16, 3, 3.4, '#8ad8ff'),
  l_phoenix: () => glow('#ff8a3a', 16) + P(path('M16 26 C10 22 4 18 2 10 C8 12 11 14 13 17 C12 11 14 6 16 3 C18 6 20 11 19 17 C21 14 24 12 30 10 C28 18 22 22 16 26 Z'), '#ff7a2a', { glow: true, lt: 0.2 }) + ray('M16 26 L16 31', '#ffb040', 1.6),
  l_storm: () => glow('#7ab0ff', 16) + P(path('M6 14 Q6 6 14 7 Q17 3 22 5 Q28 6 27 13 Q30 17 25 19 L9 19 Q4 18 6 14 Z'), '#5a6a9a', { lt: 0.15 }) + P(path('M16 18 L11 26 L15 26 L13 31 L21 22 L17 22 L19 18 Z'), '#ffe060', { glow: true }),
  a_dash: () => glow('#9ff4ff') + P(path('M6 6 L16 16 L6 26 L4 24 L12 16 L4 8 Z'), '#bff8ff', { glow: true }) + P(path('M15 6 L25 16 L15 26 L13 24 L21 16 L13 8 Z'), '#7ae8ff', { glow: true }) + P(path('M22 9 L29 16 L22 23 L21 21 L26 16 L21 11 Z'), '#4ac8e8', { glow: true }),
  a_pulse: () => glow('#ffb347', 16) + `<circle cx="16" cy="16" r="12" fill="none" stroke="${OUT}" stroke-width="4"/><circle cx="16" cy="16" r="12" fill="none" stroke="#ffb347" stroke-width="2.4"/><circle cx="16" cy="16" r="7" fill="none" stroke="${OUT}" stroke-width="3.6"/><circle cx="16" cy="16" r="7" fill="none" stroke="#ffd070" stroke-width="2"/>` + P(circle(16, 16, 2.8), '#fff0a0', { glow: true }),
  c_tornado: () => glow('#ffa050') + [[4, 7, 24], [7, 13, 18], [10, 19, 12], [13, 25, 6]].map(([x, y, w]) => ray(`M${x} ${y} Q${x + w / 2} ${y + 3} ${x + w} ${y}`, '#ffb070', 2.2)).join('') + flame(24, 22, 0.35),
  c_thunder: () => glow('#9af4ff') + gem(11, 18, 5, 8, '#9af4ff', -15) + P(path('M22 3 L15 15 L20 15 L17 28 L27 12 L22 12 L25 3 Z'), '#ffe060', { glow: true }),
  c_dawn: () => glow('#ffb040', 16) + Array.from({ length: 6 }, (_, i) => `<g transform="rotate(${i * 60} 16 16)">${P(poly([[16, 2], [18.5, 11], [16, 13], [13.5, 11]]), '#ffa040', { sw: 1, glow: true })}</g>`).join('') + P(circle(16, 16, 4), '#fff0a0', { glow: true }),
  coin: () => glow('#ffc850') + P(circle(16, 16, 11), '#f0b030', { lt: 0.2 }) + `<circle cx="16" cy="16" r="7" fill="none" stroke="#fff0a0" stroke-width="1.4"/>` + flat(path('M16 10 L17.6 14.4 L22 16 L17.6 17.6 L16 22 L14.4 17.6 L10 16 L14.4 14.4 Z'), '#fff6c0'),
};

function flame(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">${part(path('M0 12 C-7 8 -6 1 -2 -4 C-2 0 0 1 1 0 C0 -5 2 -9 5 -12 C5 -6 9 -3 8 4 C7 9 4 12 0 12 Z'), '#ff8a2a', { glow: true, sw: 2.2, k: 1.5 })}</g>`;
}

export function iconSvgs() {
  return Object.entries(I).map(([id, fn]) => ({ id, svg: fn() }));
}
