import type { BossController, Enemy } from './Enemy';
import type { World } from '../world/World';
import { rng } from '../utils/rng';
import { TAU } from '../utils/math';
import { Src } from '../content/types';

/**
 * Batráquio Colossal: salto telegrafado com onda de choque, leque de lava e fase enfurecida.
 * Ciclo: idle → (salto | cuspe) ... Ao perder metade da vida, muda de fase com rugido.
 */
export class ToadBoss implements BossController {
  name = 'Batráquio Colossal';
  private phase = 1;
  private cycle = 0;
  private jumpsLeft = 0;

  constructor(private w: World) {}

  private anim(e: Enemy, base: string, fps = 6, loop = true): void {
    const rage = this.phase === 2;
    const name = base === 'idle' ? (rage ? 'toad_rage' : 'toad_idle') : `toad_${base}`;
    this.w.enemies.setAnim(e, name, loop, fps);
  }

  update(e: Enemy, _dt: number): void {
    const w = this.w;
    const h = w.hero;
    e.mvx = e.mvy = 0;
    if (this.phase === 1 && e.hp < e.maxHp * 0.5) {
      this.phase = 2;
      e.state = 'recover';
      e.st = -0.8;
      e.z = 0;
      w.sfx('sfx_roar', { volume: 0.9 });
      w.shake(6);
      w.announce('O Batráquio se enfurece!');
      w.hazards.ring(e.x, e.y, 0.3, 260, 360, 26, 14, 0xff6030);
      for (let i = 0; i < 4; i++) w.director.spawnNear('frog', e.x, e.y, 140);
      this.anim(e, 'idle');
    }
    const rage = this.phase === 2;
    // pose do quadro de crouch/air/land enfurecida = quadro 1
    const poseFrame = rage ? 1 : 0;
    switch (e.state) {
      case 'move': {
        this.anim(e, 'idle', 5);
        e.facing = 1;
        if (e.st > (rage ? 0.9 : 1.5)) {
          this.cycle++;
          if (this.cycle % 3 === 0) {
            e.state = 'attack';
            e.st = 0;
            e.a4 = 0;
            this.anim(e, 'spit', 6, false);
            w.sfx('sfx_warn', { volume: 0.5 });
            const ang = Math.atan2(h.y - e.y, h.x - e.x);
            w.hazards.cone(e.x, e.y - 20, ang, 260, rage ? 0.75 : 0.6, 0.7, 0, 0xff8040);
            e.a1 = ang;
          } else {
            this.jumpsLeft = rage ? 2 : 1;
            this.startJump(e);
          }
        }
        break;
      }
      case 'windup': {
        e.frame = poseFrame;
        if (e.st > (rage ? 0.5 : 0.7)) {
          e.state = 'air';
          e.st = 0;
          this.anim(e, 'air', 0, false);
          e.frame = poseFrame;
          w.sfx('sfx_wind', { volume: 0.6 });
        }
        break;
      }
      case 'air': {
        const dur = rage ? 0.75 : 0.95;
        const t = Math.min(1, e.st / dur);
        e.x = e.a1 + (e.ax - e.a1) * t;
        e.y = e.a2 + (e.ay - e.a2) * t;
        e.z = Math.sin(t * Math.PI) * 160;
        e.shadow.scale.set(5 * (1 - Math.sin(t * Math.PI) * 0.35), 3 * (1 - Math.sin(t * Math.PI) * 0.35));
        if (t >= 1) {
          e.z = 0;
          e.state = 'recover';
          e.st = 0;
          this.anim(e, 'land', 0, false);
          e.frame = poseFrame;
          w.sfx('sfx_land', { volume: 1 });
          w.shake(8);
          w.hitstop(0.06);
          w.fx.dust(e.x, e.y + 20, 14);
          w.fx.smokeBurst(e.x, e.y + 20, 8, 2);
          w.hazards.ring(e.x, e.y, 0, 280, 400, 24, rage ? 14 : 12, 0xffa060);
          if (rage) w.hazards.ring(e.x, e.y, 0.55, 240, 360, 24, 12, 0xff6030);
          w.enemies.forRadius(e.x, e.y, 90, (o) => {
            if (o !== e) w.damageEnemy(o, { amount: 999, type: 'physical', source: Src.Pulse }, true);
          });
        }
        break;
      }
      case 'recover': {
        e.frame = poseFrame;
        if (e.st > 0.55) {
          if (this.jumpsLeft > 0) this.startJump(e);
          else {
            e.state = 'move';
            e.st = 0;
            e.shadow.scale.set(5, 3);
          }
        }
        break;
      }
      case 'attack': {
        // cuspe: duas (ou três) ondas de leque de lava
        const waves = rage ? 3 : 2;
        const gap = 0.45;
        if (e.st > 0.7 + e.a4 * gap && e.a4 < waves) {
          const ang = e.a4 === 0 ? e.a1 : Math.atan2(h.y - e.y, h.x - e.x);
          w.projectiles.fan('lava', e.x, e.y - 22, ang + (e.a4 % 2 ? 0.08 : 0), rage ? 9 : 7, rage ? 1.5 : 1.2, 160, 10);
          w.sfx('sfx_fire', { volume: 0.8 });
          w.fx.fire(e.x, e.y - 20, 8, 20);
          e.a4++;
        }
        if (e.st > 0.7 + waves * gap + 0.4) {
          e.state = 'move';
          e.st = 0;
        }
        break;
      }
      default:
        e.state = 'move';
    }
  }

  private startJump(e: Enemy): void {
    const w = this.w;
    const h = w.hero;
    this.jumpsLeft--;
    e.state = 'windup';
    e.st = 0;
    this.anim(e, 'crouch', 0, false);
    e.frame = this.phase === 2 ? 1 : 0;
    let tx = h.x + h.vx * 0.5;
    let ty = h.y + h.vy * 0.5;
    if (!w.arena.isWalkable(tx, ty, 40)) {
      tx = h.x;
      ty = h.y;
    }
    e.a1 = e.x;
    e.a2 = e.y;
    e.ax = tx;
    e.ay = ty;
    const delay = (this.phase === 2 ? 0.5 + 0.75 : 0.7 + 0.95) - 0.05;
    w.hazards.circle(tx, ty, 84, delay, 18, 0xff5030);
    w.sfx('sfx_warn', { volume: 0.5 });
  }

  onDeath(e: Enemy): void {
    this.w.fx.explosion(e.x, e.y - 40, 2.4);
    this.w.shake(10);
  }
}

/**
 * Coração do Véu: três fases curtas e legíveis.
 * I — arcos de cristal em espiral com aberturas; II — raízes de coral telegrafadas que
 * fecham caminhos por instantes; III — pulsos expansivos com uma abertura segura sinalizada.
 */
export class HeartBoss implements BossController {
  name = 'Coração do Véu';
  phase = 0;
  private spin = 0;
  private patternT = 0;
  private sub = 0;

  constructor(private w: World) {}

  update(e: Enemy, dt: number): void {
    const w = this.w;
    const h = w.hero;
    e.mvx = e.mvy = 0;
    e.kx = e.ky = 0;
    e.facing = 1;
    const target = e.hp > e.maxHp * 0.66 ? 0 : e.hp > e.maxHp * 0.33 ? 1 : 2;
    if (target !== this.phase) {
      this.phase = target;
      this.patternT = -1.6;
      this.sub = 0;
      w.enemies.setAnim(e, `heart_flare${this.phase}`, false, 4);
      w.sfx('sfx_roar', { volume: 0.9, rate: 1.3 });
      w.shake(6);
      w.hazards.ring(e.x, e.y, 0.2, 280, 380, 26, 12, [0x60e0ff, 0xb070ff, 0xff7040][this.phase]);
      w.announce(['', 'O Coração racha: raízes de coral!', 'Último pulso do Véu!'][this.phase]);
      w.lighting.ambient = [[0.72, 0.72, 0.86], [0.76, 0.64, 0.86], [0.86, 0.62, 0.62]][this.phase] as [number, number, number];
      for (let i = 0; i < 6; i++) w.director.spawnNear(this.phase === 2 ? 'shell' : 'spider', e.x, e.y + 120, 160);
      return;
    }
    if (e.anim.startsWith('heart_flare') && e.t > 0.8) w.enemies.setAnim(e, `heart_p${this.phase}`, true, 6);
    this.patternT += dt;
    if (this.patternT < 0) return;
    const ox = e.x;
    const oy = e.y - 10;
    if (this.phase === 0) {
      // espiral de cristais com 4 braços e pausas para respirar
      this.spin += dt * 1.1;
      const cyc = this.patternT % 7;
      if (cyc < 4.5 && this.patternT % 0.16 < dt) {
        for (let k = 0; k < 4; k++) w.projectiles.enemyFire('crystal', ox, oy, this.spin + (k / 4) * TAU, 120, 11, 5);
        w.sfx('sfx_glass', { volume: 0.15, gap: 0.1 });
      }
      if (cyc >= 4.5 && cyc < 4.5 + dt) {
        const a = Math.atan2(h.y - oy, h.x - ox);
        const hz = w.hazards.cone(ox, oy, a, 300, 0.4, 0.9, 0, 0x60e0ff);
        if (hz) hz.onResolve = () => w.projectiles.fan('crystal', ox, oy, a, 9, 0.7, 210, 12);
      }
    } else if (this.phase === 1) {
      // raízes: linhas avisadas que permanecem perigosas por 2 s (fecham rotas temporariamente)
      if (this.patternT > 2.6) {
        this.patternT = 0;
        this.sub++;
        const toward = Math.atan2(h.y - oy, h.x - ox);
        const n = 5;
        for (let i = 0; i < n; i++) {
          const a = this.sub % 2 ? toward + (i - 2) * 0.32 : (i / n) * TAU + this.sub * 0.4;
          const hz = w.hazards.line(ox, oy, a, 380, 30, 1.0, 16, 0xff6a50);
          if (hz) {
            hz.linger = 2.0;
            hz.onResolve = () => {
              for (let k = 1; k < 8; k++) w.fx.shatter(ox + Math.cos(a) * k * 48, oy + Math.sin(a) * k * 48, 1, true);
            };
          }
        }
        w.sfx('sfx_warn', { volume: 0.5 });
      }
      if (this.patternT % 1.3 < dt) w.projectiles.radial('crystal', ox, oy, 12, 90, 10, rng.range(0, 1));
    } else {
      // pulsos com abertura segura (o aviso mostra onde está o vão)
      if (this.patternT > 2.2) {
        this.patternT = 0;
        this.sub++;
        const gapAng = Math.atan2(h.y - oy, h.x - ox) + rng.range(-1.2, 1.2);
        w.hazards.ring(ox, oy, 0.9, 210, 460, 26, 16, 0xff8040, 0.9, gapAng);
        w.particles.emit({ tex: w.fx.streak, x: ox + Math.cos(gapAng) * 90, y: oy + Math.sin(gapAng) * 90, rot: gapAng, life: 0.9, s0: 2.5, s1: 2.5, a0: 1, a1: 0.2, tint: 0x80ffa0 });
        w.sfx('sfx_warn', { volume: 0.5 });
        if (this.sub % 2 === 0) w.projectiles.radial('lava', ox, oy, 16, 140, 12, this.sub * 0.2);
      }
    }
  }

  onDeath(e: Enemy): void {
    const w = this.w;
    for (let i = 0; i < 6; i++) w.fx.explosion(e.x + rng.range(-60, 60), e.y + rng.range(-50, 50), 1.5 + rng.range(0, 1), 0xffc070);
    w.fx.anchorBurst(e.x, e.y);
    w.shake(12);
  }
}
