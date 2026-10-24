import arenaA from './maps/arenaA.json';
import arenaB from './maps/arenaB.json';
import arenaC from './maps/arenaC.json';

export interface MapData {
  id: string;
  name: string;
  act: number;
  theme: string;
  music: string;
  ambient: string;
  fog: string;
  width: number;
  height: number;
  tile: number;
  legend: Record<string, string>;
  spawnZones: Record<string, number[]>;
  landmarks: { name: string; char: string }[];
  rows: string[];
}

export const MAPS: Record<string, MapData> = {
  arenaA: arenaA as MapData,
  arenaB: arenaB as MapData,
  arenaC: arenaC as MapData,
};

export const BLOCKING = new Set(['%', '#', '~']);

/** Normaliza as linhas (tolerância a linhas curtas na autoria). */
export function normalizedRows(m: MapData): string[] {
  const rows = m.rows.map((r) => r.padEnd(m.width, '%').slice(0, m.width));
  while (rows.length < m.height) rows.push('%'.repeat(m.width));
  return rows.slice(0, m.height);
}

export function findChar(m: MapData, ch: string): { x: number; y: number } | null {
  const rows = normalizedRows(m);
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y].indexOf(ch);
    if (x >= 0) return { x, y };
  }
  return null;
}
