import { WEAPONS, type WeaponId } from './weapons';

export type Rarity = 'common' | 'rare' | 'legendary';

export interface Build {
  weapons: Partial<Record<WeaponId, number>>;
  passives: Record<string, number>;
  flags: Record<string, boolean>;
}

export function newBuild(): Build {
  return { weapons: { arrow: 1, crown: 1 }, passives: {}, flags: {} };
}

/** Atributos derivados da build — consultados pelos sistemas de combate. */
export interface Stats {
  maxHp: number;
  speedMul: number;
  cooldownMul: number;
  areaMul: number;
  lifesteal: number;
  armor: number;
  magnet: number;
  arrowPierce: number;
  arrowExtra: number;
  regen: number;
  dashCdMul: number;
  pulseCostMul: number;
  energyRegen: number;
}

export function deriveStats(b: Build): Stats {
  const p = (k: string) => b.passives[k] ?? 0;
  return {
    maxHp: 100 + p('vigor') * 25,
    speedMul: 1 + p('speed') * 0.1,
    cooldownMul: Math.pow(0.92, p('cooldown')),
    areaMul: 1 + p('area') * 0.12,
    lifesteal: Math.min(0.03, p('lifesteal') * 0.01),
    armor: p('armor') * 1.5,
    magnet: 1 + p('magnet') * 0.45,
    arrowPierce: p('pierce'),
    arrowExtra: p('multi'),
    regen: p('regen') * 0.6,
    dashCdMul: Math.pow(0.88, p('speed')),
    pulseCostMul: Math.pow(0.85, p('focus')),
    energyRegen: 7 + p('focus') * 2.5,
  };
}

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  max: number;
  /** texto objetivo com números; recebe o nível que será alcançado */
  text: (b: Build) => string;
  available: (b: Build) => boolean;
  apply: (b: Build) => void;
  level: (b: Build) => number;
  kind: 'weapon' | 'passive' | 'legendary' | 'combo';
}

function weaponCard(id: WeaponId, rarityNew: Rarity): CardDef {
  const def = WEAPONS[id];
  return {
    id: 'w_' + id,
    name: def.name,
    rarity: rarityNew,
    icon: def.icon,
    max: 5,
    kind: 'weapon',
    level: (b) => b.weapons[id] ?? 0,
    available: (b) => {
      const owned = Object.keys(b.weapons).length;
      const lv = b.weapons[id] ?? 0;
      if (lv === 0) return owned < 6;
      return lv < 5;
    },
    text: (b) => {
      const lv = b.weapons[id] ?? 0;
      if (lv === 0) return `NOVA HABILIDADE. ${def.desc}`;
      const cur = def.levels[lv - 1];
      const nxt = def.levels[lv];
      const parts: string[] = [];
      if (nxt.damage !== cur.damage) parts.push(`Dano ${cur.damage} → ${nxt.damage}`);
      if (nxt.cooldown !== cur.cooldown) parts.push(`Recarga ${cur.cooldown.toFixed(2)}s → ${nxt.cooldown.toFixed(2)}s`);
      const extra: Record<string, string> = {
        count: 'Projéteis', pierce: 'Perfuração', arcs: 'Arcos de chama', radius: 'Raio', jumps: 'Saltos',
        shards: 'Fragmentos', width: 'Largura', pulseDamage: 'Dano do Pulso', both: 'Rajada dupla',
      };
      for (const k of Object.keys(extra)) {
        if (k in nxt && nxt[k] !== cur[k]) parts.push(k === 'both' ? 'Rajada para os dois lados' : `${extra[k]} ${cur[k]} → ${nxt[k]}`);
      }
      return parts.slice(0, 3).join(' · ');
    },
    apply: (b) => {
      b.weapons[id] = Math.min(5, (b.weapons[id] ?? 0) + 1);
    },
  };
}

function passive(id: string, name: string, icon: string, max: number, rarity: Rarity, text: (n: number) => string): CardDef {
  return {
    id: 'p_' + id,
    name,
    rarity,
    icon,
    max,
    kind: 'passive',
    level: (b) => b.passives[id] ?? 0,
    available: (b) => (b.passives[id] ?? 0) < max,
    text: (b) => text((b.passives[id] ?? 0) + 1),
    apply: (b) => {
      b.passives[id] = (b.passives[id] ?? 0) + 1;
    },
  };
}

function flagCard(id: string, name: string, icon: string, kind: 'legendary' | 'combo', text: string, req: (b: Build) => boolean): CardDef {
  return {
    id,
    name,
    rarity: 'legendary',
    icon,
    max: 1,
    kind,
    level: (b) => (b.flags[id] ? 1 : 0),
    available: (b) => !b.flags[id] && req(b),
    text: () => text,
    apply: (b) => {
      b.flags[id] = true;
    },
  };
}

const lv = (b: Build, w: WeaponId) => b.weapons[w] ?? 0;

export const CARDS: CardDef[] = [
  weaponCard('arrow', 'common'),
  weaponCard('crown', 'common'),
  weaponCard('lance', 'rare'),
  weaponCard('chain', 'rare'),
  weaponCard('lotus', 'rare'),
  weaponCard('wind', 'rare'),
  passive('vigor', 'Seiva Ardente', 'p_vigor', 5, 'common', () => '+25 de vida máxima e cura 25 de vida.'),
  passive('speed', 'Passos de Cinza', 'p_speed', 4, 'common', () => '+10% de velocidade e −12% na recarga da esquiva.'),
  passive('cooldown', 'Ampulheta Rúnica', 'p_cooldown', 5, 'rare', () => 'Todas as habilidades recarregam 8% mais rápido.'),
  passive('area', 'Círculo Amplo', 'p_area', 4, 'common', () => '+12% de área: coroa, pulso, lótus, vento e saltos do raio.'),
  passive('lifesteal', 'Presas de Brasa', 'p_lifesteal', 3, 'rare', (n) => `Cura ${n}% do dano causado (máx. 2 de vida por segundo).`),
  passive('armor', 'Casca de Bronze', 'p_armor', 4, 'common', () => 'Reduz em 1,5 todo dano recebido.'),
  passive('magnet', 'Ímã de Fragmentos', 'p_magnet', 3, 'common', () => '+45% de alcance para coletar experiência e itens.'),
  passive('pierce', 'Ponta Perfurante', 'p_pierce', 3, 'common', () => 'Flechas Rúnicas atravessam +1 inimigo.'),
  passive('multi', 'Rajada Tripla', 'p_multi', 2, 'rare', () => '+1 Flecha Rúnica por disparo, em leque.'),
  passive('regen', 'Raiz Viva', 'p_regen', 3, 'common', () => 'Regenera 0,6 de vida por segundo.'),
  passive('focus', 'Foco da Coroa', 'p_focus', 3, 'rare', () => 'Pulso da Coroa custa 15% menos energia; +2,5 energia/s.'),
  flagCard('l_phoenix', 'Flecha Fênix', 'l_phoenix', 'legendary', 'Flechas Rúnicas explodem em chamas ao acertar (raio 42, 60% do dano, queimadura).', (b) => lv(b, 'arrow') >= 4),
  flagCard('l_solar', 'Coroa Solar', 'w_crown', 'legendary', 'Um segundo aro gira em sentido oposto. Queimaduras da coroa causam o dobro.', (b) => lv(b, 'crown') >= 4),
  flagCard('l_storm', 'Tempestade Eterna', 'l_storm', 'legendary', 'O raio ganha +3 saltos e se bifurca no primeiro alvo.', (b) => lv(b, 'chain') >= 4),
  flagCard('c_tornado', 'Tornado Incandescente', 'c_tornado', 'combo', 'COMBO Coroa + Vento: cada rajada carrega 7 brasas em espiral e empurra 50% mais forte.', (b) => lv(b, 'crown') >= 2 && lv(b, 'wind') >= 2),
  flagCard('c_thunder', 'Estilhaço Trovejante', 'c_thunder', 'combo', 'COMBO Raio + Lótus: cada alvo eletrocutado lança um fragmento de cristal a um inimigo próximo (até 6 por descarga).', (b) => lv(b, 'chain') >= 2 && lv(b, 'lotus') >= 2),
  flagCard('c_dawn', 'Alvorada Circular', 'c_dawn', 'combo', 'COMBO Lança + Coroa: o Pulso da Coroa dispara 6 Lanças Solares radiais.', (b) => lv(b, 'lance') >= 2 && lv(b, 'crown') >= 2),
];

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 62, rare: 30, legendary: 14 };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Comum · Jade', rare: 'Raro · Ametista', legendary: 'Lendário · Ouro Solar' };

/**
 * Sorteia 3 cartas distintas e válidas. Regras: nunca oferecer carta maximizada;
 * nas primeiras escolhas garantir uma habilidade nova; cartas lendárias só quando
 * as condições existem. `luck` aumenta peso de raras/lendárias (baús, essências).
 */
export function rollCards(b: Build, random: () => number, count = 3, luck = 0, level = 2): CardDef[] {
  const pool = CARDS.filter((c) => c.available(b));
  const picks: CardDef[] = [];
  const owned = Object.keys(b.weapons).length;
  if (level <= 4 && owned < 4) {
    const fresh = pool.filter((c) => c.kind === 'weapon' && c.level(b) === 0);
    if (fresh.length) picks.push(fresh[Math.floor(random() * fresh.length)]);
  }
  while (picks.length < count) {
    const rest = pool.filter((c) => !picks.includes(c));
    if (!rest.length) break;
    let total = 0;
    const w = rest.map((c) => {
      let v = RARITY_WEIGHT[c.rarity];
      if (c.rarity !== 'common') v *= 1 + luck;
      if (c.kind === 'weapon' && c.level(b) > 0) v *= 1.35; // evoluir o que já se tem é útil
      total += v;
      return v;
    });
    let r = random() * total;
    let chosen = rest[rest.length - 1];
    for (let i = 0; i < rest.length; i++) {
      r -= w[i];
      if (r <= 0) {
        chosen = rest[i];
        break;
      }
    }
    picks.push(chosen);
  }
  return picks;
}

export function xpForLevel(level: number): number {
  return Math.floor(8 + level * 5 + level * level * 0.45);
}
