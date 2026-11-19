// Generic "Lighthouse keeper" scene, rendered with different style options.
// Each shape: {d, k} where k = color key in the palette.
function lerp(a, b, t) { return a + (b - a) * t; }
function towerX(y, side) { // tower trapezoid: base y=950 (200..400), top y=520 (235..365)
  const t = (950 - y) / 430;
  return side < 0 ? lerp(200, 235, t) : lerp(400, 365, t);
}
function rnd(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function sceneShapes() {
  const S = [];
  const add = (layer, d, k, extra = {}) => S.push({layer, d, k, ...extra});
  // sky layer
  for (let i = 0; i < 40; i++) add('stars', `M ${rnd(i) * 1080} ${rnd(i + 9) * 800 + 60} m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0`, 'star');
  add('moon', 'M 780 260 a 80 80 0 1 0 160 0 a 80 80 0 1 0 -160 0', 'moon');
  add('moon', 'M 815 230 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0', 'moonShade');
  // beam
  add('beam', 'M 300 450 L 1080 230 L 1080 600 Z', 'beam');
  add('beam', 'M 300 450 L 0 330 L 0 520 Z', 'beam');
  // sea + waves
  add('sea', 'M 0 1080 L 1080 1080 L 1080 1920 L 0 1920 Z', 'sea');
  for (let r = 0; r < 7; r++) {
    const y = 1130 + r * 110, off = (r % 2) * 70;
    let d = `M ${-140 + off} ${y}`;
    for (let x = -140 + off; x < 1180; x += 140) d += ` q 35 -34 70 0 q 35 34 70 0`;
    add('waves', d, 'wave', {line: true});
  }
  add('rocks', 'M 860 1210 q 40 -70 100 -40 q 50 -10 70 40 Z', 'rock');
  add('rocks', 'M 930 1420 q 30 -50 80 -30 q 40 0 50 30 Z', 'rock');
  // cliff
  add('cliff', 'M 0 960 C 200 900 520 905 720 955 C 800 1010 770 1200 820 1400 C 860 1600 800 1800 780 1920 L 0 1920 Z', 'cliff');
  add('cliff', 'M 0 955 C 200 895 520 900 720 950 L 716 975 C 520 925 200 920 0 980 Z', 'grass');
  // lighthouse
  add('tower', `M 200 950 L 235 520 L 365 520 L 400 950 Z`, 'tower');
  [[610, 690], [770, 850]].forEach(([a, b]) => add('tower', `M ${towerX(a, -1)} ${a} L ${towerX(a, 1)} ${a} L ${towerX(b, 1)} ${b} L ${towerX(b, -1)} ${b} Z`, 'stripe'));
  add('tower', 'M 270 950 L 270 880 Q 300 850 330 880 L 330 950 Z', 'door');
  add('tower', 'M 285 720 L 315 720 L 315 760 L 285 760 Z', 'window');
  add('tower', 'M 210 500 L 390 500 L 390 528 L 210 528 Z', 'gallery');
  add('tower', 'M 250 400 L 350 400 L 350 500 L 250 500 Z', 'lampRoom');
  add('lamp', 'M 270 450 a 30 30 0 1 0 60 0 a 30 30 0 1 0 -60 0', 'lamp');
  add('tower', 'M 236 402 L 300 330 L 364 402 Z', 'roof');
  add('tower', 'M 290 330 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0', 'roof');
  // keeper (feet at 560, 940)
  add('keeper', 'M 500 940 L 520 820 Q 560 790 600 820 L 620 940 Z', 'coat');
  add('keeper', 'M 515 945 L 545 945 L 545 960 L 510 960 Z M 575 945 L 605 945 L 610 960 L 575 960 Z', 'boots');
  add('keeper', 'M 600 830 L 660 790 L 668 804 L 610 848 Z', 'coat'); // arm out
  add('keeper', 'M 520 830 L 500 900 L 515 905 L 532 845 Z', 'coat');
  add('keeper', 'M 532 770 a 28 30 0 1 0 56 0 a 28 30 0 1 0 -56 0', 'skin');
  add('keeper', 'M 532 778 Q 560 850 588 778 Q 560 795 532 778 Z', 'beard');
  add('keeper', 'M 515 760 Q 560 700 605 760 Q 560 748 515 760 Z', 'hat');
  add('keeper', 'M 505 762 Q 560 740 615 768 L 610 776 Q 560 756 510 770 Z', 'hat');
  // lantern
  add('lanternGlow', 'M 620 800 a 60 60 0 1 0 120 0 a 60 60 0 1 0 -120 0', 'glow');
  add('lantern', 'M 662 785 L 698 785 L 694 830 L 666 830 Z', 'lanternBody');
  add('lantern', 'M 670 792 L 690 792 L 688 824 L 672 824 Z', 'lamp');
  add('lantern', 'M 664 772 Q 680 755 696 772', 'lanternBody', {line: true});
  // cat
  add('cat', 'M 680 945 Q 680 890 705 880 Q 730 890 730 945 Z', 'cat');
  add('cat', 'M 690 872 a 17 16 0 1 0 34 0 a 17 16 0 1 0 -34 0', 'cat');
  add('cat', 'M 692 866 L 694 846 L 706 860 Z M 722 866 L 720 846 L 708 860 Z', 'cat');
  add('cat', 'M 728 940 Q 760 930 752 900', 'cat', {line: true, w: 8});
  return S;
}

// opts: palette, stroke, sw, filter (per layer), outlineOnly, glow, bg, caption, overlay
function renderScene(opts) {
  const P = opts.palette;
  const sw = opts.sw ?? 0;
  const stroke = opts.stroke ?? 'none';
  const shapes = sceneShapes();
  const layers = ['stars', 'moon', 'beam', 'sea', 'waves', 'rocks', 'cliff', 'tower', 'lamp', 'lanternGlow', 'keeper', 'lantern', 'cat'];
  let body = '';
  for (const L of layers) {
    const items = shapes.filter(s => s.layer === L);
    let g = '';
    for (const s of items) {
      const col = P[s.k] ?? P.default ?? '#000';
      if (col === 'none') continue;
      if (s.line) {
        g += `<path d="${s.d}" fill="none" stroke="${opts.lineColor?.[s.k] ?? col}" stroke-width="${s.w ?? opts.waveW ?? 6}" stroke-linecap="round"/>`;
      } else if (opts.outlineOnly && !['glow', 'beam'].includes(s.k)) {
        g += `<path d="${s.d}" fill="none" stroke="${col}" stroke-width="${opts.olw ?? 4}" stroke-linejoin="round"/>`;
      } else {
        const op = s.k === 'beam' ? (opts.beamOp ?? 0.35) : s.k === 'glow' ? (opts.glowOp ?? 0.5) : 1;
        g += `<path d="${s.d}" fill="${col}" opacity="${op}" stroke="${['beam', 'glow', 'star'].includes(s.k) ? 'none' : stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      }
    }
    const f = opts.layerFilter?.[L] ?? opts.filter;
    body += f ? `<g filter="url(#${f})">${g}</g>` : `<g>${g}</g>`;
  }
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
<defs>${opts.defs ?? ''}</defs>
${opts.bg ?? ''}
<g transform="translate(540 1000) scale(1.22) translate(-560 -1000)">${opts.glow ? `<g filter="url(#${opts.glow})">${body}</g>` : body}</g>
${opts.overlay ?? ''}
${opts.caption ?? ''}
</svg>`;
}
