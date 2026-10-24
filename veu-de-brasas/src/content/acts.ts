/** Roteiro autorado das três partes da campanha: ondas, objetivos, elites e chefes. */
export type Side = 'north' | 'south' | 'east' | 'west';

export interface WaveEvent {
  t: number;
  enemy: string;
  count: number;
  side: Side | 'around';
  formation: 'arc' | 'cluster' | 'ring';
}

export interface AmbientPhase {
  from: number;
  target: number;
  rate: number;
  mix: Record<string, number>;
}

export type Stage =
  | { type: 'kills'; goal: number; text: string }
  | { type: 'elite'; enemy: string; at: string; text: string }
  | { type: 'anchor'; channel: number; text: string }
  | { type: 'boss'; boss: 'toad' | 'heart'; at: string; text: string };

export interface ActScript {
  map: 'arenaA' | 'arenaB' | 'arenaC';
  title: string;
  subtitle: string;
  stages: Stage[];
  ambient: AmbientPhase[];
  bossAmbient: AmbientPhase;
  channelAmbient: AmbientPhase;
  waves: WaveEvent[];
  hints: { t: number; text: string }[];
}

export const ACTS: ActScript[] = [
  {
    map: 'arenaA',
    title: 'Ato I — Jardim das Cinzas',
    subtitle: 'Reacenda a primeira Âncora do Véu',
    stages: [
      { type: 'kills', goal: 90, text: 'Dissipe a maré para despertar a Âncora' },
      { type: 'anchor', channel: 18, text: 'Reacenda a Âncora: permaneça no círculo' },
      { type: 'elite', enemy: 'guardian', at: 'A', text: 'Derrote o Guardião de Coral' },
    ],
    ambient: [
      { from: 0, target: 14, rate: 2.2, mix: { rust: 1 } },
      { from: 30, target: 34, rate: 4, mix: { rust: 4, spider: 1 } },
      { from: 75, target: 60, rate: 6, mix: { rust: 4, spider: 2, slime: 1 } },
      { from: 140, target: 90, rate: 8, mix: { rust: 5, spider: 2, slime: 1, frog: 1 } },
      { from: 210, target: 120, rate: 10, mix: { rust: 5, spider: 3, slime: 2, frog: 1 } },
    ],
    channelAmbient: { from: 0, target: 140, rate: 14, mix: { rust: 6, spider: 3, slime: 1, frog: 1 } },
    bossAmbient: { from: 0, target: 40, rate: 4, mix: { rust: 3, spider: 1 } },
    waves: [
      { t: 42, enemy: 'rust', count: 26, side: 'east', formation: 'arc' },
      { t: 70, enemy: 'spider', count: 12, side: 'west', formation: 'arc' },
      { t: 100, enemy: 'rust', count: 40, side: 'around', formation: 'ring' },
      { t: 135, enemy: 'slime', count: 8, side: 'north', formation: 'cluster' },
      { t: 165, enemy: 'rust', count: 50, side: 'south', formation: 'arc' },
      { t: 200, enemy: 'frog', count: 8, side: 'east', formation: 'cluster' },
      { t: 235, enemy: 'rust', count: 60, side: 'around', formation: 'ring' },
      { t: 270, enemy: 'spider', count: 24, side: 'north', formation: 'arc' },
      { t: 300, enemy: 'rust', count: 70, side: 'around', formation: 'ring' },
    ],
    hints: [
      { t: 1, text: 'WASD / setas para mover — os ataques são automáticos' },
      { t: 12, text: 'ESPAÇO: esquiva rápida com invulnerabilidade' },
      { t: 26, text: 'Q: Pulso da Coroa — gasta energia e empurra a horda' },
      { t: 45, text: 'Colete fragmentos de experiência para escolher melhorias' },
    ],
  },
  {
    map: 'arenaB',
    title: 'Ato II — Bosque de Vidro',
    subtitle: 'O vidro canta onde a fenda respira',
    stages: [
      { type: 'kills', goal: 130, text: 'Abra caminho pelo Bosque de Vidro' },
      { type: 'elite', enemy: 'priestess', at: 'E', text: 'A Sacerdotisa de Vidro guarda a praça' },
      { type: 'anchor', channel: 22, text: 'Reacenda a segunda Âncora atrás das formações' },
      { type: 'boss', boss: 'toad', at: 'E', text: 'O Batráquio Colossal desperta!' },
    ],
    ambient: [
      { from: 0, target: 50, rate: 6, mix: { rust: 4, spider: 2, wasp: 2 } },
      { from: 60, target: 90, rate: 8, mix: { rust: 4, spider: 2, wasp: 2, ghost: 1, slime: 1 } },
      { from: 140, target: 140, rate: 11, mix: { rust: 5, spider: 3, wasp: 3, ghost: 2, frog: 1, shell: 1 } },
      { from: 240, target: 180, rate: 13, mix: { rust: 6, spider: 3, wasp: 3, ghost: 2, frog: 2, shell: 1 } },
    ],
    channelAmbient: { from: 0, target: 200, rate: 16, mix: { rust: 6, spider: 3, wasp: 3, ghost: 2, shell: 1 } },
    bossAmbient: { from: 0, target: 50, rate: 4, mix: { rust: 3, frog: 1, wasp: 1 } },
    waves: [
      { t: 20, enemy: 'wasp', count: 10, side: 'north', formation: 'arc' },
      { t: 50, enemy: 'rust', count: 50, side: 'around', formation: 'ring' },
      { t: 85, enemy: 'shell', count: 5, side: 'east', formation: 'cluster' },
      { t: 115, enemy: 'ghost', count: 10, side: 'west', formation: 'arc' },
      { t: 150, enemy: 'rust', count: 70, side: 'south', formation: 'arc' },
      { t: 185, enemy: 'spider', count: 30, side: 'around', formation: 'ring' },
      { t: 220, enemy: 'wasp', count: 18, side: 'east', formation: 'arc' },
      { t: 260, enemy: 'rust', count: 90, side: 'around', formation: 'ring' },
      { t: 300, enemy: 'shell', count: 8, side: 'north', formation: 'arc' },
      { t: 340, enemy: 'rust', count: 90, side: 'around', formation: 'ring' },
    ],
    hints: [{ t: 3, text: 'Vespas de Vidro mergulham em linha reta — observe o aviso no solo' }],
  },
  {
    map: 'arenaC',
    title: 'Ato III — Santuário Submerso',
    subtitle: 'O Coração do Véu pulsa além do altar',
    stages: [
      { type: 'kills', goal: 150, text: 'Atravesse o Santuário Submerso' },
      { type: 'anchor', channel: 26, text: 'Reacenda a terceira Âncora no Altar de Cobre' },
      { type: 'boss', boss: 'heart', at: 'B', text: 'Enfrente o Coração do Véu na fenda' },
    ],
    ambient: [
      { from: 0, target: 90, rate: 9, mix: { rust: 5, spider: 3, ghost: 2, frog: 1, slime: 1 } },
      { from: 70, target: 160, rate: 13, mix: { rust: 6, spider: 3, ghost: 2, frog: 2, shell: 1, wasp: 2 } },
      { from: 170, target: 230, rate: 16, mix: { rust: 7, spider: 4, ghost: 2, frog: 2, shell: 2, wasp: 2, slime: 1 } },
    ],
    channelAmbient: { from: 0, target: 280, rate: 20, mix: { rust: 8, spider: 4, wasp: 3, ghost: 2, shell: 2, frog: 1 } },
    bossAmbient: { from: 0, target: 60, rate: 5, mix: { rust: 4, spider: 2, ghost: 1 } },
    waves: [
      { t: 25, enemy: 'rust', count: 70, side: 'around', formation: 'ring' },
      { t: 60, enemy: 'shell', count: 6, side: 'west', formation: 'cluster' },
      { t: 95, enemy: 'ghost', count: 14, side: 'east', formation: 'arc' },
      { t: 130, enemy: 'rust', count: 100, side: 'around', formation: 'ring' },
      { t: 170, enemy: 'frog', count: 12, side: 'south', formation: 'arc' },
      { t: 210, enemy: 'spider', count: 40, side: 'around', formation: 'ring' },
      { t: 250, enemy: 'rust', count: 110, side: 'around', formation: 'ring' },
      { t: 290, enemy: 'wasp', count: 24, side: 'north', formation: 'arc' },
    ],
    hints: [{ t: 3, text: 'A água escura não pode ser atravessada — use as plataformas' }],
  },
];
