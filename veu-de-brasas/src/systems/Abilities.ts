import { Sprite } from 'pixi.js';
import { heroById, type HeroDef } from '../content/heroes';
import { WEAPONS } from '../content/weapons';
import { Src } from '../content/types';
import type { World } from '../world/World';
import { rng } from '../utils/rng';
import { TAU } from '../utils/math';

/**
 * Habilidade ativa (Q, custa energia) e Suprema (R, carregada por abates) de cada herói.
 * A suprema enche com abates, elites e dano a chefes; ao ativar dispara um evento marcante.
 */
export class Abilities {
  readonly def: HeroDef;
  cd = 0;
  ult = 0;
  ultT = -1;
  private ultTick = 0;
  furyT = 0;
  slamT = -1;
  private aura: Sprite;

  constructor(private w: World) {
    this.def = heroById(w.build.hero);
    this.aura = new Sprite(w.assets.tex('fx', 'glow'));
    this.aura.anchor.set(0.5);
    this.aura.blendMode = 'add';
    this.aura.tint = 0xff4040;
    this.aura.visible = false;
    w.layers.groundFx.addChild(this.aura);
  }

  get cost(): number {
    return this.def.activeCost * this.w.stats.pulseCostMul;
  }

  get cdMax(): number {
    return this.def.activeCd * this.w.stats.cooldownMul;
  }

  get ultReady(): boolean {
    return this.ult >= 100;
  }

  /** força do efeito acompanha o nível da partida */
  private power(base: number, perLevel: number): number {
    return base + perLevel * this.w.level;
  }

  tryActive(): boolean {
    const w = this.w;
    const h = w.hero;
    if (this.cd > 0 || h.energy < this.cost || !h.alive || this.slamT >= 0) return false;
    let ok = true;
    switch (this.def.active) {
      case 'pulse':
        ok = w.weapons.pulse();
        break;
      case 'nova': {
        const R = 170 * w.stats.areaMul;
        w.weapons.extra.frostNova(h.x, h.y, R, this.power(24, 3), 0.4, 2.5, 2 * w.stats.durationMul);
        w.hitstop(0.04);
        w.shake(3);
        break;
      }
      case 'slam':
        this.slamT = 0;
        h.invuln = Math.max(h.invuln, 0.5);
        w.sfx('sfx_dash', { volume: 0.7, rate: 0.7 });
        break;
      case 'swarm':
        w.weapons.extra.spawnWisps(8, 8 * w.stats.durationMul, true);
        w.fx.at(16).explosion(h.x, h.y, 0.8, 0xa070ff);
        w.sfx('sfx_pulse', { volume: 0.6, rate: 1.3 });
        break;
    }
    if (!ok) return false;
    h.energy -= this.cost;
    this.cd = this.cdMax;
    return true;
  }

  tryUlt(): boolean {
    const w = this.w;
    if (!this.ultReady || this.ultT >= 0 || !w.hero.alive) return false;
    this.ult = 0;
    this.ultT = 0;
    this.ultTick = 0;
    w.announce(this.def.ultName + '!');
    w.sfx('sfx_legendary', { volume: 0.8 });
    w.shake(5);
    w.hitstop(0.08);
    w.fx.anchorBurst(w.hero.x, w.hero.y);
    if (this.def.ult === 'fury') this.furyT = 6 * w.stats.durationMul;
    if (this.def.ult === 'eclipse') {
      const R = 230 * w.stats.areaMul;
      w.weapons.extra.spawnVoid(w.hero.x, w.hero.y, 0, 0, R, 3.4 * w.stats.durationMul, this.power(10, 1), 260, true);
    }
    return true;
  }

  addCharge(n: number): void {
    if (this.ultT >= 0) return;
    const was = this.ultReady;
    this.ult = Math.min(100, this.ult + n);
    if (!was && this.ultReady) {
      this.w.hint(`${this.def.ultName} pronta! R / ★ para liberar`);
      this.w.sfx('sfx_rare', { volume: 0.6 });
    }
  }

  update(dt: number): void {
    const w = this.w;
    const h = w.hero;
    this.cd -= dt;
    this.addCharge(dt * 0.45);
    // Impacto Sísmico: salto curto e aterrissagem pesada
    if (this.slamT >= 0) {
      this.slamT += dt;
      const T = 0.38;
      const k = Math.min(1, this.slamT / T);
      h.z = Math.sin(k * Math.PI) * 46;
      if (k >= 1) {
        this.slamT = -1;
        h.z = 0;
        const R = 135 * w.stats.areaMul;
        w.enemies.forRadius(h.x, h.y, R, (e) => {
          const a = Math.atan2(e.y - h.y, e.x - h.x);
          w.damageEnemy(e, { amount: this.power(38, 4), type: 'physical', source: Src.Active, knock: 520, kx: Math.cos(a), ky: Math.sin(a), heavy: true });
          w.freezeEnemy(e, 1.2, true);
        });
        w.particles.emit({ tex: w.assets.tex('fx', 'crack'), x: h.x, y: h.y, flat: true, life: 1.4, s0: (R * 2) / 96, s1: (R * 2) / 96, a0: 0.9, a1: 0, additive: false });
        w.particles.emit({ tex: w.fx.ringThick, x: h.x, y: h.y, flat: true, life: 0.35, s0: 0.2, s1: (R * 2) / 96, tint: 0xffd090 });
        w.fx.smokeBurst(h.x, h.y, 10, 1.4);
        w.shake(8);
        w.hitstop(0.07);
        w.sfx('sfx_explosion', { volume: 0.8, rate: 0.7 });
      }
    }
    if (this.furyT > 0) {
      this.furyT -= dt;
      this.aura.visible = true;
      this.aura.position.set(h.x, h.y);
      this.aura.scale.set(1.6 + Math.sin(w.time * 10) * 0.1);
      this.aura.alpha = 0.35 * Math.min(1, this.furyT);
      if (rng.chance(dt * 25 * w.fx.density)) w.fx.at(16).fire(h.x, h.y, 1, 10);
    } else this.aura.visible = false;
    if (this.ultT < 0) return;
    this.ultT += dt;
    this.ultTick -= dt;
    const R = w.viewRadius() * 0.85;
    switch (this.def.ult) {
      case 'solarRain':
        if (this.ultTick <= 0) {
          this.ultTick = 0.07;
          const e = w.enemies.nearest(h.x + rng.range(-R, R), h.y + rng.range(-R, R), R * 0.7);
          const a = rng.range(0, TAU);
          const d = rng.range(30, R);
          const x = e ? e.x : h.x + Math.cos(a) * d;
          const y = e ? e.y : h.y + Math.sin(a) * d;
          w.weapons.extra.meteor(x, y, this.power(45, 4), 38 * w.stats.areaMul, 6, 0.28, false, true);
        }
        if (this.ultT > 3) this.ultT = -1;
        break;
      case 'arcaneStorm':
        if (this.ultTick <= 0) {
          this.ultTick = 0.06;
          const e = w.enemies.nearest(h.x + rng.range(-R, R), h.y + rng.range(-R, R), R * 0.7);
          if (e) {
            w.weapons.boltFx(e.x, e.y, 220, e.x, e.y, 6);
            w.enemies.forRadius(e.x, e.y, 26, (o) => w.damageEnemy(o, { amount: this.power(34, 3), type: 'lightning', source: Src.Ult, slow: 0.4, slowDur: 0.6 }));
            w.fx.at(8).electric(e.x, e.y);
            w.lighting.flash(e.x, e.y, 0x90b0ff, 90, 0.15, 1);
            w.sfx('sfx_thunder', { volume: 0.25, gap: 0.05 });
          }
        }
        if (this.ultT > 4) this.ultT = -1;
        break;
      case 'fury':
        if (this.furyT <= 0) this.ultT = -1;
        break;
      case 'eclipse':
        if (this.ultT > 3.5) this.ultT = -1;
        break;
    }
  }

  /** multiplicadores temporários */
  get mightMul(): number {
    return this.furyT > 0 ? 1.6 : 1;
  }

  get speedMul(): number {
    return this.furyT > 0 ? 1.25 : 1;
  }

  destroy(): void {
    this.aura.destroy();
  }
}

/** usado na seleção de heróis (texto das armas iniciais) */
export function startWeaponNames(h: HeroDef): string {
  return h.start.map((id) => WEAPONS[id].name).join(' + ');
}
