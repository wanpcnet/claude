import type { EnemyDef } from './types';

/** Bestiário: todos os números de combate dos inimigos ficam aqui. */
export const ENEMIES: Record<string, EnemyDef> = {
  rust: { id: 'rust', name: 'Ferrugíneo', ai: 'swarm', hp: 12, speed: 78, damage: 6, radius: 7, mass: 1, armor: 0, xp: 1, anim: 'rust', walkAnim: 'rust_walk', fps: 14, deathTint: 0xff5a3a, anchorY: 0.6 },
  spider: { id: 'spider', name: 'Mordalume', ai: 'flanker', hp: 18, speed: 72, damage: 8, radius: 9, mass: 1.2, armor: 0, xp: 1, anim: 'spider', walkAnim: 'spider_walk', fps: 14, deathTint: 0x40f0e0, anchorY: 0.62 },
  slime: { id: 'slime', name: 'Filho do Lodo', ai: 'slow', hp: 64, speed: 34, damage: 12, radius: 12, mass: 4, armor: 0, xp: 3, anim: 'slime', walkAnim: 'slime_walk', fps: 7, deathTint: 0xb8f0b0, anchorY: 0.82 },
  wasp: { id: 'wasp', name: 'Vespa de Vidro', ai: 'diver', hp: 22, speed: 95, damage: 10, radius: 9, mass: 0.8, armor: 0, xp: 2, anim: 'wasp', walkAnim: 'wasp_fly', fps: 16, fly: true, deathTint: 0x9ff4ff, anchorY: 0.6 },
  shell: { id: 'shell', name: 'Carapaça Rubra', ai: 'charger', hp: 120, speed: 30, damage: 18, radius: 15, mass: 8, armor: 0.3, xp: 5, anim: 'shell', walkAnim: 'shell_walk', fps: 8, deathTint: 0xff6040, anchorY: 0.82 },
  frog: { id: 'frog', name: 'Sapo da Fenda', ai: 'hopper', hp: 42, speed: 0, damage: 12, radius: 12, mass: 3, armor: 0, xp: 3, anim: 'frog', walkAnim: 'frog_idle', fps: 4, deathTint: 0x60f0c0, anchorY: 0.8 },
  ghost: { id: 'ghost', name: 'Sussurrante', ai: 'caster', hp: 26, speed: 55, damage: 8, radius: 9, mass: 0.7, armor: 0, xp: 2, anim: 'ghost', walkAnim: 'ghost_float', fps: 8, fly: true, deathTint: 0xa0a8ff, anchorY: 0.75 },
  guardian: { id: 'guardian', name: 'Guardião de Coral', ai: 'guardian', hp: 950, speed: 40, damage: 16, radius: 22, mass: 40, armor: 0, xp: 60, anim: 'guardian', walkAnim: 'guardian_walk', fps: 8, elite: true, deathTint: 0x80ffff, anchorY: 0.85 },
  priestess: { id: 'priestess', name: 'Sacerdotisa de Vidro', ai: 'priestess', hp: 820, speed: 48, damage: 14, radius: 16, mass: 30, armor: 0, xp: 60, anim: 'priestess', walkAnim: 'priestess_float', fps: 6, elite: true, fly: true, deathTint: 0x80ffff, anchorY: 0.9 },
};

/** Multiplicador de vida por ato (o campo de batalha fica mais denso e resistente). */
export const ACT_HP_MULT = [1, 1, 1.45, 1.95];
