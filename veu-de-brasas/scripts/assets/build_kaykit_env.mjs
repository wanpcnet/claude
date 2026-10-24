// Cenário a partir dos pacotes KayKit (CC0): camadas de solo de cada tema e o atlas de props.
// - Camadas (assets-src/kaykit/layers/<tema>_<camada>.png, 1 px = 1 px de mundo, mapa inteiro):
//   floor/var/path vistos de cima; "blocks" (rocha elevada #) e "edge" (paredão das bordas) vistos
//   no ângulo da câmera e esticados na vertical (o chão fica 1:1 com o mapa, as alturas sobem na tela).
//   Depois rode scripts/assets/ground_kaykit.py, que compõe as camadas com os layouts ASCII.
// - Props: public/assets/environment/props.{webp,json}, mesmo ângulo e luz dos personagens.
// Uso: node scripts/assets/build_kaykit_env.mjs [layers] [props]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAYERS = join(ROOT, 'assets-src', 'kaykit', 'layers');
const ENV = join(ROOT, 'public', 'assets', 'environment');
const K = '/assets-src/kaykit';
const D = (n) => `${K}/KayKit_Dungeon_Pack_1.1_FREE/Assets/gltf/${n}.gltf`;
const F = (n) => `${K}/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/${n}.gltf`;
const KNIGHT = `${K}/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb`;
const HERO_H = 64; // mesma altura do herói em build_kaykit.mjs → define a escala de todo o cenário
const want = new Set(process.argv.slice(2));
const on = (k) => !want.size || want.has(k);

// temas: listas de [modelo, peso]; tint opcional multiplica a cor
const THEMES = {
  ash: {
    floor: [[D('floor_tile_large'), 6], [D('floor_tile_large_rocks'), 2]], floorSize: 4,
    var: [[D('floor_dirt_large'), 3], [D('floor_dirt_large_rocky'), 2]], varSize: 4,
    path: [[D('floor_tile_small'), 5], [D('floor_tile_small_decorated'), 2], [D('floor_tile_small_broken_A'), 1], [D('floor_tile_small_broken_B'), 1]], pathSize: 2,
    block: D('floor_foundation_allsides'), tint: 0xe8e0d8,
  },
  glass: {
    floor: [], floorColor: 0x6f9a4a, scatter: [[F('Grass_1_A_Color1'), 3], [F('Grass_2_A_Color1'), 3], [F('Grass_1_C_Color1'), 2], [F('Rock_1_D_Color1'), 1]],
    var: [[D('floor_dirt_large'), 3], [D('floor_dirt_large_rocky'), 1]], varSize: 4,
    path: [[D('floor_tile_small'), 4], [D('floor_tile_small_weeds_A'), 2], [D('floor_tile_small_weeds_B'), 2]], pathSize: 2,
    block: D('floor_foundation_allsides'), tint: 0xffffff,
  },
  sunken: {
    floor: [[D('floor_tile_large'), 5], [D('floor_tile_large_rocks'), 1]], floorSize: 4,
    var: [[D('floor_tile_small_broken_A'), 2], [D('floor_tile_small_broken_B'), 2]], varSize: 2,
    path: [[D('floor_tile_small_decorated'), 3], [D('floor_tile_small'), 2]], pathSize: 2,
    block: D('floor_foundation_allsides'), tint: 0xb8c8e8,
  },
};

// props: [modelo, escala extra, yaw, tint, emissivo]; o tamanho segue a escala real do KayKit
const PROPS = {
  // ato 1 — masmorra das cinzas
  tree_petrified_0: [F('Tree_Bare_1_A_Color1'), 1.6, 20, 0x9a9088], tree_petrified_1: [F('Tree_Bare_2_A_Color1'), 1.6, 140, 0x9a9088],
  coral_red_0: [D('barrel_small'), 1, 0], coral_red_1: [D('box_small_decorated'), 1, 30],
  fungus_glow_0: [D('candle_triple'), 1, 0, null, 0xffa040], fungus_glow_1: [D('candle_lit'), 1, 0, null, 0xffa040],
  boulder_0: [D('rubble_large'), 0.4, 0], boulder_1: [F('Rock_1_J_Color1'), 1.1, 60, 0xb0a8a0],
  stele_0: [D('pillar_decorated'), 0.55, 0], lantern_0: [D('torch_lit'), 1.2, 0, null, 0xff9a40],
  roots_0: [D('rubble_half'), 0.7, 30], bones_0: [D('sword_shield_broken'), 0.9, 40],
  monument_0: [D('pillar_decorated'), 1.0, 0], pillar_broken_0: [D('barrier_colum_half'), 0.9, 0],
  fossil_flower_0: [D('coin_stack_large'), 1, 0], shrub_dead_0: [F('Bush_1_A_Color1'), 0.8, 0, 0xb0a070],
  // ato 2 — floresta
  crystal_tall_0: [F('Tree_1_A_Color1'), 0.75, 0], crystal_tall_1: [F('Tree_2_A_Color1'), 0.75, 90],
  crystal_small_0: [F('Rock_2_B_Color1'), 0.9, 0], glass_tree_0: [F('Tree_3_A_Color1'), 0.75, 0], glass_tree_1: [F('Tree_4_A_Color1'), 0.75, 45],
  glass_mushroom_0: [F('Bush_1_A_Color1'), 0.8, 0], crystal_shards_0: [F('Bush_4_C_Color1'), 0.7, 0], lantern_crystal_0: [D('torch_lit'), 1.2, 0, null, 0xff9a40],
  // ato 3 — templo afundado
  pillar_0: [D('pillar'), 0.6, 0], pillar_ruined_0: [D('barrier_column'), 0.9, 0], copper_sigil_0: [D('floor_tile_big_grate'), 0.5, 0],
  urn_0: [D('keg_decorated'), 0.9, 0], brazier_0: [D('torch_lit'), 1.4, 0, null, 0xff9a40], debris_0: [D('rubble_half'), 0.6, 120],
  coral_vine_0: [D('floor_dirt_small_weeds'), 0.6, 0], coral_formation_0: [D('crates_stacked'), 0.8, 20], altar_0: [D('chest_gold'), 1.6, 0],
  // Âncora (objetivo): apagada e acesa
  anchor_off: [D('pillar_decorated'), 0.7, 0, 0x8a8494], anchor_on: [D('pillar_decorated'), 0.7, 0, null, 0xff8a30],
};
const KEEP = ['rift_0'];

const MIME = { '.js': 'text/javascript', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__render') return res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html><head><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head><body></body></html>');
  const p = join(ROOT, url);
  if (!p.startsWith(ROOT) || !existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': MIME[extname(p).toLowerCase()] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('  [render]', m.text()));
page.on('pageerror', (e) => console.error('  [erro]', e.message));
await page.goto(`http://localhost:${server.address().port}/__render`);

await page.evaluate(async ({ KNIGHT, HERO_H }) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  window.THREE = THREE;
  const loader = new GLTFLoader();
  const cache = {};
  window.load = (f) => (cache[f] ??= loader.loadAsync(f));
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setClearColor(0, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  window.renderer = r;
  // escala: px de mundo por unidade KayKit (a altura do cavaleiro parado = HERO_H px)
  const kn = (await window.load(KNIGHT)).scene;
  const box = new THREE.Box3().setFromObject(kn);
  window.PPU = HERO_H / (box.max.y - box.min.y);
  window.lights = (shadow, size = 20) => {
    const g = new THREE.Group();
    g.add(new THREE.HemisphereLight(0xc8d0e8, 0x403428, 1.5));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
    key.position.set(-3 * size, 6 * size, 4 * size);
    if (shadow) {
      key.castShadow = true;
      key.shadow.mapSize.set(4096, 4096);
      Object.assign(key.shadow.camera, { left: -size * 1.5, right: size * 1.5, top: size * 1.5, bottom: -size * 1.5, near: 0.1, far: size * 20 });
      key.shadow.bias = -0.0008;
      key.shadow.normalBias = 0.02;
    }
    g.add(key);
    const rim = new THREE.DirectionalLight(0xa0b8ff, 1.0);
    rim.position.set(3, 3, -4);
    g.add(rim);
    return g;
  };
  window.inst = async (file, tint, emissive) => {
    const o = (await window.load(file)).scene.clone(true);
    if (tint || emissive) {
      o.traverse((m) => {
        if (!m.isMesh) return;
        m.material = m.material.clone();
        if (tint) m.material.color.multiply(new THREE.Color(tint));
        if (emissive) { m.material.emissive = new THREE.Color(emissive); m.material.emissiveIntensity = 0.35; }
      });
    }
    return o;
  };
  window.canvasPNG = (c) => c.toDataURL('image/png');
}, { KNIGHT, HERO_H });
const PPU = await page.evaluate(() => window.PPU);
console.log('escala', PPU.toFixed(2), 'px por unidade KayKit');

if (on('layers')) {
  mkdirSync(LAYERS, { recursive: true });
  for (const [mapName, theme] of [['arenaA', 'ash'], ['arenaB', 'glass'], ['arenaC', 'sunken']]) {
    const map = JSON.parse(readFileSync(join(ROOT, 'src', 'content', 'maps', mapName + '.json'), 'utf8'));
    const def = THEMES[theme];
    const res = await page.evaluate(async ({ map, def }) => {
      const THREE = window.THREE, PPU = window.PPU, r = window.renderer;
      const T = map.tile, Wpx = map.width * T, Hpx = map.height * T;
      const Wu = Wpx / PPU, Hu = Hpx / PPU; // mapa em unidades KayKit; x → direita, z → baixo da tela
      const rng = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      const pick = (list) => { const tot = list.reduce((a, b) => a + b[1], 0); let v = rng() * tot; for (const [f, w] of list) if ((v -= w) <= 0) return f; return list[0][0]; };
      const out = {};
      const top = () => {
        const cam = new THREE.OrthographicCamera(0, Wu, 0, -Hu, -50, 50);
        cam.position.set(0, 20, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
        // câmera olhando para baixo: x da tela = x, y da tela = z (positivo para baixo)
        cam.left = 0; cam.right = Wu; cam.top = 0; cam.bottom = -Hu; cam.updateProjectionMatrix();
        return cam;
      };
      async function tiled(list, size, color) {
        const scene = new THREE.Scene();
        scene.add(window.lights(false));
        if (color) {
          const g = new THREE.Mesh(new THREE.PlaneGeometry(Wu * 2, Hu * 2), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
          g.rotation.x = -Math.PI / 2; scene.add(g);
        }
        if (list.length && size) {
          for (let z = size / 2; z < Hu + size; z += size) for (let x = size / 2; x < Wu + size; x += size) {
            const o = await window.inst(pick(list), def.tint !== 0xffffff ? def.tint : null);
            o.position.set(x, 0, z); o.rotation.y = (Math.floor(rng() * 4) * Math.PI) / 2; scene.add(o);
          }
        }
        return scene;
      }
      async function shot(scene, cam, w, h) {
        r.setSize(w, h, false);
        r.render(scene, cam);
        return window.canvasPNG(r.domElement);
      }
      // chão base, variação e calçamento (de cima)
      const floorScene = await tiled(def.floor, def.floorSize, def.floorColor);
      if (def.scatter) {
        for (let i = 0; i < Wu * Hu * 0.12; i++) {
          const o = await window.inst(pick(def.scatter));
          o.position.set(rng() * Wu, 0, rng() * Hu); o.rotation.y = rng() * 6.28; o.scale.setScalar(0.6 + rng() * 0.6);
          floorScene.add(o);
        }
      }
      out.floor = await shot(floorScene, top(), Wpx, Hpx);
      out.var = await shot(await tiled(def.var, def.varSize), top(), Wpx, Hpx);
      out.path = await shot(await tiled(def.path, def.pathSize), top(), Wpx, Hpx);
      // blocos elevados (#) e paredão das bordas: câmera inclinada, imagem esticada na vertical
      const ELEV = (35 * Math.PI) / 180;
      const stretch = 1 / Math.sin(ELEV);
      const cell = T / PPU;
      const rows = map.rows.map((s) => s.padEnd(map.width, '%'));
      while (rows.length < map.height) rows.push('%'.repeat(map.width));
      const at = (x, y) => (y < 0 || y >= map.height || x < 0 || x >= map.width ? '%' : rows[y][x]);
      const block = (await window.load(def.block)).scene;
      const bb = new THREE.Box3().setFromObject(block);
      const bw = bb.max.x - bb.min.x, bh = bb.max.y - bb.min.y, bd = bb.max.z - bb.min.z;
      const oblique = () => {
        // ortográfica inclinada; a projeção é composta com uma escala vertical para o chão ficar 1:1
        const cam = new THREE.OrthographicCamera(0, Wu, 0, -Hu * Math.sin(ELEV), -200, 200);
        cam.position.set(0, Math.sin(ELEV) * 100, Math.cos(ELEV) * 100);
        cam.lookAt(0, 0, 0);
        cam.updateMatrixWorld();
        // origem da tela no canto (0,0,0) do mapa
        cam.left = 0; cam.right = Wu; cam.top = 0; cam.bottom = -Hu * Math.sin(ELEV) - 0.0001;
        cam.updateProjectionMatrix();
        return cam;
      };
      async function blocks(filter, height, bottom) {
        const scene = new THREE.Scene();
        scene.add(window.lights(true, Math.max(Wu, Hu) / 2));
        const catcher = new THREE.Mesh(new THREE.PlaneGeometry(Wu * 3, Hu * 3), new THREE.ShadowMaterial({ opacity: 0.45 }));
        catcher.rotation.x = -Math.PI / 2; catcher.position.set(Wu / 2, bottom + 0.001, Hu / 2); catcher.receiveShadow = true;
        scene.add(catcher);
        for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
          if (!filter(x, y)) continue;
          const o = block.clone(true);
          o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; if (def.tint !== 0xffffff) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(def.tint)); } } });
          o.scale.set(cell / bw, height / bh, cell / bd);
          o.position.set((x + 0.5) * cell, bottom - bb.min.y * (height / bh), (y + 0.5) * cell);
          scene.add(o);
        }
        const cam = oblique();
        r.setSize(Wpx, Math.round(Hpx * Math.sin(ELEV)), false);
        r.render(scene, cam);
        // estica na vertical para o plano do chão voltar a 1:1
        const c = Object.assign(document.createElement('canvas'), { width: Wpx, height: Hpx });
        c.getContext('2d').drawImage(r.domElement, 0, 0, Wpx, Hpx);
        return window.canvasPNG(c);
      }
      out.blocks = await blocks((x, y) => at(x, y) === '#', 1.6 * cell, 0);
      // paredão: cada célula de terra é um bloco que desce até -2,4 células (só as faces viradas para o vazio aparecem)
      out.edge = await blocks((x, y) => !'%~'.includes(at(x, y)), 2.4 * cell, -2.4 * cell);
      return out;
    }, { map, def });
    for (const [k, v] of Object.entries(res)) writeFileSync(join(LAYERS, `${theme}_${k}.png`), Buffer.from(v.split(',')[1], 'base64'));
    console.log('camadas', theme, Object.keys(res).join(', '));
  }
}

if (on('props')) {
  const result = await page.evaluate(async ({ PROPS, KEEP }) => {
    const THREE = window.THREE, PPU = window.PPU, r = window.renderer;
    const SCALE = 2, SS = 2;
    const ELEV = (35 * Math.PI) / 180;
    const out = [];
    for (const [name, [file, k, yaw, tint, emissive]] of Object.entries(PROPS)) {
      const scene = new THREE.Scene();
      const o = await window.inst(file, tint, emissive);
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      const pivot = new THREE.Group();
      pivot.add(o);
      pivot.rotation.y = ((yaw ?? 0) * Math.PI) / 180;
      pivot.scale.setScalar(k ?? 1);
      scene.add(pivot);
      const box = new THREE.Box3().setFromObject(pivot);
      const sz = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      o.position.x -= c.x / (k ?? 1); o.position.z -= c.z / (k ?? 1);
      const size = Math.max(sz.x, sz.y, sz.z);
      scene.add(window.lights(true, size));
      const catcher = new THREE.Mesh(new THREE.PlaneGeometry(size * 6, size * 6), new THREE.ShadowMaterial({ opacity: 0.45 }));
      catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);
      const half = size * 1.1;
      const cam = new THREE.OrthographicCamera(-half, half, half + sz.y * 0.4, -half + sz.y * 0.4, -100, 100);
      cam.position.set(0, Math.sin(ELEV) * 20, Math.cos(ELEV) * 20);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      const px = Math.ceil(half * 2 * PPU * SCALE * SS);
      r.setSize(px, px, false);
      r.render(scene, cam);
      const n = Math.ceil(px / SS);
      const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
      const g = cv.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(r.domElement, 0, 0, n, n);
      const d = g.getImageData(0, 0, n, n).data;
      let x0 = n, y0 = n, x1 = 0, y1 = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const p = new THREE.Vector3(0, 0, 0).project(cam);
      const ox = ((p.x + 1) / 2) * n, oy = ((1 - p.y) / 2) * n;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const crop = Object.assign(document.createElement('canvas'), { width: w, height: h });
      crop.getContext('2d').drawImage(cv, x0, y0, w, h, 0, 0, w, h);
      out.push({ name, c: crop, anchor: [+((ox - x0) / w).toFixed(4), +((oy - y0) / h).toFixed(4)] });
    }
    const old = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = '/public/assets/environment/props_keep.png'; });
    const oldJson = await (await fetch('/public/assets/environment/props_keep.json')).json();
    for (const n of KEEP) {
      const f = oldJson[n];
      const cv = Object.assign(document.createElement('canvas'), { width: f.w, height: f.h });
      cv.getContext('2d').drawImage(old, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      out.push({ name: n, c: cv, anchor: [0.5, 0.5] });
    }
    out.sort((a, b) => b.c.height - a.c.height);
    const AW = 2048, PAD = 2;
    let x = 0, y = 0, rowH = 0;
    for (const it of out) {
      if (x + it.c.width + PAD > AW) { x = 0; y += rowH + PAD; rowH = 0; }
      it.x = x; it.y = y; x += it.c.width + PAD; rowH = Math.max(rowH, it.c.height);
    }
    const AH = Math.ceil((y + rowH) / 4) * 4;
    const atlas = Object.assign(document.createElement('canvas'), { width: AW, height: AH });
    const ag = atlas.getContext('2d');
    const frames = {};
    for (const it of out) {
      ag.drawImage(it.c, it.x, it.y);
      const w = it.c.width, h = it.c.height;
      frames[it.name] = { frame: { x: it.x, y: it.y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h }, anchor: { x: it.anchor[0], y: it.anchor[1] } };
    }
    return { webp: atlas.toDataURL('image/webp', 0.9), json: { frames, meta: { app: 'veu-de-brasas/build_kaykit_env', version: '1.0', image: 'props.webp', format: 'RGBA8888', size: { w: AW, h: AH }, scale: '2' } } };
  }, { PROPS, KEEP });
  writeFileSync(join(ENV, 'props.webp'), Buffer.from(result.webp.split(',')[1], 'base64'));
  writeFileSync(join(ENV, 'props.json'), JSON.stringify(result.json));
  console.log('props', Object.keys(result.json.frames).length, result.json.meta.size);
}
await browser.close();
server.close();
process.exit(0);
