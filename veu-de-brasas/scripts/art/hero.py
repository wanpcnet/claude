"""Arqueira-rúnica Lysa — protagonista. Quadro 64x64, pés em y≈58.
Desenhada parte a parte (capa, pernas, túnica, ombreiras, cabeça, capuz, arco)
em quatro direções; a esquerda é o espelho autoral da direita."""
import math
from pixel import Canvas, PAL, hexc

S = 64
RUNE = hexc('#ffc24a')
RUNE2 = hexc('#fff1b0')
EYE = hexc('#1a0f14')
STRING = hexc('#e8dcc0')


def bow_vertical(c, x, y0, y1, bend=3.0, glow=1.0, drawn=0.0):
    """Arco longo com runas âmbar ao longo do corpo."""
    n = 8
    pts = []
    for i in range(n + 1):
        t = i / n
        yy = y0 + (y1 - y0) * t
        xx = x + math.sin(t * math.pi) * bend
        pts.append((xx, yy))
    for i in range(n):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        r = 1.4 if 2 <= i <= 5 else 1.0
        c.capsule(ax, ay, bx, by, r, r, PAL['wood'], bias=0.05)
    # corda
    mx = x - drawn
    c.line(pts[0][0], pts[0][1], mx, (y0 + y1) / 2, STRING, 1)
    c.line(mx, (y0 + y1) / 2, pts[-1][0], pts[-1][1], STRING, 1)
    if glow > 0:
        for i in (2, 4, 6):
            c.pix(pts[i][0] + 0.5, pts[i][1], RUNE if i != 4 else RUNE2)
    c.ellipse(pts[4][0], pts[4][1], 1.6, 2.2, PAL['bronze'])


def bow_horizontal(c, cx, y, x0, x1, bend=3.0, drawn=0.0, up=False):
    n = 8
    pts = []
    sgn = -1 if up else 1
    for i in range(n + 1):
        t = i / n
        xx = x0 + (x1 - x0) * t
        yy = y + sgn * math.sin(t * math.pi) * bend
        pts.append((xx, yy))
    for i in range(n):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        r = 1.4 if 2 <= i <= 5 else 1.0
        c.capsule(ax, ay, bx, by, r, r, PAL['wood'], bias=0.05)
    my = y - sgn * drawn
    c.line(pts[0][0], pts[0][1], (x0 + x1) / 2, my, STRING, 1)
    c.line((x0 + x1) / 2, my, pts[-1][0], pts[-1][1], STRING, 1)
    for i in (2, 6):
        c.pix(pts[i][0], pts[i][1] + 0.5 * sgn, RUNE)
    c.pix(pts[4][0], pts[4][1], RUNE2)


def leg(c, x, top, foot, r=2.4, front=True):
    c.capsule(x, top, x, foot - 1.5, r, r - 0.3, PAL['leather'] if not front else PAL['wine'], bias=-0.05)
    c.ellipse(x, foot, r + 0.6, 1.9, PAL['leather'], bias=0.05)
    c.ellipse(x, foot - 4, r + 0.3, 1.2, PAL['bronze'], bias=0.0)  # caneleira


def down(t=0.0, mode='idle', k=0.0):
    """Frente (olhando para a câmera)."""
    c = Canvas(S, S)
    walk = mode == 'walk'
    ph = t * math.tau
    bob = (abs(math.sin(ph)) * -1.2 if walk else math.sin(ph) * 0.5) if mode in ('walk', 'idle') else 0
    sway = math.sin(ph) * 1.2 if walk else math.sin(ph) * 0.4
    hurt = mode == 'hurt'
    hx = 32 + (1 if hurt else 0)
    by = 0 + bob + (1 if hurt else 0)
    # capa atrás do corpo
    c.poly([(22, 28 + by), (42, 28 + by), (46 + sway, 52 + by), (40, 50 + by), (32, 52 + by), (24, 50 + by), (18 + sway, 52 + by)],
           PAL['wine'], s=0.38, grad=(-0.012, 0.004), bevel=0.15)
    # pernas
    la = math.sin(ph) * 2.2 if walk else 0
    leg(c, 28.5, 44 + by, 57 + la * 0.6, front=False)
    leg(c, 35.5, 44 + by, 57 - la * 0.6, front=False)
    # saia/túnica
    c.poly([(24, 36 + by), (40, 36 + by), (42.5, 47 + by), (32, 49 + by), (21.5, 47 + by)], PAL['ivory'], s=0.62, grad=(-0.02, -0.01), bevel=0.12)
    c.poly([(22, 45 + by), (42, 45 + by), (42.6, 47.5 + by), (32, 49.5 + by), (21.4, 47.5 + by)], PAL['wine'], s=0.55)
    for xx in (25, 29, 33, 37):
        c.pix(xx + 1, 46.5 + by, PAL['gold'][3])
    # tronco
    c.ellipse(32, 33 + by, 8, 6.6, PAL['ivory'], bias=0.05)
    c.poly([(27.5, 33 + by), (36.5, 33 + by), (35.5, 39 + by), (32, 40.5 + by), (28.5, 39 + by)], PAL['bronze'], s=0.55, grad=(-0.03, -0.02), bevel=0.18)  # corpete em V
    for yy in (34.5, 36.5):
        c.pix(31, yy + by, PAL['ivory'][4]); c.pix(33, yy + by, PAL['ivory'][4])
    c.ellipse(32, 30.5 + by, 3.4, 1.6, PAL['ivory'], bias=0.1)  # gola
    c.ellipse(32, 39.5 + by, 7, 1.6, PAL['leather'])  # cinto
    c.pix(32, 39.5 + by, PAL['amber'][3])
    # braços
    if mode == 'shoot':
        draw = k
        c.capsule(24, 30 + by, 26, 36 + by, 2.2, 2.0, PAL['ivory'])
        c.capsule(40, 30 + by, 38, 37 + by, 2.2, 2.0, PAL['ivory'])
        c.ellipse(28, 38 + by, 1.8, 1.8, PAL['skin'])
        c.ellipse(36, 38 + by, 1.8, 1.8, PAL['skin'])
        bow_horizontal(c, 32, 41 + by - draw * 0.5, 20, 44, bend=3.5, drawn=draw * 3)
    else:
        arm_sw = math.sin(ph) * 1.5 if walk else 0
        c.capsule(24, 30 + by, 22.5, 38 + by - arm_sw, 2.2, 2.0, PAL['ivory'])
        c.ellipse(22.3, 39.5 + by - arm_sw, 1.8, 1.8, PAL['skin'])
        c.capsule(40, 30 + by, 41.5, 38 + by + arm_sw, 2.2, 2.0, PAL['ivory'])
        bow_vertical(c, 43.5, 25 + by + arm_sw, 50 + by + arm_sw, bend=3.2)
        c.ellipse(42.3, 38.5 + by + arm_sw, 1.8, 1.8, PAL['skin'])
    # ombreiras
    c.ellipse(23.5, 29.5 + by, 3.6, 3, PAL['bronze'], bias=0.08)
    c.ellipse(40.5, 29.5 + by, 3.6, 3, PAL['bronze'], bias=0.08)
    c.pix(23, 29 + by, PAL['amber'][3])
    c.pix(40, 29 + by, PAL['amber'][3])
    # capuz atrás da cabeça
    c.ellipse(hx, 20 + by, 9.5, 9, PAL['wine'], bias=-0.05)
    c.poly([(hx - 8, 22 + by), (hx + 8, 22 + by), (hx + 6, 29 + by), (hx - 6, 29 + by)], PAL['wine'], s=0.42)
    # cabeça
    c.ellipse(hx, 21.5 + by, 6.6, 6.4, PAL['skin'], bias=0.08)
    # cabelo (franja e mechas)
    c.ellipse(hx, 17.5 + by, 7.2, 4.4, PAL['hair'], bias=0.05)
    c.capsule(hx - 6, 18 + by, hx - 6.5, 27 + by, 1.8, 1.4, PAL['hair'])
    c.capsule(hx + 6, 18 + by, hx + 6.5, 27 + by, 1.8, 1.4, PAL['hair'])
    c.poly([(hx - 3, 18 + by), (hx + 1, 18 + by), (hx - 2, 21 + by)], PAL['hair'], s=0.7)
    # diadema rúnico
    c.line(hx - 5, 16.5 + by, hx + 5, 16.5 + by, PAL['gold'][2], 1)
    c.pix(hx, 16 + by, PAL['amber'][4])
    c.pix(hx, 17 + by, PAL['amber'][2])
    # rosto
    if mode == 'hurt':
        c.line(hx - 3.5, 22.5 + by, hx - 1.5, 22.5 + by, EYE, 1)
        c.line(hx + 1.5, 22.5 + by, hx + 3.5, 22.5 + by, EYE, 1)
    else:
        c.pix(hx - 2.5, 22 + by, EYE); c.pix(hx - 2.5, 23 + by, EYE)
        c.pix(hx + 2.5, 22 + by, EYE); c.pix(hx + 2.5, 23 + by, EYE)
        c.pix(hx - 2.5, 22 + by, PAL['amber'][3])
        c.pix(hx + 2.5, 22 + by, PAL['amber'][3])
    c.pix(hx, 25.5 + by, PAL['skin'][1])
    # capuz frontal (borda)
    c.capsule(hx - 8.5, 17 + by, hx - 7, 27 + by, 1.6, 2.2, PAL['wine'], bias=0.1)
    c.capsule(hx + 8.5, 17 + by, hx + 7, 27 + by, 1.6, 2.2, PAL['wine'], bias=0.1)
    c.outline()
    return c


def up(t=0.0, mode='idle', k=0.0):
    """Costas."""
    c = Canvas(S, S)
    walk = mode == 'walk'
    ph = t * math.tau
    bob = (abs(math.sin(ph)) * -1.2 if walk else math.sin(ph) * 0.5) if mode in ('walk', 'idle') else 0
    sway = math.sin(ph) * 1.4 if walk else math.sin(ph) * 0.4
    by = bob + (1 if mode == 'hurt' else 0)
    la = math.sin(ph) * 2.2 if walk else 0
    leg(c, 28.5, 44 + by, 57 - la * 0.6, front=False)
    leg(c, 35.5, 44 + by, 57 + la * 0.6, front=False)
    # braços (atrás da capa nas laterais)
    if mode == 'shoot':
        bow_horizontal(c, 32, 21 + by + k * 0.5, 20, 44, bend=3.5, drawn=k * 3, up=True)
        c.capsule(24, 30 + by, 27, 24 + by, 2.2, 2.0, PAL['ivory'])
        c.capsule(40, 30 + by, 37, 24 + by, 2.2, 2.0, PAL['ivory'])
    else:
        arm_sw = math.sin(ph) * 1.5 if walk else 0
        c.capsule(24, 30 + by, 22.5, 38 + by + arm_sw, 2.2, 2.0, PAL['ivory'])
        c.capsule(40, 30 + by, 41.5, 38 + by - arm_sw, 2.2, 2.0, PAL['ivory'])
        c.ellipse(22.3, 39.5 + by + arm_sw, 1.8, 1.8, PAL['skin'])
        bow_vertical(c, 20.5, 25 + by - arm_sw, 50 + by - arm_sw, bend=-3.2)
        c.ellipse(41.7, 39.5 + by - arm_sw, 1.8, 1.8, PAL['skin'])
    # capa grande
    c.poly([(23, 26 + by), (41, 26 + by), (44 + sway, 52 + by), (36, 54 + by), (28, 54 + by), (20 + sway, 52 + by)],
           PAL['wine'], s=0.5, grad=(-0.015, -0.006), bevel=0.15)
    for i in range(4):
        x = 26 + i * 4 + sway * 0.4
        c.line(x, 34 + by, x + sway * 0.3, 52 + by, PAL['wine'][1], 1)
    c.line(21 + sway, 51.5 + by, 43 + sway, 51.5 + by, PAL['gold'][2], 1)
    # aljava
    c.capsule(36, 25 + by, 28, 41 + by, 2.6, 2.4, PAL['leather'], bias=0.05)
    c.line(36.8, 26 + by, 29, 40 + by, PAL['bronze'][3], 1)
    for i, col in enumerate((PAL['ivory'][4], PAL['amber'][3], PAL['ivory'][3])):
        c.line(36 + i * 1.5, 25 + by, 37 + i * 2, 21 + by, col, 1)
    c.ellipse(23.5, 29 + by, 3.6, 3, PAL['bronze'], bias=0.08)
    c.ellipse(40.5, 29 + by, 3.6, 3, PAL['bronze'], bias=0.08)
    # capuz e trança
    c.ellipse(32, 20.5 + by, 9, 8.6, PAL['wine'], bias=-0.02)
    c.poly([(28, 14 + by), (36, 14 + by), (33, 9 + by)], PAL['wine'], s=0.6, bevel=0.15)  # ponta do capuz
    c.line(28, 16 + by, 30, 27 + by, PAL['wine'][1], 1)
    c.line(36, 16 + by, 34, 27 + by, PAL['wine'][1], 1)
    c.capsule(23.5, 20 + by, 25.5, 27 + by, 1.2, 1.6, PAL['wine'], bias=0.15)
    for i in range(5):
        yy = 27 + i * 2.2
        c.ellipse(32 + sway * 0.08 * i, yy + by, 2.0 - i * 0.15, 1.4, PAL['hair'], bias=-0.12)
    c.ellipse(32 + sway * 0.4, 38.5 + by, 1.6, 1.6, PAL['gold'])
    c.line(26, 15 + by, 31, 11 + by, PAL['wine'][4], 1)
    c.outline()
    return c


def side(t=0.0, mode='idle', k=0.0):
    """Perfil voltado para a direita."""
    c = Canvas(S, S)
    walk = mode == 'walk'
    ph = t * math.tau
    bob = (abs(math.sin(ph)) * -1.2 if walk else math.sin(ph) * 0.5) if mode in ('walk', 'idle') else 0
    by = bob + (1 if mode == 'hurt' else 0)
    bx = -1.5 if mode == 'hurt' else 0
    flow = 1.5 + (math.sin(ph) * 1.5 if walk else math.sin(ph) * 0.5)
    stride = math.sin(ph) * 4 if walk else 0
    # capa esvoaçante atrás
    c.poly([(30 + bx, 27 + by), (35 + bx, 28 + by), (34 + bx, 50 + by), (24 - flow + bx, 52 + by), (22 - flow * 1.5 + bx, 44 + by)],
           PAL['wine'], s=0.42, grad=(0.01, 0.0), bevel=0.15)
    # perna traseira
    c.capsule(31 + bx, 44 + by, 31 - stride + bx, 55, 2.3, 2.0, PAL['leather'])
    c.ellipse(32 - stride + bx, 56.8, 3, 1.8, PAL['leather'])
    # braço traseiro
    if mode == 'shoot':
        c.capsule(31 + bx, 30 + by, 36 - k * 3 + bx, 34 + by, 2.0, 1.8, PAL['ivory'], bias=-0.1)
    # túnica
    c.poly([(27 + bx, 36 + by), (37 + bx, 36 + by), (39 + bx, 47 + by), (26 + bx, 47 + by)], PAL['ivory'], s=0.6, grad=(-0.02, 0), bevel=0.12)
    c.poly([(26 + bx, 45 + by), (39 + bx, 45 + by), (39.5 + bx, 47.5 + by), (25.5 + bx, 47.5 + by)], PAL['wine'], s=0.55)
    # perna dianteira
    c.capsule(33 + bx, 44 + by, 33 + stride + bx, 55, 2.4, 2.1, PAL['wine'])
    c.ellipse(34.5 + stride + bx, 56.8, 3.2, 1.9, PAL['leather'], bias=0.05)
    c.ellipse(33 + stride + bx, 52.5, 2.6, 1.1, PAL['bronze'])
    # tronco
    c.ellipse(32 + bx, 33 + by, 5.6, 6.6, PAL['ivory'], bias=0.05)
    c.poly([(29.5 + bx, 32 + by), (37 + bx, 32 + by), (36.5 + bx, 39 + by), (29.5 + bx, 39 + by)], PAL['bronze'], s=0.55, grad=(-0.03, -0.02), bevel=0.15)
    c.ellipse(33 + bx, 39.6 + by, 4.8, 1.5, PAL['leather'])
    # aljava (costas)
    c.capsule(27 + bx, 26 + by, 25 + bx, 40 + by, 2.3, 2.1, PAL['leather'])
    c.line(27 + bx, 25 + by, 28 + bx, 21 + by, PAL['amber'][3], 1)
    c.line(26 + bx, 25 + by, 25.5 + bx, 21.5 + by, PAL['ivory'][4], 1)
    # braço dianteiro + arco
    if mode == 'shoot':
        c.capsule(33 + bx, 30 + by, 40 + bx, 32 + by, 2.1, 1.9, PAL['ivory'])
        c.ellipse(41 + bx, 32 + by, 1.8, 1.8, PAL['skin'])
        bow_vertical(c, 42 + bx, 20 + by, 45 + by, bend=3.4, drawn=k * 4)
        c.ellipse(36.5 - k * 3 + bx, 32.5 + by, 1.6, 1.6, PAL['skin'])
        c.line(36.5 - k * 3 + bx, 32.5 + by, 48 + bx, 32.5 + by, PAL['ivory'][3], 1)  # flecha
        c.pix(48 + bx, 32.5 + by, PAL['amber'][4])
    else:
        sw = math.sin(ph) * 2 if walk else 0
        c.capsule(33 + bx, 30 + by, 34 + sw + bx, 38 + by, 2.1, 1.9, PAL['ivory'])
        bow_vertical(c, 36 + sw + bx, 26 + by, 50 + by, bend=2.6)
        c.ellipse(34.5 + sw + bx, 39 + by, 1.8, 1.8, PAL['skin'])
    c.ellipse(32 + bx, 29.5 + by, 3.4, 3, PAL['bronze'], bias=0.08)
    c.pix(32 + bx, 29 + by, PAL['amber'][3])
    # cabeça de perfil
    hx = 33 + bx
    c.ellipse(hx - 2, 20 + by, 8.5, 8.5, PAL['wine'], bias=-0.03)  # capuz
    c.ellipse(hx + 1, 21.5 + by, 5.4, 6.2, PAL['skin'], bias=0.1)
    c.pix(hx + 6, 22.5 + by, PAL['skin'][2])  # nariz
    c.ellipse(hx - 1, 18 + by, 6, 4, PAL['hair'], bias=0.05)
    c.capsule(hx - 4, 19 + by, hx - 6 - flow, 30 + by, 2.0, 1.4, PAL['hair'])
    c.line(hx - 4, 16.5 + by, hx + 4.5, 16.5 + by, PAL['gold'][2], 1)
    c.pix(hx + 4, 16 + by, PAL['amber'][4])
    if mode == 'hurt':
        c.line(hx + 2, 22.5 + by, hx + 4, 22.5 + by, EYE, 1)
    else:
        c.pix(hx + 3, 22 + by, EYE)
        c.pix(hx + 3, 23 + by, EYE)
        c.pix(hx + 3, 22 + by, PAL['amber'][3])
    c.capsule(hx - 7, 15 + by, hx - 8.5, 26 + by, 1.8, 2.2, PAL['wine'], bias=0.1)
    c.outline()
    return c


def dash_frames(fn, n=3):
    out = []
    for i in range(n):
        c = fn(t=0.25, mode='walk')
        out.append(c)
    return out


def death_frames(n=6):
    """Queda: o corpo se ajoelha, tomba e as runas apagam."""
    from PIL import Image
    base = down(0, 'hurt').image()
    frames = []
    for i in range(n):
        t = i / (n - 1)
        im = base.copy()
        h = int(64 * (1 - 0.45 * min(1, t * 1.4)))
        w = int(64 * (1 + 0.15 * t))
        im = im.resize((w, h), Image.NEAREST)
        out = Image.new('RGBA', (64, 64))
        out.alpha_composite(im, ((64 - w) // 2, 60 - int(h * 0.94)))
        if t > 0.5:
            import numpy as np
            a = np.array(out).astype(np.float32)
            a[:, :, :3] *= (1 - (t - 0.5) * 0.6)
            a[:, :, 3] *= 1 - max(0, t - 0.75) * 2.4
            out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        frames.append(out)
    return frames


def build(atlas):
    dirs = {'down': down, 'up': up, 'right': side}
    for name, fn in dirs.items():
        atlas.anim(f'hero_idle_{name}', [fn(i / 4, 'idle').image() for i in range(4)])
        atlas.anim(f'hero_walk_{name}', [fn(i / 6, 'walk').image() for i in range(6)])
        atlas.anim(f'hero_shoot_{name}', [fn(0, 'shoot', k).image() for k in (0.3, 1.0, 0.6, 0.0)])
        atlas.anim(f'hero_dash_{name}', [fn(0.25 + i * 0.1, 'walk').image() for i in range(3)])
        atlas.anim(f'hero_hurt_{name}', [fn(0, 'hurt').image(), fn(0.1, 'hurt').image()])
    # esquerda = espelho autoral do perfil
    for anim in ('idle', 'walk', 'shoot', 'dash', 'hurt'):
        src = [im for k, im in atlas.items if k.startswith(f'hero_{anim}_right_')]
        atlas.anim(f'hero_{anim}_left', [im.transpose(0) for im in src])
    atlas.anim('hero_death', death_frames())
    # silhueta branca para hit-flash
    from pixel import flash_version
    atlas.add('hero_flash_down', flash_version(down(0, 'hurt').image()))
    atlas.add('hero_flash_up', flash_version(up(0, 'hurt').image()))
    atlas.add('hero_flash_right', flash_version(side(0, 'hurt').image()))
    atlas.add('hero_flash_left', flash_version(side(0, 'hurt').image()).transpose(0))
