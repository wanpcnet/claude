/**
 * Grade espacial com listas encadeadas em arrays tipados: reconstruída a cada passo,
 * sem alocação durante a horda. Itens são índices inteiros (id na pool).
 */
export class SpatialHash {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  private head: Int32Array;
  private next: Int32Array;
  private result: number[] = [];

  constructor(width: number, height: number, cell: number, capacity: number) {
    this.cell = cell;
    this.cols = Math.ceil(width / cell) + 1;
    this.rows = Math.ceil(height / cell) + 1;
    this.head = new Int32Array(this.cols * this.rows).fill(-1);
    this.next = new Int32Array(capacity).fill(-1);
  }

  clear(): void {
    this.head.fill(-1);
  }

  private key(x: number, y: number): number {
    let cx = Math.floor(x / this.cell);
    let cy = Math.floor(y / this.cell);
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  insert(id: number, x: number, y: number): void {
    const k = this.key(x, y);
    this.next[id] = this.head[k];
    this.head[k] = id;
  }

  /** Retorna ids nas células que intersectam o círculo (verificação fina é do chamador). O array é reutilizado. */
  query(x: number, y: number, r: number): number[] {
    const out = this.result;
    out.length = 0;
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r) / c));
    const x1 = Math.min(this.cols - 1, Math.floor((x + r) / c));
    const y0 = Math.max(0, Math.floor((y - r) / c));
    const y1 = Math.min(this.rows - 1, Math.floor((y + r) / c));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        let id = this.head[cy * this.cols + cx];
        while (id !== -1) {
          out.push(id);
          id = this.next[id];
        }
      }
    }
    return out;
  }

  /** Variante que copia o resultado (para consultas aninhadas). */
  queryCopy(x: number, y: number, r: number): number[] {
    return this.query(x, y, r).slice();
  }
}
