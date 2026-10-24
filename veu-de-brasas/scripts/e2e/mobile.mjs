// Teste em emulação de celular (toque real via CDP): menu por toque, joystick virtual,
// botões de esquiva/pulso, cartas por toque, retrato e paisagem.
// Uso: npm run build && node scripts/e2e/mobile.mjs [saída] [portrait|landscape]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const OUT = process.argv[2] ?? '.e2e-out';
const ORI = process.argv[3] ?? 'portrait';
mkdirSync(OUT, { recursive: true });
const PORT = 4796;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const dev = devices['Pixel 7'];
const vp = ORI === 'portrait' ? dev.viewport : { width: dev.viewport.height, height: dev.viewport.width };
const ctx = await browser.newContext({ ...dev, viewport: vp });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const shot = (n) => page.screenshot({ path: `${OUT}/m-${ORI}-${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
const tapText = async (t) => {
  const b = await page.locator(`text=${t}`).first().boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
};
try {
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForSelector('#loading.done', { timeout: 60000 });
  await sleep(800);
  await shot('01-menu');
  await tapText('Jogar');
  await sleep(400);
  await tapText('Nova jornada');
  await sleep(3500);
  await shot('02-game');
  const info0 = await page.evaluate(() => ({ q: window.__veu.quality, touch: !document.querySelector('.touch').classList.contains('hidden'), x: window.__veu.world.hero.x, y: window.__veu.world.hero.y }));
  console.log('start', JSON.stringify(info0));
  // arrasta o joystick para a direita por ~1,5 s
  const sx = vp.width * 0.22, sy = vp.height * 0.75;
  await touch('touchStart', sx, sy);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', sx + i * 6, sy); await sleep(30); }
  await sleep(1500);
  await shot('03-joystick');
  await touch('touchEnd', 0, 0);
  const info1 = await page.evaluate(() => ({ x: window.__veu.world.hero.x, y: window.__veu.world.hero.y, energy: window.__veu.world.hero.energy }));
  console.log('after joystick moved', Math.round(Math.hypot(info1.x - info0.x, info1.y - info0.y)));
  // botões de toque
  const dash = await page.locator('.tbtn.dash').boundingBox();
  await page.touchscreen.tap(dash.x + dash.width / 2, dash.y + dash.height / 2);
  await page.evaluate(() => (window.__veu.world.hero.energy = 100));
  const pulse = await page.locator('.tbtn.pulse').boundingBox();
  await page.touchscreen.tap(pulse.x + pulse.width / 2, pulse.y + pulse.height / 2);
  await sleep(150);
  await shot('04-pulse');
  console.log('energy after pulse', Math.round(await page.evaluate(() => window.__veu.world.hero.energy)));
  // cartas por toque
  await page.evaluate(() => window.__veu.world.addXp(window.__veu.world.xpNext));
  await sleep(1500);
  await shot('05-cards');
  const card = await page.locator('.card').first().boundingBox();
  if (card) await page.touchscreen.tap(card.x + card.width / 2, card.y + card.height / 2);
  await sleep(900);
  console.log('state after card tap', await page.evaluate(() => window.__veu.state));
  const pz = await page.locator('.tbtn.pause').boundingBox();
  await page.touchscreen.tap(pz.x + pz.width / 2, pz.y + pz.height / 2);
  await sleep(500);
  await shot('06-pause');
  console.log('state after pause tap', await page.evaluate(() => window.__veu.state));
} catch (e) {
  errors.push('test: ' + e.message);
  await shot('99-fail');
}
console.log('errors', JSON.stringify(errors));
await browser.close();
server.kill();
