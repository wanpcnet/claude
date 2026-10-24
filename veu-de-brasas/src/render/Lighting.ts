import { Container, Matrix, RenderTexture, Sprite, Texture, type Renderer } from 'pixi.js';
import type { StaticLight } from '../world/Arena';
import { Pool } from '../utils/Pool';

interface DynLight {
  active: boolean;
  sprite: Sprite;
  life: number;
  max: number;
  radius: number;
  intensity: number;
  follow: (() => { x: number; y: number }) | null;
}

/**
 * Mapa de luz: ambiente + luzes aditivas renderizadas em meia resolução,
 * depois multiplicadas sobre o mundo. Na qualidade Baixa, é desligado.
 */
export class Lighting {
  readonly root = new Container();
  readonly overlay: Sprite;
  private rt: RenderTexture;
  private staticSprites: { s: Sprite; l: StaticLight }[] = [];
  private pool: Pool<DynLight>;
  ambient: [number, number, number] = [0.55, 0.56, 0.7];
  enabled = true;
  private time = 0;
  private scale = 0.5;

  constructor(private lightTex: Texture, w: number, h: number) {
    this.rt = RenderTexture.create({ width: Math.max(2, Math.ceil(w * this.scale)), height: Math.max(2, Math.ceil(h * this.scale)) });
    this.overlay = new Sprite(this.rt);
    this.overlay.blendMode = 'multiply';
    this.overlay.scale.set(1 / this.scale);
    this.pool = new Pool<DynLight>(() => {
      const s = new Sprite(lightTex);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.visible = false;
      this.root.addChild(s);
      return { active: false, sprite: s, life: 0, max: 0, radius: 0, intensity: 1, follow: null };
    }, 40, 160);
  }

  resize(w: number, h: number): void {
    this.rt.resize(Math.max(2, Math.ceil(w * this.scale)), Math.max(2, Math.ceil(h * this.scale)));
    this.overlay.scale.set(1 / this.scale);
  }

  setStatic(lights: StaticLight[]): void {
    for (const s of this.staticSprites) s.s.destroy();
    this.staticSprites = [];
    for (const l of lights) {
      const s = new Sprite(this.lightTex);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.tint = l.color;
      s.position.set(l.x, l.y);
      s.scale.set((l.radius * 2) / 128);
      this.root.addChildAt(s, 0);
      this.staticSprites.push({ s, l });
    }
  }

  /** luz transitória (explosões, impactos) ou persistente que segue um alvo (life=Infinity) */
  flash(x: number, y: number, color: number, radius: number, life: number, intensity = 1, follow: DynLight['follow'] = null): DynLight | null {
    const d = this.pool.acquire();
    if (!d) return null;
    d.life = 0;
    d.max = life;
    d.radius = radius;
    d.intensity = intensity;
    d.follow = follow;
    d.sprite.visible = true;
    d.sprite.tint = color;
    d.sprite.position.set(x, y);
    d.sprite.scale.set((radius * 2) / 128);
    d.sprite.alpha = intensity;
    return d;
  }

  release(d: DynLight): void {
    d.sprite.visible = false;
    this.pool.release(d);
  }

  clearDynamic(): void {
    for (const d of this.pool.items) d.sprite.visible = false;
    this.pool.releaseAll();
  }

  update(dt: number): void {
    this.time += dt;
    for (const { s, l } of this.staticSprites) {
      if (l.flicker) {
        const f = 0.85 + Math.sin(this.time * 9 + l.phase) * 0.06 + Math.sin(this.time * 23 + l.phase * 3) * 0.05;
        s.alpha = f;
      }
    }
    for (const d of this.pool.items) {
      if (!d.active) continue;
      d.life += dt;
      if (d.follow) {
        const p = d.follow();
        d.sprite.position.set(p.x, p.y);
      }
      if (d.max !== Infinity) {
        if (d.life >= d.max) {
          this.release(d);
          continue;
        }
        const t = d.life / d.max;
        d.sprite.alpha = d.intensity * (1 - t) * (1 - t);
      }
    }
  }

  /** `ground` = matriz mundo → tela do plano do chão (projeção isométrica · zoom · câmera) */
  render(renderer: Renderer, ground: Matrix): void {
    if (!this.enabled) return;
    const m = ground.clone();
    m.a *= this.scale;
    m.b *= this.scale;
    m.c *= this.scale;
    m.d *= this.scale;
    m.tx *= this.scale;
    m.ty *= this.scale;
    this.root.setFromMatrix(m);
    renderer.render({ container: this.root, target: this.rt, clear: true, clearColor: [this.ambient[0], this.ambient[1], this.ambient[2], 1] });
  }
}
