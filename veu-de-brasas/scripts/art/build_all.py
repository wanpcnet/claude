"""Pipeline offline completa de arte de Véu de Brasas.
Uso: python3 scripts/art/build_all.py  (gera tudo em public/assets/)"""
import os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets')

from pixel import Atlas  # noqa: E402
import hero, enemies, fx, props, ui, ground, keyart  # noqa: E402


def main():
    t0 = time.time()
    a = Atlas('hero')
    hero.build(a)
    print('hero', a.save(os.path.join(OUT, 'characters')))
    a = Atlas('enemies')
    enemies.build(a)
    print('enemies', a.save(os.path.join(OUT, 'enemies')))
    a = Atlas('bosses')
    enemies.build_bosses(a)
    print('bosses', a.save(os.path.join(OUT, 'enemies')))
    a = Atlas('fx')
    fx.build(a)
    print('fx', a.save(os.path.join(OUT, 'effects')))
    a = Atlas('props')
    props.build(a)
    print('props', a.save(os.path.join(OUT, 'environment')))
    a = Atlas('icons', max_w=512)
    os.makedirs(os.path.join(OUT, 'ui'), exist_ok=True)
    ui.build(a, os.path.join(OUT, 'ui'))
    print('icons', a.save(os.path.join(OUT, 'ui')))
    maps = os.path.join(ROOT, 'src', 'content', 'maps')
    gimg = None
    for n in ('arenaA', 'arenaB', 'arenaC'):
        im = ground.bake(os.path.join(maps, n + '.json'), os.path.join(OUT, 'environment', 'ground'), n)
        if n == 'arenaA':
            gimg = im
        print('ground', n)
    keyart.build(gimg, os.path.join(OUT, 'ui', 'keyart.png'))
    print('keyart ok; total %.1fs' % (time.time() - t0))


if __name__ == '__main__':
    main()
