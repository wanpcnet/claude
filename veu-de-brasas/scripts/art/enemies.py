"""Bestiário de Véu de Brasas. Cada espécie tem anatomia própria (nenhuma é recolor de outra).
Criaturas comuns são desenhadas de perfil 3/4 voltadas para a direita (o jogo espelha)."""
import math
from pixel import Canvas, PAL, hexc, shatter_frames

EYE_RED = hexc('#ffdf6a')
EYE_CY = hexc('#c8fff8')
BLACK = hexc('#0c0810')
GLOW_CY = hexc('#7ff6ff')


def rust_beetle(t=0.0):
    """Ferrugíneo — inseto escarlate segmentado e veloz."""
    c = Canvas(24, 24)
    ph = t * math.tau
    bob = math.sin(ph * 2) * 0.4
    # patas (3 pares, tripé alternado)
    for i, lx in enumerate((10.5, 13, 15.5)):
        sw = math.sin(ph + i * 2.1) * 1.8
        c.line(lx, 13 + bob, lx - 2 + sw, 19.5, PAL['carmine'][0], 1)
        c.line(lx, 12 + bob, lx - 1 - sw, 6, PAL['carmine'][1], 1)
    c.ellipse(9, 13 + bob, 6.2, 4.6, PAL['carmine'], bias=0.02)  # abdómen
    c.line(4, 13 + bob, 14, 13 + bob, PAL['carmine'][0], 1)  # fenda dos élitros
    c.pix(7, 11 + bob, PAL['coral'][4]); c.pix(8, 11 + bob, PAL['coral'][3])
    c.ellipse(14.5, 12.5 + bob, 3.4, 3.1, PAL['rust'], bias=0.05)  # tórax
    c.ellipse(18.4, 12.6 + bob, 2.8, 2.5, PAL['carmine'], bias=-0.1)  # cabeça
    c.line(20, 11.5 + bob, 22.5, 10 + bob, PAL['bone'][2], 1)  # mandíbulas
    c.line(20, 13.8 + bob, 22.5, 15 + bob, PAL['bone'][2], 1)
    c.line(18, 10.5 + bob, 21, 7 + bob, PAL['carmine'][1], 1)  # antena
    c.pix(19, 12 + bob, EYE_RED)
    c.outline()
    return c


def spider(t=0.0, lunge=0.0):
    """Mordalume — aranha turquesa baixa com marcas bioluminescentes."""
    c = Canvas(30, 22)
    ph = t * math.tau
    st = lunge * 3
    for i in range(4):
        base_x = 14 + i * 1.6 + st * 0.3
        sw = math.sin(ph + i * 1.6) * 1.6 * (1 - lunge)
        back = -lunge * 2
        # pata de baixo (frente da cena)
        kx, ky = base_x - 3 + i * 1.8 + sw + back, 17.5
        c.line(base_x, 12, kx, ky - 3, PAL['teal'][1], 1.2)
        c.line(kx, ky - 3, kx + 1.5 + i * 0.6, ky + 2, PAL['teal'][0], 1)
        # pata de cima
        kx2 = base_x - 3 + i * 1.8 - sw + back
        c.line(base_x, 10, kx2, 4, PAL['teal'][2], 1.2)
        c.line(kx2, 4, kx2 + 1 + i * 0.6, 8, PAL['teal'][1], 1)
    c.ellipse(9 + st * 0.2, 11, 7, 5.6, PAL['teal'], bias=0.0)  # abdómen
    for (x, y) in ((7, 10), (9, 9), (11, 10), (8, 12), (10, 12.5)):
        c.pix(x + st * 0.2, y, GLOW_CY)
    c.ellipse(17 + st, 11, 4.4, 3.8, PAL['teal'], bias=0.08)  # cefalotórax
    for (x, y) in ((19.5, 9.5), (20.5, 10.5), (19.8, 11.8), (21, 12)):
        c.pix(x + st, y, EYE_CY)
    c.line(20.5 + st, 13.5, 22 + st, 15, PAL['bone'][3], 1)  # quelíceras
    c.outline()
    return c


def slime_child(t=0.0, slam=0.0):
    """Filho do Lodo — criatura pálida e lenta com barriga translúcida."""
    c = Canvas(34, 34)
    ph = t * math.tau
    sq = math.sin(ph) * 0.08 - slam * 0.18
    rx, ry = 10.5 * (1 + sq), 9.5 * (1 - sq)
    cy = 22 + (9.5 - ry)
    # bracinhos
    arm_up = slam * 9
    c.capsule(9, cy - 2, 5, cy + 3 - arm_up, 2.3, 2.0, PAL['pale'])
    c.capsule(24, cy - 2, 28, cy + 2 - arm_up, 2.3, 2.0, PAL['pale'])
    c.ellipse(17, cy, rx, ry, PAL['pale'], bias=-0.08)
    # barriga translúcida com núcleo
    c.ellipse(17.5, cy + 2.5, rx * 0.62, ry * 0.55, PAL['slime'], alpha=0.65, bias=0.15)
    c.ellipse(17.5, cy + 3 + math.sin(ph) * 0.6, 2.4, 2.2, PAL['jade'], bias=0.4)
    c.pix(17, cy + 2, hexc('#d8ffd0'))
    # rosto
    c.ellipse(13.5, cy - 4.5, 1.6, 2.0, PAL['dark'], flat=0.1)
    c.ellipse(20.5, cy - 4.5, 1.6, 2.0, PAL['dark'], flat=0.1)
    c.pix(13.5, cy - 5, EYE_CY); c.pix(20.5, cy - 5, EYE_CY)
    c.line(11.5, cy - 7.5, 15, cy - 6, PAL['dark'][1], 1)
    c.line(22.5, cy - 7.5, 19, cy - 6, PAL['dark'][1], 1)
    c.ellipse(17, cy - 1, 3.2, 1.6, PAL['dark'], flat=0.1)
    c.pix(15.5, cy - 2, PAL['bone'][4]); c.pix(18.5, cy - 2, PAL['bone'][4])
    # gotas de lodo
    c.pix(8, cy + 7, PAL['slime'][2]); c.pix(26, cy + 6, PAL['slime'][2])
    c.outline()
    return c


def glass_wasp(t=0.0, dive=0.0):
    """Vespa de Vidro — voadora de asas translúcidas, mergulha com aviso."""
    c = Canvas(34, 30)
    ph = t * math.tau
    wa = math.sin(ph) * 0.9
    tilt = dive * 0.35
    # asa de trás
    c.ellipse(13, 9 - wa * 2, 7, 2.6, PAL['white'], rot=-0.6 - wa * 0.5 - dive, alpha=0.35, flat=0.8)
    # abdómen segmentado + ferrão
    for i in range(3):
        c.ellipse(9.5 - i * 3.0, 16 + i * 1.6 + tilt * 4, 3.6 - i * 0.6, 3.0 - i * 0.4, PAL['glass'], bias=0.05 - i * 0.05)
        c.line(9.5 - i * 3 + 1.5, 14 + i * 1.6 + tilt * 4, 9.5 - i * 3 + 1.5, 18 + i * 1.6 + tilt * 4, PAL['glass'][0], 1)
    c.line(2, 21 + tilt * 4, -0.5 + 1, 23.5 + tilt * 5, PAL['bone'][4], 1)
    c.ellipse(15, 14, 3.6, 3.2, PAL['cyan'], bias=0.1)  # tórax
    c.ellipse(19.5, 13 - tilt * 2, 3.0, 2.8, PAL['glass'], bias=0.0)  # cabeça
    c.ellipse(20.5, 12 - tilt * 2, 1.6, 1.8, PAL['amber'], bias=0.3)  # olho composto
    c.line(17.5, 16, 17, 20, PAL['glass'][1], 1)  # patas
    c.line(15, 17, 14, 21, PAL['glass'][1], 1)
    # asa da frente
    c.ellipse(15, 8 - wa * 2.5, 8, 2.8, PAL['white'], rot=-0.9 - wa * 0.6 - dive, alpha=0.5, flat=0.85)
    c.line(15, 13, 15 + math.cos(-0.9 - wa * 0.6) * 6, 13 + math.sin(-0.9 - wa * 0.6) * 9, hexc('#cdf8ff'), 1, alpha=0.6)
    c.outline(mix=0.3)
    return c


def red_shell(t=0.0, windup=0.0, charge=0.0):
    """Carapaça Rubra — soldado couraçado, lento, com investida frontal."""
    c = Canvas(42, 36)
    ph = t * math.tau
    shake = math.sin(t * 40) * windup * 0.8
    lean = charge * 3 - windup * 1.5
    for i in range(3):
        sw = math.sin(ph + i * 2) * 1.5 * (1 - charge)
        x = 14 + i * 5
        c.capsule(x + shake, 24, x - 2 + sw - charge * 3, 31, 1.8, 1.4, PAL['carmine'], bias=-0.1)
    c.ellipse(18 + shake + lean * 0.3, 18, 13, 10.5, PAL['carmine'], bias=0.02)  # carapaça
    ox = 18 + shake + lean * 0.3
    for a in (-2.3, -1.6, -0.9):
        c.line(ox + math.cos(a) * 3, 18 + math.sin(a) * 2, ox + math.cos(a) * 12, 18 + math.sin(a) * 9.5, PAL['carmine'][1], 1)
    c.line(ox - 12, 21, ox + 11, 21, PAL['carmine'][1], 1)
    for x in (ox - 8, ox - 2, ox + 4):
        c.pix(x, 23, PAL['coral'][2])
    c.ellipse(ox - 3, 12.5, 3.5, 1.5, PAL['coral'], bias=0.4)
    # escudo frontal de osso com chifres
    hx = 31 + shake + lean
    c.poly([(hx - 4, 10), (hx + 5, 13), (hx + 7, 19), (hx + 4, 25), (hx - 4, 26), (hx - 6, 18)], PAL['bone'], s=0.55, grad=(-0.02, -0.03), bevel=0.2)
    c.poly([(hx + 3, 12), (hx + 10, 8), (hx + 6, 15)], PAL['bone'], s=0.7, bevel=0.15)
    c.poly([(hx + 4, 22), (hx + 10, 26), (hx + 4, 25)], PAL['bone'], s=0.5, bevel=0.15)
    c.pix(hx + 2, 17, EYE_RED); c.pix(hx + 3, 17, EYE_RED)
    c.line(hx - 3, 15, hx - 1, 23, PAL['bone'][1], 1)
    c.outline()
    return c


def rift_frog(pose='idle', t=0.0):
    """Sapo da Fenda — anfíbio azul-esverdeado de expressão hostil, salta."""
    c = Canvas(38, 34)
    ph = t * math.tau
    squash = {'idle': math.sin(ph) * 0.03, 'crouch': 0.18, 'jump': -0.22, 'land': 0.25}[pose]
    rx, ry = 11 * (1 + squash), 8.5 * (1 - squash)
    cy = 22 + squash * 6
    if pose == 'jump':
        c.capsule(9, cy + 2, 2, cy + 7, 2.2, 1.6, PAL['frog'])  # pernas estendidas
        c.capsule(13, cy + 3, 6, cy + 9, 2.2, 1.6, PAL['frog'], bias=-0.1)
    else:
        c.ellipse(8, cy + 4, 4.5, 3.5, PAL['frog'], bias=-0.05)  # coxa dobrada
        c.ellipse(6, cy + 7, 3.5, 1.4, PAL['frog'], bias=-0.15)
    c.ellipse(17, cy, rx, ry, PAL['frog'], bias=0.02)
    # papo
    throat = 1 + (math.sin(ph * 2) * 0.12 if pose == 'idle' else 0)
    c.ellipse(24, cy + 4, 4.5 * throat, 3.2 * throat, PAL['bone'], bias=0.05)
    # cabeça e olhos hostis
    c.ellipse(24.5, cy - 4, 6.5, 4.8, PAL['frog'], bias=0.1)
    for ex in (22, 27.5):
        c.ellipse(ex, cy - 7.5, 2.3, 2.2, PAL['frog'], bias=0.15)
        c.pix(ex, cy - 7.5, EYE_RED)
        c.pix(ex + 0.8, cy - 7.5, BLACK)
        c.line(ex - 1.8, cy - 9.8, ex + 1.5, cy - 8.8, BLACK, 1)  # sobrancelha zangada
    c.line(21, cy - 1.5, 30.5, cy - 2.5, BLACK, 1)  # boca
    # verrugas de cristal
    for (x, y) in ((13, cy - 4), (16, cy - 6), (11, cy - 1), (18, cy - 3)):
        c.pix(x, y, PAL['cyan'][4]); c.pix(x, y + 1, PAL['cyan'][2])
    c.capsule(26, cy + 5, 29, cy + 8.5, 1.6, 1.2, PAL['frog'])  # braço
    c.outline()
    return c


def whisperer(t=0.0, cast=0.0):
    """Sussurrante — pequeno espectro encapuzado que dispara orbes."""
    c = Canvas(28, 34)
    ph = t * math.tau
    by = math.sin(ph) * 1.2
    sway = math.sin(ph + 1) * 1.5
    c.poly([(8, 14 + by), (20, 14 + by), (21, 24 + by), (14 + sway, 33), (7, 24 + by)], PAL['ghost'], s=0.5, grad=(-0.015, -0.03), alpha=0.85)
    c.poly([(9, 22 + by), (19, 22 + by), (14 + sway, 33)], PAL['ghost'], s=0.2, alpha=0.5)
    c.ellipse(14, 11 + by, 6.5, 6.5, PAL['ghost'], bias=0.0)  # capuz
    c.ellipse(14.5, 12 + by, 4.2, 4.0, PAL['obsidian'], flat=0.05)
    c.pix(12.5, 12 + by, EYE_CY); c.pix(16.5, 12 + by, EYE_CY)
    c.pix(12.5, 11 + by, hexc('#ffffff')); c.pix(16.5, 11 + by, hexc('#ffffff'))
    hy = 20 + by - cast * 6
    c.ellipse(7 - cast, hy, 1.6, 1.6, PAL['ghost'], bias=0.2)
    c.ellipse(21 + cast, hy, 1.6, 1.6, PAL['ghost'], bias=0.2)
    if cast > 0:
        c.ellipse(14, hy - 4, 2 + cast * 1.5, 2 + cast * 1.5, PAL['violet'], bias=0.4)
        c.pix(14, hy - 4, hexc('#ffffff'))
    c.outline(mix=0.3)
    return c


# ---------------------------------------------------------------- elites
def coral_guardian(t=0.0, windup=0.0, broken=False):
    """Guardião de Coral — blindado; projeta cone de estilhaços; armadura quebrável."""
    c = Canvas(60, 54)
    ph = t * math.tau
    bob = math.sin(ph * 2) * 0.6
    for i in range(3):
        sw = math.sin(ph + i * 2.2) * 2
        x = 20 + i * 7
        c.capsule(x, 36 + bob, x - 3 + sw, 47, 2.4, 1.8, PAL['coral'], bias=-0.1)
    if broken:
        c.ellipse(28, 27 + bob, 15, 12, PAL['dark'], bias=0.05)
        c.ellipse(28, 26 + bob, 8, 7, PAL['glass'], bias=0.35)
        for (x, y) in ((25, 23), (30, 25), (27, 29)):
            c.pix(x, y + bob, hexc('#ffffff'))
        for (x, y, r) in ((16, 30, 3), (40, 31, 3.5)):
            c.ellipse(x, y + bob, r, r * 0.8, PAL['coral'], bias=-0.1)
    else:
        c.ellipse(28, 27 + bob, 17, 13, PAL['coral'], bias=0.02)
        # placas e espinhos de coral
        for (x, y, a, l) in ((16, 17, -2.2, 7), (22, 13, -1.8, 9), (30, 12, -1.5, 9), (37, 15, -1.1, 8), (42, 21, -0.6, 6)):
            ex, ey = x + math.cos(a) * l, y + math.sin(a) * l
            c.capsule(x, y + bob, ex, ey + bob, 2.4, 0.8, PAL['coral'], bias=0.1)
            c.pix(ex, ey + bob, PAL['coral'][4])
        for (x0, y0, x1, y1) in ((14, 30, 42, 30), (20, 21, 24, 37), (30, 19, 33, 37)):
            c.line(x0, y0 + bob, x1, y1 + bob, PAL['coral'][1], 1)
        for (x, y) in ((17, 25), (27, 24), (37, 26), (22, 33), (34, 33)):
            c.ellipse(x, y + bob, 2, 1.6, PAL['bone'], bias=0.2)
    # máscara de osso
    hx = 44 + windup * 2
    c.poly([(hx - 5, 22 + bob), (hx + 6, 24 + bob), (hx + 7, 32 + bob), (hx - 4, 35 + bob), (hx - 7, 29 + bob)], PAL['bone'], s=0.55, grad=(-0.02, -0.02), bevel=0.2)
    c.pix(hx + 2, 27 + bob, GLOW_CY); c.pix(hx + 3, 27 + bob, GLOW_CY); c.pix(hx + 3, 28 + bob, EYE_CY)
    # garras
    ca = windup * 0.6
    c.capsule(40, 34 + bob, 50, 40 - windup * 6 + bob, 3, 2.4, PAL['coral'])
    c.poly([(48, 36 - windup * 6 + bob), (57, 34 - windup * 8 + bob - ca * 3), (52, 41 - windup * 6 + bob)], PAL['bone'], s=0.6, bevel=0.2)
    c.poly([(48, 41 - windup * 6 + bob), (56, 44 - windup * 5 + bob + ca * 3), (50, 44 - windup * 6 + bob)], PAL['bone'], s=0.45, bevel=0.2)
    if windup > 0.5:
        c.ellipse(hx + 4, 29 + bob, 2.5, 2.5, PAL['glass'], bias=0.5)
    c.outline()
    return c


def glass_priestess(t=0.0, cast=0.0):
    """Sacerdotisa de Vidro — invoca lacaios e marca zonas perigosas."""
    c = Canvas(48, 62)
    ph = t * math.tau
    by = math.sin(ph) * 1.5
    # auréola de estilhaços
    for i in range(9):
        a = -math.pi + i * math.pi / 8 + ph * 0.05
        r = 13 + cast * 2
        x, y = 24 + math.cos(a) * r, 15 + by + math.sin(a) * r * 0.8
        c.poly([(x, y - 2.5), (x + 1.6, y), (x, y + 2.5), (x - 1.6, y)], PAL['glass'], s=0.7 + cast * 0.3, bevel=0.2)
    # manto
    c.poly([(16, 22 + by), (32, 22 + by), (38, 56), (30, 59), (18, 59), (10, 56)], PAL['teal'], s=0.5, grad=(-0.015, -0.01), bevel=0.15)
    for x in (18, 24, 30):
        c.line(x, 28 + by, x + (x - 24) * 0.4, 57, PAL['teal'][1], 1)
    c.poly([(19, 22 + by), (29, 22 + by), (27, 40 + by), (21, 40 + by)], PAL['glass'], s=0.62, bevel=0.2)
    c.line(11, 56, 37, 56, PAL['gold'][2], 1)
    # cabeça de vidro
    c.ellipse(24, 16 + by, 5.2, 6, PAL['glass'], bias=0.15)
    c.ellipse(24, 17 + by, 3.2, 3.6, PAL['cyan'], bias=0.3, alpha=0.7)
    c.pix(22.5, 16 + by, hexc('#ffffff')); c.pix(25.5, 16 + by, hexc('#ffffff'))
    # cajado
    sx = 37 + cast * 1
    sy = 12 - cast * 6 + by
    c.line(sx, sy, sx - 2, 58, PAL['bronze'][2], 1.4)
    c.poly([(sx, sy - 6), (sx + 3, sy), (sx, sy + 4), (sx - 3, sy)], PAL['glass'], s=0.75 + cast * 0.25, bevel=0.25)
    c.capsule(29, 25 + by, sx - 1, sy + 8, 1.8, 1.6, PAL['teal'])
    c.capsule(19, 25 + by, 13 - cast * 2, 34 + by - cast * 8, 1.8, 1.6, PAL['teal'])
    c.outline()
    return c


# ---------------------------------------------------------------- chefes
def colossal_toad(pose='idle', t=0.0, enraged=False):
    """Batráquio Colossal — anfíbio gigante com placas minerais. Vista frontal."""
    W, H = 176, 150
    c = Canvas(W, H)
    ph = t * math.tau
    sq = {'idle': math.sin(ph) * 0.025, 'crouch': 0.14, 'air': -0.16, 'land': 0.2, 'spit': 0.0}[pose]
    cx = 88
    rx, ry = 66 * (1 + sq), 46 * (1 - sq)
    cy = 92 + sq * 30
    from pixel import ramp
    skin = ramp('#050e12', '#0c2a30', '#164a4a', '#287068', '#5ca88e')
    # patas traseiras
    if pose == 'air':
        for s in (-1, 1):
            c.capsule(cx + s * 40, cy + 20, cx + s * 62, cy + 46, 10, 7, skin, bias=-0.1)
            c.ellipse(cx + s * 64, cy + 49, 12, 5, skin, bias=-0.1)
    else:
        for s in (-1, 1):
            c.ellipse(cx + s * 52 * (1 + sq), cy + 22, 22, 17, skin, bias=-0.08)
            c.ellipse(cx + s * 62 * (1 + sq), cy + 38, 15, 6, skin, bias=-0.15)
    c.ellipse(cx, cy, rx, ry, skin, bias=0.0)
    # placas minerais nas costas
    plates = [(-40, -30, 14), (-18, -40, 16), (8, -42, 16), (32, -34, 14), (50, -18, 10), (-55, -12, 10)]
    for (px, py, r) in plates:
        x, y = cx + px * (1 + sq), cy + py * (1 - sq)
        pts = [(x - r, y + r * 0.3), (x - r * 0.4, y - r * 0.9), (x + r * 0.5, y - r * 0.8), (x + r, y + r * 0.2), (x + r * 0.2, y + r * 0.7)]
        c.poly(pts, PAL['stone'], s=0.55, grad=(-0.01, -0.02), bevel=0.2)
        c.poly([(x - r * 0.3, y - r * 0.6), (x + r * 0.2, y - r * 1.4), (x + r * 0.5, y - r * 0.5)], PAL['cyan'], s=0.7, bevel=0.2)
        if enraged:
            c.line(x - r * 0.6, y, x + r * 0.5, y + r * 0.3, PAL['lava'][3], 1)
    # cabeça
    hy = cy + 6
    c.ellipse(cx, hy, 48 * (1 + sq), 26 * (1 - sq), skin, bias=0.08)
    # olhos
    for s in (-1, 1):
        ex = cx + s * 30 * (1 + sq)
        ey = hy - 22 * (1 - sq)
        c.ellipse(ex, ey, 11, 10, skin, bias=0.15)
        eye = PAL['lava'] if enraged else PAL['amber']
        c.ellipse(ex, ey + 1, 7, 6, eye, bias=0.3)
        c.ellipse(ex + s * 0.5, ey + 1, 1.6, 4.5, PAL['dark'], flat=0.0)
        c.line(ex - 10 * s, ey - 4, ex + 8 * s, ey - 10, BLACK, 2)
    # boca
    if pose == 'spit':
        open_ = 6 + math.sin(t * math.pi) * 6
        c.ellipse(cx, hy + 10, 30, open_, PAL['carmine'], bias=-0.2)
        c.ellipse(cx, hy + 10 + open_ * 0.3, 10, open_ * 0.5, PAL['lava'], bias=0.4)
    else:
        c.arc(cx, hy + 58, 52, -math.pi + 0.62, -0.62, BLACK, 2)
        for s in (-1, 1):
            c.poly([(cx + s * 18, hy + 9), (cx + s * 15, hy + 9), (cx + s * 16.5, hy + 15)], PAL['bone'], s=0.8)
            c.poly([(cx + s * 30, hy + 13), (cx + s * 27, hy + 12), (cx + s * 29, hy + 18)], PAL['bone'], s=0.8)
    # papo luminoso
    pulse = 1 + (math.sin(ph * 2) * 0.1 if pose == 'idle' else 0.05)
    c.ellipse(cx, hy + 24 * (1 - sq), 22 * pulse, 10 * pulse, PAL['lava'] if enraged else PAL['bone'], bias=0.1)
    if enraged:
        c.ellipse(cx, hy + 24 * (1 - sq), 12 * pulse, 5 * pulse, PAL['lava'], bias=0.5)
    # braços dianteiros
    for s in (-1, 1):
        c.capsule(cx + s * 34, cy + 22, cx + s * 40, cy + 44, 7, 6, skin, bias=0.0)
        for k in (-1, 0, 1):
            c.ellipse(cx + s * 40 + k * 5, cy + 48, 3, 2, PAL['bone'], bias=0.1)
    # verrugas cristalinas
    for (px, py) in ((-30, 10), (-12, -18), (14, -14), (36, 6), (-44, 4), (22, 18), (-20, 22)):
        x, y = cx + px * (1 + sq), cy + py * (1 - sq)
        c.ellipse(x, y, 2.2, 1.8, PAL['cyan'], bias=0.3)
    c.outline()
    return c


def veil_heart(t=0.0, phase=0, flare=0.0):
    """Coração do Véu — organismo cristalino pulsante com tentáculos de coral."""
    W = H = 180
    c = Canvas(W, H)
    cx, cy = 90, 92
    ph = t * math.tau
    pals = [('cyan', 'coral'), ('violet', 'coral'), ('lava', 'carmine')]
    crystal, tent = PAL[pals[phase][0]], PAL[pals[phase][1]]
    pulse = 1 + math.sin(ph) * 0.05 + flare * 0.1
    # tentáculos
    for i in range(9):
        a = i / 9 * math.tau + 0.2
        px, py = cx + math.cos(a) * 26, cy + math.sin(a) * 22
        r = 7.0
        for k in range(7):
            wob = math.sin(ph + i * 1.3 + k * 0.7) * 0.25
            a2 = a + wob * (k / 6)
            nx = px + math.cos(a2) * 9
            ny = py + math.sin(a2) * 7.5
            c.capsule(px, py, nx, ny, r, r - 0.8, tent, bias=-0.05 - k * 0.02)
            px, py, r = nx, ny, r - 0.8
        c.ellipse(px, py, 2.2, 2.2, crystal, bias=0.3)
    # massa orgânica
    c.ellipse(cx, cy + 4, 40 * pulse, 34 * pulse, PAL['dark'], bias=0.15)
    c.ellipse(cx, cy + 6, 34 * pulse, 28 * pulse, tent, bias=-0.1)
    # cristais facetados
    shards = [(0, -18, 14, 30), (-18, -6, 10, 22), (18, -8, 10, 24), (-8, 8, 9, 16), (10, 8, 9, 18), (0, -2, 12, 20)]
    for (dx, dy, w, h) in shards:
        x, y = cx + dx * pulse, cy + dy * pulse
        pts = [(x, y - h * 0.6 * pulse), (x + w * 0.5, y - h * 0.1), (x + w * 0.35, y + h * 0.4), (x - w * 0.35, y + h * 0.4), (x - w * 0.5, y - h * 0.1)]
        c.poly(pts, crystal, s=0.6 + flare * 0.2, grad=(-0.02, -0.02), bevel=0.25)
        c.line(x, y - h * 0.55 * pulse, x, y + h * 0.35, crystal[4], 1)
    c.glow(cx, cy - 4, 26 * pulse, crystal[4] * 0.7 if phase < 2 else PAL['lava'][4], 0.45 + flare * 0.4)
    c.ellipse(cx, cy - 2, 5 * pulse, 6 * pulse, PAL['white'], bias=0.4)
    c.outline()
    return c


def build(atlas):
    def deaths(key, base, tint, seed):
        atlas.anim(key + '_death', shatter_frames(base, 5, tint, seed))

    atlas.anim('rust_walk', [rust_beetle(i / 8).image() for i in range(8)], flash=True)
    deaths('rust', rust_beetle(0).image(), (1.0, 0.45, 0.3), 1)

    atlas.anim('spider_walk', [spider(i / 8).image() for i in range(8)], flash=True)
    atlas.anim('spider_lunge', [spider(0, l).image() for l in (0.3, 0.7, 1.0)], flash=True)
    deaths('spider', spider(0).image(), (0.4, 1.0, 0.95), 2)

    atlas.anim('slime_walk', [slime_child(i / 8).image() for i in range(8)], flash=True)
    atlas.anim('slime_attack', [slime_child(0, s).image() for s in (0.4, 1.0, 0.0, -0.6)], flash=True)
    deaths('slime', slime_child(0).image(), (0.8, 1.0, 0.8), 3)

    atlas.anim('wasp_fly', [glass_wasp(i / 6).image() for i in range(6)], flash=True)
    atlas.anim('wasp_dive', [glass_wasp(i / 4, 1.0).image() for i in range(2)], flash=True)
    deaths('wasp', glass_wasp(0).image(), (0.7, 1.0, 1.0), 4)

    atlas.anim('shell_walk', [red_shell(i / 8).image() for i in range(8)], flash=True)
    atlas.anim('shell_windup', [red_shell(i * 0.13, windup=1).image() for i in range(2)], flash=True)
    atlas.anim('shell_charge', [red_shell(i / 2, charge=1).image() for i in range(2)], flash=True)
    deaths('shell', red_shell(0).image(), (1.0, 0.5, 0.3), 5)

    atlas.anim('frog_idle', [rift_frog('idle', i / 2).image() for i in range(2)], flash=True)
    atlas.anim('frog_crouch', [rift_frog('crouch').image()], flash=True)
    atlas.anim('frog_jump', [rift_frog('jump').image()], flash=True)
    atlas.anim('frog_land', [rift_frog('land').image()], flash=True)
    deaths('frog', rift_frog('idle').image(), (0.5, 1.0, 0.9), 6)

    atlas.anim('ghost_float', [whisperer(i / 6).image() for i in range(6)], flash=True)
    atlas.anim('ghost_cast', [whisperer(0, k).image() for k in (0.4, 0.8, 1.0)], flash=True)
    deaths('ghost', whisperer(0).image(), (0.7, 0.75, 1.0), 7)

    atlas.anim('guardian_walk', [coral_guardian(i / 8).image() for i in range(8)], flash=True)
    atlas.anim('guardian_windup', [coral_guardian(0, w).image() for w in (0.4, 0.8, 1.0)], flash=True)
    atlas.anim('guardian_broken', [coral_guardian(i / 6, broken=True).image() for i in range(6)], flash=True)
    deaths('guardian', coral_guardian(0, broken=True).image(), (0.6, 1.0, 1.0), 8)

    atlas.anim('priestess_float', [glass_priestess(i / 4).image() for i in range(4)], flash=True)
    atlas.anim('priestess_cast', [glass_priestess(0, k).image() for k in (0.3, 0.6, 1.0, 1.0)], flash=True)
    deaths('priestess', glass_priestess(0).image(), (0.6, 1.0, 1.0), 9)


def build_bosses(atlas):
    atlas.anim('toad_idle', [colossal_toad('idle', i / 4).image() for i in range(4)], flash=True)
    atlas.anim('toad_rage', [colossal_toad('idle', i / 4, enraged=True).image() for i in range(4)], flash=True)
    atlas.anim('toad_crouch', [colossal_toad('crouch').image(), colossal_toad('crouch', enraged=True).image()], flash=True)
    atlas.anim('toad_air', [colossal_toad('air').image(), colossal_toad('air', enraged=True).image()], flash=True)
    atlas.anim('toad_land', [colossal_toad('land').image(), colossal_toad('land', enraged=True).image()], flash=True)
    atlas.anim('toad_spit', [colossal_toad('spit', k).image() for k in (0.2, 0.5, 0.9)], flash=True)
    atlas.anim('toad_death', shatter_frames(colossal_toad('land', enraged=True).image(), 6, (1.0, 0.6, 0.3), 11))
    for p in range(3):
        atlas.anim(f'heart_p{p}', [veil_heart(i / 6, p).image() for i in range(6)], flash=True)
        atlas.anim(f'heart_flare{p}', [veil_heart(0, p, f).image() for f in (0.4, 1.0, 0.6)], flash=True)
    atlas.anim('heart_death', shatter_frames(veil_heart(0, 2, 1.0).image(), 6, (1.0, 0.9, 0.6), 12))
