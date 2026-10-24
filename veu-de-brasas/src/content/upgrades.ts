import { WEAPONS, MAX_WEAPONS, type WeaponId } from './weapons';
import { heroById } from './heroes';

export type Rarity = 'common' | 'rare' | 'legendary';

/** Bônus permanentes (talentos, relíquia, dificuldade) congelados no início da partida. */
export interface MetaBonus {
  hp: number;
  might: number;
  speed: number;
  cooldown: number;
  area: number;
  magnet: number;
  xp: number;
  luck: number;
  armor: number;
  energyRegen: number;
  revive: number;
  crit: number;
  duration: number;
}

export function emptyMeta(): MetaBonus {
  return { hp: 0, might: 0, speed: 0, cooldown: 0, area: 0, magnet: 0, xp: 0, luck: 0, armor: 0, energyRegen: 0, revive: 0, crit: 0, duration: 0 };
}

export interface Build {
  hero: string;
  weapons: Partial<Record<WeaponId, number>>;
  passives: Record<string, number>;
  flags: Record<string, boolean>;
  meta?: MetaBonus;
}

export function newBuild(hero = 'lysa', meta: MetaBonus = emptyMeta()): Build {
  const def = heroById(hero);
  const weapons: Partial<Record<WeaponId, number>> = {};
  for (const w of def.start) weapons[w] = 1;
  return { hero: def.id, weapons, passives: {}, flags: {}, meta };
}

export const MAX_PASSIVES = 6;

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
  might: number;
  critChance: number;
  critMul: number;
  durationMul: number;
  projSpeed: number;
  luck: number;
  xpMul: number;
  revives: number;
  dashCharges: number;
  amount: number;
}

export function deriveStats(b: Build): Stats {
  const p = (k: string) => b.passives[k] ?? 0;
  const h = heroById(b.hero).mods;
  const m = b.meta ?? emptyMeta();
  return {
    maxHp: Math.round((100 + (h.hp ?? 0) + m.hp + p('vigor') * 25) * 1),
    speedMul: (1 + p('speed') * 0.1 + m.speed) * (h.speed ?? 1),
    cooldownMul: Math.pow(0.92, p('cooldown')) * (h.cooldown ?? 1) * (1 - m.cooldown),
    areaMul: (1 + p('area') * 0.12 + m.area) * (h.area ?? 1),
    lifesteal: Math.min(0.03, p('lifesteal') * 0.01),
    armor: p('armor') * 1.5 + (h.armor ?? 0) + m.armor,
    magnet: (1 + p('magnet') * 0.45 + m.magnet) * (h.magnet ?? 1),
    arrowPierce: p('pierce'),
    arrowExtra: p('multi'),
    regen: p('regen') * 0.6,
    dashCdMul: Math.pow(0.88, p('speed')),
    pulseCostMul: Math.pow(0.85, p('focus')),
    energyRegen: (7 + p('focus') * 2.5) * (1 + m.energyRegen),
    might: (1 + p('might') * 0.1 + m.might) * (h.might ?? 1),
    critChance: Math.min(0.75, 0.05 + p('crit') * 0.08 + m.crit),
    critMul: 1.6 + p('critdmg') * 0.4,
    durationMul: (1 + p('duration') * 0.15 + m.duration) * (h.duration ?? 1),
    projSpeed: 1 + p('projspeed') * 0.15,
    luck: p('luck') * 0.25 + m.luck,
    xpMul: 1 + p('xp') * 0.15 + m.xp,
    revives: p('revive') + m.revive,
    dashCharges: 1 + p('dash'),
    amount: p('amount'),
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

const EXTRA_LABEL: Record<string, string> = {
  count: 'Quantidade', pierce: 'Perfuração', arcs: 'Arcos de chama', radius: 'Raio', jumps: 'Saltos', shards: 'Fragmentos', width: 'Largura',
  pulseDamage: 'Dano do Pulso', both: 'Dois lados', lines: 'Fileiras', life: 'Duração', reach: 'Alcance', range: 'Alcance', arrows: 'Flechas',
  slowDur: 'Lentidão', pull: 'Atração', reflect: 'Reflexo', burn: 'Queimadura',
};

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
      if (lv === 0) return owned < MAX_WEAPONS;
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
      for (const k of Object.keys(EXTRA_LABEL)) {
        if (k in nxt && nxt[k] !== cur[k]) parts.push(k === 'both' ? 'Golpe para os dois lados' : `${EXTRA_LABEL[k]} ${cur[k]} → ${nxt[k]}`);
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
    available: (b) => {
      const lv = b.passives[id] ?? 0;
      if (lv === 0 && Object.keys(b.passives).length >= MAX_PASSIVES) return false;
      return lv < max;
    },
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
const pv = (b: Build, p: string) => b.passives[p] ?? 0;

export const CARDS: CardDef[] = [
  weaponCard('arrow', 'common'),
  weaponCard('crown', 'common'),
  weaponCard('lance', 'rare'),
  weaponCard('chain', 'rare'),
  weaponCard('lotus', 'rare'),
  weaponCard('wind', 'rare'),
  weaponCard('dagger', 'common'),
  weaponCard('missile', 'common'),
  weaponCard('meteor', 'rare'),
  weaponCard('frost', 'common'),
  weaponCard('spikes', 'rare'),
  weaponCard('totem', 'rare'),
  weaponCard('wisp', 'common'),
  weaponCard('whip', 'common'),
  weaponCard('moon', 'common'),
  weaponCard('void', 'rare'),
  weaponCard('rain', 'rare'),
  weaponCard('thorns', 'common'),
  passive('vigor', 'Seiva Ardente', 'p_vigor', 5, 'common', () => '+25 de vida máxima e cura 25 de vida.'),
  passive('speed', 'Passos de Cinza', 'p_speed', 4, 'common', () => '+10% de velocidade e −12% na recarga da esquiva.'),
  passive('cooldown', 'Ampulheta Rúnica', 'p_cooldown', 5, 'rare', () => 'Todas as habilidades recarregam 8% mais rápido.'),
  passive('area', 'Círculo Amplo', 'p_area', 4, 'common', () => '+12% de área para todas as habilidades.'),
  passive('lifesteal', 'Presas de Brasa', 'p_lifesteal', 3, 'rare', (n) => `Cura ${n}% do dano causado (máx. 2 de vida por segundo).`),
  passive('armor', 'Casca de Bronze', 'p_armor', 4, 'common', () => 'Reduz em 1,5 todo dano recebido.'),
  passive('magnet', 'Ímã de Fragmentos', 'p_magnet', 3, 'common', () => '+45% de alcance para coletar experiência e itens.'),
  passive('pierce', 'Ponta Perfurante', 'p_pierce', 3, 'common', () => 'Flechas Rúnicas atravessam +1 inimigo.'),
  passive('multi', 'Rajada Tripla', 'p_multi', 2, 'rare', () => '+1 Flecha Rúnica por disparo, em leque.'),
  passive('regen', 'Raiz Viva', 'p_regen', 3, 'common', () => 'Regenera 0,6 de vida por segundo.'),
  passive('focus', 'Foco Interior', 'p_focus', 3, 'rare', () => 'Habilidade ativa custa 15% menos energia; +2,5 energia/s.'),
  passive('might', 'Fúria Ancestral', 'p_might', 5, 'common', () => '+10% de dano de todas as fontes.'),
  passive('crit', 'Olho Rúnico', 'p_crit', 4, 'common', () => '+8% de chance de acerto crítico.'),
  passive('critdmg', 'Golpe Fatal', 'p_critdmg', 3, 'rare', () => 'Acertos críticos causam +40% de dano.'),
  passive('duration', 'Eco Persistente', 'p_duration', 4, 'common', () => '+15% de duração para zonas, totens e invocações.'),
  passive('projspeed', 'Penas do Vento', 'p_projspeed', 3, 'common', () => '+15% de velocidade e alcance dos projéteis.'),
  passive('luck', 'Trevo de Cinzas', 'p_luck', 3, 'rare', () => 'Cartas raras e lendárias aparecem com mais frequência.'),
  passive('xp', 'Erudição', 'p_xp', 4, 'common', () => '+15% de experiência obtida.'),
  passive('amount', 'Multiplicidade', 'p_amount', 2, 'rare', () => '+1 projétil/invocação para armas com quantidade (adagas, mísseis, luas, fogos-fátuos, meteoros, lanças).'),
  passive('dash', 'Passo Duplo', 'p_dash', 1, 'rare', () => 'A esquiva ganha uma segunda carga.'),
  passive('revive', 'Pena de Fênix', 'p_revive', 1, 'legendary', () => 'Ao cair, renasce uma vez com metade da vida e uma explosão de fogo.'),
  flagCard('l_phoenix', 'Flecha Fênix', 'l_phoenix', 'legendary', 'EVOLUÇÃO: Flechas Rúnicas explodem em chamas ao acertar (raio 42, 60% do dano, queimadura).', (b) => lv(b, 'arrow') >= 4),
  flagCard('l_solar', 'Coroa Solar', 'w_crown', 'legendary', 'EVOLUÇÃO: um segundo aro gira em sentido oposto. Queimaduras da coroa causam o dobro.', (b) => lv(b, 'crown') >= 4),
  flagCard('l_storm', 'Tempestade Eterna', 'l_storm', 'legendary', 'EVOLUÇÃO: o raio ganha +3 saltos e se bifurca no primeiro alvo.', (b) => lv(b, 'chain') >= 4),
  flagCard('l_blades', 'Mil Lâminas', 'w_dagger', 'legendary', 'EVOLUÇÃO (Adagas + Multiplicidade): +3 adagas e elas disparam contra inimigos a cada volta.', (b) => lv(b, 'dagger') >= 5 && pv(b, 'amount') >= 1),
  flagCard('l_comet', 'Cometa Rúnico', 'w_meteor', 'legendary', 'EVOLUÇÃO (Meteoros + Círculo Amplo): +2 meteoros e o impacto deixa o chão em chamas por 3 s.', (b) => lv(b, 'meteor') >= 5 && pv(b, 'area') >= 1),
  flagCard('l_iceage', 'Era do Gelo', 'w_frost', 'legendary', 'EVOLUÇÃO (Nova + Eco): a nova congela por 1,2 s; inimigos congelados sofrem +50% de dano.', (b) => lv(b, 'frost') >= 5 && pv(b, 'duration') >= 1),
  flagCard('l_bones', 'Floresta de Espinhos', 'w_spikes', 'legendary', 'EVOLUÇÃO (Espinhos + Fúria): espinhos em cruz, nas quatro direções.', (b) => lv(b, 'spikes') >= 5 && pv(b, 'might') >= 1),
  flagCard('l_legion', 'Legião Espectral', 'w_wisp', 'legendary', 'EVOLUÇÃO (Fogos-Fátuos + Eco): o dobro de espíritos; cada um explode ao acertar.', (b) => lv(b, 'wisp') >= 5 && pv(b, 'duration') >= 1),
  flagCard('l_bloodmoon', 'Lua Sangrenta', 'w_moon', 'legendary', 'EVOLUÇÃO (Lua + Presas): luas maiores que roubam vida e se dividem ao voltar.', (b) => lv(b, 'moon') >= 5 && pv(b, 'lifesteal') >= 1),
  flagCard('l_eventhorizon', 'Horizonte de Eventos', 'w_void', 'legendary', 'EVOLUÇÃO (Vazio + Trevo): o orbe atrai muito mais forte e detona no fim.', (b) => lv(b, 'void') >= 5 && pv(b, 'luck') >= 1),
  flagCard('c_tornado', 'Tornado Incandescente', 'c_tornado', 'combo', 'COMBO Coroa + Vento: cada rajada carrega 7 brasas em espiral e empurra 50% mais forte.', (b) => lv(b, 'crown') >= 2 && lv(b, 'wind') >= 2),
  flagCard('c_thunder', 'Estilhaço Trovejante', 'c_thunder', 'combo', 'COMBO Raio + Lótus: cada alvo eletrocutado lança um fragmento de cristal a um inimigo próximo (até 6 por descarga).', (b) => lv(b, 'chain') >= 2 && lv(b, 'lotus') >= 2),
  flagCard('c_dawn', 'Alvorada Circular', 'c_dawn', 'combo', 'COMBO Lança + Coroa: a habilidade ativa dispara 6 Lanças Solares radiais.', (b) => lv(b, 'lance') >= 2 && lv(b, 'crown') >= 2),
  flagCard('c_shatter', 'Geada Estilhaçante', 'w_frost', 'combo', 'COMBO Nova + Mísseis: mísseis contra inimigos lentos explodem em estilhaços de gelo.', (b) => lv(b, 'frost') >= 2 && lv(b, 'missile') >= 2),
  flagCard('c_conduct', 'Para-raios', 'w_totem', 'combo', 'COMBO Totem + Raio: os totens também disparam Correntes de Tempestade completas.', (b) => lv(b, 'totem') >= 2 && lv(b, 'chain') >= 2),
  flagCard('c_bloodthorn', 'Espinheiro Rubro', 'w_thorns', 'combo', 'COMBO Chicote + Espinhos: cada golpe do chicote faz a aura pulsar com o dobro do raio.', (b) => lv(b, 'whip') >= 2 && lv(b, 'thorns') >= 2),
  flagCard('c_abyss', 'Abismo Cadente', 'w_void', 'combo', 'COMBO Vazio + Meteoros: um meteoro cai no centro de cada Orbe do Vazio ao se desfazer.', (b) => lv(b, 'void') >= 2 && lv(b, 'meteor') >= 2),
]

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 62, rare: 30, legendary: 14 };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Comum · Jade', rare: 'Raro · Ametista', legendary: 'Lendário · Ouro Solar' };

/**
 * Sorteia cartas distintas e válidas. Regras: nunca oferecer carta maximizada; respeitar os
 * limites de 6 armas e 6 passivos; nas primeiras escolhas garantir uma habilidade nova;
 * cartas lendárias só quando as condições existem. `luck` aumenta raras/lendárias.
 */
export function rollCards(b: Build, random: () => number, count = 3, luck = 0, level = 2): CardDef[] {
  const pool = CARDS.filter((c) => c.available(b));
  const picks: CardDef[] = [];
  const owned = Object.keys(b.weapons).length;
  if (level <= 5 && owned < 4) {
    const fresh = pool.filter((c) => c.kind === 'weapon' && c.level(b) === 0);
    if (fresh.length) picks.push(fresh[Math.floor(random() * fresh.length)]);
  }
  // evoluções disponíveis têm prioridade alta (momento marcante da partida)
  const evo = pool.filter((c) => (c.kind === 'legendary' || c.kind === 'combo') && !picks.includes(c));
  if (evo.length && random() < 0.55 + luck * 0.2) picks.push(evo[Math.floor(random() * evo.length)]);
  while (picks.length < count) {
    const rest = pool.filter((c) => !picks.includes(c));
    if (!rest.length) break;
    let total = 0;
    const w = rest.map((c) => {
      let v = RARITY_WEIGHT[c.rarity];
      if (c.rarity !== 'common') v *= 1 + luck;
      if (c.kind === 'weapon' && c.level(b) > 0) v *= 1.6; // evoluir o que já se tem é útil
      if (c.kind === 'passive' && c.level(b) > 0) v *= 1.25;
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
  return picks.slice(0, count);
}

export function xpForLevel(level: number): number {
  return Math.floor(8 + level * 5 + level * level * 0.45);
}
