// ===== The sea around the crabs: a food web that feeds itself =====
// Minnows, shrimp, jellyfish and crawlers at the bottom; seahorses, piranha, squid, eels, sea snakes, frogs,
// small turtles, lobsters and gulls above them; a shark or two at the top; and a fisherman in a rowboat who
// baits his hook with jellyfish. Whatever is eaten is born again at its nursery a few seconds later, so the
// pyramid stays bottom-heavy and the sea never empties. It is all decoration: it never reads or changes the
// simulation, uses Math.random freely, and keeps only a lab report of what it saw, for the Ledger.
function CrabEco() {
  'use strict';
  var TAU = Math.PI * 2;
  function rr(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function sgn(v) { return v < 0 ? -1 : 1; }

  // The food web. `n` is the target count on a 1200 px canvas (wider screens get more); `speed` is px/s at scale 1
  // and `size` the body length; `sight` is how far a hunter sees and `fleeR` how close a hunter may come before
  // its prey bolts; `hook` is the chance a bite on the fisherman's bait ends on the hook (absent: it never comes
  // to the bait); `full` is how long a meal keeps a hunter from the next one. `home` is the layer it lives in.
  var SPECIES = [
    { key: 'minnow', name: 'minnow', plural: 'minnows', emoji: '🐟', level: 1, n: 36, home: 'water', speed: 26, size: 5, alpha: 0.55, sight: 40, fleeR: 55, hook: 0, turn: 3.5, born: 'hatched among the weeds' },
    { key: 'shrimp', name: 'shrimp', plural: 'shrimp', emoji: '🦐', level: 1, n: 14, home: 'floor', speed: 24, size: 4, alpha: 0.9, born: 'crept out from under a rock' },
    { key: 'jelly', name: 'jellyfish', plural: 'jellyfish', emoji: '🪼', level: 1, n: 8, home: 'water', speed: 6, size: 9, alpha: 0.4, fleeR: 0, born: 'drifted in near the surface' },
    { key: 'crawler', name: 'crawler', plural: 'crawlers', emoji: '🐛', level: 1, n: 24, home: 'floor', speed: 3, size: 2.5, alpha: 0.6, born: 'crept out from under a rock' },
    { key: 'seahorse', name: 'seahorse', plural: 'seahorses', emoji: '🐴', level: 2, n: 3, home: 'floor', speed: 9, size: 8, alpha: 0.9, sight: 70, diet: ['shrimp', 'crawler'], full: [10, 25], born: 'drifted in to the rocks' },
    { key: 'piranha', name: 'piranha', plural: 'piranhas', emoji: '🐠', level: 2, n: 5, home: 'water', speed: 32, size: 9, alpha: 0.9, sight: 150, fleeR: 90, diet: ['minnow'], hook: 0.5, full: [8, 20], turn: 2.2, born: 'came in from the open sea' },
    { key: 'squid', name: 'squid', plural: 'squid', emoji: '🦑', level: 2, n: 2, home: 'water', speed: 30, size: 14, alpha: 0.9, sight: 150, fleeR: 90, diet: ['minnow', 'shrimp'], hook: 0.4, full: [8, 20], turn: 1.8, born: 'came in from the open sea' },
    { key: 'eel', name: 'eel', plural: 'eels', emoji: '🪱', level: 2, n: 2, home: 'water', speed: 30, size: 34, alpha: 0.9, sight: 140, fleeR: 0, diet: ['minnow', 'shrimp'], full: [8, 20], turn: 1.8, born: 'came in from the open sea' },
    { key: 'snake', name: 'sea snake', plural: 'sea snakes', emoji: '🐍', level: 2, n: 2, home: 'water', speed: 28, size: 30, alpha: 0.9, sight: 140, fleeR: 90, diet: ['minnow'], hook: 0.3, full: [8, 20], turn: 2, born: 'came in from the open sea' },
    { key: 'frog', name: 'frog', plural: 'frogs', emoji: '🐸', level: 2, n: 2, home: 'water', speed: 30, size: 8, alpha: 0.9, sight: 120, fleeR: 80, diet: ['minnow'], hook: 0.3, full: [8, 20], turn: 2.5, upright: true, born: 'swam in from the shallows' },
    { key: 'turtle', name: 'small turtle', plural: 'small turtles', emoji: '🐢', level: 2, n: 2, home: 'water', speed: 11, size: 12, alpha: 0.9, sight: 160, fleeR: 0, diet: ['jelly'], hook: 0.35, full: [10, 25], turn: 1.2, born: 'paddled in from the open sea' },
    { key: 'lobster', name: 'lobster', plural: 'lobsters', emoji: '🦞', level: 2, n: 3, home: 'floor', speed: 13, size: 12, alpha: 0.9, sight: 80, diet: ['shrimp', 'crawler'], full: [10, 25], born: 'crawled in along the sand' },
    { key: 'gull', name: 'gull', plural: 'gulls', emoji: '🐦', level: 2, n: 5, home: 'air', speed: 55, size: 12, alpha: 1, diet: ['minnow'], born: 'flew in from over the sea' },
    { key: 'shark', name: 'shark', plural: 'sharks', emoji: '🦈', level: 3, n: 1, home: 'water', speed: 24, size: 44, alpha: 0.85, sight: 220, fleeR: 0, diet: ['piranha', 'squid', 'frog', 'snake', 'minnow'], hook: 0.15, full: [20, 40], turn: 1.4, born: 'came in from the open sea' }
  ];
  var BY = {}, NUM = ['no', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  SPECIES.forEach(function (sp) { BY[sp.key] = sp; });
  var WHALE = { key: 'whale', size: 60 };               // only ever a threat, never a hunter here

  var W = 0, H = 0, CS = 1, T = 0, G = null, pal = {}, env = null, stocked = false, stockedW = 0;
  var pop = {}, pend = {}, st = {}, threats = {}, rocks = [], bubbles = [], splashes = [], deep = [], lureList = [], log = [], dirty = false;
  // The web's two bites at the game, reported to the view as events (it decides what they do to the crabs): the shark
  // chasing the octopus off, and a gull swooping on a crab carrying nodules along the back dune's crest.
  var events = [], gullCd = 0, web = { sharkScares: 0, gullSnatches: 0 };
  var schools = [], NS = 1;
  var hook = { x: 0, y: 0, tx: 0, ty: 0, hook: true, sp: { size: 4, name: 'bait' } };
  var boat = { x: 0, dir: 1, state: 'idle', t: 2, bucket: 0, bait: false, jelly: null, fish: null, casts: 0, netted: 0, bites: 0, hooked: 0, escaped: 0 };
  var POSE = { y: 0, tilt: 0 }, TIP = { x: 0, y: 0 }, PP = { x: 0, y: 0, moved: false };

  function use(e) { env = e; W = e.W; H = e.H; CS = e.CS; G = e.geom; pal = e.pal; }
  function art(name) { return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function note(text) { log.push({ t: env ? env.T : T, text: text, key: '', n: 1, t0: T }); if (log.length > 24) log.shift(); }
  function noteBirth(sp) {                 // several births of one kind within 2 s make one line
    var last = log[log.length - 1];
    if (last && last.key === sp.key && T - last.t0 < 2) { last.n++; last.t0 = T; last.text = cap(NUM[last.n] || String(last.n)) + ' ' + sp.plural + ' ' + sp.born + '.'; return; }
    note(cap(art(sp.name)) + ' ' + sp.born + '.'); log[log.length - 1].key = sp.key;
  }

  // ----- where things may live -----
  function top() { return G.surfH + 10; }
  function bottom(x) { return Math.max(top() + 20, Math.min(G.farY(x) + 30, G.crestY(0, x) - 8 * CS)); }
  function layerOf(d) { return d < 1 / 3 ? 0 : (d < 2 / 3 ? 1 : 2); }
  var DUNE = { x0: 0, x1: 0, d0: 0, d1: 0 };
  function dune(k) {                       // the sand of dune k that floor life may use: off the plots, the lava and the edges
    DUNE.x0 = k === 2 ? G.X(30) : 20; DUNE.x1 = k === 2 ? G.X(530) : G.X(840); DUNE.d0 = k / 3 + 0.07; DUNE.d1 = (k + 1) / 3 - 0.05;
    return DUNE;
  }
  function dpp(k) { var b = k < 2 ? G.base[k + 1] - G.base[k] : H - G.base[2]; return (1 / 3) / Math.max(20, b); }   // depth units per px of sand
  function hover(an) { var sp = an.sp; return sp.key === 'seahorse' ? 12 + Math.sin(an.ph * 1.5) * 3 : sp.key === 'shrimp' ? 2 + Math.abs(Math.sin(an.ph * 5)) * 2 : 1; }
  function settle(an) { an.y = G.groundY(an.x, an.d) - hover(an) * G.scaleAt(an.d); }

  // ----- stocking and births -----
  function spawn(sp, grow) {               // a new animal: at its nursery when born, anywhere at home for the first stock
    var an = { sp: sp, x: 0, y: 0, a: 0, ph: rr(0, TAU), grow: grow ? 0 : 1, full: 0, gulp: 0, flee: 0, target: null, hunt: 0, seek: rr(0, 0.3), dead: false, wa: 0, flip: rr(4, 12), dir: 1, next: rr(2, 6) }, side = Math.random() < 0.5 ? -1 : 1, r, dn;
    if (sp.home === 'water') {
      if (sp.key === 'jelly') { an.x = rr(W * 0.05, W * 0.95); an.y = grow ? top() + rr(5, 30) : rr(top(), bottom(an.x)); an.dn = false; }
      else if (sp.key === 'minnow') { an.x = grow ? rr(W * 0.1, W * 0.9) : rr(0, W); an.y = grow ? bottom(an.x) - rr(4, 24) : rr(top() + 10, bottom(an.x) - 10); an.school = smallestSchool(); an.a = schools[an.school].wa; }
      else { an.x = grow ? (side < 0 ? -30 * CS : W + 30 * CS) : rr(0, W); an.y = rr(top() + 15, bottom(an.x) - 15); an.a = side < 0 ? 0 : Math.PI; if (sp.key === 'frog') an.y = top() + rr(5, 25); if (sp.key === 'snake') an.breath = rr(15, 40); }
      an.wa = an.a;
    } else if (sp.home === 'floor') {
      r = pick(rocks); an.k = r.k; dn = dune(an.k); an.dir = side;
      if (sp.key === 'lobster') { an.x = grow ? (side < 0 ? dn.x0 : dn.x1) : rr(dn.x0, dn.x1); an.d = rr(dn.d0, dn.d1); an.dir = -side; an.walk = true; an.vd = 0; }
      else if (sp.key === 'crawler' && !grow) { an.x = rr(dn.x0, dn.x1); an.d = rr(dn.d0, dn.d1); an.vd = 0; }
      else { an.x = r.x + rr(-10, 10) * G.scaleAt(r.d); an.d = clamp(r.d + rr(0.005, 0.03), dn.d0, dn.d1); an.hx = an.x; an.hd = an.d; an.dart = 0; an.ux = 0; an.uy = 0; an.vd = 0; }
      settle(an);
    } else {
      an.x = grow ? (side < 0 ? -20 * CS : W + 20 * CS) : rr(0, W); an.alt = rr(8, Math.max(14, G.waveY(an.x) - 18 * CS)); an.y = an.alt; an.dir = -side;
      an.state = 'fly'; an.v = sp.speed * CS * rr(0.85, 1.15); an.next = rr(4, 12); an.glideT = rr(1, 4); an.gliding = false; an.bank = 0; an.perch = null; an.sit = 0;
    }
    pop[sp.key].push(an);
    return an;
  }
  function smallestSchool() { var i, j, best = 0, n = [], list = pop.minnow; for (i = 0; i < NS; i++) n.push(0); for (i = 0; i < list.length; i++) n[list[i].school]++; for (j = 1; j < NS; j++) if (n[j] < n[best]) best = j; return best; }
  function reset(e) {
    use(e);
    var i, k, sp, n, dn, x;
    for (i = 0; i < SPECIES.length; i++) {
      sp = SPECIES[i];
      sp.target = sp.key === 'shark' ? (W > 1400 ? 2 : 1) : Math.max(1, Math.round(sp.n * W / 1200));
      sp.cap = Math.round(sp.target * 1.5) + 2;
      pop[sp.key] = []; pend[sp.key] = []; threats[sp.key] = [];
      if (!st[sp.key]) st[sp.key] = { born: 0, eaten: 0, eatenBy: {}, caught: 0, baitTaken: 0 };
    }
    NS = Math.max(1, Math.round(BY.minnow.target / 8)); schools = [];
    for (i = 0; i < NS; i++) schools.push({ x: 0, y: 0, vx: 0, vy: 0, n: 0, wa: rr(0, TAU), flip: rr(6, 16) });
    rocks = []; n = Math.max(2, Math.round(3 * W / 1200));
    for (k = 0; k < 3; k++) for (i = 0; i < n; i++) {
      dn = dune(k);
      do { x = rr(dn.x0 + 20, dn.x1 - 20); } while (k === 2 && Math.abs(x - G.X(400)) < G.X(50));   // not by the eel's crack
      rocks.push({ k: k, x: x, d: rr(dn.d0, dn.d1), rx: rr(6, 11), ry: rr(3.5, 6), tilt: rr(-0.3, 0.3), two: Math.random() < 0.5 });
    }
    for (i = 0; i < SPECIES.length; i++) for (k = 0; k < SPECIES[i].target; k++) spawn(SPECIES[i], false);
    bubbles = []; splashes = [];
    boat.x = rr(G.X(120), G.X(760)); boat.dir = Math.random() < 0.5 ? -1 : 1; boat.state = 'idle'; boat.t = rr(2, 5); boat.jelly = null; boat.fish = null; boat.bait = false;
    stockDeep();
    stocked = true; stockedW = W;
  }
  function births() {
    var i, j, sp, list, q;
    for (i = 0; i < SPECIES.length; i++) {
      sp = SPECIES[i]; list = pop[sp.key]; q = pend[sp.key];
      while (list.length + q.length < sp.target) q.push(T + rr(4, 12));
      for (j = q.length - 1; j >= 0; j--) if (q[j] <= T) { q.splice(j, 1); if (list.length < sp.cap) { spawn(sp, true); st[sp.key].born++; noteBirth(sp); } }
    }
  }
  function gatherThreats() {               // who each kind of prey should watch for this frame
    var i, j, k, sp, list, an;
    for (i = 0; i < SPECIES.length; i++) threats[SPECIES[i].key].length = 0;
    for (i = 0; i < SPECIES.length; i++) {
      sp = SPECIES[i]; if (!sp.diet) continue; list = pop[sp.key];
      for (j = 0; j < list.length; j++) {
        an = list[j]; if (an.full > 0 || an.grow < 1 || an.hooked || (sp.home === 'air' && an.state !== 'dive')) continue;
        for (k = 0; k < sp.diet.length; k++) threats[sp.diet[k]].push(an);
      }
    }
    if (env.whale) threats.minnow.push(env.whale);
  }

  // ----- hunting and eating -----
  function nearestPrey(an) {               // the nearest animal of its diet in sight, or the fisherman's bait when it is curious
    var sp = an.sp, best = null, bd = sp.sight * CS, i, j, list, p, d;
    for (i = 0; i < sp.diet.length; i++) {
      list = pop[sp.diet[i]];
      for (j = 0; j < list.length; j++) {
        p = list[j];
        if (p.dead || p.grow < 1 || p.hooked || p.netted) continue;
        if (p.k !== undefined && (sp.home === 'water' ? !(p.k === 0 && p.d < 0.16) : p.k !== an.k)) continue;   // sand prey: only the back dune's crest from the water, only its own dune on the sand
        d = dist(an.x, an.y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
    }
    if (sp.hook !== undefined && boat.state === 'wait' && dist(an.x, an.y, hook.x, hook.y) < bd) best = hook;
    return best;
  }
  function catchR(an, t) { return Math.max(5 * CS, (an.sp.size + t.sp.size) * 0.4 * CS); }
  function kill(t, by) { var s = st[t.sp.key]; t.dead = true; dirty = true; s.eaten++; s.eatenBy[by] = (s.eatenBy[by] || 0) + 1; }
  function eat(an, t) {
    if (t === hook) { bite(an); return; }
    kill(t, an.sp.key); an.gulp = 0.45; an.full = rr(an.sp.full[0], an.sp.full[1]); an.target = null;
    bubble(an.x, an.y, 3);
    note(cap(art(an.sp.name)) + ' ate ' + art(t.sp.name) + '.');
  }
  function bubble(x, y, n) { for (var i = 0; i < n; i++) bubbles.push({ x: x + rr(-3, 3) * CS, y: y, r: rr(1, 2.2) * CS, vy: rr(14, 26) * CS, ph: rr(0, TAU) }); if (bubbles.length > 60) bubbles.splice(0, bubbles.length - 60); }
  function splash(x, y, k) { splashes.push({ x: x, y: y, t: 0, k: k }); bubble(x, y + 4 * CS, 2); }
  function turn(an, want, rate, dt) { var d = Math.atan2(Math.sin(want - an.a), Math.cos(want - an.a)); an.a += clamp(d, -rate * dt, rate * dt); }
  function moveFloor(an, tx, ty, spd, dt) { var dx = tx - an.x, dy = ty - an.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 1e-3) return; an.x += dx / d * spd * dt; an.d += dy / d * spd * dt * dpp(an.k); }
  function tick(an, dt) { an.ph += dt; an.grow = Math.min(1, an.grow + dt); an.gulp = Math.max(0, an.gulp - dt); an.full = Math.max(0, an.full - dt); an.flee = Math.max(0, an.flee - dt); }

  // ----- the open water -----
  function waterStep(an, dt) {
    var sp = an.sp, spd = sp.speed * CS, want = -9, t = null, d, i, th, tl, best = null, bd, lo, hi, vx, vy, push, m;
    tick(an, dt);
    if (an.hooked || an.netted) return;    // the fisherman has it
    if (sp.key === 'jelly') { jellyStep(an, dt); return; }
    tl = threats[sp.key]; bd = sp.fleeR * CS;                                // bolt from the nearest hunter in reach
    for (i = 0; i < tl.length; i++) { th = tl[i]; if (th === an) continue; d = dist(an.x, an.y, th.x, th.y); if (d < bd) { bd = d; best = th; } }
    if (best) { want = Math.atan2(an.y - best.y, an.x - best.x); an.flee = 0.8; an.target = null; }
    if (an.flee > 0) spd *= 1.8;
    if (sp.key === 'shark') {                                                // the shark chases the octopus off when it passes close
      an.scareCd = Math.max(0, (an.scareCd || 0) - dt);
      if (env.octo && an.scareCd <= 0 && dist(an.x, an.y, env.octo.x, env.octo.y) < 70 * CS) { an.scareCd = 90; web.sharkScares++; events.push({ kind: 'sharkScare' }); note('The shark chased the octopus off.'); }
    }
    if (want === -9 && sp.diet) {                                            // hunting: the nearest prey in sight, slowly
      t = an.target;
      if (t && (t.dead || t.hooked || t.netted || (t === hook && boat.state !== 'wait'))) t = an.target = null;
      an.seek -= dt;
      if (!t && an.full <= 0 && an.grow >= 1 && an.seek <= 0) { t = an.target = nearestPrey(an); an.hunt = 0; an.seek = 0.25; }
      if (t) {
        an.hunt += dt; d = dist(an.x, an.y, t.x, t.y);
        if (d < catchR(an, t)) { eat(an, t); t = null; }
        else if (an.hunt > 12) { an.target = t = null; an.full = 4; }     // lost it; forget hunting for a moment
        else { want = Math.atan2(t.y - an.y, t.x - an.x); spd *= 1.3; }
      }
    }
    if (want === -9) want = sp.key === 'minnow' ? flock(an, dt) : wander(an, dt);
    if (sp.key === 'squid') spd *= 0.15 + 1.6 * Math.pow(Math.max(0, Math.sin(an.ph * 1.8)), 2);   // jets in pulses
    if (sp.key === 'frog') spd *= 0.2 + 1.4 * Math.max(0, Math.sin(an.ph * 2.5));                    // kicks
    lo = top() + sp.size * 0.3 * CS; hi = bottom(an.x) - sp.size * 0.3 * CS;
    if (sp.key === 'frog') hi = Math.min(hi, top() + 40 * CS);
    if (t && t.k !== undefined) hi += 14 * CS;                               // dipping over the back dune's crest for prey on the sand
    if (sp.key === 'snake') {                                                // up for a breath now and then
      an.breath -= dt;
      if (an.breath <= 0) { want = Math.atan2(-1, sgn(Math.cos(an.a)) * 0.7); lo = top() - 3 * CS; if (an.y <= top()) { an.breath = rr(25, 60); splash(an.x, G.waveY(an.x), 0.5); } }
    }
    vx = Math.cos(want); vy = Math.sin(want); push = 20 * CS;
    if (an.y < lo + push) vy += (lo + push - an.y) / push * 1.2;
    if (an.y > hi - push) vy -= (an.y - hi + push) / push * 1.2;
    if (sp.key === 'minnow') { if (an.x < 30 * CS) vx += (30 * CS - an.x) / (30 * CS) * 1.5; if (an.x > W - 30 * CS) vx -= (an.x - W + 30 * CS) / (30 * CS) * 1.5; }
    turn(an, Math.atan2(vy, vx), an.flee > 0 ? 5 : sp.turn, dt);
    an.x += Math.cos(an.a) * spd * dt; an.y += Math.sin(an.a) * spd * dt;
    if (an.y < lo) an.y = lo; else if (an.y > hi) an.y = hi;
    m = sp.size * CS * 1.5;
    if (an.x < -m) an.x = W + m; else if (an.x > W + m) an.x = -m;
  }
  function wander(an, dt) {               // a slow random walk of the heading, kept near level, turning round now and then
    var fwd, off;
    an.wa += rr(-1, 1) * 2 * dt; an.flip -= dt;
    if (an.flip <= 0) { an.flip = rr(6, 16); an.wa = Math.PI - an.wa; }
    fwd = Math.cos(an.wa) >= 0; off = clamp(Math.atan2(Math.sin(an.wa), Math.abs(Math.cos(an.wa))), -0.45, 0.45);
    an.wa = fwd ? off : Math.PI - off;
    return an.wa;
  }
  function schoolsStep(dt) {              // each school's centre, mean heading and shared wander
    var i, s, list = pop.minnow, m;
    for (i = 0; i < NS; i++) { s = schools[i]; s.x = s.y = s.vx = s.vy = 0; s.n = 0; s.flip -= dt; s.wa += rr(-1, 1) * 1.5 * dt; if (s.flip <= 0) { s.flip = rr(8, 20); s.wa = Math.PI - s.wa; } }
    for (i = 0; i < list.length; i++) { m = list[i]; s = schools[m.school]; s.x += m.x; s.y += m.y; s.vx += Math.cos(m.a); s.vy += Math.sin(m.a); s.n++; }
    for (i = 0; i < NS; i++) { s = schools[i]; if (s.n) { s.x /= s.n; s.y /= s.n; s.vx /= s.n; s.vy /= s.n; } }
  }
  function flock(an, dt) {                // cohesion with the school, alignment with it, room from the neighbours, and a wander
    var s = schools[an.school], list = pop.minnow, i, m, d, vx, vy, dx, dy, c, sx = 0, sy = 0;
    dx = s.x - an.x; dy = s.y - an.y; d = Math.sqrt(dx * dx + dy * dy) + 1e-6; c = Math.min(1, d / (40 * CS));
    vx = dx / d * c + s.vx * 0.9 + Math.cos(s.wa) * 0.8; vy = dy / d * c + s.vy * 0.9 + Math.sin(s.wa) * 0.3;
    for (i = 0; i < list.length; i++) {
      m = list[i]; if (m === an || m.school !== an.school) continue;
      dx = an.x - m.x; dy = an.y - m.y; d = dx * dx + dy * dy;
      if (d < 144 * CS * CS && d > 0) { sx += dx / d * 14 * CS; sy += dy / d * 14 * CS; }
    }
    vx += sx; vy += sy;
    an.x += clamp(sx, -1, 1) * 12 * CS * dt; an.y += clamp(sy, -1, 1) * 12 * CS * dt;   // and a nudge apart, so a school pinned against a bound still spreads
    an.wa += rr(-1, 1) * 3 * dt; vx += Math.cos(an.wa) * 0.5; vy += Math.sin(an.wa) * 0.5;
    return Math.atan2(vy, vx);
  }
  function jellyStep(an, dt) {            // pulsing up, sinking between pulses, carried by the tide; turning down near the top
    var pulse = Math.sin(an.ph * 2.2), v = an.sp.speed * CS, tide = env.tide || 0;
    if (an.y < top() + 6) an.dn = true; else if (an.y > bottom(an.x) - 10) an.dn = false;
    an.y += (pulse > 0 ? -v : v * 0.4) * (an.dn ? -1 : 1) * dt;
    an.x += (Math.sin(an.ph * 0.3) * 4 + tide * 5) * dt;
    if (an.x < -12) an.x = W + 12; else if (an.x > W + 12) an.x = -12;
  }

  // ----- the seabed -----
  function floorStep(an, dt) {
    var sp = an.sp, dn, s = G.scaleAt(an.d), i, t, d, best = null, bd, tl, th, spd = sp.speed * CS, crabs, c, hy;
    tick(an, dt);
    if (sp.key === 'crawler') {
      an.next -= dt;
      if (an.next <= 0) { an.next = rr(3, 9); an.dir = Math.random() < 0.5 ? -1 : 1; an.vd = rr(-1, 1) * 0.01; }
      an.x += an.dir * spd * dt; an.d += an.vd * dt;
    } else if (sp.key === 'shrimp') {                                        // hangs about its rock; darts off when something comes close, then creeps back
      bd = 26 * s; crabs = env.crabs || [];
      for (i = 0; i < crabs.length; i++) { c = crabs[i]; if (layerOf(c.d) !== an.k) continue; d = dist(an.x, an.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
      tl = threats.shrimp;
      for (i = 0; i < tl.length; i++) { th = tl[i]; if (th.k === undefined ? an.k !== 0 : th.k !== an.k) continue; d = dist(an.x, an.y, th.x, th.y); if (d < bd) { bd = d; best = th; } }
      if (best && bd > 0) { an.ux = (an.x - best.x) / bd; an.uy = (an.y - best.y) / bd; an.dart = 0.5; an.dir = sgn(an.ux); }
      if (an.dart > 0) { an.dart -= dt; an.x += an.ux * 110 * CS * dt; an.d += an.uy * 110 * CS * dt * dpp(an.k); }
      else { hy = G.groundY(an.hx, an.hd); if (dist(an.x, an.y, an.hx, hy) > 3 * s) { moveFloor(an, an.hx, hy, spd, dt); an.dir = sgn(an.hx - an.x); } }
    } else {                                                                 // lobsters and seahorses hunt on the sand
      t = an.target; if (t && t.dead) t = an.target = null;
      an.seek -= dt;
      if (!t && an.full <= 0 && an.grow >= 1 && an.seek <= 0) { t = an.target = nearestPrey(an); an.hunt = 0; an.seek = 0.3; }
      if (t) {
        an.hunt += dt; d = dist(an.x, an.y, t.x, t.y);
        if (d < catchR(an, t)) eat(an, t);
        else if (an.hunt > 15) { an.target = null; an.full = 4; }
        else { moveFloor(an, t.x, t.y, spd * 1.3, dt); if (Math.abs(t.x - an.x) > 2) an.dir = sgn(t.x - an.x); }
      } else if (sp.key === 'lobster') {
        an.next -= dt;
        if (an.next <= 0) { an.next = rr(2, 6); an.walk = Math.random() < 0.6; an.dir = Math.random() < 0.5 ? -1 : 1; an.vd = rr(-1, 1) * 0.01; }
        if (an.walk) { an.x += an.dir * spd * dt; an.d += an.vd * dt; }
      } else { hy = G.groundY(an.hx, an.hd); if (dist(an.x, an.y, an.hx, hy) > 6 * s) { moveFloor(an, an.hx, hy, spd, dt); an.dir = sgn(an.hx - an.x); } }
    }
    dn = dune(an.k);
    if (an.x < dn.x0) { an.x = dn.x0; an.dir = 1; } else if (an.x > dn.x1) { an.x = dn.x1; an.dir = -1; }
    an.d = clamp(an.d, dn.d0, dn.d1);
    settle(an);
  }

  // ----- the gulls -----
  function perchPos(p) {                  // where a perch is now; `moved` when a ship has sailed since the gull landed
    var span, bp;
    if (p.boat) { bp = boatPoint(p.side * 17, -6); PP.x = bp.x; PP.y = bp.y; PP.moved = false; return PP; }
    span = env.perches && env.perches[p.i]; if (!span) return null;
    PP.x = span.x0 + (span.x1 - span.x0) * p.u; PP.y = span.y - 2 * CS; PP.moved = Math.abs(span.x0 - p.x0) > 2;
    return PP;
  }
  function pickPerch() {
    var n = env.perches ? env.perches.length : 0, i = Math.floor(Math.random() * (n + 2));
    if (i >= n) return { boat: true, side: i === n ? 1 : -1, x0: 0, u: 0 };
    return { boat: false, i: i, x0: 0, u: rr(0.15, 0.85) };
  }
  function perchName(p) {
    var x = p.boat ? boat.x : perchPos(p).x;
    if (p.boat) return 'the rowboat';
    if (env.cargo && Math.abs(x - env.cargo.x) < 130 * CS) return 'the cargo ship';
    return 'the ship at the riser';
  }
  function airStep(an, dt) {
    var spd = an.v, t, d, p, ty, dx, dy, sky1 = G.waveY(an.x) - 12 * CS, i, m, best = null, bd, list;
    tick(an, dt); an.bank = Math.max(0, an.bank - dt);
    if (an.state === 'fly') {
      an.glideT -= dt; if (an.glideT <= 0) { an.glideT = rr(2, 6); an.gliding = !an.gliding; }
      an.x += an.dir * spd * dt; an.alt = clamp(an.alt + rr(-1, 1) * 10 * dt, 6, sky1); an.y += (an.alt + Math.sin(an.ph * 1.1) * 3 - an.y) * 2 * dt;
      if ((an.x < 14 * CS && an.dir < 0) || (an.x > W - 14 * CS && an.dir > 0)) { an.dir = -an.dir; an.bank = 0.5; }   // bank and turn at the edge
      an.next -= dt;
      if (an.next <= 0 && an.grow >= 1) {
        an.next = rr(8, 22);
        if (gullCd <= 0 && env.carriers && env.carriers.length && Math.random() < 0.4) {   // a crab with nodules on the back dune's crest: swoop
          list = env.carriers; bd = 240 * CS;
          for (i = 0; i < list.length; i++) { d = Math.abs(list[i].x - an.x); if (d < bd) { bd = d; best = list[i]; } }
          if (best) { gullCd = 150; an.prey = { id: best.id, x: best.x, y: best.y }; an.state = 'swoop'; an.hunt = 0; an.dir = sgn(best.x - an.x); return; }
        }
        if (Math.random() < 0.5) {                                           // a minnow near the surface, within a glide
          list = pop.minnow; bd = 260 * CS;
          for (i = 0; i < list.length; i++) { m = list[i]; if (m.dead || m.y > G.waveY(m.x) + 30 * CS) continue; d = Math.abs(m.x - an.x); if (d < bd) { bd = d; best = m; } }
          if (best) { an.target = best; an.state = 'dive'; an.dir = sgn(best.x - an.x); }
        } else { p = pickPerch(); if (!p.boat && !perchPos(p)) p = null; if (p) { an.perch = p; an.state = 'toPerch'; an.hunt = 0; } }
      }
    } else if (an.state === 'dive') {
      t = an.target; if (!t || t.dead) { an.target = null; an.state = 'rise'; return; }
      ty = G.waveY(t.x) + 2; d = dist(an.x, an.y, t.x, ty);
      if (d < 6 * CS) {
        splash(t.x, ty, 1); an.target = null; an.state = 'rise'; an.alt = rr(10, Math.max(14, sky1 - 4)); an.dives = (an.dives || 0) + 1;
        if (Math.random() < 0.55 && dist(t.x, t.y, t.x, ty) < 30 * CS) { kill(t, 'gull'); an.gulp = 0.45; note('A gull dived and caught a minnow.'); } else note('A gull dived and missed.');
      } else { an.x += (t.x - an.x) / d * spd * 1.8 * dt; an.y += (ty - an.y) / d * spd * 1.8 * dt; if (Math.abs(t.x - an.x) > 2) an.dir = sgn(t.x - an.x); }
    } else if (an.state === 'swoop') {                                       // down through the water to the crest, a grab, and away
      t = an.prey; an.hunt += dt;
      for (i = 0; t && env.carriers && i < env.carriers.length; i++) if (env.carriers[i].id === t.id) { t.x = env.carriers[i].x; t.y = env.carriers[i].y; }   // it moves; follow it
      ty = t.y - 10 * CS; d = dist(an.x, an.y, t.x, ty);
      if (d < 6 * CS || an.hunt > 5) {
        if (d < 6 * CS) { web.gullSnatches++; events.push({ kind: 'gullSnatch', id: t.id, x: t.x, y: ty }); an.carry = 1.6; note('A gull swooped on a crab on the crest and flew off with a nodule.'); bubble(an.x, an.y, 4); }
        an.prey = null; an.state = 'rise'; an.alt = rr(10, Math.max(14, sky1 - 4)); an.dives = (an.dives || 0) + 1;
      } else { an.x += (t.x - an.x) / d * spd * 1.6 * dt; an.y += (ty - an.y) / d * spd * 1.6 * dt; if (Math.abs(t.x - an.x) > 2) an.dir = sgn(t.x - an.x); if (Math.abs(an.y - G.waveY(an.x)) < 3 * CS) splash(an.x, G.waveY(an.x), 0.6); }
    } else if (an.state === 'rise') {
      an.carry = Math.max(0, (an.carry || 0) - dt);
      an.y -= 40 * CS * dt; an.x += an.dir * spd * 0.7 * dt;
      if (an.y <= an.alt) an.state = 'fly';
    } else if (an.state === 'toPerch') {
      p = perchPos(an.perch); an.hunt += dt;
      if (!p || an.hunt > 15) { an.state = 'fly'; an.perch = null; return; }
      dx = p.x - an.x; dy = p.y - an.y; d = Math.sqrt(dx * dx + dy * dy);
      if (d < 3 * CS) { an.state = 'perch'; an.sit = rr(5, 15); an.x = p.x; an.y = p.y; an.perch.x0 = an.perch.boat ? 0 : env.perches[an.perch.i].x0; an.lands = (an.lands || 0) + 1; note('A gull landed on ' + perchName(an.perch) + '.'); }
      else { an.x += dx / d * spd * dt; an.y += dy / d * spd * dt; if (Math.abs(dx) > 3) an.dir = sgn(dx); }
    } else {                                                                 // perched: head turning, until it is time or the ship moves
      p = perchPos(an.perch); an.sit -= dt;
      if (!p || p.moved || an.sit <= 0) { if (p && p.moved) note('A gull took off as the ship moved.'); an.state = 'fly'; an.perch = null; an.alt = rr(8, Math.max(12, sky1 - 6)); an.y -= 2; return; }
      an.x = p.x; an.y = p.y;
    }
  }

  // ----- the fisherman -----
  function boatPose() {
    var b = boat, sa = env.stormA || 0;
    POSE.y = G.waveY(b.x) - 2 * CS;
    POSE.tilt = Math.atan2(G.waveY(b.x + 20) - G.waveY(b.x - 20), 40) + Math.sin(T * (1.1 + sa * 2)) * (0.025 + sa * 0.14);
    return POSE;
  }
  function boatPoint(lx, ly) {            // a point of the boat (in units at scale 1, x along the hull) on the canvas
    var p = boatPose(), c = Math.cos(p.tilt), s = Math.sin(p.tilt);
    lx *= CS; ly *= CS;
    TIP.x = boat.x + lx * c - ly * s; TIP.y = p.y + lx * s + ly * c;
    return TIP;
  }
  function rodTip() { return boatPoint(boat.dir * 26, -28); }
  function cast() {
    var b = boat, tip = rodTip();
    b.bucket--; b.casts++; b.bait = true;
    hook.x = tip.x; hook.y = tip.y; hook.tx = tip.x + b.dir * rr(20, 60) * CS; hook.ty = Math.max(tip.y + 30, rr(top() + 30 * CS, bottom(hook.tx) - 10 * CS));
    b.state = 'cast'; note('The fisherman cast a line.');
  }
  function startNet() {
    var b = boat, list = pop.jelly, i, j, d, best = null, bd = 1e9, by = boatPose().y;
    for (i = 0; i < list.length; i++) { j = list[i]; if (j.dead || j.netted || j.grow < 1) continue; d = dist(j.x, j.y, b.x, by); if (d < bd) { bd = d; best = j; } }
    if (!best) { b.t = 5; return; }
    best.netted = true; b.jelly = best; b.state = 'net';
  }
  function bite(an) {
    var b = boat, sp = an.sp;
    b.bites++; an.target = null; an.full = rr(sp.full ? sp.full[0] : 12, sp.full ? sp.full[1] : 20); an.gulp = 0.45; an.flee = 1.5; bubble(hook.x, hook.y, 3);
    if (sp.key === 'minnow') { b.escaped++; note('A minnow nibbled at the bait and got away.'); return; }   // too small for the hook, and the bait stays
    st[sp.key].baitTaken++; b.bait = false;
    if (Math.random() < sp.hook) { b.hooked++; an.hooked = true; b.fish = an; note(cap(art(sp.name)) + ' took the bait and is hooked!'); }
    else { b.escaped++; note(cap(art(sp.name)) + ' took the bait and got away.'); }
    b.state = 'reel';
  }
  function fisherman(dt) {
    var b = boat, tip, j, f, d, spd = 50 * CS;
    b.t -= dt;
    if (b.state === 'idle') { if (b.t <= 0) { if (b.bucket === 0 || (b.bucket < 3 && Math.random() < 0.4)) startNet(); else cast(); } }
    else if (b.state === 'net') {                                            // the chosen jellyfish rises into the boat
      j = b.jelly; tip = boatPoint(-b.dir * 12, 6);                           // the net goes in over the side behind him
      if (!j || j.dead) { b.jelly = null; b.state = 'idle'; b.t = 4; return; }
      d = dist(j.x, j.y, tip.x, tip.y);
      if (d < 6 * CS) { j.dead = true; dirty = true; b.bucket++; b.netted++; b.jelly = null; b.state = 'idle'; b.t = rr(1, 3); splash(tip.x, G.waveY(tip.x), 0.5); note('The fisherman netted a jellyfish for bait.'); }
      else { j.x += (tip.x - j.x) / d * 45 * CS * dt; j.y += (tip.y - j.y) / d * 45 * CS * dt; }
    } else if (b.state === 'cast') {
      hook.y += 45 * CS * dt; hook.x += (hook.tx - hook.x) * 1.5 * dt;
      if (hook.y >= hook.ty) { hook.y = hook.ty; b.state = 'wait'; b.t = rr(15, 30); }
    } else if (b.state === 'wait') {
      hook.y = hook.ty + Math.sin(T * 0.8) * 2 * CS;
      if (b.t <= 0) { b.bait = false; b.bucket++; b.state = 'reel'; note('Nothing was biting; the fisherman reeled in.'); }
    } else if (b.state === 'reel') {
      tip = rodTip(); d = dist(hook.x, hook.y, tip.x, tip.y);
      if (d < 5 * CS) {
        hook.x = tip.x; hook.y = tip.y; b.state = 'idle'; b.t = rr(3, 7);
        if (b.fish) { f = b.fish; f.dead = true; dirty = true; st[f.sp.key].caught++; b.fish = null; splash(tip.x, G.waveY(tip.x), 1.2); note('The fisherman landed ' + art(f.sp.name) + '.'); }
      } else {
        hook.x += (tip.x - hook.x) / d * spd * dt; hook.y += (tip.y - hook.y) / d * spd * dt;
        if (b.fish) { f = b.fish; f.ph += dt * 2; f.x = hook.x + Math.sin(f.ph * 12) * 3 * CS; f.y = hook.y + 3 * CS; f.a = -Math.PI / 2 + Math.sin(f.ph * 12) * 0.4; if (!f.splashed && f.y < G.waveY(f.x)) { f.splashed = true; splash(f.x, G.waveY(f.x), 1); } }
      }
    }
  }

  // ----- the deep: shapes in the shadows far behind the dunes -----
  // Mantas, a cruising shark, a swirling school, a squid now and then, and an anglerfish along the far dune whose
  // lure glows at night. They are drawn before the far dune, faint and small with distance.
  function stockDeep() {
    var lo = G.surfH + 30, hi = G.farBase - 20, i;
    deep = [
      { kind: 'manta', x: rr(0, W), y: rr(lo, hi), v: rr(10, 16), k: rr(0.55, 0.8), ph: rr(0, TAU) },
      { kind: 'manta', x: rr(0, W), y: rr(lo, hi), v: -rr(8, 13), k: rr(0.4, 0.6), ph: rr(0, TAU) },
      { kind: 'shark', x: rr(0, W), y: rr(lo + 20, hi), v: rr(16, 24) * (Math.random() < 0.5 ? -1 : 1), k: rr(0.5, 0.75), ph: rr(0, TAU) },
      { kind: 'school', x: rr(0, W), y: rr(lo, hi), v: rr(6, 10) * (Math.random() < 0.5 ? -1 : 1), k: rr(0.6, 0.9), ph: rr(0, TAU) },
      { kind: 'angler', x: rr(0, W), y: 0, v: rr(3, 5) * (Math.random() < 0.5 ? -1 : 1), k: rr(0.7, 0.9), ph: rr(0, TAU) },
      { kind: 'squid', x: rr(W * 0.1, W * 0.9), y: G.farBase + 40, v: 0, k: rr(0.6, 0.85), ph: 0, wait: rr(30, 90) }
    ];
    for (i = 0; i < deep.length; i++) deep[i].k *= CS;
  }
  function deepStep(dt) {
    var i, d, L, pulse;
    for (i = 0; i < deep.length; i++) {
      d = deep[i]; L = 60 * d.k;
      if (d.kind === 'squid') {                                              // now and then a squid jets up out of the deep and away
        if (d.wait > 0) { d.wait -= dt; continue; }
        d.ph += dt; pulse = Math.max(0, Math.sin(d.ph * 2.2));
        d.y -= (8 + pulse * 26) * dt * CS;
        if (d.y < G.surfH - 40) { d.y = G.farBase + 40; d.x = rr(W * 0.1, W * 0.9); d.wait = rr(60, 150); d.ph = 0; }
        continue;
      }
      d.ph += dt; d.x += d.v * dt;
      if (d.x < -L * 2) d.x = W + L * 2; else if (d.x > W + L * 2) d.x = -L * 2;
    }
  }
  function drawDeep(ctx, e) {
    use(e); if (!stocked) reset(e);
    var i, j, d, L, dir, flap, a, x, y, still = !!e.still;
    lureList = [];
    ctx.save();
    for (i = 0; i < deep.length; i++) {
      d = deep[i]; L = 60 * d.k; dir = d.v < 0 ? -1 : 1;
      a = 0.16 + 0.22 * clamp((d.k / CS - 0.4) / 0.5, 0, 1);       // the further, the fainter
      ctx.fillStyle = 'rgba(6,26,42,' + a.toFixed(3) + ')'; ctx.strokeStyle = ctx.fillStyle;
      if (d.kind === 'manta') {
        flap = still ? 0 : Math.sin(d.ph * 1.3) * L * 0.12;
        y = d.y + Math.sin(d.ph * 0.4) * 8;
        ctx.save(); ctx.translate(d.x, y); ctx.scale(dir, 1);
        ctx.beginPath(); ctx.moveTo(L * 0.32, 0);
        ctx.quadraticCurveTo(L * 0.1, -L * 0.1, -L * 0.04, -L * 0.36 + flap);   // the near wing, its tip rising and falling
        ctx.quadraticCurveTo(-L * 0.12, -L * 0.1, -L * 0.3, 0);
        ctx.quadraticCurveTo(-L * 0.12, L * 0.05, -L * 0.02, L * 0.14 - flap * 0.35);   // the far wing, foreshortened
        ctx.quadraticCurveTo(L * 0.12, L * 0.06, L * 0.32, 0); ctx.fill();
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-L * 0.3, 0); ctx.quadraticCurveTo(-L * 0.5, Math.sin(d.ph * 2) * 3, -L * 0.72, 2); ctx.stroke();
        ctx.restore();
      } else if (d.kind === 'shark') {
        var tail = still ? 0 : Math.sin(d.ph * 3) * 0.18;
        y = d.y + Math.sin(d.ph * 0.5) * 5;
        ctx.save(); ctx.translate(d.x, y); ctx.scale(dir, 1);
        ctx.beginPath(); ctx.moveTo(L * 0.5, 0);
        ctx.bezierCurveTo(L * 0.4, -L * 0.1, L * 0.05, -L * 0.11, -L * 0.3, -L * 0.03);
        ctx.lineTo(-L * 0.52, -L * 0.18 + tail * L * 0.2); ctx.lineTo(-L * 0.45, 0); ctx.lineTo(-L * 0.5, L * 0.12 + tail * L * 0.2);   // the tail
        ctx.lineTo(-L * 0.3, L * 0.03); ctx.bezierCurveTo(L * 0.05, L * 0.09, L * 0.4, L * 0.07, L * 0.5, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(L * 0.05, -L * 0.09); ctx.lineTo(-L * 0.06, -L * 0.24); ctx.lineTo(-L * 0.12, -L * 0.07); ctx.fill();   // the dorsal fin
        ctx.beginPath(); ctx.moveTo(L * 0.12, L * 0.06); ctx.lineTo(L * 0.02, L * 0.17); ctx.lineTo(-L * 0.02, L * 0.06); ctx.fill();
        ctx.restore();
      } else if (d.kind === 'school') {                 // a bait ball, turning on itself as it drifts
        for (j = 0; j < 26; j++) {
          var ang = j * 2.399 + d.ph * (0.6 + (j % 3) * 0.15), rad = (8 + (j * 7) % 22) * d.k;
          x = d.x + Math.cos(ang) * rad * 1.4; y = d.y + Math.sin(ang) * rad * 0.7 + Math.sin(d.ph * 0.5) * 6;
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
          ctx.beginPath(); ctx.ellipse(0, 0, 3 * d.k, 1.1 * d.k, 0, 0, TAU); ctx.fill(); ctx.restore();
        }
      } else if (d.kind === 'angler') {                 // creeping along the far dune, its lure bobbing ahead of it
        y = G.farY(d.x) - 8 * d.k;
        ctx.save(); ctx.translate(d.x, y); ctx.scale(dir, 1);
        ctx.beginPath(); ctx.ellipse(0, 0, 11 * d.k, 8 * d.k, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-9 * d.k, 0); ctx.lineTo(-17 * d.k, -6 * d.k); ctx.lineTo(-17 * d.k, 6 * d.k); ctx.fill();
        var lx = 16 * d.k, ly = -17 * d.k + Math.sin(d.ph * 1.7) * 2 * d.k;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4 * d.k, -7 * d.k); ctx.quadraticCurveTo(10 * d.k, -20 * d.k, lx, ly); ctx.stroke();
        ctx.restore();
        lureList.push({ x: d.x + dir * lx, y: y + ly, k: d.k, ph: d.ph });
      } else if (d.kind === 'squid') {
        if (d.wait > 0) continue;
        var pulse = Math.max(0, Math.sin(d.ph * 2.2));
        ctx.save(); ctx.translate(d.x, d.y);
        ctx.beginPath(); ctx.ellipse(0, 0, 6 * d.k * (1 - pulse * 0.2), 18 * d.k, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6 * d.k, -14 * d.k); ctx.lineTo(0, -24 * d.k); ctx.lineTo(6 * d.k, -14 * d.k); ctx.fill();
        ctx.lineWidth = 1.2;
        for (j = -3; j <= 3; j++) { ctx.beginPath(); ctx.moveTo(j * 1.6 * d.k, 16 * d.k); ctx.quadraticCurveTo(j * (3 + pulse * 3) * d.k + Math.sin(d.ph * 3 + j) * 2, 30 * d.k, j * (2 + pulse * 5) * d.k, (40 - pulse * 8) * d.k); ctx.stroke(); }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ----- a frame -----
  function update(dt, e) {
    use(e); if (!stocked || W !== stockedW) reset(e);
    if (e.still) return;
    var i, j, sp, list;
    T += dt; gullCd = Math.max(0, gullCd - dt);
    births(); gatherThreats(); schoolsStep(dt);
    for (i = 0; i < SPECIES.length; i++) {
      sp = SPECIES[i]; list = pop[sp.key];
      for (j = 0; j < list.length; j++) { if (list[j].dead) continue; if (sp.home === 'water') waterStep(list[j], dt); else if (sp.home === 'floor') floorStep(list[j], dt); else airStep(list[j], dt); }
    }
    fisherman(dt); deepStep(dt);
    for (i = bubbles.length - 1; i >= 0; i--) { var n = bubbles[i]; n.y -= n.vy * dt; n.x += Math.sin(T * 2.2 + n.ph) * 6 * dt; if (n.y < top() - 6) bubbles.splice(i, 1); }
    for (i = splashes.length - 1; i >= 0; i--) { splashes[i].t += dt; if (splashes[i].t > 0.7) splashes.splice(i, 1); }
    if (dirty) purge();
  }
  function purge() {
    var i, j, k, list;
    for (k = 0; k < SPECIES.length; k++) { list = pop[SPECIES[k].key]; for (i = 0, j = 0; i < list.length; i++) if (!list[i].dead) list[j++] = list[i]; list.length = j; }
    dirty = false;
  }

  // ----- drawing the animals: paper-cutout shapes, each drawn at its own origin facing +x, in units at scale 1 -----
  var DRAW = {
    minnow: function (c) { c.fillStyle = pal.foam; c.beginPath(); c.ellipse(0, 0, 5, 2, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-4, 0); c.lineTo(-8, -2.5); c.lineTo(-8, 2.5); c.closePath(); c.fill(); },
    jelly: function (c, an) {
      var p = Math.sin(an.ph * 2.2), j;
      c.fillStyle = c.strokeStyle = pal.scout; c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, 0, 9 + p * 1.5, 6 - p, 0, Math.PI, TAU); c.fill();
      for (j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(j * 3, 0); c.quadraticCurveTo(j * 3 + Math.sin(an.ph * 3 + j) * 3, 8, j * 3, 16 - p * 2); c.stroke(); }
    },
    piranha: function (c) {
      c.fillStyle = pal.crush; c.beginPath(); c.ellipse(0, 0, 9, 5, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-7, 0); c.lineTo(-12, -4); c.lineTo(-12, 4); c.closePath(); c.fill();
      c.fillStyle = pal.crab; c.beginPath(); c.ellipse(1, 2, 6, 2.4, 0, 0, TAU); c.fill();   // the red belly
      c.fillStyle = pal.foam; c.beginPath(); c.arc(5, -1.5, 1.4, 0, TAU); c.fill();
      c.fillStyle = pal.ink; c.beginPath(); c.arc(5.4, -1.5, 0.7, 0, TAU); c.fill();
      c.strokeStyle = pal.ink; c.lineWidth = 0.8; c.beginPath(); c.moveTo(6, 1.5); c.lineTo(9, 0.5); c.stroke();
    },
    squid: function (c, an) {
      var p = Math.max(0, Math.sin(an.ph * 1.8)), j;
      c.fillStyle = c.strokeStyle = pal.tongue; c.lineWidth = 1.1;
      c.beginPath(); c.ellipse(2, 0, 11, 3.6 * (1 - p * 0.15), 0, 0, TAU); c.fill();   // the mantle, squeezing as it jets
      c.beginPath(); c.moveTo(8, -1); c.lineTo(16, -4); c.lineTo(15, 0); c.lineTo(16, 4); c.lineTo(8, 1); c.closePath(); c.fill();
      for (j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(-7, j * 1.2); c.quadraticCurveTo(-13, j * 2 + Math.sin(an.ph * 3 + j) * 1.5, -17 - p * 6, j * (2.2 + p)); c.stroke(); }
      c.fillStyle = pal.foam; c.beginPath(); c.arc(-4, -1.5, 1.3, 0, TAU); c.fill();
      c.fillStyle = pal.ink; c.beginPath(); c.arc(-4, -1.5, 0.7, 0, TAU); c.fill();
    },
    eel: function (c, an) {
      var i, x, y;
      c.strokeStyle = pal.weed; c.lineWidth = 3.4; c.beginPath();
      for (i = 0; i <= 8; i++) { x = 2 - i * 4; y = Math.sin(an.ph * 6 - i * 0.75) * (1 + i * 0.3); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke(); c.strokeStyle = pal.weed2; c.lineWidth = 1; c.globalAlpha *= 0.6; c.stroke(); c.globalAlpha /= 0.6;   // the same wave again, as a highlight
      c.fillStyle = pal.weed; c.beginPath(); c.ellipse(2, 0, 4, 2.3, 0, 0, TAU); c.fill();
      c.fillStyle = pal.foam; c.beginPath(); c.arc(3.5, -0.8, 0.8, 0, TAU); c.fill();
    },
    snake: function (c, an) {
      var i, x, y;
      c.strokeStyle = pal.ingot; c.lineWidth = 2.2; c.beginPath();
      for (i = 0; i <= 9; i++) { x = 2 - i * 3.3; y = Math.sin(an.ph * 7 - i * 0.8) * (0.8 + i * 0.3); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke(); c.setLineDash([2, 3.5]); c.strokeStyle = pal.ink; c.globalAlpha *= 0.55; c.stroke(); c.setLineDash([]); c.globalAlpha /= 0.55;   // the bands
      c.fillStyle = pal.ingot; c.beginPath(); c.ellipse(x, y, 3.2, 1.4, Math.sin(an.ph * 7 - 7.2) * 0.3, 0, TAU); c.fill();   // the paddle tail
      c.beginPath(); c.ellipse(2.5, 0, 2.8, 1.7, 0, 0, TAU); c.fill();
      c.fillStyle = pal.ink; c.beginPath(); c.arc(3.5, -0.7, 0.6, 0, TAU); c.fill();
    },
    frog: function (c, an) {
      var k = Math.max(0, Math.sin(an.ph * 2.5));
      c.strokeStyle = pal.weed2; c.lineWidth = 1.8; c.beginPath();
      c.moveTo(-4, 2); c.quadraticCurveTo(-8 - k * 5, 5 - k * 3, -13 - k * 7, 1 + k * 4);   // the kicking legs
      c.moveTo(-4, 3); c.quadraticCurveTo(-7 - k * 4, 8 - k * 2, -11 - k * 7, 7 + k * 2); c.stroke();
      c.fillStyle = pal.weed2; c.beginPath(); c.ellipse(0, 0, 6.5, 4.5, 0, 0, TAU); c.fill();
      c.fillStyle = pal.light; c.globalAlpha *= 0.6; c.beginPath(); c.ellipse(1, 1.8, 4.5, 2, 0, 0, TAU); c.fill(); c.globalAlpha /= 0.6;
      c.fillStyle = pal.foam; c.beginPath(); c.arc(3.2, -4, 1.9, 0, TAU); c.fill(); c.beginPath(); c.arc(0.4, -4.4, 1.9, 0, TAU); c.fill();
      c.fillStyle = pal.ink; c.beginPath(); c.arc(3.6, -4, 0.9, 0, TAU); c.fill(); c.beginPath(); c.arc(0.8, -4.4, 0.9, 0, TAU); c.fill();
    },
    turtle: function (c, an) {
      var f = Math.sin(an.ph * 3);
      c.fillStyle = pal.weed2;
      c.beginPath(); c.ellipse(-3, 4, 5, 1.8, 0.4 + f * 0.4, 0, TAU); c.fill();   // flippers
      c.beginPath(); c.ellipse(5, 4, 5, 1.8, -0.4 - f * 0.4, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(-10, 1, 2.5, 1.3, 0.3, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(11, -0.5, 3.6, 2.6, 0, 0, TAU); c.fill();         // head
      c.fillStyle = pal.weed; c.beginPath(); c.ellipse(0, 0, 10, 5.5, 0, Math.PI, TAU); c.lineTo(10, 1.2); c.lineTo(-10, 1.2); c.closePath(); c.fill();   // shell
      c.strokeStyle = pal.weed2; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-5, -0.5); c.lineTo(-2.5, -4); c.lineTo(2.5, -4); c.lineTo(5, -0.5); c.moveTo(-2.5, -4); c.lineTo(0, -0.5); c.lineTo(2.5, -4); c.stroke();
      c.fillStyle = pal.ink; c.beginPath(); c.arc(12.5, -1.3, 0.7, 0, TAU); c.fill();
    },
    shark: function (c, an) {
      var L = 44, tail = Math.sin(an.ph * 3) * 0.18;
      c.fillStyle = pal.metalDark;
      c.beginPath(); c.moveTo(L * 0.5, 0); c.bezierCurveTo(L * 0.4, -L * 0.1, L * 0.05, -L * 0.11, -L * 0.3, -L * 0.03);
      c.lineTo(-L * 0.52, -L * 0.18 + tail * L * 0.2); c.lineTo(-L * 0.45, 0); c.lineTo(-L * 0.5, L * 0.12 + tail * L * 0.2);
      c.lineTo(-L * 0.3, L * 0.03); c.bezierCurveTo(L * 0.05, L * 0.09, L * 0.4, L * 0.07, L * 0.5, 0); c.fill();
      c.beginPath(); c.moveTo(L * 0.05, -L * 0.09); c.lineTo(-L * 0.06, -L * 0.24); c.lineTo(-L * 0.12, -L * 0.07); c.fill();
      c.beginPath(); c.moveTo(L * 0.12, L * 0.06); c.lineTo(L * 0.02, L * 0.17); c.lineTo(-L * 0.02, L * 0.06); c.fill();
      c.fillStyle = pal.foam; c.globalAlpha *= 0.3; c.beginPath(); c.ellipse(L * 0.08, L * 0.04, L * 0.3, L * 0.04, 0, 0, TAU); c.fill(); c.globalAlpha /= 0.3;   // a pale belly
      c.beginPath(); c.arc(L * 0.36, -L * 0.03, 1.2, 0, TAU); c.fill();
    },
    shrimp: function (c) {
      c.strokeStyle = c.fillStyle = pal.tongue; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(0, -5.5, -4, -1.5); c.stroke();
      c.beginPath(); c.moveTo(-4, -1.5); c.lineTo(-6.5, -4); c.lineTo(-6.5, 0.5); c.closePath(); c.fill();   // the tail fan
      c.lineWidth = 0.6; c.beginPath(); c.moveTo(2, 0); c.lineTo(1.5, 2.5); c.moveTo(0.5, -1); c.lineTo(-0.5, 2.2); c.moveTo(-1.5, -1); c.lineTo(-2.5, 1.8); c.moveTo(4, -0.5); c.lineTo(8, -3); c.stroke();
      c.fillStyle = pal.ink; c.beginPath(); c.arc(3.8, -1, 0.6, 0, TAU); c.fill();
    },
    crawler: function (c, an) {
      var l = Math.sin(an.ph * 10) * 0.6;
      c.fillStyle = c.strokeStyle = pal.ink; c.beginPath(); c.ellipse(0, 0, 1.4, 0.9, 0, 0, TAU); c.fill();
      c.lineWidth = 0.5; c.beginPath(); c.moveTo(-1, 0); c.lineTo(-2.2, 1 + l); c.moveTo(0, 0.2); c.lineTo(0.3, 1.4 - l); c.moveTo(1, 0); c.lineTo(2.2, 1 + l); c.stroke();
    },
    lobster: function (c, an) {
      var g = Math.sin(an.ph * 8) * (an.walk || an.target ? 1 : 0.2), i;
      c.fillStyle = c.strokeStyle = pal.crabDark; c.lineWidth = 0.9; c.beginPath();
      for (i = -1; i <= 1; i++) { c.moveTo(i * 2.5, 1); c.lineTo(i * 2.5 + g * 2 * (i === 0 ? -1 : 1), 5); }   // legs
      c.moveTo(6, -2); c.lineTo(16, -7); c.moveTo(6, -1); c.lineTo(17, -4); c.stroke();                         // antennae
      c.beginPath(); c.ellipse(0, 0, 8, 3.5, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(-10, 0.5, 5, 2.4, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-13, 0.5); c.lineTo(-17, -2.5); c.lineTo(-17, 3.5); c.closePath(); c.fill();
      c.lineWidth = 2; c.beginPath(); c.moveTo(6, -1.5); c.lineTo(10, -4); c.moveTo(6, 1.5); c.lineTo(10, 4); c.stroke();
      c.beginPath(); c.ellipse(12, -4.5, 3.6, 2, -0.3, 0, TAU); c.fill(); c.beginPath(); c.ellipse(12, 4.5, 3.6, 2, 0.3, 0, TAU); c.fill();   // claws
      c.fillStyle = pal.foam; c.beginPath(); c.arc(6, -1.8, 0.8, 0, TAU); c.fill();
    },
    seahorse: function (c, an) {
      c.strokeStyle = c.fillStyle = pal.ingot; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(0, -8); c.bezierCurveTo(4.5, -4, 4.5, 4, 0.5, 8); c.bezierCurveTo(-2.5, 11, -1, 13.5, 1.5, 12); c.stroke();   // body and curled tail
      c.fillStyle = pal.ingotDark; c.globalAlpha *= 0.7; c.beginPath(); c.moveTo(1, -3); c.lineTo(-3 + Math.sin(an.ph * 9), 0); c.lineTo(1.5, 3); c.closePath(); c.fill(); c.globalAlpha /= 0.7;   // the fluttering fin
      c.fillStyle = pal.ingot; c.beginPath(); c.ellipse(0.5, -9.5, 3.3, 2.7, -0.2, 0, TAU); c.fill();
      c.lineWidth = 1.3; c.beginPath(); c.moveTo(3, -10); c.lineTo(7.5, -9.2); c.stroke();   // snout
      c.fillStyle = pal.ink; c.beginPath(); c.arc(1.2, -10.2, 0.7, 0, TAU); c.fill();
    },
    gull: function (c, an) {
      var perched = an.state === 'perch', f = perched ? 0 : an.gliding ? 0.15 : Math.sin(an.ph * 9), h = perched ? Math.sin(an.ph * 0.9) * 1.5 : 0;
      c.fillStyle = pal.foam; c.strokeStyle = pal.ink; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(0, 0, 4.5, 2, 0, 0, TAU); c.fill(); c.stroke();
      if (perched) { c.beginPath(); c.moveTo(-3, -1); c.lineTo(-9, 0); c.lineTo(-3, 1); c.moveTo(-1, 2); c.lineTo(-1, 4); c.moveTo(1, 2); c.lineTo(1, 4); c.stroke(); }   // folded wings and legs
      else { c.lineWidth = 2; c.beginPath(); c.moveTo(-10, -1.5 - f * 4.5); c.lineTo(-5, -1); c.lineTo(0, -2.5); c.lineTo(5, -1); c.lineTo(10, -1.5 - f * 4.5); c.stroke(); c.lineWidth = 1; c.strokeStyle = pal.foam; c.stroke(); }   // the M, inked then white
      c.fillStyle = pal.foam; c.strokeStyle = pal.ink; c.lineWidth = 0.6; c.beginPath(); c.arc(4.5 + h, -1.8, 1.9, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = pal.ingot; c.beginPath(); c.moveTo(6 + h, -2.2); c.lineTo(9 + h, -1.3); c.lineTo(6 + h, -0.8); c.closePath(); c.fill();
      c.fillStyle = pal.ink; c.beginPath(); c.arc(5.2 + h, -2.3, 0.5, 0, TAU); c.fill();
      if (an.carry > 0) { c.fillStyle = pal.nodule || pal.rockDark; c.beginPath(); c.arc(9.5 + h, -0.6, 1.8, 0, TAU); c.fill(); }   // the nodule in its beak
    }
  };
  function drawOne(c, an, s) {
    var sp = an.sp;
    if (an.gulp > 0) s *= 1 + 0.25 * Math.sin(an.gulp / 0.45 * Math.PI);
    c.save(); c.translate(an.x, an.y);
    if (sp.home === 'water' && !sp.upright && sp.key !== 'jelly') { c.rotate(an.a); if (Math.cos(an.a) < 0) c.scale(1, -1); }   // facing its heading, never belly up
    else if (sp.key !== 'jelly') c.scale(sp.home === 'water' ? sgn(Math.cos(an.a)) : (an.state === 'perch' || an.bank <= 0 ? an.dir : an.dir * Math.cos(an.bank * Math.PI)), 1);
    c.scale(s, s); c.globalAlpha = sp.alpha;
    DRAW[sp.key](c, an);
    c.restore();
  }
  var WATER_ORDER = ['jelly', 'minnow', 'turtle', 'frog', 'snake', 'eel', 'squid', 'piranha', 'shark'], FLOOR_ORDER = ['crawler', 'shrimp', 'lobster', 'seahorse'];
  function drawWater(ctx, e) {
    use(e); if (!stocked) reset(e);
    var i, j, list, n;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (i = 0; i < WATER_ORDER.length; i++) { list = pop[WATER_ORDER[i]]; for (j = 0; j < list.length; j++) if (!list[j].dead) drawOne(ctx, list[j], CS * list[j].grow); }
    ctx.strokeStyle = pal.bubble || pal.foam; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
    for (i = 0; i < bubbles.length; i++) { n = bubbles[i]; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  function drawRock(c, r) {
    var s = G.scaleAt(r.d), y = G.groundY(r.x, r.d);
    c.beginPath(); c.ellipse(r.x, y - r.ry * s * 0.5, r.rx * s, r.ry * s, r.tilt, 0, TAU); c.fill(); c.stroke();
    if (r.two) { c.beginPath(); c.ellipse(r.x + r.rx * s * 1.1, y - r.ry * s * 0.25, r.rx * s * 0.5, r.ry * s * 0.5, -r.tilt, 0, TAU); c.fill(); c.stroke(); }
  }
  function drawFloor(ctx, e, k) {
    use(e); if (!stocked) reset(e);
    var i, j, list, an;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = pal.rock; ctx.strokeStyle = pal.rockLine; ctx.lineWidth = 1;
    for (i = 0; i < rocks.length; i++) if (rocks[i].k === k) drawRock(ctx, rocks[i]);
    for (i = 0; i < FLOOR_ORDER.length; i++) { list = pop[FLOOR_ORDER[i]]; for (j = 0; j < list.length; j++) { an = list[j]; if (an.k === k && !an.dead) drawOne(ctx, an, G.scaleAt(an.d) * an.grow); } }
    ctx.restore();
  }
  function drawBoat(c) {
    var b = boat, p = boatPose(), i;
    c.save(); c.translate(b.x, p.y); c.rotate(p.tilt); c.scale(CS, CS);
    c.save(); c.scale(b.dir, 1);                                             // the fisherman sits amidships, facing the way he casts
    c.strokeStyle = pal.mechDark; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -3); c.lineTo(-15, 6); c.stroke();   // an oar shipped over the side
    c.fillStyle = pal.crush; c.beginPath(); c.ellipse(-1, -9, 4, 5.5, 0, 0, TAU); c.fill();                              // his jacket
    c.fillStyle = pal.light; c.beginPath(); c.arc(0, -16.5, 3, 0, TAU); c.fill();
    c.fillStyle = pal.hat; c.beginPath(); c.ellipse(0, -18.5, 4.8, 1.5, 0, 0, TAU); c.fill(); c.fillRect(-2.6, -22, 5.2, 3.5);   // a sou'wester
    c.strokeStyle = pal.crush; c.lineWidth = 2.2; c.beginPath(); c.moveTo(1, -10); c.lineTo(6, -12); c.stroke();
    c.strokeStyle = pal.mechDark; c.lineWidth = 1; c.beginPath(); c.moveTo(3, -11); c.lineTo(26, -28); c.stroke();        // the rod
    c.fillStyle = pal.metalDark; c.fillRect(-13, -9, 5, 5);                                                                 // the bait bucket, jellyfish showing over the rim
    c.fillStyle = pal.scout; for (i = 0; i < b.bucket; i++) { c.beginPath(); c.ellipse(-10.5 + (i - 1) * 1.6, -9, 1.3, 1, 0, Math.PI, TAU); c.fill(); }
    c.restore();
    c.fillStyle = pal.mech; c.strokeStyle = pal.mechDark; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-17, -4); c.lineTo(17, -4); c.quadraticCurveTo(15, 4, 8, 5); c.lineTo(-8, 5); c.quadraticCurveTo(-15, 4, -17, -4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = pal.mechDark; c.fillRect(-4, -5, 8, 1.6);   // the thwart
    c.restore();
  }
  function drawSurface(ctx, e) {
    use(e); if (!stocked) reset(e);
    var i, j, list, sp, tip, s, a;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    drawBoat(ctx);
    if (boat.state === 'cast' || boat.state === 'wait' || boat.state === 'reel') {   // the line, the hook, and the bait on it
      tip = rodTip();
      ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.quadraticCurveTo((tip.x + hook.x) / 2 + (e.tide || 0) * 8 * CS, (tip.y + hook.y) / 2, hook.x, hook.y); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hook.x, hook.y + 2 * CS, 2 * CS, -Math.PI / 2, Math.PI * 0.9); ctx.stroke();
      if (boat.bait) {
        ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.strokeStyle = pal.scout; ctx.lineWidth = 0.8; sp = 1 + 0.12 * Math.sin(T * 1.2);
        ctx.beginPath(); ctx.ellipse(hook.x, hook.y + 2 * CS, 4 * CS * sp, 3 * CS, 0, Math.PI, TAU); ctx.fill();
        ctx.beginPath(); for (j = -1; j <= 1; j++) { ctx.moveTo(hook.x + j * 2 * CS, hook.y + 2 * CS); ctx.lineTo(hook.x + j * 2.5 * CS, hook.y + 8 * CS); } ctx.stroke();
      }
    }
    ctx.strokeStyle = pal.foam; ctx.lineWidth = 1.5;                            // splash rings
    for (i = 0; i < splashes.length; i++) { s = splashes[i]; a = 1 - s.t / 0.7; ctx.globalAlpha = a * 0.8; ctx.beginPath(); ctx.ellipse(s.x, s.y, (6 + 30 * s.t) * s.k * CS, (2 + 10 * s.t) * s.k * CS, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    list = pop.gull;
    for (i = 0; i < list.length; i++) if (!list[i].dead) drawOne(ctx, list[i], CS * list[i].grow);
    ctx.restore();
  }

  // ----- the lab report -----
  function report() {
    var species = SPECIES.slice().sort(function (a, b) { return a.level - b.level || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); }).map(function (sp) {
      var s = st[sp.key] || { born: 0, eaten: 0, eatenBy: {}, caught: 0, baitTaken: 0 }, by = {}, k;
      for (k in s.eatenBy) by[k] = s.eatenBy[k];
      return { key: sp.key, name: sp.name, plural: sp.plural, emoji: sp.emoji, level: sp.level, count: pop[sp.key] ? pop[sp.key].length : 0, target: sp.target || 0, born: s.born, eaten: s.eaten, eatenBy: by, caught: s.caught, baitTaken: s.baitTaken };
    });
    return {
      species: species,
      fisherman: { casts: boat.casts, netted: boat.netted, bites: boat.bites, hooked: boat.hooked, escaped: boat.escaped, bucket: boat.bucket, state: boat.state },
      web: { sharkScares: web.sharkScares, gullSnatches: web.gullSnatches },
      log: log.map(function (e) { return { t: e.t, text: e.text }; })
    };
  }
  function animals() { var all = [], i; for (i = 0; i < SPECIES.length; i++) if (pop[SPECIES[i].key]) all = all.concat(pop[SPECIES[i].key]); return all; }   // for the tests

  function drainEvents() { var e = events; events = []; return e; }
  return { reset: reset, update: update, drawDeep: drawDeep, drawWater: drawWater, drawFloor: drawFloor, drawSurface: drawSurface, lures: function () { return lureList; }, report: report, animals: animals, events: drainEvents, SPECIES: SPECIES };
}
if (typeof module !== 'undefined') module.exports = CrabEco;
