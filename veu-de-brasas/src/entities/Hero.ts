import { Sprite, Texture } from 'pixi.js';
import type { World } from '../world/World';
import { clamp } from '../utils/math';

export type Dir = 'down' | 'up' | 'left' | 'right';

/** Arqueira-rúnica: movimento com aceleração curta, esquiva com i-frames, animações em 4 direções. */
export class Hero {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  hp = 100;
  energy = 60;
  dir: Dir = 'down';
  aimX = 0;
  aimY = 1;
  alive = true;
  invuln = 0;
  hurtT = 0;
  dashT = 0;
  dashCd = 0;
  dashX = 0;
  dashY = 0;
  shootT = 0;
  deathT = 0;
  readonly radius = 7;
  readonly sprite: Sprite;
  readonly shadow: Sprite;
  private animT = 0;
  private anim = '';
  private frames: Texture[] = [];
  private afterT = 0;
  readonly baseSpeed = 118;
  readonly dashSpeed = 430;
  readonly dashTime = 0.17;
  readonly dashCooldown = 1.25;

  constructor(private w: World) {
    this.sprite = new Sprite(Texture.EMPTY);
    this.sprite.anchor.set(0.5, 0.9);
    this.shadow = new Sprite(w.assets.tex('fx', 'shadow'));
    this.shadow.anchor.set(0.5);
    this.shadow.scale.set(0.75, 0.75);
    this.shadow.alpha = 0.6;
  }

  get maxHp(): number {
    return this.w.stats.maxHp;
  }

  private setAnim(name: string): void {
    if (name === this.anim) return;
    this.anim = name;
    this.frames = this.w.assets.anim('hero', name);
    this.animT = 0;
  }

  update(dt: number): void {
    const w = this.w;
    if (!this.alive) {
      this.deathT += dt;
      this.setAnim('hero_death');
      const f = Math.min(this.frames.length - 1, Math.floor(this.deathT * 6));
      this.sprite.texture = this.frames[f];
      this.place();
      return;
    }
    this.invuln -= dt;
    this.hurtT -= dt;
    this.dashCd -= dt;
    this.shootT -= dt;
    const input = w.game.input;
    const mv = w.controlsLocked ? { x: 0, y: 0 } : input.move();
    const st = w.stats;
    if (!w.controlsLocked && input.consume('dash') && this.dashCd <= 0 && this.dashT <= 0) {
      let dx = mv.x;
      let dy = mv.y;
      if (!dx && !dy) {
        dx = this.aimX;
        dy = this.aimY;
      }
      const l = Math.hypot(dx, dy) || 1;
      this.dashX = dx / l;
      this.dashY = dy / l;
      this.dashT = this.dashTime;
      this.dashCd = this.dashCooldown * st.dashCdMul;
      this.invuln = Math.max(this.invuln, 0.26);
      w.sfx('sfx_dash', { volume: 0.7 });
      w.fx.dust(this.x, this.y, 5);
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashX * this.dashSpeed;
      this.vy = this.dashY * this.dashSpeed;
      this.afterT -= dt;
      if (this.afterT <= 0) {
        this.afterT = 0.03;
        w.fx.dashTrail(this.x, this.y - 22, this.sprite.texture, 1);
      }
    } else {
      const sp = this.baseSpeed * st.speedMul;
      const tx = mv.x * sp;
      const ty = mv.y * sp;
      const acc = mv.x || mv.y ? 18 : 22;
      const k = 1 - Math.exp(-acc * dt);
      this.vx += (tx - this.vx) * k;
      this.vy += (ty - this.vy) * k;
    }
    const pos = { x: this.x + this.vx * dt, y: this.y + this.vy * dt };
    w.arena.resolve(pos, this.radius);
    this.x = pos.x;
    this.y = pos.y;
    // direção: movimento, ou mira quando parada
    const moving = Math.hypot(this.vx, this.vy) > 20;
    let fx = moving ? this.vx : this.aimX;
    let fy = moving ? this.vy : this.aimY;
    if (this.shootT > 0) {
      fx = this.aimX;
      fy = this.aimY;
    }
    if (Math.abs(fx) > Math.abs(fy) * 1.1) this.dir = fx > 0 ? 'right' : 'left';
    else if (fx || fy) this.dir = fy > 0 ? 'down' : 'up';
    // animação
    let a: string;
    if (this.dashT > 0) a = `hero_dash_${this.dir}`;
    else if (this.hurtT > 0) a = `hero_hurt_${this.dir}`;
    else if (this.shootT > 0 && !moving) a = `hero_shoot_${this.dir}`;
    else if (moving) a = `hero_walk_${this.dir}`;
    else a = `hero_idle_${this.dir}`;
    this.setAnim(a);
    this.animT += dt;
    const fps = a.includes('walk') ? 10 * clamp(Math.hypot(this.vx, this.vy) / this.baseSpeed, 0.6, 1.4) : a.includes('shoot') ? 14 : a.includes('idle') ? 4 : 12;
    const fi = Math.floor(this.animT * fps);
    const loop = !a.includes('shoot');
    this.sprite.texture = this.frames[loop ? fi % this.frames.length : Math.min(this.frames.length - 1, fi)];
    // hit-flash breve e piscar discreto durante invulnerabilidade
    if (this.hurtT > 0.18) this.sprite.texture = w.assets.tex('hero', `hero_flash_${this.dir}`);
    this.sprite.alpha = this.invuln > 0 && this.dashT <= 0 ? (Math.floor(this.invuln * 16) % 2 ? 0.55 : 1) : 1;
    // regeneração
    if (st.regen > 0) this.heal(st.regen * dt, false);
    this.energy = Math.min(100, this.energy + st.energyRegen * dt);
    this.place();
  }

  place(): void {
    this.sprite.position.set(Math.round(this.x), Math.round(this.y - this.z));
    this.sprite.zIndex = this.y;
    this.shadow.position.set(this.x, this.y);
  }

  heal(n: number, fx = true): void {
    if (!this.alive) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (fx && this.hp - before >= 1) {
      this.w.fx.healBurst(this.x, this.y - 16);
      this.w.floatText.spawn(this.x, this.y - 40, '+' + Math.round(this.hp - before), 0x70f0a0, true);
    }
  }

  /** retorna true se o dano foi aplicado */
  damage(amount: number, sx: number, sy: number): boolean {
    if (!this.alive || this.invuln > 0) return false;
    const dmg = Math.max(1, amount - this.w.stats.armor);
    this.hp -= dmg;
    this.invuln = 0.75;
    this.hurtT = 0.28;
    const dx = this.x - sx;
    const dy = this.y - sy;
    const l = Math.hypot(dx, dy) || 1;
    this.vx += (dx / l) * 160;
    this.vy += (dy / l) * 160;
    this.w.floatText.spawn(this.x, this.y - 36, String(Math.round(dmg)), 0xff6060, true);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathT = 0;
    }
    return true;
  }
}
