// Amostras de direção de arte (não usadas no jogo): a mesma cena em estilos diferentes,
// para escolha antes de produzir os sprites. Uso: node scripts/art2/mockups.mjs <pasta>
import { single, closeBrowser } from './raster.mjs';
import { uid } from './lib.mjs';

// ---------------------------------------------------------------- geometria comum (proporções adultas)
// Arqueira em 3/4, voltada para a direita, arco tensionado. Espaço 100×160, pés em y≈152.
const ARCHER = {
  cloak: 'M38 40 C30 60 26 95 22 128 C30 132 40 130 46 126 C46 100 48 70 52 46 Z',
  legBack: 'M44 96 L40 122 L38 146 L45 147 L48 124 L51 98 Z',
  legFront: 'M52 96 L56 120 L60 146 L67 146 L63 120 L60 96 Z',
  bootBack: 'M37 140 L36 151 L48 152 L46 140 Z',
  bootFront: 'M59 140 L58 151 L72 152 L68 140 Z',
  torso: 'M42 44 L60 42 L64 70 L62 98 L44 98 L40 70 Z',
  belt: 'M41 80 L63 79 L63 85 L41 86 Z',
  armBack: 'M46 47 L40 58 L50 64 L60 56 L56 50 Z',
  armFront: 'M58 46 L72 52 L86 54 L86 59 L71 58 L57 54 Z',
  hand: 'M84 52 L90 53 L90 59 L84 60 Z',
  neck: 'M48 36 L55 36 L55 44 L48 44 Z',
  head: 'M45 22 C45 14 51 10 56 11 C61 12 63 17 62 24 C62 30 59 35 54 36 C49 36 45 31 45 22 Z',
  hood: 'M42 26 C40 12 50 4 58 6 C66 8 68 18 64 30 L62 24 C62 16 58 12 53 13 C48 14 46 20 47 30 L44 40 C42 36 42 31 42 26 Z',
  hoodBack: 'M42 26 C38 32 36 40 38 46 L48 42 Z',
  quiver: 'M34 40 L42 38 L46 70 L38 72 Z',
  arrows: 'M36 40 L33 30 M39 39 L37 28 M42 38 L42 27',
  bow: 'M88 22 C100 40 100 72 88 92',
  string: 'M88 22 L58 56 L88 92',
  arrow: 'M58 56 L104 56',
  eye: 'M57 22 L61 22',
  hair: 'M47 16 C50 12 56 11 60 14 C56 15 52 17 48 22 Z',
};
// Criatura: carniçal cristalino quadrúpede, voltado para a esquerda. Espaço 140×100, chão y≈92.
const BEAST = {
  body: 'M30 50 C40 34 70 30 96 38 C110 42 118 52 116 64 C112 74 96 76 80 74 L50 72 C38 70 28 62 30 50 Z',
  head: 'M30 50 C20 46 8 50 6 58 C4 64 10 68 18 68 L30 66 C36 62 36 54 30 50 Z',
  jaw: 'M8 62 L24 66 L22 72 L10 70 Z',
  legFL: 'M38 66 L32 80 L26 92 L34 92 L40 80 L46 70 Z',
  legFR: 'M50 70 L48 84 L46 92 L54 92 L56 84 L58 72 Z',
  legBL: 'M90 70 L94 84 L90 92 L98 92 L102 82 L100 70 Z',
  legBR: 'M104 64 L112 78 L110 92 L118 92 L120 78 L112 62 Z',
  spikes: ['M60 36 L66 14 L72 36 Z', 'M74 36 L84 10 L88 38 Z', 'M88 40 L100 20 L100 44 Z', 'M50 40 L52 24 L60 38 Z'],
  eye: 'M12 56 L18 55',
  tail: 'M114 58 C126 54 134 46 136 36',
};

const P = (d, a) => `<path d="${d}" ${a}/>`;

// ---------------------------------------------------------------- estilo 1: "Mítico estilizado" (Hades)
function styleHades() {
  const ink = '#140a10';
  const L = (d, fill, sh, extra = '') => P(d, `fill="${fill}" stroke="${ink}" stroke-width="1.1" stroke-linejoin="miter"${extra}`) + (sh ? P(sh, `fill="#000" opacity="0.32"`) : '');
  let a = '';
  a += L(ARCHER.cloak, '#6e1424', 'M38 40 C34 70 30 100 26 128 C32 130 36 129 40 128 C40 100 42 70 46 44 Z');
  a += L(ARCHER.quiver, '#4a2a1a', 'M40 39 L44 70 L46 70 L42 38 Z') + P(ARCHER.arrows, `stroke="${ink}" stroke-width="1.6" fill="none"`) + P(ARCHER.arrows, `stroke="#d8c09a" stroke-width="0.7" fill="none"`);
  a += L(ARCHER.legBack, '#2a1e22', null) + L(ARCHER.bootBack, '#3a2218', null);
  a += L(ARCHER.legFront, '#3c2a2e', 'M52 96 L56 120 L58 146 L60 146 L57 120 L55 96 Z') + L(ARCHER.bootFront, '#4e2e1e', 'M59 140 L58 151 L62 151 L62 140 Z');
  a += L(ARCHER.armBack, '#3a2a24', null);
  a += L(ARCHER.torso, '#5a4030', 'M42 44 L48 44 L46 70 L48 98 L44 98 L40 70 Z');
  a += P('M50 44 L60 42 L62 56 L52 58 Z', `fill="#7a5a3a" stroke="${ink}" stroke-width="0.9"`);
  a += L(ARCHER.belt, '#c08a2a', null);
  a += L(ARCHER.neck, '#c89070', null);
  a += L(ARCHER.hoodBack, '#5a0e1c', null);
  a += L(ARCHER.head, '#d8a07c', 'M45 22 C45 30 49 36 54 36 C50 33 48 28 49 20 Z');
  a += L(ARCHER.hair, '#3a1a14', null);
  a += P(ARCHER.eye, `stroke="${ink}" stroke-width="1.2"`);
  a += L(ARCHER.hood, '#8a1a2c', 'M42 26 C41 18 44 10 50 7 C46 14 45 22 47 30 L44 40 C42 36 42 31 42 26 Z');
  a += L(ARCHER.armFront, '#4a3428', null) + L(ARCHER.hand, '#d8a07c', null);
  a += P(ARCHER.string, `stroke="#f0e6d0" stroke-width="0.6" fill="none"`);
  a += P(ARCHER.bow, `stroke="${ink}" stroke-width="4" fill="none"`) + P(ARCHER.bow, `stroke="#6a3a1e" stroke-width="2.4" fill="none"`) + P(ARCHER.bow, `stroke="#ffb040" stroke-width="0.6" fill="none" transform="translate(1 0)"`);
  a += P(ARCHER.arrow, `stroke="${ink}" stroke-width="2"`) + P(ARCHER.arrow, `stroke="#e8d2a8" stroke-width="0.9"`) + P('M104 53 L111 56 L104 59 Z', `fill="#ffd060" stroke="${ink}" stroke-width="0.8"`);
  // luz de contorno quente (rim light)
  a += P('M62 24 C62 30 59 35 54 36 M64 70 L62 98 M60 42 L64 70 M67 146 L63 120 L60 96', `stroke="#ffb050" stroke-width="1" fill="none" opacity="0.9"`);
  let b = '';
  const BL = (d, f, sh) => P(d, `fill="${f}" stroke="${ink}" stroke-width="1.2"`) + (sh ? P(sh, `fill="#000" opacity="0.35"`) : '');
  b += BL(BEAST.legBR, '#20303a') + BL(BEAST.legBL, '#20303a');
  b += P(BEAST.tail, `stroke="${ink}" stroke-width="4" fill="none"`) + P(BEAST.tail, `stroke="#2e4250" stroke-width="2.4" fill="none"`);
  b += BL(BEAST.body, '#34505e', 'M30 50 C34 64 50 72 80 74 L50 72 C38 70 28 62 30 50 Z M60 70 C80 74 100 76 116 64 C110 74 96 76 80 74 Z');
  for (const s of BEAST.spikes) b += P(s, `fill="#5af0ff" stroke="${ink}" stroke-width="1"`) + P(s, `fill="#fff" opacity="0.25" transform="translate(-1 0) scale(1)"`);
  b += BL(BEAST.legFR, '#2a4250') + BL(BEAST.legFL, '#2e4856');
  b += BL(BEAST.head, '#3e5c6a') + BL(BEAST.jaw, '#2a3e48');
  b += P('M10 66 L12 70 M14 67 L15 71 M18 67 L18 71', `stroke="#f0e8d0" stroke-width="1"`);
  b += `<circle cx="15" cy="56" r="3.2" fill="#5af0ff" opacity="0.5"/>` + P(BEAST.eye, `stroke="#c8ffff" stroke-width="1.6"`);
  return { archer: a, beast: b, bg: ['#1a0e14', '#3a1a1e'], floor: '#2a1c20', tile: '#36262a', glow: '#ff7a30' };
}

// ---------------------------------------------------------------- estilo 2: "Gótico em nanquim" (Darkest Dungeon)
function styleInk() {
  const ink = '#0a0807';
  const hid = uid('h');
  const hatch = `<defs><pattern id="${hid}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="3" height="3" fill="none"/><path d="M0 0 L0 3" stroke="#000" stroke-width="1" opacity="0.55"/></pattern></defs>`;
  const L = (d, fill, sh) => P(d, `fill="${fill}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"`) + (sh ? P(sh, `fill="url(#${hid})"`) + P(sh, `fill="${ink}" opacity="0.35"`) : '');
  let a = hatch;
  a += L(ARCHER.cloak, '#3a1214', 'M38 40 C30 60 26 95 22 128 C30 132 40 130 46 126 C46 100 48 70 52 46 Z');
  a += L(ARCHER.quiver, '#2a1e16', ARCHER.quiver) + P(ARCHER.arrows, `stroke="${ink}" stroke-width="2.2" fill="none"`);
  a += L(ARCHER.legBack, '#1a1614', ARCHER.legBack) + L(ARCHER.bootBack, '#1e1410', null);
  a += L(ARCHER.legFront, '#2a2420', 'M52 96 L56 120 L58 146 L62 146 L57 120 L55 96 Z') + L(ARCHER.bootFront, '#2a1c14', null);
  a += L(ARCHER.armBack, '#241e1a', ARCHER.armBack);
  a += L(ARCHER.torso, '#4a3a2c', 'M42 44 L50 44 L48 70 L50 98 L44 98 L40 70 Z');
  a += L(ARCHER.belt, '#6a5030', null);
  a += L(ARCHER.neck, '#b89a7a', null);
  a += L(ARCHER.hoodBack, '#2a0c0e', null);
  a += L(ARCHER.head, '#c8aa88', 'M45 22 C45 30 49 36 54 36 C50 33 48 26 50 18 Z');
  a += P(ARCHER.eye, `stroke="${ink}" stroke-width="1.8"`) + P('M58 26 L61 27', `stroke="${ink}" stroke-width="1"`);
  a += L(ARCHER.hood, '#4a1418', 'M42 26 C41 18 44 10 50 7 C46 14 45 22 47 30 L44 40 C42 36 42 31 42 26 Z');
  a += L(ARCHER.armFront, '#2e2620', 'M58 50 L86 56 L86 59 L71 58 L57 54 Z') + L(ARCHER.hand, '#c8aa88', null);
  a += P(ARCHER.string, `stroke="#d8ccb0" stroke-width="0.8" fill="none"`);
  a += P(ARCHER.bow, `stroke="${ink}" stroke-width="5" fill="none"`) + P(ARCHER.bow, `stroke="#4a3020" stroke-width="2.4" fill="none"`);
  a += P(ARCHER.arrow, `stroke="${ink}" stroke-width="2.4"`) + P('M104 52.5 L112 56 L104 59.5 Z', `fill="#a8a0a0" stroke="${ink}" stroke-width="1.4"`);
  a += P('M62 22 C62 28 60 33 56 35', `stroke="#e8c890" stroke-width="1.2" fill="none" opacity="0.8"`);
  let b = '';
  const BL = (d, f, sh) => P(d, `fill="${f}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"`) + (sh ? P(sh, `fill="url(#${hid})"`) : '');
  b += BL(BEAST.legBR, '#1a1c1c', BEAST.legBR) + BL(BEAST.legBL, '#1a1c1c', BEAST.legBL);
  b += P(BEAST.tail, `stroke="${ink}" stroke-width="5" fill="none"`);
  b += BL(BEAST.body, '#3a3a36', 'M30 50 C34 64 50 72 80 74 C100 76 112 70 116 64 C112 74 96 76 80 74 L50 72 C38 70 28 62 30 50 Z');
  for (const s of BEAST.spikes) b += P(s, `fill="#8a3a3a" stroke="${ink}" stroke-width="2"`) + P(s, `fill="url(#${hid})"`);
  b += BL(BEAST.legFR, '#2a2a28', BEAST.legFR) + BL(BEAST.legFL, '#323230', null);
  b += BL(BEAST.head, '#4a4842', 'M30 50 C26 60 22 66 18 68 L30 66 C36 62 36 54 30 50 Z') + BL(BEAST.jaw, '#2a2826', null);
  b += P('M10 66 L12 71 M14 67 L15 72 M18 67 L18 72', `stroke="#d8ccb0" stroke-width="1.4"`);
  b += P(BEAST.eye, `stroke="#ff3a2a" stroke-width="2.2"`);
  return { archer: a, beast: b, bg: ['#0e0b09', '#2a221a'], floor: '#1c1814', tile: '#2a241e', glow: '#c86a2a', grain: true };
}

// ---------------------------------------------------------------- estilo 3: "Pintado sombrio" (Diablo / Death Must Die)
function stylePainted() {
  const blur = uid('bl'), soft = uid('sf');
  const defs = `<defs><filter id="${blur}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter><filter id="${soft}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.5"/></filter></defs>`;
  const grad = (c1, c2, x1 = 0, y1 = 0, x2 = 1, y2 = 1) => {
    const id = uid('pg');
    return [`<defs><linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`, `url(#${id})`];
  };
  const L = (d, c1, c2, dir = [0.9, 0, 0.1, 1]) => {
    const [gd, u] = grad(c1, c2, ...dir);
    return gd + P(d, `fill="${u}" filter="url(#${soft})"`);
  };
  let a = defs;
  a += L(ARCHER.cloak, '#5a1a24', '#1a080c');
  a += L(ARCHER.quiver, '#4a3020', '#1e140e');
  a += L(ARCHER.legBack, '#2a2226', '#0e0a0c') + L(ARCHER.bootBack, '#2a1a12', '#0e0806');
  a += L(ARCHER.legFront, '#4a3a3a', '#1a1214') + L(ARCHER.bootFront, '#4a2e1e', '#140c08');
  a += L(ARCHER.armBack, '#3a2e28', '#141010');
  a += L(ARCHER.torso, '#6a5240', '#221a14');
  a += L(ARCHER.belt, '#a07a3a', '#4a3418');
  a += L(ARCHER.neck, '#b88a6a', '#5a3a2a');
  a += L(ARCHER.hoodBack, '#3a0e16', '#12040a');
  a += L(ARCHER.head, '#d8aa88', '#7a4a34');
  a += P(ARCHER.eye, `stroke="#2a1410" stroke-width="1" opacity="0.8"`);
  a += L(ARCHER.hood, '#7a2232', '#220a10');
  a += L(ARCHER.armFront, '#5a4234', '#1e1612') + L(ARCHER.hand, '#d8aa88', '#7a4a34');
  a += P(ARCHER.string, `stroke="#e8dcc0" stroke-width="0.5" fill="none" opacity="0.8"`);
  a += P(ARCHER.bow, `stroke="#2a160c" stroke-width="3" fill="none"`) + P(ARCHER.bow, `stroke="#8a5a30" stroke-width="1.2" fill="none" opacity="0.8"`);
  a += P(ARCHER.arrow, `stroke="#c8b08a" stroke-width="1.2"`) + `<circle cx="106" cy="56" r="6" fill="#ffb040" opacity="0.35" filter="url(#${blur})"/>` + P('M104 54 L110 56 L104 58 Z', `fill="#ffe0a0"`);
  // luz quente vinda da direita (tocha) + oclusão
  a += P('M62 24 C62 30 59 35 54 36 L56 30 Z M64 70 L62 98 L60 96 Z M60 42 L64 70 L61 68 Z', `fill="#ffb070" opacity="0.6" filter="url(#${blur})"`);
  let b = defs;
  b += L(BEAST.legBR, '#1a2228', '#060a0c') + L(BEAST.legBL, '#1a2228', '#060a0c');
  b += P(BEAST.tail, `stroke="#1a2830" stroke-width="3" fill="none"`);
  b += L(BEAST.body, '#3a4e58', '#0e161a', [0, 0, 0.3, 1]);
  for (const s of BEAST.spikes) b += `<path d="${s}" fill="#7af6ff" opacity="0.9" filter="url(#${soft})"/><path d="${s}" fill="#5af0ff" opacity="0.5" filter="url(#${blur})" transform="translate(0 2)"/>`;
  b += L(BEAST.legFR, '#2a3a42', '#0a1014') + L(BEAST.legFL, '#2e424c', '#0a1014');
  b += L(BEAST.head, '#4a5e68', '#121a1e') + L(BEAST.jaw, '#22303a', '#080c0e');
  b += P('M10 66 L12 70 M14 67 L15 71 M18 67 L18 71', `stroke="#e0d8c0" stroke-width="0.8" opacity="0.9"`);
  b += `<circle cx="15" cy="56" r="4" fill="#5af0ff" opacity="0.6" filter="url(#${blur})"/>` + P(BEAST.eye, `stroke="#e0ffff" stroke-width="1.2"`);
  return { archer: a, beast: b, bg: ['#0a0c10', '#1e2228'], floor: '#1a1c20', tile: '#24272c', glow: '#ff8a40', painted: true };
}

// ---------------------------------------------------------------- composição da cena
function scene(S, title, sub) {
  const W = 480, H = 270;
  const bg = uid('bg'), vg = uid('vg'), bl = uid('b');
  let s = `<defs><linearGradient id="${bg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.bg[0]}"/><stop offset="1" stop-color="${S.bg[1]}"/></linearGradient><radialGradient id="${vg}" cx="0.5" cy="0.55" r="0.7"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient><filter id="${bl}"><feGaussianBlur stdDeviation="14"/></filter></defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#${bg})"/>`;
  // chão em lajotas (visão de cima 3/4)
  for (let y = 120; y < H; y += 26) for (let x = -20 + ((y / 26) % 2) * 22; x < W; x += 44) s += `<rect x="${x}" y="${y}" width="42" height="24" rx="${S.painted ? 3 : 1}" fill="${S.tile}" stroke="${S.floor}" stroke-width="2" opacity="${0.55 + ((x * 7 + y) % 5) * 0.08}"/>`;
  s += `<circle cx="300" cy="190" r="90" fill="${S.glow}" opacity="0.22" filter="url(#${bl})"/>`;
  // sombras no chão
  s += `<ellipse cx="160" cy="232" rx="34" ry="8" fill="#000" opacity="0.5"/><ellipse cx="335" cy="236" rx="60" ry="10" fill="#000" opacity="0.5"/>`;
  s += `<g transform="translate(118 80)">${S.archer}</g>`;
  s += `<g transform="translate(262 146)">${S.beast}</g>`;
  if (S.grain) s += `<rect width="${W}" height="${H}" fill="#d8c8a0" opacity="0.06"/>`;
  s += `<rect width="${W}" height="${H}" fill="url(#${vg})"/>`;
  s += `<rect x="0" y="0" width="${W}" height="34" fill="#000" opacity="0.55"/><text x="14" y="22" font-family="Georgia, serif" font-size="15" fill="#f0e2c0" font-weight="bold">${title}</text><text x="${W - 14}" y="22" text-anchor="end" font-family="Georgia, serif" font-size="10" fill="#b8a888">${sub}</text>`;
  return s;
}

const out = process.argv[2] ?? '.';
await single(`${out}/estilo_A_mitico.png`, 480, 270, scene(styleHades(), 'A · Mítico estilizado', 'traço fino, sombras duras, luz de contorno (ref.: Hades)'), 2);
await single(`${out}/estilo_B_nanquim.png`, 480, 270, scene(styleInk(), 'B · Gótico em nanquim', 'contorno grosso, hachuras, cores dessaturadas (ref.: Darkest Dungeon)'), 2);
await single(`${out}/estilo_C_pintado.png`, 480, 270, scene(stylePainted(), 'C · Pintado sombrio', 'sem contorno, volume suave, luz ambiente (ref.: Diablo)'), 2);
await closeBrowser();
console.log('ok');
