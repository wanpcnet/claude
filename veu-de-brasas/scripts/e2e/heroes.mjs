// E2E dos heróis e das 18 armas: para cada herói inicia uma partida, concede todas as armas no
// nível máximo com evoluções/combos, invoca uma horda, usa habilidade (Q) e Suprema (R) e captura telas.
// Também inicia o modo Sem Fim e o Desafio Diário. Uso: npm run build && node scripts/e2e/heroes.mjs [saída]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '.e2e-out/heroes';
mkdirSync(OUT, { recursive: true });
const PORT = 4790;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const errors = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const state = () => page.evaluate(() => window.__veu.state);
async function waitPlaying() {
  for (let i = 0; i < 60 && (await state()) !== 'playing'; i++) await sleep(200);
}
try {
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForSelector('#loading.done', { timeout: 60000 });
  await page.evaluate(() => {
    const s = window.__veu.save.data;
    s.heroes = ['lysa', 'orin', 'brann', 'nyx'];
    s.ashes = 5000;
    s.difficulties = ['normal', 'nightmare', 'torment'];
  });
  await page.click('text=Santuário');
  await sleep(400);
  await page.click('.talent >> nth=0');
  await sleep(300);
  await shot('00-sanctuary');
  await page.click('text=Voltar');
  for (const hero of ['lysa', 'orin', 'brann', 'nyx']) {
    await page.click('text=Jogar');
    await sleep(300);
    await page.click(`.hero-pick:has-text("${hero[0].toUpperCase() + hero.slice(1)}")`);
    await sleep(300);
    if (hero === 'lysa') await shot('01-select');
    await page.click('text=Nova jornada');
    await waitPlaying();
    await sleep(800);
    await page.evaluate(() => {
      const w = window.__veu.world;
      const ids = ['arrow', 'crown', 'lance', 'chain', 'lotus', 'wind', 'dagger', 'missile', 'meteor', 'frost', 'spikes', 'totem', 'wisp', 'whip', 'moon', 'void', 'rain', 'thorns'];
      for (const id of ids) w.build.weapons[id] = 5;
      for (const f of ['l_phoenix', 'l_solar', 'l_storm', 'l_blades', 'l_comet', 'l_iceage', 'l_bones', 'l_legion', 'l_bloodmoon', 'l_eventhorizon', 'c_tornado', 'c_thunder', 'c_dawn', 'c_shatter', 'c_conduct', 'c_bloodthorn', 'c_abyss']) w.build.flags[f] = true;
      Object.assign(w.build.passives, { amount: 2, crit: 3, duration: 2, dash: 1 });
      w.refreshStats();
      w.xpNext = 1e9;
      window.__veu.debugSpawn(250, 'rust');
      window.__veu.debugSpawn(30, 'shell');
    });
    await sleep(2500);
    await page.evaluate(() => {
      const w = window.__veu.world;
      w.hero.energy = 100;
      w.abilities.ult = 100;
    });
    await page.keyboard.press('KeyQ');
    await sleep(500);
    await page.keyboard.press('KeyR');
    await sleep(1500);
    await shot(`02-${hero}`);
    const info = await page.evaluate(() => {
      const w = window.__veu.world;
      return { hero: w.build.hero, alive: w.enemies.aliveCount, kills: w.kills, hp: Math.round(w.hero.hp), ultT: w.abilities.ultT, dmg: Object.keys(w.damageBySource).length, state: window.__veu.state };
    });
    console.log(JSON.stringify(info));
    await page.evaluate(() => window.__veu.toMenu());
    await sleep(500);
  }
  // Sem Fim
  await page.click('text=Jogar');
  await sleep(300);
  await page.click('.segmented >> text=Sem Fim');
  await sleep(200);
  await page.click('text=Iniciar Sem Fim');
  await waitPlaying();
  await page.evaluate(() => {
    const w = window.__veu.world;
    w.time = 299;
    w.hero.invuln = 99;
  });
  await sleep(4500);
  await shot('03-endless-boss');
  console.log('endless', JSON.stringify(await page.evaluate(() => { const w = window.__veu.world; return { endless: w.endless, boss: !!w.boss, scale: w.endlessScale().toFixed(2), obj: w.director.objective }; })));
  await page.evaluate(() => { const w = window.__veu.world; w.hero.invuln = 0; w.hero.hp = 1; w.damageHero(999, w.hero.x + 5, w.hero.y); });
  await sleep(3000);
  await shot('04-endless-results');
  console.log('after death', await state());
  await page.evaluate(() => window.__veu.toMenu());
  // Diário
  await page.click('text=Jogar');
  await sleep(300);
  await page.click('.segmented >> text=Desafio Diário');
  await sleep(200);
  await shot('05-daily-select');
  await page.click('text=Aceitar desafio');
  await waitPlaying();
  await sleep(1500);
  console.log('daily', JSON.stringify(await page.evaluate(() => { const w = window.__veu.world; return { cfg: w.cfg, hero: w.build.hero, weapons: Object.keys(w.build.weapons) }; })));
  await shot('06-daily');
} catch (e) {
  errors.push('script: ' + e.message);
  await shot('zz-fail');
}
console.log('errors', JSON.stringify(errors));
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
