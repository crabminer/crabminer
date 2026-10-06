// Fuzz the simulation: random player actions, with the invariants checked every second.
// Usage: node tests/fuzz.js [runs=12] [minutes=20]
'use strict';
const { CrabSim, run, rng, act } = require('./lib');

const RUNS = +process.argv[2] || 12, MINUTES = +process.argv[3] || 20;

function check(sim) {
  const K = sim.K, S = sim.state(), bad = [], live = new Set(S.crabs);
  const ok = (cond, msg) => { if (!cond) bad.push(msg); };
  const who = c => c ? c.role + ' #' + c.id + ' (' + c.state + ')' : String(c);

  // no negative stocks
  for (const k of ['ore', 'bars', 'stock', 'credits', 'heat']) ok(S[k] >= 0, k + ' is ' + S[k]);
  ok(S.spares.bit >= 0 && S.spares.leg >= 0, 'negative spares');

  // no stale claims: every claim points at a crab that is still here and holds the same thing back
  for (const n of S.nodules) if (n.by) ok(live.has(n.by) && n.by.target === n, 'stale nodule claim by ' + who(n.by));
  for (const f of S.flags) if (f.by) ok(live.has(f.by) && f.by.flag === f, 'stale flag claim by ' + who(f.by));
  for (const c of S.crabs) {
    if (c.claimedBy) ok(live.has(c.claimedBy) && c.claimedBy.target === c, 'stale charge claim on ' + who(c) + ' by ' + who(c.claimedBy));
    if (c.fixBy) ok(live.has(c.fixBy) && c.fixBy.target === c, 'stale fixBy on ' + who(c) + ' by ' + who(c.fixBy));
    if (c.mendBy) ok(live.has(c.mendBy) && c.mendBy.target === c, 'stale mendBy on ' + who(c) + ' by ' + who(c.mendBy));
  }

  // no ghost or overfull docks
  ok(S.docks.length <= K.DOCKS, 'docks overfull: ' + S.docks.length);
  ok(new Set(S.docks).size === S.docks.length, 'a crab docked twice');
  for (const c of S.docks) ok(live.has(c), 'ghost in dock: ' + who(c));

  // post carrier valid, post in range
  if (S.post.carrier) ok(live.has(S.post.carrier) && S.post.carrier.role === 'energy', 'bad post carrier ' + who(S.post.carrier));
  const lo = Math.max(K.FIELD0 + 30, K.STIRLING - K.CORD) - 20, hi = K.STIRLING - 40 + 20;
  ok(S.post.x >= lo && S.post.x <= hi, 'post out of range at ' + S.post.x.toFixed(1));

  // no two buildings on one plot
  const plots = Object.values(S.layout);
  ok(new Set(plots).size === plots.length, 'two buildings on one plot: ' + JSON.stringify(S.layout));

  for (const c of S.crabs) {
    ok(!c.gone, 'retired crab still in the crew: ' + who(c));
    // dance pairs symmetric
    if (c.dance) ok(c.dance.dance === c && live.has(c.dance), 'one-sided dance: ' + who(c));
    // no sleeping in the air, no claims held while asleep
    if (c.state === 'sleep') {
      ok(!c.air, 'asleep in the air: ' + who(c));
      ok(!c.target && !c.flag && S.docks.indexOf(c) < 0 && S.post.carrier !== c, 'holds a claim while asleep: ' + who(c));
    }
    // finite position, wear and bload
    for (const k of ['x', 'd', 'wear', 'bload', 'bat']) ok(Number.isFinite(c[k]), who(c) + ' has ' + k + ' = ' + c[k]);
  }
  return bad;
}

// The checker must see broken state, or a pass means nothing: corrupt a game a few ways first.
(function selfTest() {
  const sim = CrabSim(); sim.reset({ seed: 3 }); run(sim, 60);
  const ghost = { role: 'haul', id: -1, state: 'gone' }, clean = sim.save();
  if (check(sim).length) throw new Error('the checker fails a clean game: ' + check(sim));
  const cases = [
    S => { S.ore = -1; }, S => { S.nodules[0].by = ghost; }, S => { S.docks.push(ghost); },
    S => { S.crabs[0].dance = S.crabs[1]; }, S => { S.layout.den = S.layout.ore; }, S => { S.crabs[0].x = NaN; }
  ];
  cases.forEach((corrupt, i) => {
    sim.load(clean); corrupt(sim.state());
    if (!check(sim).length) throw new Error('the checker missed corruption ' + (i + 1));
  });
})();

let failed = 0;
for (let r = 0; r < RUNS; r++) {
  const seed = 1000 + r * 7919, sim = CrabSim(), rand = rng(seed);
  sim.reset({ seed, credits: r % 2 ? 4000 : undefined });   // odd runs start rich, to reach upgrades and big crews
  let first = null, actions = 0;
  run(sim, MINUTES * 60, t => {
    if (rand() < 0.08) { act(sim, rand); actions++; }
    if (first) return;
    const bad = check(sim);
    if (bad.length) first = { t, bad };
  });
  const S = sim.state();
  const line = 'run ' + (r + 1) + ' seed ' + seed + ': ' + actions + ' actions, ' + S.crabs.length + ' crabs, day ' + S.day + ', ' + S.stat.sold + ' sold';
  if (first) {
    failed++;
    console.log('FAIL ' + line + '\n  at ' + first.t + ' s:\n  ' + first.bad.slice(0, 10).join('\n  '));
  } else console.log('ok   ' + line);
}
console.log(failed ? failed + ' of ' + RUNS + ' runs failed' : 'all ' + RUNS + ' runs passed');
process.exit(failed ? 1 : 0);
