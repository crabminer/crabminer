// Colour-vision check: the eight role colours, as seen with normal vision and with the three common colour
// deficiencies, and how far apart each pair is. A report, not a pass or fail, like the balance runs: the game never
// relies on colour alone (every kind wears a mark on its shell), and this says how much the colours help on their own.
// Usage: node tests/colour.js
'use strict';
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ROLES = ['scout', 'drill', 'crab', 'crush', 'smelt', 'energy', 'repair', 'mech'];   // --c-crab is the hauler
const NAMES = { crab: 'hauler' };

function palette(block) {                  // the --c-<role> values in one token block
  const out = {};
  for (const r of ROLES) { const m = block.match(new RegExp('--c-' + r + ':(#[0-9a-f]{6})')); if (m) out[r] = m[1]; }
  return out;
}
const split = html.search(/prefers-color-scheme:\s*dark/);
const light = palette(html.slice(0, split));
const dark = palette(html.slice(split));

// Machado, Oliveira and Fernandes (2009), full severity, in linear RGB
const SIM = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
};
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const mul = (M, v) => M.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
function lab(rgbLin) {                     // linear sRGB to CIELAB (D65)
  const [r, g, b] = rgbLin.map(x => Math.max(0, Math.min(1, x)));
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Zc = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Zc))];
}
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);   // CIE76: rough, and enough to rank pairs

function report(name, pal) {
  console.log('\n' + name + ' palette');
  const views = { normal: null, ...SIM };
  for (const v in views) {
    const labs = {};
    for (const r of ROLES) { const l = hex(pal[r]).map(lin); labs[r] = lab(views[v] ? mul(views[v], l) : l); }
    let worst = null;
    const pairs = [];
    for (let i = 0; i < ROLES.length; i++) for (let j = i + 1; j < ROLES.length; j++) {
      const d = dE(labs[ROLES[i]], labs[ROLES[j]]);
      pairs.push([d, ROLES[i], ROLES[j]]);
      if (!worst || d < worst[0]) worst = [d, ROLES[i], ROLES[j]];
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const close = pairs.filter(p => p[0] < 20);
    console.log('  ' + v.padEnd(13) + 'closest pair ' + (NAMES[worst[1]] || worst[1]) + ' / ' + (NAMES[worst[2]] || worst[2]) + ' at ΔE ' + worst[0].toFixed(0) +
      (close.length ? '; under 20: ' + close.map(p => (NAMES[p[1]] || p[1]) + '/' + (NAMES[p[2]] || p[2]) + ' ' + p[0].toFixed(0)).join(', ') : '; every pair is 20 or more apart'));
  }
}
report('Light', light);
report('Dark', dark);
console.log('\nA ΔE under about 20 is hard to tell apart at a glance at crab size. That is why every kind wears a mark on its shell');
console.log('(scout ▲, drill ◆, hauler =, crusher ■, smelter ●, energy bot ⚡, repair bot +, maintenance bot ○), and the same mark beside its name.');
