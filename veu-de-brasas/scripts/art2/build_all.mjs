// Pipeline de arte v2 (vetorial): gera todos os atlas, ícones, retratos, emblema, ilustração do
// menu, cursor e a fonte dos números de dano. Uso: node scripts/art2/build_all.mjs [parte...]
// O solo e os props do cenário vêm de scripts/assets/ground_cc0.py e props_cc0.mjs (texturas/modelos CC0).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atlas, single, closeBrowser, openBrowser } from './raster.mjs';
import { heroSprites, heroPortrait, LOOKS } from './hero.mjs';
import { enemySprites } from './enemies.mjs';
import { bossSprites } from './bosses.mjs';
import { propSprites } from './props.mjs';
import { fxSprites } from './fx.mjs';
import { iconSvgs } from './icons.mjs';
import { keyartSvg, emblemSvg, cursorSvg } from './keyart.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'public', 'assets');
const want = new Set(process.argv.slice(2));
const on = (k) => !want.size || want.has(k);
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

if (on('heroes')) {
  for (const id of Object.keys(LOOKS)) {
    const { sprites, animations } = heroSprites(id);
    log('hero', id, await atlas(join(OUT, 'characters', `hero_${id}`), `hero_${id}.png`, sprites, animations, 2048));
    await single(join(OUT, 'ui', 'portraits', `${id}.png`), 64, 64, heroPortrait(id), 4);
  }
}
if (on('enemies')) {
  const e = enemySprites();
  log('enemies', await atlas(join(OUT, 'enemies', 'enemies'), 'enemies.png', e.sprites, e.animations, 2048));
}
if (on('bosses')) {
  const b = bossSprites();
  log('bosses', await atlas(join(OUT, 'enemies', 'bosses'), 'bosses.png', b.sprites, b.animations, 4096));
}
// props vetoriais antigos: substituídos por scripts/assets/props_cc0.mjs (só rodam se pedidos explicitamente)
if (want.has('props-vector')) {
  const p = propSprites();
  log('props', await atlas(join(OUT, 'environment', 'props'), 'props.png', p.sprites, p.animations, 2048));
}
if (on('fx')) {
  const x = fxSprites();
  log('fx', await atlas(join(OUT, 'effects', 'fx'), 'fx.png', x.sprites, x.animations, 4096));
}
if (on('icons')) {
  const icons = iconSvgs();
  for (const { id, svg } of icons) await single(join(OUT, 'ui', 'icons', `${id}.png`), 32, 32, svg, 4);
  log('icons', await atlas(join(OUT, 'ui', 'icons'), 'icons.png', icons.map(({ id, svg }) => ({ name: `icon_${id}`, w: 32, h: 32, svg })), {}, 1024));
}
if (on('ui')) {
  await single(join(OUT, 'ui', 'emblem.png'), 96, 96, emblemSvg(), 2);
  await single(join(OUT, 'ui', 'cursor.png'), 16, 16, cursorSvg(), 2);
  await single(join(OUT, 'ui', 'keyart.png'), 960, 540, keyartSvg(), 2);
  // barras usadas pelo motor (vida de elites/chefes): tamanhos fixos em px
  await single(join(OUT, 'ui', 'bar_frame.png'), 128, 24, `<rect x="1" y="3" width="126" height="18" rx="9" fill="#120c1a" fill-opacity="0.85" stroke="#1b1226" stroke-width="2"/><rect x="2.5" y="4.5" width="123" height="15" rx="7.5" fill="none" stroke="#ffffff" stroke-opacity="0.18"/>`, 1);
  const fill = (a, b) => `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="64" height="16" fill="url(#g)"/><rect width="64" height="5" fill="#fff" opacity="0.25"/>`;
  await single(join(OUT, 'ui', 'bar_hp.png'), 64, 16, fill('#ff8a7a', '#c0283a'), 1);
  await single(join(OUT, 'ui', 'bar_boss.png'), 64, 16, fill('#ffc070', '#d0562a'), 1);
  await single(join(OUT, 'ui', 'bar_energy.png'), 64, 16, fill('#ffe08a', '#d07a14'), 1);
  await single(join(OUT, 'ui', 'bar_xp.png'), 64, 16, fill('#9ff4e0', '#2ab890'), 1);
  log('ui ok');
}
if (on('font')) await buildFont();
await closeBrowser();
log('pronto');

/** fonte bitmap dos números (Alegreya Sans 900 com contorno), gerada a partir da fonte OFL local */
async function buildFont() {
  const woff = readFileSync(join(ROOT, 'node_modules/@fontsource/alegreya-sans/files/alegreya-sans-latin-900-normal.woff2')).toString('base64');
  const chars = '0123456789+-!x ';
  const SIZE = 40, CW = 34, CH = 46, COLS = 8;
  const b = await openBrowser();
  const page = await b.newPage({ viewport: { width: CW * COLS, height: CH * 2 } });
  const cells = [...chars].map((c, i) => `<div style="position:absolute;left:${(i % COLS) * CW}px;top:${Math.floor(i / COLS) * CH}px;width:${CW}px;height:${CH}px;display:flex;align-items:center;justify-content:center"><span>${c === ' ' ? '&nbsp;' : c}</span></div>`).join('');
  await page.setContent(`<!doctype html><html><head><style>@font-face{font-family:D;src:url(data:font/woff2;base64,${woff})}html,body{margin:0;background:transparent}span{font-family:D;font-size:${SIZE}px;line-height:1;color:#fff;-webkit-text-stroke:7px #1b1226;paint-order:stroke fill;font-weight:900}</style></head><body>${cells}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => [...document.querySelectorAll('span')].map((s) => s.getBoundingClientRect().width));
  const file = join(OUT, 'ui', 'dmg.png');
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: CW * COLS, height: CH * 2 } });
  await page.close();
  let fnt = `info face="dmg" size=${CH} bold=1 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0\ncommon lineHeight=${CH} base=${CH - 8} scaleW=${CW * COLS} scaleH=${CH * 2} pages=1 packed=0\npage id=0 file="dmg.png"\nchars count=${chars.length}\n`;
  [...chars].forEach((c, i) => {
    const adv = Math.round(Math.max(10, widths[i] - 5));
    fnt += `char id=${c.charCodeAt(0)} x=${(i % COLS) * CW} y=${Math.floor(i / COLS) * CH} width=${CW} height=${CH} xoffset=${Math.round((adv - CW) / 2)} yoffset=0 xadvance=${adv} page=0 chnl=15\n`;
  });
  writeFileSync(join(OUT, 'ui', 'dmg.fnt'), fnt);
  log('font ok');
}
void mkdirSync;
