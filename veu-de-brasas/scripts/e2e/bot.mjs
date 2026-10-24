// Bot de balanceamento: joga sem trapaças (só entrada simulada), foge das massas, segue o
// objetivo, usa esquiva/pulso e escolhe cartas. Relata vida, nível e tempo por etapa.
// Uso: npm run build && node scripts/e2e/bot.mjs [segundos] [atos]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const LIMIT = Number(process.argv[2] ?? 420);
const ACTS = Number(process.argv[3] ?? 1);
const PORT = 4792;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/?debug`);
await page.waitForSelector('#loading.done', { timeout: 60000 });
await page.click('text=Jogar');
await page.waitForTimeout(300);
await page.click('text=Nova jornada');
await page.waitForTimeout(3000);
// qualidade baixa para o navegador sem GPU manter a simulação perto do tempo real
await page.evaluate(() => { window.__veu.save.data.settings.quality = 'low'; window.__veu.applySettings(); });
await page.evaluate(() => {
  const G = window.__veu;
  setInterval(() => {
    const w = G.world;
    if (!w) return;
    if (G.state === 'cards') {
      G.pickCard(0);
      return;
    }
    if (G.state !== 'playing') return;
    const h = w.hero;
    let fx = 0, fy = 0;
    // repulsão das ameaças próximas
    for (const e of w.enemies.pool.items) {
      if (!e.alive) continue;
      const dx = h.x - e.x, dy = h.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 200 * 200) continue;
      const d = Math.sqrt(d2) || 1;
      const k = (e.boss ? 6 : e.def.elite ? 3 : 1) / (d * d) * 4000;
      fx += (dx / d) * k; fy += (dy / d) * k;
    }
    // atração pelo objetivo e pelas gemas
    const op = w.director.objectivePoint;
    if (op && w.director.stage.type === 'anchor') {
      const dx = op.x - h.x, dy = op.y - h.y, d = Math.hypot(dx, dy) || 1;
      const k = d > 40 ? 1.6 : 0.2;
      fx += (dx / d) * k; fy += (dy / d) * k;
    } else if (op && (w.director.stage.type === 'elite')) {
      const dx = op.x - h.x, dy = op.y - h.y, d = Math.hypot(dx, dy) || 1;
      const want = d > 250 ? 1 : d < 190 ? -1 : 0;
      fx += (dx / d) * want * 0.8; fy += (dy / d) * want * 0.8;
    } else {
      // ronda pelo centro do mapa
      const cx = w.arena.width / 2 + Math.cos(w.time * 0.2) * 300, cy = w.arena.height / 2 + Math.sin(w.time * 0.2) * 200;
      const dx = cx - h.x, dy = cy - h.y, d = Math.hypot(dx, dy) || 1;
      fx += (dx / d) * 0.5; fy += (dy / d) * 0.5;
    }
    // esquiva de avisos no solo: sai perpendicularmente e usa a esquiva
    for (const hz of w.hazards.pool.items) {
      if (!hz.active || hz.resolved || hz.dmg <= 0) continue;
      if (w.hazards.inside(hz, h.x, h.y, 10)) {
        const ax = h.x - hz.x, ay = h.y - hz.y, al = Math.hypot(ax, ay) || 1;
        const px = hz.kind === 'line' || hz.kind === 'cone' ? -Math.sin(hz.ang) : ax / al;
        const py = hz.kind === 'line' || hz.kind === 'cone' ? Math.cos(hz.ang) : ay / al;
        fx += px * 30; fy += py * 30;
        if (hz.t > hz.delay * 0.55 && h.dashCd <= 0) G.input.press('dash');
      }
    }
    const l = Math.hypot(fx, fy) || 1;
    G.input.touchActive = true;
    G.input.touchX = fx / l;
    G.input.touchY = fy / l;
    // pulso quando cercada; esquiva quando muito perto
    let near = 0;
    w.enemies.forRadius(h.x, h.y, 70, () => near++);
    if (near > 10 && h.energy > 60) G.input.press('pulse');
    if (near > 4 && h.dashCd <= 0 && Math.random() < 0.3) G.input.press('dash');
  }, 50);
});
const t0 = Date.now();
let lastStage = '';
let result = 'timeout';
while ((Date.now() - t0) / 1000 < LIMIT) {
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => {
    const G = window.__veu, w = G.world;
    if (!w) return { state: G.state };
    return { state: G.state, act: w.actIndex, stage: w.director.stage.type + w.director.stageIndex, hp: Math.round(w.hero.hp), max: w.stats.maxHp, lvl: w.level, t: Math.round(w.time), kills: w.kills, alive: w.enemies.aliveCount, weapons: JSON.stringify(w.build.weapons) };
  });
  const key = `${s.act}-${s.stage}`;
  if (key !== lastStage) {
    console.log('stage', JSON.stringify(s));
    lastStage = key;
  }
  if (s.state === 'results') { result = 'defeat-or-victory'; break; }
  if (s.act >= ACTS) { result = 'reached act ' + s.act; break; }
}
const fin = await page.evaluate(() => { const w = window.__veu.world; return w ? { state: window.__veu.state, act: w.actIndex, hp: Math.round(w.hero.hp), lvl: w.level, t: Math.round(w.runTime), kills: w.kills } : null; });
console.log('result', result, JSON.stringify(fin), 'real seconds', Math.round((Date.now() - t0) / 1000));
console.log('errors', JSON.stringify(errors));
await browser.close();
server.kill();
