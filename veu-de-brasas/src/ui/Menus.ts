import { el, clear, fmtTime } from './dom';
import { BASE } from '../game/AssetLoader';
import type { Game } from '../game/Game';
import { RARITY_LABEL, type CardDef } from '../content/upgrades';
import { META_ITEMS, type Quality } from '../systems/Save';
import { PLAYABLE, heroById } from '../content/heroes';
import { WEAPONS } from '../content/weapons';
import { TALENTS, RELICS, DIFFICULTIES, MODES, DAILY_MODS, dailyChallenge, difficultyById, type ModeId } from '../content/meta';
import { startWeaponNames } from '../systems/Abilities';
import { ACTIVE_ICON, ULT_ICON } from './Hud';

export interface ResultData {
  victory: boolean;
  time: number;
  kills: number;
  level: number;
  acts: number;
  cards: string[];
  damage: Record<string, number>;
  ashes: number;
  mode: ModeId;
  hero: string;
  difficulty: string;
  record: boolean;
  unlocks: string[];
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
    const s = this.game.save.data;
    const wrap = el('div', 'main-menu');
    const logo = el('div', 'logo');
    logo.innerHTML = `<img class="emblem" src="${BASE}ui/emblem.png" alt=""><h1>Véu de Brasas</h1><p class="tag">Quatro guardiões. Uma coroa em chamas. Uma maré viva.</p>`;
    const nav = el('nav', 'menu-buttons glass');
    nav.append(
      this.button('Jogar', () => this.playSelect(), 'primary'),
      this.button('Santuário', () => this.sanctuary()),
      this.button('Como jogar', () => this.howTo()),
      this.button('Configurações', () => this.settings(() => this.mainMenu())),
      this.button('Créditos', () => this.credits()),
    );
    const best = s.endlessBest ? ` · Sem Fim: ${fmtTime(s.endlessBest)}` : '';
    const foot = el('div', 'menu-foot', `<span class="chip">✦ <b>${s.ashes}</b> Cinzas</span><span class="chip">Vitórias ${s.victories}${best}</span>`);
    wrap.append(logo, nav, foot);
    this.show('main', wrap, 'menu-screen');
  }

  private selMode: ModeId = 'campaign';

  playSelect(): void {
    const g = this.game;
    const s = g.save.data;
    const wrap = el('div', 'glass dialog xwide select');
    wrap.append(el('h2', '', 'Nova partida'));
    // heróis
    const daily = this.selMode === 'daily' ? dailyChallenge() : null;
    const heroes = el('div', 'hero-grid');
    for (const h of PLAYABLE) {
      const owned = s.heroes.includes(h.id);
      const sel = daily ? daily.hero === h.id : s.selectedHero === h.id;
      const c = el('button', `hero-pick ${owned ? '' : 'locked'} ${sel ? 'sel' : ''}`) as HTMLButtonElement;
      c.type = 'button';
      const bars = (Object.entries(h.rating) as [string, number][]).map(([k, v]) => `<div class="rate"><span>${k}</span><i style="--v:${v / 5}"></i></div>`).join('');
      c.innerHTML = `<div class="hp-art"><img src="${BASE}sov/portrait_${h.id}.webp" alt=""></div>
        <div class="hp-info"><b>${h.name}</b><small>${h.title}</small>
        <p>${h.desc}</p>
        <p class="kit"><img src="${BASE}ui/icons/${WEAPONS[h.start[0]].icon}.png" alt=""><img src="${BASE}ui/icons/${WEAPONS[h.start[1]].icon}.png" alt=""> ${startWeaponNames(h)}</p>
        <p class="kit"><img src="${BASE}ui/icons/${ACTIVE_ICON[h.active]}.png" alt=""> <b>Q</b> ${h.activeName} · <img src="${BASE}ui/icons/${ULT_ICON[h.ult]}.png" alt=""> <b>R</b> ${h.ultName}</p>
        <div class="rates">${bars}</div></div>
        ${owned ? '' : `<span class="lock">🔒 ${h.cost} ✦</span>`}`;
      c.disabled = !!daily || (!owned && s.ashes < h.cost);
      this.sfxHover(c);
      c.addEventListener('click', () => {
        g.audio.sfx('sfx_ui_click', { volume: 0.7 });
        g.buyHero(h.id);
        this.playSelect();
      });
      heroes.append(c);
    }
    const soon = el('div', 'hero-pick soon');
    soon.innerHTML = `<div class="hp-art"><span>+3</span></div><div class="hp-info"><b>Em breve</b><small>Arqueira, Mago e Invocadora</small><p>Novos heróis chegam com os próximos pacotes de arte.</p></div>`;
    heroes.append(soon);
    wrap.append(heroes);
    // modo
    const opts = el('div', 'opts');
    const modeRow = el('div', 'opt');
    modeRow.append(el('h3', '', 'Modo'));
    const modeSeg = el('div', 'segmented');
    for (const m of MODES) {
      const b = this.button(m.name, () => {
        this.selMode = m.id;
        this.playSelect();
      }, 'small');
      if (this.selMode === m.id) b.classList.add('on');
      modeSeg.append(b);
    }
    modeRow.append(modeSeg, el('p', 'note', MODES.find((m) => m.id === this.selMode)!.desc));
    if (daily) {
      const mods = daily.mods.map((id) => DAILY_MODS.find((d) => d.id === id)!);
      modeRow.append(el('p', 'note daily', `<b>${daily.key}</b> · ${heroById(daily.hero).name} · ${mods.map((m) => `<b>${m.name}</b>: ${m.desc}`).join(' · ')}${s.dailyKey === daily.key && s.dailyBest ? ` · Recorde de hoje: ${s.dailyBest}` : ''}`));
    }
    if (this.selMode === 'endless' && s.endlessBest) modeRow.append(el('p', 'note', `Recorde: <b>${fmtTime(s.endlessBest)}</b>`));
    opts.append(modeRow);
    if (!daily) {
      const diffRow = el('div', 'opt');
      diffRow.append(el('h3', '', 'Dificuldade'));
      const dseg = el('div', 'segmented');
      for (const d of DIFFICULTIES) {
        const unlocked = s.difficulties.includes(d.id);
        const b = this.button(unlocked ? d.name : `🔒 ${d.name}`, () => {
          g.setDifficulty(d.id);
          this.playSelect();
        }, 'small');
        b.disabled = !unlocked;
        b.title = unlocked ? d.desc : 'Vença a campanha na dificuldade anterior para desbloquear';
        if (s.difficulty === d.id) b.classList.add('on');
        dseg.append(b);
      }
      diffRow.append(dseg, el('p', 'note', difficultyById(s.difficulty).desc));
      const relRow = el('div', 'opt');
      relRow.append(el('h3', '', 'Relíquia'));
      const rgrid = el('div', 'relics');
      for (const r of RELICS) {
        const owned = s.relics.includes(r.id);
        const b = el('button', `relic ${owned ? '' : 'locked'} ${s.selectedRelic === r.id ? 'sel' : ''}`) as HTMLButtonElement;
        b.type = 'button';
        b.innerHTML = `<img src="${BASE}ui/icons/${r.icon}.png" alt=""><span><b>${r.name}</b><small>${r.desc}</small></span>${owned ? '' : `<em>${r.cost} ✦</em>`}`;
        b.disabled = !owned && s.ashes < r.cost;
        this.sfxHover(b);
        b.addEventListener('click', () => {
          g.audio.sfx('sfx_ui_click', { volume: 0.7 });
          g.relicAction(r.id);
          this.playSelect();
        });
        rgrid.append(b);
      }
      relRow.append(rgrid);
      opts.append(diffRow, relRow);
    }
    wrap.append(opts);
    const row = el('div', 'row');
    row.append(this.button(this.selMode === 'campaign' ? 'Nova jornada' : this.selMode === 'endless' ? 'Iniciar Sem Fim' : 'Aceitar desafio', () => g.newRun(this.selMode), 'primary'));
    if (s.checkpoint && this.selMode === 'campaign') {
      const cp = s.checkpoint;
      row.append(this.button(`Continuar · Ato ${['I', 'II', 'III'][cp.act]} · ${heroById(cp.build.hero).name} Nv ${cp.level}`, () => g.continueRun()));
    }
    row.append(this.button('Voltar', () => this.mainMenu(), 'ghost'));
    wrap.append(row);
    wrap.append(el('p', 'menu-foot center', `<span class="chip">✦ <b>${s.ashes}</b> Cinzas Eternas</span>`));
    this.show('select', wrap);
  }

  /** Santuário: talentos permanentes, aparências da coroa e modificadores */
  sanctuary(): void {
    const g = this.game;
    const s = g.save.data;
    const wrap = el('div', 'glass dialog xwide');
    wrap.append(el('h2', '', 'Santuário'));
    wrap.append(el('p', 'sub', `Invista Cinzas Eternas em melhorias permanentes · <span class="chip">✦ <b>${s.ashes}</b></span>`));
    const tree = el('div', 'talents');
    const names = { ataque: 'Ataque', defesa: 'Defesa', utilidade: 'Utilidade' } as const;
    for (const br of ['ataque', 'defesa', 'utilidade'] as const) {
      const col = el('div', `branch ${br}`);
      col.append(el('h3', '', names[br]));
      for (const t of TALENTS.filter((x) => x.branch === br)) {
        const r = s.talents[t.id] ?? 0;
        const locked = !!t.requires && !(s.talents[t.requires] > 0);
        const maxed = r >= t.max;
        const b = el('button', `talent ${maxed ? 'max' : ''} ${locked ? 'locked' : ''} ${r > 0 ? 'some' : ''}`) as HTMLButtonElement;
        b.type = 'button';
        const pips = Array.from({ length: t.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('');
        const req = locked ? `<small class="req">Requer ${TALENTS.find((x) => x.id === t.requires)!.name}</small>` : '';
        b.innerHTML = `<img src="${BASE}ui/icons/${t.icon}.png" alt=""><span class="tinfo"><b>${t.name}</b><small>${t.desc(Math.max(1, r + (maxed ? 0 : 1)))}</small>${req}<span class="pips">${pips}</span></span><em>${maxed ? 'MÁX' : `${t.cost(r)} ✦`}</em>`;
        b.disabled = maxed || locked || s.ashes < t.cost(r);
        this.sfxHover(b);
        b.addEventListener('click', () => {
          if (g.buyTalent(t.id)) this.sanctuary();
        });
        col.append(b);
      }
      tree.append(col);
    }
    wrap.append(tree);
    wrap.append(el('h3', 'sub', 'Coroa e modificadores'));
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
        g.metaAction(it.id);
        this.sanctuary();
      }, 'small');
      if (!owned && s.ashes < it.cost) b.disabled = true;
      card.append(b);
      grid.append(card);
    }
    wrap.append(grid);
    const row = el('div', 'row');
    row.append(
      this.button('Redistribuir talentos', () => this.confirm('Devolver todas as Cinzas investidas em talentos?', () => {
        g.resetTalents();
        this.sanctuary();
      }, () => this.sanctuary()), 'small ghost'),
      this.button('Voltar', () => this.mainMenu(), 'ghost'),
    );
    wrap.append(row);
    this.show('sanctuary', wrap);
  }

  howTo(): void {
    const wrap = el('div', 'glass dialog wide');
    wrap.innerHTML = `<h2>Como jogar</h2>
    <div class="howto">
      <section><h3>Controles</h3>
        <p><kbd>WASD</kbd>/<kbd>setas</kbd> mover · <kbd>Espaço</kbd> esquiva · <kbd>Q</kbd> habilidade do herói · <kbd>R</kbd> Suprema · <kbd>Esc</kbd> pausa · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> escolher carta</p>
        <p>Toque: arraste na metade esquerda para mover; botões à direita para esquiva, habilidade (◎) e Suprema (★). Gamepad: analógico, A esquiva, B/X habilidade, gatilhos Suprema.</p></section>
      <section><h3>Heróis</h3>
        <p><b>Lysa</b> (flechas e coroa), <b>Orin</b> (mísseis e gelo), <b>Brann</b> (chicote e espinhos, muito resistente) e <b>Nyx</b> (espíritos e vazio). Cada um tem habilidade ativa e Suprema próprias.</p></section>
      <section><h3>Habilidades e cartas</h3>
        <p>18 armas, 20 passivas, 10 evoluções e 7 combos. Até 6 armas e 6 passivas por partida. Leve uma arma ao nível 5 com a passiva certa para liberar sua <span class="r-legendary">evolução</span>.</p>
        <p>Raridades: <span class="r-common">Jade</span>, <span class="r-rare">Ametista</span> e <span class="r-legendary">Ouro Solar</span>. Acertos críticos aparecem em dourado.</p></section>
      <section><h3>Suprema</h3>
        <p>A barra da Suprema enche com abates, elites e dano a chefes. Quando brilhar, aperte <kbd>R</kbd> para um efeito devastador.</p></section>
      <section><h3>Progressão</h3>
        <p>Cinzas Eternas compram talentos no Santuário, novos heróis e relíquias. Vença a campanha para liberar Pesadelo e Tormento. Experimente o modo Sem Fim e o Desafio Diário.</p></section>
      <section><h3>Leitura de perigo</h3>
        <p>Todo ataque forte é avisado no solo. A esquiva concede invulnerabilidade breve — use no último instante.</p></section>
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
    const endless = r.mode === 'endless';
    const title = endless ? `Sobreviveu ${fmtTime(r.time)}` : r.victory ? 'O Véu foi selado' : 'A brasa se apagou';
    const sub = endless ? (r.record ? 'Novo recorde no modo Sem Fim!' : 'A maré sem fim cobrou seu preço.') : r.victory ? 'As três Âncoras ardem e o Arauto Peçonhento caiu.' : 'A maré venceu desta vez — cada tentativa revela novas combinações.';
    const h = heroById(r.hero);
    wrap.innerHTML = `<div class="res-head"><img src="${BASE}sov/portrait_${h.id}.webp" alt=""><div><h2>${title}</h2><p class="sub">${sub}</p><p class="sub small">${h.name} · ${r.mode === 'daily' ? 'Desafio Diário' : endless ? 'Sem Fim' : 'Campanha'} · ${r.difficulty}${r.mode === 'daily' && r.record ? ' · <b>recorde do dia!</b>' : ''}</p></div></div>`;
    for (const u of r.unlocks) wrap.append(el('p', 'unlock', u));
    const stats = el('div', 'stats');
    const dmg = Object.entries(r.damage).sort((a, b) => b[1] - a[1]).slice(0, 5);
    stats.innerHTML = `
      <div><span>Tempo</span><b>${fmtTime(r.time)}</b></div>
      <div><span>Inimigos derrotados</span><b>${r.kills}</b></div>
      <div><span>Nível alcançado</span><b>${r.level}</b></div>
      ${endless ? '' : `<div><span>Atos concluídos</span><b>${r.acts} / 3</b></div>`}
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
    row.append(this.button(r.victory ? 'Jogar novamente' : 'Tentar novamente', () => this.game.newRun(r.mode), 'primary'));
    row.append(this.button('Santuário', () => {
      this.game.toMenu();
      this.sanctuary();
    }));
    if (!r.victory && r.mode === 'campaign' && this.game.save.data.checkpoint) row.append(this.button('Repetir o ato', () => this.game.continueRun()));
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
    const ult = el('button', 'tbtn ult', '★');
    const pause = el('button', 'tbtn pause', '❚❚');
    this.touch.append(stick, dash, pulse, ult, pause);
    this.touchActive = pulse;
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
    ult.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      input.press('ult');
    });
    pause.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      input.press('pause');
    });
  }

  private touchActive: HTMLElement | null = null;

  showTouch(on: boolean): void {
    this.touch.classList.toggle('hidden', !on);
    const w = this.game.world;
    if (on && w && this.touchActive) this.touchActive.innerHTML = `<img src="${BASE}ui/icons/${ACTIVE_ICON[w.abilities.def.active]}.png" alt="Habilidade">`;
  }

  debug(text: string | null): void {
    this.debugEl.classList.toggle('hidden', text === null);
    if (text !== null) this.debugEl.textContent = text;
  }
}
