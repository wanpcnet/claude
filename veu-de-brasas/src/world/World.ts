import { BlurFilter, ColorMatrixFilter, Container, Matrix, Sprite, Texture, type Filter } from 'pixi.js';
import { iso } from '../render/Iso';
import { AdvancedBloomFilter } from 'pixi-filters';
import type { Game } from '../game/Game';
import type { AssetLoader } from '../game/AssetLoader';
import { Arena } from './Arena';
import { MAPS } from '../content/maps';
import { ACTS } from '../content/acts';
import { deriveStats, xpForLevel, type Build, type Stats } from '../content/upgrades';
import { Src, type Hit } from '../content/types';
import { Hero } from '../entities/Hero';
import type { Enemy } from '../entities/Enemy';
import { EnemySystem } from '../systems/EnemySystem';
import { Projectiles } from '../systems/Projectiles';
import { Hazards } from '../systems/Hazards';
import { Weapons } from '../systems/Weapons';
import { Abilities } from '../systems/Abilities';
import { difficultyById, relicById, defaultRunConfig, type RunConfig, type DifficultyDef } from '../content/meta';
import { ENDLESS_ACT, type ActScript } from '../content/acts';
import { Pickups } from '../systems/Pickups';
import { Director } from '../systems/Director';
import { Particles } from '../render/Particles';
import { Lighting } from '../render/Lighting';
import { FloatText } from '../render/FloatText';
import { Fx } from '../render/Fx';
import { damp, clamp } from '../utils/math';
import { rng } from '../utils/rng';
import type { Quality } from '../systems/Save';

export interface RunState {
  build: Build;
  level: number;
  xp: number;
  kills: number;
  time: number;
  cardsTaken: string[];
  coins: number;
  rerolls: number;
  hp: number;
  damage: Record<string, number>;
  pending?: number;
  cfg: RunConfig;
  revives: number;
}

const DMG_COLOR: Record<string, number> = { physical: 0xfff0d0, fire: 0xffa050, lightning: 0xa8d0ff, crystal: 0x9ff4ff, wind: 0xe8e0d0, arcane: 0xd0a0ff, ice: 0xc8f0ff, shadow: 0xc090ff, blood: 0xff7080, light: 0xfff2b0 };
const SRC_NAME: Record<number, string> = {
  [Src.Arrow]: 'Flecha Rúnica', [Src.Crown]: 'Coroa de Brasas', [Src.Pulse]: 'Pulso da Coroa', [Src.Lance]: 'Lança Solar', [Src.Chain]: 'Corrente de Tempestade',
  [Src.Lotus]: 'Lótus de Cristal', [Src.Wind]: 'Vento Cinéreo', [Src.Ember]: 'Tornado Incandescente', [Src.Burn]: 'Queimaduras', [Src.Shard]: 'Fragmentos de Cristal', [Src.Phoenix]: 'Flecha Fênix',
  [Src.Dagger]: 'Adagas Espectrais', [Src.Missile]: 'Mísseis Arcanos', [Src.Meteor]: 'Chuva de Meteoros', [Src.Frost]: 'Nova Glacial', [Src.Spikes]: 'Espinhos Sombrios',
  [Src.Totem]: 'Totem de Raios', [Src.Wisp]: 'Fogos-Fátuos', [Src.Whip]: 'Chicote de Sangue', [Src.Moon]: 'Lua Crescente', [Src.Void]: 'Orbe do Vazio', [Src.Rain]: 'Chuva de Flechas',
  [Src.Thorns]: 'Aura de Espinhos', [Src.Active]: 'Habilidade ativa', [Src.Ult]: 'Suprema',
};

/** Cena de combate de um ato: mundo, câmera, camadas, sistemas e regras de dano. */
export class World {
  readonly assets: AssetLoader;
  readonly root = new Container();
  readonly base = new Container();
  readonly fxRoot = new Container();
  readonly screenUi = new Container();
  readonly layers = {
    ground: new Container(),
    low: new Container(),
    groundFx: new Container(),
    shadows: new Container(),
    entities: new Container(),
    fxAdd: new Container(),
    worldUi: new Container(),
    /** camadas "deitadas" no plano do chão (matriz isométrica) */
    flatBase: new Container(),
    flatFx: new Container(),
  };
  /** dimensões da imagem isométrica do solo (px de tela) */
  groundW = 0;
  groundH = 0;

  arena: Arena;
  hero: Hero;
  enemies: EnemySystem;
  projectiles: Projectiles;
  hazards: Hazards;
  weapons: Weapons;
  pickups: Pickups;
  director: Director;
  abilities: Abilities;
  cfg: RunConfig;
  diff: DifficultyDef;
  act: ActScript;
  endless = false;
  enemyHpMul = 1;
  eliteHpMul = 1;
  enemyDmgMul = 1;
  enemySpeedMul = 1;
  revivesLeft = 0;
  particles = new Particles();
  lighting: Lighting;
  floatText = new FloatText();
  fx: Fx;
  uiTex: { barFrame: Texture; barHp: Texture; barBoss: Texture };
  build: Build;
  stats: Stats;
  actIndex: number;
  time = 0;
  runTime = 0;
  level = 1;
  xp = 0;
  xpNext = xpForLevel(1);
  kills = 0;
  coins = 0;
  rerolls = 0;
  xpCombo = 0;
  cardsTaken: string[] = [];
  damageBySource: Record<string, number> = {};
  pendingLevels = 0;
  pendingBonus = 0;
  controlsLocked = false;
  modTide = false;
  densityMul = 1;
  boss: Enemy | null = null;
  camX = 0;
  camY = 0;
  zoom = 2;
  private shakeAmt = 0;
  private hitstopT = 0;
  private slowmo = 0;
  private flowT = 0;
  private lifestealPool = 0;
  private lifestealBudget = 2;
  private deathHandled = false;
  private completeT = -1;
  private introT = -1;
  private introCb: (() => void) | null = null;
  private introPoint = { x: 0, y: 0 };
  private vignette: Sprite;
  private indicator: Container;
  private pauseFilters: Filter[];
  private bloom: Filter | null = null;
  private grade: ColorMatrixFilter | null = null;
  private screenW = 1280;
  private screenH = 720;
  private xpComboT = 0;
  /** neblina em camada de parallax (move-se 12% mais rápido que o mundo: profundidade sutil) */
  private fog = new Container();
  private fogSprites: { s: Sprite; vx: number }[] = [];
  private moteT = 0;

  constructor(readonly game: Game, actIndex: number, state: RunState, ground: { tex: Texture; x: number; y: number }[]) {
    this.assets = game.assets;
    this.actIndex = actIndex;
    this.cfg = state.cfg ?? defaultRunConfig();
    this.endless = this.cfg.mode === 'endless';
    const act = this.endless ? ENDLESS_ACT : ACTS[actIndex];
    this.act = act;
    const map = MAPS[act.map];
    this.build = state.build;
    this.stats = deriveStats(this.build);
    this.level = state.level;
    this.xp = state.xp;
    this.xpNext = xpForLevel(this.level);
    this.kills = state.kills;
    this.runTime = state.time;
    this.cardsTaken = state.cardsTaken;
    this.coins = state.coins;
    this.rerolls = state.rerolls;
    this.damageBySource = state.damage;
    this.pendingLevels = state.pending ?? 0;
    this.modTide = game.save.data.modifiers.includes('mod_tide');
    this.diff = difficultyById(this.cfg.difficulty);
    const daily = new Set(this.cfg.daily);
    this.densityMul = (this.modTide ? 1.3 : 1) * this.diff.density * (daily.has('tide') ? 1.4 : 1);
    this.enemyHpMul = this.diff.hp * (relicById(this.cfg.relic).enemyHp ?? 1) * (daily.has('rich') ? 1.3 : 1);
    this.eliteHpMul = daily.has('elite') ? 1.4 : 1;
    this.enemyDmgMul = this.diff.dmg;
    this.enemySpeedMul = daily.has('fast') ? 1.2 : 1;
    this.revivesLeft = state.revives ?? this.stats.revives;

    this.uiTex = { barFrame: game.uiTextures.barFrame, barHp: game.uiTextures.barHp, barBoss: game.uiTextures.barBoss };
    this.arena = new Arena(map);
    iso.setArena(this.arena.height);
    const gm = game.assets.ground[act.map];
    this.groundW = gm?.width ?? this.arena.width;
    this.groundH = gm?.height ?? this.arena.height;
    this.particles.projector = iso;
    this.floatText.projector = iso;
    const L = this.layers;
    L.flatBase.setFromMatrix(iso.matrix());
    L.flatFx.setFromMatrix(iso.matrix());
    L.flatFx.blendMode = 'add';
    L.entities.sortableChildren = true;
    this.arena.build(this.assets, ground, L.ground, L.low, L.entities);
    this.lighting = new Lighting(this.assets.tex('fx', 'light'), 1280, 720);
    this.lighting.setStatic(this.arena.lights);
    const amb = parseInt(map.ambient.slice(1), 16);
    this.lighting.ambient = [((amb >> 16) & 255) / 255, ((amb >> 8) & 255) / 255, (amb & 255) / 255];
    this.fx = new Fx(this.assets, this.particles, this.lighting);
    this.hazards = new Hazards(this, {
      circle: this.assets.tex('fx', 'tele_circle'),
      line: this.assets.tex('fx', 'tele_line'),
      cone: this.assets.tex('fx', 'tele_cone'),
      ring: this.assets.tex('fx', 'ring'),
    });
    this.hero = new Hero(this);
    const start = this.arena.markers.get('@') ?? { x: this.arena.width / 2, y: this.arena.height / 2 };
    this.hero.x = start.x;
    this.hero.y = start.y;
    this.hero.hp = Math.min(this.stats.maxHp, state.hp);
    L.shadows.addChild(this.hero.shadow);
    L.entities.addChild(this.hero.sprite);
    this.enemies = new EnemySystem(this);
    this.projectiles = new Projectiles(this);
    this.pickups = new Pickups(this);
    this.weapons = new Weapons(this);
    this.abilities = new Abilities(this);
    const skin = game.currentSkin();
    this.weapons.applySkin(skin.tint, skin.flame);

    L.flatBase.addChild(L.groundFx, this.weapons.crownGround, this.hazards.layer, L.shadows);
    L.flatFx.addChild(this.hazards.ringLayer);
    this.base.addChild(L.ground, L.low, L.flatBase, this.pickups.layer, L.entities, this.projectiles.enemyLayer);
    this.fxRoot.addChild(this.projectiles.trails, this.projectiles.layer, this.particles.normal, L.flatFx, L.fxAdd, this.enemies.bars, this.floatText.layer, L.worldUi);
    L.fxAdd.addChild(this.particles.add);
    this.vignette = new Sprite(this.assets.tex('fx', 'vignette'));
    this.indicator = new Container();
    const ig = new Sprite(this.assets.tex('fx', 'glow'));
    ig.anchor.set(0.5);
    ig.tint = 0xffb040;
    ig.alpha = 0.6;
    ig.blendMode = 'add';
    const ia = new Sprite(this.assets.tex('fx', 'arrow'));
    ia.anchor.set(0.5);
    ia.scale.set(2.2);
    this.indicator.addChild(ig, ia);
    this.indicator.visible = false;
    this.screenUi.addChild(this.vignette, this.indicator);
    for (let i = 0; i < 14; i++) {
      const s = new Sprite(this.assets.tex('fx', `smoke_${i % 4}`));
      s.anchor.set(0.5);
      s.tint = 0x9aa0b8;
      s.alpha = 0.05 + (i % 3) * 0.015;
      s.scale.set(5 + (i % 4) * 1.5, 3 + (i % 3));
      s.position.set(((i * 397) % this.groundW), ((i * 263) % this.groundH));
      this.fog.addChild(s);
      this.fogSprites.push({ s, vx: 6 + (i % 5) * 3 });
    }
    this.root.addChild(this.base, this.lighting.overlay, this.fxRoot, this.fog, this.screenUi);

    const cm = new ColorMatrixFilter();
    cm.desaturate();
    cm.brightness(0.55, true);
    this.pauseFilters = [cm, new BlurFilter({ strength: 3, quality: 2 })];
    this.director = new Director(this, act);
    this.camX = this.hero.x;
    this.camY = this.hero.y;
    this.arena.updateFlow(this.hero.x, this.hero.y, true);
    this.applyQuality(game.quality);
  }

  applyQuality(q: Quality): void {
    this.lighting.enabled = q !== 'low';
    this.lighting.overlay.visible = q !== 'low';
    this.particles.max = q === 'low' ? 500 : q === 'medium' ? 1100 : 1800;
    this.fx.density = q === 'low' ? 0.45 : q === 'medium' ? 0.75 : 1;
    if (q !== 'low') {
      if (!this.bloom) this.bloom = new AdvancedBloomFilter({ threshold: 0.55, bloomScale: 0.7, brightness: 1, blur: 4, quality: q === 'high' ? 3 : 2 });
      this.fxRoot.filters = [this.bloom];
    } else this.fxRoot.filters = [];
    // gradação de cor sutil: mais contraste e saturação (visual mais atual)
    if (q === 'high') {
      if (!this.grade) {
        this.grade = new ColorMatrixFilter();
        this.grade.saturate(0.18, false);
        this.grade.contrast(0.08, true);
      }
      this.root.filters = [this.grade];
    } else this.root.filters = [];
    this.fx.reduceFlash = this.game.save.data.settings.reduceFlash;
    this.floatText.enabled = this.game.save.data.settings.damageNumbers;
  }

  setPausedLook(on: boolean): void {
    this.base.filters = on ? this.pauseFilters : [];
    this.fxRoot.alpha = on ? 0.4 : 1;
  }

  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
    const z = h > w ? Math.min(w / 270, h / 520) : Math.min(h / 500, w / 400);
    this.zoom = Math.max(1, Math.round(z * 8) / 8);
    this.lighting.resize(w, h);
    this.vignette.width = w;
    this.vignette.height = h;
  }

  /** raio (mundo) que cobre a tela na projeção isométrica */
  viewRadius(): number {
    return Math.hypot(this.screenW, this.screenH) / (2 * this.zoom);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return iso.toWorld((sx - this.base.x) / this.zoom, (sy - this.base.y) / this.zoom);
  }

  runState(): RunState {
    return {
      build: this.build, level: this.level, xp: this.xp, kills: this.kills, time: this.runTime, cardsTaken: this.cardsTaken,
      coins: this.coins, rerolls: this.rerolls, hp: this.hero.hp, damage: this.damageBySource, pending: this.pendingLevels + this.pendingBonus,
      cfg: this.cfg, revives: this.revivesLeft,
    };
  }

  refreshStats(): void {
    const oldMax = this.stats.maxHp;
    const oldRev = this.stats.revives;
    this.stats = deriveStats(this.build);
    if (this.stats.revives > oldRev) this.revivesLeft += this.stats.revives - oldRev;
    if (this.stats.maxHp > oldMax) this.hero.heal(this.stats.maxHp - oldMax, true);
  }

  // ------------------------------------------------------------ serviços para os sistemas
  sfx(name: string, opts?: { volume?: number; rate?: number; gap?: number; max?: number }): void {
    this.game.audio.sfx(name, opts);
  }

  shake(n: number): void {
    const s = this.game.save.data.settings.reduceShake ? 0.25 : 1;
    this.shakeAmt = Math.min(14, Math.max(this.shakeAmt, n * s));
  }

  hitstop(t: number): void {
    this.hitstopT = Math.max(this.hitstopT, t);
  }

  announce(text: string): void {
    this.game.hud.announce(text);
  }

  hint(text: string): void {
    this.game.hud.hint(text);
  }

  onObjective(text: string): void {
    this.game.hud.objective(text);
  }

  addXp(n: number): void {
    this.xp += n * this.stats.xpMul;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpForLevel(this.level);
      this.pendingLevels++;
    }
  }

  queueBonusCard(): void {
    this.pendingBonus++;
  }

  damageEnemy(e: Enemy, hit: Hit, silent = false): boolean {
    if (!e.alive) return false;
    let amt = hit.amount;
    let crit = false;
    if (hit.source !== Src.Burn) {
      amt *= this.stats.might * this.abilities.mightMul;
      if (rng.next() < this.stats.critChance) {
        crit = true;
        amt *= this.stats.critMul;
      }
      if (e.freezeT > 0 && !e.stunned && this.build.flags.l_iceage) amt *= 1.5;
    }
    if (e.def.armor) amt *= 1 - e.def.armor * (hit.type === 'physical' ? 1 : 0.5);
    if (e.armorHp > 0) {
      const absorbed = amt * 0.75;
      e.armorHp -= absorbed;
      amt -= absorbed;
      if (e.armorHp <= 0) {
        this.fx.at(20).shatter(e.x, e.y, 18, true);
        this.sfx('sfx_armor_break', { volume: 0.9 });
        this.announce('A armadura de coral se partiu!');
        this.shake(5);
        this.hitstop(0.08);
        this.enemies.setAnim(e, 'guardian_broken', true, 8);
      }
    }
    e.hp -= amt;
    // chefes soltam frutos de cura a cada 25% de vida perdida (justiça em lutas longas)
    if (e.boss && e.hp > 0) {
      const marks = Math.floor((1 - e.hp / e.maxHp) * 4);
      while (e.bossDrops < marks) {
        e.bossDrops++;
        this.pickups.drop('heal', this.hero.x + rng.range(-60, 60), this.hero.y + rng.range(-40, 40));
        this.pickups.drop('energy', this.hero.x + rng.range(-60, 60), this.hero.y + rng.range(-40, 40));
      }
    }
    const key = SRC_NAME[hit.source] ?? 'Outros';
    this.damageBySource[key] = (this.damageBySource[key] ?? 0) + amt;
    if (hit.knock && e.mass < 900) {
      const k = hit.knock / Math.sqrt(e.mass);
      e.kx += (hit.kx ?? 0) * k;
      e.ky += (hit.ky ?? 0) * k;
    }
    if (hit.burn) {
      e.burnT = Math.max(e.burnT, hit.burnDur ?? 2);
      e.burnDps = Math.max(e.burnDps * (e.burnT > 0 ? 1 : 0), hit.burn);
    }
    if (hit.slow) {
      e.slowT = Math.max(e.slowT, hit.slowDur ?? 0.3);
      e.slowMul = Math.min(e.slowMul, hit.slow);
    }
    if (!silent && e.flashCd <= 0) {
      // bosses e elites piscam com moderação para não virar silhueta permanente
      e.flashT = e.boss || e.def.elite ? 0.05 : 0.07;
      e.flashCd = e.boss || e.def.elite ? 0.35 : 0.1;
      if (e.boss) this.sfx('sfx_hit', { volume: 0.25, gap: 0.08 });
    }
    const ls = this.stats.lifesteal + (this.abilities.furyT > 0 ? 0.03 : 0);
    if (ls > 0 && this.hero.alive) this.lifestealPool += amt * ls;
    if (e.boss) this.abilities.addCharge(amt * 0.004);
    const important = !!e.boss || !!e.def.elite;
    if (!silent && amt >= 1 && (amt >= 40 || important || hit.heavy || (crit && amt >= 20))) {
      if (crit) this.floatText.spawn(e.x, e.y, Math.round(amt) + '!', 0xffd040, true, e.radius * 2 + 10 + e.z);
      else this.floatText.spawn(e.x, e.y, String(Math.round(amt)), DMG_COLOR[hit.type], amt >= 40, e.radius * 2 + 6 + e.z);
    }
    if (e.hp <= 0) {
      this.killEnemy(e);
      return true;
    }
    return false;
  }

  private killEnemy(e: Enemy): void {
    this.enemies.kill(e);
    const big = e.boss ? 3 : e.def.elite ? 2 : e.radius > 12 ? 1.3 : 1;
    this.fx.at(e.radius).death(e.x, e.y, e.def.deathTint, big);
    this.sfx('sfx_death', { volume: 0.22 * Math.min(2, big), gap: 0.035, max: 5 });
    this.abilities.addCharge(e.boss ? 30 : e.def.elite ? 12 : e.isSummon ? 0.2 : 0.6);
    if (!e.isSummon || rng.chance(0.3)) {
      this.kills += e.isSummon ? 0 : 1;
      if (!e.noXp) this.pickups.dropXp(e.x, e.y, e.def.xp);
      const r = rng.next();
      if (r < 0.012) this.pickups.drop('heal', e.x, e.y);
      else if (r < 0.035) this.pickups.drop('energy', e.x, e.y);
      else if (r < 0.05 * (this.modTide ? 1.6 : 1)) this.pickups.drop('coin', e.x, e.y, 1);
    }
    if (e.def.elite) {
      this.hitstop(0.1);
      this.shake(6);
      this.fx.at(20).explosion(e.x, e.y, 1.6, 0x80ffff);
    }
    if (e.boss) {
      this.hitstop(0.2);
      e.boss.onDeath?.(e);
      this.sfx('sfx_explosion', { volume: 1 });
    }
    this.director.onKill(e);
  }

  damageHero(amount: number, sx: number, sy: number): boolean {
    if (this.introT >= 0 || this.completeT >= 0) return false;
    if (!this.hero.damage(amount * this.enemyDmgMul, sx, sy)) return false;
    this.weapons.extra.reflect(amount, sx, sy);
    if (!this.hero.alive && this.revivesLeft > 0) {
      this.revivesLeft--;
      this.reviveHero();
      return true;
    }
    this.sfx('sfx_hurt', { volume: 0.7, gap: 0.1 });
    this.shake(3);
    this.hitstop(0.03);
    this.game.hud.hurtFlash(this.game.save.data.settings.reduceFlash);
    return true;
  }

  /** modo Sem Fim: inimigos ficam mais resistentes com o tempo */
  endlessScale(): number {
    if (!this.endless) return 1;
    const m = this.time / 60;
    return 1 + m * 0.16 + m * m * 0.012;
  }

  /** congela (ou atordoa) um inimigo; chefes ficam apenas muito lentos */
  freezeEnemy(e: Enemy, t: number, stun = false): void {
    if (e.boss || e.mass >= 900) {
      e.slowT = Math.max(e.slowT, t);
      e.slowMul = Math.min(e.slowMul, 0.45);
      return;
    }
    e.freezeT = Math.max(e.freezeT, t * (e.def.elite ? 0.5 : 1));
    e.stunned = stun;
  }

  /** Segunda Brasa / Pena de Fênix: renasce com metade da vida e uma explosão de fogo */
  private reviveHero(): void {
    const h = this.hero;
    h.alive = true;
    h.deathT = 0;
    h.hp = this.stats.maxHp * 0.5;
    h.invuln = 2.2;
    this.enemies.forRadius(h.x, h.y, 220, (e) => {
      const a = Math.atan2(e.y - h.y, e.x - h.x);
      this.damageEnemy(e, { amount: 120 + this.level * 8, type: 'fire', source: Src.Pulse, knock: 600, kx: Math.cos(a), ky: Math.sin(a), burn: 10, burnDur: 3 }, true);
    });
    this.projectiles.clear();
    this.fx.anchorBurst(h.x, h.y);
    this.fx.at(20).explosion(h.x, h.y, 2.2);
    this.shake(9);
    this.hitstop(0.15);
    this.sfx('sfx_legendary', { volume: 1 });
    this.announce('Renascido das brasas!');
  }

  activateAnchor(x: number, y: number): void {
    if (this.arena.anchorSprite) this.arena.anchorSprite.texture = this.assets.tex('props', 'anchor_on');
    this.fx.anchorBurst(x, y);
    this.sfx('sfx_anchor', { volume: 1 });
    this.shake(7);
    this.hitstop(0.08);
    this.arena.lights.push({ x, y, color: 0xffb050, radius: 260, flicker: true, phase: 0 });
    this.lighting.setStatic(this.arena.lights);
    const [r, g, b] = this.lighting.ambient;
    this.lighting.ambient = [Math.min(1, r + 0.08), g + 0.02, b - 0.04];
    this.hero.heal(this.stats.maxHp * 0.3);
    this.announce('Âncora do Véu reacesa!');
    // onda que repele a horda
    this.enemies.forRadius(x, y, 260, (e) => {
      const a = Math.atan2(e.y - y, e.x - x);
      this.damageEnemy(e, { amount: 60, type: 'fire', source: Src.Pulse, knock: 500, kx: Math.cos(a), ky: Math.sin(a) }, true);
    });
  }

  startBossIntro(kind: 'toad' | 'heart', spawn: () => void): void {
    const p = this.director.objectivePoint ?? { x: this.hero.x, y: this.hero.y - 200 };
    this.introPoint = p;
    this.introT = 0;
    this.introCb = spawn;
    this.controlsLocked = true;
    this.hazards.clear();
    this.projectiles.clear();
    this.enemies.forRadius(p.x, p.y, 320, (e) => {
      if (!e.boss) this.damageEnemy(e, { amount: 9999, type: 'arcane', source: Src.Pulse }, true);
    });
    this.game.audio.music('music_boss', 1.5);
    this.game.hud.bossIntro(kind === 'toad' ? 'Batráquio Colossal' : 'Coração do Véu', kind === 'toad' ? 'Senhor do pântano mineral' : 'O núcleo vivo da fenda');
    this.sfx('sfx_roar', { volume: 1 });
  }

  setBoss(e: Enemy | null): void {
    this.boss = e;
    this.game.hud.setBoss(e ? e.def.name : null);
    if (!e) this.game.audio.music('music_combat', 2);
  }

  onActComplete(): void {
    this.completeT = 0;
    this.pickups.vacuum();
    this.controlsLocked = false;
    for (const e of this.enemies.pool.items) if (e.alive && !e.boss) this.damageEnemy(e, { amount: 9999, type: 'arcane', source: Src.Pulse }, true);
    this.hazards.clear();
    this.announce(this.actIndex === ACTS.length - 1 ? 'O Véu está selado!' : 'Ato concluído!');
  }

  // ------------------------------------------------------------ laço
  destroyed = false;

  update(dt: number): void {
    if (this.destroyed) return;
    const game = this.game;
    this.runTime += dt;
    // efeitos visuais seguem mesmo em hitstop
    this.particles.update(dt);
    this.floatText.update(dt);
    this.lighting.update(dt);
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      this.updateCamera(dt);
      return;
    }
    let sdt = dt;
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      sdt = dt * 0.25;
      if (this.slowmo <= 0) {
        game.openCards(this.pendingBonus > 0 && this.pendingLevels === 0);
      }
    }
    this.time += sdt;
    if (this.introT >= 0) {
      this.introT += dt;
      if (this.introT > 1.3 && this.introCb) {
        this.introCb();
        this.introCb = null;
      }
      if (this.introT > 2.6) {
        this.introT = -1;
        this.controlsLocked = false;
      }
    }
    this.flowT -= sdt;
    if (this.flowT <= 0) {
      this.flowT = 0.2;
      this.arena.updateFlow(this.hero.x, this.hero.y);
    }
    const input = game.input;
    if (!this.controlsLocked && input.consume('pulse')) {
      if (!this.abilities.tryActive()) game.hud.denyPulse();
    }
    if (!this.controlsLocked && input.consume('ult')) {
      if (!this.abilities.tryUlt()) game.hud.denyUlt();
    }
    this.abilities.update(sdt);
    this.hero.update(sdt);
    // a heroína não atravessa o corpo do chefe
    const b = this.boss;
    if (b && b.alive && b.z < 20) {
      const dx = this.hero.x - b.x;
      const dy = this.hero.y - b.y;
      const rr = b.radius * 0.85 + this.hero.radius;
      const d = Math.hypot(dx, dy);
      if (d < rr && d > 0.01) {
        this.hero.x = b.x + (dx / d) * rr;
        this.hero.y = b.y + (dy / d) * rr;
        this.arena.resolve(this.hero, this.hero.radius);
      }
    }
    this.weapons.update(sdt);
    this.enemies.update(sdt);
    this.projectiles.update(sdt);
    this.hazards.update(sdt);
    this.pickups.update(sdt);
    this.director.update(sdt);
    // roubo de vida limitado a 2 de vida por segundo
    this.lifestealBudget = Math.min(2, this.lifestealBudget + sdt * 2);
    if (this.lifestealPool > 0.05) {
      const n = Math.min(this.lifestealPool, this.lifestealBudget);
      this.hero.heal(n, false);
      this.lifestealBudget -= n;
      this.lifestealPool = 0;
    }
    this.xpComboT -= sdt;
    if (this.xpComboT <= 0) {
      this.xpComboT = 0.6;
      this.xpCombo = Math.max(0, this.xpCombo - 4);
    }
    // subida de nível: desacelera alguns quadros e então congela para as cartas
    if ((this.pendingLevels > 0 || this.pendingBonus > 0) && this.slowmo <= 0 && this.hero.alive && this.introT < 0 && this.completeT < 0) {
      this.slowmo = 0.3;
      if (this.pendingLevels > 0) {
        this.fx.levelUp(this.hero.x, this.hero.y);
        this.sfx('sfx_levelup', { volume: 0.8 });
      }
    }
    if (!this.hero.alive && !this.deathHandled) {
      if (this.hero.deathT > 1.8) {
        this.deathHandled = true;
        game.onDefeat();
      }
    }
    if (this.completeT >= 0) {
      this.completeT += dt;
      if (this.completeT > 3.2) {
        this.completeT = -10;
        // adia para fora do passo de simulação (a transição destrói este mundo)
        setTimeout(() => game.onActComplete(), 0);
      }
    }
    this.updateCamera(dt);
  }

  private updateCamera(dt: number): void {
    const h = this.hero;
    let tx = h.x + h.vx * 0.25;
    let ty = h.y + h.vy * 0.2;
    if (this.introT >= 0) {
      const k = clamp(this.introT / 0.6, 0, 1) * (this.introT > 2.1 ? clamp((2.6 - this.introT) / 0.5, 0, 1) : 1);
      tx = h.x + (this.introPoint.x - h.x) * k;
      ty = h.y + (this.introPoint.y - h.y) * k;
    } else if (this.boss) {
      // enquadra parcialmente o chefe para antecipar ameaças
      tx += (this.boss.x - h.x) * 0.18;
      ty += (this.boss.y - h.y) * 0.18;
    }
    this.camX = damp(this.camX, tx, 6, dt);
    this.camY = damp(this.camY, ty, 6, dt);
    const hw = this.screenW / 2 / this.zoom;
    const hh = this.screenH / 2 / this.zoom;
    const A = this.arena;
    // câmera no espaço isométrico, limitada à imagem do solo
    const sxw = iso.x(this.camX, this.camY);
    const syw = iso.y(this.camX, this.camY) - 12;
    const csx = this.groundW > hw * 2 ? clamp(sxw, hw, this.groundW - hw) : this.groundW / 2;
    const csy = this.groundH > hh * 2 ? clamp(syw, hh, this.groundH - hh) : this.groundH / 2;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
    const shx = (Math.random() - 0.5) * this.shakeAmt;
    const shy = (Math.random() - 0.5) * this.shakeAmt;
    const px = Math.round(-csx * this.zoom + this.screenW / 2 + shx);
    const py = Math.round(-csy * this.zoom + this.screenH / 2 + shy);
    for (const c of [this.base, this.fxRoot]) {
      c.position.set(px, py);
      c.scale.set(this.zoom);
    }
    // parallax da neblina
    const pf = 1.12;
    this.fog.scale.set(this.zoom * pf);
    this.fog.position.set(this.screenW / 2 - csx * this.zoom * pf, this.screenH / 2 - csy * this.zoom * pf);
    for (const f of this.fogSprites) {
      f.s.x += f.vx * dt;
      if (f.s.x > csx + hw * 1.6) f.s.x = csx - hw * 1.6;
      if (f.s.x < csx - hw * 1.8) f.s.x = csx + hw * 1.5;
      if (f.s.y > csy + hh * 1.8) f.s.y = csy - hh * 1.6;
      if (f.s.y < csy - hh * 1.8) f.s.y = csy + hh * 1.6;
    }
    // poeira/esporos suspensos, em volume muito moderado
    this.moteT -= dt;
    if (this.moteT <= 0) {
      this.moteT = 0.12 / Math.max(0.3, this.fx.density);
      const theme = this.arena.map.theme;
      const tint = theme === 'glass' ? 0x9ff4ff : theme === 'sunken' ? 0xc8a0ff : 0xffc080;
      const R = this.viewRadius();
      this.particles.emit({ tex: this.fx.dot, x: this.camX + (Math.random() - 0.5) * R * 1.4, y: this.camY + (Math.random() - 0.5) * R * 1.4, h: Math.random() * 40, vx: (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 8, life: 3 + Math.random() * 2, s0: 0.7, s1: 1.0, a0: 0.5, a1: 0, tint });
    }
    // culling simples de props fora da tela
    const vx0 = csx - hw - 140;
    const vx1 = csx + hw + 140;
    const vy0 = csy - hh - 60;
    const vy1 = csy + hh + 200;
    for (const p of A.props) {
      const s = p.sprite;
      s.visible = s.x > vx0 && s.x < vx1 && s.y > vy0 && s.y < vy1;
    }
    // indicador de objetivo na borda da tela
    const op = this.director.objectivePoint;
    if (op && this.introT < 0) {
      const o = this.worldToScreen(op.x, op.y);
      const ox = o.x;
      const oy = o.y;
      const m = 48;
      const off = ox < m || oy < m || ox > this.screenW - m || oy > this.screenH - m;
      this.indicator.visible = off;
      if (off) {
        const cxs = this.screenW / 2;
        const cys = this.screenH / 2;
        const a = Math.atan2(oy - cys, ox - cxs);
        const r = Math.min((cxs - m) / Math.abs(Math.cos(a) || 1e-3), (cys - m) / Math.abs(Math.sin(a) || 1e-3));
        this.indicator.position.set(cxs + Math.cos(a) * r, cys + Math.sin(a) * r);
        this.indicator.rotation = a;
        this.indicator.alpha = 0.75 + Math.sin(this.runTime * 6) * 0.25;
      }
    } else this.indicator.visible = false;
  }

  /** chamado pelo Game a cada quadro renderizado */
  render(): void {
    this.lighting.render(this.game.app.renderer, this.groundMatrix());
  }

  /** mundo (plano do chão) → tela, incluindo projeção isométrica, zoom e câmera */
  groundMatrix(): Matrix {
    const m = iso.matrix();
    const z = this.zoom;
    return new Matrix(m.a * z, m.b * z, m.c * z, m.d * z, m.tx * z + this.base.x, m.ty * z + this.base.y);
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: iso.x(x, y) * this.zoom + this.base.x, y: iso.y(x, y) * this.zoom + this.base.y };
  }

  destroy(): void {
    this.destroyed = true;
    this.director.destroy();
    this.abilities.destroy();
    this.weapons.destroy();
    this.root.destroy({ children: true });
  }
}
