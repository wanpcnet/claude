"""Atlas de efeitos visuais: magias, partículas, telegraphs, coletáveis e luzes."""
import math
import numpy as np
from PIL import Image
from pixel import Canvas, PAL, hexc, ramp

W = hexc('#ffffff')


def radial(size, power=2.0, inner=0.0, col=(1, 1, 1)):
    c = Canvas(size, size)
    r = size / 2
    d = np.sqrt((c.xs - r) ** 2 + (c.ys - r) ** 2) / r
    a = np.clip((1 - d) / (1 - inner + 1e-6), 0, 1) ** power
    c.px[:, :, 0], c.px[:, :, 1], c.px[:, :, 2] = col
    c.px[:, :, 3] = a
    return c


def ring_soft(size, radius=0.82, width=0.08, col=(1, 1, 1)):
    c = Canvas(size, size)
    r = size / 2
    d = np.sqrt((c.xs - r) ** 2 + (c.ys - r) ** 2) / r
    a = np.clip(1 - np.abs(d - radius) / width, 0, 1) ** 1.5
    c.px[:, :, 0], c.px[:, :, 1], c.px[:, :, 2] = col
    c.px[:, :, 3] = a
    return c


def flame(t, w=24, h=32, pal='amber'):
    """Língua de fogo em pixel art (6 quadros de oscilação)."""
    c = Canvas(w, h)
    ph = t * math.tau
    cx = w / 2
    base = h - 6
    p = PAL[pal] if pal != 'blue' else ramp('#0a1a4a', '#1a4ab8', '#3a9af0', '#9ae0ff', '#ffffff')
    for k, (r, hh, sh) in enumerate(((7, 22, 0.25), (5, 17, 0.55), (3, 11, 0.85))):
        wob = math.sin(ph + k) * 1.6
        pts = [(cx - r, base), (cx - r * 0.8 + wob * 0.3, base - hh * 0.45), (cx + wob, base - hh), (cx + r * 0.8 + wob * 0.5, base - hh * 0.5), (cx + r, base)]
        c.poly(pts, p, s=sh, grad=(0, -0.012))
        c.ellipse(cx, base, r, r * 0.7, p, flat=sh)
    for i in range(3):
        y = base - 18 - ((t * 20 + i * 7) % 14)
        c.pix(cx + math.sin(ph * 2 + i * 2) * 4, y, p[4])
    return c


def crown_ring(size=128):
    """Aro da Coroa de Brasas: faixa de ouro-bronze gravada com runas e brasas embutidas."""
    c = Canvas(size, size)
    r0 = size / 2
    d = np.sqrt((c.xs - r0) ** 2 + (c.ys - r0) ** 2)
    ang = np.arctan2(c.ys - r0, c.xs - r0)
    R, Wd = r0 - 9, 4.2
    t = (d - R) / Wd
    mask = np.abs(t) <= 1
    nz = np.sqrt(np.clip(1 - t * t, 0, 1))
    nx, ny = t * np.cos(ang), t * np.sin(ang)
    lam = nx * -0.5 + ny * -0.8 + nz * 0.9
    s = 0.5 + 0.5 * lam
    cols = c._colorize(s, PAL['gold'])
    c.px[mask] = cols[mask]
    # gravações: entalhes rítmicos
    notch = (np.abs(((ang + math.pi) / (math.tau / 24)) % 1 - 0.5) < 0.07) & (np.abs(t) < 0.75)
    c.px[notch] = PAL['bronze'][1]
    # pedras de brasa
    for i in range(6):
        a = i / 6 * math.tau
        x, y = r0 + math.cos(a) * R, r0 + math.sin(a) * R
        c.ellipse(x, y, 3.4, 3.4, PAL['bronze'], bias=-0.1)
        c.ellipse(x, y, 2.3, 2.3, PAL['lava'], bias=0.35)
    # aro interno fino
    c.arc(r0, r0, R - 7, 0, math.tau, PAL['amber'][2], 1, alpha=0.8)
    c.arc(r0, r0, R + 7, 0, math.tau, PAL['amber'][1], 1, alpha=0.6)
    c.outline(mix=0.2)
    return c


RUNES = [
    [(0, -4, 0, 4), (-3, -2, 3, 2)],
    [(-3, -4, 3, -4), (0, -4, 0, 4), (-3, 4, 3, 1)],
    [(-3, 4, 0, -4), (0, -4, 3, 4), (-2, 1, 2, 1)],
    [(-3, -4, -3, 4), (-3, 0, 3, -4), (-3, 0, 3, 4)],
    [(0, -4, 3, 0), (3, 0, 0, 4), (0, 4, -3, 0), (-3, 0, 0, -4)],
    [(-3, -3, 3, 3), (3, -3, -3, 3), (0, -4, 0, -1)],
    [(-3, 4, -3, -4), (-3, -4, 3, -1), (3, -1, -3, 1)],
    [(0, -4, 0, 4), (0, -1, 3, -4), (0, -1, -3, -4), (-2, 3, 2, 3)],
]


def rune(i, col='amber'):
    c = Canvas(14, 14)
    p = PAL[col]
    for (x0, y0, x1, y1) in RUNES[i]:
        c.line(7 + x0, 7 + y0, 7 + x1, 7 + y1, p[2], 2.2)
    for (x0, y0, x1, y1) in RUNES[i]:
        c.line(7 + x0, 7 + y0, 7 + x1, 7 + y1, p[4], 1)
    return c


def arrow():
    c = Canvas(20, 7)
    c.line(2, 3.5, 15, 3.5, PAL['wood'][3], 1)
    c.poly([(14, 1), (19.5, 3.5), (14, 6)], PAL['amber'], s=0.8)
    c.pix(17, 3, W)
    for dx in (0, 2):
        c.line(1 + dx, 1, 3 + dx, 3.5, PAL['amber'][2], 1)
        c.line(1 + dx, 6, 3 + dx, 3.5, PAL['amber'][2], 1)
    return c


def trail(w=48, h=6, col=(1, 0.8, 0.4)):
    c = Canvas(w, h)
    u = c.xs / w
    v = np.abs(c.ys - h / 2) / (h / 2)
    a = (u ** 1.6) * np.clip(1 - v, 0, 1) ** 1.2
    c.px[:, :, 0], c.px[:, :, 1], c.px[:, :, 2] = col
    c.px[:, :, 3] = a
    return c


def solar_lance(t):
    c = Canvas(56, 16)
    ph = t * math.tau
    for i in range(10):
        x = 4 + i * 3.2
        y = 8 + math.sin(ph + i) * 1.6 * (1 - i / 10)
        c.ellipse(x, y, 2.6 + i * 0.25, 2.2 + i * 0.15, PAL['lava'], flat=0.3 + i * 0.05)
    c.capsule(20, 8, 46, 8, 2.6, 2.0, PAL['amber'], bias=0.25)
    c.poly([(44, 3.5), (55, 8), (44, 12.5)], PAL['gold'], s=0.85)
    c.line(24, 8, 52, 8, W, 1)
    return c


def bolt(t, w=64, h=18, seed=0):
    """Segmento de raio texturizado: esticado ao longo de cada salto da corrente."""
    c = Canvas(w, h)
    rng = np.random.default_rng(seed * 31 + int(t * 10))
    pts = [(0, h / 2)]
    n = 8
    for i in range(1, n):
        pts.append((w * i / n, h / 2 + rng.uniform(-1, 1) * (h * 0.36)))
    pts.append((w, h / 2))
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        c.line(x0, y0, x1, y1, hexc('#6aa8ff'), 3.4, alpha=0.55)
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        c.line(x0, y0, x1, y1, hexc('#e8f4ff'), 1.4)
    k = rng.integers(2, n - 2)
    bx, by = pts[k]
    c.line(bx, by, bx + 6, by + rng.uniform(-6, 6), hexc('#b8d8ff'), 1)
    return c


def shard(i, pal='glass'):
    c = Canvas(12, 8)
    p = PAL[pal]
    pts = [[(1, 4), (6, 1), (11, 4), (6, 7)], [(1, 5), (5, 1), (11, 3), (7, 7)], [(1, 3), (8, 1), (11, 5), (4, 7)]][i]
    c.poly(pts, p, s=0.7, bevel=0.25)
    c.pix(6, 3, W)
    return c


def lotus(t):
    """Lótus de Cristal desabrochando em fragmentos."""
    c = Canvas(72, 72)
    cx = cy = 36
    open_ = 0.35 + t * 0.65
    for ring_i, (n, L, wd, rot) in enumerate(((8, 26, 7, 0), (8, 18, 6, math.pi / 8), (6, 10, 4, 0))):
        for i in range(n):
            a = rot + i / n * math.tau + t * 0.3
            l = L * open_
            tip = (cx + math.cos(a) * l, cy + math.sin(a) * l)
            left = (cx + math.cos(a - 0.35) * l * 0.45, cy + math.sin(a - 0.35) * l * 0.45)
            right = (cx + math.cos(a + 0.35) * l * 0.45, cy + math.sin(a + 0.35) * l * 0.45)
            c.poly([(cx, cy), left, tip, right], PAL['glass'], s=0.45 + ring_i * 0.17, bevel=0.25, alpha=1 - t * 0.35)
    c.ellipse(cx, cy, 4, 4, PAL['white'], bias=0.3)
    return c


def wind_arc(t):
    """Vento Cinéreo: crescente de cinza e correntes de ar."""
    c = Canvas(80, 80)
    cx, cy = 20, 40
    for k in range(5):
        r = 22 + k * 6 + t * 10
        a0, a1 = -1.1 + k * 0.08, 1.1 - k * 0.08
        col = [hexc('#d8d2c8'), hexc('#a8a296'), hexc('#efe6d8'), hexc('#8a8478'), hexc('#ffffff')][k]
        c.arc(cx, cy, r, a0, a1, col, 2.0 if k % 2 == 0 else 1.0, alpha=(1 - t * 0.6) * (0.9 - k * 0.1))
    for i in range(10):
        a = -1 + i * 0.22
        r = 30 + (i * 7 % 13) + t * 16
        c.pix(cx + math.cos(a) * r, cy + math.sin(a) * r, PAL['amber'][3] if i % 3 == 0 else hexc('#bdb6aa'))
    return c


def explosion(t):
    c = Canvas(56, 56)
    cx = cy = 28
    r = 6 + t * 20
    if t < 0.85:
        c.ellipse(cx, cy, r, r, PAL['lava'], bias=0.35 - t * 0.6, alpha=1 - t * 0.6)
        c.ellipse(cx, cy, r * 0.55, r * 0.55, PAL['gold'], bias=0.5 - t * 0.8, alpha=1 - t)
    for i in range(10):
        a = i / 10 * math.tau + 0.3
        rr = r * (0.9 + (i % 3) * 0.12)
        c.ellipse(cx + math.cos(a) * rr, cy + math.sin(a) * rr, 3.5 - t * 2.5, 3.5 - t * 2.5,
                  PAL['dark'] if t > 0.5 else PAL['lava'], bias=0.1, alpha=0.9 - t * 0.6)
    return c


def smoke(i):
    c = Canvas(32, 32)
    rng = np.random.default_rng(100 + i)
    for k in range(6):
        x, y = 16 + rng.uniform(-6, 6), 16 + rng.uniform(-6, 6)
        r = rng.uniform(5, 9)
        c.ellipse(x, y, r, r * 0.85, ramp('#1a1820', '#2e2a34', '#45404c', '#5e5866', '#7a7484'), bias=0.0, alpha=0.9)
    a = c.px[:, :, 3]
    c.px[:, :, 3] = a * 0.85
    return c


def telegraph_circle(size=128):
    c = Canvas(size, size)
    r0 = size / 2
    d = np.sqrt((c.xs - r0) ** 2 + (c.ys - r0) ** 2) / r0
    ang = np.arctan2(c.ys - r0, c.xs - r0)
    fill = (d <= 0.97) * (0.18 + 0.22 * d ** 3)
    rim = (np.abs(d - 0.95) < 0.04) * 0.95
    dash = (np.abs(d - 0.82) < 0.02) * ((((ang + math.pi) / (math.tau / 32)) % 1) < 0.5) * 0.7
    c.px[:, :, 0] = 1
    c.px[:, :, 1] = 1
    c.px[:, :, 2] = 1
    c.px[:, :, 3] = np.clip(fill + rim + dash, 0, 1)
    for i in range(6):
        a = i / 6 * math.tau
        x, y = r0 + math.cos(a) * r0 * 0.66, r0 + math.sin(a) * r0 * 0.66
        for (x0, y0, x1, y1) in RUNES[i]:
            c.line(x + x0 * 0.9, y + y0 * 0.9, x + x1 * 0.9, y + y1 * 0.9, W, 1.2, alpha=0.55)
    return c


def telegraph_cone(size=128, half=math.radians(32)):
    c = Canvas(size, size)
    ox, oy = 0, size / 2
    d = np.sqrt((c.xs - ox) ** 2 + (c.ys - oy) ** 2) / size
    ang = np.arctan2(c.ys - oy, c.xs - ox)
    inside = (np.abs(ang) <= half) & (d <= 0.98)
    edge = inside & ((np.abs(np.abs(ang) - half) < 0.03) | (np.abs(d - 0.96) < 0.02))
    a = inside * (0.15 + 0.3 * d ** 2) + edge * 0.7
    stripes = inside & ((((d * 14) % 1) < 0.12))
    a = a + stripes * 0.18
    c.px[:, :, :3] = 1
    c.px[:, :, 3] = np.clip(a, 0, 1)
    return c


def telegraph_line(w=128, h=24):
    c = Canvas(w, h)
    v = np.abs(c.ys - h / 2) / (h / 2)
    a = (v <= 1) * (0.2 + 0.25 * v ** 4) + (v > 0.85) * 0.5
    c.px[:, :, :3] = 1
    c.px[:, :, 3] = np.clip(a, 0, 1)
    for x in range(10, w - 8, 18):
        c.line(x, 5, x + 7, h / 2, W, 1.5, alpha=0.6)
        c.line(x + 7, h / 2, x, h - 5, W, 1.5, alpha=0.6)
    return c


def gem(size, pal):
    c = Canvas(size + 4, size + 6)
    cx = (size + 4) / 2
    h = size
    p = PAL[pal]
    c.poly([(cx, 1), (cx + size * 0.45, h * 0.45 + 1), (cx, h + 1), (cx - size * 0.45, h * 0.45 + 1)], p, s=0.55, grad=(-0.04, -0.03), bevel=0.25)
    c.line(cx, 2, cx, h, p[4], 1, alpha=0.6)
    c.pix(cx - 1, h * 0.35, W)
    c.outline(mix=0.2)
    return c


def heal_fruit():
    c = Canvas(16, 16)
    c.ellipse(8, 9.5, 5.2, 4.8, PAL['carmine'], bias=0.1)
    c.ellipse(8, 9.5, 2.4, 2.2, PAL['lava'], bias=0.4)
    c.line(8, 5, 9.5, 2, PAL['wood'][3], 1)
    c.ellipse(11, 3.5, 2.2, 1.2, PAL['jade'], rot=-0.5, bias=0.2)
    c.outline(mix=0.2)
    return c


def energy_vial():
    c = Canvas(14, 16)
    c.ellipse(7, 10, 4.6, 4.6, PAL['amber'], bias=0.15)
    c.poly([(5, 3), (9, 3), (8.5, 6.5), (5.5, 6.5)], PAL['glass'], s=0.6)
    c.line(5, 2.5, 9, 2.5, PAL['bronze'][3], 1)
    c.pix(5.5, 8.5, W)
    c.outline(mix=0.2)
    return c


def ash_coin():
    c = Canvas(14, 14)
    c.ellipse(7, 7, 5.4, 5.4, PAL['copper'], bias=0.1)
    c.ellipse(7, 7, 3.4, 3.4, PAL['copper'], bias=-0.15)
    for (x0, y0, x1, y1) in RUNES[4]:
        c.line(7 + x0 * 0.55, 7 + y0 * 0.55, 7 + x1 * 0.55, 7 + y1 * 0.55, PAL['gold'][4], 1)
    c.outline(mix=0.2)
    return c


def essence():
    c = Canvas(14, 18)
    c.poly([(7, 1), (12, 7), (7, 17), (2, 7)], PAL['violet'], s=0.6, bevel=0.3)
    c.line(7, 2, 7, 16, PAL['violet'][4], 1, alpha=0.6)
    c.outline(mix=0.2)
    return c


def relic_chest(opened=False):
    c = Canvas(28, 24)
    c.poly([(3, 10), (25, 10), (24, 22), (4, 22)], PAL['obsidian'], s=0.5, bevel=0.2)
    c.line(3, 15, 25, 15, PAL['copper'][3], 1)
    for x in (4, 23):
        c.line(x, 10, x, 22, PAL['copper'][2], 1.5)
    if opened:
        c.poly([(3, 10), (25, 10), (23, 3), (5, 3)], PAL['obsidian'], s=0.35, bevel=0.2)
        c.glow(14, 10, 12, PAL['gold'][4], 0.9)
    else:
        c.poly([(3, 10), (25, 10), (24, 5), (4, 5)], PAL['obsidian'], s=0.65, bevel=0.2)
        c.ellipse(14, 12, 2.4, 2.4, PAL['gold'], bias=0.3)
    c.outline(mix=0.2)
    return c


def star(size=16):
    c = Canvas(size, size)
    r = size / 2
    dx, dy = np.abs(c.xs - r), np.abs(c.ys - r)
    a = np.clip(1 - (dx * dy) ** 0.5 / (r * 0.35) - np.sqrt(dx * dx + dy * dy) / r * 0.6, 0, 1)
    c.px[:, :, :3] = 1
    c.px[:, :, 3] = a
    return c


def streak(w=16, h=4):
    return trail(w, h, (1, 1, 1))


def cross_heal():
    c = Canvas(10, 10)
    c.line(5, 1, 5, 9, PAL['jade'][4], 2.2)
    c.line(1, 5, 9, 5, PAL['jade'][4], 2.2)
    c.pix(5, 5, W)
    return c


def anchor_beam(w=40, h=160):
    c = Canvas(w, h)
    u = np.abs(c.xs - w / 2) / (w / 2)
    v = c.ys / h
    a = np.clip(1 - u, 0, 1) ** 2.2 * np.clip(v, 0, 1) ** 0.7 * np.clip((1 - v) * 6, 0, 1)
    c.px[:, :, :3] = 1
    c.px[:, :, 3] = a
    return c


def sigil(size=128):
    """Círculo rúnico das Âncoras (desenhado no solo)."""
    c = Canvas(size, size)
    r0 = size / 2
    c.arc(r0, r0, r0 - 3, 0, math.tau, W, 2)
    c.arc(r0, r0, r0 - 10, 0, math.tau, W, 1)
    c.arc(r0, r0, r0 * 0.42, 0, math.tau, W, 1.5)
    for i in range(8):
        a = i / 8 * math.tau
        x, y = r0 + math.cos(a) * (r0 - 20), r0 + math.sin(a) * (r0 - 20)
        for (x0, y0, x1, y1) in RUNES[i]:
            c.line(x + x0 * 1.2, y + y0 * 1.2, x + x1 * 1.2, y + y1 * 1.2, W, 1.5)
    for i in range(3):
        a = i / 3 * math.tau - math.pi / 2
        b = a + math.tau / 3
        c.line(r0 + math.cos(a) * r0 * 0.42, r0 + math.sin(a) * r0 * 0.42, r0 + math.cos(b) * r0 * 0.42, r0 + math.sin(b) * r0 * 0.42, W, 1)
    return c


def orb(pal, size=14):
    c = Canvas(size, size)
    r = size / 2
    c.glow(r, r, r, PAL[pal][3], 0.8)
    c.ellipse(r, r, r * 0.5, r * 0.5, PAL[pal], bias=0.45)
    c.pix(r - 1, r - 1, W)
    return c


def lava_glob():
    c = Canvas(18, 18)
    c.glow(9, 9, 9, PAL['lava'][3], 0.6)
    c.ellipse(9, 9, 5, 4.5, PAL['lava'], bias=0.25)
    c.ellipse(8, 8, 2, 1.6, PAL['lava'], bias=0.7)
    return c


def levelup_burst(size=128):
    c = Canvas(size, size)
    r0 = size / 2
    d = np.sqrt((c.xs - r0) ** 2 + (c.ys - r0) ** 2) / r0
    ang = np.arctan2(c.ys - r0, c.xs - r0)
    rays = np.clip(np.cos(ang * 12) * 0.5 + 0.5, 0, 1) ** 6
    a = rays * np.clip(1 - d, 0, 1) ** 1.2 + np.clip(1 - np.abs(d - 0.5) / 0.06, 0, 1) * 0.8
    c.px[:, :, :3] = 1
    c.px[:, :, 3] = np.clip(a, 0, 1)
    return c


def vignette(size=256):
    c = Canvas(size, size)
    r0 = size / 2
    dx = (c.xs - r0) / r0
    dy = (c.ys - r0) / r0
    d = np.sqrt(dx * dx * 0.9 + dy * dy * 1.1)
    a = np.clip((d - 0.55) / 0.75, 0, 1) ** 1.6
    c.px[:, :, 0] = 0.02
    c.px[:, :, 1] = 0.02
    c.px[:, :, 2] = 0.05
    c.px[:, :, 3] = a * 0.9
    return c


def shadow():
    c = Canvas(32, 14)
    d = np.sqrt(((c.xs - 16) / 16) ** 2 + ((c.ys - 7) / 7) ** 2)
    c.px[:, :, :3] = 0.03
    c.px[:, :, 3] = np.clip(1 - d, 0, 1) ** 0.8 * 0.85
    return c


def afterimage_tint():
    return radial(16, 1.0)


def build(atlas):
    A = atlas.add
    A('glow', radial(64, 2.2).image())
    A('glow_hard', radial(32, 1.0).image())
    A('light', radial(128, 1.6).image())
    A('ring', ring_soft(128).image())
    A('ring_thick', ring_soft(128, 0.75, 0.2).image())
    A('spark', streak(12, 3).image())
    A('streak', streak(32, 4).image())
    A('star', star(16).image())
    A('ember', radial(6, 0.8, col=(1.0, 0.75, 0.35)).image())
    A('dot', radial(4, 0.5).image())
    atlas.anim('flame', [flame(i / 6).image() for i in range(6)])
    atlas.anim('flame_blue', [flame(i / 6, pal='blue').image() for i in range(6)])
    A('crown_ring', crown_ring(128).image())
    A('crown_ring_small', crown_ring(96).image())
    for i in range(8):
        A(f'rune_{i}', rune(i).image())
        A(f'rune_v_{i}', rune(i, 'violet').image())
        A(f'rune_c_{i}', rune(i, 'cyan').image())
    A('arrow', arrow().image())
    A('trail_amber', trail(48, 6, (1, 0.75, 0.35)).image())
    A('trail_white', trail(48, 6, (1, 1, 1)).image())
    atlas.anim('lance', [solar_lance(i / 3).image() for i in range(3)])
    atlas.anim('bolt', [bolt(i / 4, seed=i).image() for i in range(4)])
    for i in range(3):
        A(f'shard_{i}', shard(i).image())
        A(f'shard_coral_{i}', shard(i, 'coral').image())
    atlas.anim('lotus', [lotus(i / 4).image() for i in range(4)])
    atlas.anim('wind', [wind_arc(i / 4).image() for i in range(4)])
    atlas.anim('explosion', [explosion(i / 6).image() for i in range(6)])
    for i in range(4):
        A(f'smoke_{i}', smoke(i).image())
    A('tele_circle', telegraph_circle().image())
    A('tele_cone', telegraph_cone().image())
    A('tele_line', telegraph_line().image())
    A('gem_s', gem(6, 'jade').image())
    A('gem_m', gem(8, 'cyan').image())
    A('gem_l', gem(10, 'gold').image())
    A('pick_heal', heal_fruit().image())
    A('pick_energy', energy_vial().image())
    A('pick_coin', ash_coin().image())
    A('pick_essence', essence().image())
    A('chest', relic_chest().image())
    A('chest_open', relic_chest(True).image())
    A('heal_cross', cross_heal().image())
    A('beam', anchor_beam().image())
    A('sigil', sigil().image())
    A('orb_violet', orb('violet').image())
    A('orb_cyan', orb('cyan').image())
    A('lava_glob', lava_glob().image())
    A('levelup', levelup_burst().image())
    A('shadow', shadow().image())
    A('vignette', vignette().image())
