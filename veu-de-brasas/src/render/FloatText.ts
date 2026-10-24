import { BitmapText, Container } from 'pixi.js';
import { Pool } from '../utils/Pool';

interface FT {
  active: boolean;
  t: BitmapText;
  life: number;
  vx: number;
  vy: number;
  big: boolean;
}

/** Números flutuantes (fonte bitmap autoral) — limitados para preservar leitura e FPS. */
export class FloatText {
  readonly layer = new Container();
  private pool: Pool<FT>;
  private budget = 0;
  enabled = true;

  constructor() {
    this.pool = new Pool<FT>(() => {
      const t = new BitmapText({ text: '0', style: { fontFamily: 'dmg', fontSize: 18 } });
      t.anchor.set(0.5);
      t.visible = false;
      this.layer.addChild(t);
      return { active: false, t, life: 0, vx: 0, vy: 0, big: false };
    }, 30, 50);
  }

  spawn(x: number, y: number, text: string, color: number, big = false): void {
    if (!this.enabled) return;
    if (!big) {
      if (this.budget <= 0) return;
      this.budget -= 1;
    }
    const f = this.pool.acquire();
    if (!f) return;
    f.t.text = text;
    f.t.tint = color;
    f.t.visible = true;
    f.t.position.set(x + (Math.random() - 0.5) * 8, y);
    f.t.scale.set(big ? 0.9 : 0.6);
    f.t.alpha = 1;
    f.life = 0;
    f.vx = (Math.random() - 0.5) * 30;
    f.vy = big ? -70 : -50;
    f.big = big;
  }

  update(dt: number): void {
    this.budget = Math.min(4, this.budget + dt * 12);
    for (const f of this.pool.items) {
      if (!f.active) continue;
      f.life += dt;
      const max = f.big ? 0.9 : 0.6;
      if (f.life >= max) {
        f.t.visible = false;
        this.pool.release(f);
        continue;
      }
      f.vy += 120 * dt;
      f.t.x += f.vx * dt;
      f.t.y += f.vy * dt;
      const t = f.life / max;
      const pop = t < 0.15 ? 1 + (0.15 - t) * 3 : 1;
      const base = f.big ? 0.9 : 0.6;
      f.t.scale.set(base * pop);
      f.t.alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
    }
  }

  clear(): void {
    for (const f of this.pool.items) f.t.visible = false;
    this.pool.releaseAll();
  }
}
