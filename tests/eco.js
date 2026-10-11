// Run the sea ecosystem for twenty minutes against a stub canvas and check it keeps itself whole: no exceptions,
// no NaN, every count within its cap, whatever gets eaten gets born again, the fisherman and the gulls do their
// rounds, and with reduced motion nothing moves. Usage: node tests/eco.js
'use strict';
const path = require('path');
const CrabEco = require(path.join(__dirname, '..', 'eco.js'));

const W = 1400, H = 700, CS = 1.4, surfH = 63, farBase = H * 0.24, base = [H * 0.31, H * 0.4, H * 0.5], CREST = 0.035;
let T = 0, tide = 0;
function crestY(k, x) {
  const a = H * 0.012;
  if (k === 0) return base[0] - a * 1.6 * Math.sin(x * 0.0047 + 2.1) - a * 0.8 * Math.sin(x * 0.0133);
  if (k === 1) return base[1] - a * 1.3 * Math.sin(x * 0.0055 + 0.6) - a * 0.7 * Math.sin(x * 0.0151 + 2.2);
  return base[2] - a * 0.9 * Math.sin(x * 0.0061 + 1.3) - a * 0.5 * Math.sin(x * 0.0173 + 0.4);
}
const geom = {
  surfH, farBase, base,
  farY: x => farBase - H * 0.03 * Math.sin(x * 0.0029 + 0.7) - H * 0.012 * Math.sin(x * 0.011 + 1.9),
  crestY,
  groundY(px, d) {
    const k = d < 1 / 3 ? 0 : d < 2 / 3 ? 1 : 2, f = d * 3 - k, top = crestY(k, px) + 4 * CS, bot = k < 2 ? crestY(k + 1, px) + 4 * CS : H - 9 * CS;
    let y = top + f * (bot - top);
    for (let i = 1; i <= 2; i++) { const b = Math.abs(d - i / 3); if (b < CREST) y -= 5 * CS * (1 - b / CREST); }
    return y;
  },
  waveY: x => surfH * 0.92 - tide * 12 * CS + 11 * Math.sin(x * 0.0055 + T * 0.44 + 3.1) + 5 * Math.sin(x * 0.015 - T * 0.7),
  X: lx => lx / 1000 * W,
  scaleAt: d => CS * (0.7 + 0.3 * d)
};
const PAL_KEYS = ['foam', 'ink', 'paper', 'scout', 'scoutDark', 'crab', 'crabDark', 'energy', 'energyDark', 'drill', 'drillDark', 'ingot', 'ingotDark', 'warn', 'metal', 'metalDark', 'rock', 'rockDark', 'rockLine', 'weed', 'weed2', 'sandLine', 'sandBack', 'nodule', 'tongue', 'light', 'lavaHot', 'hat', 'mech', 'mechDark', 'crush', 'crushDark', 'repair', 'repairDark'];
const pal = {}; PAL_KEYS.forEach(k => { pal[k] = '#123456'; });

// A canvas context that accepts everything and draws nothing.
const ctx = new Proxy({}, {
  get(_, name) {
    if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (name === 'measureText') return () => ({ width: 10 });
    return () => {};
  },
  set() { return true; }
});

function env(t, still) {
  T = t; tide = Math.sin(t / 300 * Math.PI * 2);
  const cycle = t % 700, perches = [{ x0: geom.X(852) - 46, x1: geom.X(852) + 46, y: geom.waveY(geom.X(852)) - 10 }];
  let cargo = null;
  if (cycle > 100 && cycle < 460) { const cx = cycle < 400 ? W - 200 : W - 200 - (cycle - 400) * 30; cargo = { x: cx, y: geom.waveY(cx) - 6 }; perches.push({ x0: cx - 90, x1: cx + 92, y: cargo.y - 10 }); }
  const crabs = [];
  for (let i = 0; i < 6; i++) { const d = 0.4 + i * 0.09, x = geom.X(100 + i * 60) + Math.sin(t * 0.3 + i) * 80; crabs.push({ x, y: geom.groundY(x, d), d }); }
  const whale = t % 500 > 300 && t % 500 < 360 ? { x: W * (1 - (t % 500 - 300) / 60), y: 120, v: -30 } : null;
  return { W, H, CS, T: t, pal, nightA: 0.5 + 0.5 * Math.sin(t / 240), stormA: t % 400 > 350 ? 0.8 : 0, tide, bloom: 0.5, still, whale, cargo,
    riserShip: { x: geom.X(852), y: geom.waveY(geom.X(852)) - 4 }, perches, crabs, geom };
}
function drawAll(eco, e) {
  eco.drawDeep(ctx, e); eco.drawWater(ctx, e);
  for (let k = 0; k < 3; k++) eco.drawFloor(ctx, e, k);
  eco.drawSurface(ctx, e); eco.lures();
}

let failed = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { failed++; console.log('FAIL ' + msg); } };

// ----- twenty minutes of frames -----
{
  const eco = CrabEco(), DT = 1 / 30, FRAMES = 36000, caps = {};
  eco.SPECIES.forEach(sp => { caps[sp.key] = 0; });
  let error = null, nan = 0, overCap = 0, maxTotal = 0, overTotal = 0, landed = 0, dived = 0, lastT = 0;
  const everEaten = {};
  const t0 = Date.now();
  try {
    eco.reset(env(0, false));
    for (let i = 1; i <= FRAMES; i++) {
      const t = i * DT, e = env(t, false);
      eco.update(DT, e); drawAll(eco, e);
      if (i % 30 === 0) {                 // the invariants, once a second
        const all = eco.animals(), rep = eco.report();
        maxTotal = Math.max(maxTotal, all.length);
        if (all.length >= 260) overTotal++;
        for (const an of all) { if (!Number.isFinite(an.x) || !Number.isFinite(an.y)) nan++; if (an.lands) landed = Math.max(landed, an.lands); if (an.dives) dived = Math.max(dived, an.dives); }
        for (const sp of rep.species) { if (sp.count < 0 || sp.count > eco.SPECIES.find(s => s.key === sp.key).cap) overCap++; if (sp.eaten) everEaten[sp.key] = true; }
      }
      lastT = t;
    }
  } catch (err) { error = err; }
  const ms = Date.now() - t0, rep = eco.report();
  ok(!error, 'no exception in ' + FRAMES + ' frames' + (error ? ': ' + (error.stack || error) : ''));
  ok(nan === 0, 'no NaN positions (' + nan + ')');
  ok(overCap === 0, 'every count within its cap');
  ok(overTotal === 0, 'total animals under 260 (peak ' + maxTotal + ')');
  const notReborn = rep.species.filter(sp => everEaten[sp.key] && sp.born === 0).map(sp => sp.key);
  ok(notReborn.length === 0, 'everything eaten was born again' + (notReborn.length ? ': ' + notReborn.join(', ') : ''));
  ok(Object.keys(everEaten).length >= 3, 'the food web fed: ' + Object.keys(everEaten).join(', '));
  const f = rep.fisherman;
  ok(f.casts >= 10, 'the fisherman cast at least 10 times (' + f.casts + ')');
  ok(f.hooked >= 1, 'at least one fish was hooked (' + f.hooked + ')');
  ok(f.escaped >= 1, 'at least one fish escaped (' + f.escaped + ')');
  ok(f.netted >= 1, 'jellyfish were netted (' + f.netted + ')');
  ok(landed >= 1, 'a gull landed');
  ok(dived >= 1, 'a gull dived');
  ok(rep.log.length > 0 && rep.log.every(l => typeof l.text === 'string' && l.text.indexOf('undefined') < 0 && l.text.indexOf('NaN') < 0), 'the log reads clean (' + rep.log.length + ' lines)');
  ok(rep.species.every(sp => typeof sp.emoji === 'string' && sp.emoji.length && sp.name && sp.plural), 'every species is labelled');
  ok(ms < 20000, FRAMES + ' update+draw frames in ' + ms + ' ms (' + (ms / FRAMES).toFixed(3) + ' ms a frame)');
  console.log('     ' + rep.species.map(sp => sp.emoji + ' ' + sp.count + '/' + sp.target + ' +' + sp.born + ' -' + sp.eaten).join('  '));
  console.log('     fisherman: ' + JSON.stringify(f) + '  at ' + lastT.toFixed(0) + ' s');
  console.log('     last log lines:\n     ' + rep.log.slice(-6).map(l => l.t.toFixed(0) + 's ' + l.text).join('\n     '));
}

// ----- reduced motion: nothing moves, nothing is born -----
{
  const eco = CrabEco();
  eco.reset(env(0, true));
  const before = eco.animals().map(an => [an.x, an.y, an.d, an.a]);
  let error = null;
  try { for (let i = 1; i <= 2000; i++) { const e = env(i / 30, true); eco.update(1 / 30, e); drawAll(eco, e); } } catch (err) { error = err; }
  const after = eco.animals().map(an => [an.x, an.y, an.d, an.a]), rep = eco.report();
  ok(!error, 'no exception with reduced motion' + (error ? ': ' + (error.stack || error) : ''));
  ok(before.length === after.length && before.every((p, i) => p.every((v, j) => v === after[i][j])), 'nothing moved with reduced motion');
  ok(rep.species.every(sp => sp.born === 0) && rep.fisherman.casts === 0, 'no births or casts with reduced motion');
}

console.log(failed ? failed + ' checks failed' : 'all checks passed');
process.exit(failed ? 1 : 0);
