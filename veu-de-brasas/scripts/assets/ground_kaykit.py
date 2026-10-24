"""Solo das arenas no estilo KayKit: compõe as camadas renderizadas por build_kaykit_env.mjs
(assets-src/kaykit/layers/<tema>_<camada>.png) com os layouts ASCII (src/content/maps/*.json).

Ordem: abismo → água (~) → paredões das bordas → chão (.) → variação (,) → calçamento (=) → blocos (#).
Saída: chunks WebP de 512 px + JSON em public/assets/environment/ground/.

Uso: python3 scripts/assets/ground_kaykit.py [arenaA arenaB arenaC]
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MAPS = os.path.join(ROOT, 'src', 'content', 'maps')
LAYERS = os.path.join(ROOT, 'assets-src', 'kaykit', 'layers')
OUT = os.path.join(ROOT, 'public', 'assets', 'environment', 'ground')
CHUNK = 512

THEMES = {
    'ash': dict(void=(14, 12, 18), water=((38, 70, 92), (58, 104, 128)), floor_mul=0.9, path_mul=0.72),
    'glass': dict(void=(10, 16, 12), water=((40, 96, 112), (70, 140, 150)), floor_mul=0.85, path_mul=0.95),
    'sunken': dict(void=(8, 10, 18), water=((34, 72, 104), (60, 112, 146)), floor_mul=0.85, path_mul=0.7),
}


def layer(theme, name):
    p = os.path.join(LAYERS, f'{theme}_{name}.png')
    if not os.path.exists(p):
        raise SystemExit(f'camada ausente: {p} — rode antes: node scripts/assets/build_kaykit_env.mjs layers')
    a = np.asarray(Image.open(p).convert('RGBA'), np.float32)
    return a[..., :3], a[..., 3] / 255


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


def cell_mask(grid, tile, rad=5):
    """células → máscara com cantos levemente arredondados (estilo de peças KayKit)"""
    big = np.kron(grid.astype(np.float32), np.ones((tile, tile), np.float32))
    return np.clip((blur(big, rad) - 0.5) * 8 + 0.5, 0, 1)


def value_noise(h, w, scale, seed):
    rng = np.random.default_rng(seed)
    gh, gw = h // scale + 2, w // scale + 2
    g = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8)).resize((gw * scale, gh * scale), Image.BICUBIC)
    return np.asarray(g, np.float32)[:h, :w] / 255


def lerp(a, b, t):
    return a + (b - a) * t[..., None]


def bake(name):
    m = json.load(open(os.path.join(MAPS, name + '.json')))
    W, H, T = m['width'], m['height'], m['tile']
    rows = [r.ljust(W, '%')[:W] for r in m['rows']]
    rows += ['%' * W] * (H - len(rows))
    theme = m['theme']
    th = THEMES[theme]
    PW, PH = W * T, H * T
    cls = np.zeros((H, W), np.int32)
    for y, row in enumerate(rows[:H]):
        for x, ch in enumerate(row):
            cls[y, x] = {'%': 0, '~': 1, '#': 5, ',': 3, '=': 4}.get(ch, 2)
    seed = sum(map(ord, name))
    n = value_noise(PH, PW, 180, seed)

    # abismo: escuro com leve variação
    img = np.broadcast_to(np.array(th['void'], np.float32), (PH, PW, 3)) * (0.8 + n[..., None] * 0.4)

    # água: duas cores + cristas claras (ondulação estilizada) e espuma rente à margem
    water = cell_mask(cls == 1, T, 6)
    if water.max() > 0:
        w0, w1 = np.array(th['water'][0], np.float32), np.array(th['water'][1], np.float32)
        wn = value_noise(PH, PW, 90, seed + 1)
        wc = lerp(w0, w1, wn)
        rip = value_noise(PH, PW, 22, seed + 2)
        crest = np.clip(1 - np.abs(rip - 0.5) * 18, 0, 1)
        wc += crest[..., None] * 38
        land_near = blur((cls > 1).astype(np.float32).repeat(T, 0).repeat(T, 1), 10)
        foam = np.clip((land_near - 0.15) * 4, 0, 1) * water
        wc = lerp(wc, np.broadcast_to(np.array([200, 230, 235], np.float32), wc.shape), foam * 0.55)
        img = lerp(img, wc, water)

    # paredões: faces dos blocos de terra que aparecem sobre o vazio/água
    land = cell_mask(cls > 1, T, 4)
    ec, ea = layer(theme, 'edge')
    face = ea * (1 - land)
    img = lerp(img, ec * 0.75, face)

    # chão, variação e calçamento
    fc, _ = layer(theme, 'floor')
    vc, _ = layer(theme, 'var')
    pc, _ = layer(theme, 'path')
    ground = fc * th['floor_mul'] * (0.92 + n[..., None] * 0.16)
    ground = lerp(ground, vc * th['floor_mul'], cell_mask(cls == 3, T, 9))
    path = cell_mask(cls == 4, T, 4)
    ground *= (1 - np.clip(blur(path, 3) - path, 0, 1) * 0.35)[..., None]  # junta escura em volta do calçamento
    ground = lerp(ground, pc * th['path_mul'], path)
    img = lerp(img, ground, land)
    # oclusão suave na borda do terreno
    rim = np.clip(land * (1 - blur(land, 4)) * 3, 0, 1)
    img *= (1 - rim * 0.35)[..., None]

    # blocos elevados (#) com sombra, por cima de tudo
    bc, ba = layer(theme, 'blocks')
    img = lerp(img, bc, ba)

    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.startswith(name + '_') and f.endswith(('.png', '.webp')):
            os.remove(os.path.join(OUT, f))
    chunks = []
    for cy in range(0, out.height, CHUNK):
        for cx in range(0, out.width, CHUNK):
            c = out.crop((cx, cy, min(out.width, cx + CHUNK), min(out.height, cy + CHUNK)))
            fn = f'{name}_{cx // CHUNK}_{cy // CHUNK}.webp'
            c.save(os.path.join(OUT, fn), 'WEBP', quality=88, method=6)
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
