import { Container, Sprite, Texture } from 'pixi.js';
import { Pool } from '../utils/Pool';

export interface Particle {
  active: boolean;
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  s0: number;
  s1: number;
  a0: number;
  a1: number;
  rot: number;
  vr: number;
  drag: number;
  grav: number;
  frames: Texture[] | null;
  stretch: boolean;
  layer: 0 | 1;
  sy: number;
}

export interface EmitOpts {
  tex: Texture;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  s0?: number;
  s1?: number;
  a0?: number;
  a1?: number;
  rot?: number;
  vr?: number;
  drag?: number;
  grav?: number;
  tint?: number;
  frames?: Texture[];
  /** alinha a rotação à velocidade e estica (faíscas) */
  stretch?: boolean;
  additive?: boolean;
  sx?: number;
  /** altura acima do chão (px de tela), aplicada após a projeção */
  h?: number;
  /** deitado no chão (anéis, flores de cristal): achata no eixo vertical */
  flat?: boolean;
}

export interface Projector {
  x(wx: number, wy: number): number;
  y(wx: number, wy: number): number;
}

/** Partículas texturizadas em pool, com limite configurável e camadas aditiva/normal. */
export class Particles {
  readonly add = new Container();
  readonly normal = new Container();
  private pool: Pool<Particle>;
  max = 1800;
  /** projeção mundo → tela (isométrica no combate; identidade no menu) */
  projector: Projector | null = null;

  constructor() {
    this.add.blendMode = 'add';
    this.pool = new Pool<Particle>(() => {
      const s = new Sprite(Texture.EMPTY);
      s.anchor.set(0.5);
      s.visible = false;
      return { active: false, sprite: s, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s0: 1, s1: 1, a0: 1, a1: 0, rot: 0, vr: 0, drag: 0, grav: 0, frames: null, stretch: false, layer: 0, sy: 1 };
    }, 400);
  }

  get count(): number {
    return this.pool.activeCount;
  }

  emit(o: EmitOpts): void {
    if (this.pool.activeCount >= this.max) return;
    const p = this.pool.acquire();
    if (!p) return;
    const layer: 0 | 1 = o.additive === false ? 1 : 0;
    const parent = layer === 0 ? this.add : this.normal;
    if (p.sprite.parent !== parent) parent.addChild(p.sprite);
    p.layer = layer;
    // partículas vivem no espaço da tela: velocidades "para cima" sobem na tela
    p.x = this.projector ? this.projector.x(o.x, o.y) : o.x;
    p.y = (this.projector ? this.projector.y(o.x, o.y) : o.y) - (o.h ?? 0);
    p.sy = o.flat ? 0.5 : 1;
    p.vx = o.vx ?? 0;
    p.vy = o.vy ?? 0;
    p.life = 0;
    p.max = o.life ?? 0.5;
    p.s0 = o.s0 ?? 1;
    p.s1 = o.s1 ?? p.s0;
    p.a0 = o.a0 ?? 1;
    p.a1 = o.a1 ?? 0;
    p.rot = o.rot ?? 0;
    p.vr = o.vr ?? 0;
    p.drag = o.drag ?? 0;
    p.grav = o.grav ?? 0;
    p.frames = o.frames ?? null;
    p.stretch = !!o.stretch;
    const s = p.sprite;
    s.texture = o.frames ? o.frames[0] : o.tex;
    s.blendMode = layer === 0 ? 'add' : 'normal';
    s.tint = o.tint ?? 0xffffff;
    s.visible = true;
    s.position.set(p.x, p.y);
    s.rotation = o.flat ? 0 : p.rot;
    if (o.flat) p.vr = 0;
    s.scale.set((o.sx ?? 1) * p.s0, p.s0 * p.sy);
    s.alpha = p.a0;
  }

  update(dt: number): void {
    for (const p of this.pool.items) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.max) {
        p.sprite.visible = false;
        this.pool.release(p);
        continue;
      }
      const t = p.life / p.max;
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const s = p.sprite;
      s.position.set(p.x, p.y);
      const sc = p.s0 + (p.s1 - p.s0) * t;
      if (p.stretch) {
        s.rotation = Math.atan2(p.vy, p.vx);
        const sp = Math.min(3, Math.hypot(p.vx, p.vy) / 120 + 0.5);
        s.scale.set(sc * sp, sc * p.sy);
      } else {
        p.rot += p.vr * dt;
        s.rotation = p.rot;
        s.scale.set(Math.sign(s.scale.x || 1) * sc, sc * p.sy);
      }
      s.alpha = p.a0 + (p.a1 - p.a0) * t;
      if (p.frames) s.texture = p.frames[Math.min(p.frames.length - 1, Math.floor(t * p.frames.length))];
    }
  }

  clear(): void {
    for (const p of this.pool.items) p.sprite.visible = false;
    this.pool.releaseAll();
  }
}
