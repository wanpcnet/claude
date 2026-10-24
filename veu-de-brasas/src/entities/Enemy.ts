import { Container, Sprite, Texture } from 'pixi.js';
import type { EnemyDef } from '../content/types';
import { Src } from '../content/types';

export type EState = 'spawn' | 'move' | 'windup' | 'attack' | 'recover' | 'air' | 'dead';

export interface BossController {
  update(e: Enemy, dt: number): void;
  onDamage?(e: Enemy): void;
  onDeath?(e: Enemy): void;
  name: string;
}

/** Inimigo em pool. Campos genéricos (a1..a4) guardam dados de comportamento sem alocação. */
export class Enemy {
  active = false;
  id: number;
  def!: EnemyDef;
  x = 0;
  y = 0;
  z = 0;
  kx = 0;
  ky = 0;
  mvx = 0;
  mvy = 0;
  hp = 1;
  maxHp = 1;
  armorHp = 0;
  radius = 8;
  mass = 1;
  speed = 50;
  state: EState = 'spawn';
  st = 0;
  t = 0;
  facing = 1;
  flashT = 0;
  flashCd = 0;
  burnT = 0;
  burnDps = 0;
  burnTick = 0;
  slowT = 0;
  slowMul = 1;
  freezeT = 0;
  stunned = false;
  contactCd = 0;
  attackCd = 0;
  hitCd = new Float32Array(Src.Count);
  a1 = 0;
  a2 = 0;
  a3 = 0;
  a4 = 0;
  ax = 0;
  ay = 0;
  anim = '';
  frames: Texture[] = [];
  flashFrames: Texture[] = [];
  frame = 0;
  loop = true;
  fps = 10;
  boss: BossController | null = null;
  bar: Container | null = null;
  barFill: Sprite | null = null;
  sprite: Sprite;
  shadow: Sprite;
  scale = 1;
  isSummon = false;
  bossDrops = 0;
  noXp = false;

  constructor(id: number) {
    this.id = id;
    this.sprite = new Sprite(Texture.EMPTY);
    this.shadow = new Sprite(Texture.EMPTY);
    this.shadow.anchor.set(0.5);
    this.sprite.visible = false;
    this.shadow.visible = false;
  }

  get alive(): boolean {
    return this.active && this.state !== 'dead';
  }
}
