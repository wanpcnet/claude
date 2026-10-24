import { emptyMeta, type MetaBonus } from './upgrades';
import { PLAYABLE } from './heroes';

/** Árvore de talentos permanente (comprada com Cinzas Eternas). */
export interface TalentDef {
  id: string;
  name: string;
  icon: string;
  branch: 'ataque' | 'defesa' | 'utilidade';
  max: number;
  cost: (rank: number) => number;
  desc: (rank: number) => string;
  apply: (m: MetaBonus, rank: number) => void;
  requires?: string;
}

const lin = (base: number, step: number) => (r: number) => base + step * r;

export const TALENTS: TalentDef[] = [
  { id: 'might', name: 'Poder', icon: 'p_might', branch: 'ataque', max: 5, cost: lin(30, 25), desc: (r) => `+${r * 4}% de dano`, apply: (m, r) => (m.might += r * 0.04) },
  { id: 'crit', name: 'Precisão', icon: 'p_crit', branch: 'ataque', max: 4, cost: lin(40, 30), desc: (r) => `+${r * 3}% de chance de crítico`, apply: (m, r) => (m.crit += r * 0.03), requires: 'might' },
  { id: 'cooldown', name: 'Celeridade', icon: 'p_cooldown', branch: 'ataque', max: 5, cost: lin(40, 30), desc: (r) => `−${r * 3}% de recarga`, apply: (m, r) => (m.cooldown += r * 0.03), requires: 'might' },
  { id: 'area', name: 'Amplitude', icon: 'p_area', branch: 'ataque', max: 3, cost: lin(50, 40), desc: (r) => `+${r * 4}% de área`, apply: (m, r) => (m.area += r * 0.04), requires: 'cooldown' },
  { id: 'vigor', name: 'Vigor', icon: 'p_vigor', branch: 'defesa', max: 5, cost: lin(25, 20), desc: (r) => `+${r * 10} de vida máxima`, apply: (m, r) => (m.hp += r * 10) },
  { id: 'armor', name: 'Couraça', icon: 'p_armor', branch: 'defesa', max: 4, cost: lin(40, 30), desc: (r) => `−${(r * 0.5).toFixed(1)} de dano recebido`, apply: (m, r) => (m.armor += r * 0.5), requires: 'vigor' },
  { id: 'energy', name: 'Fôlego', icon: 'a_pulse', branch: 'defesa', max: 3, cost: lin(40, 35), desc: (r) => `+${r * 10}% de regeneração de energia`, apply: (m, r) => (m.energyRegen += r * 0.1), requires: 'vigor' },
  { id: 'revive', name: 'Segunda Brasa', icon: 'p_revive', branch: 'defesa', max: 1, cost: () => 400, desc: () => 'Renasce uma vez por partida', apply: (m, r) => (m.revive += r), requires: 'armor' },
  { id: 'speed', name: 'Leveza', icon: 'p_speed', branch: 'utilidade', max: 3, cost: lin(30, 25), desc: (r) => `+${r * 3}% de velocidade`, apply: (m, r) => (m.speed += r * 0.03) },
  { id: 'magnet', name: 'Atração', icon: 'p_magnet', branch: 'utilidade', max: 3, cost: lin(25, 20), desc: (r) => `+${r * 10}% de alcance de coleta`, apply: (m, r) => (m.magnet += r * 0.1), requires: 'speed' },
  { id: 'xp', name: 'Sabedoria', icon: 'p_xp', branch: 'utilidade', max: 5, cost: lin(35, 25), desc: (r) => `+${r * 5}% de experiência`, apply: (m, r) => (m.xp += r * 0.05), requires: 'speed' },
  { id: 'luck', name: 'Fortuna', icon: 'p_luck', branch: 'utilidade', max: 3, cost: lin(50, 40), desc: (r) => `+${r * 10}% de sorte nas cartas`, apply: (m, r) => (m.luck += r * 0.1), requires: 'xp' },
  { id: 'duration', name: 'Persistência', icon: 'p_duration', branch: 'utilidade', max: 3, cost: lin(40, 30), desc: (r) => `+${r * 5}% de duração`, apply: (m, r) => (m.duration += r * 0.05), requires: 'magnet' },
];

/** Relíquias: escolha uma antes da partida; vantagens com custo. */
export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  apply: (m: MetaBonus) => void;
  enemyHp?: number;
  rerolls?: number;
}

export const RELICS: RelicDef[] = [
  { id: 'r_none', name: 'Nenhuma', icon: 'a_dash', desc: 'Sem relíquia.', cost: 0, apply: () => undefined },
  { id: 'r_hourglass', name: 'Ampulheta Rachada', icon: 'p_cooldown', desc: '−12% de recarga, −15 de vida máxima.', cost: 120, apply: (m) => { m.cooldown += 0.12; m.hp -= 15; } },
  { id: 'r_heart', name: 'Coração de Brasa', icon: 'p_vigor', desc: '+40 de vida máxima, −5% de velocidade.', cost: 120, apply: (m) => { m.hp += 40; m.speed -= 0.05; } },
  { id: 'r_eye', name: 'Olho do Véu', icon: 'p_crit', desc: '+12% de chance de crítico.', cost: 160, apply: (m) => { m.crit += 0.12; } },
  { id: 'r_glutton', name: 'Anel do Glutão', icon: 'p_xp', desc: '+30% de experiência, inimigos com +15% de vida.', cost: 150, apply: (m) => { m.xp += 0.3; }, enemyHp: 1.15 },
  { id: 'r_bell', name: 'Sino de Vidro', icon: 'p_luck', desc: '+2 renovações de cartas por ato, −6% de dano.', cost: 140, apply: (m) => { m.might -= 0.06; }, rerolls: 2 },
  { id: 'r_feather', name: 'Pena Cinzenta', icon: 'p_revive', desc: 'Renasce uma vez, −10% de dano.', cost: 220, apply: (m) => { m.revive += 1; m.might -= 0.1; } },
];

/** Níveis de dificuldade (desbloqueados vencendo o anterior). */
export interface DifficultyDef {
  id: 'normal' | 'nightmare' | 'torment';
  name: string;
  desc: string;
  hp: number;
  dmg: number;
  density: number;
  ashes: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 'normal', name: 'Normal', desc: 'A jornada como foi concebida.', hp: 1, dmg: 1, density: 1, ashes: 1 },
  { id: 'nightmare', name: 'Pesadelo', desc: 'Inimigos +45% de vida e +20% de dano, mais densos. Cinzas +60%.', hp: 1.45, dmg: 1.2, density: 1.15, ashes: 1.6 },
  { id: 'torment', name: 'Tormento', desc: 'Inimigos +100% de vida e +40% de dano, hordas maiores. Cinzas +140%.', hp: 2, dmg: 1.4, density: 1.3, ashes: 2.4 },
];

export type ModeId = 'campaign' | 'endless' | 'daily';

export const MODES: { id: ModeId; name: string; desc: string }[] = [
  { id: 'campaign', name: 'Campanha', desc: 'Três atos, Âncoras do Véu e dois chefes. ~15 min.' },
  { id: 'endless', name: 'Sem Fim', desc: 'Sobreviva o máximo possível no Jardim das Cinzas, com hordas cada vez mais fortes. Elites a cada 2 min, chefe a cada 5 min.' },
  { id: 'daily', name: 'Desafio Diário', desc: 'Campanha com herói e modificadores sorteados pela data. Uma tentativa vale o recorde do dia.' },
];

/** Modificadores do Desafio Diário. */
export const DAILY_MODS = [
  { id: 'fast', name: 'Hordas velozes', desc: 'Inimigos 20% mais rápidos.' },
  { id: 'glass', name: 'Canhão de vidro', desc: '+40% de dano, vida máxima pela metade.' },
  { id: 'rich', name: 'Fartura', desc: 'Dobro de experiência, inimigos com +30% de vida.' },
  { id: 'tide', name: 'Maré alta', desc: '+40% de inimigos.' },
  { id: 'arsenal', name: 'Arsenal sorteado', desc: 'Começa com uma arma extra aleatória.' },
  { id: 'elite', name: 'Elites famintas', desc: 'Elites e chefes com +40% de vida, recompensas dobradas.' },
] as const;

export type DailyModId = (typeof DAILY_MODS)[number]['id'];

/** Semente determinística a partir da data (AAAA-MM-DD). */
export function dailySeed(date = new Date()): { key: string; seed: number } {
  const key = date.toISOString().slice(0, 10);
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return { key, seed: h };
}

export function computeMeta(talents: Record<string, number>, relicId: string): MetaBonus {
  const m = emptyMeta();
  for (const t of TALENTS) {
    const r = Math.min(t.max, talents[t.id] ?? 0);
    if (r > 0) t.apply(m, r);
  }
  RELICS.find((r) => r.id === relicId)?.apply(m);
  return m;
}

/** Configuração fixa de uma partida (gravada no ponto de controle). */
export interface RunConfig {
  mode: ModeId;
  difficulty: DifficultyDef['id'];
  relic: string;
  daily: DailyModId[];
  dailyKey: string;
}

export function defaultRunConfig(): RunConfig {
  return { mode: 'campaign', difficulty: 'normal', relic: 'r_none', daily: [], dailyKey: '' };
}

export function difficultyById(id: string): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0];
}

export function relicById(id: string): RelicDef {
  return RELICS.find((r) => r.id === id) ?? RELICS[0];
}

/** Desafio do dia: herói e dois modificadores determinísticos pela data. */
export function dailyChallenge(date = new Date()): { key: string; hero: string; mods: DailyModId[] } {
  const { key, seed } = dailySeed(date);
  const heroes = PLAYABLE.map((h) => h.id) as string[];
  const ids = DAILY_MODS.map((m) => m.id);
  const a = seed % ids.length;
  let b = (seed >>> 8) % ids.length;
  if (b === a) b = (b + 1) % ids.length;
  return { key, hero: heroes[(seed >>> 16) % heroes.length], mods: [ids[a], ids[b]] };
}
