// Balance runs: fixed crews against the figures in the paper, and an automatic player that follows the
// advisor, timed to each rank. It reports rather than passes or fails: run it before and after a change
// to the economy and compare. Usage: node tests/balance.js [seeds=3]
'use strict';
const { CrabSim, run } = require('./lib');

const SEEDS = Array.from({ length: +process.argv[2] || 3 }, (_, i) => i + 1);
const K = CrabSim().K;
const crew = a => Object.fromEntries(K.ROLES.map((r, i) => [r, a[i]]));      // in the order of K.ROLES
const maxed = Object.fromEntries(Object.keys(K.UP).map(k => [k, K.UP[k].costs.length]));

function rate(opts, mins) {                // ingots sold a minute, averaged over the seeds
  let sum = 0;
  for (const seed of SEEDS) { const s = CrabSim(); s.reset({ ...opts, seed }); run(s, mins * 60); sum += s.state().stat.sold / mins; }
  return sum / SEEDS.length;
}

// [what, options, minutes, the paper's figure]
const FIXED = [
  ['starting crew, all hands, 5 min', { shift: 'all' }, 5, 3.8],
  ['starting crew, A and B, 5 min', { shift: 'ab' }, 5, 3.5],
  ['starting crew, all hands, 10 min', { shift: 'all' }, 10, 3.1],
  ['starting crew, A and B, 10 min', { shift: 'ab' }, 10, 3.7],
  ['starting crew, all hands, 20 min', { shift: 'all' }, 20, 2.5],
  ['starting crew, A and B, 20 min', { shift: 'ab' }, 20, 3.6],
  ['best 10, all hands, 8 min', { shift: 'all', crew: crew([1, 1, 1, 1, 3, 1, 2, 0]) }, 8, 6.2],
  ['best 10, all hands, 20 min', { shift: 'all', crew: crew([2, 2, 0, 1, 2, 1, 1, 1]) }, 20, 4.9],
  ['best 18, A and B, 20 min', { shift: 'ab', crew: crew([3, 3, 3, 2, 3, 2, 1, 1]), lv: { den: 2, riser: 2, engine: 2 } }, 20, 12.7],
  ['best 30, A and B, every upgrade, 20 min', { shift: 'ab', crew: crew([3, 7, 5, 3, 6, 3, 2, 1]), lv: maxed }, 20, 28.1]
];

// The automatic player: every few seconds it spends on what the advisor would point at.
const STAGE = { scout: 'scout', drill: 'drill', haul: 'haul', crush: 'crush', smelt: 'smelt', power: 'energy', repair: 'repair', mech: 'mech' };
function autoPlayer(sim, opts) {
  const S = sim.state();
  if (S.crabs.length >= sim.crewCap() && sim.buy('den') === true) return;
  const b = sim.bottleneck();
  if (b === 'sell') { if (sim.buy('riser') !== true) sim.hire('smelt'); return; }
  if (b === 'power' && sim.buy('engine') === true) return;
  const gap = sim.gaps()[0];
  if (gap) sim.hire(gap.role);
  else if (STAGE[b]) sim.hire(STAGE[b]);
  if (opts.research) for (const id in K.TECH) { sim.research(id); for (const w in K.WUP) sim.upgradeWorker(w); }
  if (opts.oc && S.ocBank >= K.OC_MAX * 0.8) sim.overclock(true);
}
function rankTimes(opts, mins) {           // minutes to each rank, averaged over the seeds that reached it
  const at = K.RANKS.map(() => []), earned = [];
  for (const seed of SEEDS) {
    const s = CrabSim(), got = new Set(); s.reset({ seed, shift: opts.shift });
    run(s, mins * 60, t => {
      if (t % 5 === 0) autoPlayer(s, opts);
      for (let r = 1; r <= s.state().rank; r++) if (!got.has(r)) { got.add(r); at[r].push(t / 60); }
    });
    earned.push(s.state().earned);
  }
  return { at: at.map(a => a.length ? (a.reduce((x, y) => x + y) / a.length).toFixed(1) + (a.length < SEEDS.length ? '*' : '') : '-'), earned: earned.reduce((x, y) => x + y) / earned.length };
}

console.log('Fixed crews, ingots a minute over ' + SEEDS.length + ' seeds (the paper\'s figure in brackets)');
for (const [what, opts, mins, paper] of FIXED) console.log('  ' + what.padEnd(42) + rate(opts, mins).toFixed(1).padStart(5) + '  (' + paper + ')');

console.log('\nAutomatic player, minutes to each rank over 40 minutes (* = not every seed got there)');
console.log('  ' + ''.padEnd(28) + K.RANKS.slice(1).map(r => r[1].padStart(15)).join('') + '   earned');
for (const [what, opts] of [['all hands', { shift: 'all' }], ['A and B, overclock', { shift: 'ab', oc: true }], ['A and B, overclock, research', { shift: 'ab', oc: true, research: true }], ['three-shift relief', { shift: 'relief', oc: true }]]) {
  const r = rankTimes(opts, 40);
  console.log('  ' + what.padEnd(28) + r.at.slice(1).map(x => x.padStart(15)).join('') + Math.round(r.earned).toString().padStart(9));
}
