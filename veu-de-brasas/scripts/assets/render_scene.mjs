// Renderiza uma cena 3D estática (câmera ortográfica) a partir de um JSON — usada para a ilustração do menu.
// Caminhos no JSON são relativos à raiz do repositório (ex.: /assets-src/kaykit/...).
// { out, w, h, view, elev, bg, items: [{ file, x, z, yaw, scale, anim, animFile, t, attach }], points, fx }
// Uso: node scripts/assets/render_scene.mjs scripts/assets/keyart.json
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const cfg = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.js': 'text/javascript', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.html': 'text/html' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/__page') return res.writeHead(200, { 'Content-Type': 'text/html' }).end(`<!doctype html><html><head><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head><body style="margin:0"></body></html>`);
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] ?? 'application/octet-stream' }).end(readFileSync(f));
}).listen(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: cfg.w ?? 1280, height: cfg.h ?? 720 } });
page.on('console', (m) => console.log('[page]', m.text()));
await page.goto(`http://localhost:${server.address().port}/__page`);
const png = await page.evaluate(async (cfg) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const W = cfg.w ?? 1280, H = cfg.h ?? 720;
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H); document.body.appendChild(r.domElement);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = cfg.exposure ?? 1;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(cfg.bg ?? '#101014');
  if (cfg.fog) scene.fog = new THREE.Fog(cfg.fog[0], cfg.fog[1], cfg.fog[2]);
  const view = cfg.view ?? 16; // metade da altura visível em metros
  const cam = new THREE.OrthographicCamera(-view * W / H, view * W / H, view, -view, -200, 400);
  const el = ((cfg.elev ?? 45) * Math.PI) / 180;
  cam.position.set(0, Math.sin(el) * 100, Math.cos(el) * 100); cam.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(cfg.sky ?? 0x9aa6c0, cfg.ground ?? 0x2a2018, cfg.hemi ?? 1.2));
  const key = new THREE.DirectionalLight(cfg.keyColor ?? 0xffe2c0, cfg.key ?? 2.6);
  key.position.set(-20, 40, 18); key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 150 }); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03;
  scene.add(key);
  for (const p of cfg.points ?? []) { const l = new THREE.PointLight(p.color, p.i, p.d ?? 12, 1.6); l.position.set(p.x, p.y ?? 1.5, p.z); scene.add(l); }
  const gl = new GLTFLoader(), fl = new FBXLoader(); const cache = {};
  const load = async (f) => cache[f] ??= (f.toLowerCase().endsWith('.fbx') ? fl.loadAsync(f).then((o) => ({ scene: o, animations: o.animations })) : gl.loadAsync(f));
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  for (const it of cfg.items) {
    const g = await load(it.file);
    const o = clone(g.scene);
    o.position.set(it.x ?? 0, it.y ?? 0, it.z ?? 0); o.rotation.y = ((it.yaw ?? 0) * Math.PI) / 180; o.scale.setScalar(it.scale ?? 1);
    o.traverse((m) => { if (m.isMesh) { m.castShadow = it.shadow !== false; m.receiveShadow = true; if (it.emissive) { m.material = m.material.clone(); m.material.emissive = new THREE.Color(it.emissive); m.material.emissiveIntensity = it.ei ?? 1; } } });
    for (const at of it.attach ?? []) {
      const bone = o.getObjectByName(at.bone);
      if (!bone) { console.log('sem osso', at.bone); continue; }
      const w = (await load(at.file)).scene.clone(true);
      w.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      bone.add(w);
    }
    scene.add(o);
    const anims = it.animFile ? (await load(it.animFile)).animations : g.animations;
    if (it.list) console.log(it.file.split('/').pop(), anims.map((a) => a.name).join(', '));
    if (it.anim && anims.length) {
      const clip = anims.find((a) => a.name === it.anim) ?? anims.find((a) => a.name.toLowerCase().includes(it.anim.toLowerCase()));
      if (clip) { const mx = new THREE.AnimationMixer(o); mx.clipAction(clip).play(); mx.update((it.t ?? 0.3) * clip.duration); }
      else console.log('sem anim', it.anim, 'em', it.file);
    }
  }
  if (cfg.groundColor) {
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: cfg.groundColor, roughness: 1 }));
    gm.rotation.x = -Math.PI / 2; gm.receiveShadow = true; scene.add(gm);
  }
  for (const fx of cfg.fx ?? []) {
    // efeito simples: anel/brilho aditivo no chão
    const c = document.createElement('canvas'); c.width = c.height = 256; const g2 = c.getContext('2d');
    const grd = g2.createRadialGradient(128, 128, fx.inner ?? 60, 128, 128, 128); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.7, fx.color); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = grd; g2.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(fx.r * 2, fx.r * 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(fx.x, 0.05, fx.z); scene.add(m);
  }
  r.render(scene, cam);
  return r.domElement.toDataURL('image/png');
}, cfg);
writeFileSync(join(ROOT, cfg.out), Buffer.from(png.split(',')[1], 'base64'));
console.log('ok', cfg.out);
await browser.close(); server.close();
process.exit(0);
