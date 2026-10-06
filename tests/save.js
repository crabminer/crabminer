// Save and load: a loaded game must play on exactly as the original would have.
// Each run plays with random actions, saves through JSON into a second game, compares the two states
// field by field, then plays both on with the same actions and compares their saves.
// Usage: node tests/save.js [runs=6] [minutes=10]
'use strict';
const { CrabSim, run, rng, act } = require('./lib');

const RUNS = +process.argv[2] || 6, MINUTES = +process.argv[3] || 10;
let failed = 0;
const viewKey = k => k[0] === 'v' || k === 'anim' || k === 'say';

// Walk two states side by side; returns the path of the first difference, or null. Shared objects
// must be shared in the same way, so the same pair is only walked once.
function diff(x, y, path, seen) {
  if (typeof x === 'number' && typeof y === 'number') return x === y || (!isFinite(x) && y === null) ? null : path;
  if (!x || !y || typeof x !== 'object' || typeof y !== 'object') return x === y ? null : path;
  if (seen.has(x)) return seen.get(x) === y ? null : path + ' (shared differently)';
  seen.set(x, y);
  if (Array.isArray(x) !== Array.isArray(y)) return path;
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) {
    if (viewKey(k) || typeof x[k] === 'function' || (x[k] === undefined && !(k in y))) continue;
    const d = diff(x[k], y[k], path + '.' + k, seen);
    if (d) return d;
  }
  return null;
}
const fail = msg => { failed++; console.log('FAIL ' + msg); };

for (let r = 0; r < RUNS; r++) {
  const seed = 2000 + r * 104729, a = CrabSim(), b = CrabSim(), ra = rng(seed);
  a.reset({ seed, credits: r % 2 ? 4000 : undefined });
  run(a, MINUTES * 60 / 2, () => { if (ra() < 0.08) act(a, ra); });

  const text = JSON.stringify(a.save());
  if (b.load(JSON.parse(text)) !== true) { fail('run ' + (r + 1) + ': the save would not load'); continue; }
  const d = diff(a.state(), b.state(), 'S', new Map());
  if (d) { fail('run ' + (r + 1) + ': the loaded game differs at ' + d); continue; }

  // the same actions on both, from generators in the same state
  const s2 = seed + 1, rb = rng(s2), rc = rng(s2);
  run(a, MINUTES * 60 / 2, () => { if (rb() < 0.08) act(a, rb); });
  run(b, MINUTES * 60 / 2, () => { if (rc() < 0.08) act(b, rc); });
  const sa = JSON.stringify(a.save()), sb = JSON.stringify(b.save());
  if (sa !== sb) {
    let i = 0; while (sa[i] === sb[i]) i++;
    fail('run ' + (r + 1) + ': the games drift apart after loading, near ...' + sa.slice(Math.max(0, i - 60), i + 40));
  } else console.log('ok   run ' + (r + 1) + ' seed ' + seed + ': ' + (text.length / 1024).toFixed(0) + ' KB save, ' + a.state().stat.sold + ' sold');
}

// bad saves are refused and leave the game untouched
const g = CrabSim(); g.reset({ seed: 9 }); run(g, 30);
const before = JSON.stringify(g.save()), good = JSON.parse(before);
const bad = [null, {}, 'save', { ...good, v: good.v + 1 }, { ...good, seed: 'x' }, { ...good, S: { ...good.S, crabs: 'none' } }, { ...good, S: { ...good.S, extra: { $ref: 99999 } } }];
bad.forEach((d, i) => {
  if (g.load(d) !== 'bad') fail('bad save ' + (i + 1) + ' was accepted');
  else if (JSON.stringify(g.save()) !== before) fail('bad save ' + (i + 1) + ' changed the game');
});

// a save from before a field existed still loads, with the field at its default
const old = JSON.parse(before); delete old.S.rival; delete old.S.lv.yard; delete old.S.stat.trades;
if (g.load(old) !== true) fail('an older save would not load');
else if (g.state().lv.yard !== 0 || g.state().stat.trades !== 0 || !('rival' in g.state())) fail('an older save did not get the new fields');
else console.log('ok   bad saves refused, older saves filled in');

console.log(failed ? failed + ' checks failed' : 'all save checks passed');
process.exit(failed ? 1 : 0);
