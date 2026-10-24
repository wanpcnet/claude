// Bot de balanceamento: joga sem trapaças (só entrada simulada), foge das massas, segue o
// objetivo, usa esquiva/pulso e escolhe cartas. Relata vida, nível e tempo por etapa.
// Uso: npm run build && node scripts/e2e/bot.mjs [segundos] [atos]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const LIMIT = Number(process.argv[2] ?? 420);
const ACTS = Number(process.argv[3] ?? 1);
const START = Number(process.argv[4] ?? 0);
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
if (START > 0) {
  // começa num ato posterior com uma build equivalente à obtida pelo bot até ali
  await page.evaluate((act) => {
    const G = window.__veu;
    const build = act === 1
      ? { weapons: { arrow: 1, crown: 3, lance: 4, wind: 3, chain: 3, lotus: 1 }, passives: { vigor: 2, speed: 1 }, flags: {} }
      : { weapons: { arrow: 2, crown: 4, lance: 5, wind: 4, chain: 4, lotus: 2 }, passives: { vigor: 2, speed: 2, area: 1 }, flags: { c_dawn: true } };
    return G.startAct(act, { build, level: act === 1 ? 20 : 28, xp: 0, kills: 0, time: 0, cardsTaken: [], coins: 0, rerolls: 0, hp: 150, damage: {} });
  }, START);
}
await page.evaluate(() => {
  const G = window.__veu;
  let navMap = null, navFor = '';
  // BFS a partir do objetivo (como um jogador que conhece o mapa)
  function nav(w, tx, ty) {
    const A = w.arena, C = A.cols, R = A.rows, key = A.map.id + Math.floor(tx / 32) + ',' + Math.floor(ty / 32);
    if (navFor !== key) {
      navFor = key;
      navMap = new Int32Array(C * R).fill(1e9);
      const q = [];
      const s0 = Math.floor(ty / 32) * C + Math.floor(tx / 32);
      navMap[s0] = 0; q.push(s0);
      while (q.length) {
        const c = q.shift(), cx = c % C, cy = (c - cx) / C;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
          const n = ny * C + nx;
          if (A.blocked[n] || navMap[n] <= navMap[c] + 1) continue;
          navMap[n] = navMap[c] + 1; q.push(n);
        }
      }
    }
    const h = w.hero, cx = Math.floor(h.x / 32), cy = Math.floor(h.y / 32);
    let best = [0, 0], bd = navMap[cy * C + cx];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const n = (cy + dy) * C + cx + dx;
      if (navMap[n] < bd) { bd = navMap[n]; best = [dx, dy]; }
    }
    return { x: best[0], y: best[1], d: bd };
  }
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
      if (d > 60) { const n = nav(w, op.x, op.y); fx += n.x * 2.2; fy += n.y * 2.2; }
      else { fx += (dx / d) * 0.3; fy += (dy / d) * 0.3; }
    } else if (w.boss) {
      const dx = w.boss.x - h.x, dy = w.boss.y - h.y, d = Math.hypot(dx, dy) || 1;
      if (d > 320) { const n = nav(w, w.boss.x, w.boss.y + 60); fx += n.x * 1.5; fy += n.y * 1.5; }
      else { const want = d > 230 ? 0.8 : d < 170 ? -0.8 : 0; fx += (dx / d) * want + (-dy / d) * 0.5; fy += (dy / d) * want + (dx / d) * 0.5; }
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
    // busca cura quando ferida
    if (h.hp < w.stats.maxHp * 0.6) {
      let best = null, bd = 400;
      for (const p of w.pickups.pool.items) {
        if (!p.active || p.kind !== 'heal') continue;
        const d = Math.hypot(p.x - h.x, p.y - h.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) { fx += (best.x - h.x) / bd * 2; fy += (best.y - h.y) / bd * 2; }
    }
    // anel de choque se aproximando: atravessa com a esquiva
    for (const hz of w.hazards.pool.items) {
      if (!hz.active || hz.kind !== 'ring' || !hz.resolved || hz.hitDone) continue;
      const d = Math.hypot(h.x - hz.x, h.y - hz.y);
      if (d - hz.r > 0 && d - hz.r < 34 && h.dashCd <= 0) {
        G.input.press('dash');
        fx += (hz.x - h.x) * 0.05; fy += (hz.y - h.y) * 0.05;
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
  if (s.act >= START + ACTS) { result = 'reached act ' + s.act; break; }
}
const fin = await page.evaluate(() => { const w = window.__veu.world; return w ? { state: window.__veu.state, act: w.actIndex, hp: Math.round(w.hero.hp), lvl: w.level, t: Math.round(w.runTime), kills: w.kills } : null; });
console.log('result', result, JSON.stringify(fin), 'real seconds', Math.round((Date.now() - t0) / 1000));
console.log('errors', JSON.stringify(errors));
await browser.close();
server.kill();
