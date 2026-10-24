/**
 * Gerenciador de áudio WebAudio: música com crossfade, SFX com limite por janela de tempo,
 * volumes independentes e desbloqueio após gesto do usuário.
 */
export class AudioManager {
  ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private raw = new Map<string, ArrayBuffer>();
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private master: GainNode | null = null;
  private current: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private lastPlay = new Map<string, number>();
  private playingCount = new Map<string, number>();
  musicVolume = 0.6;
  sfxVolume = 0.8;
  private pendingMusic: string | null = null;
  unlocked = false;

  /** Baixa os arquivos (decodificação acontece no desbloqueio). */
  async preload(names: string[], base: string, onProgress?: (n: number) => void): Promise<void> {
    let done = 0;
    await Promise.all(
      names.map(async (n) => {
        try {
          const res = await fetch(`${base}${n}.ogg`);
          if (!res.ok) throw new Error(`${res.status}`);
          this.raw.set(n, await res.arrayBuffer());
        } catch (e) {
          console.warn(`[áudio] falha ao carregar ${n}:`, e);
        }
        onProgress?.(++done / names.length);
      }),
    );
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return;
    this.unlocked = true;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.applyVolumes();
    await Promise.all(
      [...this.raw.entries()].map(async ([n, data]) => {
        try {
          this.buffers.set(n, await this.ctx!.decodeAudioData(data.slice(0)));
        } catch (e) {
          console.warn(`[áudio] não decodificou ${n}`, e);
        }
      }),
    );
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.pendingMusic) {
      const m = this.pendingMusic;
      this.pendingMusic = null;
      this.music(m);
    }
  }

  applyVolumes(): void {
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume * 0.55;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume * 0.7;
  }

  suspend(on: boolean): void {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  music(name: string, fade = 1.2): void {
    if (!this.ctx || !this.musicGain) {
      this.pendingMusic = name;
      return;
    }
    if (this.current?.name === name) return;
    const now = this.ctx.currentTime;
    if (this.current) {
      const old = this.current;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + fade);
      old.src.stop(now + fade + 0.05);
      this.current = null;
    }
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const loop = name !== 'music_victory' && name !== 'music_defeat';
    src.loop = loop;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(1, now + fade);
    src.connect(g).connect(this.musicGain);
    src.start(now);
    this.current = { name, src, gain: g };
  }

  stopMusic(fade = 0.8): void {
    if (!this.ctx || !this.current) return;
    const now = this.ctx.currentTime;
    this.current.gain.gain.linearRampToValueAtTime(0, now + fade);
    this.current.src.stop(now + fade + 0.05);
    this.current = null;
  }

  /** Toca efeito com limite: no máximo `max` instâncias simultâneas e intervalo mínimo `gap`. */
  sfx(name: string, opts: { volume?: number; rate?: number; gap?: number; max?: number } = {}): void {
    if (!this.ctx || !this.sfxGain) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const now = this.ctx.currentTime;
    const gap = opts.gap ?? 0.04;
    const last = this.lastPlay.get(name) ?? -1;
    if (now - last < gap) return;
    const playing = this.playingCount.get(name) ?? 0;
    if (playing >= (opts.max ?? 6)) return;
    this.lastPlay.set(name, now);
    this.playingCount.set(name, playing + 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.rate ?? 1) * (0.94 + Math.random() * 0.12);
    const g = this.ctx.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g).connect(this.sfxGain);
    src.onended = () => this.playingCount.set(name, Math.max(0, (this.playingCount.get(name) ?? 1) - 1));
    src.start(now);
  }
}

export const SFX_LIST = [
  'sfx_arrow', 'sfx_fire', 'sfx_lance', 'sfx_thunder', 'sfx_glass', 'sfx_wind', 'sfx_dash', 'sfx_hurt', 'sfx_hit', 'sfx_death',
  'sfx_xp', 'sfx_heal', 'sfx_card_open', 'sfx_card_select', 'sfx_rare', 'sfx_legendary', 'sfx_anchor', 'sfx_levelup', 'sfx_pulse',
  'sfx_explosion', 'sfx_roar', 'sfx_land', 'sfx_warn', 'sfx_ui_hover', 'sfx_ui_click', 'sfx_orb', 'sfx_summon', 'sfx_armor_break',
  'music_menu', 'music_combat', 'music_boss', 'music_victory', 'music_defeat',
];
