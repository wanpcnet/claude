# Véu de Brasas

Ação **2.5D isométrica** de sobrevivência arcana com hordas (survivor-like), fantasia sombria
bioluminescente. Uma arqueira-rúnica, uma coroa em chamas e uma maré viva de criaturas
cristalinas: reacenda as três Âncoras do Véu e destrua o Coração do Véu.

- **Renderização:** PixiJS 8 + WebGL (sem Canvas 2D no código do jogo), TypeScript estrito, Vite.
- **Arte, mapas e áudio originais**, gerados por uma pipeline offline incluída em `scripts/`
  (veja [ASSET_CREDITS.md](ASSET_CREDITS.md)).
- Campanha de 3 atos (~12–18 min), 7 espécies comuns, 2 elites, 2 chefes com fases,
  6 armas, 23 cartas em 3 raridades, 3 combos, meta progressão e save local.

## Requisitos

- Node.js 18+ (testado com Node 22) e npm.
- Navegador moderno com WebGL (Chrome, Edge, Firefox, Safari).
- Python 3 + numpy + Pillow + ffmpeg **apenas** se quiser regenerar a arte/áudio. Os assets
  prontos já estão em `public/assets/`.

## Comandos

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm run build      # checagem de tipos + build de produção em dist/
npm run preview    # serve a build de produção
npm test           # testes unitários e de conteúdo (Vitest)

# opcionais
npm run art        # regenera toda a arte em public/assets (Python)
npm run audio      # regenera trilha e efeitos (Python + ffmpeg)
node scripts/e2e/smoke.mjs     # teste E2E de fumaça no Chromium (requer build + Playwright)
node scripts/e2e/campaign.mjs  # percorre a campanha inteira em modo debug
```

## Controles

| Ação | Teclado / mouse | Gamepad | Toque |
|---|---|---|---|
| Mover | WASD / setas | analógico esquerdo | joystick virtual (metade esquerda) |
| Esquiva (i-frames) | Espaço / Shift | A | botão de esquiva |
| Pulso da Coroa | Q / E | B ou X | botão de pulso |
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

## Mecânicas

- **Coroa de Brasas** (assinatura): aro gravado com chamas em arcos e runas orbitais (a
  quantidade de runas/arcos comunica o nível). Queima ao contato. **Q** expande a coroa num
  pulso que empurra inimigos leves e incendeia (custa energia, tem recarga).
- **Armas:** Flecha Rúnica (perfuração, leque), Coroa de Brasas, Lança Solar (atravessa a
  linha), Corrente de Tempestade (saltos), Lótus de Cristal (semente que desabrocha em
  fragmentos), Vento Cinéreo (rajada semicircular com empurrão). 5 níveis cada, em dados.
- **Combos lendários:** Tornado Incandescente (Coroa + Vento: brasas em espiral, empurrão
  +50%), Estilhaço Trovejante (Raio + Lótus: fragmentos saltam de cada alvo eletrocutado),
  Alvorada Circular (Lança + Coroa: o Pulso dispara 6 lanças radiais).
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
- **Meta progressão (Santuário):** Cinzas Eternas compram aparências da coroa (Aurora,
  Eclipse) e modificadores (Brisa Inicial, Bênção do Véu, Maré Faminta). Nada é necessário
  para vencer.

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

### Projeção isométrica (2.5D)

A simulação (movimento, colisão, campo de fluxo, alcance das armas) acontece em coordenadas de
mundo no plano do chão; só a renderização projeta, com isometria 2:1
(`sx = (x − y)·0,75 + OX`, `sy = (x + y)·0,375 + OY`, em `src/render/Iso.ts`):

- **Solo:** cada arena é pré-renderizada já em isometria por `scripts/art/ground.py`, com paredes
  de rocha extrudadas (topo elevado + faces verticais) e bordas das plataformas caindo no abismo.
- **Camadas deitadas:** sombras, avisos de ataque, Coroa de Brasas, círculos rúnicos, pulsos e o
  mapa de luz recebem a matriz isométrica (círculos viram elipses no chão).
- **Elementos em pé:** heroína, inimigos, props, projéteis e coletáveis são sprites posicionados
  pela projeção e ordenados por profundidade (`x + y`); projéteis e efeitos têm altura visual
  separada da posição no chão.
- **Controles:** WASD/setas seguem as direções da tela (cima = cima na tela), convertidas para o
  plano do mundo; a mira manual com o mouse faz a projeção inversa.

Decisões de desempenho: simulação em passo fixo de 60 Hz; grade espacial com listas em
arrays tipados (sem alocação por quadro); pools para inimigos, projéteis, partículas, números,
perigos, luzes e coletáveis; atlas por domínio para batching; campo de fluxo recalculado só
quando a heroína muda de célula (máx. 5×/s); separação da horda em passos alternados acima
de 350 inimigos; mapa de luz em meia resolução; bloom só na camada de efeitos e só na
qualidade Alta; culling de props; números de dano com orçamento por segundo.

Qualidade gráfica: Auto/Baixa/Média/Alta (Baixa desliga o mapa de luz e reduz partículas;
Auto escolhe pela detecção de dispositivo). Acessibilidade: reduzir flashes, reduzir tremor,
números de dano opcionais, escala de interface, layout retrato (9:16) com cartas empilhadas.

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
- A arte é pixel art desenhada por código (formas, rampas de paleta e pontilhado) — não houve
  ferramenta de geração de imagens disponível. O resultado tem identidade consistente, mas
  traço mais geométrico do que pixel art feita à mão quadro a quadro.
- O build do Vite inclui chunks internos do PixiJS (por exemplo, o renderizador Canvas e o
  WebGPU) que o Pixi carrega sob demanda; o jogo pede `preference: 'webgl'` e não os usa.
- O balanceamento foi validado com um bot; jogadores humanos devem achar os chefes mais
  exigentes ou mais fáceis conforme a habilidade de esquiva — ajuste fino depende de playtest.
