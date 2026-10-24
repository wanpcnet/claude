"""Props de cenário desenhados à mão (formas autorais por objeto). Âncora: base do objeto."""
import math
import numpy as np
from pixel import Canvas, PAL, hexc, ramp

W = hexc('#ffffff')


def tree_petrified(v=0):
    c = Canvas(72, 100)
    rng = np.random.default_rng(10 + v)
    # raízes
    for a in (-2.6, -2.0, -1.0, -0.4):
        c.capsule(36, 90, 36 + math.cos(a) * -16, 92 + abs(math.sin(a)) * 4, 4, 1.5, PAL['stone'], bias=-0.1)
    c.capsule(36, 92, 35, 50, 7, 5, PAL['stone'], bias=0.0)
    # galhos retorcidos de pedra
    branches = [(35, 60, 14, 40, 4), (35, 56, 58, 34, 4), (36, 50, 30, 22, 3.5), (36, 50, 48, 18, 3), (20, 42, 10, 30, 2.4), (52, 38, 62, 26, 2.2)]
    if v:
        branches = [(35, 62, 12, 48, 4), (35, 54, 60, 42, 4), (36, 50, 26, 18, 3.5), (36, 48, 50, 24, 3), (14, 48, 6, 36, 2.2), (58, 42, 66, 30, 2)]
    for (x0, y0, x1, y1, r) in branches:
        c.capsule(x0, y0, x1, y1, r, r * 0.45, PAL['stone'], bias=0.05)
    # cristais de coral vermelho petrificado na copa
    for (x0, y0, x1, y1, r) in branches[2:]:
        c.ellipse(x1, y1, 3 + r * 0.6, 2.4 + r * 0.4, PAL['coral'], bias=0.1)
    for _ in range(6):
        x, y = rng.uniform(14, 58), rng.uniform(22, 70)
        c.pix(x, y, PAL['coral'][3])
    c.line(33, 86, 34, 58, PAL['stone'][1], 1)
    c.line(38, 84, 37, 64, PAL['stone'][4], 1)
    c.outline()
    return c


def coral_red(v=0):
    c = Canvas(36, 40)
    arms = [(18, 36, 10, 14), (18, 36, 18, 8), (18, 36, 27, 16), (14, 26, 6, 20), (22, 24, 31, 24)]
    if v:
        arms = [(18, 36, 8, 18), (18, 36, 22, 6), (18, 36, 30, 20), (12, 24, 14, 12)]
    for (x0, y0, x1, y1) in arms:
        c.capsule(x0, y0, x1, y1, 3.4, 1.8, PAL['coral'], bias=0.05)
        c.ellipse(x1, y1, 2.4, 2.4, PAL['coral'], bias=0.2)
        c.pix(x1 - 0.5, y1 - 1, PAL['coral'][4])
    c.ellipse(18, 36, 6, 2.6, PAL['stone'], bias=-0.1)
    c.outline()
    return c


def fungus_glow(v=0):
    c = Canvas(30, 26)
    caps = [(9, 18, 5), (18, 14, 7), (24, 20, 4)] if v == 0 else [(10, 16, 6), (20, 19, 5)]
    for (x, y, r) in caps:
        c.capsule(x, y + 6, x, y, 1.4, 1.2, PAL['pale'], bias=-0.1)
    for (x, y, r) in caps:
        c.ellipse(x, y, r, r * 0.6, PAL['teal'], bias=0.15)
        c.ellipse(x, y + r * 0.15, r * 0.6, r * 0.25, PAL['cyan'], bias=0.6)
        c.pix(x - r * 0.4, y - r * 0.2, W)
    c.outline(mix=0.3)
    return c


def boulder(v=0):
    c = Canvas(48, 36)
    if v == 0:
        c.poly([(5, 30), (8, 14), (20, 6), (34, 8), (44, 18), (42, 31), (24, 34)], PAL['stone'], s=0.5, grad=(-0.012, -0.018), bevel=0.15)
        c.poly([(20, 6), (34, 8), (30, 18), (18, 16)], PAL['stone'], s=0.78)
        c.poly([(10, 26), (18, 22), (22, 30)], PAL['mossstone'], s=0.55)
    else:
        c.poly([(6, 30), (10, 18), (22, 12), (36, 14), (42, 26), (34, 33), (14, 33)], PAL['stone'], s=0.5, grad=(-0.012, -0.018), bevel=0.15)
        c.poly([(22, 12), (36, 14), (32, 22), (20, 20)], PAL['stone'], s=0.75)
    c.line(24, 18, 28, 30, PAL['stone'][0], 1)
    c.outline()
    return c


def stele():
    c = Canvas(28, 56)
    c.poly([(6, 52), (6, 12), (14, 4), (22, 12), (22, 52)], PAL['stone'], s=0.5, grad=(-0.02, -0.006), bevel=0.15)
    c.poly([(4, 54), (24, 54), (24, 50), (4, 50)], PAL['stone'], s=0.35)
    for i, y in enumerate((18, 27, 36)):
        from fx import RUNES
        for (x0, y0, x1, y1) in RUNES[(i * 3) % 8]:
            c.line(14 + x0 * 0.8, y + y0 * 0.8, 14 + x1 * 0.8, y + y1 * 0.8, PAL['amber'][2], 1)
    c.line(10, 30, 13, 46, PAL['stone'][0], 1)
    c.outline()
    return c


def lantern(crystal=False):
    c = Canvas(20, 48)
    c.line(10, 46, 10, 14, PAL['bronze'][1], 2.2)
    c.line(9, 46, 9, 16, PAL['bronze'][3], 1)
    c.line(4, 14, 16, 14, PAL['bronze'][2], 1.6)
    c.line(14, 14, 14, 18, PAL['bronze'][2], 1)
    gp = PAL['cyan'] if crystal else PAL['amber']
    c.poly([(11, 18), (17, 18), (16, 27), (12, 27)], PAL['bronze'], s=0.4)
    c.ellipse(14, 22.5, 2.6, 3.4, gp, bias=0.5)
    c.pix(13, 21, W)
    c.ellipse(10, 46, 5, 2, PAL['stone'], bias=-0.1)
    c.outline()
    return c


def roots():
    c = Canvas(64, 28)
    for (x0, y0, x1, y1, r) in ((2, 18, 30, 12, 3), (30, 12, 62, 20, 2.6), (14, 24, 40, 16, 2.2), (40, 16, 56, 6, 1.8), (20, 6, 34, 13, 1.6)):
        c.capsule(x0, y0, x1, y1, r, r * 0.7, PAL['wood'], bias=-0.05)
    c.pix(26, 12, PAL['jade'][3]); c.pix(48, 14, PAL['jade'][2])
    c.outline()
    return c


def bones():
    c = Canvas(30, 18)
    c.capsule(4, 12, 20, 8, 1.6, 1.6, PAL['bone'])
    c.ellipse(4, 12, 2.2, 2, PAL['bone']); c.ellipse(20, 8, 2.2, 2, PAL['bone'])
    c.ellipse(23, 12, 4.4, 3.6, PAL['bone'], bias=0.05)  # crânio pequeno
    c.pix(22, 12, PAL['dark'][0]); c.pix(25, 12, PAL['dark'][0])
    c.capsule(8, 15, 15, 14, 1.2, 1.2, PAL['bone'], bias=-0.1)
    c.outline(mix=0.3)
    return c


def monument():
    c = Canvas(104, 124)
    c.poly([(8, 118), (96, 118), (90, 104), (14, 104)], PAL['stone'], s=0.45, bevel=0.15)
    c.poly([(18, 106), (86, 106), (82, 96), (22, 96)], PAL['stone'], s=0.55, bevel=0.15)
    # obelisco rachado em duas metades
    c.poly([(34, 98), (34, 30), (50, 12), (52, 98)], PAL['stone'], s=0.6, grad=(-0.01, -0.004), bevel=0.15)
    c.poly([(55, 98), (57, 20), (70, 34), (70, 98)], PAL['stone'], s=0.42, grad=(-0.01, -0.004), bevel=0.15)
    # fenda luminosa
    for y in range(20, 98, 2):
        x = 53 + math.sin(y * 0.3) * 1.2
        c.pix(x, y, PAL['lava'][3] if y % 6 else PAL['lava'][4])
    from fx import RUNES
    for i, y in enumerate((44, 60, 76)):
        for (x0, y0, x1, y1) in RUNES[(i * 2 + 1) % 8]:
            c.line(42 + x0, y + y0, 42 + x1, y + y1, PAL['amber'][2], 1)
            c.line(63 + x0 * 0.8, y + 4 + y0 * 0.8, 63 + x1 * 0.8, y + 4 + y1 * 0.8, PAL['amber'][1], 1)
    for (x, y) in ((20, 100), (82, 100), (30, 112), (74, 112)):
        c.ellipse(x, y, 4, 2.2, PAL['coral'], bias=0.1)
    c.outline()
    return c


def pillar_broken(dark=False):
    c = Canvas(34, 64)
    p = PAL['obsidian'] if dark else PAL['stone']
    c.poly([(5, 60), (29, 60), (29, 55), (5, 55)], p, s=0.4, bevel=0.15)
    c.poly([(8, 56), (26, 56), (26, 22), (20, 16), (15, 24), (8, 18)], p, s=0.55, grad=(-0.025, 0), bevel=0.15)
    for x in (12, 17, 22):
        c.line(x, 24, x, 54, p[1], 1)
    c.poly([(26, 60), (33, 61), (31, 56)], p, s=0.5)
    c.outline()
    return c


def pillar():
    c = Canvas(34, 92)
    p = PAL['obsidian']
    c.poly([(4, 88), (30, 88), (30, 82), (4, 82)], p, s=0.4, bevel=0.15)
    c.poly([(7, 83), (27, 83), (27, 16), (7, 16)], p, s=0.55, grad=(-0.03, 0), bevel=0.12)
    for x in (11, 16, 21):
        c.line(x, 18, x, 81, p[1], 1)
    c.poly([(3, 16), (31, 16), (29, 8), (5, 8)], p, s=0.65, bevel=0.15)
    c.line(5, 12, 29, 12, PAL['copper'][3], 1)
    c.pix(17, 12, PAL['copper'][4])
    c.capsule(9, 40, 6, 70, 1.6, 1.0, PAL['coral'], bias=0.1)
    c.outline()
    return c


def fossil_flower():
    c = Canvas(26, 20)
    for i in range(6):
        a = i / 6 * math.tau
        c.ellipse(13 + math.cos(a) * 5, 10 + math.sin(a) * 3.5, 3.4, 2.2, PAL['bone'], rot=a, bias=0.05)
    c.ellipse(13, 10, 2.4, 1.8, PAL['amber'], bias=0.3)
    c.outline(mix=0.3)
    return c


def shrub_dead():
    c = Canvas(34, 30)
    for (x1, y1) in ((6, 8), (14, 4), (22, 6), (30, 12), (4, 18), (28, 20)):
        c.line(17, 27, x1, y1, PAL['wood'][2], 1.4)
        c.line((17 + x1) / 2, (27 + y1) / 2, (17 + x1) / 2 + 3, (27 + y1) / 2 - 4, PAL['wood'][1], 1)
    c.ellipse(17, 27, 5, 2, PAL['stone'], bias=-0.1)
    c.outline(mix=0.3)
    return c


def crystal_tall(v=0):
    c = Canvas(52, 84)
    shards = [(26, 80, 20, 8, 8), (14, 80, 10, 36, 6), (38, 80, 44, 32, 6), (22, 80, 30, 24, 5)]
    if v:
        shards = [(26, 80, 28, 4, 9), (16, 80, 8, 30, 6), (36, 80, 42, 44, 5)]
    for (bx, by, tx, ty, w) in shards:
        c.poly([(bx - w, by), (tx - w * 0.3, ty + 6), (tx, ty), (tx + w * 0.4, ty + 5), (bx + w, by)], PAL['cyan'], s=0.55, grad=(-0.02, -0.01), bevel=0.25)
        c.line(bx, by - 2, tx, ty + 2, PAL['cyan'][4], 1, alpha=0.7)
    c.ellipse(26, 80, 16, 4, PAL['stone'], bias=-0.1)
    c.outline()
    return c


def crystal_small():
    c = Canvas(28, 28)
    for (bx, tx, ty, w) in ((14, 12, 4, 5), (8, 4, 12, 3.5), (20, 24, 10, 3.5)):
        c.poly([(bx - w, 24), (tx, ty), (bx + w, 24)], PAL['cyan'], s=0.6, bevel=0.25)
    c.ellipse(14, 24, 9, 2.5, PAL['stone'], bias=-0.1)
    c.outline()
    return c


def glass_tree(v=0):
    c = Canvas(76, 104)
    c.capsule(38, 98, 37, 52, 6, 4, PAL['bone'], bias=0.0)
    br = [(37, 64, 16, 42), (37, 58, 60, 40), (37, 54, 28, 24), (37, 52, 50, 22)]
    for (x0, y0, x1, y1) in br:
        c.capsule(x0, y0, x1, y1, 3.4, 1.4, PAL['bone'], bias=0.05)
    # folhagem de vidro translúcido
    for (x, y, r) in ((16, 38, 11), (60, 36, 11), (28, 22, 12), (50, 20, 12), (38, 30, 13)):
        c.ellipse(x, y + v * 2, r, r * 0.8, PAL['glass'], bias=0.1, alpha=0.82)
        c.ellipse(x - r * 0.3, y - r * 0.3 + v * 2, r * 0.3, r * 0.2, PAL['white'], alpha=0.55, flat=0.9)
    c.ellipse(38, 98, 14, 3.5, PAL['stone'], bias=-0.1)
    c.outline(mix=0.3)
    return c


def glass_mushroom():
    c = Canvas(26, 28)
    c.capsule(13, 24, 13, 13, 2, 1.6, PAL['bone'], bias=-0.05)
    c.ellipse(13, 12, 9, 6, PAL['glass'], alpha=0.85, bias=0.1)
    c.ellipse(13, 13, 4, 2.4, PAL['cyan'], bias=0.5)
    c.pix(9, 9, W)
    c.outline(mix=0.3)
    return c


def crystal_shards():
    c = Canvas(34, 16)
    for (x, y, a) in ((6, 10, 0.4), (14, 12, -0.6), (22, 9, 0.2), (28, 12, -0.3)):
        c.poly([(x - 3, y + 2), (x + math.cos(a) * 2, y - 5), (x + 3, y + 2)], PAL['cyan'], s=0.65, bevel=0.2)
    c.outline(mix=0.3)
    return c


def copper_sigil():
    c = Canvas(48, 30)
    c.ellipse(24, 15, 22, 13, PAL['copper'], bias=-0.25, alpha=0.75)
    c.ellipse(24, 15, 18, 10, PAL['obsidian'], flat=0.4, alpha=0.85)
    from fx import RUNES
    for (x0, y0, x1, y1) in RUNES[5]:
        c.line(24 + x0 * 1.4, 15 + y0, 24 + x1 * 1.4, 15 + y1, PAL['copper'][4], 1)
    c.arc(24, 15, 15, 0, math.tau, PAL['copper'][3], 1)
    return c


def urn():
    c = Canvas(24, 30)
    c.ellipse(12, 18, 8, 9, PAL['copper'], bias=0.05)
    c.poly([(8, 9), (16, 9), (15, 5), (9, 5)], PAL['copper'], s=0.6)
    c.line(5, 17, 19, 17, PAL['copper'][1], 1)
    c.capsule(10, 22, 7, 27, 1, 0.8, PAL['coral'], bias=0.1)
    c.outline()
    return c


def brazier():
    c = Canvas(26, 40)
    c.poly([(9, 36), (17, 36), (15, 22), (11, 22)], PAL['copper'], s=0.5, bevel=0.15)
    c.ellipse(13, 20, 10, 4, PAL['copper'], bias=0.0)
    c.ellipse(13, 19, 7, 2.4, PAL['lava'], bias=0.3)
    c.ellipse(13, 37, 7, 2.4, PAL['stone'], bias=-0.1)
    c.outline()
    return c


def debris():
    c = Canvas(36, 20)
    for (x, y, w, h) in ((6, 12, 6, 4), (16, 14, 8, 4), (26, 10, 5, 4), (12, 6, 4, 3)):
        c.poly([(x - w / 2, y + h / 2), (x - w / 3, y - h / 2), (x + w / 2, y - h / 3), (x + w / 2, y + h / 2)], PAL['obsidian'], s=0.55, bevel=0.2)
    c.pix(20, 13, PAL['copper'][3])
    c.outline(mix=0.3)
    return c


def coral_vine():
    c = Canvas(40, 24)
    pts = [(2, 18), (10, 14), (18, 17), (26, 11), (34, 14), (38, 8)]
    for i in range(len(pts) - 1):
        c.capsule(*pts[i], *pts[i + 1], 1.8, 1.4, PAL['coral'], bias=0.0)
    for (x, y) in pts[1:]:
        c.ellipse(x, y - 2, 2, 1.6, PAL['carmine'], bias=0.2)
    c.outline(mix=0.3)
    return c


def coral_formation():
    c = Canvas(48, 52)
    for (x0, y0, x1, y1, r) in ((24, 48, 12, 18, 4.5), (24, 48, 26, 8, 5), (24, 48, 38, 20, 4.5), (18, 36, 6, 28, 2.6), (30, 32, 42, 30, 2.4)):
        c.capsule(x0, y0, x1, y1, r, r * 0.5, PAL['carmine'], bias=0.05)
        c.ellipse(x1, y1, r * 0.8, r * 0.7, PAL['coral'], bias=0.25)
    c.ellipse(24, 48, 12, 3, PAL['stone'], bias=-0.1)
    c.outline()
    return c


def altar():
    c = Canvas(88, 64)
    c.poly([(4, 58), (84, 58), (78, 44), (10, 44)], PAL['obsidian'], s=0.45, bevel=0.15)
    c.poly([(14, 46), (74, 46), (70, 26), (18, 26)], PAL['obsidian'], s=0.58, grad=(-0.008, -0.01), bevel=0.18)
    c.line(16, 36, 72, 36, PAL['copper'][3], 1)
    from fx import RUNES
    for i, x in enumerate((26, 44, 62)):
        for (x0, y0, x1, y1) in RUNES[(i + 3) % 8]:
            c.line(x + x0, 31 + y0 * 0.6, x + x1, 31 + y1 * 0.6, PAL['copper'][4], 1)
    c.poly([(30, 26), (58, 26), (54, 20), (34, 20)], PAL['copper'], s=0.55, bevel=0.2)
    c.outline()
    return c


def rift():
    """Fenda pulsante ao fundo do Santuário (cenário de fundo)."""
    c = Canvas(260, 140)
    c.ellipse(130, 70, 125, 60, PAL['obsidian'], flat=0.15, alpha=0.9)
    c.ellipse(130, 70, 100, 44, PAL['violet'], bias=-0.35, alpha=0.75)
    for k in range(5):
        c.ellipse(130, 70, 80 - k * 15, 30 - k * 5, PAL['violet'], bias=-0.1 + k * 0.15, alpha=0.6)
    c.glow(130, 70, 70, PAL['violet'][4], 0.6)
    c.ellipse(130, 70, 10, 4, PAL['white'], bias=0.3)
    rng = np.random.default_rng(3)
    for _ in range(30):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(60, 120)
        x, y = 130 + math.cos(a) * r, 70 + math.sin(a) * r * 0.48
        c.poly([(x - 3, y + 2), (x, y - 6), (x + 3, y + 2)], PAL['violet'], s=0.65, bevel=0.2)
    return c


def anchor_stone(lit=False):
    """Âncora do Véu: menir com aro de cobre e cristal — apagada ou acesa."""
    c = Canvas(56, 92)
    c.poly([(8, 88), (48, 88), (44, 78), (12, 78)], PAL['obsidian'], s=0.45, bevel=0.15)
    c.poly([(16, 80), (40, 80), (38, 22), (28, 8), (18, 22)], PAL['obsidian'], s=0.55, grad=(-0.02, -0.005), bevel=0.15)
    c.arc(28, 46, 13, 0, math.tau, PAL['copper'][3], 2)
    cp = PAL['amber'] if lit else PAL['stone']
    c.poly([(28, 34), (34, 46), (28, 58), (22, 46)], cp, s=0.7 if lit else 0.45, bevel=0.25)
    from fx import RUNES
    for i, y in enumerate((66, 26)):
        for (x0, y0, x1, y1) in RUNES[(i * 5) % 8]:
            c.line(28 + x0 * 0.8, y + y0 * 0.8, 28 + x1 * 0.8, y + y1 * 0.8, (PAL['amber'][3] if lit else PAL['obsidian'][4]), 1)
    if lit:
        c.glow(28, 46, 20, PAL['amber'][4], 0.6)
    c.outline()
    return c


def build(atlas):
    A = atlas.add
    A('tree_petrified_0', tree_petrified(0).image())
    A('tree_petrified_1', tree_petrified(1).image())
    A('coral_red_0', coral_red(0).image())
    A('coral_red_1', coral_red(1).image())
    A('fungus_glow_0', fungus_glow(0).image())
    A('fungus_glow_1', fungus_glow(1).image())
    A('boulder_0', boulder(0).image())
    A('boulder_1', boulder(1).image())
    A('stele_0', stele().image())
    A('lantern_0', lantern().image())
    A('lantern_crystal_0', lantern(True).image())
    A('roots_0', roots().image())
    A('bones_0', bones().image())
    A('monument_0', monument().image())
    A('pillar_broken_0', pillar_broken().image())
    A('pillar_ruined_0', pillar_broken(True).image())
    A('pillar_0', pillar().image())
    A('fossil_flower_0', fossil_flower().image())
    A('shrub_dead_0', shrub_dead().image())
    A('crystal_tall_0', crystal_tall(0).image())
    A('crystal_tall_1', crystal_tall(1).image())
    A('crystal_small_0', crystal_small().image())
    A('glass_tree_0', glass_tree(0).image())
    A('glass_tree_1', glass_tree(1).image())
    A('glass_mushroom_0', glass_mushroom().image())
    A('crystal_shards_0', crystal_shards().image())
    A('copper_sigil_0', copper_sigil().image())
    A('urn_0', urn().image())
    A('brazier_0', brazier().image())
    A('debris_0', debris().image())
    A('coral_vine_0', coral_vine().image())
    A('coral_formation_0', coral_formation().image())
    A('altar_0', altar().image())
    A('rift_0', rift().image())
    A('anchor_off', anchor_stone(False).image())
    A('anchor_on', anchor_stone(True).image())
