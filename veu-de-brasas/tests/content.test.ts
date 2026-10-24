import { describe, it, expect } from 'vitest';
import { MAPS, normalizedRows, BLOCKING, findChar } from '../src/content/maps';
import { ACTS } from '../src/content/acts';
import { ENEMIES } from '../src/content/enemies';
import { PROPS } from '../src/content/props';
import { readFileSync, existsSync } from 'node:fs';

/** BFS na grade do layout autoral (verifica que não há objetivo inalcançável). */
function reachable(rows: string[], sx: number, sy: number): Set<number> {
  const W = rows[0].length;
  const seen = new Set<number>([sy * W + sx]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny < 0 || ny >= rows.length || nx < 0 || nx >= W) continue;
      if (BLOCKING.has(rows[ny][nx])) continue;
      const k = ny * W + nx;
      if (!seen.has(k)) {
        seen.add(k);
        q.push([nx, ny]);
      }
    }
  }
  return seen;
}

describe('Mapas autorais', () => {
  for (const [name, m] of Object.entries(MAPS)) {
    it(`${name}: dimensões, marcadores e alcance`, () => {
      const rows = normalizedRows(m);
      expect(rows.length).toBe(m.height);
      const start = findChar(m, '@')!;
      expect(start).not.toBeNull();
      const reach = reachable(rows, start.x, start.y);
      for (const ch of ['A', ...Object.keys(m.legend).filter((c) => c === 'M' || c === 'K')]) {
        const p = findChar(m, ch);
        if (!p) continue;
        // o alvo (ou uma célula vizinha) precisa ser alcançável a partir do início
        const W = m.width;
        const near = [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => reach.has((p.y + dy) * W + p.x + dx));
        expect(near, `${name} ${ch}`).toBe(true);
      }
      // todas as letras usadas têm significado
      const known = new Set(['%', '#', '~', '.', ',', '=', '@', 'A', 'E', 'B', ...Object.keys(m.legend)]);
      for (const r of rows) for (const ch of r) expect(known.has(ch), `${name}: caractere '${ch}'`).toBe(true);
      // ao menos 60% da área caminhável é alcançável (sem bolsões gigantes isolados)
      let walk = 0;
      for (const r of rows) for (const ch of r) if (!BLOCKING.has(ch)) walk++;
      expect(reach.size / walk).toBeGreaterThan(0.6);
      for (const id of Object.values(m.legend)) expect(PROPS[id], id).toBeTruthy();
    });
  }
});

describe('Roteiro dos atos', () => {
  it('referencia inimigos e mapas existentes', () => {
    expect(ACTS.length).toBe(3);
    for (const act of ACTS) {
      expect(MAPS[act.map]).toBeTruthy();
      for (const w of act.waves) expect(ENEMIES[w.enemy], w.enemy).toBeTruthy();
      for (const p of [...act.ambient, act.bossAmbient, act.channelAmbient]) for (const k of Object.keys(p.mix)) expect(ENEMIES[k], k).toBeTruthy();
      for (const s of act.stages) {
        if (s.type === 'elite') expect(ENEMIES[s.enemy].elite).toBe(true);
        if (s.type === 'elite' || s.type === 'boss') expect(findChar(MAPS[act.map], s.at), `${act.map} ${s.at}`).not.toBeNull();
      }
    }
  });
  it('sete arquétipos comuns, dois elites e dois chefes', () => {
    const list = Object.values(ENEMIES);
    expect(list.filter((e) => !e.elite).length).toBe(7);
    expect(list.filter((e) => e.elite).length).toBe(2);
    expect(new Set(list.map((e) => e.ai)).size).toBe(9);
    const bosses = ACTS.flatMap((a) => a.stages).filter((s) => s.type === 'boss');
    expect(bosses.length).toBe(2);
  });
});

describe('Assets existem no repositório', () => {
  it('atlas, áudio, fontes e solo', () => {
    const base = 'public/assets/';
    const atlases = ['characters/hero_lysa', 'characters/hero_orin', 'characters/hero_brann', 'characters/hero_nyx', 'enemies/enemies', 'enemies/bosses', 'effects/fx', 'environment/props', 'ui/icons'];
    for (const a of atlases) {
      expect(existsSync(base + a + '.png'), a).toBe(true);
      const j = JSON.parse(readFileSync(base + a + '.json', 'utf8'));
      expect(Object.keys(j.frames).length).toBeGreaterThan(5);
    }
    const enemies = JSON.parse(readFileSync(base + 'enemies/enemies.json', 'utf8'));
    for (const e of Object.values(ENEMIES)) {
      expect(enemies.animations[e.walkAnim], e.walkAnim).toBeTruthy();
      expect(enemies.animations[e.anim + '_death'], e.anim).toBeTruthy();
    }
    const props = JSON.parse(readFileSync(base + 'environment/props.json', 'utf8'));
    for (const [id, def] of Object.entries(PROPS)) for (let v = 0; v < def.variants; v++) expect(props.frames[`${id}_${v}`], id).toBeTruthy();
    for (const m of ['arenaA', 'arenaB', 'arenaC']) {
      const c = JSON.parse(readFileSync(`${base}environment/ground/${m}_chunks.json`, 'utf8'));
      for (const ch of c.chunks) expect(existsSync(`${base}environment/ground/${ch.file}`)).toBe(true);
    }
    expect(existsSync(base + 'audio/music_combat.ogg')).toBe(true);
    expect(existsSync(base + 'ui/dmg.fnt')).toBe(true);
  });
});
