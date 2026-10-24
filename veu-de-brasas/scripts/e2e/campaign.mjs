// Percorre a campanha inteira em modo debug (heroína protegida, objetivos acelerados) para
// validar transições de ato, Âncoras, elites, chefes, vitória e capturar telas de cada etapa.
// Uso: npm run build && node scripts/e2e/campaign.mjs [saída]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const OUT = process.argv[2] ?? '.e2e-out';
mkdirSync(OUT, { recursive: true });
const PORT = 4790;
const W = Number(process.env.VW ?? 1280);
const H = Number(process.env.VH ?? 720);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const errors = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
const g = (fn, arg) => page.evaluate(fn, arg);

async function pickCards() {
  for (let i = 0; i < 20; i++) {
    const st = await g(() => window.__veu.state);
    if (st !== 'cards') return;
    await page.keyboard.press('Digit1');
    await sleep(600);
  }
}

async function protect() {
  await g(() => {
    const w = window.__veu.world;
    if (!w) return;
    w.hero.hp = w.stats.maxHp;
    w.hero.invuln = 3;
  });
}

async function runStage(label, maxSec = 60) {
  const start = Date.now();
  let lastStage = await g(() => window.__veu.world?.director.stageIndex);
  let act = await g(() => window.__veu.world?.actIndex);
  while ((Date.now() - start) / 1000 < maxSec) {
    await protect();
    await pickCards();
    const info = await g(() => {
      const G = window.__veu;
      const w = G.world;
      if (!w) return { state: G.state };
      const d = w.director;
      const s = d.stage;
      if (s.type === 'kills') d.kills = Math.max(d.kills, s.goal);
      if (s.type === 'anchor') {
        const a = w.arena.markers.get('A');
        w.hero.x = a.x; w.hero.y = a.y + 30;
        d.channel = Math.max(d.channel, s.channel - 1.2);
      }
      if ((s.type === 'elite' || s.type === 'boss') && d.target && d.target.alive && d.target.state !== 'spawn') {
        if (d.target.hp > d.target.maxHp * 0.04) w.damageEnemy(d.target, { amount: d.target.maxHp * 0.02, type: 'arcane', source: 0 });
      }
      return { state: G.state, act: w.actIndex, stage: d.stageIndex, type: s.type, fin: d.finished, boss: !!w.boss };
    });
    if (info.state === 'results') return info;
    if (info.act !== act) return info;
    if (info.stage !== lastStage) {
      lastStage = info.stage;
      return info;
    }
    await sleep(250);
  }
  return { timeout: label };
}

try {
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForSelector('#loading.done', { timeout: 60000 });
  await page.click('text=Jogar');
  await sleep(300);
  await page.click('text=Nova jornada');
  await sleep(3500);
  // ganha alguns níveis para testar várias cartas e habilidades
  for (let k = 0; k < 8; k++) {
    await g(() => window.__veu.world.addXp(window.__veu.world.xpNext));
    await sleep(500);
    await pickCards();
  }
  await g(() => window.__veu.debugSpawn(120));
  await sleep(2500);
  await shot('c01-act1-build');
  for (let step = 0; step < 14; step++) {
    const r = await runStage('step' + step, 70);
    console.log('step', step, JSON.stringify(r));
    await sleep(900);
    await shot(`c${String(step + 2).padStart(2, '0')}-${r.type ?? r.state ?? 'x'}-a${r.act ?? ''}`);
    if (r.state === 'results' || r.timeout) break;
    if (r.boss || r.type === 'boss') {
      await sleep(3200);
      await shot(`c${String(step + 2).padStart(2, '0')}b-boss-fight`);
    }
    if (r.type === 'elite') {
      await sleep(1500);
      await shot(`c${String(step + 2).padStart(2, '0')}b-elite-fight`);
    }
  }
  await sleep(1500);
  await shot('c99-end');
  console.log('final state', await g(() => window.__veu.state));
} catch (e) {
  errors.push('test: ' + e.message);
  await shot('c-fail');
}
console.log('errors', JSON.stringify(errors.slice(0, 20), null, 1));
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
