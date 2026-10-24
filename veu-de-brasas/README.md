# Véu de Brasas

Ação **2D em visão de cima** de sobrevivência arcana com hordas (survivor-like), fantasia sombria
bioluminescente, com **arte vetorial em estilo cartoon moderno** (contorno, sombreado em camadas e brilho). Quatro guardiões jogáveis, uma coroa em chamas e uma maré
viva de criaturas cristalinas: reacenda as três Âncoras do Véu e destrua o Coração do Véu.

- **Renderização:** PixiJS 8 + WebGL (sem Canvas 2D no código do jogo), TypeScript estrito, Vite.
- **Arte, mapas e áudio originais**, gerados por uma pipeline offline incluída em `scripts/`
  (veja [ASSET_CREDITS.md](ASSET_CREDITS.md)).
- **4 heróis jogáveis** (Lysa, Orin, Brann, Nyx), cada um com armas iniciais, habilidade
  ativa (Q) e **Suprema** (R) próprias.
- **18 armas**, 20 passivas, **10 evoluções** e **7 combos** (até 6 armas + 6 passivas por partida).
- **3 modos:** Campanha de 3 atos (~12–18 min), **Sem Fim** (recorde de sobrevivência) e
  **Desafio Diário** (herói e modificadores sorteados pela data).
- **Progressão entre partidas:** árvore de 13 talentos no Santuário, 6 relíquias, desbloqueio de
  heróis, 3 dificuldades (Normal, Pesadelo, Tormento), aparências da coroa e modificadores.
- 7 espécies comuns, 2 elites, 2 chefes com fases; save local versionado (v3).

## Requisitos

- Node.js 18+ (testado com Node 22) e npm.
- Navegador moderno com WebGL (Chrome, Edge, Firefox, Safari).
- Playwright/Chromium (sprites) e Python 3 + numpy + Pillow (solo) + ffmpeg (áudio) **apenas** se quiser
  regenerar a arte/áudio. Os assets
  prontos já estão em `public/assets/`.

## Comandos

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm run build      # checagem de tipos + build de produção em dist/
npm run preview    # serve a build de produção
npm test           # testes unitários e de conteúdo (Vitest)

# opcionais
npm run art        # regenera sprites, efeitos, ícones e ilustração (SVG → PNG via Chromium)
npm run ground     # regenera o solo das 3 arenas (Python + numpy + Pillow)
npm run audio      # regenera trilha e efeitos (Python + ffmpeg)
node scripts/e2e/smoke.mjs     # teste E2E de fumaça no Chromium (requer build + Playwright)
node scripts/e2e/campaign.mjs  # percorre a campanha inteira em modo debug
node scripts/e2e/heroes.mjs    # 4 heróis com as 18 armas, Q/R, modo Sem Fim e Desafio Diário
```

## Controles

| Ação | Teclado / mouse | Gamepad | Toque |
|---|---|---|---|
| Mover | WASD / setas | analógico esquerdo | joystick virtual (metade esquerda) |
| Esquiva (i-frames) | Espaço / Shift | A | botão de esquiva |
| Habilidade do herói | Q / E | B ou X | botão ◎ |
| Suprema | R | gatilhos (LT/RT) | botão ★ |
| Pausar | Esc / P | Start | botão ❚❚ |
| Escolher carta | 1 · 2 · 3, clique, ←/→ + Enter | LB · Y · RB, ou cruzeta + A | tocar na carta |
| Painel de desempenho | F3 ou ` | — | — |

Os ataques são automáticos (alvo válido mais próximo). Há opção de **mira manual com o mouse**
em Configurações. O jogo pausa sozinho quando a aba perde o foco. O áudio começa após o
primeiro clique/tecla (política de autoplay dos navegadores).

## Objetivo e estrutura

1. **Ato I — Jardim das Cinzas:** tutorial integrado; dissipe a maré, reacenda a primeira
   Âncora permanecendo no círculo e derrote o **Guardião de Coral**.
2. **Ato II — Bosque de Vidro:** derrote a **Sacerdotisa de Vidro** na praça, reacenda a
   segunda Âncora atrás das formações de cristal e enfrente o **Batráquio Colossal**.
3. **Ato III — Santuário Submerso:** reacenda a Âncora do Altar de Cobre e destrua o
   **Coração do Véu** (três fases).

Uma seta dourada na borda da tela indica o objetivo. Cada ato salva um ponto de controle
(“Continuar” no menu). Ao final há tela de vitória/derrota com tempo, abates, nível, atos,
dano por habilidade e cartas escolhidas.

## Heróis

| Herói | Armas iniciais | Habilidade (Q) | Suprema (R) | Perfil |
|---|---|---|---|---|
| **Lysa**, Arqueira-Rúnica | Flecha Rúnica + Coroa de Brasas | Pulso da Coroa | Alvorada Solar (chuva de lanças) | equilibrada (grátis) |
| **Orin**, Mago do Véu | Mísseis Arcanos + Nova Glacial | Congelamento em área | Tempestade Arcana (raios) | frágil, recarga −10%, área +10% |
| **Brann**, Guardiã de Bronze | Chicote de Sangue + Aura de Espinhos | Impacto Sísmico (salto + atordoamento) | Fúria de Bronze (+60% dano, roubo de vida) | +45 vida, armadura +2 |
| **Nyx**, Invocadora Velada | Fogos-Fátuos + Orbe do Vazio | Revoada Sombria (8 espíritos) | Eclipse (vazio colossal) | duração +25%, coleta +30% |

A Suprema carrega com abates, elites e dano a chefes. Heróis são desbloqueados com Cinzas Eternas.

## Mecânicas

- **Coroa de Brasas** (assinatura): aro gravado com chamas em arcos e runas orbitais (a
  quantidade de runas/arcos comunica o nível). Queima ao contato. **Q** expande a coroa num
  pulso que empurra inimigos leves e incendeia (custa energia, tem recarga).
- **Armas (18, 5 níveis cada, em dados):** Flecha Rúnica, Coroa de Brasas, Lança Solar,
  Corrente de Tempestade, Lótus de Cristal, Vento Cinéreo, Adagas Espectrais (órbita), Mísseis
  Arcanos (teleguiados), Chuva de Meteoros, Nova Glacial, Espinhos Sombrios, Totem de Raios,
  Fogos-Fátuos (invocações), Chicote de Sangue, Lua Crescente (bumerangue), Orbe do Vazio
  (atração), Chuva de Flechas e Aura de Espinhos (reflete dano).
- **Evoluções (arma nv 5 + passiva):** Flecha Fênix, Coroa Solar, Tempestade Eterna, Mil Lâminas,
  Cometa Rúnico, Era do Gelo (congelamento), Floresta de Espinhos, Legião Espectral, Lua
  Sangrenta e Horizonte de Eventos.
- **Passivas novas:** crítico e dano crítico (números dourados), poder, duração, velocidade de
  projétil, sorte, erudição (XP), multiplicidade (+1 projétil), passo duplo (2 cargas de
  esquiva) e Pena de Fênix (renascer).
- **Combos lendários (7):** Tornado Incandescente (Coroa + Vento), Estilhaço Trovejante (Raio +
  Lótus), Alvorada Circular (Lança + Coroa), Geada Estilhaçante (Nova + Mísseis), Para-raios
  (Totem + Raio), Espinheiro Rubro (Chicote + Espinhos) e Abismo Cadente (Vazio + Meteoros).
- **Cartas:** Comum/Jade, Raro/Ametista, Lendário/Ouro Solar; nunca oferecem carta
  maximizada; as primeiras escolhas garantem uma habilidade nova; baús de elites/chefes dão
  uma “Relíquia” com raridade aumentada; essências raras concedem renovações.
- **Status de combate:** dano por tipo, armadura, armadura quebrável (Guardião), queimadura,
  lentidão, empurrão proporcional à massa, cooldown de dano por alvo e por fonte, hitstop
  curto em golpes fortes, invulnerabilidade breve após dano.
- **Inimigos:** Ferrugíneos (enxame veloz), Mordalumes (flanqueiam e dão bote), Filhos do Lodo
  (lentos, pancada telegrafada), Vespas de Vidro (voam e mergulham após aviso em linha),
  Carapaças Rubras (investida frontal telegrafada), Sapos da Fenda (saltos com área de
  pouso), Sussurrantes (mantêm distância e disparam orbes).
- **Justiça:** todo ataque forte tem aviso texturizado no solo (círculo, linha, cone ou anel,
  com abertura segura nos pulsos do chefe final); inimigos nascem fora da tela, em zonas
  aprovadas do mapa, com caminho até a heroína e nunca a menos de um raio seguro.
- **Meta progressão (Santuário):** Cinzas Eternas compram talentos permanentes em três ramos
  (Ataque, Defesa, Utilidade, com pré-requisitos e redistribuição gratuita), heróis, relíquias
  (vantagem com custo, escolhida antes da partida), aparências da coroa e modificadores.
  Vencer a campanha libera a próxima dificuldade (mais vida/dano/densidade, mais Cinzas).
- **Fluidez:** simulação em subpassos de até 1/60 s que acompanham a taxa de quadros da tela
  (90/120/144 Hz sem trepidação), inclinação e balanço do personagem, compressão na esquiva,
  bloom também na qualidade média e gradação de cor na alta.

## Arquitetura

```
src/
  main.ts              boot, tela de carregamento, Application PixiJS (preference: 'webgl')
  game/                Game (estados, atos, cartas, pausa), AssetLoader, AudioManager (WebAudio),
                       InputManager (teclado, mouse, toque, gamepad)
  world/               World (cena de combate: camadas, câmera, regras de dano), Arena (solo em
                       chunks, props, colisão, campo de fluxo BFS)
  entities/            Hero, Enemy (pool), Bosses (Batráquio Colossal, Coração do Véu)
  systems/             EnemySystem (IA por espécie, separação, status), Weapons (6 armas + combos),
                       Projectiles, Hazards (telegraphs), Pickups, Director (roteiro), Save
  render/              Particles (pool), Lighting (mapa de luz), FloatText (fonte bitmap), Fx
  content/             dados: inimigos, armas, cartas, atos/ondas, props, mapas JSON
  ui/                  HUD, menus, cartas, toque (DOM sobre a superfície WebGL)
scripts/art            pipeline de arte (Python): sprites, atlas, solo, ícones, ilustração
scripts/audio          síntese de música e efeitos
scripts/e2e            testes de navegador (Playwright)
tests/                 Vitest: grade espacial, pools, cartas, armas, save, mapas e roteiro
```

### Visão 2D e pipeline de arte

O jogo é 2D em visão de cima (3/4): mundo e tela coincidem e a altura visual (saltos, projéteis,
efeitos) é um deslocamento vertical. `src/render/Iso.ts` mantém a interface de projeção usada pelos
sistemas, agora como identidade.

A arte é gerada por `scripts/art2/`: cada personagem, inimigo, chefe, prop, efeito e ícone é
desenhado em SVG por código (peças com contorno escuro, gradiente, crescente de sombra e de
brilho; animação por poses de partes) e rasterizado pelo Chromium em 2× (`meta.scale = 2`, filtragem
linear). O solo (`scripts/art2/ground2d.py`) é pintado a partir dos layouts ASCII com bordas
arredondadas, paredões com face e sombra, calçamento de pedras e água com espuma.

## Modo de depuração

Abra com `?debug` (ex.: `http://localhost:5173/?debug`) para expor `window.__veu` e o painel
de desempenho (F3 alterna o painel em qualquer modo). Exemplo de estresse no console:
`__veu.debugSpawn(300)`.

## Testes e validação realizados

Veja a seção “Resultados” no final deste arquivo.

## Resultados (executados neste ambiente)

Ambiente: contêiner Linux sem GPU; Chromium headless via Playwright com WebGL por software
(SwiftShader). **Não houve medição em hardware real**, então as metas de 60 FPS continuam sendo
metas.

| Verificação | Resultado |
|---|---|
| `npm install` | ok, sem configuração secreta |
| `npm run build` (tsc estrito + Vite) | ok, sem erros |
| `npm test` (Vitest, 18 testes) | 18/18 passando — grade espacial, pools, cartas (nunca maximizadas/duplicadas, combos condicionais, efeito real de cada carta), armas, migração de save, layouts dos mapas (alcance por BFS a partir do início, caracteres válidos), roteiro dos atos, existência de todos os assets referenciados |
| `scripts/e2e/smoke.mjs` | menu → nova jornada → movimento, esquiva, pulso → 350 inimigos → cartas → pausa/retomar → áudio (33 buffers decodificados) → gamepad simulado → qualidades Baixa/Média/Alta; **0 erros de console, 0 requisições falhas** (1280×720 e 432×860 retrato) |
| `scripts/e2e/campaign.mjs` | três atos com objetivos acelerados: Âncoras, Guardião, Sacerdotisa, Batráquio, transições de ato; 0 erros |
| `scripts/e2e/bosses.mjs` | Batráquio (salto, onda de choque, leque de lava, fase enfurecida) e Coração do Véu (três fases) até a tela de vitória; 0 erros |
| `scripts/e2e/bot.mjs` (sem trapaças: só entrada simulada) | Ato I vencido do zero; Atos II–III vencidos a partir de uma build equivalente (Batráquio ≈30 s, Coração ≈60 s de luta). Versões anteriores do balanceamento foram ajustadas com base nessas execuções (o bot perdia para o Guardião e o Batráquio antes de aprender a esquivar os avisos) |
| Custo de CPU da simulação | painel de debug: ~1–2,6 ms por quadro com ~350 inimigos ativos (no Chromium por software). O FPS medido ali (11–30) reflete a rasterização por software, não o jogo em GPU |
| Canvas 2D | nenhum uso de `getContext`/`CanvasRenderingContext2D`/`Graphics`/`Text` em `src/` (números de dano usam fonte bitmap própria) |

## Limitações conhecidas

- Desempenho em GPU real e em celulares não foi medido (só há Chromium por software aqui). A
  qualidade “Auto” é uma heurística simples (toque/núcleos de CPU).
- Gamepad testado apenas com a Gamepad API simulada no navegador, não com controle físico.
- A trilha é sintetizada (pads, cordas Karplus-Strong, sinos FM, bateria sintética): é original
  e funcional, mas não tem a riqueza de uma gravação orquestral.
- A arte é vetorial desenhada por código (sem ferramenta de geração de imagens nem ilustrador):
  tem identidade consistente e acabamento limpo, mas as animações são poses de partes, não
  animação quadro a quadro feita à mão.
- O build do Vite inclui chunks internos do PixiJS (por exemplo, o renderizador Canvas e o
  WebGPU) que o Pixi carrega sob demanda; o jogo pede `preference: 'webgl'` e não os usa.
- O balanceamento foi validado com um bot; jogadores humanos devem achar os chefes mais
  exigentes ou mais fáceis conforme a habilidade de esquiva — ajuste fino depende de playtest.
