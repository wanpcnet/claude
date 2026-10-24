import type { WeaponId } from './weapons';

/** Personagens jogáveis: arma inicial, habilidade ativa (Q), suprema (R) e modificadores. */
export type ActiveId = 'pulse' | 'nova' | 'slam' | 'swarm';
export type UltId = 'solarRain' | 'arcaneStorm' | 'fury' | 'eclipse';

export interface HeroDef {
  id: 'knight' | 'lysa' | 'orin' | 'brann' | 'nyx';
  /** há sprites para este herói? (os demais aguardam pacotes de arte) */
  available: boolean;
  name: string;
  title: string;
  desc: string;
  start: WeaponId[];
  active: ActiveId;
  activeName: string;
  activeDesc: string;
  activeCost: number;
  activeCd: number;
  ult: UltId;
  ultName: string;
  ultDesc: string;
  mods: { hp?: number; speed?: number; cooldown?: number; area?: number; armor?: number; magnet?: number; duration?: number; might?: number };
  cost: number;
  /** atributos exibidos na seleção (0–5) */
  rating: { ataque: number; defesa: number; mobilidade: number; controle: number };
}

export const HEROES: HeroDef[] = [
  {
    id: 'knight', name: 'Aldric', title: 'Cavaleiro do Véu', available: true,
    desc: 'Veterano de armadura completa. Corta tudo à frente com a espada e aguenta a linha de frente.',
    start: ['whip', 'crown'], active: 'slam', activeName: 'Impacto Sísmico', activeDesc: 'Salta e esmaga o chão, atordoando e empurrando tudo ao redor.',
    activeCost: 50, activeCd: 3.5, ult: 'fury', ultName: 'Fúria do Juramento', ultDesc: '6 s de dano +60%, velocidade +25% e roubo de vida.',
    mods: { hp: 25, armor: 1 }, cost: 0, rating: { ataque: 4, defesa: 4, mobilidade: 3, controle: 3 },
  },
  {
    available: true, id: 'lysa', name: 'Lysandro', title: 'Arqueiro-Rúnico',
    desc: 'Patrulheiro das Âncoras. Equilibrado, ataca à distância e incendeia quem se aproxima.',
    start: ['arrow', 'crown'], active: 'pulse', activeName: 'Pulso da Coroa', activeDesc: 'A coroa se expande, empurra e incendeia a horda.',
    activeCost: 55, activeCd: 3.2, ult: 'solarRain', ultName: 'Alvorada Solar', ultDesc: 'Lanças solares caem por toda a tela durante 3 s.',
    mods: {}, cost: 0, rating: { ataque: 3, defesa: 3, mobilidade: 3, controle: 3 },
  },
  {
    available: true, id: 'orin', name: 'Orinna', title: 'Maga do Véu',
    desc: 'Mestra arcana frágil, mas devastadora. Habilidades recarregam mais rápido.',
    start: ['missile', 'frost'], active: 'nova', activeName: 'Congelamento', activeDesc: 'Congela todos os inimigos próximos por 2 s e causa dano.',
    activeCost: 60, activeCd: 4, ult: 'arcaneStorm', ultName: 'Tempestade Arcana', ultDesc: 'Raios atingem inimigos aleatórios durante 4 s.',
    mods: { hp: -15, cooldown: 0.9, area: 1.1 }, cost: 120, rating: { ataque: 5, defesa: 1, mobilidade: 3, controle: 4 },
  },
  {
    available: true, id: 'brann', name: 'Brann', title: 'Bárbaro do Norte',
    desc: 'Guerreiro com pele de urso e machado de duas mãos. Muita vida e armadura.',
    start: ['whip', 'thorns'], active: 'slam', activeName: 'Impacto Sísmico', activeDesc: 'Salta e esmaga o chão, atordoando e empurrando tudo ao redor.',
    activeCost: 50, activeCd: 3.5, ult: 'fury', ultName: 'Fúria do Urso', ultDesc: '6 s de dano +60%, velocidade +25% e roubo de vida.',
    mods: { hp: 45, armor: 2, speed: 0.95 }, cost: 150, rating: { ataque: 4, defesa: 5, mobilidade: 2, controle: 3 },
  },
  {
    available: true, id: 'nyx', name: 'Nyx', title: 'Invocadora Velada',
    desc: 'Comanda espíritos e o vazio. Invocações duram mais e coleta itens de longe.',
    start: ['wisp', 'void'], active: 'swarm', activeName: 'Revoada Sombria', activeDesc: 'Invoca 8 fogos-fátuos sombrios por 8 s.',
    activeCost: 55, activeCd: 4, ult: 'eclipse', ultName: 'Eclipse', ultDesc: 'Um vazio colossal suga a tela e detona.',
    mods: { duration: 1.25, magnet: 1.3, hp: -5 }, cost: 180, rating: { ataque: 3, defesa: 2, mobilidade: 3, controle: 5 },
  },
];

export function heroById(id: string): HeroDef {
  return HEROES.find((h) => h.id === id && h.available) ?? HEROES[0];
}

export const PLAYABLE = HEROES.filter((h) => h.available);
