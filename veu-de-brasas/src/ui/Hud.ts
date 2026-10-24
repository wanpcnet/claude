import { el, fmtTime } from './dom';
import { BASE } from '../game/AssetLoader';
import type { World } from '../world/World';
import { WEAPON_ORDER, WEAPONS } from '../content/weapons';

/** HUD de combate: vida, energia da coroa, experiência, objetivo, tempo, recargas e habilidades. */
export class Hud {
  readonly root = el('div', 'hud hidden');
  private hpFill = el('div', 'bar-fill hp');
  private hpText = el('span', 'bar-text');
  private enFill = el('div', 'bar-fill energy');
  private enText = el('span', 'bar-text');
  private xpFill = el('div', 'xp-fill');
  private lvl = el('div', 'lvl');
  private obj = el('div', 'objective');
  private timer = el('div', 'timer');
  private actName = el('div', 'act-name');
  private weapons = el('div', 'weapons');
  private dash = el('div', 'skill dash');
  private pulse = el('div', 'skill pulse');
  private bossBar = el('div', 'boss-bar hidden');
  private bossFill = el('div', 'boss-fill');
  private bossName = el('div', 'boss-name');
  private announceEl = el('div', 'announce');
  private hintEl = el('div', 'hint');
  private hurt = el('div', 'hurt-flash');
  private letterbox = el('div', 'letterbox hidden');
  private coins = el('div', 'coins');
  private kills = el('div', 'kills');
  private wIcons = new Map<string, HTMLElement>();
  private announceT = 0;
  private hintT = 0;

  constructor(parent: HTMLElement) {
    const top = el('div', 'hud-top');
    const bars = el('div', 'hud-bars panel');
    const hpBar = el('div', 'bar');
    hpBar.append(this.hpFill, this.hpText);
    const enBar = el('div', 'bar');
    enBar.append(this.enFill, this.enText);
    bars.append(this.row('p_vigor', 'Vida', hpBar), this.row('a_pulse', 'Energia da Coroa', enBar));
    const center = el('div', 'hud-center');
    center.append(this.actName, this.obj);
    const right = el('div', 'hud-right panel');
    right.append(this.timer, this.kills, this.coins);
    top.append(bars, center, right);
    const xp = el('div', 'xp-bar');
    xp.append(this.xpFill, this.lvl);
    const bottom = el('div', 'hud-bottom');
    this.dash.innerHTML = `<img src="${BASE}ui/icons/a_dash.png" alt=""><span class="cd"></span><kbd>Espaço</kbd>`;
    this.pulse.innerHTML = `<img src="${BASE}ui/icons/a_pulse.png" alt=""><span class="cd"></span><kbd>Q</kbd>`;
    this.dash.title = 'Esquiva (Espaço): curta, com invulnerabilidade breve';
    this.pulse.title = 'Pulso da Coroa (Q): gasta energia, empurra e incendeia';
    const skills = el('div', 'skills');
    skills.append(this.dash, this.pulse);
    bottom.append(this.weapons, skills);
    this.bossBar.append(this.bossName, el('div', 'boss-track'));
    this.bossBar.querySelector('.boss-track')!.append(this.bossFill);
    this.root.append(top, this.bossBar, bottom, xp, this.announceEl, this.hintEl);
    parent.append(this.hurt, this.letterbox, this.root);
    for (const id of WEAPON_ORDER) {
      const w = el('div', 'weapon hidden');
      w.innerHTML = `<img src="${BASE}ui/icons/${WEAPONS[id].icon}.png" alt=""><span class="wl"></span><span class="cd"></span>`;
      w.title = `${WEAPONS[id].name}: ${WEAPONS[id].desc}`;
      this.weapons.append(w);
      this.wIcons.set(id, w);
    }
  }

  private row(icon: string, label: string, bar: HTMLElement): HTMLElement {
    const r = el('div', 'bar-row');
    r.innerHTML = `<img src="${BASE}ui/icons/${icon}.png" alt="${label}" title="${label}">`;
    r.append(bar);
    return r;
  }

  show(on: boolean): void {
    this.root.classList.toggle('hidden', !on);
    if (!on) {
      this.bossBar.classList.add('hidden');
      this.letterbox.classList.add('hidden');
    }
  }

  reset(): void {
    this.announceT = this.hintT = 0;
    this.announceEl.classList.remove('show');
    this.hintEl.classList.remove('show');
    this.setBoss(null);
  }

  objective(text: string): void {
    this.obj.textContent = text;
    this.obj.classList.remove('pop');
    void this.obj.offsetWidth;
    this.obj.classList.add('pop');
  }

  announce(text: string): void {
    if (!text) return;
    this.announceEl.textContent = text;
    this.announceEl.classList.add('show');
    this.announceT = 2.6;
  }

  hint(text: string): void {
    this.hintEl.textContent = text;
    this.hintEl.classList.add('show');
    this.hintT = 6;
  }

  hurtFlash(reduced: boolean): void {
    this.hurt.classList.remove('on', 'soft');
    void this.hurt.offsetWidth;
    this.hurt.classList.add(reduced ? 'soft' : 'on');
  }

  denyPulse(): void {
    this.pulse.classList.remove('deny');
    void this.pulse.offsetWidth;
    this.pulse.classList.add('deny');
  }

  setBoss(name: string | null): void {
    this.bossBar.classList.toggle('hidden', !name);
    if (name) this.bossName.textContent = name;
  }

  bossIntro(name: string, sub: string): void {
    this.letterbox.classList.remove('hidden');
    this.letterbox.innerHTML = `<div class="lb-title">${name}</div><div class="lb-sub">${sub}</div>`;
    setTimeout(() => this.letterbox.classList.add('hidden'), 2600);
  }

  update(w: World, dt: number): void {
    const h = w.hero;
    const max = w.stats.maxHp;
    this.hpFill.style.width = `${(h.hp / max) * 100}%`;
    this.hpText.textContent = `${Math.ceil(h.hp)} / ${max}`;
    this.hpFill.classList.toggle('low', h.hp / max < 0.3);
    this.enFill.style.width = `${h.energy}%`;
    const cost = 55 * w.stats.pulseCostMul;
    this.enFill.classList.toggle('ready', h.energy >= cost);
    this.enText.textContent = `${Math.floor(h.energy)}`;
    this.xpFill.style.width = `${(w.xp / w.xpNext) * 100}%`;
    this.lvl.textContent = `Nível ${w.level}`;
    this.timer.textContent = fmtTime(w.runTime);
    this.kills.textContent = `☠ ${w.kills}`;
    if (this.coins.dataset.v !== String(w.coins)) {
      this.coins.dataset.v = String(w.coins);
      this.coins.innerHTML = `<img src="${BASE}ui/icons/coin.png" alt="Cinzas Eternas" class="coin-ic"> ${w.coins}`;
    }
    this.actName.textContent = w.director ? actLabel(w.actIndex) : '';
    if (w.director && this.obj.textContent !== w.director.objective && w.director.objective) this.obj.textContent = w.director.objective;
    // recargas
    const dashP = Math.max(0, h.dashCd) / (h.dashCooldown * w.stats.dashCdMul);
    (this.dash.querySelector('.cd') as HTMLElement).style.height = `${dashP * 100}%`;
    const pulseP = Math.max(0, w.weapons.pulseCd) / 3.2;
    const lacks = h.energy < cost ? 1 - h.energy / cost : 0;
    (this.pulse.querySelector('.cd') as HTMLElement).style.height = `${Math.max(pulseP, lacks) * 100}%`;
    this.pulse.classList.toggle('ready', pulseP <= 0 && lacks <= 0);
    for (const id of WEAPON_ORDER) {
      const icon = this.wIcons.get(id)!;
      const l = w.build.weapons[id];
      icon.classList.toggle('hidden', !l);
      if (l) (icon.querySelector('.wl') as HTMLElement).textContent = l >= 5 ? 'MÁX' : `Nv ${l}`;
    }
    if (w.boss) this.bossFill.style.width = `${Math.max(0, w.boss.hp / w.boss.maxHp) * 100}%`;
    this.announceT -= dt;
    if (this.announceT <= 0) this.announceEl.classList.remove('show');
    this.hintT -= dt;
    if (this.hintT <= 0) this.hintEl.classList.remove('show');
  }
}

function actLabel(i: number): string {
  return ['Ato I · Jardim das Cinzas', 'Ato II · Bosque de Vidro', 'Ato III · Santuário Submerso'][i] ?? '';
}
