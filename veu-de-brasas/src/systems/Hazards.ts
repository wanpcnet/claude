import { Container, Sprite, Texture } from 'pixi.js';
import { Pool } from '../utils/Pool';
import { segDist2 } from '../utils/math';
import type { World } from '../world/World';

export type HazardKind = 'circle' | 'line' | 'cone' | 'ring';

export interface Hazard {
  active: boolean;
  kind: HazardKind;
  x: number;
  y: number;
  ang: number;
  r: number;
  len: number;
  w: number;
  half: number;
  delay: number;
  t: number;
  dmg: number;
  color: number;
  linger: number;
  lingerTick: number;
  ringSpeed: number;
  ringMax: number;
  ringGap: number;
  ringGapAng: number;
  hitDone: boolean;
  resolved: boolean;
  outline: Sprite;
  fill: Sprite;
  extra: Sprite;
  onResolve: (() => void) | null;
}

/**
 * Ataques telegrafados: o aviso texturizado aparece no solo, preenche durante o atraso e
 * só então causa dano. Nada atinge o jogador sem aviso.
 */
export class Hazards {
  readonly layer = new Container();
  readonly ringLayer = new Container();
  private pool: Pool<Hazard>;

  constructor(private w: World, private tex: { circle: Texture; line: Texture; cone: Texture; ring: Texture }) {
    this.ringLayer.blendMode = 'add';
    this.pool = new Pool<Hazard>(() => {
      const o = new Sprite(Texture.EMPTY);
      const f = new Sprite(Texture.EMPTY);
      const e = new Sprite(tex.ring);
      o.visible = f.visible = e.visible = false;
      e.anchor.set(0.5);
      this.layer.addChild(o, f);
      this.ringLayer.addChild(e);
      return {
        active: false, kind: 'circle', x: 0, y: 0, ang: 0, r: 0, len: 0, w: 0, half: 0, delay: 1, t: 0, dmg: 0, color: 0xff4030,
        linger: 0, lingerTick: 0, ringSpeed: 0, ringMax: 0, ringGap: 0, ringGapAng: 0, hitDone: false, resolved: false, outline: o, fill: f, extra: e, onResolve: null,
      };
    }, 24, 160);
  }

  get count(): number {
    return this.pool.activeCount;
  }

  private base(kind: HazardKind, x: number, y: number, delay: number, dmg: number, color: number): Hazard | null {
    const h = this.pool.acquire();
    if (!h) return null;
    h.kind = kind;
    h.x = x;
    h.y = y;
    h.delay = delay;
    h.t = 0;
    h.dmg = dmg;
    h.color = color;
    h.linger = 0;
    h.lingerTick = 0;
    h.hitDone = false;
    h.resolved = false;
    h.onResolve = null;
    h.ringGap = 0;
    h.outline.tint = h.fill.tint = color;
    h.outline.visible = h.fill.visible = true;
    h.extra.visible = false;
    h.outline.rotation = h.fill.rotation = 0;
    return h;
  }

  circle(x: number, y: number, r: number, delay: number, dmg: number, color = 0xff4030): Hazard | null {
    const h = this.base('circle', x, y, delay, dmg, color);
    if (!h) return null;
    h.r = r;
    for (const s of [h.outline, h.fill]) {
      s.texture = this.tex.circle;
      s.anchor.set(0.5);
      s.position.set(x, y);
    }
    h.outline.scale.set((r * 2) / 128, (r * 2 * 0.9) / 128);
    return h;
  }

  line(x: number, y: number, ang: number, len: number, w: number, delay: number, dmg: number, color = 0xff4030): Hazard | null {
    const h = this.base('line', x, y, delay, dmg, color);
    if (!h) return null;
    h.ang = ang;
    h.len = len;
    h.w = w;
    for (const s of [h.outline, h.fill]) {
      s.texture = this.tex.line;
      s.anchor.set(0, 0.5);
      s.position.set(x, y);
      s.rotation = ang;
    }
    h.outline.scale.set(len / 128, w / 24);
    return h;
  }

  cone(x: number, y: number, ang: number, len: number, half: number, delay: number, dmg: number, color = 0xff4030): Hazard | null {
    const h = this.base('cone', x, y, delay, dmg, color);
    if (!h) return null;
    h.ang = ang;
    h.len = len;
    h.half = half;
    for (const s of [h.outline, h.fill]) {
      s.texture = this.tex.cone;
      s.anchor.set(0, 0.5);
      s.position.set(x, y);
      s.rotation = ang;
    }
    const sy = Math.tan(half) / Math.tan((32 * Math.PI) / 180);
    h.outline.scale.set(len / 128, (len / 128) * sy);
    return h;
  }

  /** onda de choque expansiva; `gap` (rad) deixa uma abertura segura na direção gapAng */
  ring(x: number, y: number, delay: number, speed: number, max: number, width: number, dmg: number, color = 0xff8040, gap = 0, gapAng = 0): Hazard | null {
    const h = this.base('ring', x, y, delay, dmg, color);
    if (!h) return null;
    h.r = 0;
    h.ringSpeed = speed;
    h.ringMax = max;
    h.w = width;
    h.ringGap = gap;
    h.ringGapAng = gapAng;
    h.outline.texture = this.tex.circle;
    h.outline.anchor.set(0.5);
    h.outline.position.set(x, y);
    h.outline.scale.set(0.5, 0.45);
    h.fill.visible = false;
    h.extra.position.set(x, y);
    h.extra.tint = color;
    return h;
  }

  /** testa se o herói está na área do perigo */
  private inside(h: Hazard, px: number, py: number, pr: number): boolean {
    switch (h.kind) {
      case 'circle': {
        const dx = px - h.x;
        const dy = (py - h.y) / 0.9;
        return dx * dx + dy * dy <= (h.r + pr) ** 2;
      }
      case 'line': {
        const ex = h.x + Math.cos(h.ang) * h.len;
        const ey = h.y + Math.sin(h.ang) * h.len;
        return segDist2(px, py, h.x, h.y, ex, ey) <= (h.w / 2 + pr) ** 2;
      }
      case 'cone': {
        const dx = px - h.x;
        const dy = py - h.y;
        const d = Math.hypot(dx, dy);
        if (d > h.len + pr) return false;
        let da = Math.atan2(dy, dx) - h.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        return Math.abs(da) <= h.half + pr / Math.max(d, 1);
      }
      case 'ring': {
        const d = Math.hypot(px - h.x, py - h.y);
        if (Math.abs(d - h.r) > h.w / 2 + pr) return false;
        if (h.ringGap > 0) {
          let da = Math.atan2(py - h.y, px - h.x) - h.ringGapAng;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < h.ringGap / 2) return false;
        }
        return true;
      }
    }
  }

  update(dt: number): void {
    const hero = this.w.hero;
    for (const h of this.pool.items) {
      if (!h.active) continue;
      h.t += dt;
      const p = Math.min(1, h.t / h.delay);
      if (!h.resolved) {
        const pulse = 0.55 + Math.sin(h.t * 18) * 0.15 * p;
        h.outline.alpha = pulse;
        h.fill.alpha = 0.35 + p * 0.35;
        if (h.kind === 'circle') h.fill.scale.set(((h.r * 2) / 128) * p, ((h.r * 2 * 0.9) / 128) * p);
        else if (h.kind === 'line') h.fill.scale.set((h.len / 128) * p, h.w / 24);
        else if (h.kind === 'cone') h.fill.scale.set((h.len / 128) * p, h.outline.scale.y * p);
        else if (h.kind === 'ring') h.outline.alpha = 0.4 + Math.sin(h.t * 20) * 0.2;
        if (h.t >= h.delay) {
          h.resolved = true;
          h.t = 0;
          if (h.kind !== 'ring' && h.dmg > 0 && this.inside(h, hero.x, hero.y, 6)) this.w.damageHero(h.dmg, h.x, h.y);
          h.onResolve?.();
          if (h.kind === 'ring') {
            h.outline.visible = false;
            h.extra.visible = true;
          } else if (h.linger <= 0) {
            this.release(h);
          }
        }
        continue;
      }
      if (h.kind === 'ring') {
        h.r += h.ringSpeed * dt;
        const s = (h.r * 2) / (128 * 0.82);
        h.extra.scale.set(s, s * 0.92);
        h.extra.alpha = Math.min(1, (1 - h.r / h.ringMax) * 2);
        if (!h.hitDone && h.dmg > 0 && hero.z <= 0 && this.inside(h, hero.x, hero.y, 6)) {
          h.hitDone = true;
          this.w.damageHero(h.dmg, h.x, h.y);
        }
        if (h.r >= h.ringMax) this.release(h);
        continue;
      }
      // perigo persistente (raízes de coral do chefe)
      h.linger -= dt;
      h.lingerTick -= dt;
      h.outline.alpha = 0.6 + Math.sin(h.t * 12) * 0.2;
      h.fill.alpha = 0.6;
      if (h.lingerTick <= 0 && this.inside(h, hero.x, hero.y, 4)) {
        h.lingerTick = 0.5;
        this.w.damageHero(h.dmg * 0.5, h.x, h.y);
      }
      if (h.linger <= 0) this.release(h);
    }
  }

  release(h: Hazard): void {
    h.outline.visible = h.fill.visible = h.extra.visible = false;
    this.pool.release(h);
  }

  clear(): void {
    for (const h of this.pool.items) if (h.active) this.release(h);
  }
}
