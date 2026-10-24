import type { Build } from '../content/upgrades';

export const SAVE_VERSION = 2;
const KEY = 'veu-de-brasas.save';

export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  music: number;
  sfx: number;
  quality: Quality | 'auto';
  reduceFlash: boolean;
  reduceShake: boolean;
  uiScale: number;
  manualAim: boolean;
  damageNumbers: boolean;
}

export interface RunSnapshot {
  act: number;
  level: number;
  xp: number;
  build: Build;
  kills: number;
  time: number;
  cardsTaken: string[];
  coins: number;
  rerolls: number;
  hp: number;
}

export interface SaveData {
  version: number;
  settings: Settings;
  ashes: number;
  unlocked: string[];
  selectedSkin: string;
  modifiers: string[];
  bestTime: number;
  victories: number;
  runs: number;
  checkpoint: RunSnapshot | null;
}

export const DEFAULT_SETTINGS: Settings = {
  music: 0.6,
  sfx: 0.8,
  quality: 'auto',
  reduceFlash: false,
  reduceShake: false,
  uiScale: 1,
  manualAim: false,
  damageNumbers: true,
};

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    ashes: 0,
    unlocked: ['skin_ember'],
    selectedSkin: 'skin_ember',
    modifiers: [],
    bestTime: 0,
    victories: 0,
    runs: 0,
    checkpoint: null,
  };
}

/** Recupera dados ausentes/corrompidos sem perder o que é válido. */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData> & { version?: number };
  const out: SaveData = { ...base };
  if (typeof r.ashes === 'number' && isFinite(r.ashes)) out.ashes = Math.max(0, Math.floor(r.ashes));
  if (Array.isArray(r.unlocked)) out.unlocked = Array.from(new Set([...base.unlocked, ...r.unlocked.filter((s) => typeof s === 'string')]));
  if (typeof r.selectedSkin === 'string' && out.unlocked.includes(r.selectedSkin)) out.selectedSkin = r.selectedSkin;
  if (Array.isArray(r.modifiers)) out.modifiers = r.modifiers.filter((s) => typeof s === 'string' && out.unlocked.includes(s));
  if (typeof r.bestTime === 'number') out.bestTime = r.bestTime;
  if (typeof r.victories === 'number') out.victories = r.victories;
  if (typeof r.runs === 'number') out.runs = r.runs;
  if (r.settings && typeof r.settings === 'object') {
    const s = r.settings as Partial<Settings>;
    const d = DEFAULT_SETTINGS;
    out.settings = {
      music: num(s.music, d.music, 0, 1),
      sfx: num(s.sfx, d.sfx, 0, 1),
      quality: s.quality === 'low' || s.quality === 'medium' || s.quality === 'high' || s.quality === 'auto' ? s.quality : d.quality,
      reduceFlash: typeof s.reduceFlash === 'boolean' ? s.reduceFlash : d.reduceFlash,
      reduceShake: typeof s.reduceShake === 'boolean' ? s.reduceShake : d.reduceShake,
      uiScale: num(s.uiScale, d.uiScale, 0.75, 1.5),
      manualAim: typeof s.manualAim === 'boolean' ? s.manualAim : d.manualAim,
      damageNumbers: typeof s.damageNumbers === 'boolean' ? s.damageNumbers : d.damageNumbers,
    };
  }
  // versão 1 não tinha checkpoint: aceita apenas se o formato bater
  const cp = r.checkpoint as RunSnapshot | null | undefined;
  if (r.version === SAVE_VERSION && cp && typeof cp.act === 'number' && cp.build && typeof cp.build === 'object' && cp.build.weapons) {
    out.checkpoint = {
      ...cp,
      build: { weapons: { ...cp.build.weapons }, passives: { ...(cp.build.passives ?? {}) }, flags: { ...(cp.build.flags ?? {}) } },
      cardsTaken: Array.isArray(cp.cardsTaken) ? cp.cardsTaken : [],
    };
  }
  return out;
}

function num(v: unknown, d: number, lo: number, hi: number): number {
  return typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
}

export class SaveStore {
  data: SaveData;
  constructor(private storage: Storage | null = safeStorage()) {
    this.data = this.load();
  }
  load(): SaveData {
    try {
      const txt = this.storage?.getItem(KEY);
      return migrate(txt ? JSON.parse(txt) : null);
    } catch {
      return defaultSave();
    }
  }
  save(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* armazenamento indisponível (modo privado): o jogo continua sem persistência */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Itens de meta progressão comprados com Cinzas Eternas. */
export const META_ITEMS = [
  { id: 'skin_ember', kind: 'skin', name: 'Coroa de Brasa', desc: 'O aro original, ouro e fogo.', cost: 0, tint: 0xffffff, flame: 'flame' },
  { id: 'skin_aurora', kind: 'skin', name: 'Coroa Aurora', desc: 'Chamas azul-gélidas dançam no aro.', cost: 120, tint: 0x9ad8ff, flame: 'flame_blue' },
  { id: 'skin_eclipse', kind: 'skin', name: 'Coroa Eclipse', desc: 'Runas violetas e brasas escurecidas.', cost: 260, tint: 0xc8a0ff, flame: 'flame' },
  { id: 'mod_breeze', kind: 'mod', name: 'Brisa Inicial', desc: 'Começa a partida com Vento Cinéreo.', cost: 90, tint: 0, flame: '' },
  { id: 'mod_blessing', kind: 'mod', name: 'Bênção do Véu', desc: '+1 renovação de cartas por ato.', cost: 160, tint: 0, flame: '' },
  { id: 'mod_tide', kind: 'mod', name: 'Maré Faminta', desc: 'Desafio: +30% de inimigos, +60% de Cinzas Eternas.', cost: 60, tint: 0, flame: '' },
] as const;
