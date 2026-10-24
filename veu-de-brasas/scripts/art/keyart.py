"""Ilustração do menu (480x270 lógicos): composição autoral com os próprios sprites do jogo
sobre o solo do Jardim das Cinzas, com luz da Coroa e olhos da horda na escuridão."""
import math
import numpy as np
from PIL import Image
from pixel import Canvas, PAL, hexc, SC
import hero, enemies, props, fx


def build(ground_img: Image.Image, out_path: str):
    Wd, Hd = 480, 270
    # recorte do solo ao redor do monumento central
    cx0, cy0 = ground_img.width // 2, ground_img.height // 2
    g = ground_img.crop((cx0 - 240, cy0 - 135, cx0 + 240, cy0 + 135)).convert('RGBA').resize((480 * SC, 270 * SC), Image.NEAREST)
    base = np.array(g).astype(np.float32) / 255
    # escurece para atmosfera
    base[:, :, :3] *= 0.75
    c = Canvas(Wd, Hd)
    c.px = base
    # monumento ao fundo
    mon = props.monument().image()
    c.paste(Canvas_from(mon), 240 - 52, 6)
    for (x, y, fn) in ((40, 20, lambda: props.tree_petrified(0)), (380, 30, lambda: props.tree_petrified(1)),
                       (120, 90, lambda: props.coral_red(0)), (330, 110, lambda: props.coral_red(1)),
                       (70, 170, lambda: props.fungus_glow(0)), (400, 190, lambda: props.fungus_glow(1)),
                       (170, 40, lambda: props.lantern()), (300, 44, lambda: props.lantern())):
        im = fn().image()
        c.paste(Canvas_from(im), x, y)
    # horda nas bordas: silhuetas e olhos
    rng = np.random.default_rng(42)
    beetle = enemies.rust_beetle(0.2).image()
    spider = enemies.spider(0.4).image()
    frog = enemies.rift_frog('idle').image()
    for i in range(70):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(170, 280)
        x = 240 + math.cos(a) * r * 1.1
        y = 180 + math.sin(a) * r * 0.55
        if not (0 < x < Wd and 20 < y < Hd):
            continue
        if abs(x - 240) < 110 and y < 150:
            continue
        im = [beetle, spider, beetle, frog][i % 4]
        if x > 240:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        c.paste(Canvas_from(im), int(x - im.width / 2 / SC), int(y - im.height / 2 / SC), 0.9)
    # escuridão periférica
    d = np.sqrt(((c.xs - 240) / 240) ** 2 + ((c.ys - 180) / 160) ** 2)
    dark = np.clip((d - 0.35) / 0.8, 0, 1) ** 1.3
    c.px[:, :, :3] *= (1 - dark * 0.85)[:, :, None]
    # brilho da coroa e heroína
    c.glow(240, 186, 90, PAL['lava'][3], 0.55)
    ring = fx.crown_ring(96).image()
    c.paste(Canvas_from(ring), 240 - 48, 186 - 48 + 6, 0.95)
    h = hero.up(0.0, 'idle').image().resize((96 * SC, 96 * SC), Image.NEAREST)
    c.paste(Canvas_from(h), 240 - 48, 186 - 72)
    for i in range(8):
        a = i / 8 * math.tau + 0.3
        f = fx.flame(i / 8).image()
        c.paste(Canvas_from(f), int(240 + math.cos(a) * 44 - 12), int(192 + math.sin(a) * 44 * 0.9 - 26), 0.9)
    for i in range(60):
        x, y = rng.uniform(0, Wd), rng.uniform(0, Hd)
        c.pix(x, y, PAL['amber'][3 + (i % 2)], alpha=rng.uniform(0.3, 0.9))
    # olhos brilhando na escuridão
    for i in range(40):
        a = rng.uniform(0, math.tau)
        x = 240 + math.cos(a) * rng.uniform(200, 280)
        y = 160 + math.sin(a) * rng.uniform(100, 140)
        if 0 <= x < Wd - 3 and 0 <= y < Hd:
            col = PAL['amber'][4] if i % 3 else PAL['cyan'][4]
            c.pix(x, y, col); c.pix(x + 2, y, col)
    c.image().save(out_path)


def Canvas_from(im: Image.Image):
    return Canvas.from_image(im)
