"""Pequena biblioteca de pintura de pixel art usada pela pipeline offline de Véu de Brasas.

Não gera "arte aleatória": cada sprite é descrito à mão (formas, proporções,
materiais, poses) nos módulos de personagens; esta biblioteca apenas aplica
sombreamento por rampas de paleta, pontilhado ordenado, contornos seletivos e
empacotamento de atlas.
"""
from __future__ import annotations
import json, math, os
import numpy as np
from PIL import Image

BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16.0


def hexc(h: str, a: float = 1.0):
    h = h.lstrip('#')
    return np.array([int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a], np.float32)


def ramp(*hexes):
    return [hexc(h) for h in hexes]


def _norm(v):
    v = np.array(v, np.float32)
    return v / np.linalg.norm(v)


LIGHT = _norm((-0.5, -0.8, 0.9))

# ---------------------------------------------------------------- paletas
PAL = {
    # protagonista
    'skin': ramp('#4a2a26', '#8c5646', '#c98d6c', '#ebbf9a', '#fbe3c8'),
    'hair': ramp('#2d2730', '#5d5560', '#9c939a', '#d3ccc8', '#f4efe6'),
    'wine': ramp('#1e0912', '#3f1222', '#651d31', '#8f2f40', '#b5505a'),
    'ivory': ramp('#3a332e', '#6f665b', '#aa9f8c', '#d8cfb9', '#f5efdc'),
    'bronze': ramp('#24170d', '#4f3519', '#83592a', '#b88a45', '#e6c27a'),
    'leather': ramp('#1a110d', '#38241a', '#5c3b28', '#80573a', '#a37a55'),
    'wood': ramp('#1b100c', '#3b2216', '#5f3a24', '#8a5a36', '#b0814f'),
    'amber': ramp('#6b2a05', '#b8560c', '#f08a1c', '#ffc24a', '#fff1b0'),
    'gold': ramp('#4a2c08', '#8a5c14', '#c99a2a', '#f2cf5a', '#fff3b8'),
    # inimigos
    'carmine': ramp('#1f060a', '#4c0d16', '#861a22', '#c4322e', '#f0745a'),
    'coral': ramp('#2a0b0a', '#5e1a14', '#9c3a26', '#d4683e', '#f5a676'),
    'rust': ramp('#200a06', '#4f1a0c', '#8a3214', '#c25a22', '#eb9550'),
    'teal': ramp('#03161a', '#0a3a40', '#11676a', '#22a09a', '#6be0cf'),
    'cyan': ramp('#041826', '#0b3e58', '#13708c', '#2fb2c6', '#9cf0f0'),
    'frog': ramp('#06141a', '#103a3e', '#1d6560', '#37968a', '#8ccfb4'),
    'pale': ramp('#2a2a33', '#5c5c6a', '#9a98a6', '#cfcbd2', '#f4f1ee'),
    'slime': ramp('#1d2a24', '#3f5c4c', '#6f9a7c', '#a7cfaa', '#e1f5d6'),
    'ghost': ramp('#100c22', '#2a2450', '#4a4688', '#7f86c4', '#cfe0ff'),
    'glass': ramp('#06202c', '#0f4a5c', '#1f8096', '#5cc4d0', '#d8fbff'),
    'violet': ramp('#140a24', '#2e1650', '#51288a', '#8250c4', '#c4a0f4'),
    'bone': ramp('#2c2622', '#5a5048', '#968876', '#cfc2a8', '#f4ead2'),
    'dark': ramp('#07060a', '#141119', '#231d2a', '#352c3c', '#4b4152'),
    'stone': ramp('#0e1014', '#1d2129', '#2e3440', '#454d5c', '#66707f'),
    'mossstone': ramp('#0b1311', '#16241f', '#22372f', '#33503f', '#4f7257'),
    'obsidian': ramp('#06050a', '#110e18', '#1e1828', '#2f2640', '#4a3e62'),
    'copper': ramp('#1e0e08', '#4a2412', '#7d4120', '#b46a36', '#e8a266'),
    'jade': ramp('#04140e', '#0b3424', '#145c3c', '#2a8e5a', '#7ad69a'),
    'lava': ramp('#3a0804', '#8a1c06', '#d84a0a', '#ff9a2a', '#fff0a0'),
    'white': ramp('#6a6a78', '#a0a0b0', '#d0d0dc', '#f0f0f8', '#ffffff'),
}

OUTLINE = hexc('#0c0810')


class Canvas:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.px = np.zeros((h, w, 4), np.float32)
        ys, xs = np.mgrid[0:h, 0:w]
        self.xs = xs.astype(np.float32) + 0.5
        self.ys = ys.astype(np.float32) + 0.5
        self.bayer = np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w]

    # ------------------------------------------------------------ cores
    def _colorize(self, s, rmp, dither=True):
        n = len(rmp)
        f = np.clip(s, 0, 0.9999) * (n - 1)
        base = np.floor(f).astype(np.int32)
        frac = f - base
        if dither:
            base = base + (frac > self.bayer * 0.9 + 0.05).astype(np.int32)
        else:
            base = base + (frac > 0.5).astype(np.int32)
        base = np.clip(base, 0, n - 1)
        table = np.stack(rmp)
        return table[base]

    def _write(self, mask, cols, alpha=1.0, outline=None):
        if outline is not None:
            ring = dilate(mask) & ~mask
            self.px[ring] = outline
        c = cols[mask]
        if alpha >= 1.0:
            self.px[mask] = c
        else:
            dst = self.px[mask]
            a = alpha * c[:, 3:4]
            out = np.empty_like(dst)
            out[:, :3] = c[:, :3] * a + dst[:, :3] * (1 - a)
            out[:, 3:4] = a + dst[:, 3:4] * (1 - a)
            self.px[mask] = out

    # ------------------------------------------------------------ primitivas sombreadas
    def ellipse(self, cx, cy, rx, ry, rmp, rot=0.0, bias=0.0, contrast=1.0, alpha=1.0,
                outline=False, dither=True, light=LIGHT, flat=None, clip=None):
        dx = self.xs - cx
        dy = self.ys - cy
        if rot:
            c, s = math.cos(rot), math.sin(rot)
            dx, dy = dx * c + dy * s, -dx * s + dy * c
        u = dx / max(rx, 0.01)
        v = dy / max(ry, 0.01)
        d2 = u * u + v * v
        mask = d2 <= 1.0
        if clip is not None:
            mask &= clip
        if not mask.any():
            return mask
        if flat is not None:
            s = np.full(d2.shape, flat, np.float32)
        else:
            if rot:
                c, sn = math.cos(rot), math.sin(rot)
                nu, nv = u * c - v * sn, u * sn + v * c
            else:
                nu, nv = u, v
            z = np.sqrt(np.clip(1 - d2, 0, 1))
            lam = nu * light[0] + nv * light[1] + z * light[2]
            s = 0.5 + 0.5 * lam * contrast + bias
        ol = rmp[0] * np.array([0.6, 0.6, 0.6, 1], np.float32) if outline else None
        self._write(mask, self._colorize(s, rmp, dither), alpha, ol)
        return mask

    def capsule(self, x0, y0, x1, y1, r0, r1, rmp, bias=0.0, contrast=1.0, alpha=1.0,
                outline=False, dither=True, light=LIGHT, flat=None):
        px, py = self.xs - x0, self.ys - y0
        vx, vy = x1 - x0, y1 - y0
        L2 = vx * vx + vy * vy
        if L2 < 1e-6:
            return self.ellipse(x0, y0, r0, r0, rmp, bias=bias, alpha=alpha, outline=outline)
        t = np.clip((px * vx + py * vy) / L2, 0, 1)
        qx, qy = px - t * vx, py - t * vy
        r = r0 + (r1 - r0) * t
        d = np.sqrt(qx * qx + qy * qy)
        mask = d <= r
        if not mask.any():
            return mask
        if flat is not None:
            s = np.full(d.shape, flat, np.float32)
        else:
            nx, ny = qx / np.maximum(r, 0.01), qy / np.maximum(r, 0.01)
            z = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
            lam = nx * light[0] + ny * light[1] + z * light[2]
            s = 0.5 + 0.5 * lam * contrast + bias
        ol = rmp[0] * np.array([0.6, 0.6, 0.6, 1], np.float32) if outline else None
        self._write(mask, self._colorize(s, rmp, dither), alpha, ol)
        return mask

    def poly(self, pts, rmp, s=0.55, grad=(0.0, 0.0), bevel=0.0, alpha=1.0, outline=False, dither=True):
        mask = poly_mask(self.w, self.h, pts)
        if not mask.any():
            return mask
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        sv = s + grad[0] * (self.xs - cx) + grad[1] * (self.ys - cy)
        if bevel:
            # realce de borda superior-esquerda / sombra inferior-direita
            up = mask & ~np.roll(mask, 1, 0)
            lf = mask & ~np.roll(mask, 1, 1)
            dn = mask & ~np.roll(mask, -1, 0)
            rt = mask & ~np.roll(mask, -1, 1)
            sv = sv + bevel * (up | lf) - bevel * (dn | rt)
        ol = rmp[0] * np.array([0.6, 0.6, 0.6, 1], np.float32) if outline else None
        self._write(mask, self._colorize(sv, rmp, dither), alpha, ol)
        return mask

    def line(self, x0, y0, x1, y1, col, width=1.0, alpha=1.0):
        px, py = self.xs - x0, self.ys - y0
        vx, vy = x1 - x0, y1 - y0
        L2 = max(vx * vx + vy * vy, 1e-6)
        t = np.clip((px * vx + py * vy) / L2, 0, 1)
        qx, qy = px - t * vx, py - t * vy
        mask = (qx * qx + qy * qy) <= (width * 0.5) ** 2 + 0.08
        cols = np.broadcast_to(col, self.px.shape).copy()
        self._write(mask, cols, alpha)
        return mask

    def arc(self, cx, cy, r, a0, a1, col, width=1.0, alpha=1.0):
        steps = max(4, int(abs(a1 - a0) * r))
        for i in range(steps):
            t0 = a0 + (a1 - a0) * i / steps
            t1 = a0 + (a1 - a0) * (i + 1) / steps
            self.line(cx + math.cos(t0) * r, cy + math.sin(t0) * r, cx + math.cos(t1) * r, cy + math.sin(t1) * r, col, width, alpha)

    def pix(self, x, y, col, alpha=1.0):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            if alpha >= 1:
                self.px[y, x] = col
            else:
                d = self.px[y, x]
                a = alpha * col[3]
                self.px[y, x] = np.array([*(col[:3] * a + d[:3] * (1 - a)), a + d[3] * (1 - a)], np.float32)

    def glow(self, cx, cy, r, col, strength=1.0):
        """brilho suave (apenas para FX/arte de cenário, gravado offline)."""
        d = np.sqrt((self.xs - cx) ** 2 + (self.ys - cy) ** 2) / r
        a = np.clip(1 - d, 0, 1) ** 2 * strength
        m = a > 0.003
        dst = self.px[m]
        aa = a[m][:, None]
        out = dst.copy()
        out[:, :3] = np.clip(dst[:, :3] + col[:3] * aa, 0, 1)
        out[:, 3:4] = np.clip(dst[:, 3:4] + aa * col[3], 0, 1)
        self.px[m] = out

    # ------------------------------------------------------------ pós-processos
    def outline(self, col=OUTLINE, mix=0.55, diagonal=False):
        a = self.px[:, :, 3] > 0.35
        ring = dilate(a, diagonal) & ~a
        neigh = np.zeros_like(self.px)
        cnt = np.zeros(a.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(self.px, dy, 0), dx, 1)
            ma = np.roll(np.roll(a, dy, 0), dx, 1)
            neigh[ma] += sh[ma]
            cnt += ma
        cnt = np.maximum(cnt, 1)
        neigh = neigh / cnt[:, :, None]
        oc = col[None, None, :] * (1 - mix * 0.0)
        res = oc.copy() * np.ones_like(self.px)
        res[:, :, :3] = col[:3] * (1 - mix * 0.35) + neigh[:, :, :3] * 0.18 * mix
        res[:, :, 3] = 1
        self.px[ring] = res[ring]

    def rim(self, amount=0.18, dir=(-1, -1)):
        a = self.px[:, :, 3] > 0.35
        sh = np.roll(np.roll(a, -dir[1], 0), -dir[0], 1)
        edge = a & ~np.roll(np.roll(a, -dir[1] * -1, 0), -dir[0] * -1, 1)
        edge = a & ~np.roll(np.roll(a, 1 if dir[1] < 0 else -1, 0), 1 if dir[0] < 0 else -1, 1)
        self.px[edge, :3] = np.clip(self.px[edge, :3] + amount, 0, 1)
        del sh

    def flip(self):
        c = Canvas(self.w, self.h)
        c.px = self.px[:, ::-1].copy()
        return c

    def image(self) -> Image.Image:
        return Image.fromarray((np.clip(self.px, 0, 1) * 255).astype(np.uint8), 'RGBA')

    def paste(self, other: 'Canvas', ox=0, oy=0, alpha=1.0):
        src = other.px
        h, w = src.shape[:2]
        x0, y0 = max(0, ox), max(0, oy)
        x1, y1 = min(self.w, ox + w), min(self.h, oy + h)
        if x1 <= x0 or y1 <= y0:
            return
        s = src[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        d = self.px[y0:y1, x0:x1]
        a = s[:, :, 3:4] * alpha
        out = d.copy()
        out[:, :, :3] = s[:, :, :3] * a + d[:, :, :3] * (1 - a)
        out[:, :, 3:4] = a + d[:, :, 3:4] * (1 - a)
        self.px[y0:y1, x0:x1] = out


def dilate(m, diagonal=False):
    r = m.copy()
    r[1:] |= m[:-1]
    r[:-1] |= m[1:]
    r[:, 1:] |= m[:, :-1]
    r[:, :-1] |= m[:, 1:]
    if diagonal:
        r[1:, 1:] |= m[:-1, :-1]
        r[:-1, :-1] |= m[1:, 1:]
        r[1:, :-1] |= m[:-1, 1:]
        r[:-1, 1:] |= m[1:, :-1]
    return r


def poly_mask(w, h, pts):
    from PIL import ImageDraw
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return np.array(im) > 127


def flash_version(img: Image.Image) -> Image.Image:
    a = np.array(img).astype(np.float32) / 255
    out = np.zeros_like(a)
    out[:, :, :3] = 1.0
    out[:, :, 0] = 1.0
    out[:, :, 1] = 0.97
    out[:, :, 2] = 0.92
    out[:, :, 3] = a[:, :, 3]
    return Image.fromarray((out * 255).astype(np.uint8), 'RGBA')


def shatter_frames(img: Image.Image, n=5, tint=(1.0, 0.6, 0.4), seed=1):
    """Gera quadros de morte a partir do quadro base: o corpo racha em fragmentos
    que se afastam do centro, clareiam e somem. Determinístico (seed fixa)."""
    rng = np.random.default_rng(seed)
    a = np.array(img).astype(np.float32) / 255
    h, w = a.shape[:2]
    cell = max(3, min(w, h) // 7)
    frames = []
    ys, xs = np.nonzero(a[:, :, 3] > 0.3)
    if len(xs) == 0:
        return [img] * n
    cx, cy = xs.mean(), ys.mean()
    cells = {}
    for y, x in zip(ys, xs):
        cells.setdefault((y // cell, x // cell), []).append((y, x))
    vel = {k: (rng.uniform(-1, 1) * 1.5, rng.uniform(-1, 1) * 1.5 - 1.0) for k in cells}
    for f in range(n):
        t = (f + 1) / n
        out = np.zeros_like(a)
        for k, pts in cells.items():
            gy, gx = k
            ccx = gx * cell + cell / 2 - cx
            ccy = gy * cell + cell / 2 - cy
            d = math.hypot(ccx, ccy) + 1e-3
            push = t * 7
            ox = int(round(ccx / d * push + vel[k][0] * t * 4))
            oy = int(round(ccy / d * push + vel[k][1] * t * 4 + t * t * 6))
            keep = rng.random() > t * 0.55
            if not keep and f > 0:
                continue
            for (y, x) in pts:
                ny, nx = y + oy, x + ox
                if 0 <= ny < h and 0 <= nx < w:
                    c = a[y, x].copy()
                    c[:3] = c[:3] * (1 - t * 0.7) + np.array(tint) * t * 0.7
                    c[3] *= (1 - t * 0.85)
                    out[ny, nx] = c
        frames.append(Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA'))
    return frames


# ---------------------------------------------------------------- atlas
class Atlas:
    def __init__(self, name: str, max_w=2048, pad=2):
        self.name = name
        self.items: list[tuple[str, Image.Image]] = []
        self.anims: dict[str, list[str]] = {}
        self.max_w = max_w
        self.pad = pad

    def add(self, key: str, img: Image.Image):
        self.items.append((key, img))
        return key

    def anim(self, key: str, imgs, flash=False):
        names = []
        for i, im in enumerate(imgs):
            n = f'{key}_{i}'
            self.add(n, im)
            names.append(n)
            if flash:
                self.add(n + '_f', flash_version(im))
        self.anims[key] = names
        if flash:
            self.anims[key + '_f'] = [n + '_f' for n in names]
        return names

    def save(self, out_dir: str, rel_image: str | None = None):
        os.makedirs(out_dir, exist_ok=True)
        items = sorted(self.items, key=lambda kv: (-kv[1].height, -kv[1].width))
        x = y = 0
        shelf_h = 0
        pos = {}
        width_used = 0
        for k, im in items:
            w, h = im.width + self.pad * 2, im.height + self.pad * 2
            if x + w > self.max_w:
                x = 0
                y += shelf_h
                shelf_h = 0
            pos[k] = (x + self.pad, y + self.pad)
            x += w
            width_used = max(width_used, x)
            shelf_h = max(shelf_h, h)
        total_h = y + shelf_h
        W = 1
        while W < width_used:
            W *= 2
        H = 1
        while H < total_h:
            H *= 2
        sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        frames = {}
        for k, im in items:
            px, py = pos[k]
            sheet.paste(im, (px, py))
            frames[k] = {
                'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height},
                'rotated': False, 'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height},
                'sourceSize': {'w': im.width, 'h': im.height},
            }
        img_name = f'{self.name}.png'
        sheet.save(os.path.join(out_dir, img_name), optimize=True)
        data = {'frames': frames, 'animations': self.anims,
                'meta': {'app': 'veu-de-brasas/scripts/art', 'version': '1.0', 'image': img_name,
                         'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}}
        with open(os.path.join(out_dir, f'{self.name}.json'), 'w') as f:
            json.dump(data, f, separators=(',', ':'))
        return W, H


def sheet_preview(imgs, scale=4, cols=8, bg=(28, 30, 38)):
    """Usado apenas para revisão visual durante a produção."""
    w = max(i.width for i in imgs)
    h = max(i.height for i in imgs)
    rows = (len(imgs) + cols - 1) // cols
    out = Image.new('RGBA', (w * min(cols, len(imgs)), h * rows), bg + (255,))
    for i, im in enumerate(imgs):
        out.alpha_composite(im, ((i % cols) * w, (i // cols) * h))
    return out.resize((out.width * scale, out.height * scale), Image.NEAREST)
