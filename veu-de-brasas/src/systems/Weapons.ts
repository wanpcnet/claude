import { Container, Sprite, Texture } from 'pixi.js';
import { WEAPONS, type WeaponId, type WeaponLevel } from '../content/weapons';
import { Src } from '../content/types';
import type { Enemy } from '../entities/Enemy';
import type { World } from '../world/World';
import { Pool } from '../utils/Pool';
import { rng } from '../utils/rng';
import { TAU } from '../utils/math';
import { iso } from '../render/Iso';
import { WeaponsExtra } from './WeaponsExtra';

const CORE = new Set<WeaponId>(['arrow', 'crown', 'lance', 'chain', 'lotus', 'wind']);

interface Bolt {
  active: boolean;
  s: Sprite;
  life: number;
}

const RING_R = 55; // raio do aro na textura crown_ring (128 px)

/** As seis armas, a Coroa de Brasas (órbita + Pulso Q) e os três combos. */
export class Weapons {
  private timers: Partial<Record<WeaponId, number>> = {};
  readonly crownGround = new Container();
  private ring: Sprite;
  private ring2: Sprite;
  private pulseRing: Sprite;
  private glow: Sprite;
  private flames: Sprite[] = [];
  private flames2: Sprite[] = [];
  private runes: Sprite[] = [];
  private rot = 0;
  private flameFrames: Texture[];
  private bolts: Pool<Bolt>;
  private boltFrames: Texture[];
  private boltLayer = new Container();
  pulseT = -1;
  pulseCd = 0;
  private pulseId = 0;
  private pulseMax = 150;
  private phoenixBudget = 8;
  private crownLight: ReturnType<World['lighting']['flash']> = null;
  crownTint = 0xffffff;
  readonly extra: WeaponsExtra;

  constructor(private w: World) {
    const a = w.assets;
    this.extra = new WeaponsExtra(w);
    this.ring = new Sprite(a.tex('fx', 'crown_ring'));
    this.ring2 = new Sprite(a.tex('fx', 'crown_ring'));
    this.pulseRing = new Sprite(a.tex('fx', 'ring_thick'));
    this.glow = new Sprite(a.tex('fx', 'glow'));
    for (const s of [this.ring, this.ring2, this.pulseRing, this.glow]) s.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.tint = 0xff8a30;
    this.pulseRing.blendMode = 'add';
    this.pulseRing.tint = 0xff9040;
    this.pulseRing.visible = false;
    this.ring2.visible = false;
    this.crownGround.addChild(this.glow, this.ring, this.ring2);
    w.layers.flatFx.addChild(this.pulseRing);
    this.flameFrames = a.anim('fx', 'flame');
    for (let i = 0; i < 8; i++) {
      const r = new Sprite(a.tex('fx', `rune_${i}`));
      r.anchor.set(0.5);
      r.blendMode = 'add';
      w.layers.fxAdd.addChild(r);
      this.runes.push(r);
    }
    this.boltFrames = a.anim('fx', 'bolt');
    w.layers.fxAdd.addChild(this.boltLayer);
    this.bolts = new Pool<Bolt>(() => {
      const s = new Sprite(this.boltFrames[0]);
      s.anchor.set(0, 0.5);
      s.visible = false;
      this.boltLayer.addChild(s);
      return { active: false, s, life: 0 };
    }, 16, 120);
  }

  applySkin(tint: number, flame: string): void {
    this.crownTint = tint;
    this.ring.tint = this.ring2.tint = tint;
    this.flameFrames = this.w.assets.anim('fx', flame || 'flame');
    for (let i = 0; i < this.runes.length; i++) this.runes[i].texture = this.w.assets.tex('fx', (tint === 0xc8a0ff ? 'rune_v_' : tint === 0x9ad8ff ? 'rune_c_' : 'rune_') + i);
    this.glow.tint = tint === 0x9ad8ff ? 0x60b0ff : tint === 0xc8a0ff ? 0xa060ff : 0xff8a30;
  }

  lvl(id: WeaponId): WeaponLevel | null {
    const l = this.w.build.weapons[id];
    return l ? WEAPONS[id].levels[l - 1] : null;
  }

  private ensureFlames(list: Sprite[], n: number): void {
    while (list.length < n) {
      const s = new Sprite(this.flameFrames[0]);
      s.anchor.set(0.5, 0.85);
      this.w.layers.entities.addChild(s);
      list.push(s);
    }
    for (let i = 0; i < list.length; i++) list[i].visible = i < n;
  }

  update(dt: number): void {
    const w = this.w;
    const h = w.hero;
    const st = w.stats;
    this.phoenixBudget = Math.min(8, this.phoenixBudget + dt * 10);
    for (const id of Object.keys(w.build.weapons) as WeaponId[]) {
      if (id === 'crown') continue;
      const L = this.lvl(id)!;
      this.timers[id] = (this.timers[id] ?? 0.5) - dt;
      if (this.timers[id]! <= 0 && h.alive) {
        const fired = CORE.has(id) ? this.fire(id, L) : this.extra.fire(id, L);
        this.timers[id] = fired ? L.cooldown * st.cooldownMul : 0.15;
      }
    }
    this.updateCrown(dt);
    this.extra.update(dt);
    for (const b of this.bolts.items) {
      if (!b.active) continue;
      b.life -= dt;
      b.s.texture = this.boltFrames[Math.floor(b.life * 40) % this.boltFrames.length];
      b.s.alpha = Math.min(1, b.life * 8);
      if (b.life <= 0) {
        b.s.visible = false;
        this.bolts.release(b);
      }
    }
  }

  /** Mira: manual (mouse) se ativada; senão o inimigo válido mais próximo. */
  private aim(range: number, preferBig: false | 'soft' | 'always' = false): { ang: number; target: Enemy | null } {
    const w = this.w;
    const h = w.hero;
    if (w.game.save.data.settings.manualAim && w.game.input.mouseInside && !w.game.input.usingTouch) {
      const p = w.screenToWorld(w.game.input.mouseX, w.game.input.mouseY);
      return { ang: Math.atan2(p.y - h.y, p.x - h.x), target: null };
    }
    let t = w.enemies.nearest(h.x, h.y, range);
    // prioriza elite/chefe quando não há ameaça colada na heroína
    const big = w.director.target;
    if (preferBig && big && big.alive && big.state !== 'spawn') {
      const db = Math.hypot(big.x - h.x, big.y - h.y);
      const dn = t ? Math.hypot(t.x - h.x, t.y - h.y) : Infinity;
      if (db <= range + big.radius && (preferBig === 'always' || dn > 90)) t = big;
    }
    if (!t) return { ang: Math.atan2(h.aimY, h.aimX), target: null };
    return { ang: Math.atan2(t.y - h.y, t.x - h.x), target: t };
  }

  private fire(id: WeaponId, L: WeaponLevel): boolean {
    const w = this.w;
    const h = w.hero;
    const st = w.stats;
    const ox = h.x;
    const oy = h.y;
    switch (id) {
      case 'arrow': {
        const { ang, target } = this.aim(L.range, 'soft');
        if (!target && !w.game.save.data.settings.manualAim) return false;
        const n = L.count + st.arrowExtra;
        for (let i = 0; i < n; i++) {
          const a = ang + (i - (n - 1) / 2) * 0.14 + rng.range(-0.03, 0.03);
          w.projectiles.fire('arrow', ox, oy, a, L.speed, L.damage, { pierce: L.pierce + st.arrowPierce, r: 4, life: L.range / L.speed + 0.1, src: Src.Arrow });
        }
        h.aimX = Math.cos(ang);
        h.aimY = Math.sin(ang);
        h.attackStart();
        h.shootT = 0.3;
        w.sfx('sfx_arrow', { volume: 0.35, gap: 0.05 });
        return true;
      }
      case 'lance': {
        const { ang, target } = this.aim(440, 'always');
        if (!target) return false;
        const nl = L.count + st.amount;
        for (let i = 0; i < nl; i++) {
          const a = ang + (i - (nl - 1) / 2) * 0.18;
          w.projectiles.fire('lance', ox, oy, a, L.speed, L.damage, { pierce: 999, r: L.width / 2, life: 1.3, src: Src.Lance, type: 'fire', burn: L.burn });
        }
        w.sfx('sfx_lance', { volume: 0.6 });
        w.lighting.flash(ox, oy, 0xff9030, 120, 0.25, 0.8);
        return true;
      }
      case 'chain': {
        const first = w.enemies.nearest(h.x, h.y, 280);
        if (!first) return false;
        const jumps = L.jumps + (w.build.flags.l_storm ? 3 : 0);
        this.chain(ox, oy, first, L, jumps, true);
        w.sfx('sfx_thunder', { volume: 0.5, gap: 0.08 });
        return true;
      }
      case 'lotus': {
        // escolhe, entre alguns candidatos, o inimigo com mais vizinhos (aglomeração)
        let best: Enemy | null = null;
        let bestN = -1;
        const big = w.director.target;
        if (big && big.alive && big.state !== 'spawn' && Math.hypot(big.x - h.x, big.y - h.y) < 320) {
          best = big;
          bestN = 99;
        }
        for (let k = 0; k < 5 && bestN < 99; k++) {
          const c = w.enemies.nearest(h.x + rng.range(-160, 160), h.y + rng.range(-120, 120), 200);
          if (!c) continue;
          let n = 0;
          w.enemies.forRadius(c.x, c.y, 60, () => n++);
          if (n > bestN) {
            bestN = n;
            best = c;
          }
        }
        if (!best) return false;
        const dx = best.x - ox;
        const dy = best.y - oy;
        const d = Math.hypot(dx, dy);
        w.projectiles.fire('seed', ox, oy, Math.atan2(dy, dx), 380, 0, { life: d / 380, src: Src.Lotus, type: 'crystal' });
        w.sfx('sfx_glass', { volume: 0.25, rate: 1.4, gap: 0.1 });
        return true;
      }
      case 'wind': {
        const { ang, target } = this.aim(220);
        if (!target) return false;
        this.gust(ang, L);
        if (L.both) this.gust(ang + Math.PI, L);
        return true;
      }
      default:
        return false;
    }
  }

  private gust(ang: number, L: WeaponLevel): void {
    const w = this.w;
    const h = w.hero;
    const tornado = !!w.build.flags.c_tornado;
    const R = L.radius * w.stats.areaMul;
    const knock = L.knock * (tornado ? 1.5 : 1);
    w.enemies.forRadius(h.x, h.y, R, (e) => {
      let da = Math.atan2(e.y - h.y, e.x - h.x) - ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > L.arc / 2) return;
      const ea = Math.atan2(e.y - h.y, e.x - h.x);
      w.damageEnemy(e, { amount: L.damage, type: 'wind', source: Src.Wind, knock, kx: Math.cos(ea), ky: Math.sin(ea), burn: tornado ? 4 : 0, burnDur: tornado ? 2 : 0 });
    });
    const frames = w.assets.anim('fx', 'wind');
    const sang = iso.angle(Math.cos(ang), Math.sin(ang));
    w.particles.emit({ tex: frames[0], frames, x: h.x + Math.cos(ang) * 8, y: h.y + Math.sin(ang) * 8, h: 12, rot: sang, life: 0.32, s0: (R / 60) * 0.9, s1: (R / 60) * 1.15, a0: 0.9, a1: 0.1, tint: tornado ? 0xffb070 : 0xffffff, additive: !tornado ? false : true });
    for (let i = 0; i < 6; i++) {
      const a = ang + rng.range(-L.arc / 2, L.arc / 2);
      const sa = iso.angle(Math.cos(a), Math.sin(a));
      w.particles.emit({ tex: w.fx.streak, x: h.x, y: h.y, h: 12, vx: Math.cos(sa) * 320, vy: Math.sin(sa) * 320, life: 0.25, s0: 0.8, s1: 0.4, tint: tornado ? 0xffa050 : 0xe8e0d0, stretch: true, drag: 4 });
    }
    if (tornado) {
      for (let i = 0; i < 7; i++) {
        const a = ang + (i - 3) * (L.arc / 7);
        w.projectiles.fire('ember', h.x, h.y, a, 150, 9, { pierce: 2, r: 6, life: 1.1, src: Src.Ember, type: 'fire', burn: 5, spin: 2.6 * (i % 2 ? 1 : -1) });
      }
      w.fx.at(10).fire(h.x + Math.cos(ang) * 30, h.y + Math.sin(ang) * 30, 6, 20);
      w.sfx('sfx_fire', { volume: 0.4, gap: 0.1 });
    }
    w.sfx('sfx_wind', { volume: 0.5, gap: 0.1 });
  }

  private chain(ox: number, oy: number, first: Enemy, L: WeaponLevel, jumps: number, root: boolean): void {
    const w = this.w;
    const hit = new Set<number>();
    let px = ox;
    let py = oy;
    let pz = root ? 14 : 8;
    let cur: Enemy | null = first;
    let dmg = L.damage;
    let shards = 0;
    const thunder = !!w.build.flags.c_thunder;
    for (let i = 0; cur && i <= jumps; i++) {
      hit.add(cur.id);
      this.bolt(px, py, pz, cur.x, cur.y, 8);
      w.damageEnemy(cur, { amount: dmg, type: 'lightning', source: Src.Chain, slow: 0.4, slowDur: 0.35 });
      w.fx.at(8).electric(cur.x, cur.y);
      w.lighting.flash(cur.x, cur.y, 0x80b8ff, 60, 0.15, 0.8);
      if (thunder && shards < 6) {
        const o = w.enemies.nearest(cur.x, cur.y, 160, hit);
        if (o) {
          shards++;
          w.projectiles.fire('shard', cur.x, cur.y, Math.atan2(o.y - cur.y, o.x - cur.x), 360, L.damage * 0.5, { r: 4, life: 0.6, src: Src.Shard, type: 'crystal', z: 8 });
        }
      }
      if (root && i === 0 && w.build.flags.l_storm) {
        const fork = w.enemies.nearest(cur.x, cur.y, L.range * w.stats.areaMul, hit);
        if (fork) this.chain(cur.x, cur.y, fork, L, Math.floor(jumps / 2), false);
      }
      px = cur.x;
      py = cur.y;
      pz = 8;
      dmg *= L.falloff;
      cur = w.enemies.nearest(cur.x, cur.y, L.range * w.stats.areaMul, hit);
    }
  }

  /** Corrente de Tempestade completa a partir de um ponto (totens condutores) */
  chainFrom(x: number, y: number, first: Enemy): void {
    const L = this.lvl('chain');
    if (L) this.chain(x, y, first, L, L.jumps, false);
  }

  boltFx(wax: number, way: number, az: number, wbx: number, wby: number, bz: number): void {
    this.bolt(wax, way, az, wbx, wby, bz);
  }

  /** raio entre dois pontos do mundo (com alturas), desenhado no espaço da tela */
  private bolt(wax: number, way: number, az: number, wbx: number, wby: number, bz: number): void {
    const b = this.bolts.acquire();
    if (!b) return;
    const ax = iso.x(wax, way);
    const ay = iso.y(wax, way) - az;
    const bx = iso.x(wbx, wby);
    const by = iso.y(wbx, wby) - bz;
    const d = Math.hypot(bx - ax, by - ay);
    b.life = 0.2;
    b.s.visible = true;
    b.s.position.set(ax, ay);
    b.s.rotation = Math.atan2(by - ay, bx - ax);
    b.s.scale.set(d / 64, 0.8 + Math.min(0.6, d / 300));
    b.s.tint = 0xffffff;
  }

  bloomLotus(x: number, y: number): void {
    const w = this.w;
    const L = this.lvl('lotus');
    if (!L) return;
    const R = L.radius * w.stats.areaMul;
    w.enemies.forRadius(x, y, R, (e) => {
      const a = Math.atan2(e.y - y, e.x - x);
      w.damageEnemy(e, { amount: L.damage, type: 'crystal', source: Src.Lotus, knock: 90, kx: Math.cos(a), ky: Math.sin(a) });
    });
    const off = rng.range(0, TAU);
    for (let i = 0; i < L.shards; i++) {
      const a = off + (i / L.shards) * TAU;
      w.projectiles.fire('shard', x, y, a, 300, L.shardDamage, { r: 4, life: 0.55, src: Src.Shard, type: 'crystal', pierce: 1 });
    }
    const frames = w.assets.anim('fx', 'lotus');
    w.particles.emit({ tex: frames[0], frames, x, y, flat: true, life: 0.4, s0: (R / 36) * 0.85, s1: (R / 36) * 1.4, a0: 1, a1: 0.2 });
    w.particles.emit({ tex: w.fx.ring, x, y, flat: true, life: 0.3, s0: 0.2, s1: (R * 2.8) / 105, tint: 0x9ff4ff });
    w.fx.shatter(x, y, 10);
    w.lighting.flash(x, y, 0x60e0ff, R * 2.2, 0.35, 1);
    w.sfx('sfx_glass', { volume: 0.55, gap: 0.06 });
  }

  phoenixBurst(x: number, y: number, dmg: number): void {
    if (this.phoenixBudget < 1) return;
    this.phoenixBudget -= 1;
    const w = this.w;
    w.enemies.forRadius(x, y, 42, (e) => {
      w.damageEnemy(e, { amount: dmg * 0.6, type: 'fire', source: Src.Phoenix, burn: 4, burnDur: 2 });
    });
    w.fx.at(6).explosion(x, y, 0.8);
    w.sfx('sfx_explosion', { volume: 0.25, gap: 0.08, rate: 1.4 });
  }

  /** Pulso da Coroa (habilidade ativa de Lysa). A energia é cobrada pelo sistema de habilidades. */
  pulse(): boolean {
    const w = this.w;
    const L = this.lvl('crown') ?? WEAPONS.crown.levels[0];
    if (this.pulseT >= 0) return false;
    this.pulseT = 0;
    this.pulseId++;
    this.pulseMax = L.pulseRadius * w.stats.areaMul;
    w.sfx('sfx_pulse', { volume: 0.9 });
    w.shake(4);
    w.hitstop(0.035);
    w.lighting.flash(w.hero.x, w.hero.y, 0xff8030, this.pulseMax * 1.8, 0.6, 1);
    w.fx.fire(w.hero.x, w.hero.y, 10, 24);
    if (w.build.flags.c_dawn) {
      const lanceL = this.lvl('lance');
      const dmg = lanceL ? lanceL.damage : 40;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + this.rot;
        w.projectiles.fire('lance', w.hero.x + Math.cos(a) * 30, w.hero.y + Math.sin(a) * 30, a, 480, dmg, { pierce: 999, r: 7, life: 1.0, src: Src.Lance, type: 'fire', burn: 6 });
      }
      w.sfx('sfx_lance', { volume: 0.7 });
    }
    return true;
  }

  private updateCrown(dt: number): void {
    const w = this.w;
    const h = w.hero;
    const L = this.lvl('crown');
    this.ring.visible = this.glow.visible = !!L;
    if (!L) {
      for (const f of this.flames) f.visible = false;
      for (const r of this.runes) r.visible = false;
      if (this.crownLight) {
        w.lighting.release(this.crownLight);
        this.crownLight = null;
      }
      return;
    }
    const solar = !!w.build.flags.l_solar;
    const R = L.radius * w.stats.areaMul;
    this.rot += dt * (2.4 + L.arcs * 0.15);
    const cx = h.x;
    // a coroa fica no plano do chão (camada isométrica deitada): círculo no mundo
    const cy = h.y;
    const sq = 1;
    // aro e brilho
    const breathe = 1 + Math.sin(this.rot * 2) * 0.02;
    this.ring.position.set(cx, cy);
    this.ring.scale.set((R / RING_R) * breathe, (R / RING_R) * sq * breathe);
    this.ring.rotation = 0;
    this.ring.alpha = 0.92;
    this.glow.position.set(cx, cy);
    this.glow.scale.set((R * 2.6) / 64, (R * 2.6 * sq) / 64);
    this.glow.alpha = 0.32 + Math.sin(this.rot * 3) * 0.05 + (this.pulseT >= 0 ? 0.3 : 0);
    this.ring2.visible = solar;
    if (solar) {
      this.ring2.position.set(cx, cy);
      this.ring2.scale.set((R * 1.35) / RING_R, ((R * 1.35) / RING_R) * sq);
    }
    // chamas em arcos (3 chamas por arco)
    const per = 3;
    const nFl = L.arcs * per;
    this.ensureFlames(this.flames, nFl);
    this.ensureFlames(this.flames2, solar ? nFl : 0);
    const frameI = (k: number) => this.flameFrames[Math.floor(this.rot * 4 + k) % this.flameFrames.length];
    const placeFlames = (list: Sprite[], radius: number, dir: number, scale: number) => {
      for (let i = 0; i < nFl && i < list.length; i++) {
        const arc = Math.floor(i / per);
        const k = i % per;
        const a = dir * this.rot + (arc / L.arcs) * TAU + (k - 1) * 0.2;
        const s = list[i];
        s.texture = frameI(i);
        const fwx = cx + Math.cos(a) * radius;
        const fwy = cy + Math.sin(a) * radius;
        s.position.set(iso.x(fwx, fwy), iso.y(fwx, fwy) - 2);
        s.zIndex = iso.depth(fwx, fwy) + 1;
        const sc = (k === 1 ? 0.95 : 0.7) * scale;
        s.scale.set(sc);
        s.alpha = 0.95;
      }
    };
    placeFlames(this.flames, R, 1, 1);
    if (solar) placeFlames(this.flames2, R * 1.35, -1, 0.8);
    // runas orbitais (quantidade comunica o nível)
    const nR = Math.min(8, 2 + (w.build.weapons.crown ?? 1));
    for (let i = 0; i < this.runes.length; i++) {
      const r = this.runes[i];
      r.visible = i < nR;
      if (!r.visible) continue;
      const a = -this.rot * 0.5 + (i / nR) * TAU;
      const rwx = cx + Math.cos(a) * (R + 12);
      const rwy = cy + Math.sin(a) * (R + 12);
      r.position.set(iso.x(rwx, rwy), iso.y(rwx, rwy) - 10);
      r.alpha = 0.55 + Math.sin(this.rot * 3 + i) * 0.25;
      r.scale.set(0.8);
    }
    if (!this.crownLight) this.crownLight = w.lighting.flash(cx, cy, 0xffa050, 150, Infinity, 1, () => ({ x: w.hero.x, y: w.hero.y }));
    if (this.crownLight) this.crownLight.sprite.scale.set(((R + 110) * 2) / 128);
    // dano em contato com as chamas
    if (h.alive) {
      const burnMul = solar ? 2 : 1;
      const outer = (solar ? R * 1.35 : R) + 14;
      const cd = L.cooldown;
      const now = w.time;
      w.enemies.forRadius(cx, h.y, outer, (e, d2) => {
        if (e.hitCd[Src.Crown] > now - cd) return;
        const d = Math.sqrt(d2);
        if (d < R * 0.35) return;
        let near = false;
        const ea = Math.atan2((e.y - cy) / sq, e.x - cx);
        for (let arc = 0; arc < L.arcs && !near; arc++) {
          for (const [radius, dir] of solar ? [[R, 1], [R * 1.35, -1]] : [[R, 1]]) {
            const a = dir * this.rot + (arc / L.arcs) * TAU;
            let da = ea - a;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) < 0.38 + 10 / radius && Math.abs(d - radius) < 22) near = true;
          }
        }
        if (!near) return;
        e.hitCd[Src.Crown] = now;
        const a = Math.atan2(e.y - h.y, e.x - h.x);
        w.damageEnemy(e, { amount: L.damage, type: 'fire', source: Src.Crown, knock: 28, kx: Math.cos(a), ky: Math.sin(a), burn: L.burn * burnMul, burnDur: 2 });
        w.fx.at(6).hit(e.x, e.y, 0xffa040, 0.6);
      });
    }
    // Pulso expansivo
    if (this.pulseT >= 0) {
      this.pulseT += dt;
      const dur = 0.38;
      const t = Math.min(1, this.pulseT / dur);
      const pr = R + (this.pulseMax - R) * (1 - (1 - t) * (1 - t));
      this.pulseRing.visible = true;
      this.pulseRing.position.set(cx, cy);
      this.pulseRing.scale.set((pr * 2) / 96, ((pr * 2) / 96) * sq);
      this.pulseRing.alpha = 1 - t * 0.8;
      this.ring.scale.set(pr / RING_R, (pr / RING_R) * sq);
      this.ring.alpha = 1 - t * 0.4;
      if (Math.random() < 0.9) {
        const a = rng.range(0, TAU);
        w.fx.fire(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr * sq, 2, 4);
      }
      const id = this.pulseId;
      w.enemies.forRadius(cx, h.y, pr, (e) => {
        if (e.hitCd[Src.Pulse] === id) return;
        e.hitCd[Src.Pulse] = id;
        const a = Math.atan2(e.y - h.y, e.x - h.x);
        w.damageEnemy(e, { amount: L.pulseDamage, type: 'fire', source: Src.Pulse, knock: 420, kx: Math.cos(a), ky: Math.sin(a), burn: L.burn * 1.5, burnDur: 3, heavy: true });
      });
      if (t >= 1) {
        this.pulseT = -1;
        this.pulseRing.visible = false;
      }
    }
  }

  destroy(): void {
    this.extra.destroy();
    for (const s of [...this.flames, ...this.flames2]) s.destroy();
  }
}
