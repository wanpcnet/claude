// Teste de fumaça E2E: sobe `vite preview`, abre o jogo em Chromium (WebGL), navega pelos
// menus, joga alguns segundos, força cartas/estresse via modo debug e registra erros/404.
// Uso: npm run build && node scripts/e2e/smoke.mjs [saída]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '.e2e-out';
mkdirSync(OUT, { recursive: true });
const PORT = 4789;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));

const errors = [];
const failed = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.VW ?? 1280), height: Number(process.env.VH ?? 720) } });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => failed.push(r.url() + ' ' + r.failure()?.errorText));
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
try {
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForSelector('#loading.done', { timeout: 60000 });
  await sleep(1200);
  await shot('01-menu');
  await page.click('text=Jogar');
  await sleep(400);
  await shot('02-select');
  await page.click('text=Nova jornada');
  await sleep(3200);
  await shot('03-act1-start');
  // anda em círculos e usa esquiva/pulso
  const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down(keys[i % 4]);
    await sleep(900);
    if (i === 2) await page.keyboard.press('Space');
    if (i === 4) {
      await page.evaluate(() => (window.__veu.world.hero.energy = 100));
      await page.keyboard.press('KeyQ');
      await sleep(120);
      await shot('04-pulse');
    }
    await page.keyboard.up(keys[i % 4]);
  }
  await shot('05-combat');
  // estresse: centenas de inimigos
  await page.evaluate(() => window.__veu.debugSpawn(300, 'rust'));
  await page.evaluate(() => window.__veu.debugSpawn(40, 'spider'));
  await sleep(2500);
  await shot('06-horde');
  const perf = await page.evaluate(() => {
    const w = window.__veu.world;
    return { alive: w.enemies.aliveCount, particles: w.particles.count, hp: w.hero.hp };
  });
  console.log('horde', JSON.stringify(perf));
  // força subida de nível -> cartas
  await page.evaluate(() => {
    const w = window.__veu.world;
    w.hero.hp = w.stats.maxHp;
    w.addXp(w.xpNext);
  });
  await sleep(1500);
  await shot('07-cards');
  for (let k = 0; k < 6 && (await page.evaluate(() => window.__veu.state)) === 'cards'; k++) {
    await page.keyboard.press('Digit2');
    await sleep(800);
  }
  await page.keyboard.press('Escape');
  await sleep(400);
  await shot('08-pause');
  await page.click('text=Continuar');
  await sleep(500);
  for (let k = 0; k < 6 && (await page.evaluate(() => window.__veu.state)) === 'cards'; k++) {
    await page.keyboard.press('Digit1');
    await sleep(800);
  }
  const state = await page.evaluate(() => window.__veu.state);
  console.log('state after resume', state);
  // áudio decodificado após gesto do usuário
  console.log('audio buffers', await page.evaluate(() => window.__veu.audio.buffers.size));
  // gamepad simulado: analógico para a direita move a heroína
  const x0 = await page.evaluate(() => { const w = window.__veu.world; w.pendingLevels = 0; w.xp = 0; w.xpNext = 1e9; w.enemies.clear(); return w.hero.x; });
  await sleep(600);
  for (let k = 0; k < 6 && (await page.evaluate(() => window.__veu.state)) === 'cards'; k++) {
    await page.keyboard.press('Digit1');
    await sleep(800);
  }
  await page.evaluate(() => {
    const pad = { connected: true, axes: [1, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [pad];
  });
  const xs = await page.evaluate(() => window.__veu.world.hero.x);
  const mv = await page.evaluate(() => { window.__veu.input.pollGamepad(); return window.__veu.input.move(); });
  await sleep(1200);
  const x1 = await page.evaluate(() => window.__veu.world.hero.x);
  console.log('gamepad vector', JSON.stringify(mv), 'moved', Math.round(x1 - xs), 'state', await page.evaluate(() => { const w = window.__veu.world; return [window.__veu.state, w.pendingLevels, w.pendingBonus, w.level, w.xp, w.xpNext].join(','); }));
  await page.evaluate(() => (navigator.getGamepads = () => []));
  // qualidade baixa e média sem erros
  for (const q of ['low', 'medium', 'high']) {
    await page.evaluate((q) => { window.__veu.save.data.settings.quality = q; window.__veu.applySettings(); }, q);
    await sleep(700);
    await shot('09-quality-' + q);
  }
} catch (e) {
  errors.push('test: ' + e.message);
  await shot('99-fail');
}
console.log('errors', JSON.stringify(errors.slice(0, 20), null, 1));
console.log('failed', JSON.stringify(failed.slice(0, 20), null, 1));
await browser.close();
server.kill();
process.exit(errors.length || failed.length ? 1 : 0);
