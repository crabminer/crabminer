// Shared helpers for the tests: load the simulation, run it, and pick random player actions.
'use strict';
const path = require('path');
const CrabSim = require(path.join(__dirname, '..', 'sim.js'));

const SEC = 60;                            // sim steps in a second

function run(sim, secs, each) {            // step the sim, draining events; `each(t)` runs after each whole second t
  for (let i = 1; i <= secs * SEC; i++) {
    sim.step(); sim.drain();
    if (each && i % SEC === 0) each(i / SEC);
  }
}

function rng(seed) {                       // a small seeded generator, separate from the sim's own
  let s = seed >>> 0 || 1;
  return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// One random player action, of the kinds the controls offer.
function act(sim, r) {
  const K = sim.K, S = sim.state(), pick = a => a[Math.floor(r() * a.length)];
  const role = pick(K.ROLES), x = r();
  if (x < 0.25) return sim.hire(role);
  if (x < 0.40) return sim.retire(role);   // often, since leaving is where claims go stale
  if (x < 0.50) return sim.buy(pick(Object.keys(K.UP)));
  if (x < 0.56) return sim.research(pick(Object.keys(K.TECH)));
  if (x < 0.64) return sim.upgradeWorker(pick(Object.keys(K.WUP)));
  if (x < 0.68) return sim.place(pick(K.BUILDINGS), Math.floor(r() * K.PLOTS.length));
  if (x < 0.72) return sim.placePost(K.FIELD0 + r() * (K.STIRLING - K.FIELD0), 0.6 + r() * 0.4);
  if (x < 0.74) return sim.setPostAuto(true);
  if (x < 0.79) return sim.setShift(pick(K.SHIFTS));
  if (x < 0.83) return sim.setWork({ start: r() * 24, len: 2 + r() * 10, count: 1 + Math.round(r()), rest: r() * 8, groups: 1 + Math.floor(r() * 3) });
  if (x < 0.85) return sim.setScoutsNight(r() < 0.5);
  if (x < 0.89) return sim.setReserve(Math.floor(r() * 13));
  if (x < 0.94) return sim.overclock(r() < 0.7);
  if (x < 0.96) return sim.shoo();
  if (S.trader && S.trader.offers) return sim.trade(pick(S.trader.offers));
}

module.exports = { CrabSim, SEC, run, rng, act };
