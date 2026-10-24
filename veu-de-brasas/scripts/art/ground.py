"""Converte o layout ASCII autoral de cada arena (src/content/maps/*.json) em imagens de solo
pré-iluminadas, cortadas em chunks fixos de 512 px para carregamento/renderização.
Nada aqui decide a forma do mapa: a forma vem integralmente das linhas desenhadas à mão.
O ruído é usado só como textura de material (granulação de pedra, musgo, água)."""
import json, os
import numpy as np
from PIL import Image

TILE = 32
CHUNK = 512
# projeção isométrica 2:1: sx = (x - y)·S + OX ; sy = (x + y)·S/2 + OY
ISO_S = 0.75
PAD_T = 48
PAD_B = 56


def value_noise(h, w, scale, seed, octaves=3):
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(2, int(scale / (2 ** o)))
        gh, gw = h // s + 2, w // s + 2
        g = rng.random((gh, gw)).astype(np.float32)
        ys = np.arange(h) / s
        xs = np.arange(w) / s
        y0 = ys.astype(int); x0 = xs.astype(int)
        fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
        fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
        a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
        out += amp * (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy)
        tot += amp
        amp *= 0.5
    return out / tot


def box_blur(m, r):
    if r <= 0:
        return m
    k = 2 * r + 1
    p = np.pad(m, r, mode='edge')
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    s = c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    return s / (k * k)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def ramp_pick(r, v):
    table = np.stack([hexrgb(c) for c in r])
    idx = np.clip((v * len(r)).astype(int), 0, len(r) - 1)
    return table[idx]


THEMES = {
    'ash': {
        'floor': ['#14161b', '#1a1d23', '#20242b', '#272b33', '#2f343c'],
        'floor2': ['#12201e', '#172a27', '#1d3631', '#24443b', '#2e5447'],
        'path': ['#22232a', '#2c2e36', '#373943', '#434652', '#525564'],
        'grout': '#101116',
        'rock': ['#0d0f13', '#171a20', '#22262e', '#2f343e', '#3f4552'],
        'cliff': ['#07080b', '#0d0f13', '#14171d', '#1b1f26'],
        'void': '#050508',
        'water': ['#081218', '#0c1c24', '#12283a', '#1a3a50'],
        'speck': ['#5a2a24', '#3a6a62', '#4a4f5a'],
    },
    'glass': {
        'floor': ['#0f1a1f', '#132127', '#182930', '#1e323a', '#253c45'],
        'floor2': ['#0f2427', '#133032', '#183c3d', '#1e4a49', '#275a57'],
        'path': ['#2a2a30', '#34343a', '#3f3e44', '#4b4a50', '#5a585e'],
        'grout': '#0b1014',
        'rock': ['#0a1418', '#102026', '#173036', '#204048', '#2c545c'],
        'cliff': ['#050b0e', '#0a1418', '#0f1d22', '#14272d'],
        'void': '#04070a',
        'water': ['#061a20', '#0a2a32', '#103c46', '#1a5462'],
        'speck': ['#5ce0d0', '#2a8a90', '#8ab4c0'],
    },
    'sunken': {
        'floor': ['#14121a', '#1a1822', '#211e2a', '#292533', '#322d3e'],
        'floor2': ['#1e1c1c', '#262322', '#2f2b29', '#393430', '#443e38'],
        'path': ['#1d1b26', '#26232f', '#2f2b3a', '#3a3546', '#474154'],
        'grout': '#0c0a10',
        'rock': ['#0c0b10', '#15131b', '#1f1c27', '#2a2634', '#373244'],
        'cliff': ['#050408', '#0b0a0f', '#110f16', '#18151e'],
        'void': '#030306',
        'water': ['#040b12', '#06121e', '#0a1a2a', '#0e2236'],
        'speck': ['#b46a36', '#3a6a8a', '#6a5a80'],
    },
}


def load_map(path):
    with open(path) as f:
        m = json.load(f)
    W, H = m['width'], m['height']
    rows = [r.ljust(W, '%')[:W] for r in m['rows']]
    rows += ['%' * W] * (H - len(rows))
    m['rows'] = rows[:H]
    return m


def classify(m):
    W, H = m['width'], m['height']
    cls = np.zeros((H, W), np.int32)
    # 0 abismo 1 água 2 chão 3 chão variante 4 trilha 5 rocha
    for y, row in enumerate(m['rows']):
        for x, ch in enumerate(row):
            cls[y, x] = {'%': 0, '~': 1, '#': 5, ',': 3, '=': 4}.get(ch, 2)
    return cls


def up(mask, smooth, jitter, seed, h, w, thr=0.5):
    big = np.kron(mask.astype(np.float32), np.ones((TILE, TILE), np.float32))
    b = box_blur(box_blur(big, smooth), smooth // 2)
    n = value_noise(h, w, 24, seed, 3) - 0.5
    return (b + n * jitter) > thr


def detail(img, mask, rmp, seed, density=900):
    """Pedrinhas com luz superior e sombra inferior + rachaduras: dá leitura de pixel art ao chão."""
    H, W = mask.shape
    rng = np.random.default_rng(seed)
    hi = hexrgb(rmp[-1]); mid = hexrgb(rmp[-2]); lo = hexrgb(rmp[0])
    n = int(W * H / density)
    xs = rng.integers(3, W - 4, n); ys = rng.integers(3, H - 4, n)
    rs = rng.integers(1, 4, n)
    for x, y, r in zip(xs, ys, rs):
        if not mask[y, x]:
            continue
        for dy in range(-r, r + 1):
            for dx in range(-r - 1, r + 2):
                if (dx / (r + 1)) ** 2 + (dy / r if r else 0) ** 2 <= 1:
                    img[y + dy, x + dx] = mid if dy >= 0 else hi
        img[y + r + 1, x - r:x + r + 1] = lo
    # rachaduras finas
    for _ in range(int(W * H / (density * 12))):
        x, y = int(rng.integers(8, W - 8)), int(rng.integers(8, H - 8))
        if not mask[y, x]:
            continue
        ang = rng.uniform(0, 6.28)
        for k in range(int(rng.integers(8, 22))):
            ang += rng.uniform(-0.6, 0.6)
            x = int(np.clip(x + round(np.cos(ang) * 1.5), 1, W - 2)); y = int(np.clip(y + round(np.sin(ang) * 1.5), 1, H - 2))
            if mask[y, x]:
                img[y, x] = lo * 0.7
                img[y + 1, x] = np.clip(img[y + 1, x] * 1.12, 0, 1)


def material(h, w, rmp, seed, scale=48, grain=0.18):
    n = value_noise(h, w, scale, seed, 4)
    g = np.random.default_rng(seed + 7).random((h, w)).astype(np.float32)
    v = np.clip(n * 1.3 - 0.15 + (g - 0.5) * grain, 0, 0.999)
    return ramp_pick(rmp, v)


def slabs(h, w, rmp, grout, seed, sw=32, sh=24):
    """Lajes de pedra (trilhas, mosaicos, passarelas)."""
    base = material(h, w, rmp, seed, 20, 0.22)
    ys, xs = np.mgrid[0:h, 0:w]
    row = ys // sh
    off = (row % 2) * (sw // 2)
    gx = ((xs + off) % sw) == 0
    gy = (ys % sh) == 0
    rng = np.random.default_rng(seed)
    slab_shade = rng.random((h // sh + 2, w // sw + 3)).astype(np.float32)
    shade = slab_shade[row, (xs + off) // sw]
    base = base * (0.85 + 0.3 * shade[:, :, None])
    gm = gx | gy
    base[gm] = hexrgb(grout)
    hl = (((ys - 1) % sh) == 0) | ((((xs + off) - 1) % sw) == 0)
    base[hl & ~gm] = np.clip(base[hl & ~gm] * 1.25, 0, 1)
    return base


def mosaic(h, w, rmp, grout, seed):
    base = slabs(h, w, rmp, grout, seed, 16, 16)
    ys, xs = np.mgrid[0:h, 0:w]
    diag = ((xs + ys) % 64 < 2) | ((xs - ys) % 64 < 2)
    base[diag] = hexrgb('#7d4120')
    return base


def water(h, w, rmp, seed):
    n = value_noise(h, w, 40, seed, 3)
    ys, xs = np.mgrid[0:h, 0:w]
    streak = (np.sin(xs * 0.05 + n * 7 + ys * 0.01) > 0.97) & (n > 0.5)
    v = np.clip(n * 0.9, 0, 0.999)
    base = ramp_pick(rmp, v)
    base[streak] = np.clip(base[streak] + 0.08, 0, 1)
    return base


def bake(map_path, out_dir, name):
    m = load_map(map_path)
    th = THEMES[m['theme']]
    W, H = m['width'] * TILE, m['height'] * TILE
    cls = classify(m)
    seed = sum(map(ord, name))
    img = np.zeros((H, W, 3), np.float32)
    img[:] = hexrgb(th['void'])
    mist = value_noise(H, W, 96, seed + 1, 3)
    img += (mist[:, :, None] ** 3) * hexrgb('#1a1a2a') * 0.6

    walk = cls >= 1
    m_walk = up(walk, 12, 0.35, seed + 2, H, W)
    m_water = up(cls == 1, 12, 0.3, seed + 3, H, W)
    m_ground = m_walk & ~m_water
    m_f2 = up(cls == 3, 16, 0.55, seed + 4, H, W, 0.45) & m_ground
    m_path = up(cls == 4, 14, 0.12, seed + 5, H, W, 0.3) & m_ground
    m_rock = up(cls == 5, 14, 0.45, seed + 6, H, W)

    floor = material(H, W, th['floor'], seed + 10, 56, 0.25)
    img[m_ground] = floor[m_ground]
    detail(img, m_ground, th['floor'], seed + 40, 700)
    if m_water.any():
        wt = water(H, W, th['water'], seed + 11)
        img[m_water] = wt[m_water]
        rim = m_water & ~np.roll(m_water, 2, 0)
        img[rim] = np.clip(img[rim] + 0.18, 0, 1)
        lip = m_ground & np.roll(m_water, -3, 0)
        img[lip] *= 0.55
    f2 = material(H, W, th['floor2'], seed + 12, 30, 0.3)
    img[m_f2] = f2[m_f2]
    detail(img, m_f2, th['floor2'], seed + 41, 500)
    if m['theme'] == 'sunken':
        p = mosaic(H, W, th['path'], th['grout'], seed + 13)
    else:
        p = slabs(H, W, th['path'], th['grout'], seed + 13, 32, 22 if m['theme'] == 'ash' else 12)
    img[m_path] = p[m_path]
    pe = m_path & ~np.roll(m_path, -2, 0)
    img[pe] *= 0.6
    # beira do abismo: faixa escurecida na borda inferior das plataformas
    edge = m_walk & ~np.roll(m_walk, -6, 0)
    img[edge] *= 0.7
    rng = np.random.default_rng(seed + 20)
    for k, col in enumerate(th['speck']):
        cnt = int(W * H / 2400)
        xs = rng.integers(0, W - 1, cnt); ys = rng.integers(0, H - 2, cnt)
        ok = m_ground[ys, xs]
        img[ys[ok], xs[ok]] = hexrgb(col) * (0.6 + 0.4 * k / 3)
        if k == 0:
            img[ys[ok] + 1, xs[ok]] = hexrgb(col) * 0.5
    # topo das rochas pintado na pegada (as faces verticais são extrudadas no espaço isométrico)
    rock = material(H, W, th['rock'], seed + 31, 18, 0.35)
    img[m_rock] = rock[m_rock]
    detail(img, m_rock, th['rock'], seed + 42, 260)
    vb = box_blur((~m_walk & ~m_rock).astype(np.float32), 18)
    img *= (1 - vb * 0.35 * m_walk)[:, :, None]
    img = np.clip(img, 0, 1) ** 0.86

    # ------------------------------------------------------------ projeção isométrica 2:1
    S = ISO_S
    Wi = int(round((W + H) * S))
    Hi = int(round((W + H) * S / 2)) + PAD_T + PAD_B
    OX = H * S
    OY = PAD_T
    k = 1 / (2 * S)
    aff = (k, k, (-OX - 2 * OY) * k, -k, k, (OX - 2 * OY) * k)
    voidc = tuple(int(c * 255) for c in hexrgb(th['void']))

    def warp_rgb(a):
        im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGB')
        im = im.transform((Wi, Hi * 2), Image.AFFINE, aff, resample=Image.BICUBIC, fillcolor=voidc)
        return np.asarray(im.resize((Wi, Hi), Image.LANCZOS)).astype(np.float32) / 255

    def warp_mask(mk):
        im = Image.fromarray((mk * 255).astype(np.uint8), 'L')
        im = im.transform((Wi, Hi * 2), Image.AFFINE, aff, resample=Image.BILINEAR, fillcolor=0)
        return np.asarray(im.resize((Wi, Hi), Image.BILINEAR)) > 127

    iso = warp_rgb(img)
    R = warp_mask(m_rock)
    T = warp_mask(m_walk | m_rock)
    # névoa do abismo no espaço isométrico
    mist = value_noise(Hi, Wi, 80, seed + 50, 3)
    iso[~T] = (hexrgb(th['void']) + (mist[~T, None] ** 3) * hexrgb('#1a1a2a') * 0.7)
    ys = np.arange(Hi)[:, None] * np.ones((1, Wi))
    # bordas das plataformas caindo no abismo
    hd = 46
    drop = np.zeros_like(T)
    depth = np.zeros((Hi, Wi), np.float32)
    for d in range(1, hd + 1):
        sh = np.zeros_like(T)
        sh[d:] = T[:-d]
        newp = sh & ~T & ~drop
        depth[newp] = d
        drop |= newp
    cliff = ramp_pick(th['cliff'] + [th['cliff'][-1]], np.clip(value_noise(Hi, Wi, 10, seed + 51, 3), 0, 0.999))
    strata = 0.8 + 0.2 * np.sin(ys * 0.8 + value_noise(Hi, Wi, 30, seed + 52, 2) * 6)
    fade = np.clip(1 - depth / hd, 0, 1) ** 1.3
    face_col = cliff * strata[:, :, None] * (0.45 + 0.75 * fade[:, :, None])
    iso[drop] = face_col[drop] * 1.25 + hexrgb(th['void']) * (1 - fade[drop, None]) * 0.5
    lip = T & ~np.roll(T, -2, 0)
    iso[lip] = np.clip(iso[lip] * 1.35 + 0.04, 0, 1)
    # rochas com altura: topo elevado + faces verticais
    hw = 30
    sweep = R.copy()
    for d in range(1, hw + 1):
        sweep[:-d] |= R[d:]
    top = np.zeros_like(R)
    top[:-hw] = R[hw:]
    faces = sweep & ~top
    # sombra de contato no chão à frente das paredes
    ao = np.zeros_like(R)
    for d in range(1, 12):
        ao[d:] |= R[:-d]
    ao &= ~sweep & T
    iso[ao] *= 0.62
    fdepth = np.zeros((Hi, Wi), np.float32)
    acc = top.copy()
    for d in range(1, hw + 1):
        sh = np.zeros_like(top)
        sh[d:] = top[:-d]
        newp = sh & faces & ~acc
        fdepth[newp] = d
        acc |= newp
    rf = ramp_pick(th['cliff'] + [th['rock'][2]], np.clip(value_noise(Hi, Wi, 8, seed + 53, 3) * 1.1, 0, 0.999))
    shade = 1.15 - 0.5 * (fdepth / hw)
    rstr = 0.85 + 0.15 * np.sin(ys * 1.3)
    iso[faces] = (rf * (shade * rstr)[:, :, None] * 1.3)[faces]
    topimg = np.zeros_like(iso)
    topimg[:-hw] = iso[hw:] if False else warp_rgb(img)[hw:]
    iso[top] = topimg[top]
    edge_t = top & ~np.roll(top, 1, 0)
    iso[edge_t] = np.clip(iso[edge_t] + 0.16, 0, 1)
    edge_b = top & ~np.roll(top, -1, 0)
    iso[edge_b] = np.clip(iso[edge_b] + 0.08, 0, 1)

    out = Image.fromarray((np.clip(iso, 0, 1) * 255).astype(np.uint8), 'RGB')
    os.makedirs(out_dir, exist_ok=True)
    chunks = []
    for cy in range(0, Hi, CHUNK):
        for cx in range(0, Wi, CHUNK):
            tile = out.crop((cx, cy, min(cx + CHUNK, Wi), min(cy + CHUNK, Hi)))
            q = tile.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            fn = f'{name}_{cx // CHUNK}_{cy // CHUNK}.png'
            q.save(os.path.join(out_dir, fn), optimize=True)
            chunks.append({'file': fn, 'x': cx, 'y': cy, 'w': tile.width, 'h': tile.height})
    with open(os.path.join(out_dir, f'{name}_chunks.json'), 'w') as f:
        json.dump({'width': Wi, 'height': Hi, 'chunk': CHUNK, 'chunks': chunks,
                   'iso': {'s': S, 'ox': OX, 'oy': OY, 'worldW': W, 'worldH': H}}, f)
    return out
