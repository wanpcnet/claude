import { Container, Sprite } from 'pixi.js';
import type { AssetLoader } from '../game/AssetLoader';
import { BLOCKING, normalizedRows, type MapData } from '../content/maps';
import { PROPS } from '../content/props';

export interface PropInst {
  sprite: Sprite;
  x: number;
  y: number;
  r: number;
  id: string;
}

export interface StaticLight {
  x: number;
  y: number;
  color: number;
  radius: number;
  flicker: boolean;
  phase: number;
}

const MARKERS = new Set(['@', 'A', 'E', 'B']);

/**
 * Arena autoral: solo pré-renderizado em chunks fixos, props posicionados no layout ASCII,
 * grade de navegação, campo de fluxo para a horda e colisão com terreno/props.
 */
export class Arena {
  readonly map: MapData;
  readonly tile: number;
  readonly cols: number;
  readonly rows: number;
  readonly width: number;
  readonly height: number;
  readonly blocked: Uint8Array;
  readonly props: PropInst[] = [];
  readonly lights: StaticLight[] = [];
  readonly markers = new Map<string, { x: number; y: number }>();
  private propBuckets = new Map<number, PropInst[]>();
  private dist: Int32Array;
  readonly flowX: Float32Array;
  readonly flowY: Float32Array;
  private flowCell = -1;
  private queue: Int32Array;
  readonly lines: string[];
  anchorSprite: Sprite | null = null;

  constructor(map: MapData) {
    this.map = map;
    this.tile = map.tile;
    this.cols = map.width;
    this.rows = map.height;
    this.width = this.cols * this.tile;
    this.height = this.rows * this.tile;
    this.lines = normalizedRows(map);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const ch = this.lines[y][x];
        if (BLOCKING.has(ch)) this.blocked[y * this.cols + x] = 1;
        if (MARKERS.has(ch)) this.markers.set(ch, { x: x * this.tile + this.tile / 2, y: y * this.tile + this.tile / 2 });
      }
    }
    this.dist = new Int32Array(this.cols * this.rows);
    this.flowX = new Float32Array(this.cols * this.rows);
    this.flowY = new Float32Array(this.cols * this.rows);
    this.queue = new Int32Array(this.cols * this.rows);
  }

  /** Monta sprites do solo e dos props nas camadas recebidas. */
  build(assets: AssetLoader, ground: { tex: import('pixi.js').Texture; x: number; y: number }[], groundLayer: Container, lowLayer: Container, entityLayer: Container): void {
    for (const g of ground) {
      const s = new Sprite(g.tex);
      s.position.set(g.x, g.y);
      groundLayer.addChild(s);
    }
    const T = this.tile;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const ch = this.lines[y][x];
        const cx = x * T + T / 2;
        const cy = y * T + T * 0.8;
        if (ch === 'A') {
          const s = new Sprite(assets.tex('props', 'anchor_off'));
          s.anchor.set(0.5, 0.94);
          s.position.set(cx, cy - 26);
          s.zIndex = cy - 26;
          entityLayer.addChild(s);
          this.anchorSprite = s;
          this.addCollider({ sprite: s, x: cx, y: cy - 28, r: 13, id: 'anchor' });
          continue;
        }
        const id = this.map.legend[ch];
        if (!id) continue;
        const def = PROPS[id];
        if (!def) continue;
        const variant = (x * 7 + y * 13) % def.variants;
        const s = new Sprite(assets.tex('props', `${id}_${variant}`));
        s.anchor.set(0.5, id === 'rift' ? 0.5 : 0.92);
        s.position.set(cx, cy);
        if ((x * 31 + y * 17) % 2 === 1 && id !== 'monument' && id !== 'altar' && id !== 'rift' && id !== 'copper_sigil') s.scale.x = -1;
        if (def.low) lowLayer.addChild(s);
        else {
          s.zIndex = cy;
          entityLayer.addChild(s);
        }
        const inst: PropInst = { sprite: s, x: cx, y: cy - 2, r: def.collider, id };
        this.props.push(inst);
        if (def.collider > 0) this.addCollider(inst);
        if (def.light) {
          this.lights.push({ x: cx, y: cy + (def.light.oy ?? 0), color: def.light.color, radius: def.light.radius, flicker: !!def.light.flicker, phase: (x * 13 + y * 7) % 10 });
        }
      }
    }
    // props grandes também bloqueiam o campo de fluxo (para a horda contorná-los)
    for (const p of this.props) {
      if (p.r < 9) continue;
      const r = p.r + 6;
      for (let gy = Math.floor((p.y - r) / T); gy <= Math.floor((p.y + r) / T); gy++) {
        for (let gx = Math.floor((p.x - r) / T); gx <= Math.floor((p.x + r) / T); gx++) {
          const ccx = gx * T + T / 2;
          const ccy = gy * T + T / 2;
          if ((ccx - p.x) ** 2 + (ccy - p.y) ** 2 < r * r && gx >= 0 && gy >= 0 && gx < this.cols && gy < this.rows) this.blocked[gy * this.cols + gx] = 2;
        }
      }
    }
  }

  private addCollider(p: PropInst): void {
    const k = this.bucketKey(p.x, p.y);
    let b = this.propBuckets.get(k);
    if (!b) this.propBuckets.set(k, (b = []));
    b.push(p);
  }

  private bucketKey(x: number, y: number): number {
    return Math.floor(y / 128) * 1000 + Math.floor(x / 128);
  }

  cellBlocked(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.blocked[cy * this.cols + cx] === 1;
  }

  isBlocked(x: number, y: number): boolean {
    return this.cellBlocked(Math.floor(x / this.tile), Math.floor(y / this.tile));
  }

  /** Verdadeiro se o ponto está livre de terreno e de props sólidos. */
  isWalkable(x: number, y: number, r = 8): boolean {
    if (this.isBlocked(x, y)) return false;
    const T = this.tile;
    const cx = Math.floor(x / T);
    const cy = Math.floor(y / T);
    if (this.blocked[cy * this.cols + cx] === 2) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (this.cellBlocked(cx + dx, cy + dy)) {
        const rx = (cx + dx) * T;
        const ry = (cy + dy) * T;
        const px = Math.max(rx, Math.min(x, rx + T));
        const py = Math.max(ry, Math.min(y, ry + T));
        if ((px - x) ** 2 + (py - y) ** 2 < r * r) return false;
      }
    }
    return true;
  }

  /** Empurra um círculo para fora do terreno bloqueado e dos colisores de props. */
  resolve(pos: { x: number; y: number }, r: number, props = true): boolean {
    const T = this.tile;
    let hit = false;
    const x0 = Math.floor((pos.x - r) / T);
    const x1 = Math.floor((pos.x + r) / T);
    const y0 = Math.floor((pos.y - r) / T);
    const y1 = Math.floor((pos.y + r) / T);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (!this.cellBlocked(cx, cy)) continue;
        const rx = cx * T;
        const ry = cy * T;
        const px = Math.max(rx, Math.min(pos.x, rx + T));
        const py = Math.max(ry, Math.min(pos.y, ry + T));
        let dx = pos.x - px;
        let dy = pos.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          hit = true;
          if (d2 < 1e-6) {
            // centro dentro do bloco: empurra para a face mais próxima
            const left = pos.x - rx;
            const right = rx + T - pos.x;
            const top = pos.y - ry;
            const bottom = ry + T - pos.y;
            const m = Math.min(left, right, top, bottom);
            if (m === left) pos.x = rx - r;
            else if (m === right) pos.x = rx + T + r;
            else if (m === top) pos.y = ry - r;
            else pos.y = ry + T + r;
          } else {
            const d = Math.sqrt(d2);
            dx /= d;
            dy /= d;
            pos.x = px + dx * r;
            pos.y = py + dy * r;
          }
        }
      }
    }
    if (props) {
      const bx = Math.floor(pos.x / 128);
      const by = Math.floor(pos.y / 128);
      for (let gy = by - 1; gy <= by + 1; gy++) {
        for (let gx = bx - 1; gx <= bx + 1; gx++) {
          const b = this.propBuckets.get(gy * 1000 + gx);
          if (!b) continue;
          for (const p of b) {
            const dx = pos.x - p.x;
            const dy = (pos.y - p.y) * 1.25;
            const rr = r + p.r;
            const d2 = dx * dx + dy * dy;
            if (d2 < rr * rr && d2 > 1e-6) {
              const d = Math.sqrt(d2);
              pos.x = p.x + (dx / d) * rr;
              pos.y = p.y + ((dy / d) * rr) / 1.25;
              hit = true;
            }
          }
        }
      }
    }
    pos.x = Math.max(r, Math.min(this.width - r, pos.x));
    pos.y = Math.max(r, Math.min(this.height - r, pos.y));
    return hit;
  }

  /** BFS a partir da célula do herói; cada célula aponta para o vizinho mais próximo do alvo. */
  updateFlow(tx: number, ty: number, force = false): void {
    const T = this.tile;
    const gx = Math.max(0, Math.min(this.cols - 1, Math.floor(tx / T)));
    const gy = Math.max(0, Math.min(this.rows - 1, Math.floor(ty / T)));
    const start = gy * this.cols + gx;
    if (!force && start === this.flowCell) return;
    this.flowCell = start;
    const C = this.cols;
    const dist = this.dist;
    dist.fill(0x3fffffff);
    const q = this.queue;
    let qh = 0;
    let qt = 0;
    dist[start] = 0;
    q[qt++] = start;
    while (qh < qt) {
      const c = q[qh++];
      const cx = c % C;
      const cy = (c - cx) / C;
      const nd = dist[c] + 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= C || ny >= this.rows) continue;
          const n = ny * C + nx;
          if (this.blocked[n]) continue;
          if (dx && dy && (this.blocked[cy * C + nx] || this.blocked[ny * C + cx])) continue;
          const cost = nd + (dx && dy ? 0.41 : 0);
          if (cost < dist[n]) {
            dist[n] = cost | 0;
            if (dist[n] === 0x3fffffff) continue;
            q[qt++] = n;
          }
        }
      }
    }
    for (let c = 0; c < dist.length; c++) {
      this.flowX[c] = 0;
      this.flowY[c] = 0;
      if (this.blocked[c] || dist[c] >= 0x3fffffff) continue;
      const cx = c % C;
      const cy = (c - cx) / C;
      let best = dist[c];
      let bx = 0;
      let by = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= C || ny >= this.rows) continue;
          const n = ny * C + nx;
          if (this.blocked[n]) continue;
          if (dx && dy && (this.blocked[cy * C + nx] || this.blocked[ny * C + cx])) continue;
          if (dist[n] < best) {
            best = dist[n];
            bx = dx;
            by = dy;
          }
        }
      }
      const l = Math.hypot(bx, by) || 1;
      this.flowX[c] = bx / l;
      this.flowY[c] = by / l;
    }
  }

  flowAt(x: number, y: number): { x: number; y: number; ok: boolean } {
    const gx = Math.floor(x / this.tile);
    const gy = Math.floor(y / this.tile);
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return { x: 0, y: 0, ok: false };
    const c = gy * this.cols + gx;
    return { x: this.flowX[c], y: this.flowY[c], ok: this.flowX[c] !== 0 || this.flowY[c] !== 0 };
  }

  /** Distância em células (BFS) até o herói; grande = inalcançável. */
  pathDist(x: number, y: number): number {
    const gx = Math.floor(x / this.tile);
    const gy = Math.floor(y / this.tile);
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return 1e9;
    return this.dist[gy * this.cols + gx];
  }

  /** Linha de visão no grid (para atiradores e mira). */
  lineClear(ax: number, ay: number, bx: number, by: number): boolean {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / (this.tile * 0.5));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      const c = this.blocked[Math.floor(y / this.tile) * this.cols + Math.floor(x / this.tile)];
      if (c === 1 && this.lines[Math.floor(y / this.tile)][Math.floor(x / this.tile)] === '#') return false;
    }
    return true;
  }

  zoneContains(zone: number[], x: number, y: number): boolean {
    const [zx, zy, zw, zh] = zone;
    const gx = x / this.tile;
    const gy = y / this.tile;
    return gx >= zx && gy >= zy && gx < zx + zw && gy < zy + zh;
  }
}
