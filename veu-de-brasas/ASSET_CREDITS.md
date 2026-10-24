# Créditos de assets — Véu de Brasas

## Resumo

**Nenhum sprite, ilustração, mapa, música ou efeito sonoro de terceiros é usado.**
Todos os gráficos e áudios em `public/assets/` foram criados originalmente para este projeto
por uma pipeline offline autoral incluída no repositório. Nenhum gerador de imagens por IA ou
banco de assets foi usado. Os scripts podem ser executados de novo para regenerar tudo de forma
determinística.

| Pasta | Conteúdo | Origem |
|---|---|---|
| `public/assets/characters/hero_*.*` | Atlas HD (2×) dos 4 heróis — Lysa, Orin, Brann, Nyx (4 direções × idle/caminhada/ataque/esquiva/dano, morte, silhuetas de hit-flash) | Original — `scripts/art2/hero.mjs` |
| `public/assets/ui/portraits/` | Retratos dos 4 heróis para seleção, HUD e resultados | Original — `scripts/art2/hero.mjs` |
| `public/assets/enemies/enemies.*` | 7 espécies comuns + 2 elites (caminhada, ataques, quadros de flash, morte por estilhaçamento) | Original — `scripts/art2/enemies.mjs` / `bosses.mjs` |
| `public/assets/enemies/bosses.*` | Batráquio Colossal (idle, fúria, agachar, salto, pouso, cuspe) e Coração do Véu (3 fases + clarões) | Original — `scripts/art2/enemies.mjs` / `bosses.mjs` |
| `public/assets/effects/fx.*` | Coroa de Brasas, flechas, Lança Solar, raio, lótus, vento, adaga, míssil, meteoro, gelo, espinhos, totem, fogos-fátuos, golpe de chicote, lua, vazio, aura, rachadura, explosões, fumaça, telegraphs, coletáveis, luzes | Original — `scripts/art2/fx.mjs` |
| `public/assets/environment/props.*` | 36 props (árvores petrificadas, corais, fungos, cristais, árvores de vidro, pilares, altar, fenda, âncoras…) | Original — `scripts/art2/props.mjs` |
| `public/assets/environment/ground/` | Solo das 3 arenas pré-renderizado em chunks de 512 px a partir dos layouts ASCII desenhados à mão | Original — `scripts/art2/ground2d.py` + `src/content/maps/*.json` |
| `public/assets/ui/` | Molduras de cartas (Jade/Ametista/Ouro Solar), painéis, botões, barras, ícones de 18 armas, passivas e evoluções, emblema, cursor, fonte bitmap de números, ilustração do menu | Original — `scripts/art2/icons.mjs`, `scripts/art2/keyart.mjs` (fonte dos números gerada da Alegreya Sans, OFL) |
| `public/assets/audio/` | 3 músicas em loop (menu, combate, chefe), 2 vinhetas (vitória/derrota) e 28 efeitos | Original — síntese em `scripts/audio/build_audio.py` |

### Como foram feitos

- **Arte (vetorial):** cada personagem/objeto é descrito à mão em código como SVG
  (`scripts/art2/`): peças com contorno escuro, gradiente vertical, crescentes de sombra e brilho,
  olhos e gemas com reflexo; as animações são poses de partes (membros, capa, arma) quadro a quadro.
  O Chromium (Playwright) rasteriza tudo em 2× e empacota os atlas no formato JSON do PixiJS. O solo
  é pintado em Python a partir dos layouts ASCII; o ruído só varia cor/granulação dentro de cada
  material — nunca decide a forma dos mapas. A pipeline antiga em pixel art (`scripts/art/`) fica
  no repositório como referência.
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

As fontes saem do pacote npm e são copiadas para `dist/` na build; não há nenhuma requisição a
CDN em tempo de execução.
