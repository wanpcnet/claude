import { Matrix } from 'pixi.js';

/**
 * Projeção da câmera. O jogo é 2D em visão de cima (3/4): mundo e tela coincidem, e a altura
 * visual (pulos, projéteis, efeitos) é aplicada como deslocamento vertical. A classe mantém a
 * mesma interface usada pelos sistemas (x, y, profundidade, ângulos, matriz das camadas do chão).
 */
export class Iso {
  ox = 0;
  oy = 0;
  readonly s = 1;

  setArena(_worldH: number): void {
    this.ox = 0;
    this.oy = 0;
  }

  x(wx: number, _wy: number): number {
    return wx;
  }

  y(_wx: number, wy: number): number {
    return wy;
  }

  /** profundidade para ordenação (maior = mais à frente) */
  depth(_wx: number, wy: number): number {
    return wy;
  }

  angle(dx: number, dy: number): number {
    return Math.atan2(dy, dx);
  }

  screenDirToWorld(sx: number, sy: number): { x: number; y: number } {
    const l = Math.hypot(sx, sy);
    return l > 1e-6 ? { x: sx / l, y: sy / l } : { x: 0, y: 0 };
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx, y: sy };
  }

  matrix(): Matrix {
    return new Matrix();
  }
}

/** instância compartilhada (uma arena ativa por vez) */
export const iso = new Iso();
