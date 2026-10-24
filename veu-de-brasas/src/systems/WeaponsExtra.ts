import { Container, Sprite, Texture } from 'pixi.js';
import { WEAPONS, type WeaponId, type WeaponLevel } from '../content/weapons';
import { Src, type DamageType } from '../content/types';
import type { Enemy } from '../entities/Enemy';
import type { World } from '../world/World';
import { rng } from '../utils/rng';
import { TAU } from '../utils/math';
import { iso } from '../render/Iso';

interface Faller {
  x: number;
  y: number;
  t: number;
  dur: number;
  h0: number;
  r: number;
  dmg: number;
  burn: number;
  type: DamageType;
  src: Src;
  s: Sprite;
  mark: Sprite;
  frames: Texture[] | null;
  fire: boolean;
}

interface Zone {
  kind: 'fire' | 'void' | 'rain' | 'decal';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  tick: number;
  tickT: number;
  dmg: number;
  pull: number;
  s: Sprite | null;
  src: Src;
  big: boolean;
}

interface Totem {
  x: number;
  y: number;
  life: number;
  t: number;
  fireT: number;
  shots: number;
  s: Sprite;
}

interface Wisp {
  x: number;
  y: number;
  z: number;
  state: 'orbit' | 'seek' | 'back';
  target: Enemy | null;
  cd: number;
  t: number;
  phase: number;
  life: number;
  dark: boolean;
  s: Sprite;
}

interface Moon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dist: number;
  max: number;
  back: boolean;
  split: boolean;
  scale: number;
  dmg: number;
  s: Sprite;
}

interface Spike {
  x: number;
  y: number;
  delay: number;
  dmg: number;
  r: number;
}

/**
 * As doze armas da expansão: órbitas, teleguiados, quedas do céu, zonas, invocações e auras.
 * Cada arma lê seus números de content/weapons.ts; aqui só há comportamento e efeitos.
 */
export class WeaponsExtra {
  readonly layer = new Container();
  private daggers: Sprite[] = [];
  private dagRot = 0;
  private lapT = 0;
  private fallers: Faller[] = [];
  private zones: Zone[] = [];
  private totems: Totem[] = [];
  private wisps: Wisp[] = [];
  private moons: Moon[] = [];
  private spikes: Spike[] = [];
  private aura: Sprite;
  private auraT = 0;
  private tex: Record<string, Texture> = {};
  private anims: Record<string, Texture[]> = {};
  private healBudget = 3;

  constructor(private w: World) {
    const a = w.assets;
    for (const n of ['dagger', 'moon', 'scorch', 'ice_ring', 'snowflake', 'crack', 'ring', 'ring_thick', 'glow', 'arrow', 'thorns', 'shadow', 'dot']) this.tex[n] = a.tex('fx', n);
    for (const n of ['meteor', 'spike', 'totem', 'wisp', 'wisp_v', 'slash', 'void', 'lance']) this.anims[n] = a.anim('fx', n);
    this.aura = new Sprite(this.tex.thorns);
    this.aura.anchor.set(0.5);
    this.aura.visible = false;
    this.aura.alpha = 0.75;
    w.layers.groundFx.addChild(this.aura);
  }

  private lvl(id: WeaponId): WeaponLevel | null {
    const l = this.w.build.weapons[id];
    return l ? WEAPONS[id].levels[l - 1] : null;
  }

  /** dano persistente: cada fonte só acerta o mesmo alvo a cada `cd` segundos */
  private once(e: Enemy, src: Src, cd: number): boolean {
    if (e.hitCd[src] > this.w.time - cd) return false;
    e.hitCd[src] = this.w.time;
    return true;
  }

  private sprite(tex: Texture, parent: Container, ax = 0.5, ay = 0.5): Sprite {
    const s = new Sprite(tex);
    s.anchor.set(ax, ay);
    parent.addChild(s);
    return s;
  }

  private placeAir(s: Sprite, x: number, y: number, z: number): void {
    s.position.set(iso.x(x, y), iso.y(x, y) - z);
    s.zIndex = iso.depth(x, y) + 2;
  }

  /** aglomeração de inimigos mais densa entre alguns candidatos */
  cluster(range: number, preferBig = true): { x: number; y: number } | null {
    const w = this.w;
    const h = w.hero;
    const big = w.director.target;
    if (preferBig && big && big.alive && big.state !== 'spawn' && Math.hypot(big.x - h.x, big.y - h.y) < range) return { x: big.x, y: big.y };
    let best: Enemy | null = null;
    let bestN = -1;
    for (let k = 0; k < 6; k++) {
      const c = w.enemies.nearest(h.x + rng.range(-range * 0.6, range * 0.6), h.y + rng.range(-range * 0.5, range * 0.5), range * 0.6);
      if (!c) continue;
      let n = 0;
      w.enemies.forRadius(c.x, c.y, 60, () => n++);
      if (n > bestN) {
        bestN = n;
        best = c;
      }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  // ------------------------------------------------------------ disparos com recarga
  fire(id: WeaponId, L: WeaponLevel): boolean {
    const w = this.w;
    const h = w.hero;
    const st = w.stats;
    const fl = w.build.flags;
    switch (id) {
      case 'missile': {
        const t = w.enemies.nearest(h.x, h.y, 340);
        if (!t) return false;
        const n = L.count + st.amount;
        const base = Math.atan2(t.y - h.y, t.x - h.x);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.55 + rng.range(-0.1, 0.1);
          w.projectiles.fire('missile', h.x, h.y, a, L.speed * st.projSpeed, L.damage, { spin: L.turn, life: 2.4, r: 5, src: Src.Missile, type: 'arcane', z: 18 });
        }
        w.sfx('sfx_glass', { volume: 0.25, rate: 1.8, gap: 0.08 });
        return true;
      }
      case 'meteor': {
        const n = L.count + st.amount + (fl.l_comet ? 2 : 0);
        let any = false;
        for (let i = 0; i < n; i++) {
          const p = this.cluster(300, i === 0);
          if (!p) break;
          any = true;
          this.meteor(p.x + rng.range(-20, 20) * i, p.y + rng.range(-16, 16) * i, L.damage, L.radius * st.areaMul, L.burn, 0.55 + i * 0.12, !!fl.l_comet);
        }
        return any;
      }
      case 'frost': {
        const R = L.radius * st.areaMul;
        if (!w.enemies.nearest(h.x, h.y, R)) return false;
        this.frostNova(h.x, h.y, R, L.damage, L.slow, L.slowDur * st.durationMul, fl.l_iceage ? 1.2 * st.durationMul : 0);
        return true;
      }
      case 'spikes': {
        const t = w.enemies.nearest(h.x, h.y, 320);
        if (!t) return false;
        const base = Math.atan2(t.y - h.y, t.x - h.x);
        const dirs: number[] = [];
        for (let j = 0; j < L.lines; j++) dirs.push(base + (j - (L.lines - 1) / 2) * 0.38);
        if (fl.l_bones) for (const d of [...dirs]) dirs.push(d + Math.PI / 2, d + Math.PI, d - Math.PI / 2);
        for (const d of dirs) {
          for (let k = 1; k <= L.count; k++) {
            this.spikes.push({ x: h.x + Math.cos(d) * L.spacing * k, y: h.y + Math.sin(d) * L.spacing * k, delay: k * 0.035, dmg: L.damage, r: 15 * st.areaMul });
          }
        }
        w.sfx('sfx_armor_break', { volume: 0.18, rate: 1.6, gap: 0.12 });
        return true;
      }
      case 'totem': {
        if (!w.enemies.nearest(h.x, h.y, 300)) return false;
        for (let i = 0; i < L.count; i++) {
          const a = rng.range(0, TAU);
          const p = { x: h.x + Math.cos(a) * 46, y: h.y + Math.sin(a) * 46 };
          w.arena.resolve(p, 8);
          if (this.totems.length >= L.count + 1) {
            const old = this.totems.shift()!;
            old.s.destroy();
          }
          const s = this.sprite(this.anims.totem[0], w.layers.entities, 0.5, 0.92);
          this.totems.push({ x: p.x, y: p.y, life: L.life * st.durationMul, t: 0, fireT: 0.3, shots: 0, s });
          w.fx.dust(p.x, p.y, 6);
          w.fx.at(30).electric(p.x, p.y);
        }
        w.sfx('sfx_thunder', { volume: 0.3, rate: 1.5 });
        return true;
      }
      case 'whip': {
        const reach = L.reach * st.areaMul;
        const t = w.enemies.nearest(h.x, h.y, reach * 1.1);
        if (!t) return false;
        const ang = Math.atan2(t.y - h.y, t.x - h.x);
        h.aimX = Math.cos(ang);
        h.aimY = Math.sin(ang);
        h.attackStart();
        h.shootT = 0.3;
        this.healBudget = 3;
        this.whip(ang, reach, L.width * st.areaMul, L.damage);
        if (L.both) this.whip(ang + Math.PI, reach, L.width * st.areaMul, L.damage);
        if (fl.c_bloodthorn) this.thornsPulse(2);
        w.sfx('sfx_wind', { volume: 0.45, rate: 1.7, gap: 0.08 });
        return true;
      }
      case 'moon': {
        const t = w.enemies.nearest(h.x, h.y, L.range);
        if (!t) return false;
        const n = L.count + st.amount;
        const base = Math.atan2(t.y - h.y, t.x - h.x);
        const blood = !!fl.l_bloodmoon;
        for (let i = 0; i < n; i++) this.moon(h.x, h.y, base + (i - (n - 1) / 2) * 0.5, L.speed * st.projSpeed, L.range * st.projSpeed, L.damage, blood ? 1.5 : 1, blood);
        w.sfx('sfx_wind', { volume: 0.3, rate: 2.2, gap: 0.1 });
        return true;
      }
      case 'void': {
        const t = w.enemies.nearest(h.x, h.y, 300);
        if (!t) return false;
        const a = Math.atan2(t.y - h.y, t.x - h.x);
        const eh = !!fl.l_eventhorizon;
        this.spawnVoid(h.x + Math.cos(a) * 30, h.y + Math.sin(a) * 30, Math.cos(a) * 55, Math.sin(a) * 55, L.radius * st.areaMul, L.life * st.durationMul, L.damage, L.pull * (eh ? 1.8 : 1), eh);
        return true;
      }
      case 'rain': {
        const p = this.cluster(320);
        if (!p) return false;
        const life = L.life * st.durationMul;
        this.zones.push({ kind: 'rain', x: p.x, y: p.y, vx: 0, vy: 0, r: L.radius * st.areaMul, life, max: life, tick: life / L.arrows, tickT: 0, dmg: L.damage, pull: 0, s: null, src: Src.Rain, big: false });
        w.sfx('sfx_arrow', { volume: 0.4, rate: 0.7 });
        return true;
      }
      case 'thorns': {
        this.thornsPulse(1);
        return true;
      }
      case 'dagger':
      case 'wisp':
        return true; // contínuas: tratadas em update()
      default:
        return false;
    }
  }

  // ------------------------------------------------------------ armas contínuas e entidades
  update(dt: number): void {
    const w = this.w;
    this.healBudget = Math.min(3, this.healBudget + dt);
    this.updateDaggers(dt);
    this.updateWisps(dt);
    this.updateAura(dt);
    this.updateFallers(dt);
    this.updateZones(dt);
    this.updateTotems(dt);
    this.updateMoons(dt);
    // espinhos irrompem em sequência
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const sp = this.spikes[i];
      sp.delay -= dt;
      if (sp.delay > 0) continue;
      this.spikes.splice(i, 1);
      if (!w.arena.isWalkable(sp.x, sp.y, 4)) continue;
      w.enemies.forRadius(sp.x, sp.y, sp.r, (e) => {
        w.damageEnemy(e, { amount: sp.dmg, type: 'shadow', source: Src.Spikes, knock: 30, kx: 0, ky: -1 });
      });
      w.particles.emit({ tex: this.anims.spike[0], frames: this.anims.spike, x: sp.x, y: sp.y, h: 10, life: 0.42, s0: 1, s1: 1, a0: 1, a1: 0.6, additive: false });
      if (rng.chance(0.4)) w.fx.dust(sp.x, sp.y, 1);
    }
  }

  private updateDaggers(dt: number): void {
    const w = this.w;
    const h = w.hero;
    const L = this.lvl('dagger');
    const n = L ? L.count + w.stats.amount + (w.build.flags.l_blades ? 3 : 0) : 0;
    while (this.daggers.length < n) {
      const s = this.sprite(this.tex.dagger, w.layers.entities);
      s.tint = 0xd8d0ff;
      this.daggers.push(s);
    }
    for (let i = 0; i < this.daggers.length; i++) this.daggers[i].visible = i < n && h.alive;
    if (!L || !h.alive) return;
    this.dagRot += dt * L.spin;
    const R = L.radius * w.stats.areaMul;
    for (let i = 0; i < n; i++) {
      const a = this.dagRot + (i / n) * TAU;
      const x = h.x + Math.cos(a) * R;
      const y = h.y + Math.sin(a) * R;
      const s = this.daggers[i];
      this.placeAir(s, x, y, 12 + Math.sin(this.dagRot * 2 + i) * 2);
      s.rotation = iso.angle(-Math.sin(a), Math.cos(a));
      w.enemies.forRadius(x, y, 10, (e) => {
        if (!this.once(e, Src.Dagger, L.cooldown)) return;
        w.damageEnemy(e, { amount: L.damage, type: 'arcane', source: Src.Dagger, knock: 40, kx: Math.cos(a), ky: Math.sin(a) });
        w.fx.at(12).hit(e.x, e.y, 0xb0a8ff, 0.5);
      });
    }
    if (w.build.flags.l_blades) {
      this.lapT += dt;
      if (this.lapT >= TAU / L.spin) {
        this.lapT = 0;
        for (let i = 0; i < n; i++) {
          const a = this.dagRot + (i / n) * TAU;
          w.projectiles.fire('dagger', h.x + Math.cos(a) * R, h.y + Math.sin(a) * R, a, 420, L.damage, { pierce: 2, r: 5, life: 0.7, src: Src.Dagger, type: 'arcane', z: 12 });
        }
      }
    }
  }

  /** espíritos permanentes (arma) + temporários (habilidade de Nyx) */
  spawnWisps(n: number, life: number, dark: boolean): void {
    const h = this.w.hero;
    for (let i = 0; i < n; i++) {
      const s = this.sprite(this.anims[dark ? 'wisp_v' : 'wisp'][0], this.w.layers.entities, 0.5, 0.6);
      s.blendMode = 'add';
      this.wisps.push({ x: h.x, y: h.y, z: 18, state: 'orbit', target: null, cd: rng.range(0, 0.4), t: rng.range(0, 3), phase: rng.range(0, TAU), life, dark, s });
    }
  }

  private updateWisps(dt: number): void {
    const w = this.w;
    const h = w.hero;
    const st = w.stats;
    const L = this.lvl('wisp');
    const want = L ? (L.count + st.amount) * (w.build.flags.l_legion ? 2 : 1) : 0;
    let perm = 0;
    for (const p of this.wisps) if (p.life < 0) perm++;
    if (perm < want) this.spawnWisps(want - perm, -1, w.build.hero === 'nyx');
    const base = L ?? WEAPONS.wisp.levels[Math.min(4, Math.floor(w.level / 6))];
    const legion = !!w.build.flags.l_legion;
    let k = 0;
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const p = this.wisps[i];
      if (p.life >= 0) {
        p.life -= dt;
        if (p.life <= 0) {
          w.fx.at(p.z).hit(p.x, p.y, 0xa080ff, 0.6);
          p.s.destroy();
          this.wisps.splice(i, 1);
          continue;
        }
      } else if (perm-- > want) {
        p.s.destroy();
        this.wisps.splice(i, 1);
        continue;
      }
      k++;
      p.t += dt;
      p.cd -= dt;
      const speed = base.speed * st.projSpeed;
      const ox = h.x + Math.cos(p.phase + p.t * 1.6) * 28;
      const oy = h.y + Math.sin(p.phase + p.t * 1.6) * 22;
      if (p.state === 'orbit') {
        p.x += (ox - p.x) * Math.min(1, dt * 6);
        p.y += (oy - p.y) * Math.min(1, dt * 6);
        if (p.cd <= 0 && h.alive) {
          const t = w.enemies.nearest(h.x + rng.range(-60, 60), h.y + rng.range(-60, 60), 260);
          if (t) {
            p.target = t;
            p.state = 'seek';
          } else p.cd = 0.25;
        }
      } else if (p.state === 'seek') {
        const t = p.target;
        if (!t || !t.alive) {
          p.state = 'back';
        } else {
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.x += (dx / d) * speed * dt;
          p.y += (dy / d) * speed * dt;
          if (d < t.radius + 6) {
            const dmg = p.life >= 0 ? base.damage * 1.2 : base.damage;
            w.damageEnemy(t, { amount: dmg, type: p.dark ? 'shadow' : 'light', source: Src.Wisp, knock: 50, kx: dx / d, ky: dy / d });
            w.fx.at(10).hit(t.x, t.y, p.dark ? 0xa070ff : 0x9ff4ff, 0.7);
            if (legion) {
              w.enemies.forRadius(t.x, t.y, 30 * st.areaMul, (e) => {
                if (e !== t) w.damageEnemy(e, { amount: dmg * 0.5, type: 'light', source: Src.Wisp });
              });
              w.particles.emit({ tex: this.tex.ring, x: t.x, y: t.y, flat: true, life: 0.25, s0: 0.05, s1: 0.5 * st.areaMul, tint: 0x9ff4ff });
            }
            p.state = 'back';
          }
        }
      } else {
        const dx = ox - p.x;
        const dy = oy - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = speed * 1.3 * dt;
        if (d <= step + 4) {
          p.state = 'orbit';
          p.cd = base.cooldown * st.cooldownMul;
        } else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
      }
      const frames = this.anims[p.dark ? 'wisp_v' : 'wisp'];
      p.s.texture = frames[Math.floor(p.t * 10 + i) % frames.length];
      p.z = 16 + Math.sin(p.t * 4 + p.phase) * 4;
      this.placeAir(p.s, p.x, p.y, p.z);
      p.s.alpha = p.life >= 0 ? Math.min(1, p.life * 2) : 1;
      if (k % 2 === 0 && rng.chance(dt * 20 * w.fx.density)) w.particles.emit({ tex: this.tex.dot, x: p.x, y: p.y, h: p.z, vy: -10, life: 0.35, s0: 1.2, s1: 0.2, tint: p.dark ? 0x9060ff : 0x9ff4ff });
    }
  }

  private updateAura(dt: number): void {
    const w = this.w;
    const L = this.lvl('thorns');
    this.aura.visible = !!L && w.hero.alive;
    if (!L) return;
    this.auraT += dt;
    const R = L.radius * w.stats.areaMul;
    this.aura.position.set(w.hero.x, w.hero.y);
    this.aura.rotation += dt * 0.6;
    const pulse = Math.max(0, 1 - this.auraT * 4);
    this.aura.scale.set(((R * 2) / 118) * (1 + pulse * 0.12));
    this.aura.alpha = 0.55 + pulse * 0.4;
  }

  thornsPulse(mul: number): void {
    const w = this.w;
    const L = this.lvl('thorns');
    if (!L) return;
    const h = w.hero;
    const R = L.radius * w.stats.areaMul * mul;
    this.auraT = 0;
    w.enemies.forRadius(h.x, h.y, R, (e) => {
      const a = Math.atan2(e.y - h.y, e.x - h.x);
      w.damageEnemy(e, { amount: L.damage * mul, type: 'physical', source: Src.Thorns, knock: 35, kx: Math.cos(a), ky: Math.sin(a) });
    });
    if (mul > 1) {
      w.particles.emit({ tex: this.tex.ring_thick, x: h.x, y: h.y, flat: true, life: 0.3, s0: 0.2, s1: (R * 2) / 96, tint: 0xff6070 });
      w.sfx('sfx_hit', { volume: 0.4, rate: 0.7, gap: 0.1 });
    }
  }

  /** reflexo da Aura de Espinhos ao receber dano */
  reflect(amount: number, sx: number, sy: number): void {
    const L = this.lvl('thorns');
    if (!L) return;
    const w = this.w;
    const dmg = (amount * 3 + L.damage * 4) * L.reflect;
    w.enemies.forRadius(sx, sy, 34, (e) => {
      w.damageEnemy(e, { amount: dmg, type: 'physical', source: Src.Thorns, heavy: true });
    });
    w.fx.at(10).hit(sx, sy, 0x90e070, 1);
  }

  private whip(ang: number, reach: number, width: number, dmg: number): void {
    const w = this.w;
    const h = w.hero;
    const cx = Math.cos(ang);
    const cy = Math.sin(ang);
    w.enemies.forRadius(h.x + cx * reach * 0.5, h.y + cy * reach * 0.5, reach * 0.62, (e) => {
      const dx = e.x - h.x;
      const dy = e.y - h.y;
      const along = dx * cx + dy * cy;
      const perp = Math.abs(-dx * cy + dy * cx);
      if (along < -6 || along > reach + e.radius || perp > width / 2 + e.radius) return;
      w.damageEnemy(e, { amount: dmg, type: 'blood', source: Src.Whip, knock: 140, kx: cx, ky: cy, heavy: true });
      w.fx.at(10).hit(e.x, e.y, 0xff5060, 0.8);
      if (this.healBudget >= 0.5) {
        this.healBudget -= 0.5;
        h.heal(0.5, false);
      }
    });
    const fr = this.anims.slash;
    const mx = h.x + cx * reach * 0.5;
    const my = h.y + cy * reach * 0.5;
    w.particles.emit({ tex: fr[0], frames: fr, x: mx, y: my, h: 12, rot: iso.angle(cx, cy), life: 0.22, s0: (reach / 72) * 1.05, s1: (reach / 72) * 1.15, a0: 1, a1: 0.3, tint: 0xff7080 });
    w.shake(1.5);
  }

  private moon(x: number, y: number, ang: number, speed: number, range: number, dmg: number, scale: number, split: boolean): void {
    const s = this.sprite(this.tex.moon, this.w.layers.entities);
    s.blendMode = 'add';
    s.tint = split ? 0xff7080 : 0xfff2c0;
    this.moons.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dist: 0, max: range, back: false, split, scale, dmg, s });
  }

  private updateMoons(dt: number): void {
    const w = this.w;
    const h = w.hero;
    for (let i = this.moons.length - 1; i >= 0; i--) {
      const m = this.moons[i];
      const sp = Math.hypot(m.vx, m.vy);
      if (!m.back) {
        m.dist += sp * dt;
        if (m.dist >= m.max) {
          m.back = true;
          if (m.split) {
            const a = Math.atan2(m.vy, m.vx);
            for (const o of [-0.7, 0.7]) {
              this.moon(m.x, m.y, a + o, sp * 0.9, m.max * 0.4, m.dmg * 0.6, 0.9, false);
              this.moons[this.moons.length - 1].s.tint = 0xff8090;
            }
          }
        }
      } else {
        const dx = h.x - m.x;
        const dy = h.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = 1 - Math.exp(-dt * 7);
        m.vx += ((dx / d) * sp * 1.04 - m.vx) * k;
        m.vy += ((dy / d) * sp * 1.04 - m.vy) * k;
        if (d < 14 || m.dist > m.max * 4) {
          m.s.destroy();
          this.moons.splice(i, 1);
          continue;
        }
        m.dist += sp * dt;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      this.placeAir(m.s, m.x, m.y, 14);
      m.s.rotation += dt * 16;
      m.s.scale.set(m.scale);
      const blood = m.s.tint !== 0xfff2c0;
      w.enemies.forRadius(m.x, m.y, 11 * m.scale, (e) => {
        if (!this.once(e, Src.Moon, 0.35)) return;
        w.damageEnemy(e, { amount: m.dmg, type: 'light', source: Src.Moon, knock: 40, kx: m.vx / (sp || 1), ky: m.vy / (sp || 1) });
        w.fx.at(12).hit(e.x, e.y, blood ? 0xff7080 : 0xfff0b0, 0.6);
        if (blood && this.healBudget >= 0.3) {
          this.healBudget -= 0.3;
          h.heal(0.3, false);
        }
      });
      if (rng.chance(dt * 30 * w.fx.density)) w.particles.emit({ tex: this.tex.dot, x: m.x, y: m.y, h: 14, life: 0.3, s0: 1.4, s1: 0.2, tint: blood ? 0xff6070 : 0xfff0b0 });
    }
  }

  // ------------------------------------------------------------ quedas do céu (meteoros, lanças)
  meteor(x: number, y: number, dmg: number, r: number, burn: number, dur = 0.55, fire = false, lance = false): void {
    const w = this.w;
    const frames = lance ? this.anims.lance : this.anims.meteor;
    const s = this.sprite(frames[0], w.layers.fxAdd, 0.5, 0.85);
    s.rotation = lance ? Math.PI / 2 : 0;
    const mark = this.sprite(this.tex.ring, w.layers.groundFx);
    mark.tint = lance ? 0xffe090 : 0xff8040;
    mark.blendMode = 'add';
    this.fallers.push({ x, y, t: 0, dur, h0: lance ? 200 : 260, r, dmg, burn, type: 'fire', src: lance ? Src.Ult : Src.Meteor, s, mark, frames, fire });
  }

  private updateFallers(dt: number): void {
    const w = this.w;
    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const f = this.fallers[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      const z = f.h0 * (1 - k * k);
      const lance = f.src === Src.Ult;
      f.s.position.set(iso.x(f.x, f.y) + (lance ? 0 : (1 - k) * 60), iso.y(f.x, f.y) - z);
      if (f.frames) f.s.texture = f.frames[Math.floor(f.t * 14) % f.frames.length];
      f.mark.position.set(f.x, f.y);
      f.mark.scale.set(((f.r * 2) / 118) * (0.4 + k * 0.6));
      f.mark.alpha = 0.25 + k * 0.5;
      if (k < 1) {
        if (!lance && rng.chance(dt * 40 * w.fx.density)) w.particles.emit({ tex: this.tex.dot, x: f.x, y: f.y, h: z + 10, vx: rng.range(-20, 20), vy: -20, life: 0.4, s0: 2, s1: 0.4, tint: 0xffa040 });
        continue;
      }
      f.s.destroy();
      f.mark.destroy();
      this.fallers.splice(i, 1);
      w.enemies.forRadius(f.x, f.y, f.r, (e) => {
        const a = Math.atan2(e.y - f.y, e.x - f.x);
        w.damageEnemy(e, { amount: f.dmg, type: f.type, source: f.src, knock: 160, kx: Math.cos(a), ky: Math.sin(a), burn: f.burn, burnDur: 2.5, heavy: true });
      });
      w.fx.at(8).explosion(f.x, f.y, Math.max(0.7, f.r / 46), lance ? 0xffe090 : 0xff8030);
      w.lighting.flash(f.x, f.y, 0xff9040, f.r * 3, 0.35, 1);
      w.fx.dust(f.x, f.y, 4);
      w.shake(lance ? 1.5 : 3);
      w.sfx('sfx_explosion', { volume: lance ? 0.25 : 0.45, gap: 0.05, rate: lance ? 1.5 : 1 });
      const scorch = this.sprite(this.tex.scorch, w.layers.groundFx);
      scorch.position.set(f.x, f.y);
      scorch.scale.set((f.r * 2) / 48);
      scorch.alpha = 0.8;
      this.zones.push({ kind: f.fire ? 'fire' : 'decal', x: f.x, y: f.y, vx: 0, vy: 0, r: f.r * 0.8, life: 3, max: 3, tick: 0.5, tickT: 0.5, dmg: f.dmg * 0.22, pull: 0, s: scorch, src: Src.Meteor, big: false });
    }
  }

  // ------------------------------------------------------------ zonas (fogo, vazio, chuva)
  spawnVoid(x: number, y: number, vx: number, vy: number, r: number, life: number, dmg: number, pull: number, big: boolean): void {
    const s = this.sprite(this.anims.void[0], this.w.layers.entities, 0.5, 0.5);
    this.zones.push({ kind: 'void', x, y, vx, vy, r, life, max: life, tick: 0.25, tickT: 0, dmg, pull, s, src: Src.Void, big });
    this.w.sfx('sfx_pulse', { volume: 0.3, rate: 0.6, gap: 0.2 });
  }

  private updateZones(dt: number): void {
    const w = this.w;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= dt;
      z.tickT -= dt;
      z.x += z.vx * dt;
      z.y += z.vy * dt;
      if (z.kind === 'decal' || z.kind === 'fire') {
        if (z.s) z.s.alpha = Math.min(0.8, z.life / 1.2) * 0.85;
        if (z.kind === 'fire') {
          if (z.tickT <= 0) {
            z.tickT = z.tick;
            w.enemies.forRadius(z.x, z.y, z.r, (e) => w.damageEnemy(e, { amount: z.dmg, type: 'fire', source: Src.Meteor, burn: 4, burnDur: 1.5 }, true));
          }
          if (rng.chance(dt * 18 * w.fx.density)) {
            const a = rng.range(0, TAU);
            const d = rng.range(0, z.r);
            w.fx.fire(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 1, 2);
          }
        }
      } else if (z.kind === 'void') {
        const s = z.s!;
        const fr = this.anims.void;
        s.texture = fr[Math.floor((z.max - z.life) * 12) % fr.length];
        const grow = Math.min(1, (z.max - z.life) * 4) * (z.life < 0.25 ? z.life * 4 : 1);
        s.scale.set((z.r / 46) * grow * (z.big ? 1 : 0.9));
        this.placeAir(s, z.x, z.y, 14);
        z.vx *= Math.exp(-dt * 0.8);
        z.vy *= Math.exp(-dt * 0.8);
        w.enemies.forRadius(z.x, z.y, z.r, (e) => {
          if (e.mass >= 900) return;
          const dx = z.x - e.x;
          const dy = z.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 6) return;
          const k = (z.pull * 8 * dt) / Math.sqrt(Math.max(1, e.mass * 0.5));
          e.kx += (dx / d) * k;
          e.ky += (dy / d) * k;
        });
        if (z.tickT <= 0) {
          z.tickT = z.tick;
          w.enemies.forRadius(z.x, z.y, z.r, (e) => w.damageEnemy(e, { amount: z.dmg, type: 'shadow', source: z.src }, true));
        }
        if (rng.chance(dt * 30 * w.fx.density)) {
          const a = rng.range(0, TAU);
          w.particles.emit({ tex: this.tex.dot, x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r, h: 6, vx: -Math.cos(iso.angle(Math.cos(a), Math.sin(a))) * 80, vy: -Math.sin(iso.angle(Math.cos(a), Math.sin(a))) * 40, life: 0.5, s0: 1.6, s1: 0.2, tint: 0xa070ff });
        }
        if (z.life <= 0) {
          if (z.big) {
            w.enemies.forRadius(z.x, z.y, z.r * 1.2, (e) => w.damageEnemy(e, { amount: z.dmg * 9, type: 'shadow', source: z.src, heavy: true }));
            w.fx.at(14).explosion(z.x, z.y, z.r / 40, 0xa070ff);
            w.shake(4);
            w.sfx('sfx_explosion', { volume: 0.5, rate: 0.8 });
          }
          if (w.build.flags.c_abyss && z.src === Src.Void) {
            const M = this.lvl('meteor') ?? WEAPONS.meteor.levels[0];
            this.meteor(z.x, z.y, M.damage, M.radius * w.stats.areaMul, M.burn, 0.4);
          }
        }
      } else if (z.kind === 'rain') {
        while (z.tickT <= 0 && z.life > 0) {
          z.tickT += z.tick;
          const a = rng.range(0, TAU);
          const d = Math.sqrt(rng.next()) * z.r;
          const px = z.x + Math.cos(a) * d;
          const py = z.y + Math.sin(a) * d;
          w.enemies.forRadius(px, py, 16, (e) => w.damageEnemy(e, { amount: z.dmg, type: 'physical', source: Src.Rain, knock: 20, kx: 0, ky: 1 }));
          w.particles.emit({ tex: this.tex.arrow, x: px, y: py, h: 150, vy: 1000, rot: Math.PI / 2, life: 0.15, s0: 1.1, s1: 1.1, a0: 1, a1: 1, additive: false });
          w.particles.emit({ tex: this.tex.ring, x: px, y: py, flat: true, life: 0.18, s0: 0.03, s1: 0.16, tint: 0xffd890, a0: 0.8 });
        }
      }
      if (z.life <= 0) {
        z.s?.destroy();
        this.zones.splice(i, 1);
      }
    }
  }

  private updateTotems(dt: number): void {
    const w = this.w;
    const L = this.lvl('totem') ?? WEAPONS.totem.levels[0];
    for (let i = this.totems.length - 1; i >= 0; i--) {
      const t = this.totems[i];
      t.life -= dt;
      t.t += dt;
      t.fireT -= dt;
      const fr = this.anims.totem;
      t.s.texture = fr[Math.floor(t.t * 8) % fr.length];
      t.s.position.set(iso.x(t.x, t.y), iso.y(t.x, t.y));
      t.s.zIndex = iso.depth(t.x, t.y);
      t.s.alpha = Math.min(1, t.life * 2, t.t * 5);
      if (t.life <= 0) {
        t.s.destroy();
        this.totems.splice(i, 1);
        continue;
      }
      if (t.fireT > 0) continue;
      const e = w.enemies.nearest(t.x, t.y, L.range * w.stats.areaMul);
      if (!e) {
        t.fireT = 0.2;
        continue;
      }
      t.fireT = L.rate * w.stats.cooldownMul;
      t.shots++;
      if (w.build.flags.c_conduct && w.build.weapons.chain && t.shots % 3 === 0) w.weapons.chainFrom(t.x, t.y, e);
      else {
        w.weapons.boltFx(t.x, t.y, 40, e.x, e.y, 8);
        w.damageEnemy(e, { amount: L.damage, type: 'lightning', source: Src.Totem, slow: 0.5, slowDur: 0.3 });
        w.fx.at(8).electric(e.x, e.y);
      }
      w.sfx('sfx_thunder', { volume: 0.18, rate: 1.6, gap: 0.08 });
    }
  }

  // ------------------------------------------------------------ efeitos compartilhados com as habilidades
  frostNova(x: number, y: number, R: number, dmg: number, slow: number, slowDur: number, freeze: number): void {
    const w = this.w;
    w.enemies.forRadius(x, y, R, (e) => {
      w.damageEnemy(e, { amount: dmg, type: 'ice', source: Src.Frost, slow, slowDur });
      if (freeze > 0) w.freezeEnemy(e, freeze);
    });
    w.particles.emit({ tex: this.tex.ice_ring, x, y, flat: true, life: 0.45, s0: 0.1, s1: (R * 2) / 118, a0: 1, a1: 0, tint: 0xd8f4ff });
    const n = Math.round(14 * w.fx.density);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const sa = iso.angle(Math.cos(a), Math.sin(a));
      w.particles.emit({ tex: this.tex.snowflake, x, y, h: 8, vx: Math.cos(sa) * R * 2.2, vy: Math.sin(sa) * R * 1.1, drag: 3, life: 0.6, s0: 1.2, s1: 0.4, vr: rng.range(-4, 4), tint: 0xe8f8ff });
    }
    w.lighting.flash(x, y, 0x80c8ff, R * 2, 0.35, 0.9);
    w.sfx('sfx_glass', { volume: 0.45, rate: 0.75, gap: 0.1 });
  }

  clearTemp(): void {
    for (const z of this.zones) z.s?.destroy();
    this.zones = [];
    for (const f of this.fallers) {
      f.s.destroy();
      f.mark.destroy();
    }
    this.fallers = [];
    this.spikes = [];
  }

  destroy(): void {
    this.clearTemp();
    for (const s of this.daggers) s.destroy();
    for (const p of this.wisps) p.s.destroy();
    for (const m of this.moons) m.s.destroy();
    for (const t of this.totems) t.s.destroy();
    this.aura.destroy();
  }
}
