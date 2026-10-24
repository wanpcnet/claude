// Amostra de direção de arte "atmosférico desenhado à mão" (referência: Hollow Knight / Ori).
// Não usada no jogo; serve para aprovação. Uso: node scripts/art2/mock_ori.mjs <pasta>
import { single, closeBrowser } from './raster.mjs';
import { uid } from './lib.mjs';

const f = (n) => +n.toFixed(2);
const lg = (stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => {
  const id = uid('g');
  return [`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`, `url(#${id})`];
};
const rg = (stops, cx = 0.5, cy = 0.5, r = 0.5) => {
  const id = uid('r');
  return [`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`, `url(#${id})`];
};
const glowF = (sd) => {
  const id = uid('gl');
  return [`<filter id="${id}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${sd}"/></filter>`, `filter="url(#${id})"`];
};
/** borda orgânica de pincel (desloca levemente o contorno) */
const brushF = (scale = 1.2, freq = 0.08) => {
  const id = uid('br');
  return [`<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="${scale}"/></filter>`, `filter="url(#${id})"`];
};
const glow = (cx, cy, r, c, a = 0.8) => {
  const [d, u] = rg([[0, c, a], [0.35, c, a * 0.45], [1, c, 0]]);
  return `<defs>${d}</defs><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${u}"/>`;
};

// ---------------------------------------------------------------- heroína: andarilha encapuzada com máscara
// espaço 100×140, pés em y≈128; dir: 'down' | 'up' | 'side'
export function wanderer(dir = 'down', t = 0) {
  const sway = Math.sin(t * Math.PI * 2) * 2;
  const [g1, cape] = lg([[0, '#2c2646'], [0.55, '#1c1830'], [1, '#100d1c']]);
  const [g2, lining] = lg([[0, '#8a2240'], [1, '#3a0c1c']]);
  const [g3, scarf] = lg([[0, '#c43a52'], [1, '#7a1a30']], 0, 0, 1, 1);
  const [g4, mask] = lg([[0, '#f6f0e6'], [1, '#c8bcae']]);
  const [g5, body] = lg([[0, '#3a3044'], [1, '#1a1622']]);
  const [gf, gl] = glowF(2.2);
  const [bf, br] = brushF(1.4, 0.06);
  let s = `<defs>${g1}${g2}${g3}${g4}${g5}${gf}${bf}</defs>`;
  s += glow(50, 128, 34, '#000000', 0.55);
  if (dir === 'down') {
    // capa atrás, ondulando
    s += `<path ${br} d="M30 44 C20 70 16 98 14 122 C24 ${f(128 + sway)} 34 126 42 ${f(124 - sway * 0.5)} C50 128 58 128 64 ${f(124 + sway * 0.5)} C72 128 80 ${f(128 - sway)} 86 122 C84 98 80 70 70 44 Z" fill="${cape}"/>`;
    s += `<path d="M34 50 C28 76 26 100 26 118 C32 120 36 119 40 118 C40 98 40 74 42 54 Z" fill="${lining}" opacity="0.55"/>`;
    // pernas finas e botas
    s += `<path d="M44 98 L42 124 L47 125 L49 99 Z" fill="${body}"/><path d="M52 99 L54 125 L59 124 L57 98 Z" fill="${body}"/>`;
    s += `<path d="M40 122 Q40 128 48 128 L48 122 Z M53 122 L53 128 Q61 128 60 122 Z" fill="#0e0b14"/>`;
    // corpo esguio
    s += `<path d="M40 52 C38 70 40 88 42 100 L58 100 C60 88 62 70 60 52 C56 48 44 48 40 52 Z" fill="${body}"/>`;
    s += `<path d="M44 74 L56 74 L56 78 L44 78 Z" fill="#b8862e" opacity="0.9"/>`;
    // braço com arco
    s += `<path d="M60 56 C66 64 70 72 72 80" stroke="#1a1622" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M76 46 C86 62 86 90 76 108" stroke="#d8cdb8" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M76 46 L74 108" stroke="#efe6d4" stroke-width="0.5" opacity="0.7"/>`;
    s += glow(80, 77, 6, '#ffb860', 0.7) + `<path d="M79 70 L81 74 L79 78 L77 74 Z" fill="#ffe2a8"/>`;
    // cachecol
    s += `<path ${br} d="M38 46 C44 52 56 52 62 46 C64 50 62 54 58 56 C52 58 46 58 42 56 C38 54 36 50 38 46 Z" fill="${scarf}"/>`;
    s += `<path ${br} d="M56 54 C60 64 ${f(64 + sway)} 74 ${f(62 + sway * 1.5)} 86 L58 84 C58 74 56 64 54 56 Z" fill="${scarf}" opacity="0.95"/>`;
    // capuz com ponta caída para trás
    s += `<path ${br} d="M30 40 C26 24 34 8 50 6 C66 8 74 24 70 40 C68 48 60 52 50 52 C40 52 32 48 30 40 Z" fill="${cape}"/>`;
    s += `<path d="M36 38 C34 26 40 16 50 15 C60 16 66 26 64 38 C62 44 56 47 50 47 C44 47 38 44 36 38 Z" fill="#07060c"/>`;
    // máscara de porcelana
    s += `<path d="M40 30 C40 22 45 18 50 18 C55 18 60 22 60 30 C60 38 56 44 50 45 C44 44 40 38 40 30 Z" fill="${mask}"/>`;
    s += `<path d="M50 18 L50 26" stroke="#a89888" stroke-width="0.6" opacity="0.6"/>`;
    s += glow(45, 30, 6, '#ffb048', 0.9) + glow(55, 30, 6, '#ffb048', 0.9);
    s += `<path d="M42.5 29.5 Q45 27.8 47.5 29.8 Q45 31.6 42.5 29.5 Z M52.5 29.8 Q55 27.8 57.5 29.5 Q55 31.6 52.5 29.8 Z" fill="#fff2c8"/>`;
    // luz de contorno (lua fria à esquerda, brasa quente à direita)
    s += `<path d="M30 40 C26 24 34 8 50 6" stroke="#9ab8ff" stroke-width="1" fill="none" opacity="0.55" ${gl}/>`;
    s += `<path d="M70 40 C74 24 66 8 50 6 M70 44 C80 70 84 98 86 122" stroke="#ffa860" stroke-width="1.2" fill="none" opacity="0.7"/>`;
  } else if (dir === 'up') {
    s += `<path d="M44 98 L42 124 L47 125 L49 99 Z M52 99 L54 125 L59 124 L57 98 Z" fill="${body}"/>`;
    s += `<path ${br} d="M28 42 C18 70 14 98 12 124 C24 ${f(130 + sway)} 36 128 50 ${f(126 - sway * 0.4)} C64 128 76 ${f(130 - sway)} 88 124 C86 98 82 70 72 42 C64 36 36 36 28 42 Z" fill="${cape}"/>`;
    s += `<path d="M50 50 L50 120 M38 56 C36 80 34 100 30 120 M62 56 C64 80 66 100 70 120" stroke="#0c0a16" stroke-width="1.2" opacity="0.6" fill="none"/>`;
    s += `<path ${br} d="M30 40 C26 24 34 8 50 6 C66 8 74 24 70 40 C68 50 60 56 50 60 C40 56 32 50 30 40 Z" fill="${cape}"/>`;
    s += `<path d="M76 44 C86 62 86 90 76 108" stroke="#d8cdb8" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M30 40 C26 24 34 8 50 6 M70 40 C74 24 66 8 50 6" stroke="#9ab8ff" stroke-width="1" fill="none" opacity="0.5"/>`;
  } else {
    // perfil (direita)
    s += `<path ${br} d="M42 44 C30 66 ${f(20 - sway)} 96 ${f(14 - sway)} 122 C26 126 36 124 46 120 C46 96 50 70 54 48 Z" fill="${cape}"/>`;
    s += `<path d="M48 98 L44 124 L49 125 L53 99 Z" fill="#14101c"/><path d="M54 99 L60 124 L65 123 L59 98 Z" fill="${body}"/>`;
    s += `<path d="M42 122 Q42 128 50 128 L50 122 Z M58 121 L59 128 Q68 128 66 121 Z" fill="#0e0b14"/>`;
    s += `<path d="M46 52 C44 70 46 88 48 100 L60 100 C62 88 62 70 60 52 C56 48 50 48 46 52 Z" fill="${body}"/>`;
    s += `<path d="M58 56 C66 60 72 62 78 62" stroke="#1a1622" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M80 40 C92 56 92 82 80 98" stroke="#d8cdb8" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M80 40 L70 62 L80 98" stroke="#efe6d4" stroke-width="0.5" opacity="0.7" fill="none"/>`;
    s += `<path d="M70 62 L100 62" stroke="#e8d8b8" stroke-width="1" />` + glow(98, 62, 5, '#ffb860', 0.8);
    s += `<path ${br} d="M44 48 C50 54 58 52 62 46 C64 52 60 56 54 58 C${f(46 - sway)} 66 ${f(38 - sway * 2)} 72 ${f(32 - sway * 2)} 74 C38 64 42 56 44 48 Z" fill="${scarf}"/>`;
    s += `<path ${br} d="M36 40 C30 26 36 8 54 6 C66 8 72 20 70 36 C68 46 62 50 54 51 C${f(44 - sway)} 52 ${f(30 - sway)} 50 ${f(22 - sway)} 44 C30 44 34 42 36 40 Z" fill="${cape}"/>`;
    s += `<path d="M52 20 C60 18 68 24 67 34 C66 42 60 47 54 46 C56 38 56 28 52 20 Z" fill="${mask}"/>`;
    s += glow(62, 31, 6, '#ffb048', 0.9) + `<path d="M59.5 31 Q62 29 64.5 31 Q62 33 59.5 31 Z" fill="#fff2c8"/>`;
    s += `<path d="M70 36 C72 20 66 8 54 6" stroke="#ffa860" stroke-width="1.2" fill="none" opacity="0.7"/>`;
  }
  return s;
}

// ---------------------------------------------------------------- criatura: cão de cristal (voltado à esquerda)
// espaço 140×100, chão em y≈90
export function crystalHound(t = 0) {
  const br = brushF(1.6, 0.07);
  const [gf, gl] = glowF(3);
  const [gb, bodyFill] = lg([[0, '#262c3e'], [1, '#0c0e18']]);
  const breathe = Math.sin(t * Math.PI * 2) * 1.2;
  let s = `<defs>${br[0]}${gf}${gb}</defs>`;
  s += glow(70, 90, 56, '#000000', 0.6);
  s += glow(70, 40, 60, '#4ae0ff', 0.12);
  // pernas finas e longas (silhueta elegante e ameaçadora)
  const legs = ['M100 60 C104 70 110 80 106 90 L110 90 C114 80 110 68 106 58', 'M90 62 C92 72 94 82 92 90 L96 90 C98 82 98 70 96 60', 'M44 60 C40 70 36 80 32 90 L36 90 C42 80 46 70 50 62', 'M54 62 C54 72 54 82 52 90 L56 90 C58 82 60 72 60 62'];
  const legP = [[[104, 58], [112, 74], [106, 90]], [[92, 60], [98, 76], [94, 90]], [[46, 58], [38, 74], [34, 90]], [[58, 60], [56, 76], [54, 90]]];
  legP.forEach(([a, b, c], i) => {
    const col = i % 2 ? '#0c0e16' : '#171c28';
    s += `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke="${col}" stroke-width="7" stroke-linecap="round"/><path d="M${b[0]} ${b[1]} L${c[0]} ${c[1]}" stroke="${col}" stroke-width="4" stroke-linecap="round"/><path d="M${c[0] - 3} ${c[1]} L${c[0] + 3} ${c[1]}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
  });
  void legs;
  // corpo arqueado
  s += `<path ${br[1]} d="M36 52 C44 ${f(34 - breathe)} 70 ${f(28 - breathe)} 96 36 C110 40 120 50 120 58 C114 64 100 66 86 64 L54 64 C44 64 36 60 36 52 Z" fill="${bodyFill}"/>`;
  // cauda em fumaça
  s += `<path d="M118 54 C128 48 134 38 132 26 C130 34 126 40 120 44" fill="#141826" opacity="0.9"/>`;
  // cristais nas costas, luminosos
  const shards = [[56, 38, 6, 20, -18], [68, 32, 7, 26, -6], [82, 32, 7, 24, 8], [94, 38, 5, 18, 22], [104, 44, 4, 12, 34]];
  for (const [x, y, w, h, r] of shards) {
    s += `<g transform="translate(${x} ${y - breathe}) rotate(${r})">`;
    s += `<path d="M0 ${-h} L${w} -2 L0 4 L${-w} -2 Z" fill="#5ae8ff" opacity="0.35" ${gl}/>`;
    s += `<path d="M0 ${-h} L${w} -2 L0 4 L${-w} -2 Z" fill="#7ef2ff"/><path d="M0 ${-h} L${-w} -2 L0 4 Z" fill="#c8fbff" opacity="0.7"/>`;
    s += `</g>`;
  }
  // cabeça alongada
  s += `<path ${br[1]} d="M40 50 C32 44 18 46 10 52 C6 56 8 60 14 62 L24 64 C32 64 40 60 42 56 Z" fill="#1c2232"/>`;
  s += `<path d="M10 58 L24 62 L22 66 L12 64 Z" fill="#0a0c14"/>`;
  s += `<path d="M12 62 L13 66 M16 63 L17 67 M20 63 L20 67" stroke="#d8f4ff" stroke-width="0.8" opacity="0.9"/>`;
  s += glow(20, 53, 7, '#5ae8ff', 1) + `<path d="M17 53 Q20 51 23 53 Q20 55 17 53 Z" fill="#e8ffff"/>`;
  // linha de luz fria no dorso
  s += `<path d="M36 52 C44 ${f(34 - breathe)} 70 ${f(28 - breathe)} 96 36" stroke="#7ad8ff" stroke-width="1" fill="none" opacity="0.5"/>`;
  return s;
}

// ---------------------------------------------------------------- cenário (visão de cima, profundidade em camadas)
function sceneSvg() {
  const W = 960, H = 540;
  const [g1, ground] = lg([[0, '#0c1418'], [1, '#14202a']]);
  const [g2, vign] = rg([[0.4, '#000', 0], [1, '#000', 0.85]], 0.5, 0.55, 0.75);
  const [g3, pool] = rg([[0, '#ffb060', 0.35], [0.5, '#ff8040', 0.12], [1, '#ff8040', 0]]);
  const [g4, coolPool] = rg([[0, '#5ad8ff', 0.25], [1, '#5ad8ff', 0]]);
  const [gf, gl] = glowF(6);
  const [gf2, gl2] = glowF(14);
  const [bf, br] = brushF(3, 0.03);
  const grain = uid('gr');
  let s = `<defs>${g1}${g2}${g3}${g4}${gf}${gf2}${bf}<filter id="${grain}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="8"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0"/></filter></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${ground}"/>`;
  // manchas de musgo e pedra (pinceladas grandes)
  const blobs = [[160, 120, 140, 70, '#16262a'], [760, 420, 180, 90, '#16262a'], [520, 140, 120, 50, '#1a2a30'], [120, 430, 110, 60, '#1a2c2c'], [860, 160, 130, 70, '#12201f']];
  for (const [x, y, rx, ry, c] of blobs) s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="0.8" ${gl2}/>`;
  // grama/musgo fino em tufos
  let q = 3;
  const rq = () => ((q = (q * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 70; i++) {
    const x = rq() * W, y = rq() * H, h = 5 + rq() * 6, c = rq() < 0.5 ? '#1c3434' : '#24423e';
    s += `<path d="M${f(x - 3)} ${f(y)} Q${f(x - 4)} ${f(y - h * 0.6)} ${f(x - 6)} ${f(y - h)} M${f(x)} ${f(y)} L${f(x + 0.5)} ${f(y - h * 1.2)} M${f(x + 3)} ${f(y)} Q${f(x + 4)} ${f(y - h * 0.6)} ${f(x + 6)} ${f(y - h * 0.9)}" stroke="${c}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.75"/>`;
  }
  // caminho de lajes antigas
  const slabs = [];
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 92, y = 300 + Math.sin(i * 0.8) * 26;
    slabs.push(`<path ${br} d="M${x - 40} ${y - 18} Q${x} ${y - 24} ${x + 38} ${y - 20} Q${x + 44} ${y} ${x + 40} ${y + 18} Q${x} ${y + 24} ${x - 36} ${y + 20} Q${x - 44} ${y} ${x - 40} ${y - 18} Z" fill="#18222a" opacity="0.92"/>`);
    slabs.push(`<path d="M${x - 34} ${y - 14} Q${x} ${y - 19} ${x + 32} ${y - 16}" stroke="#2c3c46" stroke-width="2" opacity="0.7" fill="none"/>`);
    slabs.push(`<path d="M${x - 10} ${y - 6} L${x - 2} ${y + 4} L${x + 8} ${y + 2}" stroke="#0a1014" stroke-width="1.2" opacity="0.8" fill="none"/>`);
  }
  s += slabs.join('');
  // raízes escuras
  s += `<path d="M0 60 C80 90 140 70 220 110 C260 130 300 120 340 140" stroke="#081014" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M960 470 C880 440 820 460 760 430" stroke="#081014" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  // poça de luz da lanterna e brilho frio dos cogumelos
  s += `<circle cx="300" cy="300" r="260" fill="${pool}"/><circle cx="760" cy="180" r="180" fill="${coolPool}"/>`;
  // lanterna de pedra
  s += `<ellipse cx="300" cy="208" rx="22" ry="7" fill="#000" opacity="0.5"/><path d="M290 208 L292 170 L308 170 L310 208 Z" fill="#1c2228"/><path d="M286 172 L314 172 L310 150 L290 150 Z" fill="#232a32"/>`;
  s += `<circle cx="300" cy="162" r="30" fill="#ffb050" opacity="0.5" ${gl2}/><rect x="295" y="154" width="10" height="14" rx="2" fill="#ffe0a0"/>`;
  // cogumelos luminosos
  for (const [x, y, k] of [[740, 160, 1], [780, 190, 0.7], [712, 196, 0.8], [820, 150, 0.6], [170, 420, 0.8], [200, 440, 0.6]]) {
    s += `<path d="M${x} ${y} L${x} ${y - 14 * k}" stroke="#a8d8e0" stroke-width="${2 * k}"/>`;
    s += `<ellipse cx="${x}" cy="${y - 16 * k}" rx="${10 * k}" ry="${6 * k}" fill="#5ae0ff" opacity="0.6" ${gl}/><path d="M${x - 9 * k} ${y - 14 * k} Q${x} ${y - 26 * k} ${x + 9 * k} ${y - 14 * k} Z" fill="#8af0ff"/>`;
  }
  // personagens
  s += `<g transform="translate(250 186) scale(1.25)">${wanderer('down', 0.1)}</g>`;
  s += `<g transform="translate(560 270) scale(1.5)">${crystalHound(0.2)}</g>`;
  // flecha em voo com rastro
  s += `<path d="M380 270 L520 300" stroke="#ffd090" stroke-width="2" opacity="0.9"/><path d="M380 270 L470 289" stroke="#ffb060" stroke-width="6" opacity="0.25" ${gl}/>`;
  // partículas de luz (bokeh)
  let r = 7;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H, rr = 1 + rnd() * 3, warm = rnd() < 0.4;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${warm ? '#ffc070' : '#9af0ff'}" opacity="${f(0.3 + rnd() * 0.5)}"/>`;
  }
  // névoa em camadas
  s += `<ellipse cx="480" cy="520" rx="600" ry="90" fill="#6a8aa0" opacity="0.12" ${gl2}/><ellipse cx="120" cy="40" rx="300" ry="60" fill="#6a8aa0" opacity="0.1" ${gl2}/>`;
  // folhagem em primeiro plano (silhuetas desfocadas → profundidade)
  s += `<g opacity="0.95" ${gl}><path d="M0 540 C40 470 90 450 150 470 C120 500 90 520 60 540 Z" fill="#05080a"/><path d="M0 420 C30 440 50 480 40 540 L0 540 Z" fill="#05080a"/><path d="M960 0 C900 40 880 90 900 140 C930 110 950 60 960 40 Z" fill="#05080a"/><path d="M820 0 C850 30 900 30 960 10 L960 0 Z" fill="#05080a"/></g>`;
  s += `<rect width="${W}" height="${H}" fill="${vign}"/>`;
  s += `<rect width="${W}" height="${H}" filter="url(#${grain})"/>`;
  return s;
}

function sheetSvg() {
  const W = 960, H = 300;
  let s = `<rect width="${W}" height="${H}" fill="#10181e"/>`;
  const items = [['down', 0], ['side', 0.25], ['up', 0], ['side', 0.75]];
  items.forEach(([d, t], i) => (s += `<g transform="translate(${30 + i * 130} 40) scale(1.6)">${wanderer(d, t)}</g>`));
  s += `<g transform="translate(570 70) scale(2.5)">${crystalHound(0)}</g>`;
  s += `<text x="20" y="28" font-family="Georgia, serif" font-size="16" fill="#d8c8a8">Andarilha (frente · perfil · costas) e Cão de Cristal — amostra de personagens</text>`;
  return s;
}

const out = process.argv[2] ?? '.';
await single(`${out}/amostra_cena.png`, 960, 540, sceneSvg(), 2);
await single(`${out}/amostra_personagens.png`, 960, 300, sheetSvg(), 2);
await closeBrowser();
console.log('ok');
