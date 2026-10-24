export type DamageType = 'physical' | 'fire' | 'lightning' | 'crystal' | 'wind' | 'arcane' | 'ice' | 'shadow' | 'blood' | 'light';

/** Fontes de dano persistente: cada uma tem cooldown por alvo (evita dano a cada quadro). */
export enum Src {
  Arrow = 0,
  Crown = 1,
  Pulse = 2,
  Lance = 3,
  Chain = 4,
  Lotus = 5,
  Wind = 6,
  Ember = 7,
  Burn = 8,
  Shard = 9,
  Phoenix = 10,
  Dagger = 11,
  Missile = 12,
  Meteor = 13,
  Frost = 14,
  Spikes = 15,
  Totem = 16,
  Wisp = 17,
  Whip = 18,
  Moon = 19,
  Void = 20,
  Rain = 21,
  Thorns = 22,
  Active = 23,
  Ult = 24,
  Count = 25,
}

export interface Hit {
  amount: number;
  type: DamageType;
  source: Src;
  knock?: number;
  kx?: number;
  ky?: number;
  burn?: number;
  burnDur?: number;
  slow?: number;
  slowDur?: number;
  heavy?: boolean;
}

export type EnemyAI = 'swarm' | 'flanker' | 'slow' | 'diver' | 'charger' | 'hopper' | 'caster' | 'guardian' | 'priestess';

export interface EnemyDef {
  id: string;
  name: string;
  ai: EnemyAI;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  mass: number;
  armor: number;
  xp: number;
  /** prefixo das animações no atlas */
  anim: string;
  walkAnim: string;
  fps: number;
  fly?: boolean;
  elite?: boolean;
  deathTint: number;
  /** escala de exibição do sprite */
  scale?: number;
  /** pivô vertical (0..1) do sprite */
  anchorY?: number;
}
