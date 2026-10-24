"""Heróis jogáveis de Véu de Brasas (pixel art HD). Quadro lógico 64x64, pés em y≈58.

Cada herói é descrito por um "visual" (paleta de roupa, chapelaria, arma, veste longa) e
desenhado parte a parte em três direções (frente, costas, perfil); a esquerda é o espelho
autoral do perfil. As animações têm mais quadros que a versão original (idle 6, caminhada 8).
"""
import math
import numpy as np
from PIL import Image
from pixel import Canvas, PAL, hexc, ramp, flash_version, SC

S = 64
EYE = hexc('#1a0f14')
STRING = hexc('#e8dcc0')


def R(*h):
    from pixel import _smooth_ramp
    r = ramp(*h)
    return _smooth_ramp(r) if SC > 1 else r


LOOKS = {
    'lysa': dict(name='Lysa', cape=PAL['wine'], cloth=PAL['ivory'], metal=PAL['bronze'], hair=PAL['hair'], skin=PAL['skin'],
                 accent=PAL['amber'], head='hood', weapon='bow', robe=False, bulk=1.0),
    'orin': dict(name='Orin', cape=R('#0b0f24', '#16224a', '#22357a', '#3554a8', '#5f84d0'), cloth=R('#1a1430', '#2e2252', '#4a3a7c', '#6e5aa8', '#9a88cc'),
                 metal=PAL['gold'], hair=R('#2a1a12', '#4a3020', '#6e4a30', '#946844', '#b88c60'), skin=PAL['skin'],
                 accent=PAL['cyan'], head='hat', weapon='staff', robe=True, bulk=1.0),
    'brann': dict(name='Brann', cape=R('#200a08', '#481410', '#76221a', '#a43a28', '#d0603e'), cloth=R('#1c1a1e', '#3a363c', '#5e5860', '#868088', '#b0aab2'),
                  metal=R('#1a1c22', '#363a44', '#5a6070', '#8a92a4', '#c4ccdc'), hair=R('#3a1a08', '#6a3010', '#9a4a18', '#c86a28', '#e89a50'), skin=PAL['skin'],
                  accent=PAL['lava'], head='helm', weapon='sword', robe=False, bulk=1.12),
    'nyx': dict(name='Nyx', cape=R('#08060e', '#140f22', '#221a38', '#352a54', '#4e3f78'), cloth=R('#0c1418', '#14262c', '#1e3c44', '#2c5862', '#3e7c86'),
                metal=PAL['violet'], hair=R('#d8d0e8', '#e8e0f4', '#f2ecfa', '#faf6fe', '#ffffff'), skin=R('#3a2a3a', '#6e5468', '#a8889c', '#d4b8c8', '#f0dce6'),
                accent=PAL['violet'], head='veil', weapon='orb', robe=True, bulk=0.96),
}

L = LOOKS['lysa']


# ---------------------------------------------------------------- armas
def bow_vertical(c, x, y0, y1, bend=3.0, drawn=0.0):
    n = 10
    pts = [(x + math.sin(i / n * math.pi) * bend, y0 + (y1 - y0) * i / n) for i in range(n + 1)]
    for i in range(n):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        r = 1.35 if 3 <= i <= 6 else 0.95
        c.capsule(ax, ay, bx, by, r, r, PAL['wood'], bias=0.05)
    mx = x - drawn
    c.line(pts[0][0], pts[0][1], mx, (y0 + y1) / 2, STRING, 0.6)
    c.line(mx, (y0 + y1) / 2, pts[-1][0], pts[-1][1], STRING, 0.6)
    for i in (2, 5, 8):
        c.ellipse(pts[i][0] + 0.4, pts[i][1], 0.55, 0.55, L['accent'], bias=0.5)
    c.ellipse(pts[5][0], pts[5][1], 1.5, 2.1, L['metal'])


def bow_horizontal(c, x0, x1, y, bend=3.0, drawn=0.0, up=False):
    n = 10
    sg = -1 if up else 1
    pts = [(x0 + (x1 - x0) * i / n, y + sg * math.sin(i / n * math.pi) * bend) for i in range(n + 1)]
    for i in range(n):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        r = 1.35 if 3 <= i <= 6 else 0.95
        c.capsule(ax, ay, bx, by, r, r, PAL['wood'], bias=0.05)
    my = y - sg * drawn
    c.line(pts[0][0], pts[0][1], (x0 + x1) / 2, my, STRING, 0.6)
    c.line((x0 + x1) / 2, my, pts[-1][0], pts[-1][1], STRING, 0.6)
    for i in (2, 8):
        c.ellipse(pts[i][0], pts[i][1], 0.55, 0.55, L['accent'], bias=0.5)


def staff(c, x, y0, y1, glow=1.0):
    c.capsule(x, y0 + 3, x - 0.6, y1, 0.9, 0.8, PAL['wood'], bias=0.05)
    c.line(x - 1.6, y0 + 6, x + 1.6, y0 + 6, L['metal'][2], 0.9)
    # coroa do cajado + cristal
    c.arc(x, y0 + 2, 2.8, math.pi * 0.9, math.pi * 2.1, L['metal'][-3], 0.8)
    c.poly([(x, y0 - 4.5), (x + 2.2, y0 + 0.5), (x, y0 + 4), (x - 2.2, y0 + 0.5)], L['accent'], s=0.7, bevel=0.25)
    if glow:
        c.glow(x, y0, 6, L['accent'][-2], 0.35 * glow)


def sword(c, x, y0, y1, up=False):
    """espada larga vertical: lâmina com vinco, guarda e punho"""
    blade_top, blade_bot = (y0, y1 - 7) if not up else (y0 + 7, y1)
    c.poly([(x - 1.5, blade_bot), (x - 1.3, blade_top + 2), (x, blade_top - 0.5), (x + 1.3, blade_top + 2), (x + 1.5, blade_bot)], L['metal'], s=0.62, grad=(-0.06, 0), bevel=0.2)
    c.line(x, blade_top + 2, x, blade_bot - 1, L['metal'][-1], 0.5, alpha=0.8)
    gy = blade_bot + 0.5 if not up else blade_top - 0.5
    c.capsule(x - 3.4, gy, x + 3.4, gy, 0.9, 0.9, PAL['gold'], bias=0.15)
    hy0, hy1 = (gy + 1, gy + 5) if not up else (gy - 5, gy - 1)
    c.capsule(x, hy0, x, hy1, 0.8, 0.8, PAL['leather'])
    c.ellipse(x, hy1 + (0.8 if not up else -0.8), 1.2, 1.2, L['accent'], bias=0.4)


def orb(c, x, y, t=0.0, r=3.2):
    c.glow(x, y, r * 3, L['accent'][-3], 0.55)
    c.ellipse(x, y, r, r, L['accent'], bias=0.35)
    c.ellipse(x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.3, PAL['white'], flat=0.95, alpha=0.8)
    for k in range(3):
        a = t * math.tau + k * math.tau / 3
        c.ellipse(x + math.cos(a) * r * 1.8, y + math.sin(a) * r * 0.8, 0.7, 0.7, L['accent'], bias=0.6)


def weapon_vertical(c, x, y0, y1, t=0.0, side=False):
    w = L['weapon']
    if w == 'bow':
        bow_vertical(c, x, y0, y1, bend=3.2 if not side else 2.6)
    elif w == 'staff':
        staff(c, x, y0 - 3, y1 + 2)
    elif w == 'sword':
        sword(c, x, y0 + 4, y1)
    else:
        orb(c, x + 1, y0 + 8 + math.sin(t * math.tau) * 1.2, t)


def weapon_attack_down(c, by, k):
    """pose de ataque/conjuração vista de frente"""
    w = L['weapon']
    if w == 'bow':
        bow_horizontal(c, 20, 44, 41 + by - k * 0.5, bend=3.5, drawn=k * 3)
    elif w == 'staff':
        staff(c, 32 + 7, 14 + by - k * 4, 48 + by - k * 2, glow=0.6 + k)
    elif w == 'sword':
        # golpe horizontal à frente do corpo
        ang = -0.9 + k * 1.8
        cx, cy = 32, 40 + by
        ex, ey = cx + math.cos(ang) * 15, cy + math.sin(ang) * 6
        c.poly([(cx - 1, cy - 1.2), (ex, ey - 0.6), (ex + 1.5, ey + 0.3), (cx - 1, cy + 1.2)], L['metal'], s=0.7, bevel=0.2)
        c.capsule(cx - 3, cy, cx + 1, cy, 1.1, 1.1, PAL['gold'])
        if k > 0.3:
            c.arc(cx, cy, 15, -0.9, ang, L['accent'][-2], 1.4, alpha=0.55)
    else:
        orb(c, 32, 33 + by - k * 6, k, r=3 + k)


# ---------------------------------------------------------------- partes do corpo
def legs_front(c, by, la, robe):
    if robe:
        # botas aparecem sob a veste
        c.ellipse(28.5, 57 + la * 0.5, 3, 1.8, PAL['leather'], bias=0.05)
        c.ellipse(35.5, 57 - la * 0.5, 3, 1.8, PAL['leather'], bias=0.05)
        return
    for x, d in ((28.5, la), (35.5, -la)):
        foot = 57 + d * 0.6
        c.capsule(x, 44 + by, x, foot - 1.5, 2.4 * L['bulk'], 2.1, L['cloth'], bias=-0.1)
        c.ellipse(x, foot, 3.0, 1.9, PAL['leather'], bias=0.05)
        c.ellipse(x, foot - 4, 2.7, 1.2, L['metal'], bias=0.0)


def skirt_front(c, by, sway, robe):
    m = L['cloth']
    if robe:
        c.poly([(23.5, 35 + by), (40.5, 35 + by), (44 + sway * 0.4, 56), (32, 57.5), (20 + sway * 0.4, 56)], m, s=0.55, grad=(-0.02, -0.006), bevel=0.12)
        for x in (27, 32, 37):
            c.line(x, 40 + by, x + (x - 32) * 0.3 + sway * 0.2, 56, m[1], 0.6)
        c.line(20.5 + sway * 0.4, 55.5, 43.5 + sway * 0.4, 55.5, L['metal'][-3], 0.8)
        return
    c.poly([(24, 36 + by), (40, 36 + by), (42.5, 47 + by), (32, 49 + by), (21.5, 47 + by)], m, s=0.62, grad=(-0.02, -0.01), bevel=0.12)
    c.poly([(22, 45 + by), (42, 45 + by), (42.6, 47.5 + by), (32, 49.5 + by), (21.4, 47.5 + by)], L['cape'], s=0.55)
    for xx in (25.5, 29.5, 33.5, 37.5):
        c.ellipse(xx + 0.5, 46.6 + by, 0.5, 0.5, PAL['gold'], bias=0.4)


def torso_front(c, by):
    b = L['bulk']
    c.ellipse(32, 33 + by, 8 * b, 6.6, L['cloth'], bias=0.05)
    m = L['metal']
    if L['head'] == 'helm':
        # peitoral completo
        c.poly([(25, 30 + by), (39, 30 + by), (38, 40 + by), (32, 42 + by), (26, 40 + by)], m, s=0.55, grad=(-0.03, -0.02), bevel=0.2)
        c.line(32, 31 + by, 32, 41 + by, m[2], 0.7)
        c.ellipse(32, 35 + by, 1.4, 1.4, L['accent'], bias=0.4)
    else:
        c.poly([(27.5, 33 + by), (36.5, 33 + by), (35.5, 39 + by), (32, 40.5 + by), (28.5, 39 + by)], m, s=0.55, grad=(-0.03, -0.02), bevel=0.18)
        c.ellipse(32, 30.5 + by, 3.4, 1.6, L['cloth'], bias=0.1)
    c.ellipse(32, 39.8 + by, 7.2 * b, 1.5, PAL['leather'])
    c.ellipse(32, 39.8 + by, 0.8, 0.8, L['accent'], bias=0.5)


def pauldrons(c, by):
    b = L['bulk']
    r = 3.6 * b * (1.25 if L['head'] == 'helm' else 1)
    c.ellipse(32 - 8.5 * b, 29.5 + by, r, r * 0.83, L['metal'], bias=0.08)
    c.ellipse(32 + 8.5 * b, 29.5 + by, r, r * 0.83, L['metal'], bias=0.08)


def head_front(c, hx, by, hurt, t):
    head = L['head']
    if head == 'hood' or head == 'veil':
        c.ellipse(hx, 20 + by, 9.5, 9, L['cape'], bias=-0.05)
        c.poly([(hx - 8, 22 + by), (hx + 8, 22 + by), (hx + 6, 29 + by), (hx - 6, 29 + by)], L['cape'], s=0.42)
    c.ellipse(hx, 21.5 + by, 6.6, 6.4, L['skin'], bias=0.08)
    hair = L['hair']
    if head != 'helm':
        c.ellipse(hx, 17.5 + by, 7.2, 4.4, hair, bias=0.05)
        if head in ('hood', 'veil'):
            c.capsule(hx - 6, 18 + by, hx - 6.5, 27 + by, 1.8, 1.4, hair)
            c.capsule(hx + 6, 18 + by, hx + 6.5, 27 + by, 1.8, 1.4, hair)
        c.poly([(hx - 3, 18 + by), (hx + 1, 18 + by), (hx - 2, 21 + by)], hair, s=0.7)
    # rosto
    if hurt:
        c.line(hx - 3.5, 22.5 + by, hx - 1.5, 22.5 + by, EYE, 0.8)
        c.line(hx + 1.5, 22.5 + by, hx + 3.5, 22.5 + by, EYE, 0.8)
    else:
        blink = (t % 1.0) > 0.92
        for ex in (hx - 2.5, hx + 2.5):
            if blink:
                c.line(ex - 0.8, 22.8 + by, ex + 0.8, 22.8 + by, EYE, 0.6)
            else:
                c.ellipse(ex, 22.6 + by, 0.75, 1.05, EYE, flat=0.0)
                c.ellipse(ex - 0.2, 22.2 + by, 0.3, 0.3, L['accent'], bias=0.6)
    c.line(hx - 0.6, 25.6 + by, hx + 0.6, 25.6 + by, L['skin'][1], 0.5)
    if head == 'hood':
        c.line(hx - 5, 16.5 + by, hx + 5, 16.5 + by, PAL['gold'][2], 0.8)
        c.ellipse(hx, 16.3 + by, 0.8, 0.8, L['accent'], bias=0.5)
        c.capsule(hx - 8.5, 17 + by, hx - 7, 27 + by, 1.6, 2.2, L['cape'], bias=0.1)
        c.capsule(hx + 8.5, 17 + by, hx + 7, 27 + by, 1.6, 2.2, L['cape'], bias=0.1)
    elif head == 'veil':
        # véu translúcido e diadema de ametista
        c.poly([(hx - 7, 18 + by), (hx + 7, 18 + by), (hx + 6, 21 + by), (hx - 6, 21 + by)], L['cape'], s=0.5, alpha=0.75)
        c.ellipse(hx, 16.8 + by, 1.3, 1.3, L['metal'], bias=0.45)
        c.capsule(hx - 8.5, 17 + by, hx - 7.5, 30 + by, 1.6, 2.6, L['cape'], bias=0.1)
        c.capsule(hx + 8.5, 17 + by, hx + 7.5, 30 + by, 1.6, 2.6, L['cape'], bias=0.1)
    elif head == 'hat':
        # chapéu pontudo de aba larga
        c.ellipse(hx, 16.5 + by, 12, 3.4, L['cape'], bias=0.05)
        c.poly([(hx - 6.5, 16 + by), (hx + 6.5, 16 + by), (hx + 2.5, 6 + by), (hx + 5 + math.sin(t * math.tau) * 0.6, 1.5 + by), (hx - 1, 7 + by)], L['cape'], s=0.55, grad=(-0.03, 0.01), bevel=0.15)
        c.line(hx - 6.2, 14.8 + by, hx + 6.2, 14.8 + by, L['metal'][-4], 0.9)
        c.ellipse(hx + 3, 14.8 + by, 1, 1, L['accent'], bias=0.5)
    elif head == 'helm':
        c.ellipse(hx, 18.5 + by, 7.6, 6.6, L['metal'], bias=0.1)
        c.poly([(hx - 7.4, 19 + by), (hx + 7.4, 19 + by), (hx + 6.5, 21 + by), (hx - 6.5, 21 + by)], L['metal'], s=0.45)
        c.line(hx, 12 + by, hx, 19 + by, L['metal'][-2], 0.6)
        # pluma
        c.capsule(hx, 12 + by, hx + 4 + math.sin(t * math.tau) * 0.8, 6 + by, 1.6, 0.8, L['cape'], bias=0.1)


def down(t=0.0, mode='idle', k=0.0):
    c = Canvas(S, S)
    walk = mode == 'walk'
    ph = t * math.tau
    bob = (abs(math.sin(ph)) * -1.2 if walk else math.sin(ph) * 0.45) if mode in ('walk', 'idle') else 0
    sway = math.sin(ph - 0.6) * 1.4 if walk else math.sin(ph) * 0.4
    hurt = mode == 'hurt'
    hx = 32 + (1 if hurt else 0)
    by = bob + (1 if hurt else 0)
    robe = L['robe']
    if L['head'] != 'helm' or True:
        c.poly([(22, 28 + by), (42, 28 + by), (46 + sway, 52 + by), (40, 50 + by), (32, 52 + by), (24, 50 + by), (18 + sway, 52 + by)],
               L['cape'], s=0.38, grad=(-0.012, 0.004), bevel=0.15)
    la = math.sin(ph) * 2.2 if walk else 0
    legs_front(c, by, la, robe)
    skirt_front(c, by, sway, robe)
    torso_front(c, by)
    if mode == 'shoot':
        c.capsule(24, 30 + by, 26, 36 + by, 2.2, 2.0, L['cloth'])
        c.capsule(40, 30 + by, 38, 37 + by, 2.2, 2.0, L['cloth'])
        c.ellipse(28, 38 + by, 1.8, 1.8, L['skin'])
        c.ellipse(36, 38 + by, 1.8, 1.8, L['skin'])
        weapon_attack_down(c, by, k)
    else:
        sw = math.sin(ph) * 1.5 if walk else 0
        c.capsule(24, 30 + by, 22.5, 38 + by - sw, 2.2, 2.0, L['cloth'])
        c.ellipse(22.3, 39.5 + by - sw, 1.8, 1.8, L['skin'])
        c.capsule(40, 30 + by, 41.5, 38 + by + sw, 2.2, 2.0, L['cloth'])
        weapon_vertical(c, 43.5, 25 + by + sw, 50 + by + sw, t)
        c.ellipse(42.3, 38.5 + by + sw, 1.8, 1.8, L['skin'])
    pauldrons(c, by)
    head_front(c, hx, by, hurt, t)
    c.outline()
    return c


def up(t=0.0, mode='idle', k=0.0):
    c = Canvas(S, S)
    walk = mode == 'walk'
    ph = t * math.tau
    bob = (abs(math.sin(ph)) * -1.2 if walk else math.sin(ph) * 0.45) if mode in ('walk', 'idle') else 0
    sway = math.sin(ph - 0.6) * 1.5 if walk else math.sin(ph) * 0.4
    by = bob + (1 if mode == 'hurt' else 0)
    la = math.sin(ph) * 2.2 if walk else 0
    legs_front(c, by, -la, L['robe'])
    if mode == 'shoot':
        if L['weapon'] == 'bow':
            bow_horizontal(c, 20, 44, 21 + by + k * 0.5, bend=3.5, drawn=k * 3, up=True)
        elif L['weapon'] == 'staff':
            staff(c, 39, 8 + by - k * 3, 40 + by, glow=0.5 + k)
        elif L['weapon'] == 'sword':
            sword(c, 40, 8 + by - k * 4, 36 + by, up=False)
        else:
            orb(c, 32, 14 + by - k * 4, k)
        c.capsule(24, 30 + by, 27, 24 + by, 2.2, 2.0, L['cloth'])
        c.capsule(40, 30 + by, 37, 24 + by, 2.2, 2.0, L['cloth'])
    else:
        sw = math.sin(ph) * 1.5 if walk else 0
        c.capsule(24, 30 + by, 22.5, 38 + by + sw, 2.2, 2.0, L['cloth'])
        c.capsule(40, 30 + by, 41.5, 38 + by - sw, 2.2, 2.0, L['cloth'])
        c.ellipse(22.3, 39.5 + by + sw, 1.8, 1.8, L['skin'])
        if L['weapon'] == 'orb':
            orb(c, 20, 30 + by + math.sin(ph) * 1.2, t)
        else:
            weapon_vertical(c, 20.5, 25 + by - sw, 50 + by - sw, t)
        c.ellipse(41.7, 39.5 + by - sw, 1.8, 1.8, L['skin'])
    m = L['cape']
    c.poly([(23, 26 + by), (41, 26 + by), (44 + sway, 52 + by + (3 if L['robe'] else 0)), (36, 54 + by), (28, 54 + by), (20 + sway, 52 + by + (3 if L['robe'] else 0))],
           m, s=0.5, grad=(-0.015, -0.006), bevel=0.15)
    for i in range(4):
        x = 26 + i * 4 + sway * 0.4
        c.line(x, 34 + by, x + sway * 0.3, 52 + by, m[1], 0.6)
    c.line(21 + sway, 51.5 + by, 43 + sway, 51.5 + by, PAL['gold'][2], 0.8)
    if L['weapon'] == 'bow':
        c.capsule(36, 25 + by, 28, 41 + by, 2.6, 2.4, PAL['leather'], bias=0.05)
        for i, col in enumerate((L['cloth'][-1], L['accent'][-3], L['cloth'][-2])):
            c.line(36 + i * 1.5, 25 + by, 37 + i * 2, 21 + by, col, 0.8)
    elif L['weapon'] == 'sword':
        c.capsule(27, 24 + by, 38, 44 + by, 1.6, 1.6, PAL['leather'])  # bainha
    pauldrons(c, by)
    head = L['head']
    if head == 'helm':
        c.ellipse(32, 19 + by, 7.6, 7.2, L['metal'], bias=0.05)
        c.capsule(32, 12 + by, 33 + sway * 0.4, 30 + by, 1.6, 1.0, L['cape'], bias=0.0)
    elif head == 'hat':
        c.ellipse(32, 21 + by, 6.5, 6.5, L['hair'], bias=0.0)
        c.ellipse(32, 16.5 + by, 12, 3.4, L['cape'], bias=0.0)
        c.poly([(25.5, 16 + by), (38.5, 16 + by), (34.5, 6 + by), (37 + math.sin(ph) * 0.6, 1.5 + by), (31, 7 + by)], L['cape'], s=0.48, bevel=0.15)
    else:
        c.ellipse(32, 20.5 + by, 9, 8.6, m, bias=-0.02)
        c.poly([(28, 14 + by), (36, 14 + by), (33, 9 + by)], m, s=0.6, bevel=0.15)
        c.line(28, 16 + by, 30, 27 + by, m[1], 0.6)
        c.line(36, 16 + by, 34, 27 + by, m[1], 0.6)
        for i in range(5):
            yy = 27 + i * 2.2
            c.ellipse(32 + sway * 0.08 * i, yy + by, 2.0 - i * 0.15, 1.4, L['hair'], bias=-0.12)
        c.ellipse(32 + sway * 0.4, 38.5 + by, 1.6, 1.6, L['metal'])
    c.outline()
    return c


def side(t=0.0, mode='idle', k=0.0):
    c = Canvas(S, S)
    walk = mode == 'walk'
    ph = t * math.tau
    bob = (abs(math.sin(ph)) * -1.2 if walk else math.sin(ph) * 0.45) if mode in ('walk', 'idle') else 0
    by = bob + (1 if mode == 'hurt' else 0)
    bx = -1.5 if mode == 'hurt' else (0.6 if walk else 0)
    flow = 1.5 + (math.sin(ph - 0.7) * 1.5 if walk else math.sin(ph) * 0.5)
    stride = math.sin(ph) * 4 if walk else 0
    robe = L['robe']
    m = L['cape']
    c.poly([(30 + bx, 27 + by), (35 + bx, 28 + by), (34 + bx, 50 + by), (24 - flow + bx, 52 + by), (22 - flow * 1.5 + bx, 44 + by)], m, s=0.42, grad=(0.01, 0.0), bevel=0.15)
    if not robe:
        c.capsule(31 + bx, 44 + by, 31 - stride + bx, 55, 2.3, 2.0, PAL['leather'])
        c.ellipse(32 - stride + bx, 56.8, 3, 1.8, PAL['leather'])
    if mode == 'shoot':
        c.capsule(31 + bx, 30 + by, 36 - k * 3 + bx, 34 + by, 2.0, 1.8, L['cloth'], bias=-0.1)
    cl = L['cloth']
    if robe:
        c.poly([(27 + bx, 35 + by), (37 + bx, 35 + by), (40 + bx - stride * 0.2, 56), (25 + bx - stride * 0.2, 56)], cl, s=0.58, grad=(-0.02, 0), bevel=0.12)
        c.ellipse(36 + bx + stride * 0.3, 57, 3, 1.6, PAL['leather'])
        c.line(25.5 + bx, 55.5, 39.5 + bx, 55.5, L['metal'][-3], 0.8)
    else:
        c.poly([(27 + bx, 36 + by), (37 + bx, 36 + by), (39 + bx, 47 + by), (26 + bx, 47 + by)], cl, s=0.6, grad=(-0.02, 0), bevel=0.12)
        c.poly([(26 + bx, 45 + by), (39 + bx, 45 + by), (39.5 + bx, 47.5 + by), (25.5 + bx, 47.5 + by)], m, s=0.55)
        c.capsule(33 + bx, 44 + by, 33 + stride + bx, 55, 2.4, 2.1, cl)
        c.ellipse(34.5 + stride + bx, 56.8, 3.2, 1.9, PAL['leather'], bias=0.05)
        c.ellipse(33 + stride + bx, 52.5, 2.6, 1.1, L['metal'])
    c.ellipse(32 + bx, 33 + by, 5.6 * L['bulk'], 6.6, cl, bias=0.05)
    c.poly([(29.5 + bx, 32 + by), (37 + bx, 32 + by), (36.5 + bx, 39 + by), (29.5 + bx, 39 + by)], L['metal'], s=0.55, grad=(-0.03, -0.02), bevel=0.15)
    c.ellipse(33 + bx, 39.6 + by, 4.8, 1.5, PAL['leather'])
    if L['weapon'] == 'bow':
        c.capsule(27 + bx, 26 + by, 25 + bx, 40 + by, 2.3, 2.1, PAL['leather'])
        c.line(27 + bx, 25 + by, 28 + bx, 21 + by, L['accent'][-3], 0.8)
    if mode == 'shoot':
        c.capsule(33 + bx, 30 + by, 40 + bx, 32 + by, 2.1, 1.9, cl)
        c.ellipse(41 + bx, 32 + by, 1.8, 1.8, L['skin'])
        w = L['weapon']
        if w == 'bow':
            bow_vertical(c, 42 + bx, 20 + by, 45 + by, bend=3.4, drawn=k * 4)
            c.ellipse(36.5 - k * 3 + bx, 32.5 + by, 1.6, 1.6, L['skin'])
            c.line(36.5 - k * 3 + bx, 32.5 + by, 48 + bx, 32.5 + by, L['cloth'][-2], 0.7)
            c.ellipse(48 + bx, 32.5 + by, 0.7, 0.7, L['accent'], bias=0.6)
        elif w == 'staff':
            staff(c, 43 + bx + k * 2, 14 + by - k * 3, 46 + by, glow=0.6 + k)
        elif w == 'sword':
            ang = -1.2 + k * 2.2
            ex, ey = 41 + bx + math.cos(ang) * 14, 32 + by + math.sin(ang) * 14
            c.poly([(41 + bx, 31 + by), (ex, ey - 0.8), (ex + 1, ey + 0.8), (41 + bx, 33 + by)], L['metal'], s=0.7, bevel=0.2)
            if k > 0.3:
                c.arc(41 + bx, 32 + by, 14, -1.2, ang, L['accent'][-2], 1.3, alpha=0.5)
        else:
            orb(c, 45 + bx, 28 + by - k * 4, k, r=3 + k)
    else:
        sw = math.sin(ph) * 2 if walk else 0
        c.capsule(33 + bx, 30 + by, 34 + sw + bx, 38 + by, 2.1, 1.9, cl)
        if L['weapon'] == 'orb':
            orb(c, 39 + sw + bx, 30 + by + math.sin(ph) * 1.2, t)
        else:
            weapon_vertical(c, 36 + sw + bx, 26 + by, 50 + by, t, side=True)
        c.ellipse(34.5 + sw + bx, 39 + by, 1.8, 1.8, L['skin'])
    c.ellipse(32 + bx, 29.5 + by, 3.4 * L['bulk'] * (1.2 if L['head'] == 'helm' else 1), 3, L['metal'], bias=0.08)
    hx = 33 + bx
    head = L['head']
    if head in ('hood', 'veil'):
        c.ellipse(hx - 2, 20 + by, 8.5, 8.5, m, bias=-0.03)
    c.ellipse(hx + 1, 21.5 + by, 5.4, 6.2, L['skin'], bias=0.1)
    c.ellipse(hx + 6, 22.5 + by, 0.7, 0.7, L['skin'], bias=-0.1)
    if head != 'helm':
        c.ellipse(hx - 1, 18 + by, 6, 4, L['hair'], bias=0.05)
        c.capsule(hx - 4, 19 + by, hx - 6 - flow, 30 + by, 2.0, 1.4, L['hair'])
    if mode == 'hurt':
        c.line(hx + 2, 22.5 + by, hx + 4, 22.5 + by, EYE, 0.7)
    else:
        c.ellipse(hx + 3, 22.6 + by, 0.7, 1.0, EYE, flat=0.0)
        c.ellipse(hx + 2.8, 22.2 + by, 0.3, 0.3, L['accent'], bias=0.6)
    if head == 'hood':
        c.line(hx - 4, 16.5 + by, hx + 4.5, 16.5 + by, PAL['gold'][2], 0.8)
        c.capsule(hx - 7, 15 + by, hx - 8.5, 26 + by, 1.8, 2.2, m, bias=0.1)
    elif head == 'veil':
        c.capsule(hx - 7, 15 + by, hx - 9 - flow, 31 + by, 1.8, 2.8, m, bias=0.1)
        c.ellipse(hx + 3, 16.8 + by, 1.1, 1.1, L['metal'], bias=0.45)
    elif head == 'hat':
        c.ellipse(hx, 16.5 + by, 11, 3, m, bias=0.05)
        c.poly([(hx - 6, 16 + by), (hx + 5, 16 + by), (hx - 1, 6 + by), (hx - 6 - flow * 0.6, 2 + by), (hx - 4, 8 + by)], m, s=0.55, bevel=0.15)
        c.line(hx - 5.6, 14.8 + by, hx + 4.6, 14.8 + by, L['metal'][-4], 0.9)
    elif head == 'helm':
        c.ellipse(hx, 18.5 + by, 7, 6.6, L['metal'], bias=0.1)
        c.poly([(hx + 1, 19 + by), (hx + 7, 19 + by), (hx + 6.5, 22 + by), (hx + 1, 22 + by)], L['metal'], s=0.4)
        c.capsule(hx - 1, 12 + by, hx - 6 - flow, 9 + by, 1.6, 0.8, m, bias=0.1)
    c.outline()
    return c


def death_frames(n=8):
    base = down(0, 'hurt').image()
    W, H = base.size
    frames = []
    for i in range(n):
        t = i / (n - 1)
        h = int(H * (1 - 0.45 * min(1, t * 1.4)))
        w = int(W * (1 + 0.15 * t))
        im = base.resize((w, h), Image.NEAREST)
        out = Image.new('RGBA', (W, H))
        out.alpha_composite(im, ((W - w) // 2, int(H * 60 / 64) - int(h * 0.94)))
        if t > 0.5:
            a = np.array(out).astype(np.float32)
            a[:, :, :3] *= (1 - (t - 0.5) * 0.6)
            a[:, :, 3] *= max(0.0, 1 - max(0, t - 0.75) * 2.4)
            out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        frames.append(out)
    return frames


def build(atlas, hero_id='lysa'):
    global L
    L = LOOKS[hero_id]
    p = f'hero_{hero_id}'
    dirs = {'down': down, 'up': up, 'right': side}
    for name, fn in dirs.items():
        atlas.anim(f'{p}_idle_{name}', [fn(i / 6, 'idle').image() for i in range(6)])
        atlas.anim(f'{p}_walk_{name}', [fn(i / 8, 'walk').image() for i in range(8)])
        atlas.anim(f'{p}_shoot_{name}', [fn(0, 'shoot', k).image() for k in (0.25, 0.7, 1.0, 0.55, 0.0)])
        atlas.anim(f'{p}_dash_{name}', [fn(0.25 + i * 0.1, 'walk').image() for i in range(3)])
        atlas.anim(f'{p}_hurt_{name}', [fn(0, 'hurt').image(), fn(0.1, 'hurt').image()])
    for anim in ('idle', 'walk', 'shoot', 'dash', 'hurt'):
        src = [im for k, im in atlas.items if k.startswith(f'{p}_{anim}_right_')]
        atlas.anim(f'{p}_{anim}_left', [im.transpose(Image.FLIP_LEFT_RIGHT) for im in src])
    atlas.anim(f'{p}_death', death_frames())
    atlas.add(f'{p}_flash_down', flash_version(down(0, 'hurt').image()))
    atlas.add(f'{p}_flash_up', flash_version(up(0, 'hurt').image()))
    atlas.add(f'{p}_flash_right', flash_version(side(0, 'hurt').image()))
    atlas.add(f'{p}_flash_left', flash_version(side(0, 'hurt').image()).transpose(Image.FLIP_LEFT_RIGHT))
    # retrato para a seleção de personagem
    return down(0.2, 'idle').image()
