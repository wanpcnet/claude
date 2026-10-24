// Captura os chefes em ação (padrões telegrafados e fases) e verifica ausência de erros.
// Uso: npm run build && node scripts/e2e/bosses.mjs [saída]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const OUT = process.argv[2] ?? '.e2e-out';
mkdirSync(OUT, { recursive: true });
const PORT = 4791;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const errors = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.VW ?? 1280), height: Number(process.env.VH ?? 720) } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
const g = (fn, arg) => page.evaluate(fn, arg);
const protect = () => g(() => { const w = window.__veu.world; if (w) { w.hero.hp = w.stats.maxHp; w.hero.invuln = 2; } });

async function gotoBoss(act, stage) {
  await g(([act, stage]) => {
    const G = window.__veu;
    const st = { build: { weapons: { arrow: 3, crown: 3, chain: 2, lance: 2 }, passives: {}, flags: {} }, level: 12, xp: 0, kills: 0, time: 300, cardsTaken: [], coins: 0, rerolls: 0, hp: 200, damage: {} };
    G.state = 'playing';
    return G.startAct(act, st).then(() => {
      const d = G.world.director;
      d.stageIndex = stage - 1;
      d.next();
    });
  }, [act, stage]);
}

async function watch(prefix, seconds, every = 1.2) {
  for (let t = 0, i = 0; t < seconds; t += every, i++) {
    await protect();
    await sleep(every * 1000);
    await shot(`${prefix}-${String(i).padStart(2, '0')}`);
  }
}

try {
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForSelector('#loading.done', { timeout: 60000 });
  await page.click('text=Jogar');
  await sleep(300);
  await page.click('text=Nova jornada');
  await sleep(3000);
  // Batráquio Colossal (Ato II, estágio 3)
  await gotoBoss(1, 3);
  await sleep(2500);
  await shot('b-toad-intro');
  await watch('b-toad', 7, 1.0);
  await g(() => { const b = window.__veu.world.boss; b.hp = b.maxHp * 0.45; });
  await watch('b-toad-rage', 6, 1.0);
  // Coração do Véu (Ato III, estágio 2)
  await gotoBoss(2, 2);
  await sleep(2500);
  await shot('b-heart-intro');
  await watch('b-heart-p1', 5, 1.0);
  await g(() => { const b = window.__veu.world.boss; b.hp = b.maxHp * 0.6; });
  await watch('b-heart-p2', 6, 1.0);
  await g(() => { const b = window.__veu.world.boss; b.hp = b.maxHp * 0.3; });
  await watch('b-heart-p3', 6, 1.0);
  await g(() => { const w = window.__veu.world; w.damageEnemy(w.boss, { amount: 1e6, type: 'arcane', source: 0 }); });
  await sleep(1500);
  await shot('b-heart-death');
  await sleep(4500);
  await shot('b-victory');
  console.log('final', await g(() => window.__veu.state));
} catch (e) {
  errors.push('test: ' + e.message);
  await shot('b-fail');
}
console.log('errors', JSON.stringify(errors.slice(0, 10), null, 1));
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
