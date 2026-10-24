/** Direções dos sprites pintados (SOV): 5 desenhadas + espelho horizontal para o lado oeste. */
export type SrcDir = 'S' | 'SE' | 'E' | 'NE' | 'N';

export interface Facing {
  src: SrcDir;
  flip: boolean;
}

const TABLE: Facing[] = [
  { src: 'E', flip: false },
  { src: 'SE', flip: false },
  { src: 'S', flip: false },
  { src: 'SE', flip: true },
  { src: 'E', flip: true },
  { src: 'NE', flip: true },
  { src: 'N', flip: false },
  { src: 'NE', flip: false },
];

/** direção da tela (dx, dy) → quadro de origem e espelhamento */
export function dir8(dx: number, dy: number, prev?: Facing): Facing {
  if (!dx && !dy) return prev ?? TABLE[2];
  const a = Math.atan2(dy, dx);
  const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return TABLE[i];
}
