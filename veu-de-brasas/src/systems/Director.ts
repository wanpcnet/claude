import { Sprite } from 'pixi.js';
import type { ActScript, AmbientPhase, Side, Stage, WaveEvent } from '../content/acts';
import type { World } from '../world/World';
import type { Enemy } from '../entities/Enemy';
import { ToadBoss, HeartBoss } from '../entities/Bosses';
import { rng } from '../utils/rng';
import { TAU } from '../utils/math';
import { iso } from '../render/Iso';

const SIDE_ANGLE: Record<Side, number> = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 };

/**
 * Diretor do ato: segue o roteiro (ondas por tempo, população ambiente por fase) e a sequência
 * de objetivos. Escolhe posições de spawn apenas dentro das zonas aprovadas do mapa, fora da
 * tela e longe da heroína (nunca nasce inimigo em cima dela).
 */
export class Director {
  stageIndex = 0;
  stage: Stage;
  kills = 0;
  channel = 0;
  private spawnAcc = 0;
  private waveIdx = 0;
  private hintIdx = 0;
  private relief = 0;
  target: Enemy | null = null;
  bossEnemy: Enemy | null = null;
  finished = false;
  private sigil: Sprite;
  private beam: Sprite;
  private stageT = 0;
  objective = '';
  objectivePoint: { x: number; y: number } | null = null;
  densityMul = 1;

  constructor(private w: World, private act: ActScript) {
    this.stage = act.stages[0];
    this.sigil = new Sprite(w.assets.tex('fx', 'sigil'));
    this.sigil.anchor.set(0.5);
    this.sigil.blendMode = 'add';
    this.sigil.visible = false;
    w.layers.groundFx.addChild(this.sigil);
    this.beam = new Sprite(w.assets.tex('fx', 'beam'));
    this.beam.anchor.set(0.5, 1);
    this.beam.blendMode = 'add';
    this.beam.visible = false;
    w.layers.fxAdd.addChild(this.beam);
    this.enterStage();
  }

  private marker(ch: string): { x: number; y: number } {
    return this.w.arena.markers.get(ch) ?? { x: this.w.hero.x, y: this.w.hero.y - 200 };
  }

  private enterStage(): void {
    const s = this.stage;
    this.stageT = 0;
    this.objective = s.text;
    this.objectivePoint = null;
    this.w.onObjective(s.text);
    if (s.type === 'anchor') {
      const a = this.marker('A');
      this.objectivePoint = { x: a.x, y: a.y + 8 };
      this.sigil.visible = true;
      this.sigil.position.set(a.x, a.y + 8);
      this.sigil.tint = 0xff9a40;
      this.channel = 0;
    } else if (s.type === 'elite') {
      const p = this.marker(s.at);
      this.objectivePoint = p;
      const pos = this.safePoint(p.x, p.y, 120);
      const e = this.w.enemies.spawn(s.enemy, pos.x, pos.y);
      this.target = e;
      this.w.announce(s.text);
      this.w.sfx('sfx_roar', { volume: 0.6, rate: 1.2 });
      this.w.fx.smokeBurst(pos.x, pos.y, 8, 1.5);
    } else if (s.type === 'boss') {
      const p = this.marker(s.at);
      this.objectivePoint = p;
      this.w.startBossIntro(s.boss, () => this.spawnBoss(s.boss, p.x, p.y));
    }
  }

  private spawnBoss(kind: 'toad' | 'heart', x: number, y: number): void {
    const w = this.w;
    const e = w.enemies.pool.acquire();
    if (!e) return;
    const ctrl = kind === 'toad' ? new ToadBoss(w) : new HeartBoss(w);
    e.boss = ctrl;
    e.def = {
      id: kind, name: ctrl.name, ai: 'swarm', hp: kind === 'toad' ? 6000 : 14000, speed: 0, damage: 14, radius: kind === 'toad' ? 52 : 58, mass: 999, armor: 0,
      xp: 0, anim: kind, walkAnim: kind === 'toad' ? 'toad_idle' : 'heart_p0', fps: 5, deathTint: 0xffc070, anchorY: kind === 'toad' ? 0.82 : 0.55,
    };
    const hpMul = w.modTide ? 1.1 : 1;
    e.maxHp = e.hp = Math.round(e.def.hp * hpMul);
    e.armorHp = 0;
    e.x = x;
    e.y = y;
    e.z = 0;
    e.kx = e.ky = e.mvx = e.mvy = 0;
    e.radius = e.def.radius;
    e.mass = 999;
    e.state = 'spawn';
    e.st = 0;
    e.flashT = e.burnT = e.slowT = e.flashCd = 0;
    e.slowMul = 1;
    e.hitCd.fill(-10);
    e.anim = '';
    e.scale = kind === 'heart' ? 1.35 : 1.1;
    e.facing = 1;
    e.noXp = false;
    e.isSummon = false;
    e.bossDrops = 0;
    w.enemies.setAnim(e, e.def.walkAnim, true, 5);
    e.sprite.anchor.set(0.5, e.def.anchorY ?? 0.8);
    e.sprite.visible = true;
    e.sprite.alpha = 1;
    e.shadow.visible = true;
    e.shadow.scale.set((e.radius * 2.6) / 32, (e.radius * 2.6) / 14);
    this.bossEnemy = e;
    this.target = e;
    w.setBoss(e);
  }

  /** ponto caminhável próximo a (x,y) */
  private safePoint(x: number, y: number, r: number): { x: number; y: number } {
    for (let i = 0; i < 20; i++) {
      const a = rng.range(0, TAU);
      const d = rng.range(0, r);
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      if (this.w.arena.isWalkable(px, py, 12)) return { x: px, y: py };
    }
    return { x, y };
  }

  spawnNear(type: string, x: number, y: number, r: number): void {
    const p = this.safePoint(x, y, r);
    const hd = Math.hypot(p.x - this.w.hero.x, p.y - this.w.hero.y);
    if (hd < 60) return;
    this.w.enemies.spawn(type, p.x, p.y, { summon: true });
  }

  /**
   * Escolhe posição fora da tela, na direção pedida, dentro das zonas autoradas e caminhável.
   * Distância mínima da heroína garante que ninguém nasce sobre ela.
   */
  spawnPoint(side: Side | 'around', spread = 0.9): { x: number; y: number } | null {
    const w = this.w;
    const h = w.hero;
    const view = w.viewRadius();
    const zones = w.arena.map.spawnZones;
    for (let i = 0; i < 14; i++) {
      const base = side === 'around' ? rng.range(0, TAU) : SIDE_ANGLE[side] + rng.range(-spread, spread);
      const d = view + rng.range(30, 140);
      const x = h.x + Math.cos(base) * d;
      const y = h.y + Math.sin(base) * d * 0.8;
      if (!w.arena.isWalkable(x, y, 10)) continue;
      let inZone = false;
      for (const z of Object.values(zones)) if (w.arena.zoneContains(z, x, y)) inZone = true;
      if (!inZone) continue;
      if (w.arena.pathDist(x, y) > 120) continue; // precisa ter caminho até a heroína
      return { x, y };
    }
    return null;
  }

  private wave(ev: WaveEvent): void {
    const w = this.w;
    const count = Math.round(ev.count * this.densityMul * w.densityMul);
    if (ev.formation === 'ring') {
      const h = w.hero;
      const view = w.viewRadius() + 40;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + rng.range(-0.05, 0.05);
        const x = h.x + Math.cos(a) * view;
        const y = h.y + Math.sin(a) * view * 0.8;
        if (w.arena.isWalkable(x, y, 8) && w.arena.pathDist(x, y) < 120) w.enemies.spawn(ev.enemy, x, y);
      }
    } else {
      const anchor = this.spawnPoint(ev.side, ev.formation === 'cluster' ? 0.3 : 0.6);
      if (!anchor) return;
      const ang = Math.atan2(anchor.y - w.hero.y, anchor.x - w.hero.x);
      for (let i = 0; i < count; i++) {
        let x: number;
        let y: number;
        if (ev.formation === 'arc') {
          const a = ang + (i / Math.max(1, count - 1) - 0.5) * 1.6;
          const d = Math.hypot(anchor.x - w.hero.x, anchor.y - w.hero.y) + rng.range(-20, 30);
          x = w.hero.x + Math.cos(a) * d;
          y = w.hero.y + Math.sin(a) * d * 0.8;
        } else {
          x = anchor.x + rng.range(-40, 40);
          y = anchor.y + rng.range(-30, 30);
        }
        if (w.arena.isWalkable(x, y, 8)) w.enemies.spawn(ev.enemy, x, y);
      }
    }
    this.relief = 8;
  }

  private ambient(): AmbientPhase {
    const s = this.stage;
    if (s.type === 'boss') return this.act.bossAmbient;
    if (s.type === 'anchor' && this.inChannelZone()) return this.act.channelAmbient;
    if (s.type === 'elite') return this.act.bossAmbient;
    let cur = this.act.ambient[0];
    for (const p of this.act.ambient) if (this.w.time >= p.from) cur = p;
    return cur;
  }

  private inChannelZone(): boolean {
    const a = this.marker('A');
    return Math.hypot(this.w.hero.x - a.x, this.w.hero.y - (a.y + 8)) < 70;
  }

  onKill(e: Enemy): void {
    if (!e.isSummon) this.kills++;
    if (e === this.target && this.stage.type === 'elite') {
      this.target = null;
      this.w.pickups.drop('chest', e.x, e.y);
      this.w.pickups.drop('heal', e.x + 20, e.y);
      this.w.pickups.drop('essence', e.x - 20, e.y);
      for (let i = 0; i < 6; i++) this.w.pickups.drop('coin', e.x, e.y, 2);
      this.next();
    }
    if (e === this.bossEnemy) {
      this.bossEnemy = null;
      this.target = null;
      for (let i = 0; i < 12; i++) this.w.pickups.drop('coin', e.x + rng.range(-40, 40), e.y + rng.range(-30, 30), 3);
      this.w.pickups.drop('chest', e.x, e.y + 30);
      this.w.setBoss(null);
      this.next();
    }
  }

  private next(): void {
    this.stageIndex++;
    if (this.stageIndex >= this.act.stages.length) {
      this.finished = true;
      this.objective = '';
      this.objectivePoint = null;
      this.sigil.visible = false;
      this.beam.visible = false;
      this.w.onActComplete();
      return;
    }
    this.stage = this.act.stages[this.stageIndex];
    this.enterStage();
  }

  update(dt: number): void {
    const w = this.w;
    if (this.finished) return;
    this.stageT += dt;
    // dicas do tutorial orgânico
    const hints = this.act.hints;
    if (this.hintIdx < hints.length && w.time >= hints[this.hintIdx].t) {
      w.hint(hints[this.hintIdx].text);
      this.hintIdx++;
    }
    // ondas roteirizadas (pausadas durante chefe)
    if (this.stage.type !== 'boss' && this.stage.type !== 'elite') {
      const waves = this.act.waves;
      if (this.waveIdx < waves.length && w.time >= waves[this.waveIdx].t) {
        this.wave(waves[this.waveIdx]);
        this.waveIdx++;
      }
    }
    // população ambiente
    this.relief -= dt;
    const amb = this.ambient();
    const target = amb.target * (this.relief > 0 ? 0.6 : 1) * this.densityMul * w.densityMul;
    if (w.enemies.aliveCount < target) {
      this.spawnAcc += amb.rate * dt * this.densityMul;
      // `rate` é em inimigos por segundo; Ferrugíneos chegam em pequenos grupos
      while (this.spawnAcc >= 1) {
        const types = Object.keys(amb.mix);
        const t = rng.weighted(types, (k) => amb.mix[k]) ?? 'rust';
        const n = t === 'rust' ? Math.min(Math.floor(this.spawnAcc), rng.int(2, 4)) : 1;
        this.spawnAcc -= n;
        const p = this.spawnPoint('around');
        if (p) for (let i = 0; i < n; i++) w.enemies.spawn(t, p.x + rng.range(-14, 14), p.y + rng.range(-10, 10));
      }
    }
    // objetivo atual
    const s = this.stage;
    if (s.type === 'kills') {
      this.objective = `${s.text} (${Math.min(this.kills, s.goal)}/${s.goal})`;
      if (this.kills >= s.goal) {
        w.sfx('sfx_anchor', { volume: 0.4, rate: 1.5 });
        this.next();
      }
    } else if (s.type === 'anchor') {
      const inside = this.inChannelZone();
      if (inside) this.channel += dt;
      else this.channel = Math.max(0, this.channel - dt * 0.35);
      const p = Math.min(1, this.channel / s.channel);
      this.objective = `${s.text} — ${Math.round(p * 100)}%`;
      const a = this.marker('A');
      this.sigil.rotation += dt * (0.3 + p * 2);
      this.sigil.alpha = 0.35 + p * 0.6 + (inside ? Math.sin(this.stageT * 6) * 0.1 : 0);
      this.sigil.scale.set(1.15, 1.15);
      this.beam.visible = p > 0;
      this.beam.position.set(iso.x(a.x, a.y - 18), iso.y(a.x, a.y - 18) - 40);
      this.beam.scale.set(1 + p, 0.4 + p * 1.6);
      this.beam.alpha = p * 0.8;
      this.beam.tint = 0xffc070;
      if (inside && this.stageT % 0.1 < dt) w.particles.emit({ tex: w.fx.ember, x: a.x + rng.range(-50, 50), y: a.y + rng.range(-40, 50), vy: -60 - p * 60, life: 0.9, s0: 1.5, s1: 0.3, tint: 0xffc060 });
      if (p >= 1) {
        w.activateAnchor(a.x, a.y);
        this.sigil.visible = false;
        this.beam.visible = false;
        this.next();
      }
    } else if (s.type === 'elite' && this.target) {
      this.objectivePoint = { x: this.target.x, y: this.target.y };
    } else if (s.type === 'boss' && this.bossEnemy) {
      this.objectivePoint = null;
    }
  }

  destroy(): void {
    this.sigil.destroy();
    this.beam.destroy();
  }
}
