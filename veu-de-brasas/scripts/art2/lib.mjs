// Biblioteca de desenho vetorial do estilo "cartoon moderno": formas com contorno escuro,
// gradiente vertical, crescente de sombra (baixo-direita) e de brilho (cima-esquerda).
// Tudo vira SVG; o rasterizador (raster.mjs) renderiza no Chromium em 2x.

let UID = 0;
export const uid = (p = 'u') => `${p}${(UID++).toString(36)}`;

// VEU_FX_SOFT=1: estilo suave sem contorno escuro (efeitos no tom dos modelos KayKit)
export const SOFT = typeof process !== 'undefined' && process.env.VEU_FX_SOFT === '1';
export const OUT = SOFT ? 'rgba(0,0,0,0)' : '#1b1226';

// ---------------------------------------------------------------- cores
export function hex2rgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgb2hex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hsl2rgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
/** clareia (+) ou escurece (−) mantendo matiz; escurecer puxa a matiz para o violeta (sombra quente/fria) */
export function shift(hex, dl, ds = 0) {
  const [h, s, l] = rgb2hsl(hex2rgb(hex));
  let nh = h;
  if (dl < 0) {
    const target = 0.72; // violeta
    const dh = ((target - h + 1.5) % 1) - 0.5;
    nh = (h + dh * Math.min(0.35, -dl * 0.9) + 1) % 1;
  } else if (dl > 0) {
    const target = 0.11; // amarelo quente
    const dh = ((target - h + 1.5) % 1) - 0.5;
    nh = (h + dh * Math.min(0.2, dl * 0.4) + 1) % 1;
  }
  return rgb2hex(hsl2rgb([nh, Math.max(0, Math.min(1, s + ds)), Math.max(0, Math.min(1, l + dl))]));
}
export function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A.map((v, i) => v + (B[i] - v) * t));
}

// ---------------------------------------------------------------- formas (markup sem fill)
export const f = (n) => +n.toFixed(2);
export const circle = (cx, cy, r) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
export const ellipse = (cx, cy, rx, ry, rot = 0) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ''}/>`;
export const rrect = (x, y, w, h, r, rot = 0, ox = x + w / 2, oy = y + h / 2) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}"${rot ? ` transform="rotate(${f(rot)} ${f(ox)} ${f(oy)})"` : ''}/>`;
export const path = (d) => `<path d="${d}"/>`;
export const poly = (pts) => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z"/>`;
/** cápsula entre dois pontos (membros, cabos) */
export function capsule(x1, y1, x2, y2, r1, r2 = r1) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const n = a + Math.PI / 2;
  const c = Math.cos(n), s = Math.sin(n);
  const p = (x, y, r, sg) => `${f(x + c * r * sg)} ${f(y + s * r * sg)}`;
  return `<path d="M${p(x1, y1, r1, 1)} L${p(x2, y2, r2, 1)} A${f(r2)} ${f(r2)} 0 0 0 ${p(x2, y2, r2, -1)} L${p(x1, y1, r1, -1)} A${f(r1)} ${f(r1)} 0 0 0 ${p(x1, y1, r1, 1)} Z"/>`;
}
/** curva suave fechada por pontos (Catmull-Rom → Bézier) */
export function smooth(pts, closed = true, t = 0.5) {
  const n = pts.length;
  const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * t * 2, p1[1] + ((p2[1] - p0[1]) / 6) * t * 2];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * t * 2, p2[1] - ((p3[1] - p1[1]) / 6) * t * 2];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `<path d="${d}${closed ? ' Z' : ''}"/>`;
}
export const g = (inner, attrs = '') => `<g ${attrs}>${inner}</g>`;
export const tr = (inner, x, y, rot = 0, sx = 1, sy = sx) => `<g transform="translate(${f(x)} ${f(y)})${rot ? ` rotate(${f(rot)})` : ''}${sx !== 1 || sy !== 1 ? ` scale(${f(sx)} ${f(sy)})` : ''}">${inner}</g>`;

// ---------------------------------------------------------------- pintura
/**
 * Peça sombreada: gradiente vertical, crescente de sombra e de brilho, contorno.
 * `shape` é markup de forma(s) sem fill. opts: sw (contorno), lt (luz), dk (sombra), k (deslocamento),
 * flat (sem gradiente), glow (cor emissiva sem sombra), outline=false.
 */
export function part(shape, base, opts = {}) {
  const sw = opts.sw ?? 1.3;
  const k = opts.k ?? 1.6;
  const gid = uid('g'), m1 = uid('m'), m2 = uid('m');
  const top = shift(base, opts.lt ?? 0.1);
  const bot = shift(base, -(opts.dk ?? 0.1));
  const shade = shift(base, -(opts.sd ?? 0.2), 0.05);
  const hi = shift(base, opts.hl ?? 0.2, -0.05);
  const M = (id, dx, dy) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200"><rect x="-400" y="-400" width="1200" height="1200" fill="#000"/><g fill="#fff">${shape}</g><g fill="#000" transform="translate(${dx} ${dy})">${shape}</g></mask>`;
  let s = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`;
  if (!opts.glow) s += M(m1, -k, -k * 1.2);
  if (opts.hl !== 0) s += M(m2, k * 0.8, k);
  s += '</defs>';
  s += `<g fill="${opts.flat ? base : `url(#${gid})`}">${shape}</g>`;
  if (!opts.glow) s += `<g mask="url(#${m1})" fill="${shade}" opacity="${opts.so ?? 0.85}">${shape}</g>`;
  if (opts.hl !== 0) s += `<g mask="url(#${m2})" fill="${hi}" opacity="${opts.ho ?? 0.7}">${shape}</g>`;
  if (opts.outline !== false && !SOFT) s += `<g fill="none" stroke="${opts.oc ?? OUT}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">${shape}</g>`;
  return s;
}
/** forma lisa (detalhes pequenos) */
export const flat = (shape, color, opts = {}) => `<g fill="${color}"${opts.op ? ` opacity="${opts.op}"` : ''}${opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw ?? 1}" stroke-linejoin="round"` : ''}>${shape}</g>`;
/** traço (cordas, rachaduras, contornos internos) */
export const line = (d, color, w = 1, op = 1, cap = 'round') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round" opacity="${op}"/>`;
/** brilho especular pequeno */
export const spec = (cx, cy, rx, ry = rx, op = 0.85, rot = -30) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${f(cx)} ${f(cy)})"/>`;
/** aura emissiva suave (gradiente radial) */
export function aura(cx, cy, r, color, op = 0.6) {
  const id = uid('a');
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="0.45" stop-color="${color}" stop-opacity="${op * 0.45}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${id})"/>`;
}
/** gema/cristal facetado com brilho */
export function gem(cx, cy, w, h, color, rot = 0) {
  const pts = [[0, -h], [w * 0.55, -h * 0.25], [w * 0.4, h * 0.55], [0, h], [-w * 0.4, h * 0.55], [-w * 0.55, -h * 0.25]];
  const sh = poly(pts);
  const facetL = poly([[0, -h], [-w * 0.55, -h * 0.25], [-w * 0.4, h * 0.55], [0, h * 0.2]]);
  return tr(part(sh, color, { k: 1, lt: 0.18 }) + flat(facetL, '#fff', { op: 0.22 }) + line(`M0 ${f(-h)} L0 ${f(h * 0.2)} L${f(w * 0.4)} ${f(h * 0.55)}`, shift(color, 0.3), 0.6, 0.6), cx, cy, rot);
}
/** olhos grandes e expressivos (frente) */
export function eyes(cx, cy, gap, r, color = '#1b1226', look = [0, 0], glow = null) {
  let s = '';
  for (const sg of [-1, 1]) {
    const x = cx + sg * gap;
    if (glow) s += aura(x, cy, r * 2.6, glow, 0.55);
    s += `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(r)}" ry="${f(r * 1.25)}" fill="${glow ?? color}"/>`;
    s += `<circle cx="${f(x - r * 0.3 + look[0])}" cy="${f(cy - r * 0.45 + look[1])}" r="${f(r * 0.42)}" fill="#fff"/>`;
  }
  return s;
}
/** filtro de silhueta branca (quadros de hit-flash) */
export function whiteFlash(inner) {
  const id = uid('wf');
  return `<defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="#ffffff"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs><g filter="url(#${id})">${inner}</g>`;
}
/** espelha horizontalmente dentro de uma caixa de largura w */
export const mirror = (inner, w) => `<g transform="translate(${w} 0) scale(-1 1)">${inner}</g>`;
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;
/** gerador pseudoaleatório determinístico (variações de forma, nunca layout de mapa) */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
