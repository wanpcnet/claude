import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/800.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/700.css';
import './styles/main.css';
import { Application } from 'pixi.js';
import { Game } from './game/Game';
import { BASE } from './game/AssetLoader';

async function boot(): Promise<void> {
  const bar = document.getElementById('load-fill') as HTMLElement;
  const label = document.getElementById('load-label') as HTMLElement;
  const loading = document.getElementById('loading') as HTMLElement;
  const root = document.documentElement.style;
  root.setProperty('--panel', `url(${BASE}ui/panel.png)`);
  root.setProperty('--panel-gold', `url(${BASE}ui/panel_gold.png)`);
  root.setProperty('--btn', `url(${BASE}ui/button_normal.png)`);
  root.setProperty('--btn-hover', `url(${BASE}ui/button_hover.png)`);
  root.setProperty('--btn-down', `url(${BASE}ui/button_down.png)`);
  root.setProperty('--bar-frame', `url(${BASE}ui/bar_frame.png)`);
  root.setProperty('--bar-hp', `url(${BASE}ui/bar_hp.png)`);
  root.setProperty('--bar-energy', `url(${BASE}ui/bar_energy.png)`);
  root.setProperty('--bar-xp', `url(${BASE}ui/bar_xp.png)`);
  root.setProperty('--bar-boss', `url(${BASE}ui/bar_boss.png)`);
  root.setProperty('--cursor', `url(${BASE}ui/cursor.png)`);
  try {
    const app = new Application();
    await app.init({
      preference: 'webgl',
      resizeTo: window,
      background: '#07060a',
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      roundPixels: false,
      powerPreference: 'high-performance',
    });
    if (app.renderer.type !== 1 /* RendererType.WEBGL */) console.warn('Renderer não-WebGL ativo:', app.renderer.name);
    document.getElementById('game')!.appendChild(app.canvas);
    const game = new Game(app, document.getElementById('ui')!);
    await game.init((p, l) => {
      bar.style.width = `${Math.round(p * 100)}%`;
      label.textContent = l;
    });
    loading.classList.add('done');
    setTimeout(() => loading.remove(), 800);
  } catch (e) {
    console.error(e);
    label.textContent = 'Falha ao iniciar: ' + (e instanceof Error ? e.message : String(e)) + ' — verifique se o navegador suporta WebGL e recarregue a página.';
    loading.classList.add('error');
  }
}

void boot();
