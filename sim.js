// ===== The crab economy: a deterministic simulation =====
// Everything here runs on a fixed track 1000 units long and three dunes deep, in fixed time steps,
// with its own seeded random numbers. The same choices therefore give the same results on every
// screen and at every viewing speed. Drawing code reads this state and never changes it.
function CrabSim() {
  'use strict';
  var K = {
    STEP: 1 / 60,        // simulation time step, in seconds
    SEED: 20261005,
    // places along the track, left to right: the field, a row of building plots, then the lava
    FIELD0: 20, FIELD1: 540, STIRLING: 852, RIM: 874, LAVA: 888, END: 1000,
    // The line's buildings stand on plots along the front dune and can be moved between them.
    // By default they run right to left from the lava, with the crabs' den at the field's edge.
    // The Stirling engine and the energy bots' base stay by the lava, where the heat is.
    PLOTS: [560, 603, 646, 689, 732, 775, 818],
    BUILDINGS: ['den', 'workshop', 'ore', 'crush', 'bar', 'stock', 'collector'],
    LAYOUT: { den: 0, workshop: 1, ore: 2, crush: 3, bar: 4, stock: 5, collector: 6 },
    // the den: crabs standing idle make decorations for it, and a homely den makes for better mornings and dances
    DECOR_WORK: 300, DECOR_BASE: 4, DECOR_PER_LV: 2, DECOR_MORNING: 0.01, DECOR_MORNING_TIME: 3, DECOR_DANCE: 0.05,
    DECOR_KINDS: ['shellGarland', 'seaGlass', 'cairn', 'kelpWreath', 'coral', 'sandCastle', 'noduleTotem'],
    CREST: 0.035, CREST_SLOW: 0.5,   // climbing over the lip between two dunes is slow going
    // the refuel post: an extension cord runs from the Stirling engine to a post the energy bots plug into;
    // the player can set it down anywhere along the front dune, or let the bots drag it to where the work is
    CORD: 520, POST_MOVE_EVERY: 25, POST_MIN_MOVE: 110,
    // the tide's current pushes the post along the sand; once it slips this far from home a bot drags it back
    TIDE_DRIFT: 3, STORM_DRIFT: 3, POST_SLIP: 40,
    // friends: idle crabs side by side dance together, which recharges them and clears their heads
    DANCE_RANGE: 42, DANCE_CHARGE: 0.012, DANCE_RECOVER: 2,
    // a crab that slept or danced enough in a day starts the next one fresh: faster for the first minute
    REST_FOR_BONUS: 20, MORNING_BONUS: 1.25, MORNING_TIME: 90,
    // the sea: a four-minute tide that washes nodules up at high water and buries flags at low water,
    // an octopus that comes for the ore, and pearls in the richest deposits
    TIDE_PERIOD: 240, TIDE_HIGH: 0.75, SURGE_EVERY: 12, BURY_EVERY: 20, BURY_CHANCE: 0.5,
    OCTO_FIRST: 90, OCTO_EVERY: [100, 200], OCTO_SPEED: 45, OCTO_SCARE: 28, OCTO_GRAB: 1.5,
    PEARL_Q: 0.75, PEARL_CHANCE: 0.04, PEARL_VALUE: [60, 90, 130],
    // storms: forty seconds of rough water that stir up nodules, bury flags, slow walkers, and rock the ship
    STORM_FIRST: 300, STORM_EVERY: [360, 540], STORM_TIME: 40, STORM_WARN: 20, STORM_WASH: 4, STORM_BURY: 8, STORM_WALK: 0.85, STORM_RISER: 2,
    // lava surges: thirty seconds of swelling lava; smelting and forging go twice as fast and the engine makes double charge
    SURGE_FIRST: 200, SURGE_EVERY: [300, 480], SURGE_TIME: 30, SURGE_SPEED: 2,
    // ship orders: a cargo ship wants a batch of ingots by a deadline; it pays a premium on each one and a bonus
    // for the lot, and a good record (reputation, up to five stars) raises the premium on later orders
    // the hermit-crab trader: walks in every few minutes, sets up shop for a minute, and swaps goods for bars or ingots
    TRADER_FIRST: 240, TRADER_EVERY: [240, 360], TRADER_STAY: 60, TRADER_SPOT: 500, TRADER_SPEED: 40,
    TRADES: {
      bits: { pay: { bars: 1 } },     // two spare drill bits: repair bots fit them without going to the forge
      legs: { pay: { bars: 1 } },     // two spare legs, the same for maintenance bots
      map: { pay: { ingots: 2 } },    // a treasure map: three rich flags appear on the claimed dunes
      cells: { pay: { ingots: 1 } },  // a crate of cells: the engine's store and every energy bot filled up
      gear: { pay: { bars: 3 } },     // a gold gear: the whole crew gets a morning bonus right away
      lucky: { pay: { bars: 4 } }     // a lucky shell: the next strike on a rich flag finds a pearl for sure
    },
    // the sea turtle: swims across now and then and gives one crab with a long way to go a ride
    TURTLE_FIRST: 180, TURTLE_EVERY: [150, 270], TURTLE_SPEED: 85, TURTLE_REACH: 50, TURTLE_DIP: 160, TURTLE_MIN_TRIP: 160,
    ORDER_FIRST: 150, ORDER_EVERY: [180, 300], ORDER_TIME: 100, ORDER_PREMIUM: 0.3, ORDER_BONUS: 6, REP_STEP: 0.05, REP_MAX: 5,
    // the rival crew behind the ridge: from Ingot Magnate on it races you for every order, filling it in 75-120% of the
    // order's time, divided by its drive. If it fills the order first the ship sails with theirs, and like a missed order
    // that costs a reputation star.
    // Each order you win drives it harder; each it wins lets it ease off.
    RIVAL_RANK: 3, RIVAL_PACE: [0.75, 1.2], RIVAL_PUSH: 1.08, RIVAL_EASE: 0.94, RIVAL_DRIVE: [0.7, 1.5],
    VENT_IN: 880, VENT_X: 918,   // where crabs step into the thermal vent, and the column it rises in
    DEPTH: 300,          // crossing the dunes from the back crest to the front costs as much as 300 units of track
    // movement, in track units per second: each kind walks at its own pace, crushers slowest, energy bots fastest
    SPEEDS: { crush: 45, smelt: 52, drill: 56, repair: 60, mech: 64, haul: 68, scout: 78, energy: 95 },
    T_RISE: 1.8, GLIDE: 200,     // riding the vent up, then swimming down and sideways, faster than any walk
    // stock limits
    ORE_CAP: [15, 24, 36], BAR_CAP: [10, 16, 24], STOCK_CAP: 40, FIELD_CAP: 24, FLAG_CAP: 8, CARRY: 3, START_NODULES: 6,
    // task times, in seconds
    T_SCAN: 3.4, T_DRILL: 2.8, T_PICK: 0.6, T_STACK: 0.3, T_CRUSH: 4.5, T_GRAB: 0.3, T_SMELT: 3.0, T_DROP: 0.3,
    T_CHARGE: 0.8, T_REPAIR: 2.4, T_FETCH: 0.4, T_PLUG: 0.35, T_FORGE: 1.4,
    // recipe and luck
    NOD_PER_BAR: 2, BONUS_NODULE: 0.2, WILDCAT: 0.25,
    // a broken bit drills slower, strikes less often, and draws three times the power
    BROKEN_TIME: 1.6, BROKEN_LUCK: 0.6, BROKEN_DRAIN: 3,
    // a crab that has lost a leg limps, and any crab can lose one while it works
    LEG_RATE: 0.0003, LIMP: 0.55,
    // wear: work builds it, rest clears it; after four minutes without a break, crabs break more often and tire
    WEAR_FREE: 240, WEAR_SCALE: 300, WEAR_MAX: 1, TIRE: 1000, TIRE_MAX: 0.2, NIGHT_FIX: 1.3, REST_CHARGE: 0.03, REST_RECOVER: 4, IDLE_RECOVER: 1,
    // energy
    DRAIN: 0.022, LOW: 0.2, SLOW: 0.35, CHARGES: 4, CHARGE_BELOW: 0.6, EBOT_WEAR: 0.03, EBOT_BROKEN: 0.45,
    DOCKS: 2, HEAT_CAP: 12,   // the engine charges two bots at once and banks up to twelve charges
    // a day of three minutes is 24 hours of crab time (7.5 seconds an hour), starting at dawn, 06:00.
    // Night runs from 20:00 to 06:00. Working at night is half speed, unless the crab slept or danced in the
    // last four hours. Scouts like the dark and work nights at full speed.
    DAY: 180, DAWN: 6, NIGHT_FROM: 20, NIGHT_TO: 6, NIGHT_SLOW: 0.5, REST_WINDOW: 4,
    // glowing plankton: three patches drift over the sand, pushed by the tide. At night a crab inside one sees
    // its way and is not slowed, rested or not. Storms and ships feed a bloom (0.25 to 1) that widens the patches.
    GLOW_X: [150, 480, 810], GLOW_D: [0.8, 0.5, 0.2], GLOW_R: 40, GLOW_WANDER: 2, GLOW_DRIFT: 5,
    GLOW_STORM: 0.08, GLOW_SHIP: 0.2, GLOW_EBB: 0.006,
    SHIFTS: ['all', 'day8', 'double8', 'ab', 'relief', 'custom'],
    // workday patterns: shifts of `len` hours from `start`, `count` a day with `rest` hours between, and the
    // crew split into `groups` that start in turn, evenly spread through the day
    PRESETS: { day8: { start: 8, len: 8, count: 1, rest: 3, groups: 1 }, double8: { start: 5, len: 8, count: 2, rest: 3, groups: 1 } },
    // overclock: every delivery banks seconds of speed; a steady flow of deliveries banks more and sells dearer
    OC_PER_SALE: 0.6, OC_MAX: 30, OC_SPEED: 1.5, OC_DRAIN: 1.6, OC_WEAR: 2,
    FLOW_GAP: 6, FLOW_MAX: 20, FLOW_STEP: 0.02,
    // money
    PRICE: 12, START_CREDITS: 120, RESERVE: 2, HIRE_STEP: 0.15, REFUND: 0.5, RANK_BONUS: 0.1,
    ROLES: ['scout', 'drill', 'haul', 'crush', 'smelt', 'energy', 'repair', 'mech'],
    HIRE: { scout: 30, drill: 35, haul: 25, crush: 40, smelt: 40, energy: 35, repair: 35, mech: 35 },
    START: { scout: 1, drill: 2, haul: 2, crush: 1, smelt: 1, energy: 1, repair: 1, mech: 0 },
    // every crab has a name; a crab that has done enough of its own job becomes a veteran, up to three stars,
    // and works and walks a little faster at that job (not at the backup job)
    CRAB_NAMES: ['Pinch', 'Clawdia', 'Shelly', 'Barnacle', 'Snips', 'Coral', 'Bubbles', 'Nipper', 'Pebble', 'Kelp',
      'Scuttle', 'Marina', 'Sandy', 'Rusty', 'Pearl', 'Clicky', 'Dune', 'Tidy', 'Brine', 'Mussel', 'Limpet', 'Sprocket',
      'Ripple', 'Gravel', 'Nugget', 'Krill', 'Wrench', 'Sideways', 'Zinc', 'Cobalt', 'Ingrid', 'Tango', 'Bolt', 'Flint',
      'Murex', 'Whelk', 'Cockle', 'Dredge', 'Pumice', 'Basalt', 'Lagoon', 'Spindle', 'Gizmo', 'Ember', 'Tinker', 'Abalone',
      'Puddle', 'Sprat', 'Quartz', 'Nautilus', 'Scampi', 'Copper', 'Glimmer', 'Tumble', 'Riff', 'Sonar', 'Clamshell', 'Ozzy'],
    VET_AT: { scout: 15, drill: 40, haul: 20, crush: 25, smelt: 20, energy: 35, repair: 7, mech: 2 },   // jobs for the first star: about 6 minutes' work
    VET_LEVELS: [1, 3, 6], VET_BONUS: 0.05,                                   // stars at 1x, 3x and 6x those jobs; +5% a star
    // the three dunes, front to back; deeper dunes hold richer, larger deposits
    ZONES: [
      { name: 'Front dune', d0: 0.70, d1: 0.97, q: 0, size: 0 },
      { name: 'Middle dune', d0: 0.38, d1: 0.62, q: 0.08, size: 1 },
      { name: 'Back dune', d0: 0.06, d1: 0.30, q: 0.15, size: 2 }
    ],
    UP: {
      den: { costs: [120, 300, 650, 1200, 2000], vals: [10, 14, 18, 24, 30, 36] },
      field: { costs: [200, 550], vals: [1, 2, 3] },
      bits: { costs: [150, 380], vals: [0.045, 0.025, 0.012] },
      scanner: { costs: [140, 360], vals: [[0.5, 0], [0.62, 0.07], [0.74, 0.13]] },
      engine: { costs: [140, 420], vals: [32, 56, 90] },   // charges the Stirling engine makes a minute
      riser: { costs: [100, 300], vals: [3, 1.8, 1] },
      yard: { costs: [90, 240], vals: [0, 1, 2] }
    },
    // research: each technology unlocks the worker upgrades for some roles
    TECH: {
      sonar: { cost: 150, roles: ['scout'] },
      metallurgy: { cost: 250, roles: ['drill', 'smelt'] },
      hydraulics: { cost: 250, roles: ['haul', 'crush'] },
      power: { cost: 300, roles: ['energy'] },
      engineering: { cost: 300, roles: ['repair', 'mech'] }
    },
    // worker upgrades: bought once, they apply to every crab of the role
    WUP: {
      nightEyes: { role: 'scout', cost: 80 }, nightBattery: { role: 'scout', cost: 90 }, flagBundle: { role: 'scout', cost: 110 }, moonFlags: { role: 'scout', cost: 120 },
      wideSonar: { role: 'scout', cost: 120 }, deepSonar: { role: 'scout', cost: 200 },
      diamondTips: { role: 'drill', cost: 180 }, twinAugers: { role: 'drill', cost: 220 },
      bigHopper: { role: 'haul', cost: 150 }, springLegs: { role: 'haul', cost: 150 },
      hydraulicClaws: { role: 'crush', cost: 200 }, shockPads: { role: 'crush', cost: 120 },
      heatTongs: { role: 'smelt', cost: 200 }, twinTongs: { role: 'smelt', cost: 260 },
      bigCells: { role: 'energy', cost: 160 }, fastPlug: { role: 'energy', cost: 140 },
      pocketForge: { role: 'repair', cost: 180 }, quickHands: { role: 'repair', cost: 120 },
      mechForge: { role: 'mech', cost: 180 }, toughJoints: { role: 'mech', cost: 220 }
    },
    LONG_EVERY: 15, LONG_MAX: 240,   // whole-game history for the Ledger: a sample every 15 s, thinned as it fills
    RANKS: [[0, 'Sand Scraper'], [150, 'Pebble Boss'], [400, 'Nodule Baron'], [1000, 'Ingot Magnate'], [2500, 'Lava Lord'], [6000, 'Crab Tycoon']]
  };
  var STATS = ['scans', 'finds', 'holes', 'strikes', 'stacked', 'bars', 'ingots', 'sold', 'revenue', 'metalUsed', 'barsUsed',
    'bitsBroken', 'ebotsBroken', 'legsLost', 'repairs', 'mends', 'charges', 'rides', 'spent', 'flowBonus', 'danced', 'mornings',
    'washed', 'buried', 'stolen', 'octopi', 'shooed', 'pearls', 'pearlCredits', 'storms', 'surges', 'orders', 'ordersFilled', 'ordersLost', 'orderCredits', 'decorations',
    'backup', 'nightFlags', 'trades', 'turtleRides', 'glowLit'];
  var RESUME = { scout: 'pick', drill: 'pick', haul: 'seek', crush: 'wait', smelt: 'toBar', energy: 'idle', repair: 'idle', mech: 'idle' };
  var BACK = { bseek: 1, bpick: 1, bhaul: 1, bstack: 1 };    // the backup job: carrying nodules to the ore pile

  var seed = K.SEED, S = null, events = [], dt = K.STEP;
  function sr() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function srr(a, b) { return a + sr() * (b - a); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function emit(type, a, b) { events.push({ type: type, a: a, b: b }); tally(type, a, b); }
  function up(id) { return K.UP[id].vals[S.lv[id]]; }
  function oreCap() { return K.ORE_CAP[up('yard')]; }
  function barCap() { return K.BAR_CAP[up('yard')]; }
  function zoneOf(d) { return d >= 0.66 ? 0 : (d >= 0.34 ? 1 : 2); }
  function spot() {                       // a random place in the dunes the crew has claimed
    var z = K.ZONES[Math.floor(sr() * up('field'))];
    return { x: srr(K.FIELD0 + 10, K.FIELD1 - 10), d: srr(z.d0, z.d1) };
  }
  // how hard a crab can go right now: flat batteries, tiredness, and overclock all count
  function spd(c) { return K.SPEEDS[c.role] * (c.role === 'haul' && has('springLegs') ? 1.3 : 1); }
  function flagCap() { return has('flagBundle') ? 14 : K.FLAG_CAP; }
  function tired(c) {                      // would drag at night: scouts, the A/B night repair crew and rested crabs do not
    if (!S.si || !S.si.night || c.role === 'scout') return false;
    if (S.shift === 'ab' && (c.role === 'repair' || c.role === 'mech')) return false;
    return S.t - c.lastRest > K.REST_WINDOW * K.DAY / 24;
  }
  function stir() { S.bloom = Math.min(1, S.bloom + K.GLOW_SHIP); }   // a ship coming or going churns the plankton up
  function glowR() { return K.GLOW_R * (0.5 + S.bloom); }
  function lit(x, d) {                     // inside a patch of glowing plankton (the track wraps round for the patches)
    for (var i = 0, p, dx; i < S.glow.length; i++) {
      p = S.glow[i]; dx = Math.abs(x - p.x); dx = Math.min(dx, K.END - dx);
      if (dx + Math.abs(d - p.d) * K.DEPTH < glowR()) return true;
    }
    return false;
  }
  function nightSlow(c) { return tired(c) && !lit(c.x, c.d) ? K.NIGHT_SLOW : 1; }
  function pace(c) {
    return (BACK[c.state] ? 1 : 1 + K.VET_BONUS * c.stars) * (c.bat < K.LOW ? K.SLOW : 1) * (1 - Math.min(K.TIRE_MAX, Math.max(0, c.wear - K.WEAR_FREE) / K.TIRE)) * (S.oc ? K.OC_SPEED : 1) *
      (c.fresh > 0 ? K.MORNING_BONUS + S.decor.length * K.DECOR_MORNING : 1) * nightSlow(c) *
      (S.shift === 'ab' && S.si && S.si.night && (c.role === 'repair' || c.role === 'mech') ? K.NIGHT_FIX : 1);   // the night crew
  }
  function has(id) { return !!S.wu[id]; }
  function carry() { return has('bigHopper') ? 5 : K.CARRY; }
  function charges() { return has('bigCells') ? 6 : K.CHARGES; }
  function layoutPos() {                  // where each building stands, and the spots crabs work at beside it
    var x = function (b) { return K.PLOTS[S.layout[b]]; };
    S.pos = { DEN: x('den'), WORKSHOP: x('workshop'), ORE: x('ore'), HAUL_STAND: x('ore') - 24, CRUSH: x('crush'), BAR: x('bar'), GRAB: x('bar') + 16,
      STOCK: x('stock'), COLLECTOR: x('collector') };
  }
  function wearMult(c) { return 1 + Math.min(K.WEAR_MAX, Math.max(0, c.wear - K.WEAR_FREE) / K.WEAR_SCALE); }

  function reset(opts) {
    var i, r, crew, k, p;
    opts = opts || {};
    seed = opts.seed || K.SEED;
    events = [];
    S = {
      t: 0, credits: K.START_CREDITS, earned: 0, heat: 6, price: K.PRICE, walk: 0, tick: 0, liftT: 0,
      nodules: [], flags: [], ore: 0, bars: 0, stock: 0, reserve: K.RESERVE, docks: [],
      post: { x: K.STIRLING - 60, d: 0.86, auto: true, carrier: null, moved: -99, home: { x: K.STIRLING - 60, d: 0.86 }, drift: 0 }, day: 1,
      tide: 0, nextSurge: 0, nextBury: 0, octo: null, nextOcto: K.OCTO_FIRST,
      storm: false, stormAt: K.STORM_FIRST, stormEnd: 0, stormWarned: false, nextStormWash: 0, nextStormBury: 0,
      lavaSurge: false, lavaAt: K.SURGE_FIRST, lavaEnd: 0,
      order: null, nextOrder: K.ORDER_FIRST, rep: 0, trader: null, nextTrader: K.TRADER_FIRST, spares: { bit: 0, leg: 0 }, luckyPearls: 0,
      glow: K.GLOW_X.map(function (x, i) { return { x: x, d: K.GLOW_D[i] }; }), bloom: 0.25,
      rival: null, turtle: null, nextTurtle: K.TURTLE_FIRST, decor: [], decorWork: 0, decorTheme: null,
      shift: opts.shift || 'all', si: null, work: { start: 8, len: 8, count: 1, rest: 3, groups: 1 }, scoutsNight: true, oc: false, ocBank: 0, streak: 0, lastSale: -99,
      crabs: [], nextId: 1, rank: 0, lv: {}, stat: {}, hist: [], long: [], longEvery: K.LONG_EVERY, tech: {}, wu: {}, layout: {}, pos: null
    };
    for (k in K.LAYOUT) S.layout[k] = (opts.layout && opts.layout[k] !== undefined) ? opts.layout[k] : K.LAYOUT[k];
    for (k in (opts.wu || {})) S.wu[k] = true;
    for (k in (opts.tech || {})) S.tech[k] = true;
    layoutPos();
    for (k in K.UP) S.lv[k] = (opts.lv && opts.lv[k]) || 0;
    for (i = 0; i < STATS.length; i++) S.stat[STATS[i]] = 0;
    for (i = 0; i < K.START_NODULES; i++) {
      p = spot();
      S.nodules.push({ x: p.x, d: p.d, alive: true, eddy: -1, by: null });
    }
    crew = opts.crew || K.START;
    for (r = 0; r < K.ROLES.length; r++) for (i = 0; i < (crew[K.ROLES[r]] || 0); i++) addCrab(K.ROLES[r]);
    if (opts.credits !== undefined) S.credits = opts.credits;
    snapshot();
    return S;
  }

  function rank() {                       // each crab's number within its own role
    var seen = {}, i, c;
    for (i = 0; i < S.crabs.length; i++) { c = S.crabs[i]; seen[c.role] = seen[c.role] || 0; c.k = seen[c.role]++; }
  }
  function count(role) {
    var n = 0, i;
    for (i = 0; i < S.crabs.length; i++) if (S.crabs[i].role === role) n++;
    return n;
  }
  function counts() {
    var o = {}, i;
    for (i = 0; i < K.ROLES.length; i++) o[K.ROLES[i]] = count(K.ROLES[i]);
    return o;
  }
  function addCrab(role) {
    var p, c = {
      id: S.nextId++, role: role, x: 0, d: 0.8, dir: 1, bat: 1, state: 'init', timer: 0, load: 0, carry: null,
      target: null, claimedBy: null, fixBy: null, mendBy: null, flag: null, charges: charges(), bitOk: true, broken: false, limp: false,
      wear: 0, air: null, alt: 0, dance: null, rested: 0, fresh: 0, lastRest: S.t, bload: 0, moving: false, working: false, heat: 0, scan: 0, nod: null, k: 0, born: S.t
    };
    newcomer(c);
    if (role === 'scout' || role === 'drill' || role === 'haul') { p = spot(); c.x = p.x; c.d = p.d; }
    else if (role === 'crush') { c.x = S.pos.CRUSH; c.d = 0.8; }
    else if (role === 'smelt') { c.x = S.pos.GRAB; c.d = 0.78; }
    else if (role === 'energy') { c.x = K.STIRLING - 40; c.d = 0.9; }
    else { c.x = S.pos.WORKSHOP; c.d = 0.93; }
    S.crabs.push(c);
    rank();
    emit('join', c);
    return c;
  }
  function newcomer(c) {                   // a name, an empty record and no stars; also fills in crabs from older saves
    var used = {}, L = K.CRAB_NAMES, i, j;
    if (!c.name) {                         // the first free name from a spot set by its number, so no randomness is used
      for (i = 0; i < S.crabs.length; i++) used[S.crabs[i].name] = true;
      for (i = 0; i < L.length; i++) { j = L[(c.id * 7 + i) % L.length]; if (!used[j]) { c.name = j; break; } }
      if (!c.name) c.name = L[c.id % L.length] + ' ' + (Math.floor(c.id / L.length) + 1);
    }
    c.rec = c.rec || { jobs: 0, helped: 0, rides: 0, legs: 0, dances: 0, pearls: 0 };
    c.stars = c.stars || 0;
  }
  var JOB = { scout: { flag: 1 }, drill: { strike: 1, dry: 1 }, haul: { stack: 1 }, crush: { bar: 1 }, smelt: { ingot: 1 }, energy: { charge: 1 }, repair: { fixed: 1 }, mech: { fixed: 1 } };
  function tally(type, a, b) {             // each crab's personal record, kept from the events it takes part in
    if (!a || !a.rec) return;
    var r = a.rec;
    if (JOB[a.role][type]) {
      r.jobs++;
      if (a.stars < K.VET_LEVELS.length && r.jobs >= K.VET_AT[a.role] * K.VET_LEVELS[a.stars]) { a.stars++; emit('veteran', a, a.stars); }
    } else if (type === 'stack') r.helped++;
    else if (type === 'ride') r.rides++;
    else if (type === 'legOff') r.legs++;
    else if (type === 'pearl') r.pearls++;
    else if (type === 'dance') { r.dances++; if (b && b.rec) b.rec.dances++; }
  }
  function veterans(role) {                // stars across a role, for the capacity estimate
    var n = 0, v = 0, i, c;
    for (i = 0; i < S.crabs.length; i++) { c = S.crabs[i]; if (c.role === role) { n++; v += c.stars; } }
    return n ? 1 + K.VET_BONUS * v / n : 1;
  }
  function release(c) {                    // let go of every claim: used when a crab leaves or goes off shift
    if (BACK[c.state] && c.target) { c.target.by = null; c.target = null; }
    if (c.role === 'haul' && c.target) { c.target.by = null; c.target = null; }
    if (c.role === 'drill' && c.flag) { c.flag.by = null; c.flag = null; }
    if (c.role === 'energy' && c.target) { c.target.claimedBy = null; c.target = null; }
    if ((c.role === 'repair' || c.role === 'mech') && c.target) { c.target[FIX[c.role].claim] = null; c.target = null; }
    var j = S.docks.indexOf(c); if (j >= 0) S.docks.splice(j, 1);
    if (S.post.carrier === c) { S.post.carrier = null; S.post.moved = S.t; }
    if (c.dance) { if (c.dance.dance === c) c.dance.dance = null; c.dance = null; }
    if (c.turtle) { c.turtle.rider = null; c.turtle = null; }
  }
  function removeCrab(role) {
    var i, c = null, j;
    for (i = S.crabs.length - 1; i >= 0; i--) if (S.crabs[i].role === role) { c = S.crabs[i]; break; }
    if (!c) return null;
    c.gone = true;
    if (c.nod) { j = S.nodules.indexOf(c.nod); if (j >= 0) S.nodules.splice(j, 1); }
    release(c);
    if (c.carry === 'ingot' && c.role === 'repair') S.stock++;     // unused metal goes back where it came from
    if (c.carry === 'bar' && c.role === 'mech') S.bars++;
    if (c.claimedBy) { c.claimedBy.target = null; c.claimedBy.state = 'idle'; }
    if (c.fixBy) { c.fixBy.target = null; c.fixBy.state = 'idle'; }
    if (c.mendBy) { c.mendBy.target = null; c.mendBy.state = 'idle'; }
    S.crabs.splice(i, 1);
    rank();
    emit('leave', c);
    return c;
  }

  // ----- the workday -----
  // All hands: everyone works around the clock. A and B shifts: everyone works the day (06:00-18:00); at night
  // half of each role sleeps, a different half each night, while the repair crews work on at night pace.
  // Three-shift relief: 06:00-14:00, 14:00-22:00 and 22:00-06:00, and each crab sleeps through one of them.
  // The workday patterns (8-hour day, two 8-hour shifts, custom) run on the clock: shifts of so many hours from
  // a start hour, once or twice a day, for one to three groups. Under them scouts take the night instead.
  function hourAt(t) { return (K.DAWN + (t % K.DAY) / K.DAY * 24) % 24; }
  function isNight(h) { return h >= K.NIGHT_FROM || h < K.NIGHT_TO; }
  function pattern() { return S.shift === 'custom' ? S.work : K.PRESETS[S.shift]; }
  function inPattern(P, g, h) {
    for (var i = 0; i < P.count; i++) {
      var st = (P.start + i * (P.len + P.rest) + g * 24 / P.groups) % 24;
      if ((h - st + 24) % 24 < P.len) return true;
    }
    return false;
  }
  function makeSi(h, day) {
    var si = { mode: S.shift, hour: h, day: day, night: isNight(h), index: 0, periods: 1, name: 'All hands', left: 0 }, P, on, k, nx;
    if (S.shift === 'ab') { si.periods = 2; si.index = h >= 6 && h < 18 ? 0 : 1; si.name = si.index ? 'B shift (night)' : 'A shift (day)'; nx = si.index ? 6 : 18; }
    else if (S.shift === 'relief') { si.periods = 3; si.index = h >= 6 && h < 14 ? 0 : (h >= 14 && h < 22 ? 1 : 2); si.name = ['Shift 1', 'Shift 2', 'Shift 3 (night)'][si.index]; nx = [14, 22, 6][si.index]; }
    else if ((P = pattern())) {
      si.periods = 2; on = inPattern(P, 0, h); si.index = on ? 0 : 1; si.name = on ? 'On shift' : 'Off shift';
      for (k = 1; k <= 24; k++) if (inPattern(P, 0, (h + k) % 24) !== on) { nx = (Math.floor(h) + k) % 24; break; }
    }
    if (nx !== undefined) si.left = (((nx - h) + 24) % 24) * K.DAY / 24;
    return si;
  }
  function shiftInfo(t) { t = t === undefined ? S.t : t; return makeSi(hourAt(t), Math.floor(t / K.DAY) + 1); }
  function dutyAt(c, si) {
    var P;
    if (S.shift === 'ab') {
      if (si.index === 0 || c.role === 'repair' || c.role === 'mech') return true;   // repair crews work nights
      return (c.k + si.day) % 2 === 1;                                             // half sleep, alternating nights
    }
    if (S.shift === 'relief') return c.k % 3 !== si.index;
    if ((P = pattern())) {
      if (c.role === 'scout' && S.scoutsNight) return si.night;                     // scouts take the night
      return inPattern(P, c.k % P.groups, si.hour);
    }
    return true;
  }
  function onDuty(c) { return dutyAt(c, S.si || shiftInfo()); }
  function dutyFor(role, k, h, day) { return dutyAt({ role: role, k: k }, makeSi(h, day || 1)); }
  function offShift(c) {                   // called where a crab would choose its next task
    if (onDuty(c) || c.air) return false;
    release(c);
    c.state = 'sleep'; c.working = false;
    emit('sleep', c);
    return true;
  }
  // Who is on duty through the day: rows of hours with the same crew, each with how many hours it covers.
  function coverage() {
    var out = [], i, j, c, h, si, row, key, prev = null, label = function (a, b) { return ('0' + a).slice(-2) + ':00-' + ('0' + b % 24).slice(-2) + ':00'; };
    var tally = function (si) { var r = {}, j; for (j = 0; j < K.ROLES.length; j++) r[K.ROLES[j]] = 0; for (j = 0; j < S.crabs.length; j++) { c = S.crabs[j]; if (dutyAt(c, si)) r[c.role]++; } return r; };
    if (S.shift === 'all') return [{ name: 'All day', roles: tally(makeSi(12, 1)), hours: 24 }];
    if (S.shift === 'ab') return [{ name: 'A shift (day)', roles: tally(makeSi(12, 1)), hours: 12 }, { name: 'B shift (night 1)', roles: tally(makeSi(0, 1)), hours: 6 }, { name: 'B shift (night 2)', roles: tally(makeSi(0, 2)), hours: 6 }];
    if (S.shift === 'relief') return [{ name: 'Shift 1', roles: tally(makeSi(10, 1)), hours: 8 }, { name: 'Shift 2', roles: tally(makeSi(18, 1)), hours: 8 }, { name: 'Shift 3 (night)', roles: tally(makeSi(2, 1)), hours: 8 }];
    for (i = 0; i < 24; i++) {
      h = (K.DAWN + i) % 24; si = makeSi(h + 0.5, 1); row = tally(si); key = JSON.stringify(row);
      if (prev && prev.key === key) { prev.hours++; prev.to = h + 1; continue; }
      prev = { key: key, roles: row, hours: 1, from: h, to: h + 1 }; out.push(prev);
    }
    for (i = 0; i < out.length; i++) { out[i].name = label(out[i].from, out[i].to); delete out[i].key; }
    return out;
  }

  // walk along the track (x) and up or down the dunes (d); true once there
  function moveTo(c, tx, td, speed) {
    if (!c.goal) c.goal = {};
    c.goal.x = tx; c.goal.d = td; c.goal.t = S.t;            // where it is heading this step
    var crest = Math.abs(c.d - 1 / 3) < K.CREST || Math.abs(c.d - 2 / 3) < K.CREST;
    var k = pace(c) * (c.limp ? K.LIMP : 1) * (crest ? K.CREST_SLOW : 1) * (S.storm ? K.STORM_WALK : 1), dx = tx - c.x, dd = td - c.d, mv = speed * k * dt, md = mv / K.DEPTH, there = true;
    if (Math.abs(dx) > 0.5) {
      c.dir = dx > 0 ? 1 : -1;
      c.x += Math.abs(dx) <= mv ? dx : c.dir * mv;
      c.moving = true;
      if (Math.abs(tx - c.x) > 0.5) there = false;
    }
    if (Math.abs(dd) > 0.004) {
      c.d += Math.abs(dd) <= md ? dd : (dd > 0 ? md : -md);
      c.moving = true;
      if (Math.abs(td - c.d) > 0.004) there = false;
    }
    return there;
  }
  // Long trips from the lava side may take the thermal vent: walk to it, float up with the bubbles,
  // then swim down and sideways to the target. A crab only does it when that beats walking.
  function go(c, tx, td, speed) {
    var a = c.air, f, walk, ride, k;
    if (!a && c.x > 760 && tx < c.x - 200) {
      k = pace(c) * (c.limp ? K.LIMP : 1) * speed;
      walk = (Math.abs(tx - c.x) + Math.abs(td - c.d) * K.DEPTH) / k;
      ride = (Math.abs(K.VENT_IN - c.x) + Math.abs(0.8 - c.d) * K.DEPTH) / k + K.T_RISE + (K.VENT_X - tx) / K.GLIDE;
      if (ride < walk * 0.9) { a = c.air = { phase: 'walk' }; c.alt = 0; }
    }
    if (!a) return moveTo(c, tx, td, speed);
    a.tx = tx; a.td = td; a.used = S.t;
    if (a.phase === 'walk') {
      if (moveTo(c, K.VENT_IN, 0.8, speed)) { a.phase = 'rise'; a.x0 = c.x; S.stat.rides++; emit('ride', c); }
      return false;
    }
    c.moving = false; c.floating = true;                    // floating is free: no power, no wear
    if (a.phase === 'rise') {
      c.alt = Math.min(1, c.alt + dt / K.T_RISE * (S.lavaSurge ? 1.7 : 1));   // a surging vent lifts faster
      c.x = a.x0 + (K.VENT_X - a.x0) * Math.min(1, c.alt * 2);
      c.dir = -1;
      if (c.alt >= 1) { a.phase = 'glide'; a.gx = c.x; a.gd = c.d; }
      return false;
    }
    // glide: fast and sideways, falling as it goes; it lands on the target, wherever that has moved to
    c.x = Math.max(tx, c.x - K.GLIDE * dt);
    f = a.gx - tx > 1 ? clamp((a.gx - c.x) / (a.gx - tx), 0, 1) : 1;
    c.alt = 1 - f; c.d = a.gd + (td - a.gd) * f; c.dir = -1;
    if (f >= 1 || c.x <= tx) { c.x = tx; c.d = td; c.alt = 0; c.air = null; c.floating = false; emit('land', c); return true; }
    return false;
  }
  function far(a, x, d) { return Math.abs(a.x - x) + Math.abs(a.d - d) * K.DEPTH; }
  function nearestNodule(c) {
    var best = null, bd = 1e9, i, n, d;
    for (i = 0; i < S.nodules.length; i++) {
      n = S.nodules[i];
      if (!n.alive || (n.by && n.by !== c)) continue;
      d = far(c, n.x, n.d);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  function bestFlag(c) {                   // the flag that pays best for the walk: near, and likely to strike
    var best = null, bs = 1e9, i, f, s;
    for (i = 0; i < S.flags.length; i++) {
      f = S.flags[i];
      if (f.by && f.by !== c) continue;
      s = (far(c, f.x, f.d) + 60) / f.q;
      if (s < bs) { bs = s; best = f; }
    }
    return best;
  }
  function removeFlag(f) { var j = S.flags.indexOf(f); if (j >= 0) S.flags.splice(j, 1); f.gone = true; }
  function work(c) { c.working = true; return dt * pace(c); }

  // ----- one rule set per role; no crab is told what the others are doing -----
  function scout(c) {
    var sc, z, f;
    if (c.state === 'init' || c.state === 'pick' || c.state === 'rest') {
      if (offShift(c)) return;
      if (S.flags.length >= flagCap()) { if (!tryBackup(c)) c.state = 'rest'; return; }   // plenty of flags: carry nodules, or rest
      f = spot(); c.tx = f.x; c.td = f.d; c.state = 'go';
    }
    if (c.state === 'go') {
      if (go(c, c.tx, c.td, spd(c))) { c.state = 'scan'; c.timer = c.scanT = K.T_SCAN * (has('wideSonar') ? 0.65 : 1) * (S.si.night && has('nightEyes') ? 0.7 : 1); c.scan = 0; }
    } else if (c.state === 'scan') {
      c.timer -= work(c);
      c.scan = clamp(1 - c.timer / c.scanT, 0, 1);
      if (c.timer <= 0) {
        S.stat.scans++;
        sc = up('scanner');
        if (sr() < sc[0] + (S.si.night && has('moonFlags') ? 0.2 : 0)) {
          z = zoneOf(c.d); if (S.si.night) S.stat.nightFlags++;
          f = { id: S.nextId++, x: c.x, d: c.d, q: clamp(srr(0.45, 0.85) + K.ZONES[z].q + sc[1] + (has('deepSonar') ? 0.08 : 0), 0.3, 0.97),
            size: 2 + Math.floor(sr() * 3) + K.ZONES[z].size + (has('deepSonar') ? 1 : 0), by: null, zone: z, born: S.t };
          S.flags.push(f); S.stat.finds++; emit('flag', c, f);
        } else emit('miss', c);
        c.state = 'pick';
      }
    }
  }
  function drill(c) {
    var f, p, q, i, n2;
    if (c.state === 'init' || c.state === 'pick' || c.state === 'rest') {
      if (offShift(c)) return;
      if (S.nodules.length >= K.FIELD_CAP) { if (!tryBackup(c)) c.state = 'rest'; return; }   // the sand is littered: carry some
      if (!c.bitOk && tryBackup(c)) return;                  // a broken bit: carry nodules while waiting for the repair
      f = bestFlag(c);
      if (c.flag && c.flag !== f) c.flag.by = null;          // let go of the old flag before claiming a new one
      if (f) { f.by = c; c.flag = f; c.tx = clamp(f.x + srr(-8, 8), K.FIELD0, K.FIELD1); c.td = clamp(f.d + srr(-0.03, 0.03), 0.02, 0.98); }
      else { c.flag = null; p = spot(); c.tx = p.x; c.td = p.d; }
      c.state = 'go';
    }
    if (c.state === 'go') {
      if (c.flag && c.flag.gone) { c.flag = null; c.state = 'pick'; return; }
      if (go(c, c.tx, c.td, spd(c))) {
        c.state = 'drill'; c.timer = c.holeT = K.T_DRILL * (c.bitOk ? 1 : K.BROKEN_TIME) * (has('diamondTips') ? 0.75 : 1);
        c.nod = { x: c.x, d: c.d, alive: false, eddy: 0, by: null };
        S.nodules.push(c.nod);
      }
    } else if (c.state === 'drill') {
      c.timer -= work(c);
      c.nod.eddy = clamp(1 - c.timer / c.holeT, 0, 1);
      if (c.timer <= 0) {
        S.stat.holes++;
        q = (c.flag && !c.flag.gone ? c.flag.q : K.WILDCAT) * (c.bitOk ? 1 : K.BROKEN_LUCK);
        if (sr() < q) {
          S.stat.strikes++;
          c.nod.alive = true; c.nod.eddy = -1; emit('strike', c, c.nod);
          if (c.flag && !c.flag.gone && c.flag.q >= K.PEARL_Q && (S.luckyPearls > 0 || sr() < K.PEARL_CHANCE)) {
            if (S.luckyPearls > 0) S.luckyPearls--;   // a pearl in the rich sand: jackpot
            var pv = K.PEARL_VALUE[c.flag.zone || 0];
            S.credits += pv; S.earned += pv; S.stat.pearls++; S.stat.pearlCredits += pv;
            emit('pearl', c, pv); inspire('pearlLamp'); ranks();
          }
          if (sr() < (has('twinAugers') ? 0.45 : K.BONUS_NODULE)) {                       // a rich pocket holds a second nodule
            n2 = { x: clamp(c.x + srr(-14, 14), K.FIELD0, K.FIELD1), d: clamp(c.d + srr(-0.05, 0.05), 0.02, 0.98), alive: true, eddy: -1, by: null };
            S.nodules.push(n2); emit('uncover', n2);
          }
          if (c.flag && !c.flag.gone && --c.flag.size <= 0) { removeFlag(c.flag); emit('flagDone', c.flag); c.flag = null; }
        } else {
          i = S.nodules.indexOf(c.nod); if (i >= 0) S.nodules.splice(i, 1);
          emit('dry', c);
        }
        c.nod = null;
        if (c.bitOk && sr() < up('bits') * wearMult(c) * (has('diamondTips') ? 0.6 : 1)) { c.bitOk = false; S.stat.bitsBroken++; emit('bitBreak', c); }
        c.state = 'pick';
      }
    }
  }
  function haul(c) {
    if (c.state === 'init') c.state = 'seek';
    if (c.state === 'seek') {
      if (c.load >= carry()) { c.state = 'haul'; return; }
      if (c.load === 0 && !c.target && offShift(c)) return;
      if (!c.target || !c.target.alive || c.target.taken) { c.target = nearestNodule(c); if (c.target) c.target.by = c; }
      if (c.target) {
        if (go(c, c.target.x, c.target.d, spd(c))) { c.state = 'pick'; c.timer = K.T_PICK; }
      } else if (c.load > 0) {
        c.state = 'haul';
      }
    } else if (c.state === 'pick') {
      c.timer -= work(c);
      if (c.timer <= 0) {
        if (c.target && !c.target.taken) {
          c.target.taken = true;
          var i = S.nodules.indexOf(c.target);
          if (i >= 0) S.nodules.splice(i, 1);
          c.load++; emit('take', c);
        }
        c.target = null; c.state = 'seek';
      }
    } else if (c.state === 'haul') {
      if (moveTo(c, S.pos.HAUL_STAND, 0.72 + 0.07 * (c.k % 4), spd(c))) { c.state = 'stack'; c.timer = K.T_STACK; }
    } else if (c.state === 'stack') {
      if (S.ore >= oreCap()) return;                         // the ore pile is full: wait
      c.timer -= work(c);
      if (c.timer <= 0) {
        S.ore++; c.load--; S.stat.stacked++; emit('stack', c);
        c.timer = K.T_STACK;
        if (c.load <= 0) c.state = 'seek';
      }
    }
  }
  function crush(c) {
    if (c.state === 'init') c.state = 'home';
    if (c.state === 'home') {
      if (moveTo(c, S.pos.CRUSH - (c.k >= 3 ? 16 : 0), 0.72 + 0.09 * (c.k % 3), spd(c))) c.state = 'wait';
    } else if (c.state === 'wait') {
      if (offShift(c)) return;
      if (S.ore < K.NOD_PER_BAR && tryBackup(c)) return;     // nothing to press: fetch some ore
      if (S.ore >= K.NOD_PER_BAR) { S.ore -= K.NOD_PER_BAR; emit('feed', c); c.state = 'crush'; c.timer = c.crushT = K.T_CRUSH * (has('hydraulicClaws') ? 0.65 : 1); }
    } else if (c.state === 'crush') {
      c.timer -= work(c);
      if (c.timer <= 0) c.state = 'hold';
    } else if (c.state === 'hold') {
      if (S.bars < barCap()) { S.bars++; S.stat.bars++; emit('bar', c); c.state = 'wait'; }   // else the bar stack is full: wait
    }
  }
  function smelt(c) {
    if (c.state === 'init') c.state = 'toBar';
    if (c.state === 'toBar') {
      if (offShift(c)) return;
      if (moveTo(c, S.pos.GRAB, 0.72 + 0.08 * (c.k % 3), spd(c))) { c.state = 'grab'; c.timer = K.T_GRAB; }
    } else if (c.state === 'grab') {
      if (c.carry !== 'bar') {
        if (S.bars <= 0) { tryBackup(c); return; }            // nothing to smelt: carry nodules meanwhile, or wait
        c.n = has('twinTongs') && S.bars >= 2 ? 2 : 1;      // twin tongs carry two bars at once
        S.bars -= c.n; c.carry = 'bar'; emit('grab', c); c.timer = K.T_GRAB;
      }
      c.timer -= work(c);
      if (c.timer <= 0) c.state = 'toLava';
    } else if (c.state === 'toLava') {
      if (moveTo(c, K.RIM, 0.8 + 0.06 * (c.k % 3), spd(c))) { c.state = 'smelt'; c.timer = c.smeltT = K.T_SMELT * (has('heatTongs') ? 0.6 : 1) / (S.lavaSurge ? K.SURGE_SPEED : 1); c.heat = 0; }
    } else if (c.state === 'smelt') {
      c.timer -= work(c);
      c.heat = clamp(1 - c.timer / c.smeltT, 0, 1);
      if (c.timer <= 0) { c.carry = 'ingot'; S.stat.ingots += c.n; emit('ingot', c); c.state = 'toStock'; }
    } else if (c.state === 'toStock') {
      if (moveTo(c, S.pos.STOCK + 8, 0.86 + 0.04 * (c.k % 3), spd(c))) { c.state = 'drop'; c.timer = K.T_DROP; }
    } else if (c.state === 'drop') {
      if (S.stock + c.n > K.STOCK_CAP) return;               // the stockpile is full: wait
      c.timer -= work(c);
      if (c.timer <= 0) { c.carry = null; c.heat = 0; S.stock += c.n; emit('stock', c); c.state = 'toBar'; }
    }
  }
  function energy(c) {
    var i, w, best = null, sp = spd(c) * (c.broken ? K.EBOT_BROKEN : 1);
    if (c.state === 'init') c.state = 'idle';
    if (c.state === 'idle') {
      if (c.charges <= 0) { c.state = 'toEngine'; return; }
      if (offShift(c)) return;
      if (slipped() && Math.abs(S.post.x - S.post.home.x) > 3 * K.POST_SLIP && postWanted(c)) { S.post.carrier = c; c.state = 'toPost'; return; }   // badly adrift: fetch it first
      for (i = 0; i < S.crabs.length; i++) {
        w = S.crabs[i];
        if (w.role === 'energy' || w.claimedBy || w.air || w.state === 'sleep' || w.bat >= K.CHARGE_BELOW) continue;
        if (!best || w.bat < best.bat) best = w;
      }
      if (best) { best.claimedBy = c; c.target = best; c.state = 'go'; }
      else if (c.charges < charges()) c.state = 'toEngine';        // nobody needs charge: top up
      else if (postWanted(c)) { S.post.carrier = c; c.state = 'toPost'; }
      else if (tryBackup(c)) return;
      else moveTo(c, S.post.x - 30 - 16 * (c.k % 4), clamp(S.post.d + 0.04 - 0.05 * (c.k % 2), 0.72, 0.97), sp);
    } else if (c.state === 'go' || c.state === 'charge') {
      w = c.target;
      if (!w || w.gone || w.state === 'sleep') { if (w) w.claimedBy = null; c.target = null; c.state = 'idle'; return; }
      if (c.state === 'go') {
        go(c, w.x - 12, w.d, sp);
        if (!c.air && !w.air && Math.abs(w.x - 12 - c.x) <= 4 && Math.abs(w.d - c.d) <= 0.04) {   // side by side: hand the charge over
          c.state = 'charge'; c.timer = K.T_CHARGE * (c.broken ? 2 : 1) * (has('fastPlug') ? 0.5 : 1);
        }
      } else {
        moveTo(c, w.x - 12, w.d, sp);
        c.timer -= work(c);
        if (c.timer <= 0) {
          w.bat = 1; w.claimedBy = null; S.stat.charges++; emit('charge', c, w);
          c.target = null; c.charges--;
          if (!c.broken && sr() < K.EBOT_WEAR * wearMult(c)) { c.broken = true; S.stat.ebotsBroken++; emit('ebotBreak', c); }
          c.state = c.charges > 0 ? 'idle' : 'toEngine';
        }
      }
    } else if (c.state === 'toEngine') {                       // back to the refuel post at the end of the cord
      if (go(c, S.post.x - 14, S.post.d - 0.03, sp) && !c.air) c.state = 'queue';
    } else if (c.state === 'toPost' || c.state === 'dragPost') {   // pick the post up and drag it, cord and all
      if (c.state === 'toPost') { if (moveTo(c, S.post.x - 8, S.post.d, sp)) { c.state = 'dragPost'; emit('postGrab', c); } }
      else {
        var tgt = postGoal();
        if (moveTo(c, tgt.x - 8, tgt.d, sp * 0.6)) {
          S.post.carrier = null; S.post.moved = S.t; S.post.home = { x: S.post.x, d: S.post.d }; S.post.warned = false;
          c.state = 'idle'; emit('postMoved', c);
        }
        S.post.x = c.x + 8; S.post.d = clamp(c.d, 0.72, 0.97);   // the post stays on the front dune
      }
    } else if (c.state === 'queue') {
      if (S.post.carrier) return;                              // the post is on the move: wait for it
      if (S.docks.length < K.DOCKS) { S.docks.push(c); c.state = 'refill'; c.timer = K.T_PLUG * (has('fastPlug') ? 0.6 : 1); emit('plug', c); }
    } else if (c.state === 'refill') {                       // plugged into the engine, one charge at a time
      c.working = true;
      moveTo(c, S.post.x - 12 + 22 * S.docks.indexOf(c), S.post.d - 0.04, sp);
      if (S.heat < 1) return;                                // the engine is spent: wait while it heats up
      c.timer -= dt;
      if (c.timer <= 0) {
        S.heat -= 1; c.charges++; c.timer = K.T_PLUG * (has('fastPlug') ? 0.6 : 1);
        if (c.charges >= charges()) {
          c.state = 'idle';
          i = S.docks.indexOf(c); if (i >= 0) S.docks.splice(i, 1);
          emit('refill', c);
          if (slipped() && !S.post.carrier) { S.post.carrier = c; c.state = 'dragPost'; emit('postGrab', c); }   // it is right here: take it home
        }
      }
    }
  }

  // ----- the backup job: every crab can carry nodules when its own work is stuck -----
  // A drill waiting for a new bit, a scout with flags enough, a crusher with no ore, a smelter with no bars,
  // and idle energy and repair bots all fetch nodules to the ore pile, each at its own walking pace.
  function freeNodule() { for (var i = 0; i < S.nodules.length; i++) { var n = S.nodules[i]; if (n.alive && !n.taken && !n.by) return true; } return false; }
  function needsCharge() { for (var i = 0; i < S.crabs.length; i++) { var w = S.crabs[i]; if (w.role !== 'energy' && !w.claimedBy && w.state !== 'sleep' && w.bat < K.CHARGE_BELOW) return true; } return false; }
  function primaryReady(c) {
    switch (c.role) {
      case 'drill': return c.bitOk && S.nodules.length < K.FIELD_CAP;
      case 'scout': return S.flags.length < flagCap();
      case 'crush': return S.ore >= K.NOD_PER_BAR;
      case 'smelt': return S.bars > 0;
      case 'energy': return needsCharge() || c.charges < charges() || postWanted(c);
      case 'repair': case 'mech':
        for (var i = 0; i < S.crabs.length; i++) { var w = S.crabs[i]; if (!w[FIX[c.role].claim] && !w.air && needs(w, c.role)) return true; }
        return false;
    }
    return true;
  }
  function tryBackup(c) {
    if (c.role === 'haul' || c.air || !onDuty(c) || primaryReady(c) || !freeNodule()) return false;
    release(c);
    c.state = 'bseek'; c.bload = 0; S.stat.backup++;
    emit('backup', c);
    return true;
  }
  function endBackup(c) {
    if (c.target) { c.target.by = null; c.target = null; }
    c.state = RESUME[c.role]; emit('backupEnd', c);
  }
  function backupHaul(c) {
    var i;
    if (c.state === 'bseek') {
      if (c.bload >= carry() || (c.bload > 0 && primaryReady(c))) { c.state = 'bhaul'; return; }
      if (c.bload === 0 && (primaryReady(c) || !onDuty(c))) { endBackup(c); return; }
      if (!c.target || !c.target.alive || c.target.taken) { c.target = nearestNodule(c); if (c.target) c.target.by = c; }
      if (c.target) { if (go(c, c.target.x, c.target.d, spd(c))) { c.state = 'bpick'; c.timer = K.T_PICK; } }
      else if (c.bload > 0) c.state = 'bhaul';
      else endBackup(c);
    } else if (c.state === 'bpick') {
      c.timer -= work(c);
      if (c.timer <= 0) {
        if (c.target && !c.target.taken) {
          c.target.taken = true; i = S.nodules.indexOf(c.target); if (i >= 0) S.nodules.splice(i, 1);
          c.bload++; emit('take', c);
        }
        c.target = null; c.state = 'bseek';
      }
    } else if (c.state === 'bhaul') {
      if (moveTo(c, S.pos.HAUL_STAND + 6, 0.74 + 0.05 * (c.id % 4), spd(c))) { c.state = 'bstack'; c.timer = K.T_STACK; }
    } else if (c.state === 'bstack') {
      if (S.ore >= oreCap()) return;
      c.timer -= work(c);
      if (c.timer <= 0) {
        S.ore++; c.bload--; S.stat.stacked++; emit('stack', c); c.timer = K.T_STACK;
        if (c.bload <= 0) c.state = 'bseek';
      }
    }
  }

  // where the crew is working: the post is most use near the middle of them, within reach of the cord
  function postTarget() {
    var x = 0, d = 0, n = 0, i, c;
    for (i = 0; i < S.crabs.length; i++) { c = S.crabs[i]; if (c.role === 'energy' || c.state === 'sleep' || c.alt > 0) continue; x += c.x; d += c.d; n++; }
    x = n ? x / n : S.post.x;
    return { x: clamp(x, Math.max(K.FIELD0 + 30, K.STIRLING - K.CORD), K.STIRLING - 40), d: 0.88 };
  }
  function postWanted(c) {
    if (S.post.carrier) return false;
    if (slipped()) return true;                              // the tide has moved it: put it back, plugged-in bots and all
    if (S.docks.length || !S.post.auto || S.t - S.post.moved < K.POST_MOVE_EVERY) return false;
    return Math.abs(postTarget().x - S.post.x) > K.POST_MIN_MOVE;
  }
  function slipped() { return Math.abs(S.post.x - S.post.home.x) + Math.abs(S.post.d - S.post.home.d) * K.DEPTH > K.POST_SLIP; }
  function postGoal() { return S.post.auto ? postTarget() : S.post.home; }
  // The current runs one way on the rising tide and the other on the falling one, hardest near high and
  // low water and in a storm. It shoves the post along the sand unless a bot has hold of it.
  function driftPost() {
    var p = S.post, push;
    if (p.carrier) return;
    push = S.tide * Math.max(0, Math.abs(S.tide) - 0.35) / 0.65 * K.TIDE_DRIFT * (S.storm ? K.STORM_DRIFT : 1);
    if (!push) return;
    var nx = clamp(p.x + push * dt, Math.max(K.FIELD0 + 30, K.STIRLING - K.CORD), K.STIRLING - 40);
    p.drift = nx - p.x; p.x = nx;
    p.d = clamp(p.d + Math.sin(S.t * 0.7) * 0.002 * dt * Math.abs(push), 0.72, 0.97);
    if (slipped() && !p.warned) { p.warned = true; emit('postDrift', push > 0 ? 1 : -1); }
  }

  // ----- the two repair crews: fetch the material, forge the part in the lava, fit it -----
  // Repair bots turn an ingot from the stockpile into a new drill bit or energy cell.
  // Maintenance bots turn a bar from the bar stack into a new leg.
  var FIX = {
    repair: {
      claim: 'fixBy', raw: 'ingot', part: 'bit', pocket: 'pocketForge', quick: 'quickHands', at: function () { return S.pos.STOCK - 10; },
      need: function (w) { return (w.role === 'drill' && !w.bitOk) || (w.role === 'energy' && w.broken); },
      take: function () { if (S.stock <= 0) return false; S.stock--; S.stat.metalUsed++; return true; },
      done: function (w) { if (w.role === 'drill') w.bitOk = true; else w.broken = false; S.stat.repairs++; }
    },
    mech: {
      claim: 'mendBy', raw: 'bar', part: 'leg', pocket: 'mechForge', quick: 'quickHands', at: function () { return S.pos.BAR + 14; },
      need: function (w) { return w.limp; },
      take: function () { if (S.bars <= 0) return false; S.bars--; S.stat.barsUsed++; return true; },
      done: function (w) { w.limp = false; S.stat.mends++; }
    }
  };
  function needs(w, kind) { return w && !w.gone && FIX[kind].need(w); }
  // A crab holds still while a helper hands it something, claw to claw like a relay baton: a new bit or leg
  // being fitted, or a charge being passed over. Its own work waits until the hand-off is done.
  function heldBy(w) {
    if (w.fixBy && w.fixBy.target === w && w.fixBy.state === 'fix') return w.fixBy;
    if (w.mendBy && w.mendBy.target === w && w.mendBy.state === 'fix') return w.mendBy;
    if (w.claimedBy && w.claimedBy.target === w && w.claimedBy.state === 'charge') return w.claimedBy;
    return null;
  }
  function isHeld(w) { return !!heldBy(w); }
  function fixer(c) {
    var F = FIX[c.role], i, w, best = null, bd = 1e9, d;
    if (c.state === 'init') c.state = 'idle';
    if (c.state === 'idle') {
      if (offShift(c)) return;
      for (i = 0; i < S.crabs.length; i++) {
        w = S.crabs[i];
        if (w[F.claim] || w.air || !needs(w, c.role)) continue;
        d = far(c, w.x, w.d) * (w.state === 'sleep' ? 0.6 : 1);   // sleeping crabs hold still: easy work
        if (d < bd) { bd = d; best = w; }
      }
      if (!best) { if (!tryBackup(c)) moveTo(c, S.pos.WORKSHOP - 14 * (c.k % 4) - (c.role === 'mech' ? 8 : 0), 0.93, spd(c)); return; }
      best[F.claim] = c; c.target = best;
      var spare = c.role === 'repair' ? 'bit' : 'leg';
      if (c.carry === F.part) c.state = 'toJob';
      else if (c.carry === F.raw) c.state = has(F.pocket) ? 'fetch' : 'toForge';
      else if (S.spares[spare] > 0) { S.spares[spare]--; c.carry = F.part; c.state = 'toJob'; emit('spareUsed', c); }   // a spare from the trader
      else c.state = 'toMat';
    }
    if (c.state === 'toMat') {
      if (moveTo(c, F.at(), 0.95, spd(c))) { c.state = 'fetch'; c.timer = K.T_FETCH; }
    } else if (c.state === 'fetch') {
      if (c.carry !== F.raw) {
        if (!F.take()) return;                               // nothing on the pile: wait for the line
        c.carry = F.raw; emit('takeMat', c);
      }
      c.timer -= work(c);
      if (c.timer <= 0) {
        if (has(F.pocket)) { c.state = 'forge'; c.timer = c.forgeT = K.T_FORGE; c.heat = 0; }   // a pocket forge works on the spot
        else c.state = 'toForge';
      }
    } else if (c.state === 'toForge') {                     // the lava is the forge
      if (moveTo(c, K.RIM - 6, 0.93 - 0.05 * (c.k % 2), spd(c))) { c.state = 'forge'; c.timer = c.forgeT = K.T_FORGE / (S.lavaSurge ? K.SURGE_SPEED : 1); c.heat = 0; }
    } else if (c.state === 'forge') {
      c.timer -= work(c);
      c.heat = clamp(1 - c.timer / c.forgeT, 0, 1);
      if (c.timer <= 0) { c.carry = F.part; c.heat = 0; emit('forged', c); c.state = 'toJob'; }
    } else if (c.state === 'toJob' || c.state === 'fix') {
      w = c.target;
      if (!needs(w, c.role)) { if (w && w[F.claim] === c) w[F.claim] = null; c.target = null; c.state = 'idle'; return; }
      if (c.state === 'toJob') {
        if (w.air) return;                                   // wait for it to land
        if (go(c, w.x - 14 * w.dir, w.d, spd(c)) && !c.air && far(c, w.x - 14 * w.dir, w.d) < 6) { c.state = 'fix'; c.timer = K.T_REPAIR * (c.role === 'repair' && has('quickHands') ? 0.6 : 1); }
      } else {
        c.timer -= work(c);
        if (c.timer <= 0) {
          F.done(w);
          w[F.claim] = null; c.carry = null; c.target = null;
          emit('fixed', c, w); c.state = 'idle';
        }
      }
    }
  }
  var RULES = { scout: scout, drill: drill, haul: haul, crush: crush, smelt: smelt, energy: energy, repair: fixer, mech: fixer };

  // ----- the riser, the market, and the ledger -----
  function ranks() {
    while (S.rank + 1 < K.RANKS.length && S.earned >= K.RANKS[S.rank + 1][0]) {
      S.rank++; inspire('trophy');
      var bonus = Math.round(K.RANKS[S.rank][0] * K.RANK_BONUS);
      S.credits += bonus;
      emit('rank', S.rank, bonus);
    }
  }
  function flowMult() { return 1 + K.FLOW_STEP * S.streak; }
  function sell() {
    S.liftT -= dt;
    if (S.liftT > 0) return;
    if (S.stock > S.reserve) {
      // a delivery soon after the last one keeps the flow going: it sells dearer and banks more overclock
      S.streak = S.t - S.lastSale <= K.FLOW_GAP ? Math.min(K.FLOW_MAX, S.streak + 1) : 0;
      S.lastSale = S.t;
      var v = Math.round(S.price * flowMult()), o = S.order;
      S.stat.flowBonus += v - Math.round(S.price);
      if (o) {                                               // the ship pays a premium on each ingot for its order
        var pv = Math.round(v * (1 + o.premium));
        S.stat.orderCredits += pv - v; v = pv; o.got++;
      }
      S.stock--; S.credits += v; S.earned += v; S.stat.sold++; S.stat.revenue += v;
      S.ocBank = Math.min(K.OC_MAX, S.ocBank + K.OC_PER_SALE * (1 + S.streak / 10));
      S.liftT = up('riser') * (S.storm ? K.STORM_RISER : 1);   // in a storm the ship rocks and the riser slows
      emit('sell', v, S.streak);
      if (o && o.got >= o.need) {
        var bonus = Math.round(o.need * K.ORDER_BONUS * (1 + S.rep * 0.1));
        S.credits += bonus; S.earned += bonus; S.stat.orderCredits += bonus; S.stat.ordersFilled++;
        S.rep = Math.min(K.REP_MAX, S.rep + 1);
        if (o.rivalRate) { S.rival.lost++; S.rival.drive = Math.min(K.RIVAL_DRIVE[1], S.rival.drive * K.RIVAL_PUSH); }
        emit('orderDone', o, bonus); stir(); inspire('shipBottle');
        S.order = null; S.nextOrder = S.t + srr(K.ORDER_EVERY[0], K.ORDER_EVERY[1]);
      }
      ranks();
    } else S.liftT = 0;
    if (S.streak && S.t - S.lastSale > K.FLOW_GAP) { S.streak = 0; emit('flowLost'); }
  }
  function market() {                     // a slow swell, a faster ripple, and a drifting random walk
    var tt = S.t, w;
    S.walk = clamp(S.walk * 0.97 + srr(-0.035, 0.035), -0.15, 0.15);
    w = 1 + 0.18 * Math.sin(tt * 2 * Math.PI / 150) + 0.07 * Math.sin(tt * 2 * Math.PI / 43 + 1.3) + S.walk;
    S.price = K.PRICE * clamp(w, 0.55, 1.5);
  }
  function snapshot() {
    var h = { t: S.t, credits: S.credits, price: S.price, stock: S.stock, bat: avgBattery(), wear: avgWear() }, i;
    for (i = 0; i < STATS.length; i++) h[STATS[i]] = S.stat[STATS[i]];
    S.hist.push(h);
    if (S.hist.length > 302) S.hist.shift();
    // the whole game, for the Ledger's charts: a sample every so often, thinned to half when the list fills up,
    // so it always spans the game from the start at no more than LONG_MAX points
    var L = S.long, last = L[L.length - 1];
    if (!last || S.t - last.t >= S.longEvery - 1e-9) {
      L.push({ t: S.t, earned: S.earned, sold: S.stat.sold, crabs: S.crabs.length });
      if (L.length > K.LONG_MAX) { S.long = L.filter(function (x, j) { return j % 2 === 0 || j === L.length - 1; }); S.longEvery *= 2; }
    }
  }
  function avgBattery() {
    var b = 0, n = 0, i;
    for (i = 0; i < S.crabs.length; i++) if (S.crabs[i].role !== 'energy') { b += S.crabs[i].bat; n++; }
    return n ? b / n : 1;
  }
  function avgWear() {
    var b = 0, i;
    for (i = 0; i < S.crabs.length; i++) b += S.crabs[i].wear;
    return S.crabs.length ? b / S.crabs.length : 0;
  }

  function step() {
    var i, c, active, drain;
    S.t += dt;
    S.si = shiftInfo();
    if (S.oc) { S.ocBank -= dt; if (S.ocBank <= 0) { S.ocBank = 0; S.oc = false; emit('ocEnd'); } }
    for (i = 0; i < S.crabs.length; i++) {
      c = S.crabs[i];
      c.moving = false; c.working = false; c.floating = false;
      if (c.fresh > 0) c.fresh -= dt;
      if (c.state === 'sleep') {                             // off shift: rest, recharge, and shake off the wear
        c.rested += dt; c.lastRest = S.t;
        c.bat = Math.min(1, c.bat + K.REST_CHARGE * dt);
        c.wear = Math.max(0, c.wear - K.REST_RECOVER * dt);
        if (onDuty(c)) { c.state = RESUME[c.role]; emit('wake', c); }
        continue;
      }
      if (c.turtle) { c.floating = true; continue; }          // riding the turtle: nothing to do but enjoy it
      if (!isHeld(c)) (BACK[c.state] ? backupHaul : RULES[c.role])(c);
      if (c.air && c.air.used !== S.t) {                     // the trip was dropped mid-ride: float on and land anyway
        if (c.air.phase === 'walk') c.air = null; else go(c, c.air.tx, c.air.td, spd(c));
      }
      active = c.moving || c.working;
      if (!active) { if (!c.floating) c.wear = Math.max(0, c.wear - K.IDLE_RECOVER * dt); continue; }
      if (S.si.night && tired(c) && !c.air) {                // a tired crab at night: glowing plankton light its way
        if (lit(c.x, c.d)) { S.stat.glowLit += dt; if (!c.glow) { c.glow = true; emit('glow', c); } } else c.glow = false;
      } else c.glow = false;
      c.wear += dt * (S.oc ? K.OC_WEAR : 1) * (c.role === 'crush' && has('shockPads') ? 0.5 : 1);
      if (c.role !== 'energy' && !(c.role === 'scout' && S.si.night && has('nightBattery'))) {
        drain = K.DRAIN * (c.role === 'drill' && !c.bitOk && c.state === 'drill' ? K.BROKEN_DRAIN : 1) * (S.oc ? K.OC_DRAIN : 1);
        c.bat = Math.max(0, c.bat - drain * dt);
      }
      if (!c.limp && sr() < K.LEG_RATE * (has('toughJoints') ? 0.5 : 1) * wearMult(c) * dt) { c.limp = true; S.stat.legsLost++; emit('legOff', c); }
    }
    dance();
    sea();
    driftPost();
    octopus();
    turtle();
    trader();
    if (S.si.day !== S.day) morning();
    S.heat = Math.min(K.HEAT_CAP, S.heat + up('engine') * (S.lavaSurge ? K.SURGE_SPEED : 1) * dt / 60);   // lava heat drives the Stirling engine
    weather();
    sell();
    if (S.t >= S.tick + 1 - 1e-9) { S.tick += 1; market(); snapshot(); }
  }
  // Idle neighbours dance. Two crabs standing about with nothing to do, side by side, pair up and dance:
  // it tops up their batteries a little and clears their wear, and it counts towards a fresh morning.
  function dance() {
    var i, j, a, b, idle = [];
    for (i = 0; i < S.crabs.length; i++) {
      a = S.crabs[i];
      if (!a.moving && !a.working && !a.floating && a.state !== 'sleep' && !a.air && !isHeld(a)) idle.push(a);
      else if (a.dance) { a.dance.dance = null; a.dance = null; }
    }
    craft(idle);
    for (i = 0; i < idle.length; i++) {
      a = idle[i];
      if (a.dance && (a.dance.gone || idle.indexOf(a.dance) < 0)) a.dance = null;
      if (!a.dance) for (j = 0; j < idle.length; j++) {
        b = idle[j];
        if (b === a || b.dance || Math.abs(b.x - a.x) > K.DANCE_RANGE || Math.abs(b.d - a.d) > 0.12) continue;
        a.dance = b; b.dance = a; emit('dance', a, b); break;
      }
      if (a.dance) {
        a.bat = Math.min(1, a.bat + K.DANCE_CHARGE * (1 + S.decor.length * K.DECOR_DANCE) * dt);
        a.wear = Math.max(0, a.wear - K.DANCE_RECOVER * dt);
        a.rested += dt; a.lastRest = S.t; S.stat.danced += dt;
      }
    }
  }
  // The tide rises and falls. Near high water the current washes nodules up onto the claimed dunes;
  // near low water the sand shifts and may bury a flag nobody is working.
  function sea() {
    var i, p, f, free = [];
    S.tide = Math.sin(S.t * 2 * Math.PI / K.TIDE_PERIOD);
    // the plankton patches wander along the sand and the tide sweeps them to and fro; the bloom ebbs
    for (i = 0; i < S.glow.length; i++) {
      p = S.glow[i];
      p.x = (p.x + (K.GLOW_WANDER + S.tide * K.GLOW_DRIFT * (S.storm ? K.STORM_DRIFT : 1)) * dt + K.END) % K.END;
    }
    S.bloom = clamp(S.bloom + dt * ((S.storm ? K.GLOW_STORM : 0) - K.GLOW_EBB * (S.bloom - 0.25)), 0.25, 1);
    if (S.tide > K.TIDE_HIGH && S.t >= S.nextSurge) {
      S.nextSurge = S.t + K.SURGE_EVERY;
      var n = 1 + Math.floor(sr() * 2);
      for (i = 0; i < n && S.nodules.length < K.FIELD_CAP + 4; i++) { p = spot(); S.nodules.push({ x: p.x, d: p.d, alive: true, eddy: -1, by: null, washed: true }); S.stat.washed++; }
      emit('surge', n);
    }
    if (S.tide < -K.TIDE_HIGH && S.t >= S.nextBury) {
      S.nextBury = S.t + K.BURY_EVERY;
      for (i = 0; i < S.flags.length; i++) if (!S.flags[i].by) free.push(S.flags[i]);
      if (free.length && sr() < K.BURY_CHANCE) { f = free[Math.floor(sr() * free.length)]; removeFlag(f); S.stat.buried++; emit('bury', f); }
    }
  }
  // Every few minutes an octopus swims down out of the sea for the ore pile, or for a nodule on the sand.
  // A crab standing near its target scares it off; so does the player, with a click.
  function octoTarget() {
    if (S.ore > 0) return { x: S.pos.ORE, d: 0.8, ore: true };
    var best = null, i, n;
    for (i = 0; i < S.nodules.length; i++) { n = S.nodules[i]; if (n.alive && !n.taken && (!best || n.x > best.x)) best = n; }
    return best ? { x: best.x, d: best.d, nod: best } : null;
  }
  function crabNear(x, d, r) {
    for (var i = 0; i < S.crabs.length; i++) {
      var c = S.crabs[i];
      if (c.state !== 'sleep' && !c.air && Math.abs(c.x - x) + Math.abs(c.d - d) * K.DEPTH < r) return c;
    }
    return null;
  }
  function octopus() {
    var o = S.octo, tg, mv, dx, dd, scarer, i, k;
    if (!o) {
      if (S.t < S.nextOcto) return;
      tg = octoTarget();
      if (!tg) { S.nextOcto = S.t + 20; return; }
      o = S.octo = { x: Math.max(K.FIELD0 - 30, tg.x - 300), d: 0.82, state: 'come', carry: 0, timer: 0, dir: 1, fx: 0 };   // it swims down out of the sea
      S.stat.octopi++; emit('octoArrive', o);
      return;
    }
    mv = K.OCTO_SPEED * dt * (o.state === 'flee' ? 1.6 : 1);
    if (o.state === 'come') {
      tg = octoTarget();
      if (!tg) { o.state = 'flee'; o.fx = o.x; return; }
      o.tg = tg; dx = tg.x - 6 - o.x; dd = tg.d - o.d; o.dir = dx >= 0 ? 1 : -1;
      o.x += Math.abs(dx) <= mv ? dx : o.dir * mv;
      o.d += Math.abs(dd) <= mv / K.DEPTH ? dd : (dd > 0 ? 1 : -1) * mv / K.DEPTH;
      if (Math.abs(dx) < 2 && Math.abs(dd) < 0.01) {                // there: is anyone guarding it?
        scarer = crabNear(o.x, o.d, K.OCTO_SCARE);
        if (scarer) { o.state = 'flee'; o.fx = o.x; emit('octoScared', o, scarer); return; }
        o.state = 'grab'; o.timer = K.OCTO_GRAB;
      }
    } else if (o.state === 'grab') {
      o.timer -= dt;
      scarer = crabNear(o.x, o.d, K.OCTO_SCARE);
      if (scarer) { o.state = 'flee'; o.fx = o.x; emit('octoScared', o, scarer); return; }
      if (o.timer <= 0) {
        tg = o.tg;
        if (tg && tg.ore && S.ore > 0) { k = Math.min(2, S.ore); S.ore -= k; o.carry = k; }
        else if (tg && tg.nod && tg.nod.alive && !tg.nod.taken) {
          tg.nod.taken = true; tg.nod.alive = false; i = S.nodules.indexOf(tg.nod); if (i >= 0) S.nodules.splice(i, 1);
          if (tg.nod.by && tg.nod.by.target === tg.nod) tg.nod.by.target = null;
          o.carry = 1;
        }
        S.stat.stolen += o.carry;
        o.state = 'flee'; o.fx = o.x; o.dir = -1;
        emit('octoSteal', o, o.carry);
      }
    } else {
      o.dir = -1; o.x -= mv;
      if (o.x < Math.max(K.FIELD0 - 40, o.fx - 300)) {               // back up and away into the sea
        emit('octoGone', o, o.carry); S.octo = null; S.nextOcto = S.t + srr(K.OCTO_EVERY[0], K.OCTO_EVERY[1]); }
    }
  }
  // Storms and lava surges come and go on their own clocks.
  function rival(o) {                      // the rival crew sends its ingots up its own line to the same ship
    var before = Math.floor(o.rival);
    o.rival = Math.min(o.need, o.rival + o.rivalRate * dt);
    if (Math.floor(o.rival) > before) emit('rivalSell', o);
    if (o.rival >= o.need) {               // they got there first: the ship takes their metal and sails
      S.rival.won++; S.stat.ordersLost++; S.rep = Math.max(0, S.rep - 1);
      S.rival.drive = Math.max(K.RIVAL_DRIVE[0], S.rival.drive * K.RIVAL_EASE);
      emit('orderLost', o); stir();
      S.order = null; S.nextOrder = S.t + srr(K.ORDER_EVERY[0], K.ORDER_EVERY[1]);
    }
  }
  function weather() {
    var i, p, f, free = [], n;
    if (!S.storm && !S.stormWarned && S.t >= S.stormAt - K.STORM_WARN) { S.stormWarned = true; emit('stormWarn'); }
    if (!S.storm && S.t >= S.stormAt) { S.storm = true; S.stormEnd = S.t + K.STORM_TIME; S.stat.storms++; S.nextStormWash = S.t + 2; S.nextStormBury = S.t + K.STORM_BURY; emit('stormStart'); }
    if (S.storm) {
      if (S.t >= S.nextStormWash) {                         // the rough water stirs nodules up out of the sand
        S.nextStormWash = S.t + K.STORM_WASH; n = 2 + Math.floor(sr() * 2);
        for (i = 0; i < n && S.nodules.length < K.FIELD_CAP + 8; i++) { p = spot(); S.nodules.push({ x: p.x, d: p.d, alive: true, eddy: -1, by: null, washed: true }); S.stat.washed++; }
        emit('surge', n);
      }
      if (S.t >= S.nextStormBury) {                         // and buries flags nobody is working
        S.nextStormBury = S.t + K.STORM_BURY;
        for (i = 0; i < S.flags.length; i++) if (!S.flags[i].by) free.push(S.flags[i]);
        if (free.length && sr() < 0.6) { f = free[Math.floor(sr() * free.length)]; removeFlag(f); S.stat.buried++; emit('bury', f); }
      }
      if (S.t >= S.stormEnd) { inspire('driftwood'); S.storm = false; S.stormWarned = false; S.stormAt = S.t + srr(K.STORM_EVERY[0], K.STORM_EVERY[1]); emit('stormEnd'); }
    }
    if (!S.order && S.t >= S.nextOrder) {                   // a ship arrives wanting a little more than the line is making
      var made = rates(60).sold, need = clamp(Math.round(Math.max(made, 4) * K.ORDER_TIME / 60 * 1.15) + 1, 5, 40);
      S.order = { need: need, got: 0, until: S.t + K.ORDER_TIME, premium: K.ORDER_PREMIUM + S.rep * K.REP_STEP, rival: 0, rivalRate: 0 };
      if (S.rival) S.order.rivalRate = need / (K.ORDER_TIME * srr(K.RIVAL_PACE[0], K.RIVAL_PACE[1]) / S.rival.drive);
      S.stat.orders++; emit('orderStart', S.order); stir();
    }
    if (!S.rival && S.rank >= K.RIVAL_RANK) { S.rival = { since: S.t, drive: 1, won: 0, lost: 0 }; emit('rivalArrive'); }
    if (S.order && S.order.rivalRate) rival(S.order);
    if (S.order && S.t >= S.order.until) {
      emit('orderFail', S.order); stir();
      S.rep = Math.max(0, S.rep - 1); S.order = null; S.nextOrder = S.t + srr(K.ORDER_EVERY[0], K.ORDER_EVERY[1]);
    }
    if (!S.lavaSurge && S.t >= S.lavaAt) { S.lavaSurge = true; S.lavaEnd = S.t + K.SURGE_TIME; S.stat.surges++; emit('lavaStart'); }
    if (S.lavaSurge && S.t >= S.lavaEnd) { inspire('lavaLamp'); S.lavaSurge = false; S.lavaAt = S.t + srr(K.SURGE_EVERY[0], K.SURGE_EVERY[1]); emit('lavaEnd'); }
  }
  // The sea turtle swims straight across, low over one of the claimed dunes. It picks up the first crab it
  // passes that has a long way to go in the turtle's direction (a crab that is flat or limping first) and
  // drops it where it was going.
  function turtle() {
    var tu = S.turtle, i, c, best = null, bs = -1, dist, score, z, f;
    if (!tu) {
      if (S.t < S.nextTurtle) return;
      z = K.ZONES[Math.floor(sr() * up('field'))];
      var dir = sr() < 0.5 ? 1 : -1, lean = 0;
      for (i = 0; i < S.crabs.length; i++) { c = S.crabs[i]; if (c.goal && c.goal.t === S.t && Math.abs(c.goal.x - c.x) >= K.TURTLE_MIN_TRIP) lean += Math.sign(c.goal.x - c.x); }
      if (lean) dir = lean > 0 ? 1 : -1;                     // come in from the side the crabs are travelling from
      S.turtle = { x: dir > 0 ? -60 : K.END + 60, d: srr(z.d0, z.d1), dir: dir, rider: null, turned: false };
      emit('turtleArrive', S.turtle);
      return;
    }
    tu.x += tu.dir * K.TURTLE_SPEED * dt;
    if (!tu.rider) {
      for (i = 0; i < S.crabs.length; i++) {             // look ahead for the crab that would gain most from a lift
        c = S.crabs[i];
        if (c.state === 'sleep' || c.air || c.turtle || isHeld(c) || !c.goal || c.goal.t !== S.t) continue;
        var ahead = (c.x - tu.x) * tu.dir;
        if (ahead < -K.TURTLE_REACH || ahead > 400) {
          if (!tu.turned && ahead < 0 && ahead > -300 && (c.goal.x - c.x) * -tu.dir >= K.TURTLE_MIN_TRIP) { tu.dir = -tu.dir; tu.turned = true; emit('turtleTurn', tu); }   // turn back for it, once
          continue;
        }
        dist = (c.goal.x - c.x) * tu.dir;
        if (dist < K.TURTLE_MIN_TRIP) continue;
        score = dist + (c.limp ? 400 : 0) + (c.bat < K.LOW ? 400 : 0) - ahead * 0.5;
        if (score > bs) { bs = score; best = c; }
      }
      if (best) tu.d += clamp(best.d - tu.d, -0.6 * dt, 0.6 * dt);            // steer toward it
      if (best && (Math.abs(best.x - tu.x) > K.TURTLE_REACH || Math.abs(best.d - tu.d) * K.DEPTH > K.TURTLE_DIP)) best = null;
      if (best) {
        if (best.dance) { best.dance.dance = null; best.dance = null; }
        tu.rider = best; best.turtle = tu; best.ride = { x0: best.x, d0: best.d, gx: best.goal.x, gd: best.goal.d };
        S.stat.turtleRides++; emit('turtlePick', best, tu);
      }
    } else {
      c = tu.rider;
      f = clamp((tu.x - c.ride.x0) / ((c.ride.gx - c.ride.x0) || 1), 0, 1);
      c.x = clamp(tu.x, 0, K.END); c.d = c.ride.d0 + (c.ride.gd - c.ride.d0) * f; c.dir = tu.dir; tu.d = c.d;
      if ((tu.dir > 0 && tu.x >= c.ride.gx) || (tu.dir < 0 && tu.x <= c.ride.gx)) {
        c.x = c.ride.gx; c.d = c.ride.gd; c.turtle = null; c.ride = null; tu.rider = null;
        emit('turtleDrop', c, tu);
      }
    }
    if (tu.x < -80 || tu.x > K.END + 80) {
      if (tu.rider) { c = tu.rider; c.x = clamp(c.x, K.FIELD0, K.STIRLING - 40); c.turtle = null; c.ride = null; emit('turtleDrop', c, tu); }
      S.turtle = null; S.nextTurtle = S.t + srr(K.TURTLE_EVERY[0], K.TURTLE_EVERY[1]);
      emit('turtleGone');
    }
  }
  // The hermit-crab trader walks in from the left, keeps shop beside the den for a minute with three goods
  // out of six, and walks off again.
  function trader() {
    var tr = S.trader, keys, offers = [], i, j;
    if (!tr) {
      if (S.t < S.nextTrader) return;
      keys = Object.keys(K.TRADES);
      while (offers.length < 3) { j = keys[Math.floor(sr() * keys.length)]; if (offers.indexOf(j) < 0) offers.push(j); }
      S.trader = { x: -40, d: 0.9, state: 'come', offers: offers, sold: {}, until: 0 };
      emit('traderArrive', S.trader);
      return;
    }
    if (tr.state === 'come') {
      tr.x += K.TRADER_SPEED * dt;
      if (tr.x >= K.TRADER_SPOT) { tr.x = K.TRADER_SPOT; tr.state = 'stay'; tr.until = S.t + K.TRADER_STAY; emit('traderOpen', tr); }
    } else if (tr.state === 'stay') {
      if (S.t >= tr.until) { tr.state = 'leave'; emit('traderLeave', tr); }
    } else {
      tr.x -= K.TRADER_SPEED * dt;
      if (tr.x < -60) { S.trader = null; S.nextTrader = S.t + srr(K.TRADER_EVERY[0], K.TRADER_EVERY[1]); }
    }
  }
  function trade(id) {                     // swap bars or ingots for one of the trader's goods
    var tr = S.trader, T = K.TRADES[id], i, p, z;
    if (!tr || tr.state !== 'stay' || !T || tr.offers.indexOf(id) < 0 || tr.sold[id]) return 'closed';
    if ((T.pay.bars || 0) > S.bars || (T.pay.ingots || 0) > S.stock) return 'short';
    S.bars -= T.pay.bars || 0; S.stock -= T.pay.ingots || 0;
    if (id === 'bits') S.spares.bit += 2;
    else if (id === 'legs') S.spares.leg += 2;
    else if (id === 'map') {
      for (i = 0; i < 3; i++) {
        p = spot(); z = zoneOf(p.d);
        S.flags.push({ id: S.nextId++, x: p.x, d: p.d, q: srr(0.85, 0.95), size: 3 + K.ZONES[z].size, by: null, zone: z, born: S.t, map: true });
      }
    } else if (id === 'cells') {
      S.heat = K.HEAT_CAP;
      for (i = 0; i < S.crabs.length; i++) if (S.crabs[i].role === 'energy') S.crabs[i].charges = charges();
    } else if (id === 'gear') {
      for (i = 0; i < S.crabs.length; i++) S.crabs[i].fresh = K.MORNING_TIME;
    } else if (id === 'lucky') S.luckyPearls++;
    tr.sold[id] = true; S.stat.trades++;
    emit('trade', id, tr);
    return true;
  }
  function shoo() {                        // the player chases the octopus off; it drops whatever it took
    var o = S.octo, i;
    if (!o) return false;
    if (o.carry) {
      for (i = 0; i < o.carry; i++) S.nodules.push({ x: clamp(o.x + srr(-10, 10), K.FIELD0, K.FIELD1 + 40), d: clamp(o.d + srr(-0.04, 0.04), 0.7, 0.97), alive: true, eddy: -1, by: null });
      S.stat.stolen -= o.carry;
    }
    emit('octoShoo', o, o.carry); inspire('inkPainting');
    o.carry = 0; o.state = 'flee'; o.fx = o.x; o.dir = -1; S.stat.shooed++;
    return true;
  }
  // Idle time is not wasted: every minute of it, counted across the crew, becomes a decoration for the den,
  // made by the idle crab nearest to it. Big moments inspire special pieces.
  function decorMax() { return K.DECOR_BASE + K.DECOR_PER_LV * S.lv.den; }
  function craft(idle) {
    var i, best = null, kind;
    if (S.decor.length >= decorMax()) { S.decorWork = 0; return; }
    S.decorWork += idle.length * dt;
    if (S.decorWork < K.DECOR_WORK || !idle.length) return;
    S.decorWork -= K.DECOR_WORK;
    for (i = 0; i < idle.length; i++) if (!best || Math.abs(idle[i].x - S.pos.DEN) < Math.abs(best.x - S.pos.DEN)) best = idle[i];
    kind = S.decorTheme || K.DECOR_KINDS[Math.floor(sr() * K.DECOR_KINDS.length)];
    S.decorTheme = null;
    S.decor.push({ kind: kind, at: S.t }); S.stat.decorations++;
    emit('decor', best, kind);
  }
  function inspire(kind) { S.decorTheme = kind; }
  function morning() {                     // a new day: crabs that rested well start it fresh
    S.day = S.si.day;
    for (var i = 0; i < S.crabs.length; i++) {
      var c = S.crabs[i];
      if (c.rested >= K.REST_FOR_BONUS) { c.fresh = K.MORNING_TIME + S.decor.length * K.DECOR_MORNING_TIME; S.stat.mornings++; emit('morning', c); }
      c.rested = 0;
    }
    emit('dawn', S.day);
  }

  // flows over the last `secs` simulated seconds, per minute
  function rates(secs) {
    var h = S.hist, b = h[h.length - 1], a, i, o = {}, span;
    secs = secs || 60;
    for (i = h.length - 1; i >= 0 && h[i].t > b.t - secs - 1e-6; i--) a = h[i];
    a = a || b; span = b.t - a.t;
    for (i = 0; i < STATS.length; i++) o[STATS[i]] = span > 0 ? (b[STATS[i]] - a[STATS[i]]) * 60 / span : 0;
    o.span = span;
    return o;
  }

  // ----- what the crew could do at full stretch, in ingots a minute, stage by stage -----
  // The figures are measured: each is one crab's output when nothing upstream or downstream holds it back.
  // Shifts scale them by the share of the day each role is on duty.
  var PER = { scout: [8.8, 10.5, 13], drill: 7.5, wildcat: 0.6, haul: 5.3, crush: 13, smelt: 8, bot: 6.5, charges: 2.6, fixes: 3, mends: 2.5, holes: 10 };
  function dutyShare(role) {
    var cov = coverage(), n = count(role), i, s = 0, w = 0;
    if (!n) return 1;
    for (i = 0; i < cov.length; i++) { s += cov[i].roles[role] / n * cov[i].hours; w += cov[i].hours; }
    return s / w;
  }
  function capacity() {
    var n = counts(), z = up('field'), workers = S.crabs.length - n.energy, wm = 1 + Math.min(K.WEAR_MAX, Math.max(0, avgWear() - K.WEAR_FREE) / K.WEAR_SCALE);
    var breaks = (n.drill * PER.holes * up('bits') + n.energy * 10 * K.EBOT_WEAR) * wm, legs = S.crabs.length * K.LEG_RATE * 60 * wm;
    var d = function (r) { return n[r] * dutyShare(r) * veterans(r); };
    return {
      scout: d('scout') * PER.scout[z - 1] * up('scanner')[0] / 0.5 * (1 + up('scanner')[1]) * (has('wideSonar') ? 1.35 : 1) * (has('deepSonar') ? 1.2 : 1),
      drill: d('drill') * (n.scout ? PER.drill : PER.wildcat) * (has('diamondTips') ? 1.2 : 1) * (has('twinAugers') ? 1.2 : 1),
      haul: d('haul') * PER.haul * (has('bigHopper') ? 1.4 : 1) * (has('springLegs') ? 1.25 : 1),
      crush: d('crush') * PER.crush * (has('hydraulicClaws') ? 1.5 : 1),
      smelt: d('smelt') * PER.smelt * (has('heatTongs') ? 1.25 : 1) * (has('twinTongs') ? 1.6 : 1),
      sell: 60 / up('riser'),
      // power: crabs kept charged per crab working, limited by the bots and by the engine behind them
      power: workers ? Math.min(d('energy') * PER.bot, up('engine') / PER.charges) / workers : 1,
      bots: workers ? d('energy') * PER.bot / workers : 1,
      engine: workers ? up('engine') / PER.charges / workers : 1,
      // repairs and mending: breakdowns the crews can keep up with, per breakdown expected
      repair: breaks ? d('repair') * PER.fixes / breaks : 1,
      mech: legs ? d('mech') * PER.mends / legs : 1
    };
  }
  var FLOW = ['scout', 'drill', 'haul', 'crush', 'smelt', 'sell'];
  function bottleneck() {                  // the stage that sets the pace, or the overhead that is short
    var c = capacity(), i, b = FLOW[0];
    if (c.power < 0.8) return 'power';
    if (c.repair < 1) return 'repair';
    if (c.mech < 1 && S.t > 60) return 'mech';
    for (i = 1; i < FLOW.length; i++) if (c[FLOW[i]] < c[b]) b = FLOW[i];
    return b;
  }
  function gaps() {                        // hours when the line is working but some job has nobody on duty
    var cov = coverage(), n = counts(), out = [], i, r, busy, nightScouts = S.scoutsNight && pattern();
    for (i = 0; i < cov.length; i++) {
      busy = 0; for (r in n) if (r !== 'scout' || !nightScouts) busy += cov[i].roles[r];
      if (!busy) continue;                                  // nobody works then by design: not a gap
      for (r in n) if (n[r] && !cov[i].roles[r] && !(r === 'scout' && nightScouts)) out.push({ shift: cov[i].name, role: r });
    }
    return out;
  }

  // ----- the player's levers -----
  function hireCost(role) { return Math.round(K.HIRE[role] * (1 + K.HIRE_STEP * count(role))); }
  function refund(role) { var n = count(role); return n ? Math.round(K.HIRE[role] * (1 + K.HIRE_STEP * (n - 1)) * K.REFUND) : 0; }
  function crewCap() { return up('den'); }
  function hire(role) {
    var cost = hireCost(role);
    if (S.crabs.length >= crewCap()) return 'den';
    if (S.credits < cost) return 'credits';
    S.credits -= cost; S.stat.spent += cost;
    addCrab(role);
    return true;
  }
  function retire(role) {
    var r = refund(role);
    if (!removeCrab(role)) return false;
    S.credits += r;
    return true;
  }
  function upgradeCost(id) { var u = K.UP[id], l = S.lv[id]; return l < u.costs.length ? u.costs[l] : null; }
  function buy(id) {
    var cost = upgradeCost(id);
    if (cost === null) return 'max';
    if (S.credits < cost) return 'credits';
    S.credits -= cost; S.stat.spent += cost; S.lv[id]++;
    emit('build', id);
    return true;
  }
  function research(id) {
    var t = K.TECH[id];
    if (!t || S.tech[id]) return 'done';
    if (S.credits < t.cost) return 'credits';
    S.credits -= t.cost; S.stat.spent += t.cost; S.tech[id] = true;
    emit('tech', id);
    return true;
  }
  function unlocked(role) { for (var id in K.TECH) if (S.tech[id] && K.TECH[id].roles.indexOf(role) >= 0) return true; return false; }
  function upgradeWorker(id) {
    var u = K.WUP[id];
    if (!u || S.wu[id]) return 'done';
    if (!unlocked(u.role)) return 'locked';
    if (S.credits < u.cost) return 'credits';
    S.credits -= u.cost; S.stat.spent += u.cost; S.wu[id] = true;
    if (id === 'bigCells') for (var i = 0; i < S.crabs.length; i++) if (S.crabs[i].role === 'energy') S.crabs[i].charges = Math.min(charges(), S.crabs[i].charges + 2);
    emit('wup', id);
    return true;
  }
  function place(b, plot) {                // move a building to a plot; whatever stands there swaps places with it
    var other = null, k;
    if (K.BUILDINGS.indexOf(b) < 0 || plot < 0 || plot >= K.PLOTS.length || S.layout[b] === plot) return false;
    for (k in S.layout) if (S.layout[k] === plot) other = k;
    if (other) S.layout[other] = S.layout[b];
    S.layout[b] = plot;
    layoutPos();
    emit('layout', b, other);
    return true;
  }
  function placePost(x, d) {              // the player sets the post down: it stays there until let loose
    if (S.post.carrier) { S.post.carrier.state = 'idle'; S.post.carrier = null; }
    S.post.x = clamp(x, Math.max(K.FIELD0 + 30, K.STIRLING - K.CORD), K.STIRLING - 40);
    S.post.d = clamp(d, 0.72, 0.97); S.post.auto = false; S.post.moved = S.t;
    S.post.home = { x: S.post.x, d: S.post.d }; S.post.warned = false;
    emit('postMoved', null);
  }
  function setPostAuto(on) { S.post.auto = !!on; S.post.moved = -99; }
  function setReserve(n) { S.reserve = clamp(Math.round(n), 0, 12); }
  function setShift(m) {
    if (K.SHIFTS.indexOf(m) < 0 || m === S.shift) return;
    if (m === 'custom' && K.PRESETS[S.shift]) for (var k in K.PRESETS[S.shift]) S.work[k] = K.PRESETS[S.shift][k];   // start from the pattern in use
    S.shift = m; emit('shiftMode', m);
  }
  function setWork(o) {                    // adjust the custom workday
    var w = S.work;
    if (o.start !== undefined) w.start = (Math.round(o.start) + 24) % 24;
    if (o.len !== undefined) w.len = clamp(Math.round(o.len), 2, 12);
    if (o.count !== undefined) w.count = clamp(Math.round(o.count), 1, 2);
    if (o.rest !== undefined) w.rest = clamp(Math.round(o.rest), 0, 8);
    if (o.groups !== undefined) w.groups = clamp(Math.round(o.groups), 1, 3);
    if (w.count * w.len + (w.count - 1) * w.rest > 24) w.rest = Math.max(0, Math.floor((24 - w.count * w.len) / Math.max(1, w.count - 1)));
    if (S.shift !== 'custom') { S.shift = 'custom'; emit('shiftMode', 'custom'); }
  }
  function setScoutsNight(on) { S.scoutsNight = !!on; }
  function overclock(on) {
    if (on && S.ocBank >= 1 && !S.oc) { S.oc = true; emit('ocStart'); }
    else if (!on && S.oc) { S.oc = false; emit('ocEnd'); }
    return S.oc;
  }
  function drain() { var e = events; events = []; return e; }

  // ----- save and load -----
  // A saved game is S as plain JSON, plus the random seed, so a loaded game plays on exactly as it would have.
  // S is a web of references: a drill holds its flag and the flag holds the drill, an energy bot holds the crab
  // it is charging. An object reached from two places is written once with a number ($id) and after that only
  // as {$ref: number}, and loading rebuilds the same web. The view's own fields on sim objects (names that
  // start with v, plus anim and say) are left out.
  var SAVE_VERSION = 1;
  function viewKey(k) { return k.charAt(0) === 'v' || k === 'anim' || k === 'say'; }
  function save() {
    var seen = new Map(), ids = new Map(), next = 1;
    function count(o) {                    // pass 1: how many times each object is reached
      if (!o || typeof o !== 'object') return;
      var n = seen.get(o) || 0, k;
      seen.set(o, n + 1);
      if (n) return;
      if (Array.isArray(o)) o.forEach(count);
      else for (k in o) if (!viewKey(k)) count(o[k]);
    }
    function enc(o) {                      // pass 2: write it out, numbering the shared objects
      var out, k;
      if (typeof o === 'number') return isFinite(o) ? o : null;
      if (!o || typeof o !== 'object') return o;
      if (ids.has(o)) return { $ref: ids.get(o) };
      if (seen.get(o) > 1) ids.set(o, next++);
      if (Array.isArray(o)) {
        out = o.map(enc);
        return ids.has(o) ? { $id: ids.get(o), $arr: out } : out;
      }
      out = ids.has(o) ? { $id: ids.get(o) } : {};
      for (k in o) if (!viewKey(k) && typeof o[k] !== 'function' && o[k] !== undefined) out[k] = enc(o[k]);
      return out;
    }
    count(S);
    return { v: SAVE_VERSION, seed: seed, S: enc(S) };
  }
  function load(data) {                    // returns true, or 'bad' if the save cannot be read; the game is untouched then
    var byId = {}, refs = [], fresh, s, k;
    if (!data || data.v !== SAVE_VERSION || !data.S || typeof data.S !== 'object' || typeof data.seed !== 'number') return 'bad';
    function dec(o) {
      var out, k;
      if (!o || typeof o !== 'object') return o;
      if (Array.isArray(o)) return o.map(dec);
      if (o.$ref !== undefined) { out = byId[o.$ref]; if (!out) refs.push(o.$ref); return out || null; }
      if (o.$arr) { out = []; if (o.$id !== undefined) byId[o.$id] = out; o.$arr.forEach(function (x) { out.push(dec(x)); }); return out; }
      out = {};
      if (o.$id !== undefined) byId[o.$id] = out;
      for (k in o) if (k !== '$id') out[k] = dec(o[k]);
      return out;
    }
    s = dec(data.S);
    if (refs.length || !Array.isArray(s.crabs) || !s.lv || !s.stat) return 'bad';
    fresh = reset();                       // fields added to the game since the save was made start at their defaults
    for (k in fresh) if (!(k in s)) s[k] = fresh[k];
    for (k in K.UP) if (s.lv[k] === undefined) s.lv[k] = 0;
    for (k = 0; k < STATS.length; k++) if (s.stat[STATS[k]] === undefined) s.stat[STATS[k]] = 0;
    S = s; seed = data.seed >>> 0; events = [];
    layoutPos();
    S.crabs.forEach(newcomer);
    return true;
  }

  return {
    save: save, load: load,
    K: K, FLOW: FLOW, reset: reset, step: step, counts: counts, rates: rates, capacity: capacity, bottleneck: bottleneck, up: up, oreCap: oreCap, barCap: barCap,
    hire: hire, retire: retire, hireCost: hireCost, refund: refund, crewCap: crewCap, buy: buy, upgradeCost: upgradeCost,
    setReserve: setReserve, setShift: setShift, setWork: setWork, setScoutsNight: setScoutsNight, dutyFor: dutyFor, pattern: pattern, inPattern: inPattern, hourAt: hourAt, flagCap: flagCap, overclock: overclock, shiftInfo: shiftInfo, coverage: coverage, gaps: gaps, onDuty: onDuty,
    flowMult: flowMult, research: research, upgradeWorker: upgradeWorker, shoo: shoo, trade: trade, decorMax: decorMax, placePost: placePost, lit: lit, glowR: glowR, setPostAuto: setPostAuto, postTarget: postTarget, unlocked: unlocked, has: has, place: place, charges: charges, carry: carry, wearMult: wearMult, isHeld: isHeld, heldBy: heldBy, drain: drain, avgBattery: avgBattery, avgWear: avgWear, zoneOf: zoneOf,
    state: function () { return S; }
  };
}
if (typeof module !== 'undefined') module.exports = CrabSim;
