# Créditos de assets — Véu de Brasas

## Resumo

Toda a arte do jogo vem de **um único conjunto**: os pacotes gratuitos **KayKit**, de
[Kay Lousberg](https://kaylousberg.itch.io), licença **CC0** (domínio público). Os modelos 3D são
renderizados por scripts deste repositório no ângulo da câmera do jogo; como é CC0, a saída gerada
fica no Git.

| Pasta | Conteúdo | Origem |
|---|---|---|
| `public/assets/chars/` | 5 heróis (cavaleiro, arqueiro, maga, bárbaro, ladina), 9 inimigos e 2 chefes em 5 direções (+ espelho), com ataque, esquiva, dano e morte; retratos | KayKit *Adventurers*, *Skeletons* e *Character Animations* — `scripts/assets/build_kaykit.mjs` |
| `public/assets/environment/ground/` | Solo das 3 arenas (masmorra, floresta, templo cercado de água) composto a partir dos layouts ASCII | KayKit *Dungeon* e *Forest Nature* — `scripts/assets/build_kaykit_env.mjs` + `ground_kaykit.py` |
| `public/assets/environment/props.*` | Props do cenário (árvores, rochas, arbustos, tochas, velas, barris, caixotes, pilares, baú, Âncora) | KayKit *Dungeon* e *Forest Nature* — `scripts/assets/build_kaykit_env.mjs` |
| `public/assets/ui/keyart.png` | Ilustração do menu | Cena montada com os modelos KayKit — `scripts/assets/render_scene.mjs` + `keyart.json` |
| `public/assets/effects/fx.*` | Efeitos das armas, coletáveis, luzes e avisos (estilo suave, sem contorno) | Original — `scripts/art2/fx.mjs` (`npm run fx`) |
| `public/assets/environment/props_keep.*` | Fenda do Véu | Original — `scripts/art2/props.mjs` |
| `public/assets/ui/` (demais) | Molduras, painéis, botões, barras, ícones, emblema, cursor, fonte bitmap dos números | Original — `scripts/art2/icons.mjs`, `scripts/art2/keyart.mjs` (números gerados da Alegreya Sans, OFL) |
| `public/assets/audio/` | 3 músicas em loop, 2 vinhetas e 28 efeitos | Original — síntese em `scripts/audio/build_audio.py` |

### Regenerar a arte

1. `npm run kaykit:fetch` — baixa os 5 pacotes KayKit do itch.io para `assets-src/kaykit/` (ignorado pelo Git).
2. `npm run chars` — sprites dos personagens e retratos.
3. `npm run env` e depois `npm run ground` — camadas do solo, props e composição das arenas.
4. `npm run keyart` — ilustração do menu. `npm run fx` — efeitos.

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
| [three.js](https://threejs.org) | MIT | Só na pipeline offline (render dos modelos KayKit) |

As fontes saem do pacote npm e são copiadas para `dist/` na build; não há nenhuma requisição a
CDN em tempo de execução.
