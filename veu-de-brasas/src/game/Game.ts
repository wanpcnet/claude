import { Application, Assets, Container, Sprite, Texture } from 'pixi.js';
import { AssetLoader, BASE } from './AssetLoader';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { SaveStore, META_ITEMS, type Quality } from '../systems/Save';
import { Hud } from '../ui/Hud';
import { Menus } from '../ui/Menus';
import { World, type RunState } from '../world/World';
import { ACTS } from '../content/acts';
import { newBuild, rollCards, type CardDef } from '../content/upgrades';
import { Particles } from '../render/Particles';
import { rng } from '../utils/rng';

type State = 'menu' | 'playing' | 'paused' | 'cards' | 'transition' | 'results';

/** Orquestra aplicação, estados, transições entre atos, cartas, pausa, save e meta progressão. */
export class Game {
  readonly app: Application;
  readonly assets = new AssetLoader();
  readonly audio = new AudioManager();
  readonly save = new SaveStore();
  input!: InputManager;
  hud!: Hud;
  menus!: Menus;
  world: World | null = null;
  state: State = 'menu';
  quality: Quality = 'high';
  uiTextures!: { barFrame: Texture; barHp: Texture; barBoss: Texture };
  private menuScene = new Container();
  private menuArt: Sprite | null = null;
  private menuParticles = new Particles();
  private actIndex = 0;
  private cards: CardDef[] = [];
  private cardBonus = false;
  private accumulator = 0;
  private debugOn = false;
  private fpsSmooth = 60;
  private updateMs = 0;
  private menuT = 0;
  private picking = false;
  private loadedGround = '';

  constructor(app: Application, private uiRoot: HTMLElement) {
    this.app = app;
  }

  async init(onProgress: (p: number, label: string) => void): Promise<void> {
    await this.assets.load(this.audio, onProgress);
    const [barFrame, barHp, barBoss] = await Promise.all(['bar_frame', 'bar_hp', 'bar_boss'].map((n) => Assets.load<Texture>(`${BASE}ui/${n}.png`)));
    this.uiTextures = { barFrame, barHp, barBoss };
    this.input = new InputManager(this.app.canvas);
    this.hud = new Hud(this.uiRoot);
    this.menus = new Menus(this, this.uiRoot);
    this.applySettings();
    this.buildMenuScene();
    this.app.stage.addChild(this.menuScene);
    this.app.ticker.add((t) => this.tick(t.deltaMS / 1000));
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
      this.audio.suspend(document.hidden);
    });
    window.addEventListener('blur', () => this.autoPause());
    const unlock = () => void this.audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    this.debugOn = new URLSearchParams(location.search).has('debug');
    this.resize();
    this.toMenu();
    if (this.debugOn) (window as unknown as { __veu: Game }).__veu = this;
  }

  // ------------------------------------------------------------ configurações
  applySettings(): void {
    const s = this.save.data.settings;
    this.audio.musicVolume = s.music;
    this.audio.sfxVolume = s.sfx;
    this.audio.applyVolumes();
    this.quality = s.quality === 'auto' ? this.detectQuality() : s.quality;
    document.documentElement.style.setProperty('--ui-scale', String(s.uiScale));
    this.world?.applyQuality(this.quality);
    this.save.save();
  }

  private detectQuality(): Quality {
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
    const cores = navigator.hardwareConcurrency ?? 4;
    if (mobile) return cores >= 8 ? 'medium' : 'low';
    return cores >= 4 ? 'high' : 'medium';
  }

  currentSkin(): { tint: number; flame: string } {
    const it = META_ITEMS.find((m) => m.id === this.save.data.selectedSkin) ?? META_ITEMS[0];
    return { tint: it.tint, flame: it.flame };
  }

  metaAction(id: string): void {
    const s = this.save.data;
    const it = META_ITEMS.find((m) => m.id === id);
    if (!it) return;
    if (!s.unlocked.includes(id)) {
      if (s.ashes < it.cost) return;
      s.ashes -= it.cost;
      s.unlocked.push(id);
      this.audio.sfx('sfx_rare', { volume: 0.7 });
    } else if (it.kind === 'skin') s.selectedSkin = id;
    else if (s.modifiers.includes(id)) s.modifiers = s.modifiers.filter((m) => m !== id);
    else s.modifiers.push(id);
    this.save.save();
  }

  // ------------------------------------------------------------ cena do menu
  private buildMenuScene(): void {
    const art = new Sprite(this.assets.keyart);
    art.anchor.set(0.5);
    this.menuArt = art;
    this.menuScene.addChild(art, this.menuParticles.normal, this.menuParticles.add);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.app.renderer.resize(w, h);
    if (this.menuArt) {
      const s = Math.max(w / 480, h / 270) * 1.06;
      this.menuArt.scale.set(s);
      this.menuArt.position.set(this.menuArtX(), h / 2);
    }
    this.world?.resize(w, h);
    document.documentElement.classList.toggle('portrait', h > w);
  }

  /** no paisagem a ilustração desloca-se para a direita, liberando a coluna do menu */
  private menuArtX(): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w > h * 1.2 ? w * 0.6 : w / 2;
  }

  toMenu(): void {
    this.destroyWorld();
    this.state = 'menu';
    this.hud.show(false);
    this.menus.hideCards();
    this.menus.showTouch(false);
    this.menuScene.visible = true;
    this.menus.mainMenu();
    this.audio.music('music_menu');
  }

  private destroyWorld(): void {
    if (this.world) {
      this.app.stage.removeChild(this.world.root);
      this.world.destroy();
      this.world = null;
    }
  }

  // ------------------------------------------------------------ partidas
  newRun(): void {
    const build = newBuild();
    if (this.save.data.modifiers.includes('mod_breeze')) build.weapons.wind = 1;
    this.save.data.runs++;
    const state: RunState = {
      build, level: 1, xp: 0, kills: 0, time: 0, cardsTaken: [], coins: 0,
      rerolls: this.save.data.modifiers.includes('mod_blessing') ? 1 : 0, hp: 100, damage: {},
    };
    void this.startAct(0, state);
  }

  continueRun(): void {
    const cp = this.save.data.checkpoint;
    if (!cp) return this.newRun();
    const state: RunState = {
      build: JSON.parse(JSON.stringify(cp.build)), level: cp.level, xp: cp.xp, kills: cp.kills, time: cp.time,
      cardsTaken: [...cp.cardsTaken], coins: cp.coins, rerolls: cp.rerolls, hp: cp.hp, damage: {},
    };
    void this.startAct(cp.act, state);
  }

  restartAct(): void {
    this.continueRun();
  }

  private async startAct(i: number, state: RunState): Promise<void> {
    this.state = 'transition';
    this.menus.hide();
    this.menus.hideCards();
    this.hud.show(false);
    const act = ACTS[i];
    this.actIndex = i;
    // ponto de controle no início de cada ato
    this.save.data.checkpoint = {
      act: i, level: state.level, xp: state.xp, build: JSON.parse(JSON.stringify(state.build)), kills: state.kills, time: state.time,
      cardsTaken: [...state.cardsTaken], coins: state.coins, rerolls: state.rerolls, hp: Math.max(state.hp, 60),
    };
    this.save.save();
    const card = this.menus.actCard(act.title, act.subtitle);
    this.destroyWorld();
    if (this.loadedGround && this.loadedGround !== act.map) await this.assets.unloadGround(this.loadedGround);
    this.loadedGround = act.map;
    const ground = await this.assets.loadGround(act.map);
    await card;
    this.menuScene.visible = false;
    if (i > 0 && this.save.data.modifiers.includes('mod_blessing') && state.rerolls < 1) state.rerolls++;
    state.hp = Math.max(state.hp, 60);
    const w = new World(this, i, state, ground);
    this.world = w;
    this.app.stage.addChild(w.root);
    w.resize(window.innerWidth, window.innerHeight);
    this.hud.reset();
    this.hud.show(true);
    this.hud.objective(w.director.objective);
    const touchUi = this.input.usingTouch || matchMedia('(pointer: coarse)').matches;
    this.menus.showTouch(touchUi);
    document.documentElement.classList.toggle('touch-mode', touchUi);
    this.menus.endTransition();
    this.audio.music('music_combat', 1.5);
    this.input.clearPressed();
    this.state = 'playing';
  }

  onActComplete(): void {
    const w = this.world;
    if (!w || this.state !== 'playing') return;
    if (this.actIndex >= ACTS.length - 1) return this.victory();
    void this.startAct(this.actIndex + 1, w.runState());
  }

  private finishRun(victory: boolean): void {
    const w = this.world;
    if (!w) return;
    const s = this.save.data;
    const bonus = victory ? 60 : 0;
    const mult = s.modifiers.includes('mod_tide') ? 1.6 : 1;
    const ashes = Math.round((w.coins + bonus + Math.floor(w.kills / 40)) * mult);
    s.ashes += ashes;
    if (victory) {
      s.victories++;
      s.bestTime = s.bestTime ? Math.min(s.bestTime, w.runTime) : w.runTime;
      s.checkpoint = null;
    }
    this.save.save();
    this.state = 'results';
    this.hud.show(false);
    this.menus.showTouch(false);
    w.setPausedLook(true);
    this.audio.music(victory ? 'music_victory' : 'music_defeat', 0.6);
    this.audio.sfx(victory ? 'sfx_legendary' : 'sfx_hurt', { volume: 0.8 });
    this.menus.results({
      victory, time: w.runTime, kills: w.kills, level: w.level, acts: this.actIndex + (victory ? 1 : 0), cards: w.cardsTaken, damage: w.damageBySource, ashes,
    });
  }

  onDefeat(): void {
    this.finishRun(false);
  }

  victory(): void {
    this.finishRun(true);
  }

  // ------------------------------------------------------------ cartas
  openCards(bonus: boolean): void {
    const w = this.world;
    if (!w || this.state !== 'playing') return;
    this.cardBonus = bonus;
    const luck = bonus ? 1.6 : Math.min(0.6, w.level * 0.02);
    this.cards = rollCards(w.build, () => rng.next(), 3, luck, w.level);
    if (!this.cards.length) {
      // tudo maximizado: converte em cura e Cinzas
      w.hero.heal(30);
      w.coins += 2;
      if (bonus) w.pendingBonus--;
      else w.pendingLevels--;
      return;
    }
    this.state = 'cards';
    w.setPausedLook(true);
    this.picking = false;
    const levels = this.cards.map((c) => c.level(w.build));
    this.menus.showCards(this.cards, levels, bonus ? 'Relíquia do Véu' : `Nível ${w.level - w.pendingLevels + 1}!`, w.rerolls, (i) => void this.pickCard(i), () => this.reroll());
  }

  private reroll(): void {
    const w = this.world;
    if (!w || w.rerolls <= 0) return;
    w.rerolls--;
    this.state = 'playing';
    this.openCards(this.cardBonus);
  }

  private async pickCard(i: number): Promise<void> {
    const w = this.world;
    if (!w || this.state !== 'cards' || this.picking) return;
    const c = this.cards[i];
    if (!c) return;
    this.picking = true;
    this.audio.sfx(c.rarity === 'legendary' ? 'sfx_legendary' : 'sfx_card_select', { volume: 0.8 });
    await this.menus.pickedAnim(i);
    c.apply(w.build);
    w.cardsTaken.push(c.name);
    w.refreshStats();
    if (c.id === 'p_vigor') w.hero.heal(25);
    if (this.cardBonus) w.pendingBonus = Math.max(0, w.pendingBonus - 1);
    else w.pendingLevels = Math.max(0, w.pendingLevels - 1);
    this.menus.hideCards();
    w.setPausedLook(false);
    if (c.rarity === 'legendary') {
      w.fx.anchorBurst(w.hero.x, w.hero.y);
      w.announce(`${c.name}!`);
    } else w.fx.levelUp(w.hero.x, w.hero.y);
    this.state = 'playing';
    this.input.clearPressed();
  }

  // ------------------------------------------------------------ pausa
  private autoPause(): void {
    if (this.state === 'playing') this.pause();
  }

  pause(): void {
    if (this.state !== 'playing' || !this.world) return;
    this.state = 'paused';
    this.world.setPausedLook(true);
    this.menus.pause();
  }

  resume(): void {
    if (!this.world) return;
    this.menus.hide();
    this.world.setPausedLook(false);
    this.state = 'playing';
    this.input.clearPressed();
  }

  // ------------------------------------------------------------ laço principal
  private tick(dt: number): void {
    const t0 = performance.now();
    dt = Math.min(dt, 0.1);
    this.input.pollGamepad();
    if (this.input.consume('debug')) this.debugOn = !this.debugOn;
    this.fpsSmooth += (1 / Math.max(dt, 1e-3) - this.fpsSmooth) * 0.05;
    switch (this.state) {
      case 'menu':
        this.updateMenu(dt);
        break;
      case 'playing': {
        if (this.input.consume('pause')) {
          this.pause();
          break;
        }
        const w = this.world!;
        // passo fixo de simulação (60 Hz) para combate e colisões
        this.accumulator += dt;
        const step = 1 / 60;
        let n = 0;
        while (this.accumulator >= step && n < 4) {
          w.update(step);
          this.accumulator -= step;
          n++;
          if (this.state !== 'playing') break;
        }
        if (n === 4) this.accumulator = 0;
        this.hud.update(w, dt);
        break;
      }
      case 'cards': {
        const i = this.input;
        if (i.consume('card1')) void this.pickCard(0);
        else if (i.consume('card2')) void this.pickCard(1);
        else if (i.consume('card3')) void this.pickCard(2);
        else if (i.consume('left')) this.menus.moveCardFocus(-1);
        else if (i.consume('right')) this.menus.moveCardFocus(1);
        else if (i.consume('confirm')) void this.pickCard(this.menus.focusedCard);
        i.consume('pause');
        i.consume('dash');
        i.consume('pulse');
        break;
      }
      case 'paused':
        if (this.input.consume('pause') && this.menus.current === 'pause') this.resume();
        break;
      default:
        this.input.clearPressed();
    }
    if (this.world && this.state !== 'menu') {
      // efeitos visuais seguem leves enquanto o menu de pausa está aberto? não: a simulação congela.
      this.world.render();
    }
    this.updateMs += (performance.now() - t0 - this.updateMs) * 0.1;
    if (this.debugOn) {
      const w = this.world;
      this.menus.debug(
        `FPS ${this.fpsSmooth.toFixed(0)}  update ${this.updateMs.toFixed(2)} ms\n` +
          (w
            ? `inimigos ${w.enemies.aliveCount}  projéteis ${w.projectiles.count}\npartículas ${w.particles.count}  perigos ${w.hazards.count}  coletáveis ${w.pickups.count}\nqualidade ${this.quality}  zoom ${w.zoom}`
            : 'menu'),
      );
    } else this.menus.debug(null);
  }

  private updateMenu(dt: number): void {
    this.menuT += dt;
    if (this.menuArt) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.menuArt.position.set(this.menuArtX() + Math.sin(this.menuT * 0.15) * 10, h / 2 + Math.cos(this.menuT * 0.12) * 6);
      if (Math.random() < dt * 30) {
        this.menuParticles.emit({
          tex: this.assets.tex('fx', 'ember'), x: Math.random() * w, y: h + 10, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 70,
          life: 4 + Math.random() * 3, s0: 2 + Math.random() * 3, s1: 0.5, a0: 0.9, a1: 0, tint: Math.random() < 0.2 ? 0x9ff4ff : 0xffb050,
        });
      }
    }
    this.menuParticles.update(dt);
  }

  /** depuração / testes automatizados (apenas com ?debug) */
  debugSpawn(n: number, type = 'rust'): void {
    const w = this.world;
    if (!w) return;
    for (let i = 0; i < n; i++) {
      const p = w.director.spawnPoint('around');
      if (p) w.enemies.spawn(type, p.x, p.y);
    }
  }
}
