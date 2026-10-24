import { Assets, Spritesheet, Texture, TextureStyle } from 'pixi.js';
import { AudioManager, SFX_LIST } from './AudioManager';

/** URL absoluta (evita resolução relativa à folha de estilo em variáveis CSS). */
export const BASE = new URL(import.meta.env.BASE_URL + 'assets/', location.href).href;

const ATLASES = {
  hero_lysa: 'characters/hero_lysa.json',
  hero_orin: 'characters/hero_orin.json',
  hero_brann: 'characters/hero_brann.json',
  hero_nyx: 'characters/hero_nyx.json',
  enemies: 'enemies/enemies.json',
  bosses: 'enemies/bosses.json',
  fx: 'effects/fx.json',
  props: 'environment/props.json',
  icons: 'ui/icons.json',
} as const;

export type AtlasName = keyof typeof ATLASES;

/** Carregador central: resolve caminhos, informa progresso e registra falhas de assets. */
export class AssetLoader {
  sheets = {} as Record<AtlasName, Spritesheet>;
  ground: Record<string, { width: number; height: number; chunks: { file: string; x: number; y: number; w: number; h: number }[] }> = {};
  keyart: Texture = Texture.EMPTY;
  failures: string[] = [];

  async load(audio: AudioManager, onProgress: (p: number, label: string) => void): Promise<void> {
    TextureStyle.defaultOptions.scaleMode = 'nearest';
    const names = Object.keys(ATLASES) as AtlasName[];
    let step = 0;
    const total = names.length + 5;
    const tick = (label: string) => onProgress(++step / total, label);
    for (const n of names) {
      try {
        this.sheets[n] = await Assets.load<Spritesheet>(BASE + ATLASES[n]);
      } catch (e) {
        this.fail(ATLASES[n], e);
      }
      tick(`Atlas: ${n}`);
    }
    const fx = this.sheets.fx;
    if (fx) {
      // efeitos suaves usam filtragem linear; ícones e sprites permanecem nítidos
      fx.textureSource.scaleMode = 'linear';
    }
    try {
      await Assets.load(BASE + 'ui/dmg.fnt');
    } catch (e) {
      this.fail('ui/dmg.fnt', e);
    }
    tick('Fonte de números');
    try {
      this.keyart = await Assets.load<Texture>(BASE + 'ui/keyart.png');
    } catch (e) {
      this.fail('ui/keyart.png', e);
    }
    tick('Ilustração');
    for (const m of ['arenaA', 'arenaB', 'arenaC']) {
      try {
        const res = await fetch(`${BASE}environment/ground/${m}_chunks.json`);
        if (!res.ok) throw new Error(String(res.status));
        this.ground[m] = await res.json();
      } catch (e) {
        this.fail(`ground/${m}`, e);
      }
    }
    tick('Mapas');
    await audio.preload(SFX_LIST, BASE + 'audio/', () => undefined);
    tick('Áudio');
    if (this.failures.length) throw new Error('Falha ao carregar: ' + this.failures.join(', '));
    tick('Pronto');
  }

  /** Texturas do solo de uma arena (carregadas sob demanda na transição de ato). */
  async loadGround(map: string): Promise<{ tex: Texture; x: number; y: number }[]> {
    const g = this.ground[map];
    const out: { tex: Texture; x: number; y: number }[] = [];
    const urls = g.chunks.map((c) => `${BASE}environment/ground/${c.file}`);
    const texs = await Assets.load<Texture>(urls);
    g.chunks.forEach((c, i) => out.push({ tex: texs[urls[i]], x: c.x, y: c.y }));
    return out;
  }

  async unloadGround(map: string): Promise<void> {
    const g = this.ground[map];
    if (!g) return;
    await Assets.unload(g.chunks.map((c) => `${BASE}environment/ground/${c.file}`));
  }

  private fail(what: string, e: unknown): void {
    console.error(`[assets] falhou: ${what}`, e);
    this.failures.push(what);
  }

  tex(sheet: AtlasName, name: string): Texture {
    const t = this.sheets[sheet]?.textures[name];
    if (!t) {
      console.warn(`[assets] textura ausente ${sheet}/${name}`);
      return Texture.EMPTY;
    }
    return t;
  }

  anim(sheet: AtlasName, name: string): Texture[] {
    const a = this.sheets[sheet]?.animations[name];
    if (!a) {
      console.warn(`[assets] animação ausente ${sheet}/${name}`);
      return [Texture.EMPTY];
    }
    return a;
  }
}
