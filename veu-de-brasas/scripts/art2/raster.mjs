// Rasterizador de atlas: posiciona SVGs numa página do Chromium (Playwright), captura com fundo
// transparente e grava PNG + JSON no formato de spritesheet do PixiJS (meta.scale = 2).
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const SCALE = 2;
let browser = null;

export async function openBrowser() {
  if (!browser) browser = await chromium.launch();
  return browser;
}
export async function closeBrowser() {
  if (browser) await browser.close();
  browser = null;
}

/** empacotamento em prateleiras (ordenado por altura) */
function pack(sprites, maxW, pad) {
  const items = sprites.map((s, i) => ({ i, w: Math.ceil(s.w * SCALE) + pad * 2, h: Math.ceil(s.h * SCALE) + pad * 2 }));
  items.sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0, y = 0, rowH = 0, W = 0;
  const pos = new Array(sprites.length);
  for (const it of items) {
    if (x + it.w > maxW) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    pos[it.i] = { x: x + pad, y: y + pad };
    x += it.w;
    rowH = Math.max(rowH, it.h);
    W = Math.max(W, x);
  }
  const H = y + rowH;
  const p2 = (v) => 2 ** Math.ceil(Math.log2(Math.max(16, v)));
  return { pos, W: p2(W), H: p2(H) };
}

/** renderiza uma lista de SVGs (cada um com viewBox lógico w×h) para PNGs/um atlas */
async function render(html, W, H, file) {
  const b = await openBrowser();
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  await page.close();
}

const svgTag = (s, x, y) =>
  `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;left:${x}px;top:${y}px" width="${Math.ceil(s.w * SCALE)}" height="${Math.ceil(s.h * SCALE)}" viewBox="0 0 ${Math.ceil(s.w * SCALE) / SCALE} ${Math.ceil(s.h * SCALE) / SCALE}">${s.svg}</svg>`;

/**
 * sprites: [{ name, w, h, svg }]; animations: { animName: [frameNames] }
 * Grava `${outBase}.png` e `${outBase}.json`.
 */
export async function atlas(outBase, imageName, sprites, animations = {}, maxW = 2048, pad = 2) {
  mkdirSync(dirname(outBase), { recursive: true });
  const { pos, W, H } = pack(sprites, maxW, pad);
  if (H > 8192) throw new Error(`atlas ${imageName} grande demais (${W}x${H})`);
  const body = sprites.map((s, i) => svgTag(s, pos[i].x, pos[i].y)).join('');
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body><div style="position:relative;width:${W}px;height:${H}px">${body}</div></body></html>`;
  await render(html, W, H, outBase + '.png');
  const frames = {};
  sprites.forEach((s, i) => {
    const w = Math.ceil(s.w * SCALE), h = Math.ceil(s.h * SCALE);
    frames[s.name] = { frame: { x: pos[i].x, y: pos[i].y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } };
  });
  const json = { frames, animations, meta: { app: 'veu-de-brasas/scripts/art2', version: '2.0', image: imageName, format: 'RGBA8888', size: { w: W, h: H }, scale: String(SCALE) } };
  writeFileSync(outBase + '.json', JSON.stringify(json));
  return { W, H, n: sprites.length };
}

/** PNG avulso (ícones da interface, retratos, ilustrações) */
export async function single(file, w, h, svg, scale = SCALE) {
  mkdirSync(dirname(file), { recursive: true });
  const W = Math.ceil(w * scale), H = Math.ceil(h * scale);
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}">${svg}</svg></body></html>`;
  await render(html, W, H, file);
}

/** monta animações a partir de prefixos: { rust_walk: 8 } → rust_walk_0..7 */
export function animList(prefix, n, suffix = '') {
  return Array.from({ length: n }, (_, i) => `${prefix}_${i}${suffix}`);
}
