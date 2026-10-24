import { Matrix } from 'pixi.js';

/**
 * Projeção isométrica 2:1. A simulação inteira continua em coordenadas de mundo (x, y no plano
 * do chão); só a renderização projeta:  sx = (x − y)·S + OX ,  sy = (x + y)·S/2 + OY.
 * Os mesmos parâmetros são usados pelo bake do solo (scripts/art/ground.py).
 */
export const ISO_S = 0.75;
export const ISO_PAD_T = 48;

export class Iso {
  ox = 0;
  oy = ISO_PAD_T;
  readonly s = ISO_S;

  /** configura a origem para uma arena de altura `worldH` (px de mundo) */
  setArena(worldH: number): void {
    this.ox = worldH * this.s;
    this.oy = ISO_PAD_T;
  }

  x(wx: number, wy: number): number {
    return (wx - wy) * this.s + this.ox;
  }

  y(wx: number, wy: number): number {
    return (wx + wy) * this.s * 0.5 + this.oy;
  }

  /** profundidade para ordenação (maior = mais à frente) */
  depth(wx: number, wy: number): number {
    return wx + wy;
  }

  /** ângulo na tela de uma direção do mundo */
  angle(dx: number, dy: number): number {
    return Math.atan2((dx + dy) * 0.5, dx - dy);
  }

  /** direção da tela → direção do mundo (normalizada) */
  screenDirToWorld(sx: number, sy: number): { x: number; y: number } {
    const x = sx + 2 * sy;
    const y = 2 * sy - sx;
    const l = Math.hypot(x, y);
    return l > 1e-6 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  /** ponto da tela (já sem zoom/câmera) → mundo */
  toWorld(sx: number, sy: number): { x: number; y: number } {
    const a = (sx - this.ox) / this.s; // x − y
    const b = ((sy - this.oy) * 2) / this.s; // x + y
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  /** matriz para camadas "deitadas" no chão (sombras, avisos, coroa, luzes) */
  matrix(): Matrix {
    return new Matrix(this.s, this.s * 0.5, -this.s, this.s * 0.5, this.ox, this.oy);
  }
}

/** instância compartilhada (uma arena ativa por vez) */
export const iso = new Iso();
