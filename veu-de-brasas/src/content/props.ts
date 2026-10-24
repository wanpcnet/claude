/** Metadados dos props desenhados à mão: colisor (raio na base), luz e camada. */
export interface PropDef {
  variants: number;
  collider: number;
  /** props baixos ficam abaixo das entidades; altos são ordenados por y */
  low?: boolean;
  light?: { color: number; radius: number; flicker?: boolean; oy?: number };
  scale?: number;
}

export const PROPS: Record<string, PropDef> = {
  tree_petrified: { variants: 2, collider: 9 },
  coral_red: { variants: 2, collider: 6 },
  fungus_glow: { variants: 2, collider: 0, low: true, light: { color: 0x3ad8d0, radius: 70, oy: -8 } },
  boulder: { variants: 2, collider: 16 },
  stele: { variants: 1, collider: 9, light: { color: 0xffa040, radius: 46, oy: -26 } },
  lantern: { variants: 1, collider: 4, light: { color: 0xffb050, radius: 120, flicker: true, oy: -26 } },
  roots: { variants: 1, collider: 0, low: true },
  bones: { variants: 1, collider: 0, low: true },
  monument: { variants: 1, collider: 34, light: { color: 0xff7030, radius: 150, flicker: true, oy: -60 } },
  pillar_broken: { variants: 1, collider: 10 },
  fossil_flower: { variants: 1, collider: 0, low: true },
  shrub_dead: { variants: 1, collider: 0, low: true },
  crystal_tall: { variants: 2, collider: 13, light: { color: 0x40d8f0, radius: 110, oy: -30 } },
  crystal_small: { variants: 1, collider: 7, light: { color: 0x40d8f0, radius: 50, oy: -8 } },
  glass_tree: { variants: 2, collider: 9, light: { color: 0x60e0f0, radius: 80, oy: -60 } },
  glass_mushroom: { variants: 1, collider: 0, low: true, light: { color: 0x40d8f0, radius: 50, oy: -12 } },
  crystal_shards: { variants: 1, collider: 0, low: true },
  lantern_crystal: { variants: 1, collider: 4, light: { color: 0x50e8ff, radius: 120, flicker: true, oy: -26 } },
  pillar: { variants: 1, collider: 12 },
  pillar_ruined: { variants: 1, collider: 11 },
  copper_sigil: { variants: 1, collider: 0, low: true, light: { color: 0xc06a30, radius: 40 } },
  urn: { variants: 1, collider: 7 },
  brazier: { variants: 1, collider: 8, light: { color: 0xff7a30, radius: 130, flicker: true, oy: -20 } },
  debris: { variants: 1, collider: 0, low: true },
  coral_vine: { variants: 1, collider: 0, low: true },
  coral_formation: { variants: 1, collider: 12 },
  altar: { variants: 1, collider: 28, light: { color: 0xd08040, radius: 90, oy: -30 } },
  rift: { variants: 1, collider: 0, low: true, light: { color: 0xa060ff, radius: 260 } },
};
