"""Gera os atlas do jogo a partir dos pacotes gratuitos da SOV Digital (itch.io).

Os pacotes NÃO vão para o Git (a licença proíbe redistribuir os arquivos). Baixe-os em
https://sovdigital.itch.io (Free Knight, Free Wolf, Free Blade Assassin Boss + Status Sheets,
Free Magic Effects), coloque os .zip em assets-src/sov/ e rode:  npm run assets:sov

Saída (também fora do Git): public/assets/sov/*.png|json + manifest.json.
Cada personagem: 5 direções desenhadas (S, SE, E, NE, N); o jogo espelha para SW, W, NW.
"""
import io, json, os, sys, zipfile, glob, math
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets-src', 'sov')
OUT = os.path.join(ROOT, 'public', 'assets', 'sov')
DIRS = ['S', 'SE', 'E', 'NE', 'N']
SCALE = 2  # meta.scale do Pixi: textura física = 2× o tamanho lógico

ZIPS = {}


def zfind(prefix):
    for z in glob.glob(os.path.join(SRC, '*.zip')):
        if z not in ZIPS:
            ZIPS[z] = zipfile.ZipFile(z)
        if any(n.startswith(prefix) for n in ZIPS[z].namelist()):
            return ZIPS[z]
    raise SystemExit(f'pacote ausente para {prefix} — veja o cabeçalho deste script')


def load_char(base):
    """base: caminho dentro do zip até a pasta do personagem (com <nome>.json e sheets/)."""
    z = zfind(base)
    name = base.rstrip('/').split('/')[-1]
    meta = json.loads(z.read(f'{base}/{name}.json'))
    return z, base, meta


def frames_of(char, anim, step=1, maxn=None, sel=None):
    """lista [dir][frame] de imagens RGBA em tamanho original"""
    z, base, meta = char
    a = meta['animations'][anim]
    fw, fh = meta['frame_size']
    sheet = Image.open(io.BytesIO(z.read(f"{base}/{a['sheet']}"))).convert('RGBA')
    n = a['frames_per_direction']
    idx = list(range(0, n, step)) if sel is None else [i for i in sel if i < n]
    if maxn:
        idx = idx[:maxn]
    out = []
    for r, d in enumerate(['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']):
        if d not in DIRS:
            continue
        out.append([sheet.crop((i * fw, r * fh, (i + 1) * fw, (r + 1) * fh)) for i in idx])
    return out, a.get('fps', 12) * (len(idx) / max(1, n))


def white(im):
    a = im.getchannel('A')
    w = Image.new('RGBA', im.size, (255, 255, 255, 0))
    w.putalpha(a)
    return w


class Atlas:
    def __init__(self, name, max_w=4096):
        self.name, self.max_w, self.items = name, max_w, []

    def add(self, key, im):
        self.items.append((key, im))

    def save(self):
        pad = 2
        items = sorted(self.items, key=lambda t: (-t[1].height, -t[1].width))
        x = y = rowh = W = 0
        pos = {}
        for k, im in items:
            if x + im.width + pad * 2 > self.max_w:
                x, y, rowh = 0, y + rowh, 0
            pos[k] = (x + pad, y + pad)
            x += im.width + pad * 2
            rowh = max(rowh, im.height + pad * 2)
            W = max(W, x)
        H = y + rowh
        p2 = lambda v: 1 << max(4, math.ceil(math.log2(v)))
        W, H = p2(W), p2(H)
        sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        frames = {}
        for k, im in self.items:
            px, py = pos[k]
            sheet.paste(im, (px, py))
            frames[k] = {'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                         'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height}}
        anims = {}
        for k in frames:
            base, _, last = k.rpartition('_')
            if last.isdigit():
                anims.setdefault(base, []).append(k)
            elif last == 'f':
                b2, _, n = base.rpartition('_')
                anims.setdefault(b2 + '_f', []).append(k)
        for v in anims.values():
            v.sort(key=lambda s: int(s.rstrip('_f').rpartition('_')[2]))
        os.makedirs(OUT, exist_ok=True)
        # WebP com alfa: ~4x menor que PNG, carregamento rápido no celular
        sheet.save(os.path.join(OUT, self.name + '.webp'), quality=90, method=6)
        json.dump({'frames': frames, 'animations': anims, 'meta': {'app': 'veu-de-brasas/build_sov', 'image': self.name + '.webp', 'format': 'RGBA8888',
                   'size': {'w': W, 'h': H}, 'scale': str(SCALE)}}, open(os.path.join(OUT, self.name + '.json'), 'w'))
        print(f'{self.name}: {W}x{H}, {len(frames)} quadros')


def build_char(atlas, key, char, anims, cell_h, flash=False):
    """anims: {nome_no_jogo: (anim_origem, passo, max, seleção)} → recorta pela união das caixas, reduz e adiciona."""
    _, _, meta = char
    fw, fh = meta['frame_size']
    px, py = meta['pivot']
    loaded = {}
    for g, spec in anims.items():
        src, step, maxn, sel = (list(spec) + [None, None, None])[:4]
        loaded[g] = frames_of(char, src, step or 1, maxn, sel)
    # caixa comum a todos os quadros (mantém o pivô dos pés fixo)
    bx0, by0, bx1, by1 = fw, fh, 0, 0
    for fr, _ in loaded.values():
        for row in fr:
            for im in row:
                b = im.getbbox()
                if b:
                    bx0, by0, bx1, by1 = min(bx0, b[0]), min(by0, b[1]), max(bx1, b[2]), max(by1, b[3])
    k = cell_h * SCALE / fh
    cw, ch = max(1, round((bx1 - bx0) * k)), max(1, round((by1 - by0) * k))
    info = {'anchor': [round((px - bx0) / (bx1 - bx0), 4), round((py - by0) / (by1 - by0), 4)], 'size': [cw / SCALE, ch / SCALE], 'anims': {}}
    for g, (fr, fps) in loaded.items():
        info['anims'][g] = {'frames': len(fr[0]), 'fps': round(fps, 2)}
        for di, row in enumerate(fr):
            for i, im in enumerate(row):
                im = im.crop((bx0, by0, bx1, by1)).resize((cw, ch), Image.LANCZOS)
                atlas.add(f'{key}_{g}_{DIRS[di]}_{i}', im)
                if flash:
                    atlas.add(f'{key}_{g}_{DIRS[di]}_{i}_f', white(im))
    return info


def build_fx(atlas, key, base_dir, clip='effect', step=2, height=96):
    z = zfind(base_dir)
    name = base_dir.rstrip('/').split('/')[-1]
    meta = json.loads(z.read(f'{base_dir}/{name}.json'))
    c = meta['clips'][clip] if 'clips' in meta else meta
    fw, fh = c['frame_size']
    sheet = Image.open(io.BytesIO(z.read(f"{base_dir}/{c['sheet']}"))).convert('RGBA')
    cols = sheet.width // fw
    idx = list(range(0, c['frames'], step))
    k = height * SCALE / fh
    for j, i in enumerate(idx):
        im = sheet.crop(((i % cols) * fw, (i // cols) * fh, (i % cols + 1) * fw, (i // cols + 1) * fh))
        atlas.add(f'{key}_{j}', im.resize((max(1, round(fw * k)), max(1, round(fh * k))), Image.LANCZOS))
    piv = c.get('pivot', [fw / 2, fh / 2])
    return {'anchor': [round(piv[0] / fw, 4), round(piv[1] / fh, 4)], 'frames': len(idx), 'fps': c['fps'] * len(idx) / c['frames'],
            'hit': (c.get('hit_frame') or 0) // step, 'size': [fw * k / SCALE, fh * k / SCALE]}


def main():
    man = {'hero': {}, 'enemies': {}, 'bosses': {}, 'fx': {}}
    knight = load_char('characters/knight')
    wolf = {c: load_char(f'ColourVariations/{c}/wolf') for c in ('brown', 'black', 'arctic', 'red')}
    wolf['grey'] = load_char('characters/wolf')
    kn = {c: load_char(f'ColourVariations/{c}/knight') for c in ('green', 'black', 'red', 'gold')}
    asn = {c: load_char(f'ColourVariations/{c}/blade-assassin') for c in ('violet', 'azure', 'venom')}
    asn_enraged = load_char('characters/blade-assassin-enraged')

    # ---------------- herói
    a = Atlas('hero_knight', 2048)
    man['hero']['knight'] = build_char(a, 'hero_knight', knight, {
        'idle': ('idle', 2), 'walk': ('run', 1), 'shoot': ('attack', 1), 'shoot2': ('attack2', 1), 'dash': ('run', 3), 'hurt': ('hurt', 2), 'death': ('death', 1),
    }, 72)
    a.save()

    # ---------------- inimigos (célula menor: aparecem pequenos na tela)
    e = Atlas('enemies', 4096)
    W = lambda c: wolf[c]
    man['enemies']['rust'] = build_char(e, 'rust', W('brown'), {'walk': ('run', 2), 'death': ('death', 2)}, 34)
    man['enemies']['spider'] = build_char(e, 'spider', W('black'), {'walk': ('run', 2), 'lunge': ('attack2', 3), 'death': ('death', 2)}, 40)
    man['enemies']['wasp'] = build_char(e, 'wasp', W('arctic'), {'fly': ('run', 2), 'dive': ('attack3', 4), 'death': ('death', 2)}, 40)
    man['enemies']['frog'] = build_char(e, 'frog', W('red'), {'idle': ('idle', 3), 'crouch': ('attack', 6, 1, [2]), 'jump': ('attack', 6, 1, [6]), 'land': ('attack', 6, 1, [10]), 'death': ('death', 2)}, 44)
    man['enemies']['slime'] = build_char(e, 'slime', kn['green'], {'walk': ('walk', 2), 'attack': ('attack', 1), 'death': ('death', 1)}, 50)
    man['enemies']['shell'] = build_char(e, 'shell', kn['black'], {'walk': ('walk', 2), 'windup': ('attack2', 3), 'charge': ('run', 6), 'death': ('death', 1)}, 54)
    man['enemies']['ghost'] = build_char(e, 'ghost', asn['violet'], {'float': ('walk', 1), 'cast': ('attack3', 2), 'death': ('death', 1)}, 46)
    man['enemies']['guardian'] = build_char(e, 'guardian', kn['red'], {'walk': ('walk', 2), 'windup': ('attack2', 2), 'death': ('death', 1)}, 78)
    gold = build_char(e, 'guardian', kn['gold'], {'broken': ('walk', 2)}, 78)
    man['enemies']['guardian']['anims'].update(gold['anims'])
    man['enemies']['priestess'] = build_char(e, 'priestess', asn['azure'], {'float': ('walk', 1), 'cast': ('attack4', 1), 'death': ('death', 1)}, 74)
    e.save()

    # ---------------- chefes
    b = Atlas('bosses', 4096)
    man['bosses']['toad'] = build_char(b, 'toad', asn_enraged, {
        'idle': ('idle', 1), 'rage': ('attack2', 2), 'crouch': ('hurt', 3), 'air': ('run', 2), 'land': ('attack4', 3), 'spit': ('attack3', 2), 'death': ('death', 1)}, 110)
    man['bosses']['heart'] = build_char(b, 'heart', asn['venom'], {
        'p0': ('idle', 1), 'p1': ('walk', 2), 'p2': ('run', 2), 'flare0': ('attack', 2), 'flare1': ('attack2', 2), 'flare2': ('attack4', 2), 'death': ('death', 1)}, 110)
    b.save()

    # ---------------- efeitos
    f = Atlas('sovfx', 4096)
    man['fx']['fire_strike'] = build_fx(f, 'fire_strike', 'effects/fire_strike', step=2, height=110)
    man['fx']['frost'] = build_fx(f, 'frost', 'effects/frost_explosion_medium', step=2, height=120)
    man['fx']['level_up'] = build_fx(f, 'level_up', 'effects/level_up', step=2, height=110)
    man['fx']['portal'] = build_fx(f, 'portal', 'effects/portal_arcane_open', step=2, height=120)
    man['fx']['blink'] = build_fx(f, 'blink', 'effects/blink_arrival', step=2, height=120)
    f.save()

    # retrato do herói (seleção, HUD e resultados)
    fr, _ = frames_of(knight, 'idle', 1, 1)
    im = fr[0][0]
    im = im.crop(im.getbbox())
    side = max(im.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, side - im.height))
    sq.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, 'portrait_knight.webp'), quality=92)

    os.makedirs(OUT, exist_ok=True)
    json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    print('manifest ok')


if __name__ == '__main__':
    main()
