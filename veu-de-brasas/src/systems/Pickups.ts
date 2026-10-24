import { Container, Sprite, Texture } from 'pixi.js';
import { Pool } from '../utils/Pool';
import type { World } from '../world/World';
import { rng } from '../utils/rng';
import { iso } from '../render/Iso';

export type PickKind = 'gem_s' | 'gem_m' | 'gem_l' | 'heal' | 'energy' | 'coin' | 'essence' | 'chest';

interface Pick {
  active: boolean;
  kind: PickKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  value: number;
  magnet: boolean;
  sprite: Sprite;
}

const TEX: Record<PickKind, string> = {
  gem_s: 'gem_s', gem_m: 'gem_m', gem_l: 'gem_l', heal: 'pick_heal', energy: 'pick_energy', coin: 'pick_coin', essence: 'pick_essence', chest: 'chest',
};

/** Fragmentos de experiência, cura, energia, Cinzas Eternas, essências e baús. */
export class Pickups {
  readonly layer = new Container();
  private pool: Pool<Pick>;
  private tex: Record<string, Texture> = {};

  constructor(private w: World) {
    for (const k of Object.values(TEX)) this.tex[k] = w.assets.tex('fx', k);
    this.pool = new Pool<Pick>(() => {
      const s = new Sprite(Texture.EMPTY);
      s.anchor.set(0.5, 0.8);
      s.visible = false;
      this.layer.addChild(s);
      return { active: false, kind: 'gem_s', x: 0, y: 0, vx: 0, vy: 0, t: 0, value: 1, magnet: false, sprite: s };
    }, 100, 600);
  }

  get count(): number {
    return this.pool.activeCount;
  }

  drop(kind: PickKind, x: number, y: number, value = 1): void {
    let p = this.pool.acquire();
    if (!p) {
      // muitas gemas: funde a mais antiga para não perder experiência
      for (const q of this.pool.items) if (q.active && q.kind.startsWith('gem')) {
        this.w.addXp(q.value);
        q.sprite.visible = false;
        this.pool.release(q);
        break;
      }
      p = this.pool.acquire();
      if (!p) return;
    }
    p.kind = kind;
    const a = rng.range(0, Math.PI * 2);
    const sp = kind === 'chest' ? 0 : rng.range(20, 70);
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.t = 0;
    p.value = value;
    p.magnet = false;
    p.sprite.texture = this.tex[TEX[kind]];
    p.sprite.visible = true;
    p.sprite.scale.set(kind === 'chest' ? 1.2 : 1);
  }

  dropXp(x: number, y: number, xp: number): void {
    while (xp >= 10) {
      this.drop('gem_l', x, y, 10);
      xp -= 10;
    }
    while (xp >= 3) {
      this.drop('gem_m', x, y, 3);
      xp -= 3;
    }
    for (let i = 0; i < xp; i++) this.drop('gem_s', x, y, 1);
  }

  /** atrai tudo (fim de ato) */
  vacuum(): void {
    for (const p of this.pool.items) if (p.active && p.kind !== 'chest') p.magnet = true;
  }

  update(dt: number): void {
    const w = this.w;
    const h = w.hero;
    const mag = 72 * w.stats.magnet;
    for (const p of this.pool.items) {
      if (!p.active) continue;
      p.t += dt;
      const dx = h.x - p.x;
      const dy = h.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!p.magnet && d < mag && p.kind !== 'chest' && h.alive) p.magnet = true;
      if (p.magnet) {
        const sp = 140 + p.t * 260;
        p.vx += ((dx / d) * sp - p.vx) * Math.min(1, dt * 10);
        p.vy += ((dy / d) * sp - p.vy) * Math.min(1, dt * 10);
      } else {
        p.vx *= Math.exp(-5 * dt);
        p.vy *= Math.exp(-5 * dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const bob = Math.sin(p.t * 5 + p.x) * 1.5;
      p.sprite.position.set(iso.x(p.x, p.y), iso.y(p.x, p.y) + bob - 3);
      if (p.kind === 'chest' && Math.floor(p.t * 3) % 2 === 0) p.sprite.alpha = 1;
      if (d < (p.kind === 'chest' ? 22 : 12) && h.alive) this.collect(p);
      else if (p.t > 22 && p.kind.startsWith('gem') && !p.magnet) p.magnet = true;
    }
  }

  private collect(p: Pick): void {
    const w = this.w;
    switch (p.kind) {
      case 'gem_s':
      case 'gem_m':
      case 'gem_l':
        w.addXp(p.value);
        w.sfx('sfx_xp', { volume: 0.25, gap: 0.03, rate: 1 + Math.min(0.5, w.xpCombo * 0.02) });
        w.xpCombo++;
        break;
      case 'heal':
        w.hero.heal(30);
        w.sfx('sfx_heal', { volume: 0.6 });
        break;
      case 'energy':
        w.hero.energy = Math.min(100, w.hero.energy + 40);
        w.sfx('sfx_xp', { volume: 0.5, rate: 0.7 });
        w.particles.emit({ tex: w.fx.ring, x: w.hero.x, y: w.hero.y, flat: true, life: 0.35, s0: 0.1, s1: 0.6, tint: 0xffb040 });
        break;
      case 'coin':
        w.coins += p.value;
        w.sfx('sfx_xp', { volume: 0.5, rate: 0.85 });
        w.floatText.spawn(w.hero.x, w.hero.y, '+' + p.value, 0xe8a266, true, 40);
        break;
      case 'essence':
        w.rerolls++;
        w.announce('Essência rara: +1 renovação de cartas');
        w.sfx('sfx_rare', { volume: 0.6 });
        break;
      case 'chest':
        w.fx.anchorBurst(p.x, p.y);
        w.sfx('sfx_legendary', { volume: 0.7 });
        w.queueBonusCard();
        break;
    }
    p.sprite.visible = false;
    this.pool.release(p);
  }

  clear(): void {
    for (const p of this.pool.items) p.sprite.visible = false;
    this.pool.releaseAll();
  }
}
