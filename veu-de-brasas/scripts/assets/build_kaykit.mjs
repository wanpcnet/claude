// Sprites dos personagens a partir dos modelos 3D KayKit (Kay Lousberg, CC0), renderizados com three.js
// num Chromium headless no ângulo da câmera do jogo. Gera, no mesmo formato que o jogo já lê:
//   public/assets/chars/hero_<id>.{webp,json}, enemies.*, bosses.*, portrait_<id>.webp e manifest.json
// Cada personagem: 5 direções desenhadas (S, SE, E, NE, N); o jogo espelha para SW, W e NW.
// Pacotes de origem em assets-src/kaykit/ (baixe com: python3 scripts/assets/fetch_kaykit.py).
// Uso: node scripts/assets/build_kaykit.mjs [hero|enemies|bosses|portraits ...]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'public', 'assets', 'chars');
const K = '/assets-src/kaykit';
const ADV = `${K}/KayKit_Adventurers_2.0_FREE`;
const SKL = `${K}/KayKit_Skeletons_1.1_FREE`;
const ANIMS = `${K}/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium`;
const ANIM_FILES = ['General', 'MovementBasic', 'MovementAdvanced', 'CombatMelee', 'CombatRanged', 'Special'].map((n) => `${ANIMS}/Rig_Medium_${n}.glb`);
const want = new Set(process.argv.slice(2));
const on = (k) => !want.size || want.has(k);

if (!existsSync(join(ROOT, ADV.slice(1)))) {
  console.error('Pacotes KayKit ausentes em assets-src/kaykit — rode: python3 scripts/assets/fetch_kaykit.py');
  process.exit(1);
}

// ---------------------------------------------------------------- definições
// anim: [clipe, quadros, modo('loop'|'once'|'pose'), fps?, fração(ões) para 'pose']
const W = (f) => `${ADV}/Assets/gltf/${f}.gltf`;
const SW = (f) => `${SKL}/assets/gltf/${f}.gltf`;
const R = 'handslotr', L = 'handslotl';

const HERO_ANIMS = (atk1, atk2) => ({
  idle: ['Idle_A', 4, 'loop'], walk: ['Running_A', 6, 'loop'], shoot: [atk1, 5, 'once', 15], shoot2: [atk2, 5, 'once', 15],
  dash: ['Dodge_Forward', 3, 'once', 14], hurt: ['Hit_A', 3, 'once', 10], death: ['Death_A', 5, 'once', 8],
});
const HEROES = {
  knight: { model: `${ADV}/Characters/gltf/Knight.glb`, attach: [[W('sword_1handed'), R], [W('shield_badge_color'), L]], anims: HERO_ANIMS('Melee_1H_Attack_Slice_Diagonal', 'Melee_1H_Attack_Chop') },
  lysa: { model: `${ADV}/Characters/gltf/Ranger.glb`, attach: [[W('bow_withString'), L], [W('quiver'), null]], anims: HERO_ANIMS('Ranged_Bow_Release', 'Ranged_Bow_Draw') },
  orin: { model: `${ADV}/Characters/gltf/Mage.glb`, attach: [[W('staff'), R]], anims: HERO_ANIMS('Ranged_Magic_Shoot', 'Ranged_Magic_Spellcasting') },
  brann: { model: `${ADV}/Characters/gltf/Barbarian.glb`, attach: [[W('axe_2handed'), R]], anims: HERO_ANIMS('Melee_2H_Attack_Chop', 'Melee_2H_Attack_Slice') },
  nyx: { model: `${ADV}/Characters/gltf/Rogue_Hooded.glb`, attach: [[W('dagger'), R], [W('dagger'), L]], anims: HERO_ANIMS('Melee_Dualwield_Attack_Slice', 'Ranged_Magic_Summon') },
};
const HERO_H = 64; // altura do herói em px de mundo

const SK = (n) => `${SKL}/characters/gltf/Skeleton_${n}.glb`;
const DEATH = ['Skeletons_Death', 5, 'once', 9];
const ENEMIES = {
  rust: { model: SK('Minion'), h: 40, attach: [[SW('Skeleton_Blade'), R]], anims: { walk: ['Running_A', 6, 'loop'], death: DEATH } },
  spider: { model: SK('Rogue'), h: 44, tint: 0x9a8aa8, attach: [[SW('Skeleton_Blade'), R], [SW('Skeleton_Blade'), L]], anims: { walk: ['Running_B', 6, 'loop'], lunge: ['Melee_Dualwield_Attack_Stab', 4, 'once', 10], death: DEATH } },
  wasp: { model: SK('Minion'), h: 42, tint: 0x9ad0ff, attach: [[SW('Skeleton_Blade'), R]], anims: { fly: ['Running_B', 6, 'loop'], dive: ['Melee_1H_Attack_Jump_Chop', 4, 'once', 12], death: DEATH } },
  frog: { model: SK('Warrior'), h: 48, tint: 0xc8b080, attach: [[SW('Skeleton_Axe'), R]], anims: { idle: ['Skeletons_Idle', 4, 'loop'], crouch: ['Jump_Start', 1, 'pose', 6, [0.6]], jump: ['Jump_Idle', 1, 'pose', 6, [0.5]], land: ['Jump_Land', 1, 'pose', 6, [0.3]], death: DEATH } },
  slime: { model: SK('Warrior'), h: 54, tint: 0x9fc890, attach: [[SW('Skeleton_Axe'), R], [SW('Skeleton_Shield_Small_A'), L]], anims: { walk: ['Skeletons_Walking', 6, 'loop'], attack: ['Melee_1H_Attack_Chop', 5, 'once', 10], death: DEATH } },
  shell: { model: SK('Warrior'), h: 58, tint: 0x8890a8, attach: [[SW('Skeleton_Blade'), R], [SW('Skeleton_Shield_Large_A'), L]], anims: { walk: ['Skeletons_Walking', 6, 'loop'], windup: ['Melee_Blocking', 3, 'loop'], charge: ['Running_A', 6, 'loop'], death: DEATH } },
  ghost: { model: SK('Mage'), h: 50, tint: 0xc0a8ff, attach: [[SW('Skeleton_Staff'), R]], anims: { float: ['Skeletons_Walking', 6, 'loop'], cast: ['Ranged_Magic_Shoot', 4, 'once', 8], death: DEATH } },
  guardian: { model: SK('Warrior'), h: 82, tint: 0xd09078, attach: [[SW('Skeleton_Axe'), R], [SW('Skeleton_Shield_Large_B'), L]], anims: { walk: ['Skeletons_Walking', 6, 'loop'], windup: ['Melee_2H_Attack_Chop', 4, 'once', 6], death: DEATH } },
  priestess: { model: SK('Mage'), h: 78, tint: 0x90d8ff, attach: [[SW('Skeleton_Staff'), R]], anims: { float: ['Skeletons_Walking', 6, 'loop'], cast: ['Ranged_Magic_Spellcasting', 5, 'once', 8], death: DEATH } },
};
// a Campeã sem escudo (fase "quebrada") reaproveita o mesmo personagem sem o escudo
const GUARDIAN_BROKEN = { ...ENEMIES.guardian, attach: [[SW('Skeleton_Axe'), R]], anims: { broken: ['Skeletons_Walking', 6, 'loop'] } };
const BOSSES = {
  toad: { model: SK('Warrior'), h: 120, tint: 0xffb090, attach: [[SW('Skeleton_Axe'), R], [SW('Skeleton_Shield_Large_A'), L]],
    anims: { idle: ['Skeletons_Idle', 4, 'loop'], rage: ['Skeletons_Taunt', 4, 'once', 6], crouch: ['Jump_Start', 1, 'pose', 4, [0.6]], air: ['Jump_Idle', 2, 'loop', 5],
      land: ['Jump_Land', 2, 'once', 4], spit: ['Melee_2H_Attack_Chop', 4, 'once', 6], death: DEATH } },
  heart: { model: SK('Mage'), h: 120, tint: 0xb090ff, attach: [[SW('Skeleton_Staff'), R]],
    anims: { p0: ['Skeletons_Idle', 4, 'loop'], p1: ['Skeletons_Walking', 4, 'loop'], p2: ['Running_A', 4, 'loop'],
      flare0: ['Ranged_Magic_Shoot', 3, 'once', 6], flare1: ['Ranged_Magic_Spellcasting', 3, 'once', 6], flare2: ['Ranged_Magic_Summon', 3, 'once', 6], death: DEATH } },
};

// ---------------------------------------------------------------- servidor + navegador
const MIME = { '.js': 'text/javascript', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
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

// biblioteca de renderização dentro da página
await page.evaluate(async (ANIM_FILES) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const ELEV = (35 * Math.PI) / 180; // câmera mais baixa: rosto e corpo legíveis no tamanho do jogo
  const DIRS = [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180]];
  const loader = new GLTFLoader();
  const cache = {};
  const load = (f) => (cache[f] ??= loader.loadAsync(f));
  const clips = {};
  for (const f of ANIM_FILES) for (const c of (await load(f)).animations) clips[c.name] ??= c;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const lights = () => {
    const g = new THREE.Group();
    g.add(new THREE.HemisphereLight(0xc8d0e8, 0x403428, 1.5));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
    key.position.set(-3, 6, 4);
    g.add(key);
    const rim = new THREE.DirectionalLight(0xa0b8ff, 1.0);
    rim.position.set(3, 3, -4);
    g.add(rim);
    return g;
  };

  async function makeChar(def) {
    const src = await load(def.model);
    const obj = clone(src.scene);
    for (const [file, bone] of def.attach ?? []) {
      const w = (await load(file)).scene.clone(true);
      if (bone) {
        const b = obj.getObjectByName(bone);
        if (!b) throw new Error(`osso ${bone} ausente em ${def.model}`);
        b.add(w);
      } else {
        // aljava/acessório nas costas
        const sp = obj.getObjectByName('chest') ?? obj.getObjectByName('spine') ?? obj;
        w.position.set(0, 0.1, -0.25);
        sp.add(w);
      }
    }
    if (def.tint) {
      const t = new THREE.Color(def.tint);
      obj.traverse((m) => {
        if (m.isMesh) {
          m.material = m.material.clone();
          m.material.color.multiply(t);
        }
      });
    }
    obj.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
    const pivot = new THREE.Group();
    pivot.add(obj);
    const mixer = new THREE.AnimationMixer(obj);
    // altura de referência na pose parada
    mixer.clipAction(clips.Idle_A ?? clips.Skeletons_Idle).play();
    mixer.setTime(0);
    const box = new THREE.Box3().setFromObject(obj);
    mixer.stopAllAction();
    return { obj, pivot, mixer, height: box.max.y - box.min.y };
  }

  const times = (clip, n, mode, at) => {
    const d = clip.duration;
    if (mode === 'pose') return (at ?? [0.5]).map((f) => f * d);
    if (mode === 'loop') return [...Array(n)].map((_, i) => (i * d) / n);
    return [...Array(n)].map((_, i) => (n === 1 ? d * 0.5 : (i * d * 0.98) / (n - 1)));
  };

  // renderiza todas as animações × direções de um personagem; devolve quadros recortados pela caixa comum
  window.renderChar = async function (def, scale) {
    const SS = 2;
    const ch = await makeChar(def);
    const scene = new THREE.Scene();
    scene.add(lights(), ch.pivot);
    const unitPx = (def.h * scale * SS) / ch.height; // px de render por unidade do modelo
    const half = ch.height * 1.35;
    const cam = new THREE.OrthographicCamera(-half, half, half + ch.height * 0.35, -half + ch.height * 0.35, -50, 50);
    cam.position.set(0, Math.sin(ELEV) * 10, Math.cos(ELEV) * 10);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    const size = Math.ceil(half * 2 * unitPx);
    renderer.setSize(size, size, false);
    const out = Math.ceil(size / SS);
    const frames = [];
    const info = { anims: {} };
    for (const [name, [clipName, n, mode, fps, at]] of Object.entries(def.anims)) {
      const clip = clips[clipName];
      if (!clip) throw new Error(`clipe ${clipName} não existe`);
      const ts = times(clip, n, mode, at);
      info.anims[name] = { frames: ts.length, fps: +(fps ?? ts.length / clip.duration).toFixed(2) };
      ch.mixer.stopAllAction();
      const act = ch.mixer.clipAction(clip);
      act.reset().play();
      for (const [dname, yaw] of DIRS) {
        ch.pivot.rotation.y = (yaw * Math.PI) / 180;
        ts.forEach((t, i) => {
          ch.mixer.setTime(t);
          renderer.render(scene, cam);
          const c = Object.assign(document.createElement('canvas'), { width: out, height: out });
          const g = c.getContext('2d');
          g.imageSmoothingQuality = 'high';
          g.drawImage(renderer.domElement, 0, 0, out, out);
          frames.push({ key: `${name}_${dname}_${i}`, c });
        });
      }
    }
    // caixa comum (pivô dos pés fixo em todos os quadros)
    let x0 = out, y0 = out, x1 = 0, y1 = 0;
    for (const f of frames) {
      const d = f.c.getContext('2d').getImageData(0, 0, out, out).data;
      let a0 = out, b0 = out, a1 = 0, b1 = 0;
      for (let y = 0; y < out; y++) for (let x = 0; x < out; x++) if (d[(y * out + x) * 4 + 3] > 8) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
      if (a1 < a0) { a0 = b0 = 0; a1 = b1 = 0; }
      f.bb = [a0, b0, a1, b1];
      x0 = Math.min(x0, a0); y0 = Math.min(y0, b0); x1 = Math.max(x1, a1); y1 = Math.max(y1, b1);
    }
    const o = new THREE.Vector3(0, 0, 0).project(cam);
    const ox = ((o.x + 1) / 2) * out, oy = ((1 - o.y) / 2) * out;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    info.anchor = [+((ox - x0) / w).toFixed(4), +((oy - y0) / h).toFixed(4)];
    info.size = [+(w / scale).toFixed(1), +(h / scale).toFixed(1)];
    // cada quadro guarda só a sua área visível; o deslocamento dentro da caixa comum vai no JSON (trim)
    for (const f of frames) {
      const [a0, b0, a1, b1] = f.bb;
      const fw = a1 - a0 + 1, fh = b1 - b0 + 1;
      const c = Object.assign(document.createElement('canvas'), { width: fw, height: fh });
      c.getContext('2d').drawImage(f.c, a0, b0, fw, fh, 0, 0, fw, fh);
      f.c = c;
      f.trim = { x: a0 - x0, y: b0 - y0, W: w, H: h };
    }
    return { frames, info };
  };

  // atlas em prateleiras → { webp, json }
  window.packAtlas = function (name, items, scale, maxW) {
    const PAD = 2;
    items.sort((a, b) => b.c.height - a.c.height || b.c.width - a.c.width);
    let x = 0, y = 0, rowH = 0, W = 0;
    for (const it of items) {
      if (x + it.c.width + PAD * 2 > maxW) { x = 0; y += rowH; rowH = 0; }
      it.x = x + PAD; it.y = y + PAD;
      x += it.c.width + PAD * 2; rowH = Math.max(rowH, it.c.height + PAD * 2); W = Math.max(W, x);
    }
    // tamanho exato (múltiplo de 4): WebGL2 aceita texturas não-potência-de-2, e economiza memória no celular
    const r4 = (v) => Math.ceil(v / 4) * 4;
    const AW = r4(W), AH = r4(y + rowH);
    const atlas = Object.assign(document.createElement('canvas'), { width: AW, height: AH });
    const g = atlas.getContext('2d');
    const frames = {}, animations = {};
    for (const it of items) {
      g.drawImage(it.c, it.x, it.y);
      const w = it.c.width, h = it.c.height;
      const t = it.trim;
      frames[it.key] = t
        ? { frame: { x: it.x, y: it.y, w, h }, rotated: false, trimmed: true, spriteSourceSize: { x: t.x, y: t.y, w, h }, sourceSize: { w: t.W, h: t.H } }
        : { frame: { x: it.x, y: it.y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } };
      const base = it.key.slice(0, it.key.lastIndexOf('_'));
      (animations[base] ??= []).push(it.key);
    }
    for (const v of Object.values(animations)) v.sort((a, b) => +a.slice(a.lastIndexOf('_') + 1) - +b.slice(b.lastIndexOf('_') + 1));
    return { webp: atlas.toDataURL('image/webp', 0.9), json: { frames, animations, meta: { app: 'veu-de-brasas/build_kaykit', image: name + '.webp', format: 'RGBA8888', size: { w: AW, h: AH }, scale: String(scale) } } };
  };

  // retrato: busto de frente, levemente virado
  window.renderPortrait = async function (def) {
    const ch = await makeChar(def);
    const scene = new THREE.Scene();
    scene.add(lights(), ch.pivot);
    ch.pivot.rotation.y = (20 * Math.PI) / 180;
    ch.mixer.clipAction(clips.Idle_A).play();
    ch.mixer.setTime(0.2);
    const hgt = ch.height;
    const cam = new THREE.OrthographicCamera(-hgt * 0.42, hgt * 0.42, hgt * 0.42, -hgt * 0.42, -50, 50);
    cam.position.set(0, hgt * 0.68 + 2, 10);
    cam.lookAt(0, hgt * 0.62, 0);
    cam.updateProjectionMatrix();
    renderer.setSize(512, 512, false);
    renderer.render(scene, cam);
    const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(renderer.domElement, 0, 0, 256, 256);
    return c.toDataURL('image/webp', 0.92);
  };
}, ANIM_FILES);

mkdirSync(OUT, { recursive: true });
const manPath = join(OUT, 'manifest.json');
const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : { hero: {}, enemies: {}, bosses: {} };
const save = (name, r) => {
  writeFileSync(join(OUT, name + '.webp'), Buffer.from(r.webp.split(',')[1], 'base64'));
  writeFileSync(join(OUT, name + '.json'), JSON.stringify(r.json));
  console.log(`${name}: ${r.json.meta.size.w}x${r.json.meta.size.h}, ${Object.keys(r.json.frames).length} quadros`);
};
const t0 = Date.now();

if (on('hero')) {
  for (const [id, def] of Object.entries(HEROES)) {
    const r = await page.evaluate(async ({ id, def, h }) => {
      const { frames, info } = await window.renderChar({ ...def, h }, 2);
      const key = `hero_${id}`;
      return { info, atlas: window.packAtlas(key, frames.map((f) => ({ key: `${key}_${f.key}`, c: f.c, trim: f.trim })), 2, 4096) };
    }, { id, def, h: HERO_H });
    man.hero[id] = r.info;
    save(`hero_${id}`, r.atlas);
  }
}
if (on('enemies')) {
  const r = await page.evaluate(async ({ ENEMIES, GUARDIAN_BROKEN }) => {
    const items = [], infos = {};
    for (const [id, def] of Object.entries(ENEMIES)) {
      const { frames, info } = await window.renderChar(def, 2);
      infos[id] = info;
      for (const f of frames) items.push({ key: `${id}_${f.key}`, c: f.c, trim: f.trim });
    }
    const b = await window.renderChar(GUARDIAN_BROKEN, 2);
    Object.assign(infos.guardian.anims, b.info.anims);
    for (const f of b.frames) items.push({ key: `guardian_${f.key}`, c: f.c, trim: f.trim });
    return { infos, atlas: window.packAtlas('enemies', items, 2, 4096) };
  }, { ENEMIES, GUARDIAN_BROKEN });
  man.enemies = r.infos;
  save('enemies', r.atlas);
}
if (on('bosses')) {
  const r = await page.evaluate(async ({ BOSSES }) => {
    const items = [], infos = {};
    for (const [id, def] of Object.entries(BOSSES)) {
      const { frames, info } = await window.renderChar(def, 1.5);
      infos[id] = info;
      for (const f of frames) items.push({ key: `${id}_${f.key}`, c: f.c, trim: f.trim });
    }
    return { infos, atlas: window.packAtlas('bosses', items, 1.5, 4096) };
  }, { BOSSES });
  man.bosses = r.infos;
  save('bosses', r.atlas);
}
if (on('portraits')) {
  for (const [id, def] of Object.entries(HEROES)) {
    const url = await page.evaluate(async (def) => window.renderPortrait(def), def);
    writeFileSync(join(OUT, `portrait_${id}.webp`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('retratos ok');
}
writeFileSync(manPath, JSON.stringify(man, null, 1));
console.log(`pronto em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();
server.close();
process.exit(0);
