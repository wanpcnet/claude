import { Container, Sprite, Texture } from 'pixi.js';
import { Enemy } from '../entities/Enemy';
import { ENEMIES, ACT_HP_MULT } from '../content/enemies';
import { Src } from '../content/types';
import { Pool } from '../utils/Pool';
import { SpatialHash } from '../utils/SpatialHash';
import { rng } from '../utils/rng';
import { TAU, clamp } from '../utils/math';
import { iso } from '../render/Iso';
import { dir8 } from '../render/Dir8';
import type { World } from '../world/World';

const MAX_ENEMIES = 700;

/** Atualiza a horda: estados reais por espécie, massa, separação, colisão, status e morte. */
export class EnemySystem {
  readonly pool: Pool<Enemy>;
  readonly hash: SpatialHash;
  readonly bars = new Container();
  aliveCount = 0;
  private sepT = 0;
  private aiStride = 0;

  constructor(private w: World) {
    this.hash = new SpatialHash(w.arena.width, w.arena.height, 48, MAX_ENEMIES);
    const shadowTex = w.assets.tex('fx', 'shadow');
    this.pool = new Pool<Enemy>((i) => {
      const e = new Enemy(i);
      e.shadow.texture = shadowTex;
      e.shadow.alpha = 0.55;
      w.layers.shadows.addChild(e.shadow);
      w.layers.entities.addChild(e.sprite);
      return e;
    }, 120, MAX_ENEMIES);
  }

  get max(): number {
    return MAX_ENEMIES;
  }

  setAnim(e: Enemy, name: string, loop = true, fps?: number): void {
    if (e.anim === name) return;
    e.anim = name;
    e.frame = 0;
    e.t = 0;
    e.loop = loop;
    // velocidade da animação vem dos metadados do sprite (quadros por segundo da arte)
    const id = name.slice(0, name.indexOf('_'));
    const info = this.w.assets.sov.enemies[id] ?? this.w.assets.sov.bosses[id];
    const sub = name.slice(name.indexOf('_') + 1);
    e.fps = info?.anims[sub]?.fps ?? fps ?? e.fps;
    this.loadFrames(e);
  }

  /** quadros da animação atual na direção atual */
  private loadFrames(e: Enemy): void {
    const sheet = e.boss ? 'bosses' : 'enemies';
    e.frames = this.w.assets.anim(sheet, `${e.anim}_${e.fdir.src}`);
    e.flashFrames = e.frames;
    if (e.frame >= e.frames.length) e.frame = e.frames.length - 1;
  }

  /** âncora (pés) do sprite pintado */
  anchorFor(id: string): [number, number] {
    const info = this.w.assets.sov.enemies[id] ?? this.w.assets.sov.bosses[id];
    return info ? info.anchor : [0.5, 0.85];
  }

  spawn(type: string, x: number, y: number, opts: { summon?: boolean; noXp?: boolean } = {}): Enemy | null {
    const def = ENEMIES[type];
    if (!def) return null;
    const e = this.pool.acquire();
    if (!e) return null;
    const w = this.w;
    const hpMul = ACT_HP_MULT[w.actIndex + 1] * (w.modTide ? 1.05 : 1) * w.enemyHpMul * w.endlessScale() * (def.elite ? w.eliteHpMul : 1);
    e.def = def;
    e.boss = null;
    e.x = x;
    e.y = y;
    e.z = 0;
    e.kx = e.ky = e.mvx = e.mvy = 0;
    e.maxHp = e.hp = Math.round(def.hp * hpMul);
    e.armorHp = def.id === 'guardian' ? Math.round(650 * hpMul) : 0;
    e.radius = def.radius;
    e.mass = def.mass;
    e.speed = def.speed * rng.range(0.92, 1.08) * (1 + w.actIndex * 0.07) * w.enemySpeedMul * Math.min(1.25, Math.sqrt(w.endlessScale()));
    e.state = 'spawn';
    e.st = 0;
    e.flashT = e.burnT = e.slowT = e.flashCd = e.freezeT = 0;
    e.stunned = false;
    e.slowMul = 1;
    e.contactCd = 0;
    e.attackCd = rng.range(1, 3);
    e.hitCd.fill(-10);
    e.a1 = e.a2 = e.a3 = e.a4 = 0;
    e.anim = '';
    e.isSummon = !!opts.summon;
    e.noXp = !!opts.noXp;
    e.scale = (def.scale ?? 1) * 1.25;
    e.fps = def.fps;
    this.setAnim(e, def.walkAnim, true, def.fps);
    e.frame = rng.int(0, e.frames.length - 1);
    const s = e.sprite;
    s.anchor.set(...this.anchorFor(def.id));
    e.fdir = { src: 'S', flip: false };
    s.visible = true;
    s.alpha = 1;
    s.tint = 0xffffff;
    s.texture = e.frames[0];
    s.position.set(iso.x(x, y), iso.y(x, y));
    e.shadow.visible = true;
    e.shadow.scale.set((e.radius * 2.4) / 32, (e.radius * 1.5) / 14);
    if (def.elite) this.attachBar(e);
    return e;
  }

  private attachBar(e: Enemy): void {
    if (!e.bar) {
      const bar = new Container();
      const frame = new Sprite(this.w.uiTex.barFrame);
      frame.scale.set(60 / 128, 0.5);
      const fill = new Sprite(this.w.uiTex.barHp);
      fill.position.set(3, 3);
      fill.height = 6;
      bar.addChild(frame, fill);
      e.bar = bar;
      e.barFill = fill;
    }
    this.bars.addChild(e.bar);
    e.bar.visible = true;
  }

  kill(e: Enemy): void {
    if (e.state === 'dead') return;
    e.state = 'dead';
    e.st = 0;
    if (e.bar) e.bar.visible = false;
    const sheet = e.boss ? 'bosses' : 'enemies';
    e.frames = this.w.assets.anim(sheet, `${e.def.anim}_death_${e.fdir.src}`);
    e.anim = 'death';
    e.frame = 0;
    e.t = 0;
    e.loop = false;
    e.fps = 14;
  }

  release(e: Enemy): void {
    e.sprite.visible = false;
    e.shadow.visible = false;
    if (e.bar) e.bar.visible = false;
    this.pool.release(e);
  }

  clear(): void {
    for (const e of this.pool.items) if (e.active) this.release(e);
  }

  /** Inimigo vivo mais próximo dentro do alcance (usa a grade espacial). */
  nearest(x: number, y: number, range: number, exclude?: Set<number>): Enemy | null {
    const ids = this.hash.query(x, y, range);
    let best: Enemy | null = null;
    let bd = range * range;
    for (let i = 0; i < ids.length; i++) {
      const e = this.pool.items[ids[i]];
      if (!e.alive || e.state === 'spawn' || (exclude && exclude.has(e.id))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  forRadius(x: number, y: number, r: number, cb: (e: Enemy, d2: number) => void): void {
    const ids = this.hash.queryCopy(x, y, r + 64);
    for (let i = 0; i < ids.length; i++) {
      const e = this.pool.items[ids[i]];
      if (!e.alive) continue;
      const rr = r + e.radius;
      const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d2 <= rr * rr) cb(e, d2);
    }
  }

  update(dt: number): void {
    const w = this.w;
    const hero = w.hero;
    const arena = w.arena;
    this.hash.clear();
    let alive = 0;
    for (const e of this.pool.items) {
      if (!e.active || e.state === 'dead') continue;
      this.hash.insert(e.id, e.x, e.y);
      alive++;
    }
    this.aliveCount = alive;
    // IA mais leve quando a horda é enorme: separação a cada 2 passos
    this.sepT ^= 1;
    this.aiStride++;
    const heavy = alive > 350;
    for (const e of this.pool.items) {
      if (!e.active) continue;
      e.t += dt;
      // animação
      const nf = e.frames.length;
      const fi = Math.floor(e.t * e.fps);
      if (e.fps > 0) e.frame = e.loop ? fi % nf : Math.min(nf - 1, fi);
      else e.frame = Math.min(nf - 1, e.frame);
      if (e.state === 'dead') {
        e.sprite.texture = e.frames[e.frame];
        e.shadow.alpha = Math.max(0, 0.55 - e.t * 1.2);
        if (fi >= nf + 1) this.release(e);
        continue;
      }
      e.flashT -= dt;
      e.flashCd -= dt;
      // direção do sprite: para onde anda; parado, encara a heroína
      if (e.state !== 'spawn') {
        const moving = Math.abs(e.mvx) + Math.abs(e.mvy) > 6;
        const nf = dir8(moving ? e.mvx : hero.x - e.x, moving ? e.mvy : hero.y - e.y, e.fdir);
        if (nf.src !== e.fdir.src) {
          e.fdir = nf;
          this.loadFrames(e);
        } else e.fdir = nf;
      }
      e.sprite.texture = e.frames[Math.min(e.frame, e.frames.length - 1)];
      e.contactCd -= dt;
      e.attackCd -= dt;
      e.st += dt;
      // status
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.slowMul = 1;
      }
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.5;
          w.damageEnemy(e, { amount: e.burnDps * 0.5, type: 'fire', source: Src.Burn }, true);
          if (rng.chance(0.5 * w.fx.density)) w.fx.at(e.radius).fire(e.x, e.y, 1, e.radius * 0.5);
          if (!e.alive) continue;
        }
      }
      const big = !!e.boss || !!e.def.elite;
      const tint = e.flashT > 0 ? (e.boss ? 0xffc8b8 : 0xff8a7a) : e.burnT > 0 ? (big ? 0xffe0d0 : 0xffb08a) : e.slowT > 0 ? (big ? 0xe0f0ff : 0xa8d8ff) : 0xffffff;
      e.sprite.tint = tint;
      if (e.freezeT > 0) {
        e.freezeT -= dt;
        e.sprite.tint = e.stunned ? 0xfff0a0 : 0x7fc8ff;
        if (e.state !== 'spawn') {
          e.kx *= Math.exp(-8 * dt);
          e.ky *= Math.exp(-8 * dt);
          e.x += e.kx * dt;
          e.y += e.ky * dt;
          if (!e.def.fly) arena.resolve(e, e.radius * 0.8, e.mass < 20);
          if (e.stunned && rng.chance(dt * 6)) w.fx.at(e.radius * 2 + 4).hit(e.x, e.y, 0xfff0a0, 0.3);
          this.place(e);
          continue;
        }
      }
      if (e.state === 'spawn') {
        const k = Math.min(1, e.st / 0.4);
        e.sprite.scale.set(e.scale * (0.6 + 0.4 * k) * (e.fdir.flip ? -1 : 1), e.scale * k);
        e.sprite.alpha = k;
        if (e.st >= 0.4) e.state = 'move';
        this.place(e);
        continue;
      }
      // comportamento
      if (e.boss) e.boss.update(e, dt);
      else this.ai(e, dt, heavy);
      if (!e.active || (e.state as string) === 'dead') continue;
      // empurrão (knockback) decai com a massa
      e.kx *= Math.exp(-8 * dt);
      e.ky *= Math.exp(-8 * dt);
      e.x += (e.mvx * e.slowMul + e.kx) * dt;
      e.y += (e.mvy * e.slowMul + e.ky) * dt;
      // separação suave na horda
      if (!e.boss && (!heavy || ((e.id + this.sepT) & 1) === 0)) {
        const ids = this.hash.query(e.x, e.y, e.radius * 2 + 4);
        for (let i = 0; i < ids.length; i++) {
          const o = this.pool.items[ids[i]];
          if (o === e || !o.alive || o.def.fly !== e.def.fly) continue;
          const dx = e.x - o.x;
          const dy = e.y - o.y;
          const rr = e.radius + o.radius;
          const d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = ((rr - d) / d) * (o.mass / (e.mass + o.mass)) * (heavy ? 0.9 : 0.5);
            e.x += dx * push;
            e.y += dy * push;
          }
        }
      }
      if (!e.def.fly) arena.resolve(e, e.radius * 0.8, e.mass < 20);
      else {
        e.x = clamp(e.x, 10, arena.width - 10);
        e.y = clamp(e.y, 10, arena.height - 10);
      }
      // contato com a heroína
      if (e.z < 8 && e.contactCd <= 0 && hero.alive) {
        const rr = e.radius + 7;
        const dx = hero.x - e.x;
        const dy = hero.y - e.y;
        if (dx * dx + dy * dy < rr * rr) {
          if (w.damageHero(e.state === 'attack' ? e.def.damage * 1.3 : e.def.damage, e.x, e.y)) e.contactCd = 0.7;
        }
      }
      this.place(e);
    }
  }

  private place(e: Enemy): void {
    const s = e.sprite;
    s.position.set(iso.x(e.x, e.y), iso.y(e.x, e.y) - e.z);
    s.zIndex = iso.depth(e.x, e.y);
    e.shadow.position.set(e.x, e.y + 1);
    if (e.state !== 'spawn') {
      let sx = e.scale;
      let sy = e.scale;
      // leve squash/stretch ao andar
      if (!e.boss && e.state === 'move' && e.def.ai !== 'hopper') sy *= 1 + Math.sin(e.t * 14 + e.id) * 0.03;
      if (e.boss && e.flashT > 0) {
        // chefes: "soco" de escala em vez de silhueta branca (evita clarões grandes)
        sx *= 1.03;
        sy *= 0.97;
      }
      s.scale.set(sx * (e.fdir.flip ? -1 : 1), sy);
    }
    if (e.def.fly) e.shadow.alpha = 0.3;
    if (e.bar && e.barFill) {
      e.bar.position.set(iso.x(e.x, e.y) - 29, iso.y(e.x, e.y) - e.z - e.sprite.height * e.sprite.anchor.y - 12);
      e.barFill.width = Math.max(0, 54 * (e.hp / e.maxHp));
      e.barFill.texture = e.armorHp > 0 ? this.w.uiTex.barBoss : this.w.uiTex.barHp;
    }
  }

  /** direção de perseguição: campo de fluxo quando longe, direto quando perto */
  private chaseDir(e: Enemy): { x: number; y: number } {
    const h = this.w.hero;
    const dx = h.x - e.x;
    const dy = h.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 70 || e.def.fly) return { x: dx / d, y: dy / d };
    const f = this.w.arena.flowAt(e.x, e.y);
    if (!f.ok) return { x: dx / d, y: dy / d };
    return { x: f.x * 0.8 + (dx / d) * 0.2, y: f.y * 0.8 + (dy / d) * 0.2 };
  }

  private setMove(e: Enemy, x: number, y: number, speed: number): void {
    e.mvx = x * speed;
    e.mvy = y * speed;
    const sx = x;
    if (Math.abs(sx) > 0.15) e.facing = sx > 0 ? 1 : -1;
  }

  private ai(e: Enemy, dt: number, heavy: boolean): void {
    const w = this.w;
    const h = w.hero;
    const dx = h.x - e.x;
    const dy = h.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const def = e.def;
    switch (def.ai) {
      case 'swarm': {
        const c = this.chaseDir(e);
        this.setMove(e, c.x, c.y, e.speed);
        break;
      }
      case 'flanker': {
        if (e.state === 'move') {
          const side = e.id % 2 ? 1 : -1;
          if (d > 120) {
            // aproxima pelas laterais: alvo deslocado perpendicularmente
            const tx = h.x + (-dy / d) * side * 90;
            const ty = h.y + (dx / d) * side * 90;
            const ex = tx - e.x;
            const ey = ty - e.y;
            const l = Math.hypot(ex, ey) || 1;
            const c = this.chaseDir(e);
            this.setMove(e, (ex / l) * 0.6 + c.x * 0.4, (ey / l) * 0.6 + c.y * 0.4, e.speed);
          } else if (e.attackCd <= 0) {
            e.state = 'windup';
            e.st = 0;
            e.mvx = e.mvy = 0;
            e.a1 = dx / d;
            e.a2 = dy / d;
            this.setAnim(e, 'spider_lunge', false, 10);
          } else {
            const c = this.chaseDir(e);
            this.setMove(e, c.x, c.y, e.speed);
          }
        } else if (e.state === 'windup') {
          if (e.st > 0.28) {
            e.state = 'attack';
            e.st = 0;
            this.setMove(e, e.a1, e.a2, 270);
          }
        } else if (e.state === 'attack') {
          if (e.st > 0.32) {
            e.state = 'recover';
            e.st = 0;
            e.mvx = e.mvy = 0;
            this.setAnim(e, 'spider_walk', true, def.fps);
          }
        } else if (e.state === 'recover' && e.st > 0.5) {
          e.state = 'move';
          e.attackCd = rng.range(1.6, 2.6);
        }
        break;
      }
      case 'slow': {
        if (e.state === 'move') {
          const c = this.chaseDir(e);
          this.setMove(e, c.x, c.y, e.speed);
          if (d < 36 && e.attackCd <= 0) {
            e.state = 'windup';
            e.st = 0;
            e.mvx = e.mvy = 0;
            this.setAnim(e, 'slime_attack', false, 6);
            w.hazards.circle(e.x, e.y, 40, 0.55, def.damage, 0xb0ff90);
          }
        } else if (e.state === 'windup' && e.st > 0.6) {
          w.fx.dust(e.x, e.y, 6);
          w.shake(1.5);
          e.state = 'recover';
          e.st = 0;
        } else if (e.state === 'recover' && e.st > 0.6) {
          e.state = 'move';
          e.attackCd = 2.2;
          this.setAnim(e, 'slime_walk', true, def.fps);
        }
        break;
      }
      case 'diver': {
        if (e.state === 'move') {
          // circula a média distância
          const ang = Math.atan2(e.y - h.y, e.x - h.x) + dt * 0.8 * (e.id % 2 ? 1 : -1);
          const tx = h.x + Math.cos(ang) * 150;
          const ty = h.y + Math.sin(ang) * 120;
          const ex = tx - e.x;
          const ey = ty - e.y;
          const l = Math.hypot(ex, ey) || 1;
          this.setMove(e, ex / l, ey / l, Math.min(e.speed, l * 3));
          e.z = 14 + Math.sin(e.t * 4) * 3;
          if (e.attackCd <= 0 && d < 240) {
            e.state = 'windup';
            e.st = 0;
            e.mvx = e.mvy = 0;
            e.a1 = Math.atan2(dy, dx);
            w.hazards.line(e.x, e.y, e.a1, 280, 22, 0.7, 0, 0xffe0a0);
            this.setAnim(e, 'wasp_dive', true, 12);
            w.sfx('sfx_warn', { volume: 0.25, gap: 0.3 });
          }
        } else if (e.state === 'windup') {
          e.z = 14 + e.st * 10;
          if (e.st > 0.7) {
            e.state = 'attack';
            e.st = 0;
            this.setMove(e, Math.cos(e.a1), Math.sin(e.a1), 420);
          }
        } else if (e.state === 'attack') {
          e.z = Math.max(2, e.z - dt * 60);
          if (e.st > 0.65) {
            e.state = 'recover';
            e.st = 0;
            e.mvx *= 0.2;
            e.mvy *= 0.2;
            this.setAnim(e, 'wasp_fly', true, 16);
          }
        } else if (e.state === 'recover' && e.st > 0.6) {
          e.state = 'move';
          e.attackCd = rng.range(2.5, 4);
        }
        break;
      }
      case 'charger': {
        if (e.state === 'move') {
          const c = this.chaseDir(e);
          this.setMove(e, c.x, c.y, e.speed);
          if (d < 230 && e.attackCd <= 0 && w.arena.lineClear(e.x, e.y, h.x, h.y)) {
            e.state = 'windup';
            e.st = 0;
            e.mvx = e.mvy = 0;
            e.a1 = Math.atan2(dy, dx);
            e.facing = dx > 0 ? 1 : -1;
            this.setAnim(e, 'shell_windup', true, 16);
            w.hazards.line(e.x, e.y, e.a1, 300, 34, 0.9, 0, 0xff5030);
          }
        } else if (e.state === 'windup') {
          if (e.st > 0.9) {
            e.state = 'attack';
            e.st = 0;
            this.setAnim(e, 'shell_charge', true, 10);
            this.setMove(e, Math.cos(e.a1), Math.sin(e.a1), 340);
          }
        } else if (e.state === 'attack') {
          if (e.st % 0.08 < dt) w.fx.dust(e.x - Math.cos(e.a1) * 12, e.y, 2);
          const blocked = !w.arena.isWalkable(e.x + Math.cos(e.a1) * 18, e.y + Math.sin(e.a1) * 18, 6);
          if (e.st > 0.8 || blocked) {
            if (blocked) {
              w.shake(2);
              w.fx.dust(e.x, e.y, 6);
            }
            e.state = 'recover';
            e.st = 0;
            e.mvx = e.mvy = 0;
            this.setAnim(e, 'shell_walk', true, def.fps);
          }
        } else if (e.state === 'recover' && e.st > 1.0) {
          e.state = 'move';
          e.attackCd = rng.range(3, 4.5);
        }
        break;
      }
      case 'hopper': {
        e.mvx = e.mvy = 0;
        if (e.state === 'move') {
          if (e.st > e.a3) {
            e.state = 'windup';
            e.st = 0;
            this.setAnim(e, 'frog_crouch', false);
            // alvo: posição prevista da heroína, limitada e caminhável
            let tx = h.x + h.vx * 0.45;
            let ty = h.y + h.vy * 0.45;
            const jx = tx - e.x;
            const jy = ty - e.y;
            const jl = Math.hypot(jx, jy) || 1;
            const maxJ = 170;
            if (jl > maxJ) {
              tx = e.x + (jx / jl) * maxJ;
              ty = e.y + (jy / jl) * maxJ;
            }
            if (!w.arena.isWalkable(tx, ty, 10)) {
              tx = e.x + (jx / jl) * Math.min(jl, 60);
              ty = e.y + (jy / jl) * Math.min(jl, 60);
            }
            e.a1 = e.x;
            e.a2 = e.y;
            e.ax = tx;
            e.ay = ty;
            e.facing = tx - e.x > 0 ? 1 : -1;
            w.hazards.circle(tx, ty, 30, 0.9, def.damage, 0x60ffd0);
          }
        } else if (e.state === 'windup') {
          if (e.st > 0.35) {
            e.state = 'air';
            e.st = 0;
            this.setAnim(e, 'frog_jump', false);
          }
        } else if (e.state === 'air') {
          const t = Math.min(1, e.st / 0.55);
          e.x = e.a1 + (e.ax - e.a1) * t;
          e.y = e.a2 + (e.ay - e.a2) * t;
          e.z = Math.sin(t * Math.PI) * 40;
          if (t >= 1) {
            e.z = 0;
            e.state = 'recover';
            e.st = 0;
            this.setAnim(e, 'frog_land', false);
            w.fx.dust(e.x, e.y, 5);
          }
        } else if (e.state === 'recover' && e.st > 0.25) {
          e.state = 'move';
          e.st = 0;
          e.a3 = rng.range(0.5, 1.1) * (heavy ? 1.4 : 1);
          this.setAnim(e, 'frog_idle', true, 4);
        }
        break;
      }
      case 'caster': {
        e.z = 6 + Math.sin(e.t * 3) * 2;
        if (e.state === 'move') {
          let mx = 0;
          let my = 0;
          const strafe = e.id % 2 ? 1 : -1;
          if (d < 170) {
            mx = -dx / d;
            my = -dy / d;
          } else if (d > 240) {
            const c = this.chaseDir(e);
            mx = c.x;
            my = c.y;
          }
          mx += (-dy / d) * strafe * 0.5;
          my += (dx / d) * strafe * 0.5;
          const l = Math.hypot(mx, my) || 1;
          this.setMove(e, mx / l, my / l, e.speed);
          e.facing = dx > 0 ? 1 : -1;
          if (e.attackCd <= 0 && d < 320) {
            e.state = 'windup';
            e.st = 0;
            e.mvx = e.mvy = 0;
            this.setAnim(e, 'ghost_cast', false, 6);
          }
        } else if (e.state === 'windup' && e.st > 0.5) {
          w.projectiles.enemyFire('orb', e.x, e.y, Math.atan2(h.y - e.y, h.x - e.x), 135, def.damage, 3.5, 0, 18);
          w.sfx('sfx_orb', { volume: 0.3, gap: 0.12 });
          e.state = 'recover';
          e.st = 0;
        } else if (e.state === 'recover' && e.st > 0.4) {
          e.state = 'move';
          e.attackCd = rng.range(2.4, 3.4);
          this.setAnim(e, 'ghost_float', true, 8);
        }
        break;
      }
      case 'guardian': {
        const broken = e.armorHp <= 0;
        if (e.state === 'move') {
          const c = this.chaseDir(e);
          this.setMove(e, c.x, c.y, broken ? 58 : e.speed);
          if (e.attackCd <= 0 && d < 260) {
            e.state = 'windup';
            e.st = 0;
            e.mvx = e.mvy = 0;
            e.a1 = Math.atan2(dy, dx);
            e.facing = dx > 0 ? 1 : -1;
            this.setAnim(e, 'guardian_windup', false, 4);
            w.hazards.cone(e.x, e.y, e.a1, 200, 0.55, 0.95, def.damage, 0xff7050);
            w.sfx('sfx_warn', { volume: 0.4 });
          }
        } else if (e.state === 'windup' && e.st > 0.95) {
          w.projectiles.fan('coral', e.x, e.y, e.a1, broken ? 11 : 9, 1.0, 210, 9);
          w.fx.shatter(e.x + Math.cos(e.a1) * 30, e.y + Math.sin(e.a1) * 30, 8, true);
          w.shake(3);
          w.sfx('sfx_glass', { volume: 0.6 });
          e.state = 'recover';
          e.st = 0;
        } else if (e.state === 'recover' && e.st > 0.7) {
          e.state = 'move';
          e.attackCd = broken ? 2.8 : 3.8;
          this.setAnim(e, broken ? 'guardian_broken' : 'guardian_walk', true, def.fps);
        }
        break;
      }
      case 'priestess': {
        e.z = 8 + Math.sin(e.t * 2) * 3;
        if (e.state === 'move') {
          let mx = 0;
          let my = 0;
          if (d < 180) {
            mx = -dx / d;
            my = -dy / d;
          } else if (d > 260) {
            const c = this.chaseDir(e);
            mx = c.x;
            my = c.y;
          }
          mx += (-dy / d) * 0.6;
          my += (dx / d) * 0.6;
          const l = Math.hypot(mx, my) || 1;
          this.setMove(e, mx / l, my / l, e.speed);
          e.facing = dx > 0 ? 1 : -1;
          e.a3 -= dt; // recarga de invocação
          if (e.a3 <= 0) {
            e.a3 = 7;
            e.state = 'windup';
            e.st = 0;
            e.a4 = 1; // invocação
            e.mvx = e.mvy = 0;
            this.setAnim(e, 'priestess_cast', false, 6);
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * TAU + rng.range(0, 1);
              const sx = e.x + Math.cos(a) * 60;
              const sy = e.y + Math.sin(a) * 45;
              if (!w.arena.isWalkable(sx, sy, 8)) continue;
              const hz = w.hazards.circle(sx, sy, 22, 0.8, 0, 0x60e0ff);
              if (hz) hz.onResolve = () => {
                for (let k = 0; k < 3; k++) this.spawn(k === 0 ? 'spider' : 'rust', sx + rng.range(-10, 10), sy + rng.range(-8, 8), { summon: true });
                w.fx.shatter(sx, sy, 5);
              };
            }
            w.sfx('sfx_summon', { volume: 0.6 });
          } else if (e.attackCd <= 0) {
            e.attackCd = e.hp < e.maxHp * 0.5 ? 2.8 : 3.6;
            e.state = 'windup';
            e.st = 0;
            e.a4 = 0;
            e.mvx = e.mvy = 0;
            this.setAnim(e, 'priestess_cast', false, 6);
            const n = e.hp < e.maxHp * 0.5 ? 3 : 1;
            for (let i = 0; i < n; i++) {
              const ox = i === 0 ? 0 : rng.range(-90, 90);
              const oy = i === 0 ? 0 : rng.range(-70, 70);
              const zx = h.x + h.vx * 0.3 + ox;
              const zy = h.y + h.vy * 0.3 + oy;
              const hz = w.hazards.circle(zx, zy, 56, 1.15, def.damage + 6, 0x70f0ff);
              if (hz) hz.onResolve = () => {
                w.fx.shatter(zx, zy, 10);
                w.sfx('sfx_glass', { volume: 0.5, gap: 0.05 });
                w.lighting.flash(zx, zy, 0x60e0ff, 100, 0.3);
              };
            }
          }
        } else if (e.state === 'windup' && e.st > 0.7) {
          e.state = 'recover';
          e.st = 0;
        } else if (e.state === 'recover' && e.st > 0.4) {
          e.state = 'move';
          this.setAnim(e, 'priestess_float', true, 6);
        }
        break;
      }
    }
  }
}

/** textura ausente segura */
export const EMPTY = Texture.EMPTY;
