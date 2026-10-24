import { Sprite, Texture } from 'pixi.js';
import type { World } from '../world/World';
import { clamp } from '../utils/math';
import { iso } from '../render/Iso';
import type { AtlasName } from '../game/AssetLoader';
import { dir8, type Facing } from '../render/Dir8';
import { heroById } from '../content/heroes';

export type Dir = 'down' | 'up' | 'left' | 'right';

/** Herói: movimento com aceleração curta, esquiva com i-frames, sprites pintados em 8 direções. */
export class Hero {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  hp = 100;
  energy = 60;
  dir: Dir = 'down';
  facing: Facing = { src: 'S', flip: false };
  private fps: Record<string, number> = {};
  private baseScale = 1.05;
  private attackAlt = false;
  aimX = 0;
  aimY = 1;
  alive = true;
  invuln = 0;
  hurtT = 0;
  dashT = 0;
  dashCd = 0;
  dashCharges = 1;
  private lean = 0;
  private squash = 0;
  private bobT = 0;
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

  readonly sheet: AtlasName;
  private pre: string;

  constructor(private w: World) {
    const hid = heroById(w.build.hero).id;
    this.sheet = `hero_${hid}` as AtlasName;
    this.pre = `hero_${hid}_`;
    this.dashCharges = w.stats.dashCharges;
    this.sprite = new Sprite(Texture.EMPTY);
    const info = w.assets.chars.hero[hid] ?? w.assets.chars.hero.knight;
    this.sprite.anchor.set(info.anchor[0], info.anchor[1]);
    for (const [k, v] of Object.entries(info.anims)) this.fps[k] = v.fps;
    this.shadow = new Sprite(w.assets.tex('fx', 'shadow'));
    this.shadow.anchor.set(0.5);
    // sombra circular no plano do chão (a camada deitada aplica a projeção)
    this.shadow.scale.set(0.8, 0.8);
    this.shadow.alpha = 0.6;
  }

  get maxHp(): number {
    return this.w.stats.maxHp;
  }

  private setAnim(name: string): void {
    if (name === this.anim) return;
    this.anim = name;
    this.frames = this.w.assets.anim(this.sheet, this.pre + name);
  }

  /** início de um golpe: alterna entre os dois movimentos de ataque */
  attackStart(): void {
    if (this.shootT <= 0) {
      this.attackAlt = !this.attackAlt;
      this.animT = 0;
    }
  }

  update(dt: number): void {
    const w = this.w;
    if (!this.alive) {
      this.deathT += dt;
      this.setAnim(`death_${this.facing.src}`);
      const f = Math.min(this.frames.length - 1, Math.floor(this.deathT * (this.fps.death ?? 10)));
      this.sprite.texture = this.frames[f];
      this.sprite.scale.set(this.facing.flip ? -this.baseScale : this.baseScale, this.baseScale);
      this.sprite.rotation = 0;
      this.sprite.tint = 0xffffff;
      this.place();
      return;
    }
    this.invuln -= dt;
    this.hurtT -= dt;
    // cargas de esquiva recarregam uma por vez
    const maxCh = w.stats.dashCharges;
    if (this.dashCharges < maxCh) {
      this.dashCd -= dt;
      if (this.dashCd <= 0) {
        this.dashCharges++;
        this.dashCd = this.dashCharges < maxCh ? this.dashCooldown * w.stats.dashCdMul : 0;
      }
    } else this.dashCd = 0;
    this.shootT -= dt;
    const input = w.game.input;
    // a entrada é em direções da tela; converte para o plano do mundo isométrico
    const raw = w.controlsLocked ? { x: 0, y: 0 } : input.move();
    const mag = Math.min(1, Math.hypot(raw.x, raw.y));
    const wd = iso.screenDirToWorld(raw.x, raw.y);
    const mv = { x: wd.x * mag, y: wd.y * mag };
    const st = w.stats;
    if (!w.controlsLocked && input.consume('dash') && this.dashCharges > 0 && this.dashT <= 0) {
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
      if (this.dashCharges === maxCh) this.dashCd = this.dashCooldown * st.dashCdMul;
      this.dashCharges--;
      this.squash = -0.25;
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
        w.fx.at(26).dashTrail(this.x, this.y, this.sprite.texture, 1);
      }
    } else {
      const sp = this.baseSpeed * st.speedMul * w.abilities.speedMul;
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
    let wx = moving ? this.vx : this.aimX;
    let wy = moving ? this.vy : this.aimY;
    if (this.shootT > 0) {
      wx = this.aimX;
      wy = this.aimY;
    }
    // direção do sprite segundo a tela
    const fx = wx;
    const fy = wy;
    if (Math.abs(fx) > Math.abs(fy) * 1.1) this.dir = fx > 0 ? 'right' : 'left';
    else if (fx || fy) this.dir = fy > 0 ? 'down' : 'up';
    this.facing = dir8(fx, fy, this.facing);
    // animação (golpes alternam entre dois movimentos)
    let base: string;
    if (this.dashT > 0) base = 'dash';
    else if (this.hurtT > 0) base = 'hurt';
    else if (this.shootT > 0) base = this.attackAlt ? 'shoot2' : 'shoot';
    else if (moving) base = 'walk';
    else base = 'idle';
    const before = this.anim;
    this.setAnim(`${base}_${this.facing.src}`);
    if (before !== this.anim && !before.startsWith(base)) this.animT = 0;
    this.animT += dt;
    let fps = this.fps[base] ?? 12;
    if (base === 'walk') fps *= clamp(Math.hypot(this.vx, this.vy) / this.baseSpeed, 0.6, 1.3) * 0.75;
    if (base === 'shoot' || base === 'shoot2') fps = Math.max(fps, (this.frames.length / 0.3));
    const fi = Math.floor(this.animT * fps);
    const loop = base === 'walk' || base === 'idle' || base === 'dash';
    this.sprite.texture = this.frames[loop ? fi % this.frames.length : Math.min(this.frames.length - 1, fi)];
    // hit-flash: avermelha brevemente
    this.sprite.tint = this.hurtT > 0.16 ? 0xff7a6a : 0xffffff;
    // fluidez: inclinação na direção do movimento, balanço do passo e compressão ao esquivar/aterrissar
    const svx = this.vx;
    const targetLean = this.dashT > 0 ? 0 : clamp(svx / 900, -0.09, 0.09);
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 12);
    this.squash += (0 - this.squash) * Math.min(1, dt * 10);
    this.bobT += dt * (moving ? 11 : 2.5);
    const bob = moving ? Math.abs(Math.sin(this.bobT)) * 0.045 : Math.sin(this.bobT) * 0.012;
    const sq = this.squash + bob;
    this.sprite.rotation = this.lean * 0.5;
    const sc = this.baseScale;
    this.sprite.scale.set((this.facing.flip ? -1 : 1) * sc * (1 - sq * 0.4), sc * (1 + sq * 0.6));
    this.sprite.alpha = this.invuln > 0 && this.dashT <= 0 ? (Math.floor(this.invuln * 16) % 2 ? 0.55 : 1) : 1;
    // regeneração
    if (st.regen > 0) this.heal(st.regen * dt, false);
    this.energy = Math.min(100, this.energy + st.energyRegen * dt);
    this.place();
  }

  place(): void {
    this.sprite.position.set(Math.round(iso.x(this.x, this.y)), Math.round(iso.y(this.x, this.y) - this.z));
    this.sprite.zIndex = iso.depth(this.x, this.y);
    this.shadow.position.set(this.x, this.y);
  }

  heal(n: number, fx = true): void {
    if (!this.alive) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (fx && this.hp - before >= 1) {
      this.w.fx.at(16).healBurst(this.x, this.y);
      this.w.floatText.spawn(this.x, this.y, '+' + Math.round(this.hp - before), 0x70f0a0, true, 40);
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
    this.w.floatText.spawn(this.x, this.y, String(Math.round(dmg)), 0xff6060, true, 36);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathT = 0;
    }
    this.squash = -0.15;
    return true;
  }
}
