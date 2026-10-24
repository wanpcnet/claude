/** Entrada unificada: teclado, mouse, toque (joystick virtual) e gamepad. */
export type Action = 'dash' | 'pulse' | 'ult' | 'pause' | 'card1' | 'card2' | 'card3' | 'confirm' | 'left' | 'right' | 'debug';

export class InputManager {
  private keys = new Set<string>();
  private pressed = new Set<Action>();
  mouseX = 0;
  mouseY = 0;
  mouseInside = false;
  /** vetor do joystick virtual (-1..1) */
  touchX = 0;
  touchY = 0;
  touchActive = false;
  usingTouch = false;
  usingGamepad = false;
  private padPrev: boolean[] = [];
  private listeners: [EventTarget, string, EventListener][] = [];

  constructor(target: HTMLElement) {
    this.on(window, 'keydown', (e) => this.onKey(e as KeyboardEvent, true));
    this.on(window, 'keyup', (e) => this.onKey(e as KeyboardEvent, false));
    this.on(window, 'blur', () => this.keys.clear());
    this.on(target, 'pointermove', (e) => {
      const p = e as PointerEvent;
      this.mouseX = p.clientX;
      this.mouseY = p.clientY;
      this.mouseInside = true;
      if (p.pointerType === 'mouse') this.usingTouch = false;
    });
    this.on(target, 'pointerleave', () => (this.mouseInside = false));
    this.on(window, 'touchstart', () => (this.usingTouch = true));
  }

  private on(t: EventTarget, ev: string, fn: EventListener): void {
    t.addEventListener(ev, fn, { passive: false } as AddEventListenerOptions);
    this.listeners.push([t, ev, fn]);
  }

  destroy(): void {
    for (const [t, ev, fn] of this.listeners) t.removeEventListener(ev, fn);
    this.listeners = [];
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const k = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
    if (down) {
      if (!this.keys.has(k)) {
        const a = this.mapAction(k);
        if (a) this.pressed.add(a);
      }
      this.keys.add(k);
    } else this.keys.delete(k);
  }

  private mapAction(k: string): Action | null {
    switch (k) {
      case 'Space': return 'dash';
      case 'ShiftLeft': return 'dash';
      case 'KeyQ': return 'pulse';
      case 'KeyE': return 'pulse';
      case 'KeyR': return 'ult';
      case 'Escape': return 'pause';
      case 'KeyP': return 'pause';
      case 'Digit1': case 'Numpad1': return 'card1';
      case 'Digit2': case 'Numpad2': return 'card2';
      case 'Digit3': case 'Numpad3': return 'card3';
      case 'Enter': return 'confirm';
      case 'ArrowLeft': case 'KeyA': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
      case 'F3': case 'Backquote': return 'debug';
      default: return null;
    }
  }

  press(a: Action): void {
    this.pressed.add(a);
  }

  /** consome uma ação disparada desde o último quadro */
  consume(a: Action): boolean {
    if (this.pressed.has(a)) {
      this.pressed.delete(a);
      return true;
    }
    return false;
  }

  clearPressed(): void {
    this.pressed.clear();
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** vetor de movimento normalizado */
  move(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.touchActive) {
      x += this.touchX;
      y += this.touchY;
    }
    const pad = this.padMove;
    x += pad.x;
    y += pad.y;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }

  private padMove = { x: 0, y: 0 };

  /** amostra o gamepad uma vez por quadro */
  pollGamepad(): void {
    this.padMove.x = 0;
    this.padMove.y = 0;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(pads ?? []).find((p) => p && p.connected);
    if (!gp) return;
    const dz = 0.22;
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    if (Math.hypot(ax, ay) > dz) {
      this.padMove.x = ax;
      this.padMove.y = ay;
      this.usingGamepad = true;
    }
    const map: [number, Action][] = [[0, 'dash'], [1, 'pulse'], [2, 'pulse'], [9, 'pause'], [14, 'left'], [15, 'right'], [4, 'card1'], [3, 'card2'], [5, 'card3'], [6, 'ult'], [7, 'ult']];
    for (const [i, a] of map) {
      const down = !!gp.buttons[i]?.pressed;
      if (down && !this.padPrev[i]) {
        this.pressed.add(a);
        if (a === 'dash') this.pressed.add('confirm');
        this.usingGamepad = true;
      }
      this.padPrev[i] = down;
    }
  }
}
