/** Seis famílias de armas/habilidades. Cada nível é uma linha de dados — sem números mágicos no código. */
export type WeaponId = 'arrow' | 'crown' | 'lance' | 'chain' | 'lotus' | 'wind';

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
      { damage: 7, cooldown: 0.4, arcs: 3, radius: 40, burn: 3, pulseDamage: 32, pulseRadius: 150 },
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
};

export const WEAPON_ORDER: WeaponId[] = ['arrow', 'crown', 'lance', 'chain', 'lotus', 'wind'];
