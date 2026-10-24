"""Kit de interface: molduras de cartas por raridade, ícones, painéis, botões, barras,
emblema, cursor, fonte bitmap de números e ilustração do menu."""
import math, os
import numpy as np
from PIL import Image
from pixel import Canvas, PAL, hexc, ramp
from fx import RUNES

W = hexc('#ffffff')

RARITY = {
    'common': (PAL['jade'], PAL['obsidian']),
    'rare': (PAL['violet'], PAL['obsidian']),
    'legendary': (PAL['gold'], PAL['obsidian']),
}


def card_frame(rarity):
    """Moldura de carta 100x140 com janela da ilustração, placa de nome e área de texto."""
    w, h = 100, 140
    c = Canvas(w, h)
    rim, body = RARITY[rarity]
    # corpo de obsidiana
    c.poly([(4, 2), (96, 2), (98, 4), (98, 136), (96, 138), (4, 138), (2, 136), (2, 4)], body, s=0.32, grad=(0, -0.0015), bevel=0.1)
    # moldura mineral
    for (x0, y0, x1, y1) in ((3, 3, 97, 3), (3, 137, 97, 137), (3, 3, 3, 137), (97, 3, 97, 137)):
        c.line(x0, y0, x1, y1, rim[2], 3)
    for (x0, y0, x1, y1) in ((3, 2, 97, 2), (2, 3, 2, 137)):
        c.line(x0, y0, x1, y1, rim[4], 1)
    for (x0, y0, x1, y1) in ((3, 138, 97, 138), (98, 3, 98, 137)):
        c.line(x0, y0, x1, y1, rim[0], 1)
    # janela da ilustração
    c.poly([(12, 12), (88, 12), (88, 66), (50, 74), (12, 66)], ramp('#06050a', '#0c0a12', '#14111c', '#1c1828', '#262036'), s=0.4, grad=(0, -0.006))
    for (a, b) in (((12, 12), (88, 12)), ((88, 12), (88, 66)), ((88, 66), (50, 74)), ((50, 74), (12, 66)), ((12, 66), (12, 12))):
        c.line(*a, *b, rim[3], 1.5)
    # cantos ornamentados
    for (x, y) in ((6, 6), (94, 6), (6, 134), (94, 134)):
        c.poly([(x, y - 5), (x + 5, y), (x, y + 5), (x - 5, y)], rim, s=0.7, bevel=0.25)
        c.pix(x, y, W if rarity == 'legendary' else rim[4])
    # placa do nome
    c.poly([(10, 78), (90, 78), (94, 84), (90, 90), (10, 90), (6, 84)], rim, s=0.45, bevel=0.2)
    # filete divisor
    c.line(18, 96, 82, 96, rim[2], 1)
    c.pix(50, 96, rim[4])
    if rarity == 'legendary':
        # raios solares no topo
        for i in range(7):
            a = math.pi + (i + 1) * math.pi / 8
            c.line(50 + math.cos(a) * 8, 3 + math.sin(a) * -1, 50 + math.cos(a) * 16, 3 - math.sin(a) * 7, PAL['gold'][4], 1)
        c.ellipse(50, 3, 6, 4, PAL['gold'], bias=0.3)
    elif rarity == 'rare':
        c.poly([(44, 3), (50, -4), (56, 3), (50, 8)], PAL['violet'], s=0.7, bevel=0.25)
    else:
        c.ellipse(50, 3, 4, 3, PAL['jade'], bias=0.3)
    return c


def panel(rim=None):
    rim = rim or PAL['copper']
    c = Canvas(48, 48)
    c.poly([(3, 1), (45, 1), (47, 3), (47, 45), (45, 47), (3, 47), (1, 45), (1, 3)], PAL['obsidian'], s=0.3, bevel=0.08)
    for (x0, y0, x1, y1) in ((3, 2, 45, 2), (3, 46, 45, 46), (2, 3, 2, 45), (46, 3, 46, 45)):
        c.line(x0, y0, x1, y1, rim[2], 1.6)
    c.line(3, 1, 45, 1, rim[4], 1)
    for (x, y) in ((4, 4), (44, 4), (4, 44), (44, 44)):
        c.poly([(x, y - 3), (x + 3, y), (x, y + 3), (x - 3, y)], rim, s=0.7)
    return c


def button(state):
    c = Canvas(48, 18)
    base = {'normal': 0.4, 'hover': 0.55, 'down': 0.3}[state]
    rim = PAL['copper'] if state != 'hover' else PAL['gold']
    c.poly([(3, 1), (45, 1), (47, 3), (47, 15), (45, 17), (3, 17), (1, 15), (1, 3)], PAL['obsidian'], s=base, grad=(0, -0.02 if state != 'down' else 0.02), bevel=0.12)
    c.line(3, 1.5, 45, 1.5, rim[3], 1)
    c.line(3, 16.5, 45, 16.5, rim[1], 1)
    c.line(1.5, 3, 1.5, 15, rim[2], 1)
    c.line(46.5, 3, 46.5, 15, rim[2], 1)
    for x in (5, 43):
        c.poly([(x, 6), (x + 3, 9), (x, 12), (x - 3, 9)], rim, s=0.7)
    return c


def bar_frame():
    c = Canvas(64, 12)
    c.poly([(2, 1), (62, 1), (63, 3), (63, 9), (62, 11), (2, 11), (1, 9), (1, 3)], PAL['obsidian'], s=0.2)
    c.line(2, 1.5, 62, 1.5, PAL['copper'][3], 1)
    c.line(2, 10.5, 62, 10.5, PAL['copper'][1], 1)
    c.line(1.5, 3, 1.5, 9, PAL['copper'][2], 1)
    c.line(62.5, 3, 62.5, 9, PAL['copper'][2], 1)
    return c


def bar_fill(pal):
    c = Canvas(32, 8)
    p = PAL[pal]
    for y in range(8):
        col = p[4] if y == 1 else p[3] if y < 4 else p[2] if y < 6 else p[1]
        c.line(0, y + 0.5, 32, y + 0.5, col, 1)
    for x in range(0, 32, 8):
        c.pix(x, 2, p[4])
    return c


# ---------------------------------------------------------------- ícones 32x32
def icon_base(pal):
    c = Canvas(32, 32)
    return c


def ic_arrow():
    c = Canvas(32, 32)
    c.line(6, 26, 24, 8, PAL['wood'][3], 2)
    c.poly([(21, 6), (28, 4), (26, 11)], PAL['amber'], s=0.8)
    c.line(5, 22, 9, 26, PAL['amber'][2], 2); c.line(8, 20, 12, 24, PAL['amber'][3], 1.5)
    c.glow(25, 7, 7, PAL['amber'][4], 0.6)
    c.outline(); return c


def ic_crown():
    c = Canvas(32, 32)
    c.arc(16, 17, 10, 0, math.tau, PAL['gold'][3], 3)
    c.arc(16, 17, 10, -2.6, -0.6, PAL['gold'][4], 1)
    for i in range(6):
        a = i / 6 * math.tau
        c.ellipse(16 + math.cos(a) * 10, 17 + math.sin(a) * 10, 1.8, 1.8, PAL['lava'], bias=0.3)
    for (x, h) in ((11, 6), (16, 9), (21, 6)):
        c.poly([(x - 2.5, 9), (x, 9 - h * 0.7), (x + 2.5, 9)], PAL['lava'], s=0.7)
    c.outline(); return c


def ic_lance():
    c = Canvas(32, 32)
    for i in range(6):
        c.ellipse(6 + i * 2.2, 26 - i * 2.2, 3 - i * 0.2, 3 - i * 0.2, PAL['lava'], flat=0.4 + i * 0.06)
    c.capsule(10, 22, 24, 8, 2, 1.5, PAL['amber'], bias=0.3)
    c.poly([(22, 6), (29, 3), (26, 10)], PAL['gold'], s=0.85)
    c.outline(); return c


def ic_chain():
    c = Canvas(32, 32)
    pts = [(4, 8), (12, 14), (9, 18), (19, 22), (16, 26), (28, 28)]
    for i in range(len(pts) - 1):
        c.line(*pts[i], *pts[i + 1], hexc('#6aa8ff'), 3.5, alpha=0.6)
    for i in range(len(pts) - 1):
        c.line(*pts[i], *pts[i + 1], hexc('#eef6ff'), 1.4)
    for (x, y) in ((4, 8), (19, 22), (28, 28)):
        c.ellipse(x, y, 2.4, 2.4, PAL['cyan'], bias=0.4)
    c.outline(mix=0.2); return c


def ic_lotus():
    c = Canvas(32, 32)
    for i in range(8):
        a = i / 8 * math.tau
        tip = (16 + math.cos(a) * 12, 16 + math.sin(a) * 12)
        l = (16 + math.cos(a - 0.4) * 5, 16 + math.sin(a - 0.4) * 5)
        r = (16 + math.cos(a + 0.4) * 5, 16 + math.sin(a + 0.4) * 5)
        c.poly([(16, 16), l, tip, r], PAL['glass'], s=0.55 + (i % 2) * 0.2, bevel=0.25)
    c.ellipse(16, 16, 3, 3, PAL['white'], bias=0.3)
    c.outline(); return c


def ic_wind():
    c = Canvas(32, 32)
    for k, col in enumerate((hexc('#efe6d8'), hexc('#a8a296'), hexc('#d8d2c8'))):
        c.arc(8, 16, 9 + k * 5, -1.0, 1.0, col, 2.4 - k * 0.5)
    for (x, y) in ((22, 10), (25, 18), (20, 24)):
        c.pix(x, y, PAL['amber'][3])
    c.outline(mix=0.2); return c


def ic_heart():
    c = Canvas(32, 32)
    c.ellipse(11.5, 13, 6, 5.5, PAL['carmine'], bias=0.1)
    c.ellipse(20.5, 13, 6, 5.5, PAL['carmine'], bias=0.1)
    c.poly([(6, 15), (26, 15), (16, 27)], PAL['carmine'], s=0.45)
    c.ellipse(16, 16, 3, 3, PAL['lava'], bias=0.4)
    c.pix(10, 11, W)
    c.outline(); return c


def ic_boot():
    c = Canvas(32, 32)
    c.poly([(10, 4), (18, 4), (18, 20), (26, 22), (27, 27), (8, 27), (10, 18)], PAL['leather'], s=0.55, bevel=0.2)
    c.line(10, 14, 18, 14, PAL['bronze'][3], 2)
    for k in range(3):
        c.line(2 + k * 2, 8 + k * 6, 7 + k * 2, 8 + k * 6, hexc('#d8d2c8'), 1)
    c.outline(); return c


def ic_hourglass():
    c = Canvas(32, 32)
    c.line(8, 5, 24, 5, PAL['bronze'][3], 2); c.line(8, 27, 24, 27, PAL['bronze'][3], 2)
    c.poly([(10, 6), (22, 6), (16, 16)], PAL['glass'], s=0.6, alpha=0.8)
    c.poly([(16, 16), (22, 26), (10, 26)], PAL['glass'], s=0.6, alpha=0.8)
    c.poly([(13, 22), (19, 22), (21, 26), (11, 26)], PAL['amber'], s=0.7)
    c.line(16, 14, 16, 22, PAL['amber'][4], 1)
    c.outline(); return c


def ic_area():
    c = Canvas(32, 32)
    for r, a in ((12, 0.5), (8, 0.75), (4, 1.0)):
        c.arc(16, 16, r, 0, math.tau, PAL['amber'][3], 1.6, alpha=a)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        c.line(16 + math.cos(a) * 6, 16 + math.sin(a) * 6, 16 + math.cos(a) * 14, 16 + math.sin(a) * 14, PAL['gold'][4], 1)
    c.outline(mix=0.2); return c


def ic_fang():
    c = Canvas(32, 32)
    c.poly([(8, 6), (14, 6), (11, 24)], PAL['bone'], s=0.7, bevel=0.2)
    c.poly([(18, 6), (24, 6), (21, 24)], PAL['bone'], s=0.6, bevel=0.2)
    c.ellipse(11, 26, 2, 2.6, PAL['carmine'], bias=0.3)
    c.ellipse(21, 27, 1.6, 2.2, PAL['carmine'], bias=0.3)
    c.outline(); return c


def ic_shield():
    c = Canvas(32, 32)
    c.poly([(6, 6), (26, 6), (25, 17), (16, 28), (7, 17)], PAL['bronze'], s=0.55, grad=(-0.02, -0.02), bevel=0.2)
    c.poly([(11, 10), (21, 10), (20, 17), (16, 23), (12, 17)], PAL['wine'], s=0.5)
    c.pix(16, 15, PAL['amber'][4])
    c.outline(); return c


def ic_magnet():
    c = Canvas(32, 32)
    c.arc(16, 14, 8, math.pi, math.tau, PAL['copper'][3], 4)
    c.line(8, 14, 8, 22, PAL['copper'][3], 4); c.line(24, 14, 24, 22, PAL['copper'][3], 4)
    c.line(8, 21, 8, 25, PAL['white'][3], 4); c.line(24, 21, 24, 25, PAL['white'][3], 4)
    for (x, y) in ((16, 26), (13, 29), (19, 29)):
        c.poly([(x, y - 2), (x + 1.5, y), (x, y + 2), (x - 1.5, y)], PAL['jade'], s=0.8)
    c.outline(); return c


def ic_pierce():
    c = Canvas(32, 32)
    c.line(3, 16, 29, 16, PAL['wood'][3], 2)
    c.poly([(26, 12), (31, 16), (26, 20)], PAL['amber'], s=0.8)
    for x in (11, 19):
        c.ellipse(x, 16, 3, 5, PAL['carmine'], bias=0.0, alpha=0.8)
    c.line(3, 16, 29, 16, PAL['amber'][4], 1)
    c.outline(); return c


def ic_multi():
    c = Canvas(32, 32)
    for k, a in enumerate((-0.45, 0, 0.45)):
        ex, ey = 16 + math.sin(a) * 13, 28 - math.cos(a) * 22
        c.line(16, 28, ex, ey, PAL['wood'][3], 1.6)
        c.poly([(ex - 2.5, ey + 2), (ex, ey - 3), (ex + 2.5, ey + 2)], PAL['amber'], s=0.8)
    c.outline(); return c


def ic_combo(a, b):
    c = Canvas(32, 32)
    left = a()
    right = b()
    c.paste(left, -6, -2, 1.0)
    c.paste(right, 6, 4, 1.0)
    c.glow(16, 16, 12, PAL['gold'][4], 0.5)
    return c


def ic_phoenix():
    c = Canvas(32, 32)
    c.poly([(16, 4), (20, 14), (30, 10), (22, 20), (26, 28), (16, 22), (6, 28), (10, 20), (2, 10), (12, 14)], PAL['lava'], s=0.6, bevel=0.25)
    c.ellipse(16, 16, 3, 4, PAL['gold'], bias=0.4)
    c.outline(); return c


def ic_eternal_storm():
    c = Canvas(32, 32)
    c.arc(16, 16, 11, 0, math.tau, hexc('#6aa8ff'), 2.5, alpha=0.6)
    c.paste(ic_chain(), 0, 0)
    return c


def ic_heal_aura():
    c = Canvas(32, 32)
    c.arc(16, 16, 11, 0, math.tau, PAL['jade'][3], 2)
    c.line(16, 9, 16, 23, PAL['jade'][4], 4)
    c.line(9, 16, 23, 16, PAL['jade'][4], 4)
    c.outline(); return c


def ic_dash():
    c = Canvas(32, 32)
    for k in range(3):
        c.poly([(6 + k * 7, 8), (14 + k * 7, 16), (6 + k * 7, 24), (9 + k * 7, 16)], PAL['amber'] if k == 2 else PAL['bronze'], s=0.5 + k * 0.15)
    c.outline(); return c


def ic_pulse():
    c = Canvas(32, 32)
    c.arc(16, 16, 12, 0, math.tau, PAL['lava'][3], 2)
    c.arc(16, 16, 7, 0, math.tau, PAL['gold'][3], 2)
    c.ellipse(16, 16, 3, 3, PAL['gold'], bias=0.5)
    c.outline(); return c


ICONS = {
    'w_arrow': ic_arrow, 'w_crown': ic_crown, 'w_lance': ic_lance, 'w_chain': ic_chain, 'w_lotus': ic_lotus, 'w_wind': ic_wind,
    'p_vigor': ic_heart, 'p_speed': ic_boot, 'p_cooldown': ic_hourglass, 'p_area': ic_area, 'p_lifesteal': ic_fang,
    'p_armor': ic_shield, 'p_magnet': ic_magnet, 'p_pierce': ic_pierce, 'p_multi': ic_multi,
    'l_phoenix': ic_phoenix, 'l_storm': ic_eternal_storm, 'p_regen': ic_heal_aura, 'a_dash': ic_dash, 'a_pulse': ic_pulse,
}


def emblem():
    """Emblema do título: Coroa de Brasas atravessada por uma flecha."""
    c = Canvas(96, 96)
    c.glow(48, 50, 44, PAL['lava'][3], 0.5)
    c.arc(48, 50, 30, 0, math.tau, PAL['gold'][2], 5)
    c.arc(48, 50, 30, -2.7, -0.4, PAL['gold'][4], 1.5)
    c.arc(48, 50, 30, 0.4, 2.7, PAL['bronze'][1], 1.5)
    for i in range(8):
        a = i / 8 * math.tau
        x, y = 48 + math.cos(a) * 30, 50 + math.sin(a) * 30
        c.ellipse(x, y, 3.2, 3.2, PAL['lava'], bias=0.3)
    for (x, h) in ((34, 14), (48, 22), (62, 14), (41, 10), (55, 10)):
        c.poly([(x - 4, 22), (x - 1, 22 - h * 0.6), (x, 22 - h), (x + 2, 22 - h * 0.55), (x + 4, 22)], PAL['lava'], s=0.65)
    c.line(14, 84, 82, 16, PAL['wood'][3], 2.4)
    c.poly([(78, 12), (90, 6), (84, 20)], PAL['gold'], s=0.85, bevel=0.2)
    c.line(14, 84, 82, 16, PAL['amber'][4], 1, alpha=0.6)
    for d in (0, 4):
        c.line(10 + d, 80 + d, 18 + d, 76 + d, PAL['amber'][2], 2)
    from fx import RUNES
    for (x0, y0, x1, y1) in RUNES[7]:
        c.line(48 + x0 * 1.4, 50 + y0 * 1.4, 48 + x1 * 1.4, 50 + y1 * 1.4, PAL['amber'][4], 1.5)
    c.outline(mix=0.2)
    return c


def cursor():
    c = Canvas(16, 16)
    for a in range(4):
        ang = a * math.pi / 2
        c.line(8 + math.cos(ang) * 3, 8 + math.sin(ang) * 3, 8 + math.cos(ang) * 7, 8 + math.sin(ang) * 7, PAL['amber'][3], 1.4)
    c.pix(8, 8, W)
    c.outline(mix=0.2)
    return c


# ---------------------------------------------------------------- fonte bitmap (números de dano)
GLYPHS = {
    '0': ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
    '1': ['00110', '01110', '00110', '00110', '00110', '00110', '01111'],
    '2': ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
    '3': ['11110', '00011', '00011', '01110', '00011', '00011', '11110'],
    '4': ['00110', '01110', '11010', '11010', '11111', '00010', '00010'],
    '5': ['11111', '11000', '11110', '00011', '00011', '11011', '01110'],
    '6': ['01110', '11000', '11110', '11011', '11011', '11011', '01110'],
    '7': ['11111', '00011', '00110', '00110', '01100', '01100', '01100'],
    '8': ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
    '9': ['01110', '11011', '11011', '01111', '00011', '00011', '01110'],
    '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    'x': ['00000', '00000', '11011', '01110', '00100', '01110', '11011'],
    ' ': ['00000'] * 7,
}


def bitmap_font(out_dir, name='dmg'):
    gw, gh, sc = 5, 7, 2
    cw, ch = gw * sc + 4, gh * sc + 4
    chars = list(GLYPHS.keys())
    cols = 8
    rows = (len(chars) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cw, rows * ch), (0, 0, 0, 0))
    a = np.zeros((rows * ch, cols * cw, 4), np.uint8)
    lines = []
    for i, chr_ in enumerate(chars):
        gx, gy = (i % cols) * cw, (i // cols) * ch
        g = GLYPHS[chr_]
        mask = np.zeros((ch, cw), bool)
        for y, row in enumerate(g):
            for x, v in enumerate(row):
                if v == '1':
                    mask[2 + y * sc:2 + (y + 1) * sc, 2 + x * sc:2 + (x + 1) * sc] = True
        ring = np.zeros_like(mask)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ring |= np.roll(np.roll(mask, dy, 0), dx, 1)
        ring &= ~mask
        cell = np.zeros((ch, cw, 4), np.uint8)
        cell[ring] = (20, 10, 16, 255)
        cell[mask] = (255, 255, 255, 255)
        # sombreamento inferior do glifo
        low = mask & ~np.roll(mask, -sc, 0)
        cell[low] = (215, 210, 220, 255)
        a[gy:gy + ch, gx:gx + cw] = cell
        lines.append(f'char id={ord(chr_)} x={gx} y={gy} width={cw} height={ch} xoffset=0 yoffset=0 xadvance={cw - 3} page=0 chnl=15')
    sheet = Image.fromarray(a, 'RGBA')
    sheet.save(os.path.join(out_dir, f'{name}.png'))
    fnt = [f'info face="{name}" size={ch} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=0 padding=0,0,0,0 spacing=0,0',
           f'common lineHeight={ch} base={ch - 2} scaleW={sheet.width} scaleH={sheet.height} pages=1 packed=0',
           f'page id=0 file="{name}.png"', f'chars count={len(chars)}'] + lines
    with open(os.path.join(out_dir, f'{name}.fnt'), 'w') as f:
        f.write('\n'.join(fnt) + '\n')


def build(atlas, out_dir):
    for r in RARITY:
        im = card_frame(r).image()
        im.save(os.path.join(out_dir, f'card_{r}.png'))
    panel().image().save(os.path.join(out_dir, 'panel.png'))
    panel(PAL['gold']).image().save(os.path.join(out_dir, 'panel_gold.png'))
    for s in ('normal', 'hover', 'down'):
        button(s).image().save(os.path.join(out_dir, f'button_{s}.png'))
    bar_frame().image().save(os.path.join(out_dir, 'bar_frame.png'))
    for p, n in (('carmine', 'hp'), ('amber', 'energy'), ('jade', 'xp'), ('cyan', 'boss')):
        bar_fill(p).image().save(os.path.join(out_dir, f'bar_{n}.png'))
    os.makedirs(os.path.join(out_dir, 'icons'), exist_ok=True)
    for k, fn in ICONS.items():
        im = fn().image()
        im.save(os.path.join(out_dir, 'icons', f'{k}.png'))
        atlas.add('icon_' + k, im)
    combos = {'c_tornado': (ic_crown, ic_wind), 'c_thunder': (ic_chain, ic_lotus), 'c_dawn': (ic_lance, ic_crown)}
    for k, (a, b) in combos.items():
        im = ic_combo(a, b).image()
        im.save(os.path.join(out_dir, 'icons', f'{k}.png'))
        atlas.add('icon_' + k, im)
    import fx as _fx
    _fx.ash_coin().image().save(os.path.join(out_dir, 'icons', 'coin.png'))
    emblem().image().save(os.path.join(out_dir, 'emblem.png'))
    cursor().image().save(os.path.join(out_dir, 'cursor.png'))
    bitmap_font(out_dir)


# ================================================================ ícones novos (habilidades, passivos, talentos)
def icon_from(img: Image.Image, glow_col=None, rot=0):
    """ícone 32x32 a partir de um sprite de efeito: centraliza, ajusta e adiciona halo"""
    from pixel import SC
    size = 32 * SC
    im = img.convert('RGBA')
    if rot:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    k = (size * 0.82) / max(im.width, im.height)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    c = Canvas(32, 32)
    if glow_col is not None:
        c.glow(16, 16, 15, glow_col, 0.45)
    base = c.image()
    base.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return base


def ic_eye():
    c = Canvas(32, 32)
    c.ellipse(16, 16, 12, 7, PAL['bone'], bias=0.1)
    c.ellipse(16, 16, 5, 5, PAL['amber'], bias=0.3)
    c.ellipse(16, 16, 2, 4, PAL['dark'], flat=0)
    c.pix(14, 13, W)
    c.outline(); return c


def ic_skull_blade():
    c = Canvas(32, 32)
    c.poly([(6, 26), (22, 6), (26, 10), (10, 28)], PAL['white'], s=0.7, bevel=0.2)
    c.line(9, 23, 13, 27, PAL['gold'][3], 2.5)
    for (x, y) in ((22, 22), (26, 18), (18, 26)):
        c.ellipse(x, y, 1.6, 1.6, PAL['carmine'], bias=0.3)
    c.outline(); return c


def ic_echo():
    c = Canvas(32, 32)
    for r, a in ((12, 0.4), (8, 0.7), (4, 1.0)):
        c.arc(16, 16, r, -2.4, 0.8, PAL['violet'][4], 2, alpha=a)
    c.ellipse(16, 16, 2.4, 2.4, PAL['violet'], bias=0.5)
    c.outline(mix=0.2); return c


def ic_feather():
    c = Canvas(32, 32)
    c.poly([(6, 26), (20, 4), (26, 8), (10, 28)], PAL['ivory'], s=0.7, bevel=0.2)
    c.line(6, 27, 24, 6, PAL['wood'][3], 1)
    for k in range(3):
        c.line(18 + k * 3, 22 - k * 2, 28 + k, 20 - k * 2, hexc('#d8d2c8'), 1)
    c.outline(); return c


def ic_clover():
    c = Canvas(32, 32)
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        c.ellipse(16 + math.cos(ang) * 5, 14 + math.sin(ang) * 5, 5, 5, PAL['jade'], bias=0.15)
    c.line(16, 16, 20, 28, PAL['jade'][1], 1.6)
    c.ellipse(16, 14, 2, 2, PAL['gold'], bias=0.4)
    c.outline(); return c


def ic_book():
    c = Canvas(32, 32)
    c.poly([(5, 8), (16, 10), (16, 27), (5, 25)], PAL['wine'], s=0.55, bevel=0.2)
    c.poly([(27, 8), (16, 10), (16, 27), (27, 25)], PAL['wine'], s=0.42, bevel=0.2)
    c.poly([(7, 9), (15, 11), (15, 25), (7, 23)], PAL['ivory'], s=0.75)
    c.poly([(25, 9), (17, 11), (17, 25), (25, 23)], PAL['ivory'], s=0.65)
    c.line(9, 14, 13, 15, PAL['dark'][2], 0.8)
    c.line(9, 17, 13, 18, PAL['dark'][2], 0.8)
    c.ellipse(21, 17, 2, 2, PAL['jade'], bias=0.5)
    c.outline(); return c


def ic_feather_fire():
    c = ic_phoenix()
    c.glow(16, 16, 14, PAL['amber'][4], 0.4)
    return c


def ic_double_dash():
    c = Canvas(32, 32)
    for k in range(2):
        c.poly([(5 + k * 10, 8), (14 + k * 10, 16), (5 + k * 10, 24), (8 + k * 10, 16)], PAL['cyan'] if k else PAL['amber'], s=0.6 + k * 0.15)
    c.outline(); return c


def ic_fist():
    c = Canvas(32, 32)
    c.ellipse(16, 16, 9, 8, PAL['carmine'], bias=0.1)
    for k in range(4):
        c.ellipse(10 + k * 4, 10, 2.2, 2.6, PAL['carmine'], bias=0.25)
    c.line(9, 22, 23, 22, PAL['gold'][3], 2)
    c.glow(16, 16, 15, PAL['lava'][3], 0.35)
    c.outline(); return c


def ic_split():
    c = Canvas(32, 32)
    for a in (-0.5, 0, 0.5):
        ex, ey = 16 + math.sin(a) * 12, 26 - math.cos(a) * 18
        c.line(16, 26, ex, ey, PAL['violet'][3], 1.6)
        c.ellipse(ex, ey, 2.2, 2.2, PAL['violet'], bias=0.5)
    c.ellipse(16, 26, 3, 3, PAL['gold'], bias=0.4)
    c.outline(mix=0.2); return c


def ic_shield_heart():
    c = ic_shield()
    c.ellipse(16, 15, 3, 3, PAL['jade'], bias=0.5)
    return c


def build_extra(atlas, out_dir):
    import fx
    d = os.path.join(out_dir, 'icons')
    os.makedirs(d, exist_ok=True)
    extra = {
        'w_dagger': icon_from(fx.dagger().image(), PAL['violet'][3], rot=40),
        'w_missile': icon_from(fx.missile(0).image(), PAL['violet'][3], rot=35),
        'w_meteor': icon_from(fx.meteor(0).image(), PAL['lava'][3], rot=-25),
        'w_frost': icon_from(fx.ice_ring(64).image(), PAL['cyan'][3]),
        'w_spikes': icon_from(fx.spike(1).image(), PAL['violet'][2]),
        'w_totem': icon_from(fx.totem(0.2).image(), PAL['cyan'][3]),
        'w_wisp': icon_from(fx.wisp(0.1).image(), PAL['cyan'][3]),
        'w_whip': icon_from(fx.blood_slash(0.9).image(), PAL['carmine'][3]),
        'w_moon': icon_from(fx.moon_blade().image(), hexc('#c0d8ff')),
        'w_void': icon_from(fx.void_orb(0.3).image(), PAL['violet'][3]),
        'w_rain': icon_from(fx.arrow().image(), PAL['amber'][3], rot=-60),
        'w_thorns': icon_from(fx.thorn_ring(64).image(), PAL['jade'][3]),
        'p_crit': ic_eye().image(), 'p_critdmg': ic_skull_blade().image(), 'p_duration': ic_echo().image(),
        'p_projspeed': ic_feather().image(), 'p_luck': ic_clover().image(), 'p_xp': ic_book().image(),
        'p_revive': ic_feather_fire().image(), 'p_dash': ic_double_dash().image(), 'p_might': ic_fist().image(),
        'p_amount': ic_split().image(), 'p_guard': ic_shield_heart().image(),
    }
    for k, im in extra.items():
        im.save(os.path.join(d, f'{k}.png'))
        atlas.add('icon_' + k, im)
