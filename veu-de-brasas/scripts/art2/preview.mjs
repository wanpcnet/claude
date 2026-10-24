// Prévia: folha de contato de sprites sobre fundo de chão (uso interno durante a criação da arte).
import { single, closeBrowser } from './raster.mjs';
export async function contact(file, sprites, cols = 8, bg = '#3a3f4a', zoom = 1) {
  const cw = Math.max(...sprites.map((s) => s.w)), ch = Math.max(...sprites.map((s) => s.h));
  const rows = Math.ceil(sprites.length / cols);
  let svg = `<rect width="100%" height="100%" fill="${bg}"/>`;
  sprites.forEach((s, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    svg += `<svg x="${x}" y="${y}" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}" overflow="visible"><ellipse cx="${s.w / 2}" cy="${s.h * (s.ay ?? 0.9)}" rx="${s.w * 0.22}" ry="${s.w * 0.07}" fill="#000" opacity="0.3"/>${s.svg}</svg>`;
  });
  await single(file, cols * cw, rows * ch, svg, 2 * zoom);
}
if (process.argv[1].endsWith('preview.mjs')) {
  const which = process.argv[2] ?? 'hero';
  const out = process.argv[3];
  if (which === 'hero') {
    const { heroSprites } = await import('./hero.mjs');
    const all = [];
    for (const id of ['lysa', 'orin', 'brann', 'nyx']) {
      const { sprites } = heroSprites(id);
      const pick = (n) => sprites.find((s) => s.name === n);
      for (const n of ['idle_down_0', 'walk_down_2', 'shoot_down_1', 'idle_up_0', 'walk_right_1', 'walk_right_5', 'shoot_right_1', 'dash_right_0', 'hurt_right_0', 'death_7']) all.push(pick(`hero_${id}_${n}`));
    }
    await contact(out, all, 10, '#4a4f5c', 2);
  }
  if (which === 'enemies') {
    const { enemySprites } = await import('./enemies.mjs');
    const { sprites } = enemySprites();
    const want = ['rust_walk_0','rust_walk_3','spider_walk_0','spider_lunge_1','slime_walk_0','slime_attack_1','wasp_fly_0','wasp_dive_0','shell_walk_0','shell_charge_0','frog_idle_0','frog_jump_0','ghost_float_0','ghost_cast_1','guardian_walk_0','guardian_windup_2','guardian_broken_0','priestess_float_0','priestess_cast_2','rust_death_2','guardian_death_1','slime_walk_0_f'];
    const all = want.map((n) => { const s = sprites.find((x) => x.name === n); return { ...s, w: 64, h: 64, svg: `<g transform="translate(${(64 - s.w) / 2} ${64 - s.h - 4})">${s.svg}</g>`, ay: (64 - 4 - s.h + s.h * (s.ay ?? 0.8)) / 64 }; });
    await contact(out, all, 8, '#4a4f5c', 2);
  }
  if (which === 'bosses') {
    const { bossSprites } = await import('./bosses.mjs');
    const { sprites } = bossSprites();
    const want = ['toad_idle_0', 'toad_rage_1', 'toad_air_0', 'toad_spit_1', 'toad_death_2', 'heart_p0_1', 'heart_p1_1', 'heart_p2_1', 'heart_flare2_1', 'heart_death_2'];
    const all = want.map((n) => { const s = sprites.find((x) => x.name === n); return { ...s, w: 180, h: 180, svg: `<g transform="translate(${(180 - s.w) / 2} ${180 - s.h})">${s.svg}</g>`, ay: 0.85 }; });
    await contact(out, all, 5, '#4a4f5c', 1);
  }
  if (which === 'props') {
    const { propSprites } = await import('./props.mjs');
    const { sprites } = propSprites();
    const all = sprites.map((s) => ({ ...s, w: 110, h: 130, svg: `<g transform="translate(${(110 - s.w) / 2} ${126 - s.h})">${s.svg}</g>`, ay: 0 }));
    await contact(out, all, 9, '#3e4a44', 1);
  }
  await closeBrowser();
}
