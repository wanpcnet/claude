"""Solo das arenas em visão de cima (2D), estilo vetorial suave.

Lê os layouts ASCII desenhados à mão (src/content/maps/*.json) e pinta:
abismo (%), chão (.), variação (,), calçamento (=), rocha elevada (#) e água (~).
As formas vêm 100% do layout; o ruído só dá granulação/variação de cor dentro de cada material.
Renderiza em 2x e reduz para 1x (bordas antisserrilhadas). Saída: chunks PNG de 512 px + JSON.

Uso: python3 scripts/art2/ground2d.py
"""
import json, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MAPS = os.path.join(ROOT, 'src', 'content', 'maps')
OUT = os.path.join(ROOT, 'public', 'assets', 'environment', 'ground')
SS = 2          # supersampling
CHUNK = 512

THEMES = {
    'ash': dict(void=('#0c0812', '#1a1024'), floor=('#5a5060', '#3a3242'), var=('#7a6658', '#625046'), path=('#8a7e86', '#6a5e68'),
                grout='#2a222e', rock=('#6e6474', '#4a4250', '#2e2836'), water=('#1e3a4a', '#2e5a6a'), accent='#ff9a4a', tuft='#7a8a5a'),
    'glass': dict(void=('#060a16', '#0e1830'), floor=('#365a70', '#223a4a'), var=('#4e8a98', '#3a7080'), path=('#7ab8c8', '#5a98aa'),
                  grout='#1a2e3c', rock=('#5a7a92', '#3e5a70', '#22384a'), water=('#1a3a5a', '#2a5a7a'), accent='#7af0ff', tuft='#6ad8c8'),
    'sunken': dict(void=('#04080a', '#0a161a'), floor=('#365048', '#22362f'), var=('#466e50', '#345a40'), path=('#8a6a50', '#6e523e'),
                   grout='#1a2622', rock=('#4e6660', '#38504a', '#1e302c'), water=('#0e2a34', '#1a4250'), accent='#d08040', tuft='#5aa870'),
}


def hx(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def value_noise(h, w, scale, seed, octaves=3):
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(2, int(scale / (2 ** o)))
        gh, gw = h // s + 2, w // s + 2
        g = rng.random((gh, gw)).astype(np.float32)
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((gw * s, gh * s), Image.BICUBIC)
        out += np.asarray(img, np.float32)[:h, :w] / 255 * amp
        tot += amp
        amp *= 0.5
    return out / tot


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


def soft_mask(grid, tile, rad, thr=0.5, jitter=None):
    """máscara de células → forma arredondada antisserrilhada"""
    big = np.kron(grid.astype(np.float32), np.ones((tile, tile), np.float32))
    b = blur(big, rad)
    if jitter is not None:
        b = b + jitter
    return np.clip((b - thr) * 6 + 0.5, 0, 1)


def lerp(a, b, t):
    return a + (b - a) * t[..., None]


def bake(name):
    m = json.load(open(os.path.join(MAPS, name + '.json')))
    W, H, T = m['width'], m['height'], m['tile']
    rows = [r.ljust(W, '%')[:W] for r in m['rows']]
    rows += ['%' * W] * (H - len(rows))
    th = THEMES[m['theme']]
    t = T * SS
    PW, PH = W * t, H * t
    cls = np.zeros((H, W), np.int32)
    for y, row in enumerate(rows[:H]):
        for x, ch in enumerate(row):
            cls[y, x] = {'%': 0, '~': 1, '#': 5, ',': 3, '=': 4}.get(ch, 2)
    seed = sum(map(ord, name))
    n1 = value_noise(PH, PW, 160 * SS, seed, 4)
    n2 = value_noise(PH, PW, 28 * SS, seed + 1, 3)
    jit = (value_noise(PH, PW, 40 * SS, seed + 2, 2) - 0.5) * 0.28

    # ------------------------------------------------ abismo
    vy = np.linspace(0, 1, PH, dtype=np.float32)[:, None] * np.ones((1, PW), np.float32)
    img = lerp(hx(th['void'][0]), hx(th['void'][1]), np.clip(n1 * 0.8 + vy * 0.2, 0, 1))
    rng = np.random.default_rng(seed + 9)
    # poeira luminosa no abismo
    dust = np.zeros((PH, PW), np.float32)
    for _ in range(int(PW * PH / 9000)):
        x, y = rng.integers(0, PW), rng.integers(0, PH)
        dust[y, x] = rng.random()
    dust = blur(dust, 1.2 * SS) * 6
    img += dust[..., None] * hx(th['accent']) * 0.35

    land = soft_mask(cls > 0, t, 9 * SS, jitter=jit * 0.5)
    # face do penhasco: o chão continua para baixo alguns px como paredão escuro
    drop = 22 * SS
    land_sh = np.zeros_like(land)
    land_sh[drop:] = land[:-drop]
    cliff = np.clip(np.maximum(land, land_sh) - land, 0, 1)
    cliff_col = lerp(hx(th['rock'][1]) * 0.7, hx(th['rock'][2]) * 0.6, np.clip(n2, 0, 1))
    # gradiente vertical na face (claro em cima → escuro embaixo)
    face_grad = np.zeros_like(land)
    for k in range(1, drop + 1):
        sh = np.zeros_like(land)
        sh[k:] = land[:-k]
        face_grad = np.maximum(face_grad, sh * (1 - k / drop))
    img = lerp(img, cliff_col * (0.55 + face_grad[..., None] * 0.5), cliff)
    # névoa clara rente à borda do abismo
    glow = np.clip(blur(land, 18 * SS) - land, 0, 1)
    img += glow[..., None] * hx(th['accent']) * 0.12

    # ------------------------------------------------ chão
    floor = lerp(hx(th['floor'][0]), hx(th['floor'][1]), np.clip((n1 - 0.5) * 2.4 + 0.5, 0, 1))
    floor *= (0.9 + n2 * 0.2)[..., None]
    img = lerp(img, floor, land)
    # variação (cinza/musgo/areia de cristal)
    var = soft_mask(cls == 3, t, 16 * SS, thr=0.45, jitter=jit * 1.6)
    vcol = lerp(hx(th['var'][0]), hx(th['var'][1]), n2)
    img = lerp(img, vcol, var * 0.9)

    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil, 'RGBA')
    # tufos/pedrinhas espalhados no chão (forma desenhada à mão, posições por célula)
    tuft = tuple(int(c) for c in hx(th['tuft']))
    for y in range(H):
        for x in range(W):
            if cls[y, x] not in (2, 3):
                continue
            r = np.random.default_rng(seed * 131 + y * 977 + x * 31)
            if r.random() < 0.35:
                cx, cy = (x + r.random()) * t, (y + r.random()) * t
                if r.random() < 0.55:
                    for k in range(3):
                        a = -math.pi / 2 + (k - 1) * 0.5
                        L = (5 + r.random() * 4) * SS
                        d.line([(cx, cy), (cx + math.cos(a) * L, cy + math.sin(a) * L)], fill=tuft + (200,), width=2 * SS)
                else:
                    rr = (2 + r.random() * 3) * SS
                    d.ellipse([cx - rr, cy - rr * 0.7, cx + rr, cy + rr * 0.7], fill=tuple(int(c) for c in hx(th['rock'][0])) + (230,), outline=(20, 14, 26, 160), width=SS)
                    d.ellipse([cx - rr * 0.6, cy - rr * 0.6, cx, cy - rr * 0.1], fill=(255, 255, 255, 50))

    # ------------------------------------------------ calçamento (pedras arredondadas)
    img = np.asarray(pil, np.float32).copy()
    path = soft_mask(cls == 4, t, 18 * SS, thr=0.4)
    grout = hx(th['grout'])
    img = lerp(img, np.broadcast_to(grout, img.shape), path * 0.95)
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil, 'RGBA')
    pc0, pc1 = hx(th['path'][0]), hx(th['path'][1])
    st = 13 * SS
    for gy in range(0, PH, st):
        off = (gy // st) % 2 * st // 2
        for gx in range(-st, PW, st):
            cx, cy = gx + off + st / 2, gy + st / 2
            ix, iy = int(min(PW - 1, max(0, cx))), int(min(PH - 1, max(0, cy)))
            if path[iy, ix] < 0.6:
                continue
            r = np.random.default_rng(int(cx * 7 + cy * 13))
            k = r.random()
            col = tuple(int(c) for c in (pc0 + (pc1 - pc0) * k))
            w2, h2 = st * (0.42 + r.random() * 0.06), st * (0.4 + r.random() * 0.06)
            d.rounded_rectangle([cx - w2, cy - h2, cx + w2, cy + h2], radius=int(st * 0.28), fill=col + (255,), outline=(20, 14, 26, 200), width=SS)
            d.rounded_rectangle([cx - w2 + SS * 1.5, cy - h2 + SS * 1.5, cx + w2 - SS * 3, cy - h2 + SS * 4], radius=int(st * 0.15), fill=(255, 255, 255, 40))
    img = np.asarray(pil, np.float32).copy()

    # ------------------------------------------------ água
    water = soft_mask(cls == 1, t, 12 * SS, jitter=jit * 0.5)
    if water.max() > 0:
        wc = lerp(hx(th['water'][0]), hx(th['water'][1]), np.clip(n1 + (value_noise(PH, PW, 18 * SS, seed + 5, 2) - 0.5) * 0.6, 0, 1))
        img = lerp(img, wc, water)
        caus = value_noise(PH, PW, 26 * SS, seed + 6, 2)
        caus = np.clip((caus - 0.62) * 5, 0, 1)
        img += (water * caus)[..., None] * np.array([30, 60, 70], np.float32)
        shore = np.clip(water * (1 - water) * 4, 0, 1)
        img = lerp(img, np.broadcast_to(np.array([220, 240, 240], np.float32), img.shape), shore * 0.55)

    # ------------------------------------------------ rocha elevada
    rock = soft_mask(cls == 5, t, 6 * SS, jitter=jit)
    if rock.max() > 0:
        # sombra projetada para baixo-direita
        sh = np.zeros_like(rock)
        o = 10 * SS
        sh[o:, o // 2:] = rock[:-o, :-o // 2]
        sh = blur(sh, 6 * SS)
        img *= (1 - np.clip(sh - rock, 0, 1) * 0.5)[..., None]
        # face frontal (paredão) e topo
        fh = 16 * SS
        top = np.zeros_like(rock)
        top[:-fh] = rock[fh:]
        top = np.minimum(top, rock)
        face = np.clip(rock - top, 0, 1)
        r0, r1, r2 = hx(th['rock'][0]), hx(th['rock'][1]), hx(th['rock'][2])
        strata = (np.sin(np.arange(PH, dtype=np.float32)[:, None] / (3.2 * SS)) * 0.5 + 0.5) * 0.12
        img = lerp(img, (r2 + (r1 - r2) * 0.4) * (0.9 + n2[..., None] * 0.2 + strata[..., None]), face)
        topc = lerp(r1, r0, np.clip(n1 * 1.3 - 0.1, 0, 1)) * (0.94 + n2 * 0.12)[..., None]
        img = lerp(img, topc, top)
        # aresta iluminada do topo e contorno escuro
        edge = np.clip(top - blur(top, 1.6 * SS), 0, 1) * 3
        img += np.clip(edge, 0, 1)[..., None] * 40
        img *= (1 - np.clip((rock > 0.05) * (blur(rock, 1.5 * SS) < 0.7) * 0.6, 0, 0.6))[..., None]

    # contorno escuro suave nas bordas do terreno
    rim = np.clip(land * (1 - blur(land, 2 * SS)) * 4, 0, 1)
    img *= (1 - rim * 0.45)[..., None]

    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((W * T, H * T), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.startswith(name + '_') and f.endswith('.png'):
            os.remove(os.path.join(OUT, f))
    chunks = []
    for cy in range(0, out.height, CHUNK):
        for cx in range(0, out.width, CHUNK):
            c = out.crop((cx, cy, min(out.width, cx + CHUNK), min(out.height, cy + CHUNK)))
            fn = f'{name}_{cx // CHUNK}_{cy // CHUNK}.png'
            c.save(os.path.join(OUT, fn), optimize=True)
            chunks.append({'file': fn, 'x': cx, 'y': cy, 'w': c.width, 'h': c.height})
    json.dump({'width': out.width, 'height': out.height, 'chunk': CHUNK, 'chunks': chunks}, open(os.path.join(OUT, name + '_chunks.json'), 'w'))
    return out


if __name__ == '__main__':
    import sys
    names = sys.argv[1:] or ['arenaA', 'arenaB', 'arenaC']
    for n in names:
        im = bake(n)
        prev = os.environ.get('VEU_PREVIEW_DIR')
        if prev:
            im.save(os.path.join(prev, f'{n}_full.png'))
        print('ground', n, im.size)
