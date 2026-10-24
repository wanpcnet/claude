"""Solo das arenas com texturas fotográficas CC0 (Poly Haven), no tom dos sprites SOV.

Lê os layouts ASCII (src/content/maps/*.json) e compõe cada material com uma textura real:
abismo (%), chão (.), variação (,), calçamento (=), rocha elevada (#) e água (~).
As texturas (difusa + AO, 2k) são baixadas da API do Poly Haven na primeira execução e ficam em
assets-src/cc0/ (fora do Git). A saída — chunks WebP de 512 px + JSON — pode ir para o Git (CC0).

Uso: python3 scripts/assets/ground_cc0.py [arenaA arenaB arenaC]
"""
import json, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MAPS = os.path.join(ROOT, 'src', 'content', 'maps')
CACHE = os.path.join(ROOT, 'assets-src', 'cc0')
OUT = os.path.join(ROOT, 'public', 'assets', 'environment', 'ground')
CHUNK = 512

# material: (textura Poly Haven, px de mundo por repetição, multiplicador RGB, saturação)
THEMES = {
    # Ato 1 — cinzas e calçamento
    'ash': dict(
        floor=('burned_ground_01', 520, (0.66, 0.6, 0.56), 0.8),
        var=('dry_ground_rocks', 440, (0.6, 0.56, 0.54), 0.6),
        path=('cobblestone_floor_06', 400, (0.72, 0.68, 0.7), 0.6),
        rock=('gray_rocks', 420, (0.62, 0.6, 0.66), 0.55),
        void=(10, 7, 12), water=((14, 26, 32), (26, 44, 52)), glow=(255, 140, 60)),
    # Ato 2 — ruína musgosa
    'glass': dict(
        floor=('brown_mud_rocks_01', 480, (0.55, 0.6, 0.56), 0.7),
        var=('forest_leaves_02', 420, (0.5, 0.6, 0.5), 0.7),
        path=('cobblestone_floor_07', 380, (0.58, 0.64, 0.6), 0.65),
        rock=('lichen_rock', 440, (0.55, 0.6, 0.58), 0.6),
        void=(5, 9, 8), water=((10, 26, 24), (20, 46, 40)), glow=(255, 170, 90)),
    # Ato 3 — cinzas frias, cercadas de água
    'sunken': dict(
        floor=('burned_ground_01', 520, (0.5, 0.54, 0.62), 0.35),
        var=('dry_ground_rocks', 440, (0.46, 0.5, 0.58), 0.35),
        path=('cobblestone_floor_06', 400, (0.5, 0.54, 0.62), 0.4),
        rock=('aerial_rocks_02', 460, (0.5, 0.55, 0.64), 0.45),
        void=(4, 6, 10), water=((8, 20, 30), (16, 38, 52)), glow=(255, 130, 60)),
}


def fetch_tex(name):
    os.makedirs(CACHE, exist_ok=True)
    paths = {k: os.path.join(CACHE, f'{name}_{k}.jpg') for k in ('Diffuse', 'AO')}
    if not os.path.exists(paths['Diffuse']):
        get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'veu-de-brasas-build'}), timeout=120).read()
        meta = json.loads(get(f'https://api.polyhaven.com/files/{name}'))
        for k, path in paths.items():
            if k in meta:
                print('  baixando', name, k)
                open(path, 'wb').write(get(meta[k]['2k']['jpg']['url']))
    return {k: p for k, p in paths.items() if os.path.exists(p)}


def value_noise(h, w, scale, seed, octaves=3):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for _ in range(octaves):
        s = max(2, int(scale))
        gh, gw = h // s + 2, w // s + 2
        g = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8)).resize((gw * s, gh * s), Image.BICUBIC)
        acc += np.asarray(g, np.float32)[:h, :w] / 255 * amp
        tot += amp
        amp *= 0.5
        scale /= 2
    return acc / tot


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


def soft_mask(grid, tile, rad, thr=0.5, jitter=None):
    big = np.kron(grid.astype(np.float32), np.ones((tile, tile), np.float32))
    b = blur(big, rad)
    if jitter is not None:
        b = b + jitter
    return np.clip((b - thr) * 6 + 0.5, 0, 1)


def lerp(a, b, t):
    return a + (b - a) * t[..., None]


_tex_cache = {}


def material(spec, H, W, seed):
    """textura repetida no tamanho do mapa, com uma 2ª cópia girada/deslocada misturada por ruído (quebra a repetição)"""
    name, px, mul, sat = spec
    key = (name, px)
    if key not in _tex_cache:
        f = fetch_tex(name)
        d = np.asarray(Image.open(f['Diffuse']).convert('RGB').resize((px, px), Image.LANCZOS), np.float32)
        if 'AO' in f:
            ao = np.asarray(Image.open(f['AO']).convert('L').resize((px, px), Image.LANCZOS), np.float32) / 255
            d = d * (0.35 + 0.65 * ao[..., None])
        g = d.mean(axis=2, keepdims=True)
        d = g + (d - g) * sat
        _tex_cache[key] = d
    t = _tex_cache[key]
    reps = (H // px + 2, W // px + 2, 1)
    a = np.tile(t, reps)[:H, :W]
    t2 = np.rot90(t, 1)
    o = px // 3
    b = np.tile(t2, reps)[o:o + H, o:o + W]
    m = np.clip((value_noise(H, W, px * 0.9, seed, 2) - 0.5) * 3 + 0.5, 0, 1)
    return lerp(a, b, m) * np.array(mul, np.float32)


def bake(name):
    m = json.load(open(os.path.join(MAPS, name + '.json')))
    W, H, T = m['width'], m['height'], m['tile']
    rows = [r.ljust(W, '%')[:W] for r in m['rows']]
    rows += ['%' * W] * (H - len(rows))
    th = THEMES[m['theme']]
    PW, PH = W * T, H * T
    cls = np.zeros((H, W), np.int32)
    for y, row in enumerate(rows[:H]):
        for x, ch in enumerate(row):
            cls[y, x] = {'%': 0, '~': 1, '#': 5, ',': 3, '=': 4}.get(ch, 2)
    seed = sum(map(ord, name))
    n1 = value_noise(PH, PW, 260, seed, 3)
    jit = (value_noise(PH, PW, 40, seed + 2, 2) - 0.5) * 0.28

    # ------------------------------------------------ abismo: rocha quase negra + névoa
    rock_t = material(th['rock'], PH, PW, seed + 10)
    void = np.array(th['void'], np.float32)
    img = void + rock_t * 0.12 * (0.6 + n1[..., None] * 0.8)

    land = soft_mask(cls > 0, T, 7, jitter=jit * 0.5)
    # paredão: o chão continua para baixo como uma face de rocha que escurece
    drop = 26
    face = np.zeros_like(land)
    for k in range(1, drop + 1):
        sh = np.zeros_like(land)
        sh[k:] = land[:-k]
        face = np.maximum(face, sh * (1 - k / drop))
    cliff = np.clip(face - land, 0, 1)
    img = lerp(img, rock_t * (0.25 + face[..., None] * 0.45), np.clip(cliff * 2.2, 0, 1))
    glow = np.clip(blur(land, 22) - land, 0, 1)
    img += glow[..., None] * np.array(th['glow'], np.float32) * 0.05

    # ------------------------------------------------ chão + variação
    floor = material(th['floor'], PH, PW, seed + 20)
    floor *= (0.82 + n1 * 0.36)[..., None]
    img = lerp(img, floor, land)
    var = soft_mask(cls == 3, T, 14, thr=0.45, jitter=jit * 1.6)
    img = lerp(img, material(th['var'], PH, PW, seed + 30), var * 0.92)

    # ------------------------------------------------ calçamento
    path = soft_mask(cls == 4, T, 10, thr=0.42, jitter=jit * 0.8)
    pav = material(th['path'], PH, PW, seed + 40)
    img *= (1 - np.clip(blur(path, 5) - path, 0, 1) * 0.35)[..., None]  # borda gasta escura
    img = lerp(img, pav, path)

    # ------------------------------------------------ água
    water = soft_mask(cls == 1, T, 16, thr=0.45, jitter=jit * 1.2)
    if water.max() > 0:
        w0, w1 = np.array(th['water'][0], np.float32), np.array(th['water'][1], np.float32)
        wn = value_noise(PH, PW, 220, seed + 5, 3)
        wc = lerp(w0, w1, wn) + rock_t * 0.05
        # reflexos finos: cristas de ondulação estreitas, bem discretas
        rip = value_noise(PH, PW, 16, seed + 6, 2)
        crest = np.clip(1 - np.abs(rip - 0.5) * 14, 0, 1) * (0.4 + wn * 0.8)
        wc += crest[..., None] * np.array([18, 30, 34], np.float32)
        # mais escura longe da margem (profundidade)
        deep = blur(water, 30)
        wc *= (1.15 - deep * 0.45)[..., None]
        img = lerp(img, wc, water)
        shore = np.clip(water * (1 - water) * 4, 0, 1)
        img = lerp(img, np.broadcast_to(np.array([150, 170, 170], np.float32), img.shape), shore * 0.25)

    # ------------------------------------------------ rocha elevada
    rock = soft_mask(cls == 5, T, 11, thr=0.45, jitter=jit * 2.2)
    if rock.max() > 0:
        sh = np.zeros_like(rock)
        sh[12:, 6:] = rock[:-12, :-6]
        sh = blur(sh, 8)
        img *= (1 - np.clip(sh - rock, 0, 1) * 0.6)[..., None]
        fh = 18
        top = np.zeros_like(rock)
        top[:-fh] = rock[fh:]
        top = np.minimum(top, rock)
        front = np.clip(rock - top, 0, 1)
        img = lerp(img, rock_t * 0.5, front)
        img = lerp(img, rock_t * (1.05 + n1[..., None] * 0.2), top)
        edge = np.clip(top - blur(top, 1.5), 0, 1) * 3
        img += np.clip(edge, 0, 1)[..., None] * 26

    # oclusão suave na borda do terreno
    rim = np.clip(land * (1 - blur(land, 3)) * 4, 0, 1)
    img *= (1 - rim * 0.4)[..., None]

    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.startswith(name + '_') and (f.endswith('.png') or f.endswith('.webp')):
            os.remove(os.path.join(OUT, f))
    chunks = []
    for cy in range(0, out.height, CHUNK):
        for cx in range(0, out.width, CHUNK):
            c = out.crop((cx, cy, min(out.width, cx + CHUNK), min(out.height, cy + CHUNK)))
            fn = f'{name}_{cx // CHUNK}_{cy // CHUNK}.webp'
            c.save(os.path.join(OUT, fn), 'WEBP', quality=86, method=6)
            chunks.append({'file': fn, 'x': cx, 'y': cy, 'w': c.width, 'h': c.height})
    json.dump({'width': out.width, 'height': out.height, 'chunk': CHUNK, 'chunks': chunks}, open(os.path.join(OUT, name + '_chunks.json'), 'w'))
    return out


if __name__ == '__main__':
    for n in sys.argv[1:] or ['arenaA', 'arenaB', 'arenaC']:
        im = bake(n)
        prev = os.environ.get('VEU_PREVIEW_DIR')
        if prev:
            im.save(os.path.join(prev, f'{n}_full.jpg'), quality=85)
        print('ground', n, im.size)
