import type { Texture } from 'pixi.js';
import type { AssetLoader } from '../game/AssetLoader';
import type { Particles } from './Particles';
import type { Lighting } from './Lighting';
import { rng } from '../utils/rng';
import { TAU } from '../utils/math';

/** Receitas de efeitos: cada magia tem impacto, cor e ritmo próprios. */
export class Fx {
  glow: Texture;
  spark: Texture;
  star: Texture;
  ember: Texture;
  dot: Texture;
  ring: Texture;
  ringThick: Texture;
  smoke: Texture[];
  flame: Texture[];
  flameBlue: Texture[];
  explosionFrames: Texture[];
  shards: Texture[];
  coralShards: Texture[];
  levelup: Texture;
  heal: Texture;
  streak: Texture;
  /** multiplicador de densidade (qualidade gráfica) */
  density = 1;
  reduceFlash = false;
  private pendingH = 0;

  /** define a altura (px de tela acima do chão) para a próxima receita: fx.at(10).hit(x, y) */
  at(h: number): this {
    this.pendingH = h;
    return this;
  }

  private takeH(): number {
    const h = this.pendingH;
    this.pendingH = 0;
    return h;
  }

  constructor(a: AssetLoader, private p: Particles, private light: Lighting) {
    const t = (n: string) => a.tex('fx', n);
    this.glow = t('glow');
    this.spark = t('spark');
    this.star = t('star');
    this.ember = t('ember');
    this.dot = t('dot');
    this.ring = t('ring');
    this.ringThick = t('ring_thick');
    this.smoke = [0, 1, 2, 3].map((i) => t(`smoke_${i}`));
    this.flame = a.anim('fx', 'flame');
    this.flameBlue = a.anim('fx', 'flame_blue');
    this.explosionFrames = a.anim('fx', 'explosion');
    this.shards = [0, 1, 2].map((i) => t(`shard_${i}`));
    this.coralShards = [0, 1, 2].map((i) => t(`shard_coral_${i}`));
    this.levelup = t('levelup');
    this.heal = t('heal_cross');
    this.streak = t('streak');
  }

  private n(k: number): number {
    return Math.max(1, Math.round(k * this.density));
  }

  hit(x: number, y: number, color: number, power = 1): void {
    const H = this.takeH();
    const c = this.n(3 + power * 2);
    for (let i = 0; i < c; i++) {
      const a = rng.range(0, TAU);
      const sp = rng.range(80, 200) * power;
      this.p.emit({ h: H, tex: this.spark, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rng.range(0.12, 0.25), s0: 0.9, s1: 0.3, tint: color, stretch: true, drag: 6 });
    }
    this.p.emit({ h: H, tex: this.star, x, y, life: 0.12, s0: 0.6 * power + 0.4, s1: 0.2, tint: color, rot: rng.range(0, 1) });
  }

  death(x: number, y: number, tint: number, size = 1): void {
    const H = this.takeH();
    const c = this.n(6 + size * 4);
    for (let i = 0; i < c; i++) {
      const a = rng.range(0, TAU);
      const sp = rng.range(40, 150) * size;
      this.p.emit({ h: H, tex: this.dot, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: rng.range(0.3, 0.6), s0: rng.range(1.2, 2.2), s1: 0.3, tint, grav: 220, drag: 2 });
    }
    this.p.emit({ h: H, tex: this.glow, x, y, life: 0.25, s0: 0.4 * size, s1: 0.9 * size, a0: 0.7, tint });
    this.p.emit({ h: H, tex: this.smoke[rng.int(0, 3)], x, y, vy: -12, life: 0.6, s0: 0.5 * size, s1: 1.0 * size, a0: 0.5, additive: false, vr: rng.range(-1, 1) });
  }

  fire(x: number, y: number, count = 6, spread = 14, blue = false): void {
    const H = this.takeH();
    const frames = blue ? this.flameBlue : this.flame;
    for (let i = 0; i < this.n(count); i++) {
      this.p.emit({ h: H, tex: frames[0], frames, x: x + rng.range(-spread, spread), y: y + rng.range(-spread, spread) * 0.6, vx: rng.range(-20, 20), vy: rng.range(-60, -25), life: rng.range(0.35, 0.6), s0: rng.range(0.5, 0.9), s1: 0.2 });
    }
    for (let i = 0; i < this.n(count / 2); i++) {
      this.p.emit({ h: H, tex: this.ember, x: x + rng.range(-spread, spread), y, vx: rng.range(-40, 40), vy: rng.range(-90, -30), life: rng.range(0.4, 0.9), s0: 1.2, s1: 0.4, tint: blue ? 0x9ad8ff : 0xffb040 });
    }
  }

  explosion(x: number, y: number, scale = 1, color = 0xff8030): void {
    const H = this.takeH();
    this.p.emit({ h: H, tex: this.explosionFrames[0], frames: this.explosionFrames, x, y, life: 0.42, s0: scale, s1: scale * 1.15, a0: 1, a1: 0.6, rot: rng.range(0, TAU) });
    this.p.emit({ h: 0, flat: true, tex: this.ringThick, x, y, life: 0.3, s0: 0.15 * scale, s1: 0.7 * scale, a0: 0.8, tint: color });
    this.at(H).smokeBurst(x, y, 4, 0.8 * scale);
    if (!this.reduceFlash) this.light.flash(x, y, color, 120 * scale, 0.35, 1);
  }

  smokeBurst(x: number, y: number, count: number, size = 1): void {
    const H = this.takeH();
    for (let i = 0; i < this.n(count); i++) {
      const a = rng.range(0, TAU);
      this.p.emit({ h: H, tex: this.smoke[rng.int(0, 3)], x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 20 - 15, life: rng.range(0.6, 1.0), s0: 0.6 * size, s1: 1.4 * size, a0: 0.55, a1: 0, additive: false, vr: rng.range(-1.5, 1.5), drag: 2 });
    }
  }

  shatter(x: number, y: number, count = 8, coral = false): void {
    const H = this.takeH();
    const set = coral ? this.coralShards : this.shards;
    for (let i = 0; i < this.n(count); i++) {
      const a = rng.range(0, TAU);
      const sp = rng.range(60, 180);
      this.p.emit({ h: H, tex: set[rng.int(0, 2)], x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rng.range(0.35, 0.7), s0: 1, s1: 0.6, a0: 1, a1: 0, grav: 300, vr: rng.range(-12, 12), additive: false });
    }
    this.p.emit({ h: H, tex: this.star, x, y, life: 0.18, s0: 1.4, s1: 0.4, tint: coral ? 0xffa080 : 0xbff8ff });
  }

  electric(x: number, y: number): void {
    const H = this.takeH();
    for (let i = 0; i < this.n(4); i++) {
      const a = rng.range(0, TAU);
      this.p.emit({ h: H, tex: this.spark, x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.15, s0: 0.8, s1: 0.2, tint: 0xbfe0ff, stretch: true });
    }
    this.p.emit({ h: H, tex: this.glow, x, y, life: 0.12, s0: 0.5, s1: 0.2, tint: 0x8ac8ff });
  }

  healBurst(x: number, y: number): void {
    const H = this.takeH();
    for (let i = 0; i < this.n(8); i++) {
      this.p.emit({ h: H, tex: this.heal, x: x + rng.range(-14, 14), y: y + rng.range(-10, 6), vy: rng.range(-50, -25), life: rng.range(0.5, 0.9), s0: 1, s1: 0.5 });
    }
    this.light.flash(x, y, 0x60f0a0, 70, 0.4, 0.8);
  }

  levelUp(x: number, y: number): void {
    const H = this.takeH();
    this.p.emit({ h: H + 20, tex: this.levelup, x, y, life: 0.7, s0: 0.3, s1: 1.6, a0: 1, vr: 1.2, tint: 0xffd070 });
    this.p.emit({ h: 0, flat: true, tex: this.ring, x, y, life: 0.6, s0: 0.2, s1: 1.8, tint: 0xfff0a0 });
    for (let i = 0; i < this.n(18); i++) {
      const a = (i / 18) * TAU;
      this.p.emit({ h: H + 20, tex: this.ember, x, y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.7, s0: 1.6, s1: 0.2, tint: 0xffe090, drag: 3 });
    }
    this.light.flash(x, y, 0xffd070, 180, 0.7, 1);
  }

  dashTrail(x: number, y: number, tex: Texture, sx: number): void {
    const H = this.takeH();
    this.p.emit({ h: H, tex, x, y, life: 0.28, s0: 1, s1: 1, a0: 0.55, a1: 0, tint: 0xffa860, sx });
  }

  dust(x: number, y: number, count = 3): void {
    const H = this.takeH();
    for (let i = 0; i < this.n(count); i++) {
      this.p.emit({ h: H, tex: this.smoke[rng.int(0, 3)], x: x + rng.range(-6, 6), y: y + rng.range(-2, 2), vx: rng.range(-25, 25), vy: rng.range(-15, -2), life: 0.45, s0: 0.25, s1: 0.5, a0: 0.4, additive: false });
    }
  }

  anchorBurst(x: number, y: number): void {
    const H = this.takeH();
    for (let k = 0; k < 3; k++) {
      this.p.emit({ h: 0, flat: true, tex: this.ring, x, y, life: 0.8 + k * 0.25, s0: 0.2, s1: 3 + k, a0: 0.9, tint: 0xffc060 });
    }
    for (let i = 0; i < this.n(40); i++) {
      const a = rng.range(0, TAU);
      const sp = rng.range(60, 260);
      this.p.emit({ h: H + 30, tex: this.ember, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rng.range(0.8, 1.6), s0: 2, s1: 0.3, tint: 0xffd080, drag: 1.5 });
    }
    this.light.flash(x, y, 0xffb050, 360, 1.6, 1);
  }
}
