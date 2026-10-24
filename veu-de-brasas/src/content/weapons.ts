/** Seis famílias de armas/habilidades. Cada nível é uma linha de dados — sem números mágicos no código. */
export type WeaponId =
  | 'arrow' | 'crown' | 'lance' | 'chain' | 'lotus' | 'wind'
  | 'dagger' | 'missile' | 'meteor' | 'frost' | 'spikes' | 'totem'
  | 'wisp' | 'whip' | 'moon' | 'void' | 'rain' | 'thorns';

export interface WeaponLevel {
  damage: number;
  cooldown: number;
  /** campos específicos de cada arma */
  [k: string]: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  element: string;
  desc: string;
  levels: WeaponLevel[];
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  arrow: {
    id: 'arrow', name: 'Flecha Rúnica', icon: 'w_arrow', element: 'runa',
    desc: 'Disparos rápidos no inimigo mais próximo.',
    levels: [
      { damage: 11, cooldown: 0.55, count: 1, pierce: 0, speed: 540, range: 380 },
      { damage: 14, cooldown: 0.5, count: 1, pierce: 1, speed: 560, range: 400 },
      { damage: 17, cooldown: 0.45, count: 2, pierce: 1, speed: 580, range: 410 },
      { damage: 21, cooldown: 0.4, count: 2, pierce: 2, speed: 600, range: 420 },
      { damage: 26, cooldown: 0.34, count: 3, pierce: 2, speed: 620, range: 440 },
    ],
  },
  crown: {
    id: 'crown', name: 'Coroa de Brasas', icon: 'w_crown', element: 'fogo',
    desc: 'Aro de brasas orbital; Q expande em um pulso incendiário.',
    levels: [
      { damage: 6, cooldown: 0.42, arcs: 3, radius: 40, burn: 3, pulseDamage: 32, pulseRadius: 150 },
      { damage: 9, cooldown: 0.38, arcs: 4, radius: 44, burn: 4, pulseDamage: 40, pulseRadius: 165 },
      { damage: 11, cooldown: 0.36, arcs: 4, radius: 48, burn: 5, pulseDamage: 50, pulseRadius: 180 },
      { damage: 13, cooldown: 0.33, arcs: 5, radius: 52, burn: 6, pulseDamage: 62, pulseRadius: 195 },
      { damage: 16, cooldown: 0.3, arcs: 6, radius: 56, burn: 8, pulseDamage: 78, pulseRadius: 215 },
    ],
  },
  lance: {
    id: 'lance', name: 'Lança Solar', icon: 'w_lance', element: 'fogo',
    desc: 'Projétil flamejante longo que atravessa uma linha inteira.',
    levels: [
      { damage: 34, cooldown: 2.4, count: 1, width: 10, speed: 460, burn: 5 },
      { damage: 42, cooldown: 2.2, count: 1, width: 12, speed: 480, burn: 6 },
      { damage: 50, cooldown: 2.0, count: 2, width: 12, speed: 500, burn: 7 },
      { damage: 60, cooldown: 1.8, count: 2, width: 14, speed: 520, burn: 9 },
      { damage: 74, cooldown: 1.6, count: 3, width: 16, speed: 540, burn: 11 },
    ],
  },
  chain: {
    id: 'chain', name: 'Corrente de Tempestade', icon: 'w_chain', element: 'raio',
    desc: 'Raio que salta entre inimigos próximos.',
    levels: [
      { damage: 20, cooldown: 1.7, jumps: 3, range: 150, falloff: 0.88 },
      { damage: 24, cooldown: 1.55, jumps: 4, range: 160, falloff: 0.9 },
      { damage: 28, cooldown: 1.4, jumps: 5, range: 170, falloff: 0.9 },
      { damage: 33, cooldown: 1.25, jumps: 6, range: 180, falloff: 0.92 },
      { damage: 40, cooldown: 1.1, jumps: 8, range: 195, falloff: 0.93 },
    ],
  },
  lotus: {
    id: 'lotus', name: 'Lótus de Cristal', icon: 'w_lotus', element: 'cristal',
    desc: 'Semente que desabrocha em uma explosão radial de fragmentos.',
    levels: [
      { damage: 22, cooldown: 2.7, shards: 8, shardDamage: 10, radius: 52 },
      { damage: 26, cooldown: 2.5, shards: 9, shardDamage: 12, radius: 56 },
      { damage: 31, cooldown: 2.3, shards: 10, shardDamage: 14, radius: 60 },
      { damage: 37, cooldown: 2.1, shards: 12, shardDamage: 16, radius: 66 },
      { damage: 44, cooldown: 1.9, shards: 14, shardDamage: 19, radius: 72 },
    ],
  },
  wind: {
    id: 'wind', name: 'Vento Cinéreo', icon: 'w_wind', element: 'vento',
    desc: 'Rajada semicircular que afasta inimigos leves.',
    levels: [
      { damage: 9, cooldown: 2.1, radius: 110, knock: 340, arc: 1.9, both: 0 },
      { damage: 12, cooldown: 1.95, radius: 120, knock: 370, arc: 2.0, both: 0 },
      { damage: 15, cooldown: 1.8, radius: 130, knock: 400, arc: 2.2, both: 0 },
      { damage: 18, cooldown: 1.65, radius: 140, knock: 430, arc: 2.3, both: 0 },
      { damage: 22, cooldown: 1.5, radius: 150, knock: 470, arc: 2.4, both: 1 },
    ],
  },
  dagger: {
    id: 'dagger', name: 'Adagas Espectrais', icon: 'w_dagger', element: 'arcano',
    desc: 'Lâminas fantasmas orbitam e cortam quem se aproxima.',
    levels: [
      { damage: 9, cooldown: 0.35, count: 2, radius: 62, spin: 3.2 },
      { damage: 11, cooldown: 0.33, count: 3, radius: 66, spin: 3.4 },
      { damage: 14, cooldown: 0.31, count: 3, radius: 72, spin: 3.7 },
      { damage: 17, cooldown: 0.29, count: 4, radius: 78, spin: 4.0 },
      { damage: 21, cooldown: 0.26, count: 5, radius: 84, spin: 4.4 },
    ],
  },
  missile: {
    id: 'missile', name: 'Mísseis Arcanos', icon: 'w_missile', element: 'arcano',
    desc: 'Orbes teleguiados perseguem os inimigos mais próximos.',
    levels: [
      { damage: 12, cooldown: 1.2, count: 2, speed: 300, turn: 5 },
      { damage: 14, cooldown: 1.1, count: 3, speed: 320, turn: 5.5 },
      { damage: 17, cooldown: 1.0, count: 3, speed: 340, turn: 6 },
      { damage: 20, cooldown: 0.9, count: 4, speed: 360, turn: 6.5 },
      { damage: 24, cooldown: 0.8, count: 5, speed: 380, turn: 7 },
    ],
  },
  meteor: {
    id: 'meteor', name: 'Chuva de Meteoros', icon: 'w_meteor', element: 'fogo',
    desc: 'Meteoros caem sobre aglomerações e deixam o chão em brasa.',
    levels: [
      { damage: 32, cooldown: 3.2, count: 1, radius: 58, burn: 6 },
      { damage: 38, cooldown: 3.0, count: 2, radius: 62, burn: 7 },
      { damage: 46, cooldown: 2.8, count: 2, radius: 66, burn: 8 },
      { damage: 54, cooldown: 2.6, count: 3, radius: 70, burn: 10 },
      { damage: 66, cooldown: 2.3, count: 4, radius: 76, burn: 12 },
    ],
  },
  frost: {
    id: 'frost', name: 'Nova Glacial', icon: 'w_frost', element: 'gelo',
    desc: 'Pulsos de gelo ao redor que ferem e desaceleram.',
    levels: [
      { damage: 14, cooldown: 2.6, radius: 110, slow: 0.5, slowDur: 1.2 },
      { damage: 17, cooldown: 2.45, radius: 120, slow: 0.45, slowDur: 1.4 },
      { damage: 21, cooldown: 2.3, radius: 130, slow: 0.4, slowDur: 1.6 },
      { damage: 25, cooldown: 2.15, radius: 140, slow: 0.35, slowDur: 1.8 },
      { damage: 30, cooldown: 2.0, radius: 155, slow: 0.25, slowDur: 2.0 },
    ],
  },
  spikes: {
    id: 'spikes', name: 'Espinhos Sombrios', icon: 'w_spikes', element: 'sombra',
    desc: 'Uma fileira de espinhos irrompe do chão em direção aos inimigos.',
    levels: [
      { damage: 22, cooldown: 1.9, count: 6, lines: 1, spacing: 26 },
      { damage: 26, cooldown: 1.8, count: 7, lines: 1, spacing: 26 },
      { damage: 31, cooldown: 1.7, count: 8, lines: 2, spacing: 26 },
      { damage: 36, cooldown: 1.6, count: 9, lines: 2, spacing: 27 },
      { damage: 43, cooldown: 1.45, count: 10, lines: 3, spacing: 28 },
    ],
  },
  totem: {
    id: 'totem', name: 'Totem de Raios', icon: 'w_totem', element: 'raio',
    desc: 'Ergue totens que disparam raios nos inimigos próximos.',
    levels: [
      { damage: 16, cooldown: 5, count: 1, life: 8, rate: 0.7, range: 170 },
      { damage: 19, cooldown: 4.6, count: 1, life: 9, rate: 0.62, range: 180 },
      { damage: 23, cooldown: 4.2, count: 2, life: 9, rate: 0.56, range: 190 },
      { damage: 27, cooldown: 3.8, count: 2, life: 10, rate: 0.5, range: 200 },
      { damage: 32, cooldown: 3.4, count: 3, life: 11, rate: 0.44, range: 215 },
    ],
  },
  wisp: {
    id: 'wisp', name: 'Fogos-Fátuos', icon: 'w_wisp', element: 'espírito',
    desc: 'Espíritos aliados caçam inimigos e retornam a você.',
    levels: [
      { damage: 15, cooldown: 0.6, count: 2, speed: 260 },
      { damage: 18, cooldown: 0.55, count: 3, speed: 275 },
      { damage: 21, cooldown: 0.5, count: 3, speed: 290 },
      { damage: 25, cooldown: 0.45, count: 4, speed: 305 },
      { damage: 30, cooldown: 0.4, count: 5, speed: 320 },
    ],
  },
  whip: {
    id: 'whip', name: 'Chicote de Sangue', icon: 'w_whip', element: 'sangue',
    desc: 'Golpe amplo à frente com alto dano; cura um pouco a cada acerto.',
    levels: [
      { damage: 26, cooldown: 1.15, reach: 110, width: 42, both: 0 },
      { damage: 32, cooldown: 1.1, reach: 118, width: 44, both: 0 },
      { damage: 38, cooldown: 1.05, reach: 126, width: 46, both: 1 },
      { damage: 46, cooldown: 1.0, reach: 134, width: 48, both: 1 },
      { damage: 56, cooldown: 0.9, reach: 145, width: 52, both: 1 },
    ],
  },
  moon: {
    id: 'moon', name: 'Lua Crescente', icon: 'w_moon', element: 'luz',
    desc: 'Lâmina lunar que vai e volta, atravessando tudo no caminho.',
    levels: [
      { damage: 18, cooldown: 1.6, count: 1, range: 220, speed: 360 },
      { damage: 22, cooldown: 1.5, count: 1, range: 235, speed: 380 },
      { damage: 26, cooldown: 1.4, count: 2, range: 250, speed: 400 },
      { damage: 31, cooldown: 1.3, count: 2, range: 265, speed: 420 },
      { damage: 37, cooldown: 1.15, count: 3, range: 280, speed: 440 },
    ],
  },
  void: {
    id: 'void', name: 'Orbe do Vazio', icon: 'w_void', element: 'vazio',
    desc: 'Um orbe lento que suga e tritura os inimigos ao redor.',
    levels: [
      { damage: 6, cooldown: 4.5, radius: 90, life: 2.6, pull: 120 },
      { damage: 7, cooldown: 4.2, radius: 100, life: 2.8, pull: 135 },
      { damage: 9, cooldown: 3.9, radius: 110, life: 3.0, pull: 150 },
      { damage: 11, cooldown: 3.6, radius: 120, life: 3.3, pull: 165 },
      { damage: 13, cooldown: 3.2, radius: 135, life: 3.6, pull: 185 },
    ],
  },
  rain: {
    id: 'rain', name: 'Chuva de Flechas', icon: 'w_rain', element: 'runa',
    desc: 'Uma saraivada de flechas cai sobre a maior aglomeração.',
    levels: [
      { damage: 12, cooldown: 3.4, radius: 70, life: 1.6, arrows: 18 },
      { damage: 15, cooldown: 3.2, radius: 76, life: 1.7, arrows: 22 },
      { damage: 18, cooldown: 3.0, radius: 82, life: 1.8, arrows: 26 },
      { damage: 21, cooldown: 2.8, radius: 88, life: 2.0, arrows: 30 },
      { damage: 26, cooldown: 2.5, radius: 96, life: 2.2, arrows: 36 },
    ],
  },
  thorns: {
    id: 'thorns', name: 'Aura de Espinhos', icon: 'w_thorns', element: 'natureza',
    desc: 'Espinhos ao seu redor ferem constantemente e devolvem parte do dano.',
    levels: [
      { damage: 5, cooldown: 0.5, radius: 58, reflect: 0.3 },
      { damage: 7, cooldown: 0.48, radius: 64, reflect: 0.4 },
      { damage: 9, cooldown: 0.46, radius: 70, reflect: 0.5 },
      { damage: 11, cooldown: 0.44, radius: 76, reflect: 0.6 },
      { damage: 14, cooldown: 0.4, radius: 84, reflect: 0.8 },
    ],
  },
};

export const WEAPON_ORDER: WeaponId[] = ['arrow', 'crown', 'lance', 'chain', 'lotus', 'wind', 'dagger', 'missile', 'meteor', 'frost', 'spikes', 'totem', 'wisp', 'whip', 'moon', 'void', 'rain', 'thorns'];
export const MAX_WEAPONS = 6;
