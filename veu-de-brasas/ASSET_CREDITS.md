# Créditos de assets — Véu de Brasas

## Resumo

| Pasta | Conteúdo | Origem / licença | No Git? |
|---|---|---|---|
| `public/assets/sov/` | Herói (cavaleiro), inimigos, elites, chefes e efeitos mágicos em 8 direções | **Characters & effects by [SovDigital](https://sovdigital.itch.io)** — pacotes grátis *Knight Free Sampler*, *Wolf Free*, *Blade Assassin Boss Free* (+ status sheets) e *Magic Effects Free*. A licença permite uso em jogos, mas **proíbe redistribuir os arquivos brutos** | **Não** (`.gitignore`) — gerado localmente por `npm run assets:sov` |
| `public/assets/environment/ground/` | Solo das 3 arenas em chunks WebP de 512 px, composto a partir dos layouts ASCII | Texturas fotográficas **CC0** do [Poly Haven](https://polyhaven.com) (burned_ground_01, dry_ground_rocks, cobblestone_floor_06/07, gray_rocks, brown_mud_rocks_01, forest_leaves_02, lichen_rock, aerial_rocks_02) — `scripts/assets/ground_cc0.py` | Sim |
| `public/assets/environment/props.*` | 33 props do cenário (troncos mortos, pinheiros, rochas, estátua, busto, braseiro, lanternas, raízes, vaso…) renderizados em 2.5D | Modelos 3D **CC0** do [Poly Haven](https://polyhaven.com), renderizados com three.js — `scripts/assets/props_cc0.mjs` | Sim |
| `public/assets/environment/props_keep.*` | Âncora (apagada/acesa) e fenda | Original — pipeline vetorial `scripts/art2/props.mjs` | Sim |
| `public/assets/effects/fx.*` | Coroa de Brasas, flechas, Lança Solar, raio, lótus, vento, adaga, míssil, meteoro, gelo, espinhos, totem, fogos-fátuos, golpes, explosões, fumaça, telegraphs, coletáveis, luzes | Original — `scripts/art2/fx.mjs` | Sim |
| `public/assets/ui/` | Molduras de cartas, painéis, botões, barras, ícones de armas/passivas/evoluções, emblema, cursor, fonte bitmap dos números, ilustração do menu | Original — `scripts/art2/icons.mjs`, `scripts/art2/keyart.mjs` (números gerados da Alegreya Sans, OFL) | Sim |
| `public/assets/audio/` | 3 músicas em loop, 2 vinhetas e 28 efeitos | Original — síntese em `scripts/audio/build_audio.py` | Sim |

### Como gerar os sprites SOV localmente

1. Baixe os pacotes grátis no itch.io (exige aceitar a licença na página de cada um):
   [free-knight](https://sovdigital.itch.io/free-knight), [free-wolf](https://sovdigital.itch.io/free-wolf),
   [free-blade-assassin](https://sovdigital.itch.io/free-blade-assassin) (pacote + *status sheets*) e
   [free-magic-effects](https://sovdigital.itch.io/free-magic-effects).
2. Coloque os `.zip` em `assets-src/sov/` (pasta ignorada pelo Git).
3. Rode `npm run assets:sov` — gera atlas WebP otimizados em `public/assets/sov/`.

Sem esse passo o jogo não encontra os personagens. A build publicada já inclui os atlas gerados.

### Cenário CC0

`npm run ground` e `npm run props` baixam as texturas/modelos do Poly Haven para `assets-src/cc0/`
(primeira execução) e regeneram o solo e os props. CC0 = domínio público, por isso a saída fica no Git.

### Áudio e mapas

- **Mapas:** os três layouts (`src/content/maps/arena*.json`) foram escritos à mão, caractere
  a caractere (terreno, props, marcadores de Âncora, elite, chefe e início).
- **Áudio:** sintetizado com numpy (pads com osciladores desafinados, cordas Karplus-Strong,
  sinos FM, bateria sintetizada, ruído filtrado) sobre progressões e melodias compostas para o
  jogo; convertido para OGG Vorbis com ffmpeg.

## Dependências de terceiros (código e fontes)

| Item | Licença | Uso |
|---|---|---|
| [PixiJS 8](https://pixijs.com) | MIT | Renderização WebGL |
| [pixi-filters](https://github.com/pixijs/filters) | MIT | Bloom (`AdvancedBloomFilter`) na qualidade Alta |
| [Cinzel](https://fonts.google.com/specimen/Cinzel) via `@fontsource/cinzel` | SIL Open Font License 1.1 | Títulos da interface (empacotada localmente pelo Vite) |
| [Alegreya Sans](https://fonts.google.com/specimen/Alegreya+Sans) via `@fontsource/alegreya-sans` | SIL Open Font License 1.1 | Texto da interface (empacotada localmente) |
| Vite, TypeScript, Vitest | MIT / Apache-2.0 | Ferramentas de build e teste |
| [three.js](https://threejs.org) | MIT | Só na pipeline offline (render dos props) |

As fontes saem do pacote npm e são copiadas para `dist/` na build; não há nenhuma requisição a
CDN em tempo de execução.
