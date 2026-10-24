import { el, clear, fmtTime } from './dom';
import { BASE } from '../game/AssetLoader';
import type { Game } from '../game/Game';
import { RARITY_LABEL, type CardDef } from '../content/upgrades';
import { META_ITEMS, type Quality } from '../systems/Save';

export interface ResultData {
  victory: boolean;
  time: number;
  kills: number;
  level: number;
  acts: number;
  cards: string[];
  damage: Record<string, number>;
  ashes: number;
}

/** Telas em DOM sobre a superfície WebGL: menu, seleção, santuário, ajustes, pausa, cartas e resultados. */
export class Menus {
  readonly root = el('div', 'screens');
  private screen = el('div', 'screen hidden');
  private cardsEl = el('div', 'cards-overlay hidden');
  private touch = el('div', 'touch hidden');
  private debugEl = el('pre', 'debug hidden');
  private transition = el('div', 'transition hidden');
  private focusIdx = 0;
  private cardButtons: HTMLButtonElement[] = [];
  current = '';

  constructor(private game: Game, parent: HTMLElement) {
    this.root.append(this.screen, this.cardsEl, this.transition);
    parent.append(this.root, this.touch, this.debugEl);
    this.buildTouch();
  }

  private sfxHover(b: HTMLElement): void {
    b.addEventListener('pointerenter', () => this.game.audio.sfx('sfx_ui_hover', { volume: 0.5, gap: 0.05 }));
    b.addEventListener('focus', () => this.game.audio.sfx('sfx_ui_hover', { volume: 0.4, gap: 0.05 }));
  }

  private button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
    const b = el('button', 'btn ' + cls, label);
    b.type = 'button';
    this.sfxHover(b);
    b.addEventListener('click', () => {
      void this.game.audio.unlock();
      this.game.audio.sfx('sfx_ui_click', { volume: 0.7 });
      onClick();
    });
    return b;
  }

  hide(): void {
    this.screen.classList.add('hidden');
    this.current = '';
  }

  private show(name: string, content: HTMLElement, cls = ''): void {
    clear(this.screen);
    this.screen.className = 'screen ' + cls;
    this.screen.append(content);
    this.current = name;
    const first = this.screen.querySelector('button') as HTMLButtonElement | null;
    first?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ menu principal
  mainMenu(): void {
    const wrap = el('div', 'main-menu');
    const logo = el('div', 'logo');
    logo.innerHTML = `<img class="emblem" src="${BASE}ui/emblem.png" alt=""><h1>Véu de Brasas</h1><p class="tag">Uma arqueira. Uma coroa em chamas. Uma maré viva.</p>`;
    const nav = el('nav', 'menu-buttons panel');
    nav.append(
      this.button('Jogar', () => this.playSelect(), 'primary'),
      this.button('Como jogar', () => this.howTo()),
      this.button('Configurações', () => this.settings(() => this.mainMenu())),
      this.button('Créditos', () => this.credits()),
    );
    const foot = el('div', 'menu-foot', `Cinzas Eternas: <b>${this.game.save.data.ashes}</b> · Vitórias: ${this.game.save.data.victories}`);
    wrap.append(logo, nav, foot);
    this.show('main', wrap, 'menu-screen');
  }

  playSelect(): void {
    const s = this.game.save.data;
    const wrap = el('div', 'panel dialog wide');
    wrap.append(el('h2', '', 'Seleção de partida'));
    const hero = el('div', 'hero-card');
    hero.innerHTML = `<div class="hero-portrait"><img src="${BASE}ui/emblem.png" alt=""></div><div><h3>Lysa, a Arqueira-Rúnica</h3><p>Guardiã das Âncoras do Véu. Começa com <b>Flecha Rúnica</b> e <b>Coroa de Brasas</b>.</p></div>`;
    wrap.append(hero);
    const row = el('div', 'row');
    row.append(this.button('Nova jornada', () => this.game.newRun(), 'primary'));
    if (s.checkpoint) {
      const cp = s.checkpoint;
      row.append(this.button(`Continuar · Ato ${['I', 'II', 'III'][cp.act]} (Nv ${cp.level})`, () => this.game.continueRun()));
    }
    wrap.append(row);
    wrap.append(el('h3', 'sub', `Santuário — Cinzas Eternas: <b class="ash">${s.ashes}</b>`));
    const grid = el('div', 'meta-grid');
    for (const it of META_ITEMS) {
      const owned = s.unlocked.includes(it.id);
      const active = it.kind === 'skin' ? s.selectedSkin === it.id : s.modifiers.includes(it.id);
      const card = el('div', `meta ${owned ? 'owned' : ''} ${active ? 'active' : ''}`);
      card.innerHTML = `<b>${it.name}</b><span>${it.desc}</span>`;
      let label: string;
      if (!owned) label = `Desbloquear · ${it.cost} ✦`;
      else if (it.kind === 'skin') label = active ? 'Equipada' : 'Equipar';
      else label = active ? 'Ativo' : 'Ativar';
      const b = this.button(label, () => {
        this.game.metaAction(it.id);
        this.playSelect();
      }, 'small');
      if (!owned && s.ashes < it.cost) b.disabled = true;
      card.append(b);
      grid.append(card);
    }
    wrap.append(grid);
    wrap.append(this.button('Voltar', () => this.mainMenu(), 'ghost'));
    this.show('select', wrap);
  }

  howTo(): void {
    const wrap = el('div', 'panel dialog wide');
    wrap.innerHTML = `<h2>Como jogar</h2>
    <div class="howto">
      <section><h3>Controles</h3>
        <p><kbd>WASD</kbd>/<kbd>setas</kbd> mover · <kbd>Espaço</kbd> esquiva · <kbd>Q</kbd> Pulso da Coroa · <kbd>Esc</kbd> pausa · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> escolher carta · <kbd>F3</kbd> painel de desempenho</p>
        <p>Toque: joystick à esquerda, botões de esquiva e pulso à direita. Gamepad: analógico esquerdo, A esquiva, B/X pulso, Start pausa.</p></section>
      <section><h3>Objetivo</h3>
        <p>Atravesse três atos, reacenda as três <b>Âncoras do Véu</b> e destrua o <b>Coração do Véu</b>. Siga a seta dourada na borda da tela.</p></section>
      <section><h3>Coroa de Brasas</h3>
        <p>O aro gira ao seu redor e queima quem toca as chamas. <kbd>Q</kbd> expande a coroa num pulso que empurra e incendeia — custa energia (barra âmbar) e tem recarga.</p></section>
      <section><h3>Cartas</h3>
        <p>Ao subir de nível o tempo para e surgem três cartas: <span class="r-common">Jade</span> (melhoria direta), <span class="r-rare">Ametista</span> (efeitos especiais) e <span class="r-legendary">Ouro Solar</span> (transformações e combos).</p>
        <p>Combos: Coroa + Vento = <b>Tornado Incandescente</b> · Raio + Lótus = <b>Estilhaço Trovejante</b> · Lança + Coroa = <b>Alvorada Circular</b>.</p></section>
      <section><h3>Leitura de perigo</h3>
        <p>Todo ataque forte é avisado no solo (círculos, linhas, cones e anéis). Esquive na hora certa: a esquiva concede invulnerabilidade breve.</p></section>
    </div>`;
    wrap.append(this.button('Voltar', () => this.mainMenu(), 'ghost'));
    this.show('howto', wrap);
  }

  credits(): void {
    const wrap = el('div', 'panel dialog');
    wrap.innerHTML = `<h2>Créditos</h2>
      <p><b>Véu de Brasas</b> — projeto original.</p>
      <p>Arte em pixel (heroína, bestiário, chefes, cenários, efeitos e interface), mapas, trilha sonora e efeitos sonoros foram criados para este projeto por uma pipeline offline autoral (scripts em <code>scripts/</code>).</p>
      <p>Tecnologia: PixiJS 8 (WebGL), TypeScript, Vite, pixi-filters.</p>
      <p>Fontes: Cinzel e Alegreya Sans (SIL Open Font License), empacotadas localmente.</p>
      <p>Detalhes de licença em ASSET_CREDITS.md.</p>`;
    wrap.append(this.button('Voltar', () => this.mainMenu(), 'ghost'));
    this.show('credits', wrap);
  }

  settings(back: () => void): void {
    const s = this.game.save.data.settings;
    const wrap = el('div', 'panel dialog');
    wrap.append(el('h2', '', 'Configurações'));
    const form = el('div', 'settings');
    const slider = (label: string, val: number, min: number, max: number, step: number, on: (v: number) => void) => {
      const r = el('label', 'set-row');
      r.innerHTML = `<span>${label}</span>`;
      const i = el('input');
      i.type = 'range';
      i.min = String(min);
      i.max = String(max);
      i.step = String(step);
      i.value = String(val);
      const out = el('output', '', `${Math.round(val * 100)}%`);
      i.addEventListener('input', () => {
        on(parseFloat(i.value));
        out.textContent = `${Math.round(parseFloat(i.value) * 100)}%`;
        this.game.applySettings();
      });
      r.append(i, out);
      return r;
    };
    const toggle = (label: string, val: boolean, on: (v: boolean) => void) => {
      const r = el('label', 'set-row toggle');
      r.innerHTML = `<span>${label}</span>`;
      const i = el('input');
      i.type = 'checkbox';
      i.checked = val;
      i.addEventListener('change', () => {
        on(i.checked);
        this.game.applySettings();
        this.game.audio.sfx('sfx_ui_click', { volume: 0.6 });
      });
      r.append(i, el('i', 'switch'));
      return r;
    };
    form.append(
      slider('Música', s.music, 0, 1, 0.05, (v) => (s.music = v)),
      slider('Efeitos sonoros', s.sfx, 0, 1, 0.05, (v) => (s.sfx = v)),
    );
    const q = el('div', 'set-row');
    q.innerHTML = '<span>Qualidade gráfica</span>';
    const seg = el('div', 'segmented');
    for (const [k, label] of [['auto', 'Auto'], ['low', 'Baixa'], ['medium', 'Média'], ['high', 'Alta']] as [Quality | 'auto', string][]) {
      const b = this.button(label, () => {
        s.quality = k;
        this.game.applySettings();
        seg.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      }, 'small');
      if (s.quality === k) b.classList.add('on');
      seg.append(b);
    }
    q.append(seg);
    form.append(
      q,
      toggle('Reduzir flashes', s.reduceFlash, (v) => (s.reduceFlash = v)),
      toggle('Reduzir tremor de câmera', s.reduceShake, (v) => (s.reduceShake = v)),
      toggle('Números de dano', s.damageNumbers, (v) => (s.damageNumbers = v)),
      toggle('Mira manual com o mouse', s.manualAim, (v) => (s.manualAim = v)),
      slider('Escala da interface', s.uiScale, 0.75, 1.5, 0.05, (v) => (s.uiScale = v)),
    );
    wrap.append(form);
    wrap.append(this.button('Voltar', () => {
      this.game.save.save();
      back();
    }, 'ghost'));
    this.show('settings', wrap);
  }

  pause(): void {
    const wrap = el('div', 'panel dialog narrow');
    wrap.append(el('h2', '', 'Pausa'));
    const nav = el('nav', 'menu-buttons');
    nav.append(
      this.button('Continuar', () => this.game.resume(), 'primary'),
      this.button('Reiniciar ato', () => this.confirm('Reiniciar o ato atual a partir do último ponto de controle?', () => this.game.restartAct(), () => this.pause())),
      this.button('Configurações', () => this.settings(() => this.pause())),
      this.button('Sair para o menu', () => this.confirm('Sair para o menu? O progresso fica salvo no início do ato.', () => this.game.toMenu(), () => this.pause())),
    );
    wrap.append(nav);
    this.show('pause', wrap, 'dim');
  }

  confirm(text: string, yes: () => void, no: () => void): void {
    const wrap = el('div', 'panel dialog narrow');
    wrap.append(el('p', 'confirm', text));
    const row = el('div', 'row');
    row.append(this.button('Sim', yes, 'primary'), this.button('Não', no, 'ghost'));
    wrap.append(row);
    this.show('confirm', wrap, 'dim');
  }

  results(r: ResultData): void {
    const wrap = el('div', `panel dialog wide results ${r.victory ? 'win' : 'lose'}`);
    const title = r.victory ? 'O Véu foi selado' : 'A brasa se apagou';
    const sub = r.victory ? 'As três Âncoras ardem e o Coração do Véu silenciou.' : 'A maré venceu desta vez — cada tentativa revela novas combinações.';
    wrap.innerHTML = `<h2>${title}</h2><p class="sub">${sub}</p>`;
    const stats = el('div', 'stats');
    const dmg = Object.entries(r.damage).sort((a, b) => b[1] - a[1]).slice(0, 5);
    stats.innerHTML = `
      <div><span>Tempo</span><b>${fmtTime(r.time)}</b></div>
      <div><span>Inimigos derrotados</span><b>${r.kills}</b></div>
      <div><span>Nível alcançado</span><b>${r.level}</b></div>
      <div><span>Atos concluídos</span><b>${r.acts} / 3</b></div>
      <div><span>Cinzas Eternas obtidas</span><b class="ash">+${r.ashes} ✦</b></div>`;
    wrap.append(stats);
    const cols = el('div', 'res-cols');
    const d = el('div', 'res-col');
    d.innerHTML = '<h3>Dano por habilidade</h3>' + (dmg.length ? dmg.map(([k, v]) => `<p><span>${k}</span><b>${Math.round(v)}</b></p>`).join('') : '<p>—</p>');
    const c = el('div', 'res-col');
    c.innerHTML = '<h3>Melhorias escolhidas</h3><p class="cards-list">' + (r.cards.length ? r.cards.join(' · ') : '—') + '</p>';
    cols.append(d, c);
    wrap.append(cols);
    const row = el('div', 'row');
    row.append(this.button(r.victory ? 'Jogar novamente' : 'Tentar novamente', () => this.game.newRun(), 'primary'));
    if (!r.victory && this.game.save.data.checkpoint) row.append(this.button('Repetir o ato', () => this.game.continueRun()));
    row.append(this.button('Menu principal', () => this.game.toMenu(), 'ghost'));
    wrap.append(row);
    this.show('results', wrap, 'dim');
  }

  // ------------------------------------------------------------ cartas
  showCards(cards: CardDef[], levels: number[], title: string, rerolls: number, onPick: (i: number) => void, onReroll: (() => void) | null): void {
    clear(this.cardsEl);
    this.cardsEl.classList.remove('hidden');
    const head = el('div', 'cards-head');
    head.innerHTML = `<h2>${title}</h2><p>Escolha uma melhoria · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></p>`;
    const row = el('div', 'cards-row');
    this.cardButtons = [];
    cards.forEach((c, i) => {
      const b = el('button', `card r-${c.rarity}`) as HTMLButtonElement;
      b.type = 'button';
      b.style.setProperty('--frame', `url(${BASE}ui/card_${c.rarity}.png)`);
      b.style.animationDelay = `${i * 0.08}s`;
      const lv = levels[i];
      const evo = c.kind === 'weapon' || c.kind === 'passive' ? (lv === 0 ? '<span class="evo new">NOVO</span>' : `<span class="evo">Nv ${lv} → ${lv + 1}</span>`) : `<span class="evo ${c.kind}">${c.kind === 'combo' ? 'COMBO' : 'EVOLUÇÃO'}</span>`;
      b.innerHTML = `<span class="key">${i + 1}</span>
        <span class="art"><img src="${BASE}ui/icons/${c.icon}.png" alt=""></span>
        <span class="name">${c.name}</span>
        ${evo}
        <span class="desc">${c.text(this.game.world!.build)}</span>
        <span class="rarity">${RARITY_LABEL[c.rarity]}</span>`;
      b.addEventListener('click', () => onPick(i));
      b.addEventListener('pointerenter', () => this.focusCard(i));
      row.append(b);
      this.cardButtons.push(b);
    });
    this.cardsEl.append(head, row);
    if (onReroll) {
      const rr = this.button(`Renovar cartas (${rerolls})`, onReroll, 'small ghost');
      rr.disabled = rerolls <= 0;
      this.cardsEl.append(rr);
    }
    this.focusIdx = 0;
    this.focusCard(0);
    const best = cards.reduce((m, c) => (c.rarity === 'legendary' ? 2 : c.rarity === 'rare' ? Math.max(m, 1) : m), 0);
    this.game.audio.sfx(best === 2 ? 'sfx_legendary' : best === 1 ? 'sfx_rare' : 'sfx_card_open', { volume: 0.7 });
  }

  focusCard(i: number): void {
    this.focusIdx = (i + this.cardButtons.length) % Math.max(1, this.cardButtons.length);
    this.cardButtons.forEach((b, k) => b.classList.toggle('focus', k === this.focusIdx));
    this.cardButtons[this.focusIdx]?.focus({ preventScroll: true });
  }

  moveCardFocus(d: number): void {
    this.focusCard(this.focusIdx + d);
  }

  get focusedCard(): number {
    return this.focusIdx;
  }

  pickedAnim(i: number): Promise<void> {
    this.cardButtons.forEach((b, k) => b.classList.add(k === i ? 'picked' : 'dismissed'));
    return new Promise((r) => setTimeout(r, 380));
  }

  hideCards(): void {
    this.cardsEl.classList.add('hidden');
    clear(this.cardsEl);
    this.cardButtons = [];
  }

  // ------------------------------------------------------------ transições
  actCard(title: string, subtitle: string): Promise<void> {
    this.transition.innerHTML = `<div class="tc-title">${title}</div><div class="tc-sub">${subtitle}</div>`;
    this.transition.classList.remove('hidden', 'out');
    return new Promise((r) => setTimeout(r, 1700));
  }

  endTransition(): void {
    this.transition.classList.add('out');
    setTimeout(() => this.transition.classList.add('hidden'), 700);
  }

  // ------------------------------------------------------------ toque
  private buildTouch(): void {
    const stick = el('div', 'stick');
    const knob = el('div', 'knob');
    stick.append(knob);
    const dash = el('button', 'tbtn dash', `<img src="${BASE}ui/icons/a_dash.png" alt="Esquiva">`);
    const pulse = el('button', 'tbtn pulse', `<img src="${BASE}ui/icons/a_pulse.png" alt="Pulso">`);
    const pause = el('button', 'tbtn pause', '❚❚');
    this.touch.append(stick, dash, pulse, pause);
    const input = this.game.input;
    let id = -1;
    let ox = 0;
    let oy = 0;
    const R = 50;
    const zone = this.touch;
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('.tbtn')) return;
      if (e.clientX > window.innerWidth * 0.55) return;
      id = e.pointerId;
      ox = e.clientX;
      oy = e.clientY;
      stick.style.left = `${ox - 60}px`;
      stick.style.top = `${oy - 60}px`;
      stick.classList.add('on');
      input.touchActive = true;
      input.usingTouch = true;
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox;
      let dy = e.clientY - oy;
      const l = Math.hypot(dx, dy);
      if (l > R) {
        dx = (dx / l) * R;
        dy = (dy / l) * R;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.touchX = dx / R;
      input.touchY = dy / R;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      input.touchActive = false;
      input.touchX = input.touchY = 0;
      knob.style.transform = '';
      stick.classList.remove('on');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    dash.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      input.press('dash');
    });
    pulse.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      input.press('pulse');
    });
    pause.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      input.press('pause');
    });
  }

  showTouch(on: boolean): void {
    this.touch.classList.toggle('hidden', !on);
  }

  debug(text: string | null): void {
    this.debugEl.classList.toggle('hidden', text === null);
    if (text !== null) this.debugEl.textContent = text;
  }
}
