import { Container, Sprite, Texture } from 'pixi.js';
import { Pool } from '../utils/Pool';
import { Src, type DamageType } from '../content/types';
import type { World } from '../world/World';
import type { Enemy } from '../entities/Enemy';
import { rng } from '../utils/rng';
import { TAU } from '../utils/math';
import { iso } from '../render/Iso';

export type PKind = 'arrow' | 'lance' | 'shard' | 'seed' | 'ember' | 'missile' | 'dagger';
export type EKind = 'orb' | 'coral' | 'lava' | 'crystal';

export interface Proj {
  active: boolean;
  kind: PKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  dmg: number;
  pierce: number;
  hits: Int32Array;
  nHits: number;
  src: Src;
  type: DamageType;
  burn: number;
  spin: number;
  tx: number;
  ty: number;
  sprite: Sprite;
  trail: Sprite;
  t: number;
  frames: Texture[] | null;
  light: ReturnType<World['lighting']['flash']> | null;
  /** altura visual acima do chão (px de tela) */
  z: number;
}

export interface EProj {
  active: boolean;
  kind: EKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  dmg: number;
  sprite: Sprite;
  t: number;
  accel: number;
  z: number;
}

/** Projéteis do jogador (perfuração, queimadura, explosões) e dos inimigos (orbes, estilhaços, lava). */
export class Projectiles {
  readonly layer = new Container();
  readonly trails = new Container();
  readonly enemyLayer = new Container();
  private pool: Pool<Proj>;
  private epool: Pool<EProj>;
  private tex: Record<string, Texture> = {};
  private lanceFrames: Texture[];
  private missileFrames: Texture[];

  constructor(private w: World) {
    const a = w.assets;
    this.trails.blendMode = 'add';
    this.enemyLayer.blendMode = 'normal';
    for (const n of ['arrow', 'trail_amber', 'trail_white', 'shard_0', 'shard_1', 'shard_2', 'shard_coral_0', 'shard_coral_1', 'orb_violet', 'orb_cyan', 'lava_glob', 'ember', 'glow']) this.tex[n] = a.tex('fx', n);
    this.lanceFrames = a.anim('fx', 'lance');
    this.missileFrames = a.anim('fx', 'missile');
    this.tex.dagger = a.tex('fx', 'dagger');
    this.pool = new Pool<Proj>(() => {
      const s = new Sprite(Texture.EMPTY);
      s.anchor.set(0.5);
      s.visible = false;
      const tr = new Sprite(this.tex.trail_amber);
      tr.anchor.set(1, 0.5);
      tr.visible = false;
      this.layer.addChild(s);
      this.trails.addChild(tr);
      return { active: false, kind: 'arrow', x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 4, dmg: 0, pierce: 0, hits: new Int32Array(48), nHits: 0, src: Src.Arrow, type: 'physical', burn: 0, spin: 0, tx: 0, ty: 0, sprite: s, trail: tr, t: 0, frames: null, light: null, z: 14 };
    }, 60, 500);
    this.epool = new Pool<EProj>(() => {
      const s = new Sprite(Texture.EMPTY);
      s.anchor.set(0.5);
      s.visible = false;
      this.enemyLayer.addChild(s);
      return { active: false, kind: 'orb', x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 5, dmg: 0, sprite: s, t: 0, accel: 0, z: 12 };
    }, 40, 400);
  }

  get count(): number {
    return this.pool.activeCount + this.epool.activeCount;
  }

  fire(kind: PKind, x: number, y: number, ang: number, speed: number, dmg: number, opts: Partial<Pick<Proj, 'pierce' | 'r' | 'life' | 'src' | 'type' | 'burn' | 'spin' | 'tx' | 'ty' | 'z'>> = {}): Proj | null {
    const p = this.pool.acquire();
    if (!p) return null;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(ang) * speed;
    p.vy = Math.sin(ang) * speed;
    p.dmg = dmg;
    p.pierce = opts.pierce ?? 0;
    p.r = opts.r ?? 4;
    p.life = opts.life ?? 1.2;
    p.src = opts.src ?? Src.Arrow;
    p.type = opts.type ?? 'physical';
    p.burn = opts.burn ?? 0;
    p.spin = opts.spin ?? 0;
    p.tx = opts.tx ?? 0;
    p.ty = opts.ty ?? 0;
    p.nHits = 0;
    p.t = 0;
    p.z = opts.z ?? 14;
    p.frames = null;
    const s = p.sprite;
    const tr = p.trail;
    s.visible = true;
    s.scale.set(1);
    s.alpha = 1;
    s.tint = 0xffffff;
    tr.visible = true;
    tr.alpha = 1;
    tr.tint = 0xffffff;
    switch (kind) {
      case 'arrow':
        s.texture = this.tex.arrow;
        tr.texture = this.tex.trail_amber;
        tr.scale.set(0.7, 0.6);
        break;
      case 'lance':
        p.frames = this.lanceFrames;
        s.texture = this.lanceFrames[0];
        tr.texture = this.tex.trail_amber;
        tr.scale.set(1.6, 2.2);
        p.light = this.w.lighting.flash(x, y, 0xff9030, 90, Infinity, 0.9, () => ({ x: p.x, y: p.y }));
        break;
      case 'shard':
        s.texture = this.tex[`shard_${rng.int(0, 2)}`];
        tr.texture = this.tex.trail_white;
        tr.tint = 0x9ff4ff;
        tr.scale.set(0.45, 0.5);
        break;
      case 'seed':
        s.texture = this.tex.shard_0;
        s.scale.set(1.6);
        tr.texture = this.tex.trail_white;
        tr.tint = 0x9ff4ff;
        tr.scale.set(0.8, 1);
        break;
      case 'missile':
        p.frames = this.missileFrames;
        s.texture = this.missileFrames[0];
        tr.texture = this.tex.trail_white;
        tr.tint = 0xc08cff;
        tr.scale.set(0.7, 0.7);
        p.tx = -1;
        p.ty = 0;
        break;
      case 'dagger':
        s.texture = this.tex.dagger;
        tr.texture = this.tex.trail_white;
        tr.tint = 0xb0a8ff;
        tr.scale.set(0.6, 0.5);
        break;
      case 'ember':
        s.texture = this.tex.ember;
        s.scale.set(2.2);
        s.tint = 0xffa040;
        tr.texture = this.tex.trail_amber;
        tr.scale.set(0.5, 0.8);
        break;
    }
    return p;
  }

  enemyFire(kind: EKind, x: number, y: number, ang: number, speed: number, dmg: number, life = 3, accel = 0, z = 14): EProj | null {
    const p = this.epool.acquire();
    if (!p) return null;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(ang) * speed;
    p.vy = Math.sin(ang) * speed;
    p.dmg = dmg;
    p.life = life;
    p.t = 0;
    p.accel = accel;
    p.z = z;
    const s = p.sprite;
    s.visible = true;
    s.rotation = 0;
    s.scale.set(1);
    switch (kind) {
      case 'orb': s.texture = this.tex.orb_violet; p.r = 5; break;
      case 'coral': s.texture = this.tex.shard_coral_0; p.r = 4; s.scale.set(1.3); break;
      case 'lava': s.texture = this.tex.lava_glob; p.r = 7; break;
      case 'crystal': s.texture = this.tex.orb_cyan; p.r = 5; s.scale.set(1.1); break;
    }
    return p;
  }

  private release(p: Proj): void {
    p.sprite.visible = false;
    p.trail.visible = false;
    if (p.light) {
      this.w.lighting.release(p.light);
      p.light = null;
    }
    this.pool.release(p);
  }

  update(dt: number): void {
    const w = this.w;
    for (const p of this.pool.items) {
      if (!p.active) continue;
      p.t += dt;
      p.life -= dt;
      if (p.kind === 'ember' && p.spin) {
        const a = p.spin * dt;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const vx = p.vx * c - p.vy * s;
        p.vy = p.vx * s + p.vy * c;
        p.vx = vx;
        p.vx *= 1 + dt * 0.6;
        p.vy *= 1 + dt * 0.6;
      }
      if (p.kind === 'missile') this.steer(p, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const ang = Math.atan2(p.vy, p.vx);
      const sang = iso.angle(p.vx, p.vy);
      const sx = iso.x(p.x, p.y);
      const sy = iso.y(p.x, p.y) - p.z;
      p.sprite.position.set(sx, sy);
      p.sprite.rotation = p.kind === 'ember' ? 0 : sang;
      if (p.kind === 'shard') p.sprite.rotation += p.t * 10;
      if (p.frames) p.sprite.texture = p.frames[Math.floor(p.t * 14) % p.frames.length];
      p.trail.position.set(sx, sy);
      p.trail.rotation = sang;
      if (p.kind === 'seed') {
        const arrive = p.life <= 0;
        if (arrive) {
          w.weapons.bloomLotus(p.x, p.y);
          this.release(p);
        }
        continue;
      }
      if (p.life <= 0 || (p.kind !== 'ember' && w.arena.lineClear(p.x - p.vx * dt, p.y - p.vy * dt, p.x, p.y) === false)) {
        if (p.kind === 'arrow' || p.kind === 'shard' || p.kind === 'dagger' || p.kind === 'missile') w.fx.at(p.z).hit(p.x, p.y, p.kind === 'arrow' ? 0xffc060 : 0x9ff4ff, 0.4);
        this.release(p);
        continue;
      }
      if (p.kind === 'ember' && p.t % 0.06 < dt) w.particles.emit({ tex: this.tex.ember, x: p.x, y: p.y, h: p.z, life: 0.3, s0: 1.2, s1: 0.2, tint: 0xff8030 });
      if (p.kind === 'lance' && p.t % 0.03 < dt) w.fx.at(p.z).fire(p.x - p.vx * 0.03, p.y - p.vy * 0.03, 1, 4);
      // colisão com inimigos via grade espacial
      const ids = w.enemies.hash.query(p.x, p.y, p.r + 64);
      let dead = false;
      for (let i = 0; i < ids.length; i++) {
        const e = w.enemies.pool.items[ids[i]];
        if (!e.alive || e.z > 20) continue;
        const rr = p.r + e.radius;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        if (this.hasHit(p, e)) continue;
        this.markHit(p, e);
        this.onHit(p, e, ang);
        if (p.pierce-- <= 0) {
          dead = true;
          break;
        }
      }
      if (dead) this.release(p);
    }
    const hero = w.hero;
    for (const p of this.epool.items) {
      if (!p.active) continue;
      p.t += dt;
      p.life -= dt;
      if (p.accel) {
        const k = 1 + p.accel * dt;
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(iso.x(p.x, p.y), iso.y(p.x, p.y) - p.z);
      if (p.kind === 'coral') p.sprite.rotation = iso.angle(p.vx, p.vy);
      else p.sprite.scale.set((p.kind === 'crystal' ? 1.1 : 1) * (1 + Math.sin(p.t * 20) * 0.1));
      const out = p.x < 0 || p.y < 0 || p.x > w.arena.width || p.y > w.arena.height;
      if (p.life <= 0 || out) {
        p.sprite.visible = false;
        this.epool.release(p);
        continue;
      }
      const dx = hero.x - p.x;
      const dy = hero.y - p.y;
      const rr = p.r + 6;
      if (dx * dx + dy * dy < rr * rr && hero.alive) {
        if (w.damageHero(p.dmg, p.x, p.y)) {
          w.fx.at(p.z).hit(p.x, p.y, p.kind === 'lava' ? 0xff8030 : p.kind === 'orb' ? 0xb090ff : 0x9ff4ff, 0.8);
          p.sprite.visible = false;
          this.epool.release(p);
        }
      }
    }
  }

  /** míssil teleguiado: reavalia o alvo periodicamente e gira a velocidade em direção a ele */
  private steer(p: Proj, dt: number): void {
    const w = this.w;
    p.ty -= dt;
    let target = p.tx >= 0 ? w.enemies.pool.items[p.tx] : null;
    if (!target || !target.alive || p.ty <= 0) {
      const t = w.enemies.nearest(p.x, p.y, 280);
      p.tx = t ? t.id : -1;
      p.ty = 0.15;
      target = t;
    }
    if (!target) return;
    const sp = Math.hypot(p.vx, p.vy);
    const cur = Math.atan2(p.vy, p.vx);
    let want = Math.atan2(target.y - p.y, target.x - p.x) - cur;
    want = Math.atan2(Math.sin(want), Math.cos(want));
    const turn = Math.max(-p.spin * dt, Math.min(p.spin * dt, want));
    p.vx = Math.cos(cur + turn) * sp;
    p.vy = Math.sin(cur + turn) * sp;
  }

  private hasHit(p: Proj, e: Enemy): boolean {
    for (let i = 0; i < p.nHits; i++) if (p.hits[i] === e.id) return true;
    return false;
  }

  private markHit(p: Proj, e: Enemy): void {
    if (p.nHits < p.hits.length) p.hits[p.nHits++] = e.id;
  }

  private onHit(p: Proj, e: Enemy, ang: number): void {
    const w = this.w;
    const knock = p.kind === 'lance' ? 60 : p.kind === 'arrow' ? 50 : 30;
    w.damageEnemy(e, { amount: p.dmg, type: p.type, source: p.src, knock, kx: Math.cos(ang), ky: Math.sin(ang), burn: p.burn, burnDur: p.burn ? 2.5 : 0 });
    if (p.kind === 'arrow') {
      w.fx.at(8).hit(e.x, e.y, 0xffd070, 0.7);
      if (w.build.flags.l_phoenix) w.weapons.phoenixBurst(e.x, e.y, p.dmg);
    } else if (p.kind === 'lance') {
      w.fx.at(6).fire(e.x, e.y, 3, 8);
    } else if (p.kind === 'shard') {
      w.fx.at(6).shatter(e.x, e.y, 3);
    } else if (p.kind === 'ember') {
      w.fx.at(6).fire(e.x, e.y, 2, 6);
    } else if (p.kind === 'missile') {
      w.fx.at(10).hit(e.x, e.y, 0xc08cff, 0.8);
      if (w.build.flags.c_shatter && e.slowT > 0) {
        w.fx.at(8).shatter(e.x, e.y, 6);
        for (let i = 0; i < 4; i++) this.fire('shard', e.x, e.y, i * 1.57 + 0.4, 280, p.dmg * 0.4, { r: 4, life: 0.4, src: Src.Frost, type: 'ice', z: 8 });
      }
    } else if (p.kind === 'dagger') {
      w.fx.at(10).hit(e.x, e.y, 0xb0a8ff, 0.6);
    }
  }

  /** dispara leque de projéteis inimigos */
  fan(kind: EKind, x: number, y: number, ang: number, count: number, spread: number, speed: number, dmg: number, z = 14): void {
    for (let i = 0; i < count; i++) {
      const a = count === 1 ? ang : ang - spread / 2 + (spread * i) / (count - 1);
      this.enemyFire(kind, x, y, a, speed, dmg, 4, 0, z);
    }
  }

  radial(kind: EKind, x: number, y: number, count: number, speed: number, dmg: number, offset = 0, accel = 0, z = 20): void {
    for (let i = 0; i < count; i++) this.enemyFire(kind, x, y, offset + (i / count) * TAU, speed, dmg, 5, accel, z);
  }

  clear(): void {
    for (const p of this.pool.items) if (p.active) this.release(p);
    for (const p of this.epool.items) {
      p.sprite.visible = false;
    }
    this.epool.releaseAll();
  }
}
