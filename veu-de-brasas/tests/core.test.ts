import { describe, it, expect } from 'vitest';
import { SpatialHash } from '../src/utils/SpatialHash';
import { Pool } from '../src/utils/Pool';
import { Rng } from '../src/utils/rng';
import { CARDS, newBuild, rollCards, deriveStats, xpForLevel } from '../src/content/upgrades';
import { WEAPONS, WEAPON_ORDER } from '../src/content/weapons';
import { migrate, defaultSave, SAVE_VERSION } from '../src/systems/Save';
import { HEROES } from '../src/content/heroes';
import { TALENTS, RELICS, computeMeta, dailyChallenge, DAILY_MODS } from '../src/content/meta';
import { readFileSync } from 'node:fs';

describe('SpatialHash', () => {
  it('encontra apenas itens nas células próximas', () => {
    const h = new SpatialHash(1000, 1000, 50, 100);
    h.insert(0, 10, 10);
    h.insert(1, 500, 500);
    h.insert(2, 30, 40);
    const r = h.query(20, 20, 30).sort();
    expect(r).toEqual([0, 2]);
    expect(h.query(500, 500, 10)).toEqual([1]);
    h.clear();
    expect(h.query(20, 20, 30)).toEqual([]);
  });
  it('tolera coordenadas fora do mapa', () => {
    const h = new SpatialHash(100, 100, 50, 10);
    h.insert(3, -50, 999);
    expect(h.query(0, 100, 60)).toContain(3);
  });
});

describe('Pool', () => {
  it('reutiliza objetos e respeita o máximo', () => {
    const p = new Pool(() => ({ active: false, v: 0 }), 2, 3);
    const a = p.acquire()!;
    const b = p.acquire()!;
    const c = p.acquire()!;
    expect(p.acquire()).toBeNull();
    p.release(b);
    expect(p.acquire()).toBe(b);
    expect(p.activeCount).toBe(3);
    expect(a.active && c.active).toBe(true);
  });
});

describe('Cartas', () => {
  it('possui ao menos 14 cartas distintas', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBeGreaterThanOrEqual(14);
  });
  it('nunca oferece carta maximizada nem repetida', () => {
    const rng = new Rng(7);
    const b = newBuild();
    for (let lvl = 2; lvl < 80; lvl++) {
      const cards = rollCards(b, () => rng.next(), 3, 0.3, lvl);
      const ids = cards.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of cards) {
        expect(c.available(b)).toBe(true);
        expect(c.level(b)).toBeLessThan(c.max);
      }
      if (cards.length) cards[0].apply(b);
    }
  });
  it('garante habilidade nova nas primeiras escolhas', () => {
    const rng = new Rng(3);
    const cards = rollCards(newBuild(), () => rng.next(), 3, 0, 2);
    expect(cards.some((c) => c.kind === 'weapon' && c.level(newBuild()) === 0)).toBe(true);
  });
  it('combos só aparecem com as duas armas', () => {
    const b = newBuild();
    const tornado = CARDS.find((c) => c.id === 'c_tornado')!;
    expect(tornado.available(b)).toBe(false);
    b.weapons.crown = 2;
    b.weapons.wind = 2;
    expect(tornado.available(b)).toBe(true);
  });
  it('cada carta tem efeito real sobre a build', () => {
    for (const c of CARDS) {
      const b = newBuild();
      b.weapons = { arrow: 4, crown: 4, chain: 4, lotus: 2, lance: 2, wind: 2 };
      if (!c.available(b)) continue;
      const before = JSON.stringify(b);
      expect(c.text(b).length).toBeGreaterThan(5);
      c.apply(b);
      expect(JSON.stringify(b)).not.toBe(before);
    }
  });
  it('atributos derivados respeitam limites', () => {
    const b = newBuild();
    b.passives.lifesteal = 10;
    const s = deriveStats(b);
    expect(s.lifesteal).toBeLessThanOrEqual(0.03);
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(2));
  });
});

describe('Armas', () => {
  it('dezoito famílias com cinco níveis crescentes', () => {
    expect(WEAPON_ORDER.length).toBe(18);
    for (const id of WEAPON_ORDER) {
      const L = WEAPONS[id].levels;
      expect(L.length).toBe(5);
      for (let i = 1; i < L.length; i++) {
        expect(L[i].damage).toBeGreaterThan(L[i - 1].damage);
        expect(L[i].cooldown).toBeLessThanOrEqual(L[i - 1].cooldown);
      }
    }
  });
});

describe('Save', () => {
  it('recupera dados ausentes ou corrompidos', () => {
    expect(migrate(null)).toEqual(defaultSave());
    const m = migrate({ ashes: 'x', settings: { music: 5, quality: 'ultra' }, unlocked: ['skin_aurora', 3] });
    expect(m.ashes).toBe(0);
    expect(m.settings.music).toBe(1);
    expect(m.settings.quality).toBe('auto');
    expect(m.unlocked).toContain('skin_ember');
    expect(m.unlocked).toContain('skin_aurora');
  });
  it('descarta checkpoint de versão antiga', () => {
    const m = migrate({ version: 1, checkpoint: { act: 1, build: { weapons: {} } } });
    expect(m.checkpoint).toBeNull();
    const ok = migrate({ version: SAVE_VERSION, checkpoint: { act: 1, level: 3, xp: 0, kills: 0, time: 0, coins: 0, rerolls: 0, hp: 80, cardsTaken: [], build: { weapons: { arrow: 2 } } } });
    expect(ok.checkpoint?.act).toBe(1);
  });
});

describe('Heróis e progressão', () => {
  it('cada herói começa com duas armas válidas e tem sprites próprios', () => {
    expect(HEROES.length).toBe(4);
    for (const h of HEROES) {
      const b = newBuild(h.id);
      expect(Object.keys(b.weapons).sort()).toEqual([...h.start].sort());
      for (const w of h.start) expect(WEAPONS[w]).toBeTruthy();
      const j = JSON.parse(readFileSync(`public/assets/characters/hero_${h.id}.json`, 'utf8'));
      for (const d of ['down', 'up', 'left', 'right']) for (const a of ['idle', 'walk', 'shoot', 'dash', 'hurt']) expect(j.animations[`hero_${h.id}_${a}_${d}`], `${h.id} ${a} ${d}`).toBeTruthy();
      expect(j.animations[`hero_${h.id}_death`]).toBeTruthy();
      expect(j.meta.scale).toBe('2');
    }
  });
  it('modificadores do herói alteram atributos', () => {
    const brann = deriveStats(newBuild('brann'));
    const orin = deriveStats(newBuild('orin'));
    expect(brann.maxHp).toBeGreaterThan(orin.maxHp);
    expect(orin.cooldownMul).toBeLessThan(brann.cooldownMul);
  });
  it('talentos e relíquias somam bônus permanentes', () => {
    const m = computeMeta({ might: 3, vigor: 2, crit: 1 }, 'r_eye');
    expect(m.might).toBeCloseTo(0.12);
    expect(m.hp).toBe(20);
    expect(m.crit).toBeCloseTo(0.15);
    const st = deriveStats(newBuild('lysa', m));
    expect(st.maxHp).toBe(120);
    expect(st.might).toBeCloseTo(1.12);
    for (const t of TALENTS) if (t.requires) expect(TALENTS.find((x) => x.id === t.requires), t.id).toBeTruthy();
    expect(RELICS[0].cost).toBe(0);
  });
  it('desafio diário é determinístico pela data', () => {
    const d1 = dailyChallenge(new Date('2026-10-24T12:00:00Z'));
    const d2 = dailyChallenge(new Date('2026-10-24T20:00:00Z'));
    expect(d1).toEqual(d2);
    expect(d1.mods[0]).not.toBe(d1.mods[1]);
    for (const m of d1.mods) expect(DAILY_MODS.some((x) => x.id === m)).toBe(true);
  });
  it('evoluções aparecem quando os requisitos existem', () => {
    const b = newBuild('nyx');
    b.weapons.wisp = 5;
    b.passives.duration = 1;
    const evo = CARDS.find((c) => c.id === 'l_legion')!;
    expect(evo.available(b)).toBe(true);
    b.passives.duration = 0;
    expect(evo.available(b)).toBe(false);
  });
});

describe('Save v3', () => {
  it('migra campos novos com segurança', () => {
    const m = migrate({ version: 2, ashes: 50, heroes: ['orin', 7], selectedHero: 'orin', talents: { might: 2, bad: 'x' }, difficulty: 'torment', checkpoint: { act: 1, build: { weapons: { arrow: 1 } } } });
    expect(m.heroes).toEqual(['lysa', 'orin']);
    expect(m.selectedHero).toBe('orin');
    expect(m.talents).toEqual({ might: 2 });
    expect(m.difficulty).toBe('normal');
    expect(m.checkpoint).toBeNull();
    expect(SAVE_VERSION).toBe(3);
  });
});
