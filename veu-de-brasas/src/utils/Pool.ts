/** Pool genérica de objetos reutilizáveis (inimigos, projéteis, partículas, números). */
export class Pool<T extends { active: boolean }> {
  readonly items: T[] = [];
  private free: T[] = [];
  constructor(private factory: (index: number) => T, initial = 0, private max = Infinity) {
    for (let i = 0; i < initial; i++) {
      const it = factory(this.items.length);
      it.active = false;
      this.items.push(it);
      this.free.push(it);
    }
  }
  get size(): number {
    return this.items.length;
  }
  get activeCount(): number {
    return this.items.length - this.free.length;
  }
  acquire(): T | null {
    let it = this.free.pop();
    if (!it) {
      if (this.items.length >= this.max) return null;
      it = this.factory(this.items.length);
      this.items.push(it);
    }
    it.active = true;
    return it;
  }
  release(it: T): void {
    if (!it.active) return;
    it.active = false;
    this.free.push(it);
  }
  releaseAll(): void {
    this.free.length = 0;
    for (const it of this.items) {
      it.active = false;
      this.free.push(it);
    }
  }
}
