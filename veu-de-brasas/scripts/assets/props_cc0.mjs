// Props do cenário renderizados a partir de modelos 3D CC0 (Poly Haven), no mesmo ângulo 2.5D dos
// sprites SOV. Baixa os glTF (1k) para assets-src/cc0/models/ (fora do Git), renderiza cada prop com
// three.js num Chromium headless e empacota tudo em public/assets/environment/props.{webp,json}.
// A Âncora e a fenda (rift) continuam vindo do atlas vetorial antigo (props_keep.png).
// Uso: node scripts/assets/props_cc0.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODELS = join(ROOT, 'assets-src', 'cc0', 'models');
const ENV = join(ROOT, 'public', 'assets', 'environment');

// frame → modelo; pick = só esse nó de um modelo-conjunto; s = maior lado na tela (px de mundo); yaw em graus
const PROPS = {
  tree_petrified_0: { m: 'dead_tree_trunk', s: 104, yaw: 20 },
  tree_petrified_1: { m: 'dead_tree_trunk_02', s: 104, yaw: 140 },
  glass_tree_0: { m: 'fir_tree_01', pick: 'fir_tree_01_a_LOD0', s: 112, yaw: 0 },
  glass_tree_1: { m: 'fir_tree_01', pick: 'fir_tree_01_b_LOD0', s: 104, yaw: 60 },
  monument_0: { m: 'gothic_statue', s: 128, yaw: -20 },
  pillar_0: { m: 'rock_07', s: 92, yaw: 0 },
  pillar_broken_0: { m: 'rock_09', s: 64, yaw: 30 },
  pillar_ruined_0: { m: 'namaqualand_boulder_03', s: 64, yaw: 0 },
  crystal_tall_0: { m: 'rock_moss_set_01', pick: 'rock_moss_set_01_rock01', s: 84, yaw: 0 },
  crystal_tall_1: { m: 'rock_moss_set_02', pick: 'rock_moss_set_02_rock08', s: 84, yaw: 90 },
  crystal_small_0: { m: 'stone_01', s: 30, yaw: 0 },
  altar_0: { m: 'rock_face_02', s: 88, yaw: 0 },
  stele_0: { m: 'marble_bust_01', s: 56, yaw: -30 },
  coral_formation_0: { m: 'namaqualand_boulders_01', pick: 'namaqualand_rocks_01_a', s: 56, yaw: 0 },
  coral_red_0: { m: 'dead_quiver_branch_01', s: 42, yaw: 0 },
  coral_red_1: { m: 'dead_quiver_branch_02', s: 42, yaw: 90 },
  coral_vine_0: { m: 'pine_roots', pick: 'pine_roots_a', s: 40, yaw: 0 },
  lantern_0: { m: 'Lantern_01', s: 36, yaw: 30 },
  lantern_crystal_0: { m: 'wooden_lantern_01', s: 36, yaw: 30 },
  brazier_0: { m: 'stone_fire_pit', s: 40, yaw: 0 },
  boulder_0: { m: 'boulder_01', s: 48, yaw: 0 },
  boulder_1: { m: 'namaqualand_boulder_02', s: 48, yaw: 120 },
  copper_sigil_0: { m: 'moss_01', pick: 'moss_01_a_LOD0', s: 44, yaw: 0 },
  shrub_dead_0: { m: 'dry_branches_medium_01', pick: 'dry_branches_medium_01_a', s: 34, yaw: 0 },
  urn_0: { m: 'antique_ceramic_vase_01', s: 30, yaw: 0 },
  roots_0: { m: 'root_cluster_01', s: 60, yaw: 0 },
  glass_mushroom_0: { m: 'fern_02', pick: 'fern_02_a', s: 30, yaw: 0 },
  fungus_glow_0: { m: 'root_cluster_02', pick: 'root_cluster_02_a', s: 30, yaw: 0 },
  fungus_glow_1: { m: 'single_root', s: 30, yaw: 60 },
  debris_0: { m: 'bark_debris_01', pick: 'bark_debris_01_a', s: 34, yaw: 0 },
  fossil_flower_0: { m: 'shrub_sorrel_01', pick: 'shrub_sorrel_01_a', s: 24, yaw: 0 },
  bones_0: { m: 'sand_rocks_small_01', s: 30, yaw: 0 },
  crystal_shards_0: { m: 'sand_rocks_small_01', s: 32, yaw: 140 },
};
const KEEP = ['anchor_off', 'anchor_on', 'rift_0'];

// downloads via curl (respeita o proxy do ambiente, ao contrário do fetch do Node)
const curl = (url, out) => execFileSync('curl', ['-sSfL', '-A', 'veu-de-brasas-build', '--max-time', '300', url, ...(out ? ['-o', out] : [])], { maxBuffer: 1 << 26 });
async function download(id) {
  const dir = join(MODELS, id);
  if (existsSync(join(dir, `${id}.gltf`))) return;
  const meta = JSON.parse(curl(`https://api.polyhaven.com/files/${id}`).toString());
  const g = meta.gltf['1k'].gltf;
  const files = [[`${id}.gltf`, g.url], ...Object.entries(g.include).map(([p, v]) => [p, v.url])];
  for (const [p, url] of files) {
    const out = join(dir, p);
    mkdirSync(dirname(out), { recursive: true });
    curl(url, out);
  }
  console.log('baixado', id);
}

const ids = [...new Set(Object.values(PROPS).map((p) => p.m))];
for (const id of ids) await download(id);

const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const html = `<!doctype html><html><head><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head><body></body></html>`;
writeFileSync(join(MODELS, 'render.html'), html);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
await page.goto(`${base}/assets-src/cc0/models/render.html`);
const result = await page.evaluate(async ({ PROPS, KEEP }) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const SCALE = 2, SS = 2, PX = SCALE * SS; // px de render por px de mundo
  const ELEV = (38 * Math.PI) / 180;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const loader = new GLTFLoader();
  const cache = {};
  const out = [];
  for (const [name, cfg] of Object.entries(PROPS)) {
    if (!cache[cfg.m]) cache[cfg.m] = await loader.loadAsync(`/assets-src/cc0/models/${cfg.m}/${cfg.m}.gltf`);
    const obj = cache[cfg.m].scene.clone(true);
    if (cfg.pick) {
      const keep = obj.getObjectByName(cfg.pick);
      if (!keep) throw new Error(`nó ${cfg.pick} não existe em ${cfg.m}`);
      keep.parent.children.filter((c) => c !== keep).forEach((c) => c.removeFromParent());
    }
    const scene = new THREE.Scene();
    const pivot = new THREE.Group();
    pivot.add(obj);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    pivot.rotation.y = (cfg.yaw * Math.PI) / 180;
    scene.add(pivot);
    let box = new THREE.Box3().setFromObject(pivot);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box.min.y;
    // câmera ortográfica olhando de cima a ELEV graus, de frente (sul → norte)
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    cam.position.set(0, Math.sin(ELEV) * 100, Math.cos(ELEV) * 100);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    // tamanho projetado em unidades do modelo → escala para s px de mundo
    box = new THREE.Box3().setFromObject(pivot);
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse));
    const xs = corners.map((v) => v.x), ys = corners.map((v) => v.y);
    const pw = Math.max(...xs) - Math.min(...xs), ph = Math.max(...ys) - Math.min(...ys);
    const k = cfg.s / Math.max(pw, ph); // px de mundo por unidade
    const margin = 1.5;
    const halfW = (pw * margin) / 2 + 0.25 * ph, halfH = (ph * margin) / 2;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    Object.assign(cam, { left: cx - halfW, right: cx + halfW, top: cy + halfH, bottom: cy - halfH });
    cam.updateProjectionMatrix();
    const W = Math.ceil(halfW * 2 * k * PX), H = Math.ceil(halfH * 2 * k * PX);
    renderer.setSize(W, H, false);
    // luz: chave quente vinda de cima/esquerda/frente, contra-luz fria, ambiente escuro
    const size = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
    const key = new THREE.DirectionalLight(0xffd8b0, 3.2);
    key.position.set(-size * 0.5, size * 2.4, size * 0.7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -size * 2, right: size * 2, top: size * 2, bottom: -size * 2, near: 0.01, far: size * 8 });
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8aa8ff, 1.1);
    rim.position.set(size, size, -size);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x6a6a80, 0x201810, 0.9));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size * 6, size * 6), new THREE.ShadowMaterial({ opacity: 0.55 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    renderer.render(scene, cam);
    // reduz SS× e recorta pelo alfa
    const cw = Math.ceil(W / SS), ch = Math.ceil(H / SS);
    const cv = Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    const g = cv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(renderer.domElement, 0, 0, cw, ch);
    const data = g.getImageData(0, 0, cw, ch).data;
    let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (data[(y * cw + x) * 4 + 3] > 6) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    // pivô = origem do modelo (centro da base) projetada
    const o = new THREE.Vector3(0, 0, 0).project(cam);
    const ox = ((o.x + 1) / 2) * cw, oy = ((1 - o.y) / 2) * ch;
    const tw = x1 - x0 + 1, th = y1 - y0 + 1;
    const crop = Object.assign(document.createElement('canvas'), { width: tw, height: th });
    crop.getContext('2d').drawImage(cv, x0, y0, tw, th, 0, 0, tw, th);
    out.push({ name, canvas: crop, anchor: [+((ox - x0) / tw).toFixed(4), +((oy - y0) / th).toFixed(4)] });
  }
  // frames mantidos do atlas antigo
  const old = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = '/public/assets/environment/props_keep.png'; });
  const oldJson = await (await fetch('/public/assets/environment/props_keep.json')).json();
  for (const n of KEEP) {
    const f = oldJson[n];
    const cv = Object.assign(document.createElement('canvas'), { width: f.w, height: f.h });
    cv.getContext('2d').drawImage(old, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    out.push({ name: n, canvas: cv, anchor: n === 'rift_0' ? [0.5, 0.5] : [0.5, 0.94] });
  }
  // empacotamento em prateleiras
  out.sort((a, b) => b.canvas.height - a.canvas.height);
  const AW = 2048, PAD = 2;
  let x = 0, y = 0, rowH = 0;
  for (const it of out) {
    if (x + it.canvas.width > AW) { x = 0; y += rowH + PAD; rowH = 0; }
    it.x = x; it.y = y; x += it.canvas.width + PAD; rowH = Math.max(rowH, it.canvas.height);
  }
  const AH = 2 ** Math.ceil(Math.log2(y + rowH));
  const atlas = Object.assign(document.createElement('canvas'), { width: AW, height: AH });
  const ag = atlas.getContext('2d');
  const frames = {};
  for (const it of out) {
    ag.drawImage(it.canvas, it.x, it.y);
    const w = it.canvas.width, h = it.canvas.height;
    frames[it.name] = { frame: { x: it.x, y: it.y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h }, anchor: { x: it.anchor[0], y: it.anchor[1] } };
  }
  const webp = atlas.toDataURL('image/webp', 0.9);
  return { webp, json: { frames, meta: { app: 'veu-de-brasas/scripts/assets/props_cc0.mjs', version: '1.0', image: 'props.webp', format: 'RGBA8888', size: { w: AW, h: AH }, scale: '2' } } };
}, { PROPS, KEEP });
writeFileSync(join(ENV, 'props.webp'), Buffer.from(result.webp.split(',')[1], 'base64'));
writeFileSync(join(ENV, 'props.json'), JSON.stringify(result.json));
console.log('props', Object.keys(result.json.frames).length, result.json.meta.size);
await browser.close();
server.close();
