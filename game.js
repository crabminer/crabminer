(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('scene'), stage = $('stage'), inner = $('stage-inner');
  if (!cv || !cv.getContext || typeof CrabSim !== 'function') return;
  var ctx = cv.getContext('2d');
  var root = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  var mqSmall = window.matchMedia('(max-width: 30rem)');
  var TAU = Math.PI * 2;

  var sim = CrabSim(), K = sim.K, S = null;
  var W = 0, H = 0, Z = 1, DPR = 1, T = 0, last = 0, raf = 0, running = false, acc = 0, speed = 1, uiTick = 0, ledgerTick = 0;
  var CS = 1, surfH = 0, F = 0, lavaL = 0, base = [0, 0, 0], farBase = 0, dunePaths = [], farPath = null, grain = null;
  var pal = {};
  var puffs = [], flights = [], lifts = [], rivalLifts = [], sparks = [], embers = [], weeds = [], snow = [], bubbles = [], lavaBub = [], floaters = [], confetti = [], rings = [];
  var debris = [], nightA = 0, lastShift = '', big = false, lastTrend = 0, surgeToast = false, buryToast = false, inks = [];
  var stormA = 0, lavaA = 0, flash = 0, rain = [], bombs = [];
  var traderBubble = 0, vetToast = false, turtleToast = false, driftToast = false, cargo = { x: -1, phase: 'gone' }, whale = null, nextWhale = 60, whaleId = 0, whaleToast = false;
  var started = false, won = false, startedAt = 0, partyUntil = 0, selected = null, selectedUntil = 0, stageVisible = true, lastPrice = K.PRICE;
  var best = null;

  function rr(a, b) { return a + Math.random() * (b - a); }   // decoration only; the economy has its own numbers
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function cssVar(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
  function readPalette() {
    var names = ['foam', 'sand-far', 'sand-back', 'sand-mid', 'sand-front', 'sand-line', 'nodule', 'weed', 'weed-2', 'crab', 'crab-dark',
      'metal', 'metal-dark', 'light', 'snow', 'bubble', 'drill', 'drill-dark', 'crush', 'crush-dark', 'smelt', 'smelt-dark',
      'energy', 'energy-dark', 'scout', 'scout-dark', 'repair', 'repair-dark', 'hat', 'rock', 'rock-dark', 'rock-line',
      'lava-hot', 'lava', 'lava-deep', 'bar', 'bar-dark', 'ingot', 'ingot-dark', 'warn', 'eye', 'pupil', 'tongue', 'sweat', 'grain',
      'mech', 'mech-dark', 'vent'];
    pal = {};
    names.forEach(function (n) { pal[n.replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); })] = cssVar('--c-' + n); });
    pal.ink = cssVar('--ink'); pal.paper = cssVar('--paper'); pal.mark = cssVar('--mark');
    makeGrain();
    sheets = [];
  }
  var STYLE = {
    scout: function () { return [pal.scout, pal.scoutDark]; },
    drill: function () { return [pal.drill, pal.drillDark]; },
    haul: function () { return [pal.crab, pal.crabDark]; },
    crush: function () { return [pal.crush, pal.crushDark]; },
    smelt: function () { return [pal.smelt, pal.smeltDark]; },
    energy: function () { return [pal.energy, pal.energyDark]; },
    repair: function () { return [pal.repair, pal.repairDark]; },
    mech: function () { return [pal.mech, pal.mechDark]; }
  };
  var SHORT = { scout: 'Scouts', drill: 'Drills', haul: 'Haulers', crush: 'Crushers', smelt: 'Smelters', energy: 'Energy', repair: 'Repair', mech: 'Mech' };   // crew rows on phones
  var NAMES = { scout: 'Scout crab', drill: 'Drill crab', haul: 'Hauler crab', crush: 'Crusher crab', smelt: 'Smelter crab', energy: 'Energy bot', repair: 'Repair bot', mech: 'Maintenance bot' };

  // ----- the dunes: three sheets of paper, stacked back to front -----
  function crestY(k, x) {
    var a = H * 0.012;
    if (k === 0) return base[0] - a * 1.6 * Math.sin(x * 0.0047 + 2.1) - a * 0.8 * Math.sin(x * 0.0133);
    if (k === 1) return base[1] - a * 1.3 * Math.sin(x * 0.0055 + 0.6) - a * 0.7 * Math.sin(x * 0.0151 + 2.2);
    return base[2] - a * 0.9 * Math.sin(x * 0.0061 + 1.3) - a * 0.5 * Math.sin(x * 0.0173 + 0.4);
  }
  function farY(x) { return farBase - H * 0.03 * Math.sin(x * 0.0029 + 0.7) - H * 0.012 * Math.sin(x * 0.011 + 1.9); }
  function dunePath(fn) {
    var p = new Path2D();
    p.moveTo(-10, H + 10);
    for (var x = -10; x <= W + 10; x += 10) p.lineTo(x, fn(x));
    p.lineTo(W + 10, H + 10);
    p.closePath();
    return p;
  }
  function makeGrain() {                // paper fibres, tiled over each dune
    var g = document.createElement('canvas'), gc, i, x, y;
    g.width = g.height = 160;
    gc = g.getContext('2d');
    gc.fillStyle = pal.grain || 'rgba(0,0,0,.08)';
    for (i = 0; i < 900; i++) { gc.globalAlpha = Math.random(); gc.fillRect(Math.random() * 160, Math.random() * 160, 1, 1); }
    gc.strokeStyle = pal.grain || 'rgba(0,0,0,.08)'; gc.lineWidth = 0.6;
    for (i = 0; i < 40; i++) {
      x = Math.random() * 160; y = Math.random() * 160;
      gc.globalAlpha = 0.5 + Math.random() * 0.5;
      gc.beginPath(); gc.moveTo(x, y); gc.quadraticCurveTo(x + rr(-6, 6), y + rr(-6, 6), x + rr(-12, 12), y + rr(-5, 5)); gc.stroke();
    }
    grain = ctx.createPattern(g, 'repeat');
  }
  function layerOf(d) { return d < 1 / 3 ? 0 : (d < 2 / 3 ? 1 : 2); }
  // The sand face of each dune runs from its crest down to the next dune's crest, so a crab walking
  // forward reaches the lip of the next dune without a jump, and humps up a little to climb over it.
  function groundY(px, d) {
    var k = layerOf(d), f = d * 3 - k, top = crestY(k, px) + 4 * CS, bot = (k < 2 ? crestY(k + 1, px) + 4 * CS : H - 9 * CS), y = top + f * (bot - top), b, i;
    for (i = 1; i <= 2; i++) { b = Math.abs(d - i / 3); if (b < K.CREST) y -= 5 * CS * (1 - b / K.CREST); }
    return y;
  }
  function crabLayer(c) { return layerOf(Math.min(1, c.d + 0.04)); }   // a crab on the lip is drawn on the dune in front
  function crestTilt(c) {                // leaning into the climb over a dune's lip
    for (var i = 1; i <= 2; i++) { var b = c.d - i / 3; if (Math.abs(b) < K.CREST && c.moving && Math.abs(c.d - c.vd2) > 1e-5) return (c.d > c.vd2 ? 1 : -1) * (b < 0 ? -0.22 : 0.16) * c.dir; }
    return 0;
  }
  function scaleAt(d) { return CS * (0.7 + 0.3 * d); }
  function X(lx) { return lx / K.END * W; }
  function Xinv(px) { return px / W * K.END; }

  // ----- layout -----
  function measure() {
    // Z is the page's zoom (the root font size over 16px): the canvas is laid out in units of Z pixels,
    // as on a screen at Z times the scaling, and drawn with Z times the pixels.
    Z = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
    var cw = stage.clientWidth / Z, h = stage.clientHeight / Z, widthChanged;
    if (!cw || !h) return;
    big = document.body.classList.contains('big') || mqSmall.matches;   // small screens always get the big field's dunes
    CS = big ? clamp(Math.min(h / 360, cw / 640), 0.8, 1.9) : clamp(Math.min(h / 470, cw / 860), 0.65, 1.45);
    var w = Math.max(cw, Math.round((big ? 1150 : 860) * CS));   // the big field is wider than the screen: it scrolls
    widthChanged = w !== W;
    W = w; H = h;
    DPR = Math.min(window.devicePixelRatio || 1, 2) * Z;
    inner.style.width = W * Z + 'px';
    cv.style.width = W * Z + 'px'; cv.style.height = H * Z + 'px';
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    surfH = clamp(H * 0.09, 34, 80);
    if (big) { farBase = H * 0.24; base = [H * 0.31, H * 0.4, H * 0.5]; }   // the front dune fills the lower half
    else { farBase = H * 0.36; base = [H * 0.45, H * 0.6, H * 0.74]; }
    F = H - base[2];
    lavaL = X(K.LAVA);
    dunePaths = [0, 1, 2].map(function (k) { return dunePath(function (x) { return crestY(k, x); }); });
    farPath = dunePath(farY);
    sheets = [];
    if (grain === null) makeGrain();
    if (widthChanged) decorate();
  }
  function decorate() {
    var i, j, n;
    weeds = [];
    n = clamp(Math.round(W / 200), 3, 9);
    for (i = 0; i < n; i++) {
      var bx = rr(20, lavaL - 80), stalks = 2 + Math.floor(Math.random() * 3), k = Math.random() < 0.5 ? -1 : 0;
      for (j = 0; j < stalks; j++) weeds.push({ x: bx + rr(-16, 16), k: k, h: rr(0.4, 1.05), ph: rr(0, TAU), amp: rr(9, 18), w: rr(3, 5) });
    }
    snow = [];
    n = clamp(Math.round(W * H / 26000), 20, 90);
    for (i = 0; i < n; i++) snow.push({ x: rr(0, W), y: rr(0, 1), r: rr(0.6, 1.6), vy: rr(5, 14), ph: rr(0, TAU) });
    lavaBub = [];
    for (i = 0; i < 6; i++) lavaBub.push({ u: rr(0.1, 0.95), t: rr(0, 1), dur: rr(0.9, 2), r: rr(2, 4.5) });
    bubbles = []; fish = []; jellies = []; deep = []; plankton = [];
  }

  // ----- small effects -----
  function burst(x, y, k) {
    for (var i = 0; i < k; i++) bubbles.push({ x: x + rr(-6, 6), y: y + rr(-4, 4), r: rr(1.4, 4.2), vy: rr(22, 46), ph: rr(0, TAU) });
  }
  function poof(x, y, k, power, color) {
    if (mqReduce.matches) k = Math.ceil(k / 3);
    for (var i = 0; i < k; i++) puffs.push({
      x: x + rr(-4, 4), y: y + rr(-2, 2), vx: rr(-38, 38) * power, vy: rr(-40, -8) * power,
      r: rr(2, 4.5), gr: rr(7, 14), life: 0, max: rr(0.6, 1.15), color: color || (Math.random() < 0.5 ? pal.sandLine : pal.sandBack)
    });
  }
  function spark(x, y, k, color) {
    for (var i = 0; i < k; i++) sparks.push({ x: x + rr(-6, 6), y: y + rr(-6, 4), vx: rr(-40, 40), vy: rr(-60, -10), life: 0, max: rr(0.25, 0.55), c: color || pal.light });
  }
  function ink(o) {                      // the octopus leaves in a cloud of ink
    var op = octoPos(), px = op.x, y = op.y - 10 * CS;
    for (var i = 0; i < 14; i++) inks.push({ x: px + rr(-8, 8), y: y + rr(-8, 4), r: rr(4, 9) * CS, vx: rr(-30, 10), vy: rr(-20, 4), life: 0, max: rr(1.2, 2.2) });
  }
  function floater(text, x, y, big) { floaters.push({ text: text, x: x, y: y, life: 0, max: big ? 2.4 : 1.6, big: !!big }); }
  function express(c, name, dur) { c.vx = { name: name, until: T + (dur || 1.4) }; }

  // ----- crab talk -----
  // Crabs speak in short emoji sentences: a thing, then a verb, then sometimes who or how they feel.
  //   things: 🔋 charge  🦵 leg  ⛏️ drill bit  🪨 nodule  🧱 bar  🪙 ingot  🚩 flag  🔥 forge  🌋 vent  🦀 you, me
  //   verbs:  ❓ I need  ➡️ bringing it  👍 on my way  ✅ got it, done  💔 broke  ⛔ full, can't  ❗ found one  ❤️ thanks
  // So "🔋❓" is "I need charge", and an energy bot answers "🔋➡️🦀", "bringing you charge".
  // Crab talk: each situation has a few ways of saying it, and say() picks one, so the crew does not
  // repeat itself. Every emoji used here needs a word in WORDS for devices that cannot draw emoji.
  var TALK = {
    needCharge: ['🔋❓', '🔋😩❓'], bringCharge: ['🔋➡️🦀', '⚡🏃🦀'], gotCharge: ['🔋✅❤️', '⚡😊👍'], ebotBreak: ['🔋💔😵', '🔧💥😵'],
    bitBreak: ['⛏️💔😭', '⛏️💥😫'], needBit: ['⛏️❓', '⛏️💔❓'], onBit: ['⛏️👍', '🔧🏃'], bringBit: ['⛏️➡️🦀', '⛏️🏃💨'], fixedBit: ['⛏️✅❤️', '⛏️✨😊'],
    legOff: ['🦵💔😭', '🦵🙈😱'], needLeg: ['🦵❓', '🦵😩❓'], onLeg: ['🦵👍', '🔧🏃'], bringLeg: ['🦵➡️🦀', '🦵🏃💨'], mended: ['🦵✅❤️', '🦵✨💃'],
    strike: ['🪨✅🎉', '🪨🪨😆'], dry: ['🪨❌😤', '🕳️❌😒'], flag: ['🚩❗', '🚩👀✨'], miss: ['🚩❓🤷', '🚩🙈❓'],
    needOre: ['🪨❓', '🪨😴❓'], oreFull: ['🪨⛔', '🪨📦😅'], needBar: ['🧱❓', '🧱👀❓'], barFull: ['🧱⛔', '🧱🧱😅'],
    needIngot: ['🪙❓', '🪙👀❓'], stockFull: ['🪙⛔', '🪙📦😅'], smelted: ['🪙✅🎶', '🔥🪙😎'],
    toForgeIngot: ['🪙➡️🔥', '🪙🏃🔥'], toForgeBar: ['🧱➡️🔥', '🧱🏃🔥'], needHeat: ['🔥❓', '🔥🥶❓'],
    wake: ['☀️👋', '🥱☀️'], ride: ['🌋⬆️😆', '💨⬆️🤩'], land: ['🦀✅', '🦀👌'], oc: ['⚡💪', '⚡🏃💨'], rave: ['🎉🦀🎶', '🕺🦀💃'],
    dance: ['🎶🦀🦀🎶', '💃🦀🕺', '🦀❤️🦀'], morning: ['☀️💪', '☀️😄👋'],
    postGrab: ['🔌➡️', '🔌🏃'], postGrabTide: ['🔌🌊👍', '🔌🌊💪'], postDrift: ['🔌🌊❗', '🔌🌊😮'],
    pearl: ['🦪❗🎉', '🦪✨🤩'], flagsWashed: ['🚩💔🌊', '🌊🚩😭'], stack: ['🪨👍', '🪨📦👍'], stackBroken: ['⛏️💔🪨👍', '⛏️💔🪨💪'],
    spareBit: ['🛒⛏️👍', '🛒⛏️😊'], spareLeg: ['🛒🦵👍', '🛒🦵😊'], turtlePick: ['🐢😆', '🐢⬆️🤩'], turtleDrop: ['🐢❤️', '🐢👋😊'],
    decor: ['🐚✨🏠', '🏠🎀😍'], orderStart: ['🚢🪙❗', '🚢👀🪙'], orderDone: ['🚢✅🎉', '🚢🪙🥳'],
    rivalArrive: ['🦞❗😨', '🦞👀😬'], rivalWin: ['🦞🚢😤', '🦞🏆😒'], storm: ['🌩️😨', '🌊🌩️😱'], lava: ['🌋🔥🎉', '🌋🔥😎'],
    octoScared: ['🐙⛔', '🐙👊😤'], octoShoo: ['🐙🏃', '🐙👋😆'], octoSteal: ['🪨💔🐙', '🐙🪨😱'], veteran: ['⭐🦀💪', '⭐✨😎'], whale: ['🐋👋', '🐋😮✨']
  };
  var TALK_LABEL = {   // what each kind of talk means, for the tally in the Ledger
    needCharge: 'Asking for a charge', bringCharge: 'Bringing a charge', gotCharge: 'Thanks for a charge', ebotBreak: 'An energy bot wearing out',
    bitBreak: 'A drill bit snapping', needBit: 'Asking for a new bit', onBit: 'On the way with a bit', bringBit: 'Carrying a bit over', fixedBit: 'A bit fitted',
    legOff: 'A leg coming off', needLeg: 'Asking for a new leg', onLeg: 'On the way with a leg', bringLeg: 'Carrying a leg over', mended: 'A leg mended',
    strike: 'Striking metal', dry: 'A dry hole', flag: 'Flagging a deposit', miss: 'A scan that found nothing',
    needOre: 'Waiting for nodules', oreFull: 'The ore pile is full', needBar: 'Waiting for bars', barFull: 'The bar stack is full',
    needIngot: 'Waiting for ingots', stockFull: 'The stockpile is full', smelted: 'An ingot smelted',
    toForgeIngot: 'An ingot to the forge', toForgeBar: 'A bar to the forge', needHeat: 'The engine is cold',
    wake: 'Waking up', ride: 'Riding the vent', land: 'Landing from the vent', oc: 'Overclocked', rave: 'The crab rave',
    dance: 'Dancing with a friend', morning: 'Morning bonus', postGrab: 'Moving the refuel post', postGrabTide: 'Fetching the post back from the tide', postDrift: 'The tide moving the post',
    pearl: 'Finding a pearl', flagsWashed: 'The tide burying flags', stack: 'Stacking nodules', stackBroken: 'Hauling with a broken bit',
    spareBit: "Fitting the trader's spare bit", spareLeg: "Fitting the trader's spare leg", turtlePick: 'Climbing on the turtle', turtleDrop: 'Thanking the turtle',
    decor: 'Decorating the den', orderStart: 'A ship order', orderDone: 'An order filled', rivalArrive: 'The rival crew turning up', rivalWin: 'The rival filling an order',
    storm: 'A storm', lava: 'A lava surge', octoScared: 'Facing down the octopus', octoShoo: 'The octopus shooed', octoSteal: 'The octopus stealing ore',
    veteran: 'Earning a star', whale: 'Waving at the whale'
  };
  var TALK_KEY = new Map(), talkCount = {}, TALK_SAVE_KEY = 'crabminer-talk';   // which situation a phrase list is, and how often each was said
  Object.keys(TALK).forEach(function (k) { TALK_KEY.set(TALK[k], k); });
  var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
  var WORDS = { '🔋': 'charge', '🦵': 'leg', '⛏': 'bit', '🪨': 'ore', '🧱': 'bar', '🪙': 'ingot', '🚩': 'flag', '🔥': 'forge', '🌋': 'vent',
    '🦀': 'crab', '❓': '?', '➡': '>', '👍': 'ok', '✅': 'done', '💔': 'broke', '⛔': 'full', '❗': '!', '❤': '♥', '❌': 'no',
    '😭': ':(', '😤': '#@!', '🤷': '?', '🎉': 'yay', '🎶': '♪', '😵': '@_@', '☀': 'up', '👋': 'hi', '⬆': '^', '😆': ':D', '⚡': 'zap', '💪': '!', '🔌': 'plug', '💨': '~', '🐙': 'octopus', '🦪': 'pearl', '🌊': 'tide', '🏃': 'run', '🌩': 'storm', '😨': 'eek', '🚢': 'ship', '🐋': 'whale', '🐚': 'shell', '✨': 'shiny', '🏠': 'den', '🐢': 'turtle', '🛒': 'shop', '⭐': 'star', '🦞': 'rival',
    '😩': 'ugh', '😊': ':)', '🔧': 'fix', '💥': 'bang', '😫': 'ugh', '🙈': 'oops', '😱': 'eek!', '🕳': 'hole', '😒': 'meh', '👀': 'look',
    '😴': 'zz', '📦': 'stack', '😅': 'phew', '😎': 'cool', '🥶': 'cold', '🥱': 'yawn', '🤩': 'wow', '👌': 'ok', '🕺': 'dance', '💃': 'dance',
    '😄': ':D', '😮': 'oh', '🎀': 'bow', '😍': '<3', '🥳': 'party', '😬': 'yikes', '🏆': 'won', '👊': 'pow' };
  var emojiOK = (function () {          // can this device draw emoji? If not, crabs spell their words
    try {
      var c = document.createElement('canvas'), g = c.getContext('2d'), draw2 = function (t) {
        g.clearRect(0, 0, 24, 24); g.fillText(t, 0, 0);
        return Array.prototype.join.call(g.getImageData(0, 0, 24, 24).data, '');
      };
      c.width = c.height = 24;
      g.font = '18px ' + EMOJI_FONT; g.textBaseline = 'top'; g.fillStyle = '#000';
      var crab = draw2('🦀'), none = draw2('\u{10FFFD}'), blank = draw2('');
      return crab !== blank && crab !== none;   // drawn, and not the box a missing character gets
    } catch (e) { return false; }
  })();
  function spoken(text) {
    if (emojiOK) return text;
    var out = [], parts = Array.from(text.replace(/\uFE0F/g, ''));
    for (var i = 0; i < parts.length; i++) out.push(WORDS[parts[i]] || parts[i]);
    return out.join(' ').replace(/ \?/g, '?').replace(/ !/g, '!');
  }
  // How a bubble moves, from what it says: happy ones bounce glyph by glyph, cross ones shake, questions
  // tilt, love pulses, alarms jump, and sad ones droop. Every bubble pops in.
  var MOODS = [['sad', /😭|😱|😵|😫|😨|💔|😬/], ['angry', /😤|⛔|❌|😒|👊/], ['love', /❤|😍|😊/],
    ['joy', /🎉|🎶|😆|🤩|🥳|💃|🕺|😎|✨|💪|😄/], ['alarm', /❗|😮|💥/], ['ask', /❓|🤷|👀/]];
  function moodOf(text) { for (var i = 0; i < MOODS.length; i++) if (MOODS[i][1].test(text)) return MOODS[i][0]; return 'pop'; }
  function say(c, text, dur) {
    if (!c || !text) return;
    var key = TALK_KEY.get(text) || 'other';
    if (Array.isArray(text)) text = text[Math.floor(Math.random() * text.length)];
    c.say = { text: spoken(text), until: T + (dur || 1.8), start: T, mood: moodOf(text) };
    talkCount[key] = (talkCount[key] || 0) + 1;
  }
  function needs(c) {                    // what a crab asks for when it is stuck: the helpers answer
    if (c.state === 'sleep' || c.alt > 0) return null;
    if (c.role !== 'energy' && c.bat < 0.3 && !c.claimedBy) return TALK.needCharge;
    if (c.limp && !c.mendBy) return TALK.needLeg;
    if (c.role === 'drill' && !c.bitOk && !c.fixBy) return TALK.needBit;
    if (c.role === 'haul' && c.state === 'stack' && S.ore >= sim.oreCap()) return TALK.oreFull;
    if (c.role === 'crush' && c.state === 'wait' && S.ore < 2) return TALK.needOre;
    if (c.role === 'crush' && c.state === 'hold') return TALK.barFull;
    if (c.role === 'smelt' && c.state === 'grab' && c.carry !== 'bar' && S.bars <= 0) return TALK.needBar;
    if (c.role === 'smelt' && c.state === 'drop' && S.stock >= K.STOCK_CAP) return TALK.stockFull;
    if (c.role === 'repair' && c.state === 'fetch' && c.carry !== 'ingot' && S.stock <= 0) return TALK.needIngot;
    if (c.role === 'mech' && c.state === 'fetch' && c.carry !== 'bar' && S.bars <= 0) return TALK.needBar;
    if (c.role === 'energy' && c.state === 'refill' && S.heat < 1) return TALK.needHeat;
    return null;
  }
  function crabX(c) { return X(c.x) + (c.role === 'crush' ? [-14, 14, 0][c.k % 3] * scaleAt(c.d) : 0); }
  function clawPos(c, side) { var s = scaleAt(c.d), px = crabX(c); return { x: px + side * 15 * s, y: groundY(px, c.d) - 12 * s }; }
  function oreSlot(i) {                // the ore pile is a pyramid, six nodules wide
    var row = 0, size = 6, k = i, s = scaleAt(0.8), rp = 4 * s, px = X(S.pos.ORE);
    while (k >= size && size > 1) { k -= size; size--; row++; }
    return { x: px + (k - (size - 1) / 2) * rp * 2.3, y: groundY(px, 0.8) - rp * 0.8 - row * rp * 1.45 };
  }
  function barSlot(i) {                // bars are stacked like bricks, two wide
    var s = scaleAt(0.78), px = X(S.pos.BAR);
    return { x: px + ((i % 2) - 0.5) * 9 * s, y: groundY(px, 0.78) - 2 * s - Math.floor(i / 2) * 4.1 * s };
  }
  function stockSlot(i) {              // refined metal, stacked in a pyramid of gold
    var row = 0, size = 5, k = i, s = scaleAt(0.84), px = X(S.pos.STOCK);
    while (k >= size && size > 1) { k -= size; size--; row++; }
    if (row > 4) row = 4;
    return { x: px + (k - (size - 1) / 2) * 9.6 * s, y: groundY(px, 0.84) - 2.2 * s - row * 4.2 * s };
  }
  function collectorBase() { var px = X(S.pos.COLLECTOR); return { x: px, y: groundY(px, 0.7) }; }
  function chuteMouth() { var b = collectorBase(), s = scaleAt(0.7); return { x: b.x - 30 * s, y: b.y - 16 * s }; }
  function riserPoint(t) {             // a point along the riser, 0 at the collector and 1 at the surface
    var b = collectorBase(), s = scaleAt(0.7), x0 = b.x + 6 * s, y0 = b.y - 34 * s;
    var cx = b.x + 6 + Math.sin(T * 0.35) * 16, cy = H * 0.3, x1 = b.x + 2 + Math.sin(T * 0.22 + 1) * 10, y1 = -10, u = 1 - t;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
  }
  function enginePos() { var px = X(K.STIRLING); return { x: px, y: groundY(px, 0.72) }; }
  function basePos() { var px = X(K.STIRLING - 22); return { x: px, y: groundY(px, 0.8) }; }
  function postPos() { var px = X(S.post.x); return { x: px, y: groundY(px, S.post.d) }; }
  function drawCord() {                // the extension cord from the engine's outlet to the refuel post, lying on the sand
    var b = basePos(), p = postPos(), n = 24, i, f, x, y, d0 = 0.8, d1 = S.post.d;
    ctx.save(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6 * CS; ctx.globalAlpha = 0.55; ctx.lineCap = 'round';
    ctx.beginPath();
    for (i = 0; i <= n; i++) {
      f = i / n; x = b.x + (p.x - b.x) * f;
      y = groundY(x, d0 + (d1 - d0) * f) - 2 * CS + Math.sin(f * Math.PI * 5 + 0.7) * 2.5 * CS * Math.sin(f * Math.PI);   // loops of slack
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }
  function drawPost() {                // a little pole with two sockets and a green lamp, leaning in the current
    var p = postPos(), s = scaleAt(S.post.d), lit = S.heat >= 1, lean = S.post.carrier ? 0 : clamp(S.post.drift * 60 / 3, -1, 1) * 0.18;
    if (Math.abs(lean) > 0.02 && Math.random() < 0.15) poof(p.x - Math.sign(lean) * 6 * s, p.y, 1, 0.4);   // sand kicked up as it slides
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(lean); ctx.scale(s, s);
    ctx.fillStyle = pal.energyDark; roundRect(-5, -26, 10, 26, 2); ctx.fill();
    ctx.fillStyle = pal.metal; ctx.fillRect(-7, -6, 14, 3);
    ctx.fillStyle = pal.ink; ctx.fillRect(-3.5, -20, 2.5, 3); ctx.fillRect(1, -20, 2.5, 3);
    ctx.fillStyle = lit ? pal.energy : pal.warn; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 4);
    ctx.beginPath(); ctx.arc(0, -29, 2.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    if (!S.post.auto) { ctx.fillStyle = pal.mark; ctx.beginPath(); ctx.moveTo(-2, -36); ctx.lineTo(2, -36); ctx.lineTo(0, -32); ctx.closePath(); ctx.fill(); }   // pinned
    if (arrange) { ctx.strokeStyle = pick === 'post' ? pal.mark : pal.ink; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.strokeRect(-12, -40, 24, 44); ctx.setLineDash([]); }
    ctx.restore();
  }
  function ventTop() { return H * 0.1; }
  function airPos(c) {                 // where a crab riding the vent, or swimming down from it, is drawn
    var px = crabX(c), gy = groundY(px, c.d) - 9 * scaleAt(c.d);
    return { x: px + (c.air && c.air.phase === 'rise' ? Math.sin(T * 5 + c.vph) * 4 * CS : 0), y: gy + (ventTop() + 14 * CS - gy) * c.alt };
  }

  // ----- the economy's events become things you can see -----
  function fly(kind, from, to, dur, extra) {
    var f = { kind: kind, x0: from.x, y0: from.y, to: to, t: 0, dur: dur };
    if (extra) for (var k in extra) f[k] = extra[k];
    flights.push(f);
  }
  function incoming(tag) { var n = 0; for (var i = 0; i < flights.length; i++) if (flights[i].tag === tag) n++; return n; }
  function handle(e) {
    var a = e.a, p, m, i, j;
    switch (e.type) {
      case 'join': a.vfall = started ? 1 : 0; a.vjoin = true; break;
      case 'leave': p = crabX(a); burst(p, groundY(p, a.d) - 10, 6); near(a.x, 70).forEach(function (n) { play(n, ['wave', 'bow'], 1.6); }); break;
      case 'strike': p = X(a.x); poof(p, groundY(p, a.d), 8, 0.8); express(a, 'joy', 1.2); a.vhop = 1; say(a, TALK.strike, 1.4); play(a, ['pump', 'hopJoy', 'clap', 'jazz'], 1.4); break;
      case 'uncover': p = X(a.x); poof(p, groundY(p, a.d), 5, 0.6); near(a.x, 30).forEach(function (n) { if (n.role === 'drill') play(n, ['cheer', 'spin'], 1.6); }); break;
      case 'dry': p = X(a.x); poof(p, groundY(p, a.d), 6, 0.5, pal.sandBack); express(a, 'grumble', 1.5); say(a, TALK.dry, 1.5); play(a, ['stomp', 'grumble', 'slump', 'shrug'], 1.6); break;
      case 'bitBreak': p = clawPos(a, 0); spark(p.x, p.y + 10, 10, pal.drill); express(a, 'shock', 1.6); a.vhop = 0.6; say(a, TALK.bitBreak, 2); play(a, ['shock', 'ouch'], 1.6); break;
      case 'flag': e.b.vborn = T; p = X(e.b.x); rings.push({ x: p, y: groundY(p, e.b.d), t: 0, c: pal.scout }); express(a, 'eureka', 1.4); a.vhop = 0.8; say(a, TALK.flag, 1.5); play(a, ['jazz', 'pump', 'disco'], 1.5); break;
      case 'miss': express(a, 'shrug', 1.4); say(a, TALK.miss, 1.4); play(a, ['shrug', 'think', 'sigh'], 1.5); break;
      case 'flagDone': p = X(a.x); poof(p, groundY(p, a.d) - 6, 5, 0.5); near(a.x, 40).forEach(function (n) { if (n.role === 'drill') play(n, ['bow', 'wave'], 1.4); }); break;
      case 'stack': fly('nod', clawPos(a, 1), oreSlot(Math.max(0, S.ore - 1)), 0.32, { tag: 'ore' }); if (a.load === 0) { express(a, 'phew', 1); if (Math.random() < 0.4) play(a, ['flex', 'sigh'], 1.2); } break;
      case 'feed': fly('nod', oreSlot(S.ore + 1), clawPos(a, -1), 0.3); fly('nod', oreSlot(S.ore), clawPos(a, -1), 0.36); break;
      case 'bar': p = clawPos(a, 1); fly('bar', p, barSlot(Math.max(0, S.bars - 1)), 0.32, { tag: 'bars' }); poof(crabX(a), groundY(crabX(a), a.d) - 6 * CS, 5, 0.5, pal.barDark); if (Math.random() < 0.35) play(a, ['clap', 'flex'], 1.2); break;
      case 'grab': fly('bar', barSlot(S.bars), clawPos(a, -1), 0.26); break;
      case 'ingot': express(a, 'proud', 1.4); if (Math.random() < 0.5) say(a, TALK.smelted, 1.3); play(a, ['flex', 'pump', 'clap'], 1.2); spark(clawPos(a, 1).x, clawPos(a, 1).y, 5, pal.lavaHot); break;
      case 'stock': fly('ingot', clawPos(a, 1), stockSlot(Math.max(0, S.stock - 1)), 0.34, { tag: 'stock' }); break;
      case 'sell':
        fly('ingot', stockSlot(S.stock), chuteMouth(), 0.4, { lift: true, value: a, streak: e.b });
        if (a >= 15) near(S.pos.COLLECTOR, 140).forEach(function (n) { play(n, ['cheer', 'headbang', 'disco', 'sparkleEyes'], 2); });
        else if (Math.random() < 0.3) { var nb = near(S.pos.COLLECTOR, 120); if (nb.length) play(anyOf(nb), ['clap', 'jazz', 'whistle'], 1.4); }
        if (e.b === 5 || e.b === 10 || e.b === 20) near(S.pos.STOCK, 160).forEach(function (n) { play(n, { 5: 'shimmy', 10: 'robot', 20: 'floss' }[e.b], 2.4); });
        break;
      case 'takeMat': if (!sim.has(a.role === 'repair' ? 'pocketForge' : 'mechForge')) say(a, a.role === 'repair' ? TALK.toForgeIngot : TALK.toForgeBar, 1.6);
        if (a.role === 'repair') fly('ingot', stockSlot(S.stock), clawPos(a, 1), 0.3); else fly('bar', barSlot(S.bars), clawPos(a, 1), 0.3); break;
      case 'forged': p = clawPos(a, 1); spark(p.x + 8 * CS, p.y, 10, pal.lavaHot); express(a, 'proud', 1.2); say(a, a.role === 'mech' ? TALK.bringLeg : TALK.bringBit, 2); break;
      case 'legOff': debris.push({ x: a.x, d: a.d, crab: a, rot: rr(-1, 1) }); p = clawPos(a, -1); spark(p.x, p.y + 8, 8, pal.metal); express(a, 'ouch', 1.8); a.vhop = 0.5; say(a, TALK.legOff, 2); break;
      case 'sleep': express(a, 'yawn', 1.2); a.anim = null; break;
      case 'wake': express(a, 'stretch', 1.2); say(a, TALK.wake, 1.4); play(a, ['yawnStretch', 'sideStretch', 'wave'], 1.6); break;
      case 'ride': p = X(K.VENT_IN); burst(p, groundY(p, 0.8) - 6, 6); express(a, 'wheee', 2.5); say(a, TALK.ride, 2.2); break;
      case 'land': p = X(a.x); poof(p, groundY(p, a.d), 8, 0.7); a.vhop = 0.7; say(a, TALK.land, 1); play(a, ['hopJoy', 'bow', 'jazz'], 1.2); break;
      case 'plug': p = postPos(); spark(p.x, p.y - 18 * CS, 4, pal.light); break;
      case 'ocStart': for (i = 0; i < S.crabs.length; i++) { p = clawPos(S.crabs[i], 0); spark(p.x, p.y, 3, pal.light); if (i % 3 === 0) say(S.crabs[i], TALK.oc, 1.6); if (i % 3 === 1) play(S.crabs[i], ['flex', 'determined'], 1.4); } break;
      case 'shiftMode': toast(SHIFT_INFO[a].name, SHIFT_INFO[a].note); S.crabs.forEach(function (n) { play(n, 'salute', 1.2); }); break;
      case 'ocEnd': S.crabs.forEach(function (n, j2) { if (j2 % 2) play(n, 'sigh', 1.2); }); break;
      case 'flowLost': near(S.pos.STOCK, 90).forEach(function (n) { play(n, 'slump', 1.4); }); break;
      case 'dance': a.vpd = e.b.x >= a.x ? 1 : -1; e.b.vpd = -a.vpd; if (Math.random() < 0.5) say(a, TALK.dance, 1.6); break;
      case 'morning': say(a, TALK.morning, 1.8); play(a, ['salute', 'flex', 'jazz', 'yawnStretch'], 1.8); break;
      case 'dawn': if (started) toast('Morning of day ' + a, 'Crabs that slept or danced in the night start the day fresh: 15% faster for a minute.'); break;
      case 'postGrab': say(a, Math.abs(S.post.x - S.post.home.x) > 40 ? TALK.postGrabTide : TALK.postGrab, 1.6); play(a, ['flex', 'determined'], 1.2); break;
      case 'postDrift':
        if (!driftToast) { driftToast = true; toast('The tide is pushing the refuel post', 'The current slides it along the sand. An energy bot will drag it back where it belongs.'); }
        near(S.post.x, 90).forEach(function (n) { if (n.role === 'energy') { say(n, TALK.postDrift, 1.6); play(n, 'shock', 1); } });
        break;
      case 'postMoved': if (a) play(a, ['wave', 'flex'], 1.2); near(S.post.x, 80).forEach(function (n) { if (n.role === 'energy') play(n, 'wave', 1); }); break;
      case 'tech': S.crabs.forEach(function (n) { if (K.TECH[a].roles.indexOf(n.role) >= 0) play(n, ['jazz', 'sparkleEyes', 'cheer'], 2); }); break;
      case 'wup': S.crabs.forEach(function (n) { if (n.role === K.WUP[a].role) play(n, ['twirlEyes', 'spin', 'flex'], 2); }); break;
      case 'pearl':
        p = clawPos(a, 1); spark(p.x, p.y, 18, pal.light); spark(p.x, p.y, 10, pal.ingot);
        fly('pearl', p, chuteMouth(), 0.9, { lift: true, value: e.b, pearl: true });
        say(a, TALK.pearl, 2.2); play(a, ['spin', 'jazz', 'hopJoy'], 2);
        near(a.x, 120).forEach(function (n) { if (n !== a) play(n, ['cheer', 'clap', 'sparkleEyes'], 1.8); });
        toast('Pearl jackpot! +$' + e.b, 'A drill crab found a pearl in a rich deposit. Crab profit!');
        break;
      case 'surge':
        if (!surgeToast) { surgeToast = true; toast('High tide', 'The current is washing nodules up onto the dunes. Free metal for the haulers!'); }
        for (i = 0; i < 6; i++) burst(rr(0, X(K.FIELD1)), rr(base[0], H), 2);
        break;
      case 'bury':
        p = X(a.x); poof(p, groundY(p, a.d) - 6, 14, 0.8); surgeToast = false;
        near(a.x, 150).forEach(function (n) { if (n.role === 'scout' || n.role === 'drill') { say(n, TALK.flagsWashed, 1.8); play(n, ['slump', 'shrug'], 1.6); } });
        if (!buryToast) { buryToast = true; toast('Low tide', 'The sand is shifting. Flags nobody is working can get buried.'); }
        break;
      case 'backup':
        say(a, a.role === 'drill' && !a.bitOk ? TALK.stackBroken : TALK.stack, 1.6);
        break;
      case 'traderArrive': toast('A hermit-crab trader is coming', 'It keeps shop by the den for a minute. Its goods are in the Build tab.'); break;
      case 'traderOpen':
        near(K.TRADER_SPOT, 120).forEach(function (n) { play(n, ['wave', 'sparkleEyes'], 1.4); });
        traderBubble = T + 3;
        break;
      case 'trade':
        var tp = traderPos(); spark(tp.x, tp.y - 30 * CS, 14, pal.ingot);
        toast('Swapped: ' + TRADE_INFO[a][0], TRADE_INFO[a][1]); traderBubble = T + 2;
        if (a === 'map') S.flags.forEach(function (f) { if (f.map && !f.vborn) { f.vborn = T; var fx = X(f.x); rings.push({ x: fx, y: groundY(fx, f.d), t: 0, c: pal.ingot }); } });
        break;
      case 'spareUsed': say(a, a.role === 'repair' ? TALK.spareBit : TALK.spareLeg, 1.6); break;
      case 'turtleArrive': if (!turtleToast) { turtleToast = true; toast('A sea turtle is passing', 'It gives a crab with a long way to go a lift across the dunes.'); } break;
      case 'turtlePick': say(a, TALK.turtlePick, 2); a.vhop = 1; break;
      case 'turtleDrop': p = X(a.x); poof(p, groundY(p, a.d), 8, 0.6); say(a, TALK.turtleDrop, 1.6); play(a, ['bow', 'wave', 'hopJoy'], 1.4); break;
      case 'decor':
        var ds = decorSlot(S.decor.length - 1);
        spark(ds.x, ds.y - 8 * CS, 12, pal.light); poof(ds.x, ds.y, 6, 0.5);
        if (a) { say(a, TALK.decor, 2); play(a, ['flex', 'jazz', 'clap'], 1.8); near(S.pos.DEN, 90).forEach(function (n) { if (n !== a) play(n, ['clap', 'sparkleEyes'], 1.4); }); }
        toast('The crabs made a ' + DECOR_NAMES[e.b] + ' for the den', 'The den has ' + S.decor.length + ' of ' + sim.decorMax() + ' decorations. Every one makes mornings brighter and dances more restful.');
        break;
      case 'orderStart':
        cargo.phase = 'in'; if (cargo.x < 0) cargo.x = W + 160;
        toast('A cargo ship wants ' + a.need + ' ingots', 'Send them up within ' + fmtTime(a.until - S.t) + ' for a ' + Math.round(a.premium * 100) + '% premium on each, and a bonus for the lot.' + (a.rivalRate ? ' The rival crew 🦞 is racing you for it.' : ''));
        S.crabs.forEach(function (n) { if (n.role === 'smelt') { say(n, TALK.orderStart, 1.8); play(n, ['salute', 'jazz'], 1.6); } });
        break;
      case 'orderDone':
        cargo.phase = 'out';
        toast('Order filled! +$' + e.b, (a.rivalRate ? 'You beat the rival crew 🦞 to it. ' : '') + 'The ship pays a bonus, and your reputation rises to ' + S.rep + ' star' + (S.rep === 1 ? '' : 's') + '. Crab profit!');
        floater('Order filled! +$' + e.b, collectorBase().x, collectorBase().y - 90 * CS, true);
        S.crabs.forEach(function (n, j2) { if (n.state !== 'sleep') { play(n, ['cheer', 'jazz', 'disco', 'clap'], 2); if (j2 % 3 === 0) say(n, TALK.orderDone, 1.8); } });
        break;
      case 'rivalArrive':
        toast('A rival crew 🦞 has set up behind the ridge', 'Lobsters with their own line to the surface. From now on they race you for every ship order. If they fill it first, the ship sails with theirs and your reputation drops a star. Every order you win makes them try harder.');
        S.crabs.forEach(function (n, j2) { if (j2 % 3 === 0) { say(n, TALK.rivalArrive, 2); play(n, ['shock', 'stomp'], 1.6); } });
        break;
      case 'rivalSell': rivalLifts.push({ t: 0 }); break;
      case 'orderLost':
        cargo.phase = 'out';
        toast('The rival crew 🦞 filled the order first', 'You sent ' + a.got + ' of ' + a.need + '. The ship sails with their metal, and your reputation drops to ' + S.rep + ' star' + (S.rep === 1 ? '' : 's') + '. Overclock and a low reserve help win the next race.');
        S.crabs.forEach(function (n, j2) { if (n.role === 'smelt' || j2 % 4 === 0) { play(n, ['stomp', 'grumble', 'slump'], 1.8); if (j2 % 4 === 0) say(n, TALK.rivalWin, 1.8); } });
        break;
      case 'orderFail':
        cargo.phase = 'out';
        toast('The ship sailed without its order', 'It got ' + a.got + ' of ' + a.need + '. Reputation drops to ' + S.rep + ' star' + (S.rep === 1 ? '' : 's') + '.');
        S.crabs.forEach(function (n) { if (n.role === 'smelt') play(n, ['slump', 'sigh'], 1.6); });
        break;
      case 'stormWarn': toast('A storm is coming', 'In twenty seconds the sea gets rough: crabs slow down, the riser slows, and flags can be buried, but the waves stir up free nodules.'); break;
      case 'stormStart':
        toast('Storm!', 'Rough water for forty seconds. Haulers, grab the nodules the waves turn up.');
        S.crabs.forEach(function (n, j2) { if (n.state === 'sleep') return; if (j2 % 3 === 0) say(n, TALK.storm, 1.8); play(n, ['shiver', 'shock', 'hug'], 2); });
        break;
      case 'stormEnd': toast('The storm has passed', 'Calm water again.'); S.crabs.forEach(function (n) { if (n.state !== 'sleep') play(n, ['cheer', 'sigh', 'jazz'], 1.6); }); break;
      case 'lavaStart':
        toast('Lava surge!', 'For thirty seconds smelting and forging run twice as fast and the Stirling engine makes double charge. A good time to overclock.');
        S.crabs.forEach(function (n) { if (n.role === 'smelt' || n.role === 'repair' || n.role === 'mech' || n.role === 'energy') { say(n, TALK.lava, 1.8); play(n, ['jazz', 'disco', 'pump'], 2); } });
        break;
      case 'lavaEnd': S.crabs.forEach(function (n) { if (n.role === 'smelt') play(n, 'sigh', 1.2); }); break;
      case 'octoArrive':
        toast('An octopus is sneaking in!', 'It is after your ore. Click it or press Shoo (S) to chase it away, or keep a crab by the ore pile.');
        break;
      case 'octoScared':
        ink(a); say(e.b, TALK.octoScared, 1.8); play(e.b, ['stomp', 'grumble', 'flex'], 1.8);
        break;
      case 'octoShoo':
        ink(a); near(a.x, 160).forEach(function (n) { say(n, TALK.octoShoo, 1.4); play(n, ['cheer', 'pump', 'jazz'], 1.6); });
        toast('Shoo!', a && e.b ? 'The octopus dropped the ' + e.b + ' nodule' + (e.b > 1 ? 's' : '') + ' it took.' : 'The octopus fled empty-handed.');
        break;
      case 'octoSteal':
        if (e.b) near(a.x, 120).forEach(function (n) { say(n, TALK.octoSteal, 1.8); play(n, ['shock', 'stomp'], 1.6); });
        break;
      case 'octoGone':
        if (e.b) toast('The octopus got away', 'It took ' + e.b + ' nodule' + (e.b > 1 ? 's' : '') + '. Next time, shoo it before it reaches the pile.');
        buryToast = false;
        break;
      case 'layout': var bx = S.pos[{ den: 'DEN', workshop: 'WORKSHOP', ore: 'ORE', crush: 'CRUSH', bar: 'BAR', stock: 'STOCK', collector: 'COLLECTOR' }[a]]; near(bx, 90).forEach(function (n) { play(n, ['lookAround', 'think'], 1.6); }); break;
      case 'charge': p = clawPos(e.b, 0); spark(p.x, p.y, 6); express(e.b, 'zap', 1.2); say(e.b, TALK.gotCharge, 1.6); play(e.b, ['spin', 'shimmy', 'sparkleEyes'], 1.4); play(a, ['salute', 'wave'], 1); break;
      case 'ebotBreak': p = clawPos(a, 0); spark(p.x, p.y, 10, pal.warn); express(a, 'shock', 1.6); say(a, TALK.ebotBreak, 2); play(a, 'dizzy', 2.4); break;
      case 'refill': express(a, 'phew', 1); play(a, ['sigh', 'robot'], 1.2); break;
      case 'fixed':
        p = clawPos(e.b, 0); spark(p.x, p.y, 8, a.role === 'mech' ? pal.lavaHot : pal.hat); express(e.b, 'relief', 1.8); express(a, 'proud', 1.4); e.b.vhop = 0.8;
        say(e.b, a.role === 'mech' ? TALK.mended : TALK.fixedBit, 2);
        play(e.b, ['relief', 'hug', 'bow', 'spin'], 1.8); play(a, ['flex', 'salute', 'bow'], 1.4);
        if (a.role === 'mech') debris = debris.filter(function (dd) { return dd.crab !== e.b; });   // the leg goes back on
        break;
      case 'veteran':                                    // a crab earns a star at its own job
        p = clawPos(a, 1); spark(p.x, p.y - 6 * CS, 12, pal.ingot); express(a, 'proud', 2); a.vhop = 0.8;
        say(a, TALK.veteran, 2); play(a, ['flex', 'pump', 'sparkleEyes'], 1.8);
        near(a.x, 60).forEach(function (n) { if (n !== a) play(n, ['clap', 'cheer'], 1.4); });
        if (!vetToast || e.b === K.VET_LEVELS.length) {    // the first star of the game, and every third star
          toast(a.name + (e.b === K.VET_LEVELS.length ? ' is a master ' : ' is a veteran ') + ROLE_NOUN[a.role] + ' ' + '★'.repeat(e.b),
            vetToast ? recText(a) + '. Three stars: ' + Math.round(K.VET_BONUS * e.b * 100) + '% faster at its own job.' :
              'Crabs that do enough of their own job earn stars, up to three. Each star makes it ' + Math.round(K.VET_BONUS * 100) + '% faster at that job. Retiring takes the newest crab of a kind, so veterans stay.');
          vetToast = true;
        }
        break;
      case 'rank':
        if (!started) break;                             // the crew behind the intro does not rank up out loud
        partyUntil = T + 5;                              // the crab rave: five seconds of claws in the air
        for (j = 0; j < S.crabs.length; j++) if (j % 3 === 0) say(S.crabs[j], TALK.rave, 2.5);
        for (i = 0; i < 140; i++) confetti.push({ x: rr(0, W), y: rr(-H * 0.3, 0), vx: rr(-20, 20), vy: rr(40, 110), r: rr(0, TAU), vr: rr(-6, 6), c: [pal.ingot, pal.crab, pal.energy, pal.scout, pal.drill][i % 5], life: 0 });
        toast('Rank up: ' + K.RANKS[a][1] + '!', 'Bonus of $' + e.b + '. Crab profit!');
        if (a === K.RANKS.length - 1 && !won && started) { won = true; setTimeout(showWin, 1600); }
        break;
      case 'build': p = buildSpot(a); if (p) { poof(p.x, p.y, 14, 1, pal.sandLine); spark(p.x, p.y - 10, 10, pal.hat); }
        S.crabs.forEach(function (n) {
          if (a === 'den' || (a === 'field' && (n.role === 'scout' || n.role === 'drill')) || (a === 'engine' && n.role === 'energy') || (a === 'riser' && n.role === 'smelt') || (a === 'bits' && n.role === 'drill') || (a === 'yard' && (n.role === 'haul' || n.role === 'crush')) || (a === 'scanner' && n.role === 'scout')) play(n, a === 'engine' ? 'disco' : ['cheer', 'jazz', 'clap'], 2);
        });
        break;
    }
  }
  function buildSpot(id) {
    var px;
    if (id === 'engine') return enginePos();
    if (id === 'riser') return collectorBase();
    if (id === 'yard') { px = X(S.pos.ORE); return { x: px, y: groundY(px, 0.8) }; }
    if (id === 'field') { px = X(300); return { x: px, y: groundY(px, S.lv.field === 1 ? 0.5 : 0.18) }; }
    if (id === 'den') { px = X(S.pos.WORKSHOP); return { x: px, y: groundY(px, 0.93) }; }
    return null;
  }

  // ----- per-frame update -----
  function update(dtReal) {
    var i, n, e, steps = 0, dtSim, c, px, reduce = mqReduce.matches;
    acc += dtReal * speed;
    while (acc >= K.STEP && steps < 30) { sim.step(); acc -= K.STEP; steps++; }
    if (steps >= 30) acc = 0;
    dtSim = steps * K.STEP;
    e = sim.drain();
    for (i = 0; i < e.length; i++) handle(e[i]);

    for (i = 0; i < S.crabs.length; i++) {         // view-only state hung on each crab
      c = S.crabs[i]; px = crabX(c);
      if (c.vpx === undefined) { c.vpx = px; c.vd = c.d; c.vgait = rr(0, TAU); c.vph = rr(0, TAU); c.vhop = 0; if (c.vfall === undefined) c.vfall = 0; }
      c.vgait += (Math.abs(px - c.vpx) + Math.abs(c.d - c.vd) * F) * GAIT / (scaleAt(c.d) * (c.role === 'energy' ? 0.86 : 1));
      c.vpx = px; c.vd2 = c.vd; c.vd = c.d;
      if ((c.state === 'fix' || c.state === 'charge') && c.target) { if (!c.vpass || c.vpass.w !== c.target) c.vpass = { w: c.target, total: Math.max(c.timer, 0.01) }; }
      else c.vpass = null;
      if (c.vhop > 0) c.vhop = Math.max(0, c.vhop - dtReal * 2.2);
      if (!c.moving && !c.working && c.state !== 'sleep') c.vidle = (c.vidle || 0) + dtReal * Math.max(speed, 0.25); else c.vidle = 0;
      if (c.vjoin && !(c.vfall > 0)) { c.vjoin = false; play(c, ['salute', 'wave', 'jazz'], 1.6); }
      if (c.target !== c.vlastT) {                       // a helper answers the crab it has just picked
        if (c.target && c.role === 'energy' && c.state === 'go') say(c, TALK.bringCharge, 1.6);
        if (c.target && c.role === 'repair') say(c, TALK.onBit, 1.4);
        if (c.target && c.role === 'mech') say(c, TALK.onLeg, 1.4);
        c.vlastT = c.target;
      }
      if (T > (c.vnextTalk || 0) && !(c.say && T < c.say.until)) {
        var nd = needs(c);
        if (nd) { say(c, nd, 1.6); c.vnextTalk = T + 4 + Math.random() * 3; } else c.vnextTalk = T + 0.5;
      }
      if (c.vfall > 0) { c.vfall = Math.max(0, c.vfall - dtReal / 1.1); if (c.vfall === 0) poof(px, groundY(px, c.d), 8, 0.8); }
      if (speed === 0 || reduce) continue;
      if (c.state === 'drill' && Math.random() < dtReal * 14) poof(px + rr(-5, 5), groundY(px, c.d), 1, 0.7);
      if (c.state === 'crush' && Math.random() < dtReal * 5) poof(px, groundY(px, c.d) - 3 * CS, 1, 0.35, pal.barDark);
      if (c.state === 'smelt' && Math.random() < dtReal * 6) embers.push({ x: px + 20 * CS, y: groundY(px, c.d) - 6 * CS, vx: rr(-10, 10), vy: rr(-40, -14), life: 0, max: rr(0.4, 0.9) });
      if (c.role === 'energy' && c.broken && Math.random() < dtReal * 2) { var cp = clawPos(c, 0); spark(cp.x, cp.y, 1, pal.warn); }
      if (c.role === 'drill' && !c.bitOk && c.state === 'drill' && Math.random() < dtReal * 4) { var dp = clawPos(c, 0); spark(dp.x, dp.y + 12, 1, pal.drill); }
    }

    for (i = flights.length - 1; i >= 0; i--) {
      n = flights[i]; n.t += dtSim / n.dur;
      if (n.t >= 1) {
        flights.splice(i, 1);
        if (n.lift) {
          lifts.push({ t: 0 }); burst(n.to.x, n.to.y - 10, 1);
          var b = collectorBase(), jackpot = n.value >= 15;
          if (n.pearl) floater('Pearl! +$' + n.value, b.x, b.y - 70 * CS, true);
          else floater((jackpot ? 'Crab profit! ' : '') + '+$' + n.value + (n.streak ? '  flow ×' + (1 + K.FLOW_STEP * n.streak).toFixed(2) : ''), b.x + rr(-6, 6), b.y - 52 * CS, jackpot);
        }
      }
    }
    for (i = lifts.length - 1; i >= 0; i--) { lifts[i].t += dtSim / 1.6; if (lifts[i].t >= 1) lifts.splice(i, 1); }
    for (i = rivalLifts.length - 1; i >= 0; i--) { rivalLifts[i].t += dtSim / 1.6; if (rivalLifts[i].t >= 1) rivalLifts.splice(i, 1); }
    // the thermal vent: a column of bubbles from the lava to the top tenth of the sea
    if (Math.random() < dtReal * (reduce ? 3 : 14)) bubbles.push({ x: X(K.VENT_X) + rr(-10, 10) * CS, y: H - F * 0.4, r: rr(1.4, 4.6), vy: rr(70, 130), ph: rr(0, TAU), vent: true });
    for (i = 0; i < S.crabs.length; i++) {
      c = S.crabs[i];
      if (c.alt > 0 && Math.random() < dtReal * 10) { var ap = airPos(c); bubbles.push({ x: ap.x + rr(-8, 8), y: ap.y + rr(-4, 6), r: rr(1, 3), vy: rr(30, 60), ph: rr(0, TAU) }); }
    }
    stormA += ((S.storm ? 1 : 0) - stormA) * Math.min(1, dtReal * 0.8);
    lavaA += ((S.lavaSurge ? 1 : 0) - lavaA) * Math.min(1, dtReal * 0.8);
    if (stormA > 0.05 && !reduce) {
      for (i = 0; i < Math.round(stormA * 6); i++) rain.push({ x: rr(-40, W), y: rr(-20, surfH), v: rr(380, 520), life: 0 });
      if (Math.random() < dtReal * 0.35 * stormA) flash = 1;
    }
    flash = Math.max(0, flash - dtReal * 3);
    for (i = rain.length - 1; i >= 0; i--) { n = rain[i]; n.y += n.v * dtReal; n.x += n.v * 0.35 * dtReal; if (n.y > base[0]) rain.splice(i, 1); }
    if (lavaA > 0.05 && !reduce && Math.random() < dtReal * 4 * lavaA) bombs.push({ x: rr(lavaL + 10, W - 10), y: H - F * 0.5, vx: rr(-60, 20), vy: rr(-260, -140), life: 0 });
    for (i = bombs.length - 1; i >= 0; i--) { n = bombs[i]; n.life += dtReal; n.vy += 300 * dtReal; n.x += n.vx * dtReal; n.y += n.vy * dtReal; if (n.y > H - F * 0.3 && n.vy > 0) { embers.push({ x: n.x, y: n.y, vx: rr(-20, 20), vy: rr(-40, -10), life: 0, max: 0.6 }); bombs.splice(i, 1); } }
    var rt = riserPoint(1).x;                        // the cargo ship sails in to the riser, waits, and sails off
    if (cargo.phase === 'in') { cargo.x = Math.max(rt, cargo.x - dtReal * 90); }
    else if (cargo.phase === 'out') { cargo.x -= dtReal * 110; if (cargo.x < -200) { cargo.phase = 'gone'; cargo.x = -1; } }
    if (!whale && T > nextWhale) {                   // now and then a whale glides overhead
      var dir = Math.random() < 0.5 ? 1 : -1;
      whale = { x: dir > 0 ? -W * 0.25 : W * 1.25, y: rr(surfH + 40, base[0] - 70), v: dir * rr(40, 60), id: ++whaleId, ph: 0 };
      if (!whaleToast && started) { whaleToast = true; toast('A whale passes overhead', 'Its shadow sweeps across the dunes. The crabs love it.'); }
    }
    if (whale) {
      whale.x += whale.v * dtReal; whale.ph += dtReal;
      if (whale.x < -W * 0.3 || whale.x > W * 1.3) { whale = null; nextWhale = T + rr(120, 240); }
      else for (i = 0; i < S.crabs.length; i++) {
        c = S.crabs[i];
        if (c.vwhale !== whale.id && Math.abs(crabX(c) - whale.x) < 40 && c.state !== 'sleep' && !(c.alt > 0)) {
          c.vwhale = whale.id; c.vgaze = T + 2.5;
          if (Math.random() < 0.5) say(c, TALK.whale, 1.8);
          play(c, ['wave', 'sparkleEyes', 'jazz'], 1.8);
        }
      }
    }
    var si = sim.shiftInfo();
    nightA += ((si.night ? 1 : 0) - nightA) * Math.min(1, dtReal * 1.5);
    if (started && si.mode !== 'all' && lastShift && lastShift !== si.name + si.index) {
      toast(si.name + ' begins', si.night ? 'Some of the crew sleeps. Sleeping crabs recharge and shake off their wear.' : 'Everyone is back at work.');
      S.crabs.forEach(function (n) { if (n.state !== 'sleep') play(n, si.night ? 'shiver' : 'yawnStretch', 1.6); });
    }
    var trend = S.hist.length > 6 ? Math.sign(Math.round((S.price - S.hist[S.hist.length - 6].price) * 2)) : 0;
    if (trend && trend !== lastTrend) near(S.pos.STOCK, 110).forEach(function (n) { play(n, trend > 0 ? 'sparkleEyes' : 'sigh', 1.6); });
    lastTrend = trend;
    lastShift = si.name + si.index;
    for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dtReal / 1.1; if (rings[i].t >= 1) rings.splice(i, 1); }
    for (i = floaters.length - 1; i >= 0; i--) { n = floaters[i]; n.life += dtReal; n.y -= dtReal * 22; if (n.life >= n.max) floaters.splice(i, 1); }
    for (i = confetti.length - 1; i >= 0; i--) {
      n = confetti[i]; n.life += dtReal; n.x += (n.vx + Math.sin(T * 3 + n.r) * 20) * dtReal; n.y += n.vy * dtReal; n.r += n.vr * dtReal;
      if (n.y > H || n.life > 5) confetti.splice(i, 1);
    }
    for (i = puffs.length - 1; i >= 0; i--) {
      n = puffs[i]; n.life += dtReal;
      if (n.life >= n.max) { puffs.splice(i, 1); continue; }
      n.vx -= n.vx * 2.2 * dtReal; n.vy -= n.vy * 2.2 * dtReal; n.vy -= 5 * dtReal;
      n.x += n.vx * dtReal; n.y += n.vy * dtReal; n.r += n.gr * dtReal;
    }
    for (i = inks.length - 1; i >= 0; i--) { n = inks[i]; n.life += dtReal; if (n.life >= n.max) { inks.splice(i, 1); continue; } n.x += n.vx * dtReal; n.y += n.vy * dtReal; n.r += 6 * dtReal; n.vx *= 0.98; }
    for (i = sparks.length - 1; i >= 0; i--) { n = sparks[i]; n.life += dtReal; if (n.life >= n.max) { sparks.splice(i, 1); continue; } n.x += n.vx * dtReal; n.y += n.vy * dtReal; n.vy += 90 * dtReal; }
    if (!reduce && Math.random() < dtReal * 3) embers.push({ x: rr(lavaL + 12, W - 6), y: H - F * 0.44, vx: rr(-8, 8), vy: rr(-34, -12), life: 0, max: rr(0.5, 1.2) });
    for (i = embers.length - 1; i >= 0; i--) { n = embers[i]; n.life += dtReal; if (n.life >= n.max) { embers.splice(i, 1); continue; } n.x += n.vx * dtReal; n.y += n.vy * dtReal; }
    for (i = 0; i < lavaBub.length; i++) { n = lavaBub[i]; n.t += dtReal / n.dur; if (n.t >= 1) { n.t = 0; n.u = rr(0.1, 0.95); n.dur = rr(0.9, 2); n.r = rr(2, 4.5); } }
    if (!reduce) for (i = 0; i < snow.length; i++) {
      n = snow[i];
      n.y += (n.vy * dtReal) / H; n.x += Math.sin(T * 0.5 + n.ph) * 6 * dtReal;
      if (n.y * H > base[0]) { n.y = surfH / H; n.x = rr(0, W); }
    }
    if (!reduce && Math.random() < dtReal * 0.6) burst(rr(0, lavaL), rr(base[0], H), 1);
    if (!reduce && Math.random() < dtReal * 1.6) burst(rr(lavaL + 10, W - 4), H - F * 0.9, 1);   // heat rising off the cavern
    for (i = bubbles.length - 1; i >= 0; i--) {
      n = bubbles[i];
      n.y -= n.vy * dtReal; n.x += Math.sin(T * 2.2 + n.ph) * 9 * dtReal;
      if (n.y < (n.vent ? H * 0.1 : surfH * 0.7)) bubbles.splice(i, 1);
    }
  }

  // ----- drawing: water -----
  var LAYERS = [[0.42, 7, 0.0120, 0.90, 0.0, 0.22], [0.66, 9, 0.0080, -0.62, 1.7, 0.15], [0.92, 11, 0.0055, 0.44, 3.1, 0.11]];
  function waveY(L, x) {
    return surfH * L[0] - (S ? S.tide : 0) * 12 * CS + stormA * L[1] * 1.6 * Math.sin(x * L[2] * 1.7 + T * L[3] * 3 + L[4]) + L[1] * Math.sin(x * L[2] + T * L[3] + L[4]) + L[1] * 0.45 * Math.sin(x * L[2] * 2.7 - T * L[3] * 1.6 + L[4] * 2);
  }
  function drawSurface() {
    var i, x, L;
    ctx.fillStyle = pal.foam;
    for (i = 0; i < LAYERS.length; i++) {
      L = LAYERS[i];
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (x = 0; x <= W + 12; x += 12) ctx.lineTo(x, waveY(L, x));
      ctx.lineTo(W + 12, 0); ctx.closePath();
      ctx.globalAlpha = L[5]; ctx.fill();
    }
    L = LAYERS[2];
    ctx.beginPath();
    for (x = 0; x <= W + 12; x += 12) { if (x === 0) ctx.moveTo(x, waveY(L, x)); else ctx.lineTo(x, waveY(L, x)); }
    ctx.globalAlpha = 0.5; ctx.strokeStyle = pal.foam; ctx.lineWidth = 1.6;
    ctx.setLineDash([22, 30]); ctx.lineDashOffset = -T * 22; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  function drawSnow() {
    ctx.fillStyle = pal.snow;
    for (var i = 0; i < snow.length; i++) { ctx.beginPath(); ctx.arc(snow[i].x, snow[i].y * H, snow[i].r, 0, TAU); ctx.fill(); }
  }
  function drawWeeds(k) {
    var weedH = clamp(H * 0.15, 50, 150);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < weeds.length; i++) {
      var w = weeds[i]; if (w.k !== k) continue;
      var by = (k < 0 ? farY(w.x) : crestY(0, w.x)) + 6, h = w.h * weedH * (k < 0 ? 0.8 : 1), pass, seg, f;
      for (pass = 0; pass < 2; pass++) {
        ctx.beginPath(); ctx.moveTo(w.x, by);
        for (seg = 1; seg <= 9; seg++) { f = seg / 9; ctx.lineTo(w.x + Math.sin(T * 0.8 + w.ph + f * 2.4) * w.amp * f * f + (pass ? 1.2 : 0), by - h * f); }
        ctx.strokeStyle = pass ? pal.weed2 : pal.weed; ctx.lineWidth = pass ? w.w * 0.35 : w.w; ctx.globalAlpha = (pass ? 0.7 : 0.92) * (k < 0 ? 0.6 : 1);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawBubbles() {
    ctx.strokeStyle = pal.bubble; ctx.lineWidth = 1;
    for (var i = 0; i < bubbles.length; i++) { ctx.beginPath(); ctx.arc(bubbles[i].x, bubbles[i].y, bubbles[i].r, 0, TAU); ctx.stroke(); }
  }

  // ----- drawing: the paper dunes -----
  var SAND = ['sandBack', 'sandMid', 'sandFront'];
  function drawPaper(g, path, fill, fn) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,.32)'; g.shadowBlur = 16 * CS; g.shadowOffsetY = -4 * CS;   // the sheet casts its shadow on the one behind
    g.fillStyle = fill; g.fill(path);
    g.restore();
    if (grain) { g.save(); g.clip(path); g.fillStyle = grain; g.fillRect(0, 0, W, H); g.restore(); }
    g.strokeStyle = pal.sandLine; g.lineWidth = 1.6; g.globalAlpha = 0.85;     // the cut edge catches the light
    g.beginPath();
    for (var x = -10; x <= W + 10; x += 10) { if (x === -10) g.moveTo(x, fn(x) + 0.8); else g.lineTo(x, fn(x) + 0.8); }
    g.stroke(); g.globalAlpha = 1;
  }
  // The blurred shadows make the paper sheets most of the cost of a frame where there is no GPU, and they
  // only change with the size or the palette, so each sheet is drawn once to its own canvas. A sheet only
  // shows above the next one's crest (that sheet is opaque below it), so each canvas holds just that band.
  var sheets = [];
  function sheet(i, path, fill, fn, next, alpha) {
    var c = sheets[i], g, x, y0 = H, y1 = next ? 0 : H;
    if (!c) {
      for (x = -10; x <= W + 10; x += 10) { y0 = Math.min(y0, fn(x)); if (next) y1 = Math.max(y1, next(x)); }
      y0 = Math.max(0, Math.floor(y0 - 24 * CS)); y1 = Math.min(H, Math.ceil(y1 + 2));   // room for the shadow it casts upward
      c = sheets[i] = document.createElement('canvas');
      c.width = Math.round(W * DPR); c.height = Math.max(1, Math.round((y1 - y0) * DPR)); c.y0 = y0; c.h = y1 - y0;
      g = c.getContext('2d');
      g.setTransform(DPR, 0, 0, DPR, 0, -y0 * DPR);
      g.globalAlpha = alpha;
      drawPaper(g, path, fill, fn);
    }
    ctx.drawImage(c, 0, c.y0, W, c.h);
  }
  function drawRipples(k) {
    var x, j, y, top = crestY(k, 0), bot = k < 2 ? base[k + 1] : H, band = bot - top;
    ctx.strokeStyle = pal.sandLine; ctx.lineWidth = 1.4;
    for (j = 0; j < 2; j++) {
      ctx.globalAlpha = 0.12 + 0.07 * Math.sin(T * 0.7 + j * 1.9 + k);
      ctx.beginPath();
      for (x = -10; x <= W + 10; x += 14) { y = crestY(k, x) + band * (0.35 + j * 0.3) + 2.5 * Math.sin(x * 0.03 + T * 0.9 + j * 1.7 + k); if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawLocked(k) {             // a roped-off claim with a paper tag on a stake
    var zone = k === 1 ? 1 : 2, x0 = X(K.FIELD0), x1 = X(K.FIELD1), i, y0, y1, px, tag, cost;
    if (zone < sim.up('field')) return;
    y0 = groundY(x0, K.ZONES[zone].d0 - 0.03); y1 = groundY(x0, K.ZONES[zone].d1 + 0.02);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, Math.min(y0, crestY(k, x0)) - 4, x1 - x0, y1 - y0 + 20); ctx.clip();
    ctx.strokeStyle = pal.rockDark; ctx.globalAlpha = 0.14; ctx.lineWidth = 1.4;
    for (i = -H; i < x1 - x0; i += 12) { ctx.beginPath(); ctx.moveTo(x0 + i, y1 + 20); ctx.lineTo(x0 + i + H * 0.4, y0 - H * 0.4 + 20); ctx.stroke(); }
    ctx.restore();
    // rope between stakes along the front of the claim
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.8;
    ctx.beginPath();
    for (px = x0 + 10; px <= x1 - 10; px += (x1 - x0 - 20) / 6) {
      var gy = groundY(px, K.ZONES[zone].d1);
      if (px === x0 + 10) ctx.moveTo(px, gy - 9 * CS); else ctx.quadraticCurveTo(px - (x1 - x0 - 20) / 12, gy - 4 * CS, px, gy - 9 * CS);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    cost = sim.upgradeCost('field');
    tag = (zone === 1 ? 'Middle dune' : 'Back dune') + (zone === sim.up('field') && cost ? ': claim for $' + cost : ': claim the middle dune first');
    px = X(300); var ty = groundY(px, (K.ZONES[zone].d0 + K.ZONES[zone].d1) / 2);
    ctx.font = '700 ' + Math.round(11 * CS + 1) + 'px ' + cssFont;
    var tw = ctx.measureText(tag).width + 14 * CS;
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, ty + 14 * CS); ctx.lineTo(px, ty - 6 * CS); ctx.stroke();
    ctx.save(); ctx.translate(px, ty - 14 * CS); ctx.rotate(-0.03);
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = pal.paper || '#f5fafa'; ctx.fillRect(-tw / 2, -10 * CS, tw, 18 * CS);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tag, 0, -1 * CS);
    ctx.restore();
    lockHit[zone] = { x0: x0, x1: x1, y0: y0 - 10, y1: y1 + 10 };
  }
  var lockHit = {}, cssFont = 'Helvetica, Arial, sans-serif';

  // ----- drawing: the lava cavern and the Stirling engine -----
  function lavaY(x) { return H - F * (0.42 + 0.08 * lavaA) + (1.6 + 3 * lavaA) * Math.sin(x * 0.09 + T * 1.7 * (1 + lavaA)) + 1.1 * Math.sin(x * 0.21 - T * 2.3); }
  function drawRidge() {               // the basalt outcrop rising behind the cave
    var x0 = lavaL - 40 * CS, i, x;
    ctx.fillStyle = pal.rock;
    ctx.beginPath(); ctx.moveTo(x0, H);
    ctx.lineTo(x0 + 10 * CS, crestY(1, x0) - 6);
    ctx.lineTo(lavaL + 4 * CS, base[0] - 4 * CS);
    for (x = lavaL + 4 * CS, i = 0; x < W; x += 18, i++) ctx.lineTo(x + 9, base[0] - H * 0.06 - ((i * 7) % 5) * 3 - Math.min(1, (x - lavaL) / 60) * H * 0.04);
    ctx.lineTo(W + 2, base[0] - H * 0.1); ctx.lineTo(W + 2, H); ctx.closePath();
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14 * CS; ctx.fill(); ctx.restore();
    ctx.strokeStyle = pal.rockLine; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
  }
  function drawCavern() {
    var yT = H - F, u = CS, x, i, g, b, t, bx, by;
    ctx.fillStyle = pal.rock;
    ctx.beginPath();
    ctx.moveTo(lavaL - 20 * u, H + 2);
    ctx.lineTo(lavaL - 13 * u, crestY(2, lavaL - 13 * u) + 1);
    ctx.lineTo(lavaL - 3 * u, yT + F * 0.1);
    ctx.lineTo(lavaL + 9 * u, yT - F * 0.05);
    for (x = lavaL + 9 * u, i = 0; x < W; x += 16, i++) ctx.lineTo(x + 8, yT - F * (0.08 + 0.05 * ((i * 7) % 3) / 2));
    ctx.lineTo(W + 2, yT - F * 0.06); ctx.lineTo(W + 2, H + 2);
    ctx.closePath();
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12 * CS; ctx.shadowOffsetY = -3; ctx.fill(); ctx.restore();
    ctx.strokeStyle = pal.rockLine; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = pal.rockDark;      // the cave mouth
    ctx.beginPath();
    ctx.moveTo(lavaL + 3 * u, H);
    ctx.lineTo(lavaL + 5 * u, yT + F * 0.4);
    ctx.quadraticCurveTo(lavaL + 12 * u, yT + F * 0.1, lavaL + 30 * u, yT + F * 0.1);
    ctx.lineTo(W - 12, yT + F * 0.08);
    ctx.quadraticCurveTo(W + 2, yT + F * 0.12, W + 2, yT + F * 0.4);
    ctx.lineTo(W + 2, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.rock;          // stalactites
    for (x = lavaL + 34 * u, i = 0; x < W - 14; x += 26 * u, i++) {
      ctx.beginPath(); ctx.moveTo(x - 5 * u, yT + F * 0.09); ctx.lineTo(x + 5 * u, yT + F * 0.09);
      ctx.lineTo(x + (i % 2 ? 1 : -1) * u, yT + F * (0.2 + 0.05 * (i % 3))); ctx.closePath(); ctx.fill();
    }
    g = ctx.createLinearGradient(0, H - F * 0.45, 0, H);   // lava pool
    g.addColorStop(0, pal.lavaHot); g.addColorStop(0.3, pal.lava); g.addColorStop(1, pal.lavaDeep);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(lavaL + 4 * u, H);
    for (x = lavaL + 4 * u; x <= W + 4; x += 6) ctx.lineTo(x, lavaY(x));
    ctx.lineTo(W + 4, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.lavaHot; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (x = lavaL + 4 * u; x <= W + 4; x += 6) { if (x === lavaL + 4 * u) ctx.moveTo(x, lavaY(x)); else ctx.lineTo(x, lavaY(x)); }
    ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = pal.rockDark;      // cooling crust drifting on the pool
    for (i = 0; i < 3; i++) {
      t = (T * 0.035 + i * 0.37) % 1; bx = lavaL + 10 * u + t * (W - lavaL - 10 * u);
      ctx.globalAlpha = 0.5 * Math.sin(Math.PI * t);
      ctx.beginPath(); ctx.ellipse(bx, lavaY(bx) + F * (0.1 + 0.08 * i), 9 * u, 2.4 * u, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < lavaBub.length; i++) {
      b = lavaBub[i]; bx = lavaL + 8 * u + b.u * (W - lavaL - 10 * u); by = lavaY(bx);
      if (b.t < 0.8) {
        ctx.fillStyle = pal.lavaHot; ctx.globalAlpha = 0.95;
        ctx.beginPath(); ctx.arc(bx, by, b.r * u * (b.t / 0.8), Math.PI, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = pal.lavaHot; ctx.lineWidth = 1.2; ctx.globalAlpha = 1 - (b.t - 0.8) / 0.2;
        ctx.beginPath(); ctx.arc(bx, by, b.r * u * (1 + (b.t - 0.8) * 4), Math.PI, TAU); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.rock;          // the rim the smelters stand on
    ctx.beginPath();
    ctx.moveTo(lavaL - 16 * u, H + 2); ctx.lineTo(lavaL - 8 * u, H - F * 0.38);
    ctx.quadraticCurveTo(lavaL + 2 * u, H - F * 0.46, lavaL + 9 * u, H - F * 0.34);
    ctx.lineTo(lavaL + 22 * u, H + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.rockLine; ctx.lineWidth = 1; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
  }
  function drawGlow() {                // light from the lava spilling over whatever stands near it
    var rx = (W - lavaL) * 1.1, ry = F * 0.95, g;
    ctx.save();
    ctx.translate((lavaL + W) / 2, H - F * 0.4);
    ctx.scale(1, ry / rx);
    g = ctx.createRadialGradient(0, 0, 4, 0, 0, rx);
    g.addColorStop(0, 'rgba(255,150,50,' + (0.3 + 0.25 * lavaA + 0.06 * Math.sin(T * 2.1)).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
    ctx.restore();
  }
  var wheel = 0;
  function drawEngine() {              // a Stirling engine: hot end in the lava, cold fins in the sea, a flywheel on top
    var p = enginePos(), s = scaleAt(0.72), lvl = S.lv.engine, heat = S.heat / K.HEAT_CAP, i, a;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.lineCap = 'round';
    // hot pipe running down into the lava
    ctx.strokeStyle = pal.lava; ctx.lineWidth = 3.4; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(10, -8); ctx.quadraticCurveTo(30, -6, 34, 14); ctx.stroke();
    ctx.strokeStyle = pal.lavaHot; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(T * 5);
    ctx.beginPath(); ctx.moveTo(10, -8); ctx.quadraticCurveTo(30, -6, 34, 14); ctx.stroke(); ctx.globalAlpha = 1;
    // body and cylinder
    ctx.fillStyle = pal.metalDark; roundRect(-16, -14, 30, 14, 3); ctx.fill();
    ctx.fillStyle = pal.metal; roundRect(-12, -30, 12, 18, 2); ctx.fill();
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.stroke();
    for (i = 0; i < 4; i++) { ctx.fillStyle = pal.metalDark; ctx.fillRect(-14, -27 + i * 4, 16, 1.5); }   // cooling fins
    // flywheel, faster with more output
    a = wheel;
    ctx.save(); ctx.translate(8, -30);
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, 11 + lvl * 1.5, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a + i * TAU / 5) * (11 + lvl * 1.5), Math.sin(a + i * TAU / 5) * (11 + lvl * 1.5)); ctx.stroke(); }
    ctx.fillStyle = pal.lava; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
    // piston rod from cylinder to the wheel
    ctx.strokeStyle = pal.metal; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(8 + Math.cos(a) * 6, -30 + Math.sin(a) * 6); ctx.stroke();
    // charge gauge: how much the engine has banked
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-15, -5, 26, 3.4);
    ctx.fillStyle = heat < 0.1 ? pal.warn : pal.light; ctx.fillRect(-15, -5, 26 * heat, 3.4);
    // two plugs for energy bots
    ctx.fillStyle = pal.energyDark; ctx.fillRect(-20, -6, 4, 4); ctx.fillRect(14, -6, 4, 4);
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ----- drawing: stations on the front dune -----
  function drawRiser() {
    var a = riserPoint(0), b = collectorBase(), w = 2 + S.lv.riser * 0.8;
    ctx.strokeStyle = pal.metalDark; ctx.globalAlpha = 0.75; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x + 6 + Math.sin(T * 0.35) * 16, H * 0.3, b.x + 2 + Math.sin(T * 0.22 + 1) * 10, -10);
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  function drawLifts() {
    for (var i = 0; i < lifts.length; i++) {
      var p = riserPoint(lifts[i].t);
      ctx.fillStyle = pal.ingot; ctx.globalAlpha = 0.35 * (1 - lifts[i].t * 0.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill();
    }
  }
  function drawCollector() {
    var b = collectorBase(), s = scaleAt(0.7), busy = lifts.length > 0, blink = Math.sin(T * (busy ? 14 : 3.2)) > 0.3 ? 1 : 0.2;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(s, s);
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(-24, 4); ctx.moveTo(16, -10); ctx.lineTo(24, 4); ctx.stroke();
    ctx.fillStyle = pal.metalDark;
    ctx.beginPath(); ctx.moveTo(-22, -26); ctx.lineTo(-42, -8); ctx.lineTo(-22, -8); ctx.closePath(); ctx.fill();
    roundRect(-24, -36, 48, 28, 6); ctx.fillStyle = pal.metal; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = pal.metalDark; ctx.globalAlpha = 0.55; ctx.fillRect(-16, -28, 20, 4); ctx.fillRect(-16, -20, 12, 4);
    ctx.fillStyle = pal.light; ctx.globalAlpha = blink * 0.3; ctx.beginPath(); ctx.arc(14, -41, 7, 0, TAU); ctx.fill();
    ctx.globalAlpha = blink; ctx.beginPath(); ctx.arc(14, -41, 2.8, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = pal.ink; ctx.font = '700 9px ' + cssFont; ctx.textAlign = 'center';
    ctx.fillText('$', 4, -18);
    ctx.restore();
  }
  function drawWorkshop() {            // where repair bots wait: an anvil under a little wrench sign
    var px = X(S.pos.WORKSHOP), y = groundY(px, 0.95), s = scaleAt(0.95);
    ctx.save(); ctx.translate(px + 8 * s, y); ctx.scale(s, s);
    ctx.fillStyle = pal.metalDark;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-5, -6); ctx.lineTo(-11, -6); ctx.lineTo(-11, -10); ctx.lineTo(12, -10); ctx.lineTo(8, -6); ctx.lineTo(5, -6); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(16, -26); ctx.stroke();
    ctx.fillStyle = pal.hat; roundRect(8, -36, 16, 11, 2); ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(12, -27.5); ctx.lineTo(19, -33.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(19.8, -34.2, 1.8, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // ----- the den, and the decorations the crabs make for it -----
  var DECOR_NAMES = { shellGarland: 'shell garland', seaGlass: 'sea-glass mosaic', cairn: 'pebble cairn', kelpWreath: 'kelp wreath',
    coral: 'coral sculpture', sandCastle: 'sand castle', noduleTotem: 'nodule totem', trophy: 'rank trophy', pearlLamp: 'pearl lamp',
    inkPainting: 'octopus-ink painting', driftwood: 'storm driftwood sculpture', shipBottle: 'ship in a bottle', lavaLamp: 'lava lamp' };
  function decorSlot(i) {                // decorations ring the den on the sand, nearest first
    var p = X(S.pos.DEN), y = groundY(p, 0.82), s = scaleAt(0.82), spots = [[-24, 0], [24, 0], [-36, 4], [36, 4], [-30, -8], [30, -8], [-48, -2], [48, -2], [-58, 4], [58, 4], [-44, -10], [44, -10], [-68, -2], [68, -2]];
    var sp = spots[i % spots.length];
    return { x: p + sp[0] * s, y: y + sp[1] * s, s: s };
  }
  function drawDecor(kind, x, y, s) {
    var i;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
    switch (kind) {
      case 'shellGarland':
        ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(-9, 0); ctx.moveTo(9, -12); ctx.lineTo(9, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-9, -11); ctx.quadraticCurveTo(0, -4, 9, -11); ctx.stroke();
        for (i = 0; i < 4; i++) { ctx.fillStyle = ['#ffd1dc', '#fff0c8', '#d6f0ff', '#ffe0b0'][i]; ctx.beginPath(); ctx.arc(-6 + i * 4, -8 + Math.abs(i - 1.5) * -1.2, 1.8, 0, Math.PI); ctx.fill(); }
        break;
      case 'seaGlass':
        for (i = 0; i < 9; i++) { ctx.fillStyle = ['#7fd6c2', '#9ac6ff', '#b6e39a', '#d7f3ff'][i % 4]; ctx.globalAlpha = 0.85; ctx.fillRect(-6 + (i % 3) * 4, -12 + Math.floor(i / 3) * 4, 3.4, 3.4); }
        ctx.globalAlpha = 1; ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8; ctx.strokeRect(-6.5, -12.5, 12.5, 12.5);
        break;
      case 'cairn':
        for (i = 0; i < 4; i++) drawNod(0, -2 - i * 3.6, 3.6 - i * 0.6, 1, i * 0.4);
        break;
      case 'kelpWreath':
        ctx.strokeStyle = pal.weed; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, -8, 6, 0, TAU); ctx.stroke();
        ctx.fillStyle = pal.weed2; for (i = 0; i < 6; i++) { var a = i * TAU / 6; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, -8 + Math.sin(a) * 6, 2, 1, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = pal.warn; ctx.beginPath(); ctx.arc(0, -2, 1.4, 0, TAU); ctx.fill();
        break;
      case 'coral':
        ctx.strokeStyle = '#ff7f8f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.moveTo(0, -5); ctx.lineTo(-5, -11); ctx.moveTo(0, -7); ctx.lineTo(5, -14); ctx.moveTo(-5, -11); ctx.lineTo(-7, -15); ctx.stroke();
        break;
      case 'sandCastle':
        ctx.fillStyle = pal.sandLine; ctx.fillRect(-7, -8, 14, 8); ctx.fillRect(-9, -12, 4, 12); ctx.fillRect(5, -12, 4, 12); ctx.fillRect(-2, -14, 4, 6);
        ctx.fillStyle = pal.warn; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -19); ctx.lineTo(4, -17); ctx.closePath(); ctx.fill();
        break;
      case 'noduleTotem':
        for (i = 0; i < 3; i++) { drawNod(0, -3 - i * 5, 3.2, 1, 0); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1.2, -3.6 - i * 5, 0.7, 0, TAU); ctx.arc(1.2, -3.6 - i * 5, 0.7, 0, TAU); ctx.fill(); }
        break;
      case 'trophy':
        ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(5, -14); ctx.quadraticCurveTo(5, -6, 0, -6); ctx.quadraticCurveTo(-5, -6, -5, -14); ctx.fill();
        ctx.fillRect(-1, -6, 2, 4); ctx.fillRect(-4, -2, 8, 2);
        ctx.strokeStyle = pal.ingot; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-6, -11, 2, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(6, -11, 2, Math.PI * 1.5, Math.PI * 0.5); ctx.stroke();
        break;
      case 'pearlLamp':
        ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -14); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.2 * Math.sin(T * 2)) + ')'; ctx.beginPath(); ctx.arc(0, -16, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f4f0ff'; ctx.beginPath(); ctx.arc(0, -16, 2.8, 0, TAU); ctx.fill();
        break;
      case 'inkPainting':
        ctx.fillStyle = pal.paper; ctx.fillRect(-7, -16, 14, 12); ctx.strokeStyle = pal.mechDark; ctx.lineWidth = 1.2; ctx.strokeRect(-7, -16, 14, 12);
        ctx.strokeStyle = '#3b1f5c'; ctx.lineWidth = 1.4; ctx.beginPath(); for (i = 0; i <= 12; i++) { var th = i * 0.6; ctx.lineTo(Math.cos(th) * i * 0.4, -10 + Math.sin(th) * i * 0.4); } ctx.stroke();
        break;
      case 'driftwood':
        ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-2, -9, 4, -14); ctx.moveTo(-1, -6); ctx.lineTo(6, -8); ctx.moveTo(1, -10); ctx.lineTo(-4, -15); ctx.stroke();
        break;
      case 'shipBottle':
        ctx.fillStyle = 'rgba(160,220,255,.45)'; ctx.strokeStyle = pal.foam; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(0, -6, 8, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillRect(7, -7.5, 4, 3);
        ctx.fillStyle = pal.crabDark; ctx.fillRect(-4, -6, 7, 2); ctx.fillStyle = pal.metal; ctx.fillRect(-2, -9, 1, 3);
        break;
      case 'lavaLamp':
        ctx.fillStyle = pal.metalDark; ctx.fillRect(-3, -2, 6, 2); ctx.fillRect(-2, -18, 4, 2);
        ctx.fillStyle = 'rgba(255,150,60,.35)'; ctx.fillRect(-3, -16, 6, 14);
        ctx.fillStyle = pal.lava; ctx.beginPath(); ctx.ellipse(0, -9 + Math.sin(T * 1.3) * 4, 2, 2.6, 0, 0, TAU); ctx.fill();
        break;
    }
    ctx.restore();
  }
  function drawDen() {                   // a round crab house with a door, a flag, and whatever the crabs have made for it
    var p = X(S.pos.DEN), y = groundY(p, 0.82), s = scaleAt(0.82), i, d;
    for (i = 0; i < S.decor.length; i++) { d = decorSlot(i); if (d.y < y - 20 * s) drawDecor(S.decor[i].kind, d.x, d.y, d.s); }   // the ones behind first
    ctx.save(); ctx.translate(p, y); ctx.scale(s, s);
    ctx.fillStyle = pal.crab; ctx.beginPath(); ctx.ellipse(0, -10, 18, 14, 0, Math.PI, TAU); ctx.lineTo(18, 0); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.crabDark; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-6, -16, 7, 3, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.crabDark; ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, Math.PI, TAU); ctx.fill();   // the door
    ctx.fillStyle = pal.light; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(T * 1.5); ctx.beginPath(); ctx.arc(-10, -9, 2.4, 0, TAU); ctx.arc(10, -9, 2.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;   // lit windows
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -34); ctx.stroke();
    ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(8, -31 + Math.sin(T * 3)); ctx.lineTo(0, -28); ctx.closePath(); ctx.fill();
    ctx.restore();
    for (i = 0; i < S.decor.length; i++) { d = decorSlot(i); if (d.y >= y - 20 * s) drawDecor(S.decor[i].kind, d.x, d.y, d.s); }
  }
  function drawOrePile() {
    var n = Math.max(0, S.ore - incoming('ore')), i, s, sc = scaleAt(0.8);
    for (i = 0; i < n; i++) { s = oreSlot(i); drawNod(s.x, s.y, (3.6 + ((i * 37) % 7) / 10) * sc, 1, ((i * 53) % 9) / 10 - 0.4); }
  }
  function drawBarStack() {
    var n = Math.max(0, S.bars - incoming('bars')), i, s;
    for (i = 0; i < n; i++) { s = barSlot(i); drawBar(s.x, s.y, scaleAt(0.78), 0); }
  }
  function drawStockpile() {
    var n = Math.max(0, S.stock - incoming('stock')), shown = Math.min(n, 15), i, s, px = X(S.pos.STOCK), y = groundY(px, 0.84), sc = scaleAt(0.84);
    // a pallet under the pile
    ctx.fillStyle = pal.metalDark; ctx.globalAlpha = 0.7; ctx.fillRect(px - 26 * sc, y - 1.5 * sc, 52 * sc, 3 * sc); ctx.globalAlpha = 1;
    for (i = 0; i < shown; i++) { s = stockSlot(i); drawIngot(s.x, s.y, sc * 0.95, i < S.reserve); }
    ctx.font = '700 ' + Math.round(10 * sc + 1) + 'px ' + cssFont; ctx.textAlign = 'center'; ctx.fillStyle = pal.ink;
    if (n > shown) ctx.fillText('+' + (n - shown), px + 30 * sc, y - 4 * sc);
    // the reserve tag
    var tag = 'keep ' + S.reserve;
    ctx.save(); ctx.translate(px - 30 * sc, y - 18 * sc); ctx.rotate(-0.08);
    ctx.fillStyle = pal.paper; ctx.fillRect(-15 * sc, -7 * sc, 30 * sc, 12 * sc);
    ctx.fillStyle = pal.ink; ctx.font = '700 ' + Math.round(8 * sc + 1) + 'px ' + cssFont; ctx.textBaseline = 'middle';
    ctx.fillText(tag, 0, -1 * sc);
    ctx.restore();
  }

  // ----- drawing: goods and flags -----
  function drawNod(x, y, r, a, rot) {
    ctx.globalAlpha = a; ctx.fillStyle = pal.nodule;
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * 0.85, rot || 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * 0.25; ctx.fillStyle = pal.sandLine;
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.3, r * 0.45, r * 0.22, rot || 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawBar(x, y, s, heat) {
    roundRect(x - 4.4 * s, y - 2 * s, 8.8 * s, 4 * s, 1.2 * s);
    ctx.fillStyle = pal.bar; ctx.fill();
    ctx.strokeStyle = pal.barDark; ctx.lineWidth = 0.8; ctx.stroke();
    if (heat > 0) { ctx.globalAlpha = heat; ctx.fillStyle = pal.lavaHot; ctx.fill(); ctx.globalAlpha = 1; }
  }
  function drawIngot(x, y, s, held) {
    ctx.fillStyle = pal.ingot; ctx.globalAlpha = held ? 0.12 : 0.3;
    ctx.beginPath(); ctx.arc(x, y, 6.5 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(x - 4.6 * s, y + 2 * s); ctx.lineTo(x - 3.2 * s, y - 2 * s); ctx.lineTo(x + 3.2 * s, y - 2 * s); ctx.lineTo(x + 4.6 * s, y + 2 * s); ctx.closePath();
    ctx.fillStyle = held ? pal.ingotDark : pal.ingot;
    ctx.fill(); ctx.strokeStyle = pal.ingotDark; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function drawPart(kind, x, y, s, heat) {   // what the repair crews carry: raw metal, or the part forged from it
    if (kind === 'ingot') drawIngot(x, y, s);
    else if (kind === 'bar') drawBar(x, y, s, heat);
    else if (kind === 'bit') {
      ctx.fillStyle = pal.metal; ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 2 * s); ctx.lineTo(x + 3 * s, y - 2 * s); ctx.lineTo(x, y + 4 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'cell') {            // a charge: a little battery with a glowing band
      ctx.fillStyle = pal.energy; ctx.strokeStyle = pal.energyDark; ctx.lineWidth = 0.8;
      roundRect(x - 2.6 * s, y - 3.6 * s, 5.2 * s, 7.2 * s, 1.2 * s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal.energyDark; ctx.fillRect(x - 1.2 * s, y - 4.6 * s, 2.4 * s, 1 * s);
      ctx.fillStyle = pal.light; ctx.fillRect(x - 1.6 * s, y - 0.6 * s, 3.2 * s, 1.2 * s);
    } else if (kind === 'leg') {
      ctx.strokeStyle = pal.metal; ctx.lineWidth = 1.8 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 4 * s, y + 1 * s); ctx.lineTo(x, y - 3 * s); ctx.lineTo(x + 4 * s, y + 2 * s); ctx.stroke();
    }
    if (heat > 0) { ctx.globalAlpha = heat * 0.6; ctx.fillStyle = pal.lavaHot; ctx.beginPath(); ctx.arc(x, y, 5 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
  function drawDebris(dd) {            // a leg lying on the sand where it came off
    var px = X(dd.x), y = groundY(px, dd.d), s = scaleAt(dd.d), c = dd.crab;
    ctx.save(); ctx.translate(px - 10 * s, y - 1 * s); ctx.rotate(dd.rot);
    ctx.strokeStyle = STYLE[c.role]()[1]; ctx.lineWidth = 1.7 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5 * s, 0); ctx.lineTo(0, -3 * s); ctx.lineTo(5 * s, 0.5 * s); ctx.stroke();
    ctx.restore();
  }
  function drawVent() {                // the thermal vent: warm water rising from the lava up the right-hand side
    var x = X(K.VENT_X), top = ventTop(), bot = H - F * 0.42, g, i, y, w = 26 * CS;
    g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(0.5, 'rgba(255,190,120,.1)'); g.addColorStop(1, 'rgba(255,150,80,.28)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - w * 0.6, bot);
    for (y = bot; y >= top; y -= 14) ctx.lineTo(x - w * (0.35 + 0.25 * (y - top) / (bot - top)) + Math.sin(y * 0.05 + T * 2) * 4, y);
    for (y = top; y <= bot; y += 14) ctx.lineTo(x + w * (0.35 + 0.25 * (y - top) / (bot - top)) + Math.sin(y * 0.05 + T * 2 + 1) * 4, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.foam; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.25;      // the shimmer of the riptide
    for (i = 0; i < 3; i++) {
      ctx.beginPath();
      for (y = bot; y >= top; y -= 10) { var xx = x + Math.sin(y * 0.04 - T * 3 + i * 2) * w * 0.3; if (y === bot) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); }
      ctx.stroke();
    }
    // the current that carries crabs back down and sideways, drawn as long faint streaks
    ctx.globalAlpha = 0.12; ctx.lineWidth = 1.6; ctx.setLineDash([18, 26]); ctx.lineDashOffset = T * 40;
    for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 10, top + 8 + i * 14); ctx.quadraticCurveTo(x - W * 0.35, top + H * 0.05 + i * 20, X(K.FIELD0 + 120 + i * 140), base[1] - 20 + i * 18); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  function drawBase() {                // the energy bots' base station, wired to the Stirling engine
    var b = basePos(), e = enginePos(), s = scaleAt(0.8);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(b.x + 8 * s, b.y - 4 * s); ctx.quadraticCurveTo((b.x + e.x) / 2, b.y + 4 * s, e.x - 14 * s, e.y - 4 * s); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(s, s);
    ctx.fillStyle = pal.energyDark; roundRect(-10, -14, 20, 14, 3); ctx.fill();
    ctx.fillStyle = pal.energy; ctx.fillRect(-7, -11, 14, 3);
    ctx.fillStyle = pal.light; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 3); ctx.beginPath(); ctx.arc(0, -17, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawWires() {               // each energy bot drags its plug and cable while it works near the base
    var b = postPos(), i, c, ap, px, py, dx, s, sag, plugged;
    for (i = 0; i < S.crabs.length; i++) {
      c = S.crabs[i];
      if (c.role !== 'energy' || c.alt > 0) continue;
      px = crabX(c); s = scaleAt(c.d); py = groundY(px, c.d) - 13 * s * 0.86;
      dx = Math.abs(px - b.x);
      plugged = c.state === 'refill';
      if (dx > 170 * CS && !plugged) continue;             // too far: the plug has sprung back to the base
      sag = 10 * CS + dx * 0.08;
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.globalAlpha = plugged ? 0.8 : 0.45;
      ctx.beginPath(); ctx.moveTo(b.x, b.y - 18 * CS); ctx.quadraticCurveTo((px + b.x) / 2, Math.max(py, b.y) + sag, px - 4 * s, py); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = plugged ? pal.light : pal.metalDark; ctx.fillRect(px - 6 * s, py - 1.5 * s, 3 * s, 3 * s);   // the plug
    }
  }
  function plotRect(i) {                 // a plot is a tile of front-dune sand one building wide
    var px = X(K.PLOTS[i]), half = (X(43) - X(0)) * 0.46;
    return { x: px, half: half, y0: groundY(px, 0.7), y1: groundY(px, 0.97) };
  }
  function drawPlots() {
    var i, p, b, occ = {}, k;
    for (k in S.layout) occ[S.layout[k]] = k;
    for (i = 0; i < K.PLOTS.length; i++) {
      p = plotRect(i); b = occ[i];
      if (b) {                           // a paper foundation under each building, so it sits on the sand rather than in it
        ctx.save(); ctx.fillStyle = pal.sandBack; ctx.globalAlpha = 0.28;
        ctx.beginPath(); ctx.ellipse(p.x, groundY(p.x, 0.83), p.half * 0.85, p.half * 0.22, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = pal.sandLine; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      }
      if (!arrange) continue;
      ctx.save();
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
      ctx.strokeStyle = pick && occ[i] === pick ? pal.mark : pal.ink; ctx.globalAlpha = pick && occ[i] === pick ? 0.95 : 0.45;
      roundRect(p.x - p.half, p.y0, p.half * 2, p.y1 - p.y0, 6 * CS); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.ink; ctx.textAlign = 'center';
      ctx.font = '700 ' + Math.round(7 * CS + 3) + 'px ' + cssFont;
      ctx.fillText(b ? BLD_SHORT[b] : 'Spare', p.x, p.y1 - 4 * CS);
      ctx.restore();
    }
  }
  var BLD_NAMES = { den: 'Den', workshop: 'Workshop', ore: 'Ore pile', crush: 'Crushing yard', bar: 'Bar stack', stock: 'Stockpile', collector: 'Collector' };
  var BLD_SHORT = { den: 'Den', workshop: 'Workshop', ore: 'Ore', crush: 'Crusher', bar: 'Bars', stock: 'Stock', collector: 'Riser' };
  var arrange = false, pick = null;

  // ----- sea life: shoals of fish, jellyfish, and the ship at the top of the riser -----
  var fish = [], jellies = [];
  function stockSea() {
    fish = []; jellies = [];
    for (var i = 0; i < 4; i++) fish.push({ x: rr(0, W), y: rr(surfH + 30, base[0] - 40), v: rr(18, 34) * (Math.random() < 0.5 ? -1 : 1), n: 4 + Math.floor(Math.random() * 5), ph: rr(0, TAU) });
    for (i = 0; i < 3; i++) jellies.push({ x: rr(0, W), y: rr(surfH + 40, base[0] - 60), ph: rr(0, TAU), v: rr(4, 9) });
  }
  // ----- the deep: shapes in the shadows far behind the dunes -----
  // Mantas, a cruising shark, a swirling school, a squid now and then, and an anglerfish along the far dune whose
  // lure glows at night. They are drawn before the far dune, faint and small with distance.
  var deep = [], lures = [];
  function stockDeep() {
    var lo = surfH + 30, hi = farBase - 20, i;
    deep = [
      { kind: 'manta', x: rr(0, W), y: rr(lo, hi), v: rr(10, 16), k: rr(0.55, 0.8), ph: rr(0, TAU) },
      { kind: 'manta', x: rr(0, W), y: rr(lo, hi), v: -rr(8, 13), k: rr(0.4, 0.6), ph: rr(0, TAU) },
      { kind: 'shark', x: rr(0, W), y: rr(lo + 20, hi), v: rr(16, 24) * (Math.random() < 0.5 ? -1 : 1), k: rr(0.5, 0.75), ph: rr(0, TAU) },
      { kind: 'school', x: rr(0, W), y: rr(lo, hi), v: rr(6, 10) * (Math.random() < 0.5 ? -1 : 1), k: rr(0.6, 0.9), ph: rr(0, TAU) },
      { kind: 'angler', x: rr(0, W), y: 0, v: rr(3, 5) * (Math.random() < 0.5 ? -1 : 1), k: rr(0.7, 0.9), ph: rr(0, TAU) },
      { kind: 'squid', x: rr(W * 0.1, W * 0.9), y: farBase + 40, v: 0, k: rr(0.6, 0.85), ph: 0, wait: rr(30, 90) }
    ];
    for (i = 0; i < deep.length; i++) deep[i].k *= CS;
  }
  function drawDeep(dt) {
    var i, j, d, L, dir, flap, a, x, y, still = mqReduce.matches;
    if (!deep.length) stockDeep();
    lures = [];
    ctx.save();
    for (i = 0; i < deep.length; i++) {
      d = deep[i]; d.ph += dt; L = 60 * d.k;
      if (d.kind !== 'squid') { d.x += d.v * dt; if (d.x < -L * 2) d.x = W + L * 2; if (d.x > W + L * 2) d.x = -L * 2; }
      dir = d.v < 0 ? -1 : 1;
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
        y = farY(d.x) - 8 * d.k;
        ctx.save(); ctx.translate(d.x, y); ctx.scale(dir, 1);
        ctx.beginPath(); ctx.ellipse(0, 0, 11 * d.k, 8 * d.k, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-9 * d.k, 0); ctx.lineTo(-17 * d.k, -6 * d.k); ctx.lineTo(-17 * d.k, 6 * d.k); ctx.fill();
        var lx = 16 * d.k, ly = -17 * d.k + Math.sin(d.ph * 1.7) * 2 * d.k;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4 * d.k, -7 * d.k); ctx.quadraticCurveTo(10 * d.k, -20 * d.k, lx, ly); ctx.stroke();
        ctx.restore();
        lures.push({ x: d.x + dir * lx, y: y + ly, k: d.k, ph: d.ph });
      } else if (d.kind === 'squid') {                  // now and then a squid jets up out of the deep and away
        if (d.wait > 0) { d.wait -= dt; continue; }
        var pulse = Math.max(0, Math.sin(d.ph * 2.2));
        d.y -= (8 + pulse * 26) * dt * CS;
        if (d.y < surfH - 40) { d.y = farBase + 40; d.x = rr(W * 0.1, W * 0.9); d.wait = rr(60, 150); d.ph = 0; continue; }
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

  // ----- plankton: a daily cycle, and light when stirred at night -----
  // Plankton sink deep by day and rise toward the surface at night. The tide and storms carry them along.
  // At night they glow when something stirs them: the cargo ship leaves a shining wake, the whale a trail,
  // a storm sets the whole field sparkling, and crabs walking the sand leave glowing footprints. Storms and
  // passing ships feed a bloom that lasts a few minutes: more plankton, and a brighter glow.
  var plankton = [], motes = [], bloom = 0.25;
  var PLANKTON = 160, GLOW = '120,255,220';
  function stockPlankton() {
    plankton = [];
    for (var i = 0; i < PLANKTON; i++) plankton.push({ x: rr(-20, W + 20), f: rr(0.5, 0.95), o: rr(-0.22, 0.22), ph: rr(0, TAU), fl: 0, s: rr(0.6, 1.4), v: rr(-3, 3) });
  }
  function updatePlankton(dt) {
    var i, p, top = surfH + 6, bot, y, centre = 0.78 - 0.5 * nightA, push = S.tide * 10 + stormA * 34, moving = cargo.phase === 'in' && cargo.x > riserPoint(1).x + 1 || cargo.phase === 'out',
      L = whale ? Math.min(W * 0.22, 320 * CS) : 0;
    if (!plankton.length) stockPlankton();
    // the bloom: fed by storms and passing ships, it ebbs over a few minutes
    bloom = clamp(bloom + dt * (stormA * 0.08 + (moving ? 0.03 : 0)) - dt * 0.006 * (bloom - 0.25), 0.25, 1);
    for (i = 0; i < plankton.length; i++) {
      p = plankton[i];
      p.ph += dt;
      p.f += (clamp(centre + p.o, 0.04, 0.98) - p.f) * Math.min(1, dt * 0.08);   // the daily rise and fall
      p.x += (push + p.v + Math.sin(p.ph * 0.7) * 3) * dt;
      if (p.x < -20) p.x += W + 40; else if (p.x > W + 20) p.x -= W + 40;
      bot = farY(p.x) - 4; y = top + (bot - top) * p.f; p.y = y;
      if (moving && Math.abs(p.x - cargo.x) < 50 && y < top + 70) p.fl = 1;         // churned up in the ship's wake
      if (whale && Math.abs(p.x - whale.x) < L * 0.4 && Math.abs(y - whale.y) < 50) p.fl = 1;
      if (stormA > 0.2 && Math.random() < dt * stormA * 0.9) p.fl = Math.max(p.fl, rr(0.5, 1));
      p.fl = Math.max(0, p.fl - dt * 0.35);
    }
    // footprints of light: crabs walking at night stir the plankton on the sand
    if (nightA > 0.2 && !mqReduce.matches) for (i = 0; i < S.crabs.length; i++) {
      var c = S.crabs[i];
      if (c.moving && !(c.alt > 0) && Math.random() < dt * 5 * nightA * (0.4 + bloom)) {
        var px = crabX(c), sc = scaleAt(c.d);
        motes.push({ x: px + rr(-10, 10) * sc, y: groundY(px, c.d) - rr(0, 3) * sc, r: rr(1, 2.2) * sc, life: 0, max: rr(1.2, 2.4) });
      }
    }
    for (i = motes.length - 1; i >= 0; i--) { motes[i].life += dt; motes[i].y -= dt * 4; if (motes[i].life > motes[i].max) motes.splice(i, 1); }
    if (motes.length > 260) motes.splice(0, motes.length - 260);
  }
  function drawPlankton() {                // drawn over the night, so the glow is not dimmed by it
    var i, p, a, n = Math.round(PLANKTON * (0.45 + 0.55 * bloom)), tw, still = mqReduce.matches, day = 1 - nightA;
    ctx.save();
    if (day > 0.05) {                      // by day: faint drifting specks
      ctx.fillStyle = pal.foam;
      for (i = 0; i < n; i++) { p = plankton[i]; if (p.y === undefined) continue; ctx.globalAlpha = 0.14 * day * p.s; ctx.fillRect(p.x, p.y, 1.4, 1.4); }
    }
    if (nightA > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < n; i++) {
        p = plankton[i]; if (p.y === undefined) continue;
        tw = still ? 1 : 0.6 + 0.4 * Math.sin(p.ph * 3.1 + i);
        a = nightA * (0.3 + 0.45 * bloom + 0.9 * p.fl) * tw;
        if (a < 0.02) continue;
        ctx.fillStyle = 'rgba(' + GLOW + ',' + (a * 0.3).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, (3 + 4 * p.fl) * p.s * CS, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(' + GLOW + ',' + Math.min(1, a).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 * p.s * CS, 0, TAU); ctx.fill();
      }
      for (i = 0; i < motes.length; i++) {
        var m = motes[i], k = 1 - m.life / m.max;
        ctx.fillStyle = 'rgba(' + GLOW + ',' + (nightA * k * 0.22).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(' + GLOW + ',' + (nightA * k * 0.8).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 0.7, 0, TAU); ctx.fill();
      }
      for (i = 0; i < lures.length; i++) {  // the anglerfish's lure
        var lu = lures[i], g = 0.55 + 0.45 * Math.sin(lu.ph * 2.3);
        ctx.fillStyle = 'rgba(255,236,160,' + (nightA * 0.25 * g).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(lu.x, lu.y, 7 * lu.k, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,246,200,' + (nightA * 0.9 * g).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(lu.x, lu.y, 1.6 * lu.k, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawSea(dt) {
    var i, j, f, x, y, jl, pulse;
    if (fish.length === 0) stockSea();
    drawDeep(dt); updatePlankton(dt);
    ctx.save();
    for (i = 0; i < fish.length; i++) {
      f = fish[i]; f.x += f.v * dt; f.ph += dt;
      if (f.x < -80) f.x = W + 60; if (f.x > W + 80) f.x = -60;
      for (j = 0; j < f.n; j++) {
        x = f.x - Math.sign(f.v) * (j % 3) * 14 - j * 3; y = f.y + Math.sin(f.ph * 2 + j) * 6 + (j % 2) * 9;
        ctx.globalAlpha = 0.4; ctx.fillStyle = pal.foam;
        ctx.beginPath(); ctx.ellipse(x, y, 5, 2, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - Math.sign(f.v) * 4, y); ctx.lineTo(x - Math.sign(f.v) * 8, y - 2.5); ctx.lineTo(x - Math.sign(f.v) * 8, y + 2.5); ctx.closePath(); ctx.fill();
      }
    }
    for (i = 0; i < jellies.length; i++) {
      jl = jellies[i]; jl.ph += dt; pulse = Math.sin(jl.ph * 2.2);
      jl.y += (pulse > 0 ? -jl.v : jl.v * 0.4) * dt; jl.x += Math.sin(jl.ph * 0.3) * 4 * dt;
      if (jl.y < surfH + 20) jl.y = base[0] - 40;
      ctx.globalAlpha = 0.35; ctx.fillStyle = pal.scout;
      ctx.beginPath(); ctx.ellipse(jl.x, jl.y, 9 + pulse * 1.5, 6 - pulse, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = pal.scout; ctx.lineWidth = 1;
      for (j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(jl.x + j * 3, jl.y); ctx.quadraticCurveTo(jl.x + j * 3 + Math.sin(jl.ph * 3 + j) * 3, jl.y + 8, jl.x + j * 3, jl.y + 16 - pulse * 2); ctx.stroke(); }
    }
    ctx.restore();
    // the ship at the surface that takes the metal
    var top = riserPoint(1), sx = top.x, sy = waveY(LAYERS[2], sx) - 4;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(T * (0.8 + stormA * 1.6)) * (0.03 + stormA * 0.14));
    ctx.fillStyle = pal.metalDark; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(-46, -6); ctx.lineTo(46, -6); ctx.lineTo(36, 8); ctx.lineTo(-36, 8); ctx.closePath(); ctx.fill();
    ctx.fillRect(-20, -18, 22, 12); ctx.fillRect(14, -26, 3, 20);
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(15, -26); ctx.lineTo(4, -4); ctx.stroke();
    ctx.restore();
  }
  function octoPos() {                  // swimming down toward its target, or back up out of reach
    var o = S.octo, px = X(o.x), gy = groundY(px, clamp(o.d, 0, 1)), alt = 0;
    if (o.state === 'come' && o.tg) alt = clamp((o.tg.x - 6 - o.x) / 260, 0, 1);
    if (o.state === 'flee') alt = clamp((o.fx - o.x) / 260, 0, 1);
    alt = alt * alt * (3 - 2 * alt);
    return { x: px, y: gy - alt * (gy - H * 0.2), alt: alt };
  }
  function drawOcto() {                  // a sneaky octopus: eight wavy arms, big eyes, loot held over its head
    var o = S.octo; if (!o) return;
    var op = octoPos(), px = op.x, gy = op.y, s = scaleAt(clamp(o.d, 0, 1)) * 1.15, i, a, bob = Math.sin(T * 5) * 1.5 * s, by = gy - 14 * s + bob, flee = o.state === 'flee', swim = op.alt > 0.05;
    ctx.save(); ctx.translate(px, 0);
    ctx.strokeStyle = pal.crabDark; ctx.lineCap = 'round';
    for (i = 0; i < 8; i++) {                 // the arms
      a = (i - 3.5) / 3.5; ctx.lineWidth = 2.6 * s * (1 - Math.abs(a) * 0.3);
      ctx.beginPath(); ctx.moveTo(a * 6 * s, by + 4 * s);
      if (swim) ctx.quadraticCurveTo(a * 8 * s + Math.sin(T * 9 + i) * 3 * s, by + 14 * s, a * 6 * s + Math.sin(T * 7 + i * 1.7) * 5 * s, by + 26 * s);   // arms trailing as it jets
      else ctx.quadraticCurveTo(a * 14 * s + Math.sin(T * 7 + i) * 4 * s, by + 10 * s, a * 18 * s + Math.sin(T * 6 + i * 1.7) * 3 * s, gy - Math.max(0, Math.sin(T * 8 + i)) * 3 * s);
      ctx.stroke();
    }
    ctx.fillStyle = '#b2457a';                // the head
    ctx.beginPath(); ctx.ellipse(0, by - 4 * s, 10 * s, 12 * s, Math.sin(T * 2) * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-3 * s, by - 9 * s, 4 * s, 3 * s, -0.4, 0, TAU); ctx.fill();
    for (i = -1; i <= 1; i += 2) {            // eyes: sly while sneaking, wide while fleeing
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(i * 4 * s, by - 3 * s, 2.8 * s, flee ? 3.2 * s : 2 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.arc(i * 4 * s + o.dir * 1 * s, by - 3 * s, 1.3 * s, 0, TAU); ctx.fill();
      if (!flee) { ctx.strokeStyle = '#7a2350'; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(i * 4 * s - 3 * s, by - 6.2 * s - i * 0.6 * s); ctx.lineTo(i * 4 * s + 3 * s, by - 5.4 * s + i * 0.6 * s); ctx.stroke(); }
    }
    ctx.strokeStyle = pal.pupil; ctx.lineWidth = 1 * s; ctx.beginPath();
    if (flee) ctx.arc(0, by + 3 * s, 1.6 * s, 0, TAU); else ctx.arc(0, by + 1 * s, 2.4 * s, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    for (i = 0; i < o.carry; i++) drawNod((i - (o.carry - 1) / 2) * 7 * s, by - 18 * s, 3.4 * s, 1, T);   // the loot
    ctx.restore();
    if (o.state !== 'flee' && T % 2 < 1.4) drawBubble(px + 12 * s, by - 26 * s, emojiOK ? '🐙🪨❓' : spoken('🐙🪨❓'), s, 1, true);
  }
  function drawTideCurrents() {          // at high or low water, or in a storm, the current runs over the dunes
    var a = Math.max(Math.abs(S.tide), stormA * 1.3), i, x, y, dir = S.tide > 0 ? 1 : -1;
    if (a < 0.4) return;
    ctx.save(); ctx.strokeStyle = pal.foam; ctx.lineWidth = 1.4; ctx.globalAlpha = (a - 0.4) * 0.5;
    ctx.setLineDash([26, 40]); ctx.lineDashOffset = -T * 60 * dir;
    for (i = 0; i < 5; i++) {
      y = base[0] + (H - base[0]) * (0.1 + i * 0.18);
      ctx.beginPath();
      for (x = -20; x <= W + 20; x += 20) { var yy = y + Math.sin(x * 0.01 + T * 0.6 + i) * 6; if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawInk() {
    ctx.save();
    for (var i = 0; i < inks.length; i++) { var n = inks[i]; ctx.globalAlpha = 0.55 * (1 - n.life / n.max); ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawWhale() {                 // a whale silhouette in the open water, behind the dunes
    if (!whale) return;
    var w = whale, L = Math.min(W * 0.22, 320 * CS), d = Math.sign(w.v), tail = Math.sin(w.ph * 1.6) * 0.25;
    ctx.save(); ctx.translate(w.x, w.y + Math.sin(w.ph * 0.5) * 6); ctx.scale(d, 1);
    ctx.fillStyle = 'rgba(8,30,48,.45)';
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.bezierCurveTo(L * 0.45, -L * 0.13, L * 0.1, -L * 0.16, -L * 0.25, -L * 0.08);
    ctx.quadraticCurveTo(-L * 0.42, -L * 0.03, -L * 0.48, 0);
    ctx.lineTo(-L * 0.62, -L * 0.1 + tail * L * 0.1); ctx.lineTo(-L * 0.58, 0); ctx.lineTo(-L * 0.62, L * 0.1 + tail * L * 0.1);   // the flukes
    ctx.lineTo(-L * 0.46, L * 0.02);
    ctx.bezierCurveTo(-L * 0.2, L * 0.1, L * 0.3, L * 0.12, L * 0.5, 0);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(L * 0.05, L * 0.08); ctx.quadraticCurveTo(-L * 0.02, L * 0.2, -L * 0.1, L * 0.18); ctx.lineTo(-L * 0.02, L * 0.08); ctx.fill();   // a long flipper
    ctx.restore();
    if (Math.random() < 0.02) floaters.push({ text: '♪', x: w.x + d * L * 0.45, y: w.y - 10, life: 0, max: 2, big: false });   // whale song
  }
  function drawWhaleShadow() {           // its shadow sweeping across the sand
    if (!whale) return;
    var L = Math.min(W * 0.22, 320 * CS), g, cx = whale.x, cy = base[1] + (H - base[1]) * 0.45;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.32);
    g = ctx.createRadialGradient(0, 0, 4, 0, 0, L * 0.6);
    g.addColorStop(0, 'rgba(8,24,40,.22)'); g.addColorStop(1, 'rgba(8,24,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, L * 0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function rivalFoot() { return { x: W - 26 * CS, y: base[0] - H * 0.13 }; }   // behind the ridge, where the rivals' line comes up
  function rivalPoint(t, sx, sy) {        // along the rivals' line, from behind the ridge (0) to the ship's stern (1)
    var f = rivalFoot(), u = 1 - t;
    return { x: f.x * u + sx * t, y: f.y * u + sy * t + Math.sin(t * Math.PI) * 18 * CS };
  }
  function drawRivalLine(x, y) {
    var i, p, sx = x + 78, sy = y + 6;
    ctx.save(); ctx.strokeStyle = pal.warn; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.globalAlpha = 0.85;
    ctx.beginPath(); for (i = 0; i <= 20; i++) { p = rivalPoint(i / 20, sx, sy); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = pal.warn;
    for (i = 0; i < rivalLifts.length; i++) { p = rivalPoint(rivalLifts[i].t, sx, sy); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawCargo() {                 // the cargo ship that posts orders, with the order on its flag
    if (cargo.phase === 'gone') return;
    var x = cargo.x, y = waveY(LAYERS[2], x) - 6, o = S.order;
    if (o && o.rivalRate && cargo.phase === 'in') drawRivalLine(x, y);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(T * (0.7 + stormA * 1.5)) * (0.02 + stormA * 0.1));
    ctx.fillStyle = pal.crabDark; ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.moveTo(-90, -10); ctx.lineTo(92, -10); ctx.lineTo(74, 14); ctx.lineTo(-76, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.metal; ctx.fillRect(-60, -24, 30, 14); ctx.fillRect(-26, -24, 30, 14); ctx.fillRect(8, -24, 30, 14);   // containers
    ctx.fillStyle = pal.ingot; ctx.fillRect(42, -40, 26, 30);                                                                 // the bridge
    ctx.fillStyle = pal.metalDark; ctx.fillRect(-70, -60, 3, 50);
    if (o) {
      ctx.fillStyle = pal.paper; ctx.fillRect(-67, -60, 58, o.rivalRate ? 32 : 20);
      ctx.fillStyle = pal.ink; ctx.font = '700 11px ' + cssFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.got + ' / ' + o.need, -38, -50);
      if (o.rivalRate) { ctx.fillStyle = pal.warn; ctx.font = '700 10px ' + cssFont; ctx.fillText('rival ' + Math.floor(o.rival), -38, -37); }
    }
    ctx.restore();
  }
  function traderPos() { var tr = S.trader, px = X(tr ? tr.x : K.TRADER_SPOT); return { x: px, y: groundY(px, 0.9) }; }
  function drawTrader() {                // a hermit crab with a market stall on its shell
    var tr = S.trader; if (!tr) return;
    var p = traderPos(), s = scaleAt(0.9), walking = tr.state !== 'stay', dir = tr.state === 'leave' ? -1 : 1, i, bob = walking ? Math.abs(Math.sin(T * 8)) * 1.5 : Math.sin(T * 2) * 0.5;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s * dir, s); ctx.lineCap = 'round';
    ctx.strokeStyle = '#a2523a'; ctx.lineWidth = 1.8;                      // legs
    for (i = -2; i <= 2; i++) { var lf = walking ? Math.max(0, Math.sin(T * 9 + i)) * 3 : 0; ctx.beginPath(); ctx.moveTo(i * 4, -6 - bob); ctx.lineTo(i * 6, -lf); ctx.stroke(); }
    ctx.fillStyle = '#f0a07a'; ctx.beginPath(); ctx.ellipse(10, -8 - bob, 7, 5, 0, 0, TAU); ctx.fill();   // its face peeking out
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12, -14 - bob, 2.2, 0, TAU); ctx.arc(16, -13 - bob, 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.arc(12.6, -14 - bob, 1, 0, TAU); ctx.arc(16.6, -13 - bob, 1, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(14, -8 - bob, 2.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#e7d3b0'; ctx.beginPath(); ctx.ellipse(-4, -16 - bob, 15, 12, -0.2, 0, TAU); ctx.fill();   // the spiral shell
    ctx.strokeStyle = '#b08d5a'; ctx.lineWidth = 1.3; ctx.beginPath();
    for (i = 0; i <= 22; i++) { var th = i * 0.55, rad = 11 - i * 0.45; ctx.lineTo(-4 + Math.cos(th) * rad, -16 - bob + Math.sin(th) * rad * 0.8); } ctx.stroke();
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, -26 - bob); ctx.lineTo(-14, -42 - bob); ctx.moveTo(6, -26 - bob); ctx.lineTo(6, -42 - bob); ctx.stroke();   // the stall
    for (i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#fff' : pal.mark; ctx.fillRect(-16 + i * 4.6, -46 - bob, 4.6, 5); }
    drawBar(-8, -30 - bob, 0.7, 0); drawIngot(1, -31 - bob, 0.6);
    ctx.restore();
    if (tr.state === 'stay' || T < traderBubble) drawBubble(p.x + 18 * s, p.y - 58 * s, emojiOK ? '🐚🛒❓' : spoken('🐚🛒❓'), s, 1, true);
  }
  function turtlePos() { var tu = S.turtle, px = X(tu.x), gy = groundY(px, clamp(tu.d, 0.02, 0.98)); return { x: px, y: gy - 26 * CS + Math.sin(T * 2) * 3 * CS }; }
  function drawTurtle() {                // a sea turtle paddling low over the sand
    var tu = S.turtle; if (!tu) return;
    var p = turtlePos(), s = CS * 1.2, f = Math.sin(T * 5), gx = p.x, gy = groundY(p.x, clamp(tu.d, 0.02, 0.98));
    ctx.save(); ctx.fillStyle = 'rgba(8,24,40,.18)'; ctx.beginPath(); ctx.ellipse(gx, gy, 24 * s, 5 * s, 0, 0, TAU); ctx.fill(); ctx.restore();   // its shadow
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(tu.dir * s, s);
    ctx.fillStyle = '#5c9a6a';
    ctx.beginPath(); ctx.ellipse(-8, 6, 9, 3, 0.5 + f * 0.4, 0, TAU); ctx.fill();   // flippers
    ctx.beginPath(); ctx.ellipse(10, 6, 10, 3, -0.5 - f * 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-18, 2, 4, 2, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7fb98a'; ctx.beginPath(); ctx.ellipse(24, -1, 6, 4.5, 0, 0, TAU); ctx.fill();   // head
    ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.arc(26, -2.5, 1.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(26, 0.5, 2, 0.1 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#3f7a52'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, Math.PI, TAU); ctx.lineTo(20, 2); ctx.lineTo(-20, 2); ctx.closePath(); ctx.fill();   // shell
    ctx.strokeStyle = '#9fd1a6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(-5, -7); ctx.lineTo(5, -7); ctx.lineTo(10, -1); ctx.moveTo(-5, -7); ctx.lineTo(0, -1); ctx.lineTo(5, -7); ctx.stroke();
    ctx.restore();
  }
  function drawStorm() {                 // dark water, slanting rain at the surface, and the odd flash of lightning
    if (stormA < 0.02 && flash < 0.02) return;
    ctx.save();
    ctx.fillStyle = 'rgba(20,28,48,' + (0.3 * stormA).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = pal.foam; ctx.globalAlpha = 0.45 * stormA; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < rain.length; i++) { var n = rain[i]; ctx.moveTo(n.x, n.y); ctx.lineTo(n.x - 5, n.y - 14); }
    ctx.stroke();
    if (flash > 0) { ctx.globalAlpha = flash * 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H * 0.5); }
    ctx.restore();
  }
  function drawBombs() {                 // blobs of lava thrown up by a surge
    ctx.save(); ctx.fillStyle = pal.lavaHot;
    for (var i = 0; i < bombs.length; i++) { var b = bombs[i]; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(b.x, b.y, 2.6 * CS, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(b.x, b.y, 6 * CS, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawNight() {               // night falls over the sea; the lava and the lamps keep glowing
    if (nightA < 0.02) return;
    ctx.fillStyle = 'rgba(4,14,38,' + (0.42 * nightA).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < S.crabs.length; i++) {
      var c = S.crabs[i], s = scaleAt(c.d), px = crabX(c), y = c.alt > 0 ? airPos(c).y : groundY(px, c.d) - 9 * s;
      if (c.state === 'sleep') continue;
      var g = ctx.createRadialGradient(px, y - 6 * s, 1, px, y - 6 * s, 22 * s);
      g.addColorStop(0, 'rgba(255,240,170,' + (0.35 * nightA).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, y - 6 * s, 22 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawEddy(n, px, y, s) {     // water churned by the drill, turning on the sand
    var e = n.eddy, strength = Math.sin(Math.PI * e), R = (10 + 8 * strength) * s, arm, k, f, th;
    ctx.strokeStyle = pal.foam; ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
    for (arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (k = 0; k <= 14; k++) { f = k / 14; th = arm * 2.094 + e * 11 + f * 3.6; if (k) ctx.lineTo(px + Math.cos(th) * R * f, y + Math.sin(th) * R * f * 0.42); else ctx.moveTo(px, y); }
      ctx.globalAlpha = strength * 0.8; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawGroundNodule(n) {
    var px = X(n.x), y = groundY(px, n.d), s = scaleAt(n.d), a;
    if (n.vr === undefined) n.vr = 2.8 + ((n.x * 7.31) % 1) * 1.8;
    if (n.eddy >= 0) { drawEddy(n, px, y, s); a = clamp((n.eddy - 0.5) / 0.5, 0, 1); if (a > 0) drawNod(px, y, n.vr * s * (0.7 + 0.3 * a), a * 0.6, 0); }
    else drawNod(px, y, n.vr * s, 1, 0);
  }
  function drawFlag(f) {               // a stake with a pennant: its colour says how rich, its pips how big
    var px = X(f.x), y = groundY(px, f.d), s = scaleAt(f.d), grow = f.vborn ? clamp((T - f.vborn) / 0.4, 0, 1) : 1, i, wave = Math.sin(T * 3 + f.id) * 1.5;
    var col = f.q >= 0.75 ? pal.energy : (f.q >= 0.55 ? pal.ingot : pal.lava);
    ctx.save(); ctx.translate(px, y); ctx.scale(s, s * grow);
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(7, -20 + wave, 13, -18 + wave); ctx.quadraticCurveTo(7, -15 + wave * 0.5, 0, -14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = pal.nodule;
    for (i = 0; i < Math.min(f.size, 7); i++) { ctx.beginPath(); ctx.arc(-1.5 + (i % 4) * 3.2 - 4, 3 + Math.floor(i / 4) * 2.6, 1.1, 0, TAU); ctx.fill(); }
    if (f.by) { ctx.strokeStyle = pal.drillDark; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 1, 10, 3, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function drawFlights() {
    for (var i = 0; i < flights.length; i++) {
      var f = flights[i], t = clamp(f.t, 0, 1), x = f.x0 + (f.to.x - f.x0) * t, y = f.y0 + (f.to.y - f.y0) * t - Math.sin(Math.PI * t) * 10 * CS;
      if (f.kind === 'pearl') { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 7 * CS, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#f4f0ff'; ctx.beginPath(); ctx.arc(x, y, 3.4 * CS, 0, TAU); ctx.fill(); ctx.strokeStyle = pal.scout; ctx.lineWidth = 0.8; ctx.stroke(); }
      else if (f.kind === 'nod') drawNod(x, y, 3.8 * CS, 1, t * 4);
      else if (f.kind === 'bar') drawBar(x, y, CS, 0);
      else drawIngot(x, y, CS * (1 - 0.2 * t));
    }
  }
  function drawRings() {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      ctx.strokeStyle = r.c; ctx.lineWidth = 2; ctx.globalAlpha = 1 - r.t;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, 8 + r.t * 40 * CS, (8 + r.t * 40 * CS) * 0.35, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawParticles() {
    var i, p;
    for (i = 0; i < puffs.length; i++) {
      p = puffs[i]; ctx.globalAlpha = (1 - p.life / p.max) * 0.5; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = pal.lavaHot;
    for (i = 0; i < embers.length; i++) { p = embers[i]; ctx.globalAlpha = 1 - p.life / p.max; ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, TAU); ctx.fill(); }
    for (i = 0; i < sparks.length; i++) { p = sparks[i]; ctx.fillStyle = p.c; ctx.globalAlpha = 1 - p.life / p.max; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (i = 0; i < confetti.length; i++) {
      p = confetti[i]; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-3, -1.5, 6, 3); ctx.restore();
    }
  }
  function drawFloaters() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i], a = f.life < 0.2 ? f.life / 0.2 : 1 - Math.max(0, f.life - f.max + 0.5) / 0.5;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = '700 ' + Math.round((f.big ? 15 : 12) * CS + 2) + 'px ' + cssFont;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = pal.ingot; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // ----- the crabs' repertoire: 52 animations -----
  // Each takes the crab and the seconds since it began, and returns a pose: eyes, mouth, a tilt of the whole
  // body (radians), an offset, where the two claws go (left x, y, right x, y, in shell units from the body),
  // what the legs do, and a prop. Events and states pick them; see moodFor() and the event hooks.
  function osc(u, hz) { return Math.sin(u * hz * TAU); }
  var ANIMS = {
    // celebrations
    pump: function (c, u) { var p = Math.abs(osc(u, 2.2)); return { eye: 'happy', mouth: 'open', dy: -p * 2, arm: c.dir > 0 ? [-15, -2, 10, -14 - p * 4] : [-10, -14 - p * 4, 15, -2] }; },
    clap: function (c, u) { var g = 3 + Math.abs(osc(u, 3)) * 7; return { eye: 'happy', mouth: 'open', arm: [-g, -9, g, -9], prop: Math.abs(osc(u, 3)) < 0.15 ? 'sparkle' : null }; },
    spin: function (c, u) { return { eye: 'wide', mouth: 'open', tilt: Math.min(u, 0.85) / 0.85 * TAU, dy: -Math.sin(Math.min(1, u / 0.85) * Math.PI) * 7, arm: [-14, -10, 14, -10] }; },
    jazz: function (c, u) { var w = osc(u, 6) * 2; return { eye: 'happy', mouth: 'grin', arm: [-13 + w, -15, 13 - w, -15] }; },
    cheer: function (c, u) { var w = osc(u, 2.4); return { eye: 'happy', mouth: 'open', tilt: w * 0.08, arm: [-12 + w * 4, -16, 12 + w * 4, -16] }; },
    shimmy: function (c, u) { var w = osc(u, 5); return { eye: 'happy', mouth: 'grin', dx: w * 2, tilt: w * 0.12, arm: [-14, -6 + w * 2, 14, -6 - w * 2] }; },
    moonwalk: function (c, u) { return { eye: 'normal', mouth: 'grin', dx: -c.dir * (u % 1.6) * 6, legs: 'step', tilt: -0.06 * c.dir, arm: [-15, -4, 15, -4] }; },
    headbang: function (c, u) { var w = osc(u, 4); return { eye: 'closed', mouth: 'open', tilt: w * 0.18, dy: -Math.abs(w) * 2, arm: [-12, -14, 12, -14] }; },
    robot: function (c, u) { var st = Math.floor(u * 3) % 4; return { eye: 'focus', mouth: 'flat', tilt: st % 2 ? 0.06 : -0.06, arm: [[-15, -10, 15, -2], [-15, -2, 15, -10], [-8, -12, 15, -2], [-15, -2, 8, -12]][st] }; },
    floss: function (c, u) { var w = osc(u, 2.4); return { eye: 'happy', mouth: 'tongue', dx: -w * 3, arm: [-6 + w * 10, 2, 6 + w * 10, 2] }; },
    disco: function (c, u) { var f = Math.floor(u * 1.6) % 2; return { eye: 'star', mouth: 'grin', tilt: f ? 0.1 : -0.1, arm: f ? [-18, 4, 12, -18] : [-12, -18, 18, 4] }; },
    twirlEyes: function (c, u) { return { eye: 'orbit', mouth: 'o', tilt: osc(u, 1) * 0.1, arm: [-15, -6, 15, -6] }; },
    hopJoy: function (c, u) { var h = Math.abs(osc(u, 1.8)); return { eye: 'happy', mouth: 'open', dy: -h * 7, arm: [-13, -12, 13, -12] }; },
    // social: dances and greetings between friends
    wave: function (c, u) { var w = osc(u, 2.5); return { eye: 'happy', mouth: 'smile', arm: c.dir > 0 ? [-15, -2, 13 + w * 4, -16] : [-13 + w * 4, -16, 15, -2] }; },
    highFive: function (c, u) { var p = c.vpd || c.dir, k = Math.min(1, u / 0.4); return { eye: 'happy', mouth: 'open', arm: p > 0 ? [-15, -2, 14 + 6 * k, -12 - 6 * k] : [-14 - 6 * k, -12 - 6 * k, 15, -2] }; },
    sway: function (c, u) { var w = osc(u, 0.8); return { eye: 'happy', mouth: 'smile', tilt: w * 0.16, dx: w * 2, arm: [-14, -8 + w * 3, 14, -8 - w * 3] }; },
    hug: function (c, u) { return { eye: 'heart', mouth: 'smile', tilt: (c.vpd || 1) * 0.12, arm: [-5, -5, 5, -5] }; },
    salsa: function (c, u) { var w = osc(u, 1.6); return { eye: 'happy', mouth: 'grin', dx: w * 5, tilt: -w * 0.1, legs: 'step', arm: [-12, -10 - w * 4, 12, -10 + w * 4] }; },
    dosido: function (c, u) { var a = u * TAU * 0.5; return { eye: 'happy', mouth: 'open', dx: Math.cos(a) * 8 * (c.vpd || 1), dy: Math.sin(a) * 2, legs: 'step', arm: [-10, -12, 10, -12] }; },
    cheek: function (c, u) { return { eye: 'closed', mouth: 'smile', tilt: (c.vpd || 1) * 0.22 + osc(u, 0.6) * 0.04, arm: [-12, -6, 12, -6] }; },
    conga: function (c, u) { var b = Math.abs(osc(u, 2)); return { eye: 'happy', mouth: 'open', dy: -b * 3, legs: 'step', arm: c.dir > 0 ? [6, -6, 18, -6] : [-18, -6, -6, -6] }; },
    bow: function (c, u) { var k = Math.sin(Math.min(1, u / 1.2) * Math.PI); return { eye: 'closed', mouth: 'smile', tilt: c.dir * 0.35 * k, arm: [-12, 2, 12, 2] }; },
    // idle: what a crab does while it waits
    tap: function (c, u) { return { eye: 'bored', mouth: 'flat', legs: 'tap', arm: [-6, 0, 6, 0] }; },
    lookAround: function (c, u) { return { eye: 'normal', mouth: 'flat', look: { x: osc(u, 0.45), y: osc(u, 0.9) * 0.5 }, tilt: osc(u, 0.45) * 0.05 }; },
    yawnStretch: function (c, u) { var k = Math.sin(Math.min(1, u / 1.6) * Math.PI); return { eye: 'closed', mouth: 'o', arm: [-10 - 4 * k, -4 - 12 * k, 10 + 4 * k, -4 - 12 * k], dy: -k * 2 }; },
    eyeRoll: function (c, u) { return { eye: 'roll', mouth: 'flat', arm: [5, 1, -5, 1] }; },
    crossArms: function (c, u) { return { eye: 'bored', mouth: 'flat', arm: [5, 1, -5, 1], tilt: -0.04 }; },
    sigh: function (c, u) { return { eye: 'closed', mouth: 'o', body: Math.sin(Math.min(1, u / 1.5) * Math.PI) * 2, arm: [-14, 2, 14, 2] }; },
    whistle: function (c, u) { return { eye: 'happy', mouth: 'o', tilt: osc(u, 0.7) * 0.06, prop: 'note' }; },
    juggle: function (c, u) { return { eye: 'up', mouth: 'grin', prop: 'pebble', arm: [-7, -8 - Math.abs(osc(u, 1.5)) * 3, 7, -8 - Math.abs(osc(u + 0.33, 1.5)) * 3] }; },
    sideStretch: function (c, u) { var w = osc(u, 0.4); return { eye: 'closed', mouth: 'smile', tilt: w * 0.25, arm: w > 0 ? [-16, 3, 10, -17] : [-10, -17, 16, 3] }; },
    sit: function (c, u) { return { eye: 'happy', mouth: 'smile', legs: 'sit', body: 3, arm: [-12, 3, 12, 3] }; },
    peekaboo: function (c, u) { var hide = (u % 2) < 1; return { eye: hide ? 'closed' : 'wide', mouth: hide ? 'smile' : 'open', arm: hide ? [-4, -11, 4, -11] : [-15, -12, 15, -12] }; },
    blowBubbles: function (c, u) { return { eye: 'happy', mouth: 'o', prop: 'bubbles' }; },
    sneeze: function (c, u) { var wind = u < 0.7; return { eye: wind ? 'squint' : 'closed', mouth: 'o', tilt: wind ? -0.15 * c.dir : 0.25 * c.dir, prop: !wind && u < 0.9 ? 'bubbles' : null }; },
    // moods while working, waiting, or hurting
    determined: function (c, u) { return { eye: 'normal', mouth: 'grit', brows: true, tilt: c.dir * 0.1 }; },
    struggle: function (c, u) { return { eye: 'squint', mouth: 'tongue', sweat: true, tilt: osc(u, 3) * 0.08 }; },
    flex: function (c, u) { var p = Math.abs(osc(u, 1.5)); return { eye: 'happy', mouth: 'grin', arm: c.dir > 0 ? [-14, -2, 9, -13 - p * 3] : [-9, -13 - p * 3, 14, -2] }; },
    think: function (c, u) { return { eye: 'up', mouth: 'flat', arm: c.dir > 0 ? [-15, -2, 5, 2] : [-5, 2, 15, -2], glyph: '…' }; },
    stomp: function (c, u) { return { eye: 'angry', mouth: 'frown', dy: -Math.abs(osc(u, 3)) * 3, arm: [-11, -11, 11, -11] }; },
    slump: function (c, u) { return { eye: 'sad', mouth: 'frown', body: 2, tilt: 0.06, arm: [-12, 4, 12, 4] }; },
    shiver: function (c, u) { return { eye: 'wide', mouth: 'grit', dx: osc(u, 14) * 0.8, arm: [-6, -3, 6, -3] }; },
    dizzy: function (c, u) { return { eye: 'swirl', mouth: 'wavy', tilt: osc(u, 0.8) * 0.2 }; },
    relief: function (c, u) { return { eye: 'heart', mouth: 'smile', tilt: osc(u, 1) * 0.1, arm: [-5, -5, 5, -5] }; },
    ouch: function (c, u) { return { eye: 'wide', mouth: 'wavy', tilt: osc(u, 3.5) * 0.1, arm: [-9, 1, 9, 1] }; },
    shock: function (c, u) { return { eye: 'wide', mouth: 'o', dy: -Math.max(0, Math.sin(Math.min(1, u / 0.4) * Math.PI)) * 5, arm: [-12, -13, 12, -13] }; },
    shrug: function (c, u) { return { eye: 'up', mouth: 'flat', tilt: 0.2, arm: [-15, -9, 15, -9] }; },
    salute: function (c, u) { return { eye: 'normal', mouth: 'smile', arm: c.dir > 0 ? [-15, -2, 6, -13] : [-6, -13, 15, -2] }; },
    nod: function (c, u) { var m = u % 2.6, k = m < 2 ? m / 2 : 0; return { eye: k > 0.1 ? 'sleepy' : 'wide', mouth: 'flat', tilt: c.dir * 0.3 * k * k, arm: [-14, 2, 14, 2] }; },
    sparkleEyes: function (c, u) { return { eye: 'star', mouth: 'grin', prop: 'sparkle' }; },
    grumble: function (c, u) { return { eye: 'angry', mouth: 'frown', tilt: osc(u, 17) * 0.07, arm: [-11, -11, 11, -11] }; }
  };
  var ANIM_NAMES = Object.keys(ANIMS).concat(['rave']);
  var DUETS = ['sway', 'salsa', 'dosido', 'cheek', 'conga', 'highFive', 'floss', 'disco', 'moonwalk', 'robot', 'shimmy', 'headbang'];
  function anyOf(a) { return a[Math.floor(Math.random() * a.length)]; }
  function play(c, names, dur) {         // start an animation on a crab: one name, or a random one of several
    if (!c || c.state === 'sleep' || c.alt > 0) return;
    c.anim = { name: typeof names === 'string' ? names : anyOf(names), start: T, until: T + (dur || 2.2) };
  }
  function near(x, r) { return S.crabs.filter(function (c) { return Math.abs(c.x - x) < r && c.state !== 'sleep' && !(c.alt > 0); }); }
  function moodFor(c) {                  // ongoing states pick a looping animation; u counts from when it began
    var u = T - (c.vmoodT || T), idle = c.vidle || 0;
    if (c.dance && c.dance.state !== 'sleep') return ANIMS[DUETS[(c.id + c.dance.id) % DUETS.length]](c, T);
    if (S.si && S.si.night && c.role !== 'scout' && S.t - c.lastRest > K.REST_WINDOW * K.DAY / 24 && (c.moving || c.working))
      return { eye: 'sleepy', mouth: 'flat', tilt: Math.sin(T * 1.5 + c.vph) * 0.06 };   // dragging through the night, half speed
    if (c.role === 'energy' && c.broken) return ANIMS.dizzy(c, T);
    if (c.role !== 'energy' && c.bat < K.LOW) return ANIMS.nod(c, T + c.vph);
    if (c.limp && c.moving) return ANIMS.struggle(c, T);
    if (c.role === 'haul' && c.load >= sim.carry() && c.moving) return ANIMS.struggle(c, T);
    if (c.state === 'scan') return ANIMS.think(c, T);
    if (S.oc && (c.moving || c.working)) return ANIMS.determined(c, T);
    if (c.wear > K.WEAR_FREE && !c.moving && !c.working) return ANIMS[Math.sin(T * 0.3 + c.vph) > 0 ? 'sigh' : 'slump'](c, T % 3);
    if (!c.moving && !c.working && idle > 0.6) {               // the longer the wait, the sillier it gets
      var ladder = idle < 3 ? ['lookAround'] : idle < 6 ? ['tap', 'lookAround'] : idle < 10 ? ['crossArms', 'eyeRoll', 'tap'] : idle < 16 ? ['whistle', 'juggle', 'blowBubbles', 'sideStretch'] : ['sit', 'peekaboo', 'sneeze', 'whistle', 'juggle'];
      var name = ladder[Math.floor((idle / 4 + c.id) % ladder.length)];
      return ANIMS[name](c, idle % 4);
    }
    return null;
  }

  // ----- drawing: crabs, and the faces they pull -----
  // A face is two eyes on stalks and a mouth on the shell. Events set a short-lived mood;
  // otherwise the face follows the task: tongue out to drill, teeth gritted to crush, sweat at the lava.
  function face(c) {
    var waiting = !c.moving && !c.working, m = c.vx && T < c.vx.until ? c.vx.name : null;
    if (c.vfall > 0) return { eye: 'wide', mouth: 'o', arms: 'up' };
    if (c.state === 'sleep') return { eye: 'closed', mouth: 'o', glyph: 'z', sleep: true, tilt: 0.12 };
    if (c.turtle) return { eye: 'happy', mouth: 'open', arms: 'up', tilt: Math.sin(T * 3 + c.vph) * 0.12 };   // riding the turtle
    if (c.air && c.air.phase === 'rise') return { eye: 'happy', mouth: 'open', arms: 'up', tilt: Math.sin(T * 4 + c.vph) * 0.25 };
    if (c.air && c.air.phase === 'glide') return { eye: 'wide', mouth: 'open', swim: true, tilt: -0.35 };
    if (T < partyUntil) return { eye: 'happy', mouth: 'open', party: true };
    if (c.anim && T < c.anim.until) return ANIMS[c.anim.name](c, T - c.anim.start);
    if (!sim.isHeld(c)) { var mood = moodFor(c); if (mood) return mood; }
    var wig = Math.sin(T * 18 + c.vph);
    if (m === 'joy') return { eye: 'happy', mouth: 'open', arms: 'pump', tilt: wig * 0.12 };
    if (m === 'eureka') return { eye: 'wide', mouth: 'open', arms: 'point', tilt: -0.08 };
    if (m === 'shrug') return { eye: 'up', mouth: 'flat', arms: 'shrug', tilt: 0.2 };
    if (m === 'grumble') return { eye: 'angry', mouth: 'frown', arms: 'fists', tilt: Math.sin(T * 34) * 0.07 };
    if (m === 'shock') return { eye: 'wide', mouth: 'o', arms: 'up' };
    if (m === 'zap') return { eye: 'star', mouth: 'grin', tilt: wig * 0.1 };
    if (m === 'relief') return { eye: 'heart', mouth: 'smile', arms: 'hug', tilt: Math.sin(T * 6) * 0.1 };
    if (m === 'proud') return { eye: 'happy', mouth: 'grin', arms: 'pump' };
    if (m === 'phew') return { eye: 'closed', mouth: 'smile', sweat: true, arms: 'wipe' };
    if (m === 'ouch') return { eye: 'wide', mouth: 'wavy', arms: 'hold', tilt: Math.sin(T * 22) * 0.1 };
    if (m === 'stretch') return { eye: 'happy', mouth: 'o', arms: 'wave' };
    if (m === 'yawn') return { eye: 'closed', mouth: 'o', arms: 'wipe' };
    if (m === 'wheee') return { eye: 'happy', mouth: 'open', arms: 'up' };
    if (sim.isHeld(c)) return { eye: 'wide', mouth: 'grit' };
    if (c.role === 'energy' && c.broken) return { eye: 'swirl', mouth: 'wavy', tilt: Math.sin(T * 3 + c.vph) * 0.15 };
    if (c.role !== 'energy' && c.bat < K.LOW) return { eye: 'sleepy', mouth: 'flat', sweat: true, tilt: 0.08 };   // flat, not asleep
    if (c.role === 'drill' && !c.bitOk) return c.state === 'drill' ? { eye: 'squint', mouth: 'wavy', sweat: true } : { eye: 'sad', mouth: 'wavy' };
    if (c.limp && c.moving) return { eye: 'sad', mouth: 'wavy' };
    switch (c.state) {
      case 'drill': return { eye: 'squint', mouth: 'tongue' };
      case 'crush': return { eye: 'squint', mouth: 'grit', brows: true };
      case 'smelt': return { eye: 'squint', mouth: 'o', sweat: true };
      case 'scan': return { eye: 'focus', mouth: 'o' };
      case 'fix': return { eye: 'squint', mouth: 'tongue' };
      case 'forge': return { eye: 'squint', mouth: 'o', sweat: true };
      case 'charge': return { eye: 'happy', mouth: 'grin' };
      case 'refill': return { eye: 'closed', mouth: 'smile' };
    }
    if (c.role === 'haul' && c.load >= K.CARRY && c.moving) return { eye: 'normal', mouth: 'tongue', sweat: true };
    if (S.oc && !waiting) return { eye: 'wide', mouth: 'grin', brows: true };   // overclocked: all in
    if (waiting && Math.sin(T * 0.35 + c.vph * 2) > 0.8) return { eye: 'roll', mouth: 'flat', arms: 'cross' };   // an eye-roll, arms folded
    if (waiting) return { eye: 'bored', mouth: Math.sin(T * 0.4 + c.vph * 3) > 0.93 ? 'o' : 'flat' };
    return { eye: 'normal', mouth: 'smile' };
  }
  function drawEye(x, y, s, f, look, c, side) {
    var r = 2.6 * s, blink = ((T + c.vph * 3) % 4.3) < 0.12;
    if (f.eye === 'squint') {          // > <
      ctx.strokeStyle = pal.pupil; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.moveTo(x - side * 1.8 * s, y - 1.6 * s); ctx.lineTo(x + side * 1.4 * s, y); ctx.lineTo(x - side * 1.8 * s, y + 1.6 * s); ctx.stroke();
      return;
    }
    if (f.eye === 'happy' || f.eye === 'closed' || (blink && f.eye !== 'wide' && f.eye !== 'swirl' && f.eye !== 'star')) {
      ctx.strokeStyle = pal.pupil; ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      if (f.eye === 'happy') ctx.arc(x, y + 0.8 * s, 1.9 * s, Math.PI * 1.1, Math.PI * 1.9);
      else { ctx.moveTo(x - 2 * s, y); ctx.lineTo(x + 2 * s, y); }
      ctx.stroke();
      return;
    }
    if (f.eye === 'wide') r *= 1.25;
    ctx.fillStyle = pal.eye; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.7 * s; ctx.stroke();
    if (f.eye === 'swirl') {
      ctx.beginPath();
      for (var k = 0; k <= 16; k++) { var th = k * 0.75 + T * 6 * side, rad = r * 0.85 * k / 16; if (k) ctx.lineTo(x + Math.cos(th) * rad, y + Math.sin(th) * rad); else ctx.moveTo(x, y); }
      ctx.stroke();
      return;
    }
    if (f.eye === 'star') {
      ctx.fillStyle = pal.ingotDark; ctx.beginPath();
      for (var j = 0; j < 10; j++) { var a = j * Math.PI / 5 - Math.PI / 2, rr2 = j % 2 ? r * 0.35 : r * 0.85; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
      ctx.closePath(); ctx.fill();
      return;
    }
    if (f.eye === 'heart') {
      ctx.fillStyle = pal.warn; ctx.beginPath();
      ctx.moveTo(x, y + 1.6 * s); ctx.bezierCurveTo(x - 2.6 * s, y - 0.2 * s, x - 1.4 * s, y - 2.4 * s, x, y - 1 * s);
      ctx.bezierCurveTo(x + 1.4 * s, y - 2.4 * s, x + 2.6 * s, y - 0.2 * s, x, y + 1.6 * s); ctx.fill();
      return;
    }
    var pr = f.eye === 'wide' ? 0.95 * s : 1.3 * s, ox = look.x * 0.9 * s, oy = look.y * 0.7 * s;
    if (f.eye === 'roll') { ox = Math.cos(T * 7 + side) * 1.1 * s; oy = -Math.abs(Math.sin(T * 7 + side)) * 1.1 * s; }
    if (f.eye === 'orbit') { ox = Math.cos(T * 9 + side * 1.5) * 1.2 * s; oy = Math.sin(T * 9 + side * 1.5) * 1.2 * s; }
    if (f.eye === 'focus') ox = -side * 0.9 * s;
    if (f.eye === 'up') oy = -1.1 * s;
    ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.arc(x + ox, y + oy, pr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + ox + 0.45 * s, y + oy - 0.45 * s, 0.4 * s, 0, TAU); ctx.fill();
    if (f.eye === 'sleepy' || f.eye === 'bored' || f.eye === 'sad' || f.eye === 'angry') {   // a heavy lid over the top of the eye
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r + 0.3, 0, TAU); ctx.clip();
      ctx.fillStyle = c.vbody;
      var lid = f.eye === 'sleepy' ? 0.35 : (f.eye === 'bored' ? 0.05 : -0.2);
      ctx.beginPath();
      if (f.eye === 'sad') { ctx.moveTo(x - r * 1.2, y - r * (side > 0 ? 0.6 : 0.1)); ctx.lineTo(x + r * 1.2, y - r * (side > 0 ? 0.1 : 0.6)); }
      else if (f.eye === 'angry') { ctx.moveTo(x - r * 1.2, y - r * (side > 0 ? 0.1 : 0.7)); ctx.lineTo(x + r * 1.2, y - r * (side > 0 ? 0.7 : 0.1)); }
      else { ctx.moveTo(x - r * 1.2, y + r * lid); ctx.lineTo(x + r * 1.2, y + r * lid); }
      ctx.lineTo(x + r * 1.2, y - r * 1.4); ctx.lineTo(x - r * 1.2, y - r * 1.4); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.7 * s; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    }
  }
  function drawMouth(y, s, f, dark) {
    var w = 2.6 * s;
    ctx.strokeStyle = pal.pupil; ctx.fillStyle = pal.pupil; ctx.lineWidth = 0.9 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    switch (f.mouth) {
      case 'smile': ctx.arc(0, y - 1 * s, w * 0.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); break;
      case 'grin':
        ctx.moveTo(-w, y - 0.4 * s); ctx.quadraticCurveTo(0, y + 2.6 * s, w, y - 0.4 * s); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5 * s; ctx.beginPath(); ctx.moveTo(-w * 0.7, y + 0.1 * s); ctx.lineTo(w * 0.7, y + 0.1 * s); ctx.stroke(); break;
      case 'open':
        ctx.moveTo(-w, y - 0.6 * s); ctx.quadraticCurveTo(0, y + 3.4 * s, w, y - 0.6 * s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = pal.tongue; ctx.beginPath(); ctx.ellipse(0, y + 1.1 * s, w * 0.45, 0.7 * s, 0, 0, TAU); ctx.fill(); break;
      case 'o': ctx.ellipse(0, y + 0.3 * s, 0.9 * s, 1.2 * s, 0, 0, TAU); ctx.fill(); break;
      case 'grit':
        ctx.fillStyle = '#fff'; ctx.fillRect(-w, y - 1 * s, w * 2, 2 * s); ctx.strokeRect(-w, y - 1 * s, w * 2, 2 * s);
        ctx.beginPath(); for (var i = -1; i <= 1; i++) { ctx.moveTo(i * w * 0.5, y - 1 * s); ctx.lineTo(i * w * 0.5, y + 1 * s); } ctx.stroke(); break;
      case 'tongue':
        ctx.arc(0, y - 1 * s, w * 0.75, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.fillStyle = pal.tongue; ctx.beginPath(); ctx.ellipse(w * 0.45, y + 0.9 * s + Math.sin(T * 8) * 0.2 * s, 0.9 * s, 1.2 * s, 0.3, 0, TAU); ctx.fill(); break;
      case 'flat': ctx.moveTo(-w * 0.6, y); ctx.lineTo(w * 0.6, y); ctx.stroke(); break;
      case 'frown': ctx.arc(0, y + 1.4 * s, w * 0.7, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); break;
      case 'wavy':
        ctx.moveTo(-w, y); for (var k = 1; k <= 6; k++) ctx.lineTo(-w + k * w / 3, y + (k % 2 ? -0.7 : 0.7) * s); ctx.stroke(); break;
    }
  }
  function armPose(pose, side, s, by, c) {   // claws that say how a crab feels
    switch (pose) {
      case 'pump': return side === c.dir ? [side * 10 * s, by - 16 * s - Math.abs(Math.sin(T * 12)) * 3 * s] : [side * 15 * s, by - 2 * s];
      case 'point': return side === 1 ? [20 * s, by - 10 * s] : [-14 * s, by - 2 * s];
      case 'shrug': return [side * 15 * s, by - 9 * s];
      case 'fists': return [side * 11 * s, by - 11 * s + Math.sin(T * 30 + side) * 1.5 * s];
      case 'up': return [side * 12 * s, by - 13 * s];
      case 'hug': return [side * 5 * s, by - 5 * s];
      case 'wipe': return side === 1 ? [6 * s, by - 10 * s] : [-15 * s, by - 2 * s];
      case 'hold': return [side * 9 * s, by + 1 * s];
      case 'wave': return side === 1 ? [14 * s + Math.sin(T * 14) * 4 * s, by - 15 * s] : [-15 * s, by - 2 * s];
      case 'cross': return [-side * 5 * s, by + 1 * s];
    }
    return [side * 17 * s, by - 3 * s];
  }
  var segmenter = window.Intl && Intl.Segmenter ? new Intl.Segmenter() : null;
  function glyphs(text) {                // emoji can be several code points; split into what the eye sees as one
    if (segmenter) return Array.from(segmenter.segment(text), function (g) { return g.segment; });
    return Array.from(text).reduce(function (out, ch) { if (/[\uFE0F\u200D]/.test(ch) && out.length) out[out.length - 1] += ch; else out.push(ch); return out; }, []);
  }
  function drawBubble(x, y, text, s, a, emoji, anim) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = (emoji && emojiOK ? '' : '700 ') + Math.round((emoji && emojiOK ? 10 : 9) * s + 2) + 'px ' + (emoji && emojiOK ? EMOJI_FONT : cssFont);
    var w = Math.max(ctx.measureText(text).width + 7 * s, 12 * s), h = 11 * s, t = anim ? T - anim.start : 99, k = 1, rot = 0, dx = 0, dy = 0, still = mqReduce.matches, mood = anim && !still ? anim.mood : '';
    if (anim && !still && t < 0.22) { var u = t / 0.22; k = 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2); k = Math.max(0.2, k); }   // pop in, overshooting a little
    if (mood === 'angry' && t < 0.8) { dx = Math.sin(T * 55) * 1.6 * s * (1 - t / 0.8); rot = Math.sin(T * 40) * 0.05; }
    else if (mood === 'ask') rot = Math.sin(t * 5) * 0.14;
    else if (mood === 'love') k *= 1 + 0.1 * Math.max(0, Math.sin(t * 9));
    else if (mood === 'alarm') dy = -Math.abs(Math.sin(t * 11)) * 4 * s * Math.exp(-t * 2.5);
    else if (mood === 'sad') { dy = Math.min(t, 0.7) * 4 * s; rot = Math.sin(T * 30) * 0.015; }
    ctx.translate(x + dx, y + dy); ctx.rotate(rot); ctx.scale(k, k);
    ctx.fillStyle = pal.paper; ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.8;
    roundRect(-w / 2, -h / 2, w, h, 4 * s); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3 * s, h / 2 - 0.5); ctx.lineTo(-5 * s, h / 2 + 3.5 * s); ctx.lineTo(1 * s, h / 2 - 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = text === '♥' ? pal.warn : pal.ink; ctx.textBaseline = 'middle';
    if (mood === 'joy') {                // each glyph hops in turn, a little wave across the bubble
      var gs = glyphs(text), gx = -ctx.measureText(text).width / 2, i, gw;
      ctx.textAlign = 'left';
      for (i = 0; i < gs.length; i++) {
        gw = ctx.measureText(gs[i]).width;
        ctx.fillText(gs[i], gx, 0.5 - Math.max(0, Math.sin(t * 10 - i * 0.9)) * 2.6 * s);
        gx += gw;
      }
    } else { ctx.textAlign = 'center'; ctx.fillText(text, 0, 0.5); }
    ctx.restore();
  }
  function star(x, y, r, fill, edge) {   // a small five-pointed star
    ctx.beginPath();
    for (var j = 0; j < 10; j++) { var a = -Math.PI / 2 + j * Math.PI / 5, q = j % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 0.6; ctx.stroke();
  }
  // Walking: in the first half of its cycle a leg lifts and swings forward; in the second it is planted and slides
  // back at a steady pace while the body passes over it. The foot sweeps STRIDE either side of its rest spot, and
  // the gait advances GAIT radians a pixel (at scale 1), chosen so a planted foot slides back exactly as fast as the
  // body moves forward: it stays put on the sand.
  var STRIDE = 2.8, GAIT = Math.PI / (2 * STRIDE);
  // Hand-offs, claw to claw like a relay baton: the part (or a charge cell) leaves the helper's claw, arcs
  // across to the claw the other crab holds out, and is fitted there.
  var PASS_PART = { energy: 'cell', repair: 'bit', mech: 'leg' };
  function passSide(a, b) { return crabX(b) >= crabX(a) ? 1 : -1; }
  function drawPasses() {
    for (var i = 0; i < S.crabs.length; i++) {
      var c = S.crabs[i], w = c.vpass && c.vpass.w;
      if (!w || w.gone || !(c.state === 'fix' || c.state === 'charge')) continue;
      var frac = clamp(1 - c.timer / c.vpass.total, 0, 1), s = scaleAt(w.d), from = clawPos(c, passSide(c, w)), to = clawPos(w, passSide(w, c));
      var u = clamp((frac - 0.12) / 0.5, 0, 1), e = u * u * (3 - 2 * u), x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(e * Math.PI) * 7 * s;
      ctx.save(); ctx.globalAlpha = frac > 0.7 ? clamp((1 - frac) / 0.3, 0, 1) : 1;   // fitted: it settles in and is gone
      drawPart(PASS_PART[c.role], x, y, s, 0);
      ctx.restore();
    }
  }
  function drawCrab(c) {
    var role = c.role, st = STYLE[role](), body = st[0], dark = st[1];
    var s = scaleAt(c.d) * (role === 'energy' ? 0.86 : 1);
    var px = crabX(c), gy = groundY(px, c.d), moving = c.moving, f = face(c), airborne = c.alt > 0, ap;
    var low = role !== 'energy' && c.bat < K.LOW;
    var i, side, ph, lift, hx, fx, ax, ay, hit, by, bob, w, col, look;
    c.vbody = body;
    if (c.vfall > 0) gy -= c.vfall * c.vfall * (H * 0.7);
    if (c.vhop > 0) gy -= Math.sin(c.vhop * Math.PI) * 7 * s;
    if (f.party) gy -= Math.abs(Math.sin(T * 7 + c.vph)) * 5 * s;
    if (c.state === 'drill') px += Math.sin(T * 61) * (c.bitOk ? 0.7 : 1.4);
    if (c.state === 'crush') px += Math.sin(T * 47) * 0.35;
    if (c.role === 'energy' && c.broken) px += Math.sin(T * 23) * 0.6;
    if (airborne) { ap = airPos(c); px = ap.x; gy = ap.y + 9 * s; moving = true; }
    if (c.turtle && S.turtle) { var tp2 = turtlePos(); px = tp2.x; gy = tp2.y - 6 * CS; moving = false; }
    bob = moving ? Math.sin(c.vgait * 2) * 0.7 : Math.sin(T * 2 + c.vph) * 0.35;   // walking bob, or slow breathing
    if (c.limp && c.moving) bob += Math.abs(Math.sin(c.vgait)) * 1.8 * s;          // a hobble
    by = gy - (f.sleep ? 6 : 9) * s + bob;
    look = { x: c.dir, y: 0 };
    if (!moving && !c.working) look = { x: Math.sin(T * 0.6 + c.vph), y: Math.cos(T * 0.9 + c.vph) * 0.4 };
    var rave = f.party ? Math.sin(T * 6.6) : 0;          // the crab rave: everyone in step
    if (f.party) { px -= rave * 7 * s; moving = false; }  // side-step one way while the claws wave the other
    if (f.dx) px += f.dx * s;
    if (f.dy) { gy += f.dy * s; by += f.dy * s; }
    if (f.body) by += f.body * s;
    if (f.look) look = f.look;
    if (c.vgaze && T < c.vgaze) look = { x: whale ? Math.sign(whale.v) * 0.4 : 0, y: -1.3 };   // looking up at the whale
    if (f.legs === 'sit') { by = gy - 6 * s; f.sleep2 = true; }
    var tilt = (f.tilt || 0) + (airborne ? 0 : crestTilt(c)) + rave * 0.08;
    ctx.save(); ctx.translate(px, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (tilt) { ctx.translate(0, by); ctx.rotate(tilt); ctx.translate(0, -by); }

    // overclock: speed streaks behind a crab that is hurrying
    if (S.oc && (c.moving || c.working) && !airborne) {
      ctx.strokeStyle = pal.light; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.7;
      for (i = 0; i < 3; i++) { var sl = -c.dir * (14 + i * 3) * s, sy0 = by - (4 - i * 4) * s; ctx.beginPath(); ctx.moveTo(sl, sy0); ctx.lineTo(sl - c.dir * (6 + 4 * Math.sin(T * 20 + i)) * s, sy0); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // legs: tucked in for sleep, paddling in the current, and one short if a leg has come off
    ctx.strokeStyle = dark; ctx.lineWidth = 1.7 * s;
    for (side = -1; side <= 1; side += 2) for (i = 0; i < 3; i++) {
      if (c.limp && side === -1 && i === 2) continue;
      if (airborne) {
        ph = T * 14 + i * 1.3 + side;
        hx = side * (5 + i * 2.2) * s; fx = side * (12 + i * 3) * s;
        ctx.beginPath(); ctx.moveTo(hx, by + 2 * s); ctx.lineTo(fx, by + (4 + Math.sin(ph) * 3) * s); ctx.stroke();
        continue;
      }
      if (f.sleep || f.sleep2) {
        hx = side * (5 + i * 2.2) * s;
        ctx.beginPath(); ctx.moveTo(hx, by + 2 * s); ctx.lineTo(hx + side * 4 * s, gy); ctx.stroke();
        continue;
      }
      ph = c.vgait + i * 2.094 + (side > 0 ? 0 : Math.PI);
      if (f.legs === 'tap' && i === 0 && side === c.dir) { hx = side * 5 * s; fx = side * 11.5 * s; lift = Math.abs(osc(T, 3)) * 3 * s; ctx.beginPath(); ctx.moveTo(hx, by + 2 * s); ctx.lineTo((hx + fx) / 2 + side * 2 * s, by - 3.5 * s - lift * 0.5); ctx.lineTo(fx, gy - lift); ctx.stroke(); continue; }
      if (f.legs === 'step') { hx = side * (5 + i * 2.2) * s; fx = side * (11.5 + i * 3.4) * s; lift = Math.max(0, Math.sin(T * 8 + i * 2 + (side > 0 ? 0 : Math.PI))) * 2.5 * s; ctx.beginPath(); ctx.moveTo(hx, by + 2 * s); ctx.lineTo((hx + fx) / 2 + side * 2 * s, by - 3.5 * s - lift * 0.5); ctx.lineTo(fx, gy - lift); ctx.stroke(); continue; }
      lift = f.party ? Math.max(0, Math.cos(T * 6.6) * side) * 3 * s : 0; w = 0;
      if (moving) {
        ph = ((ph % TAU) + TAU) % TAU;
        if (ph < Math.PI) { w = -1 + (1 - Math.cos(ph)); lift = Math.sin(ph) * 3.2 * s; }   // swing: up, and forward from back to front
        else w = 1 - 2 * (ph - Math.PI) / Math.PI;                                        // stance: planted, the body passes over it
      }
      hx = side * (5 + i * 2.2) * s; fx = side * (11.5 + i * 3.4) * s + w * STRIDE * s * c.dir;
      ctx.beginPath(); ctx.moveTo(hx, by + 2 * s); ctx.lineTo((hx + fx) / 2 + side * 2 * s, by - 3.5 * s - lift * 0.5); ctx.lineTo(fx, gy - lift); ctx.stroke();
    }

    // the drill bit, under the body; a broken one is snapped short and bent
    if (role === 'drill') {
      var ext = c.state === 'drill' ? 8 * s : -1 * s, tipx = 0;
      if (!c.bitOk) { ext = c.state === 'drill' ? 3 * s : -3 * s; tipx = 3 * s; }
      ctx.fillStyle = pal.metal; ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-4.2 * s, by + 3 * s); ctx.lineTo(4.2 * s, by + 3 * s); ctx.lineTo(tipx, gy + ext); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (c.bitOk) for (i = 0; i < 3; i++) {
        w = ((i / 3 + (c.state === 'drill' ? T * 3 : 0)) % 1);
        ctx.beginPath(); ctx.moveTo(-4.2 * s * (1 - w), by + 3 * s + (gy + ext - by - 3 * s) * w); ctx.lineTo(4.2 * s * (1 - w) * 0.6, by + 3 * s + (gy + ext - by - 3 * s) * Math.min(1, w + 0.12)); ctx.stroke();
      }
    }

    // claws
    var giver = sim.heldBy(c), reach = giver ? passSide(c, giver) : 0, carried;   // a crab being handed something reaches for it
    for (side = -1; side <= 1; side += 2) {
      ax = side * 17 * s; ay = by - 3 * s; w = 2.9; carried = null;
      if (side === reach) { ax = side * 19 * s; ay = by - 7 * s; }
      else if (f.party) { ax = side * 8 * s + rave * 11 * s; ay = by - 15 * s - Math.abs(Math.cos(T * 6.6)) * 2 * s; }   // claws up, waving together
      else if (f.arm) { ax = f.arm[side < 0 ? 0 : 2] * s; ay = by + f.arm[side < 0 ? 1 : 3] * s; }
      else if (f.arms) {
        var A = armPose(f.arms, side, s, by, c);
        ax = A[0]; ay = A[1];
      }
      else if (role === 'haul') {
        if (c.state === 'pick' && side === c.dir) ay += Math.abs(Math.sin(c.timer * 7)) * 7 * s;
        if (c.state === 'stack' && side === 1) ay -= Math.abs(Math.sin(c.timer * 9)) * 5 * s;
      } else if (role === 'crush') {
        w = 4.6;
        if (c.state === 'crush') { hit = Math.abs(Math.sin(T * 9 + c.vph)); ax = side * (5 + 9 * hit) * s; ay = gy - 5 * s - hit * 7 * s; }
      } else if (role === 'smelt') {
        w = 2.4;
        if (c.state === 'smelt' && side === 1) { ax = 22 * s; ay = by + 3 * s + Math.sin(T * 3) * 0.8; }
      } else if (role === 'energy') {
        w = 2; ax = side * 13 * s;
        if (c.state === 'charge' && side === 1) { ax = 15 * s; ay = by - 6 * s; }
        if (c.state === 'go' && side === c.dir) { ax = side * 15 * s; ay = by - 5 * s; carried = 'cell'; }   // a charge held out, ready to pass
      } else if (role === 'repair' || role === 'mech') {
        w = 2.4;
        if (c.state === 'fix' && side === c.dir) { ax = side * (16 + Math.sin(T * 18) * 3) * s; ay = by - 2 * s + Math.cos(T * 18) * 2 * s; }
        if (c.state === 'forge' && side === 1) { ax = 22 * s; ay = by + 3 * s + Math.sin(T * 3) * 0.8; }
        if (c.state === 'toJob' && side === c.dir && (c.carry === 'bit' || c.carry === 'leg')) { ax = side * 16 * s; ay = by - 5 * s; carried = c.carry; }   // the part, held out like a baton
      } else if (role === 'scout') {
        w = 2.2; ax = side * 14 * s;
        if (c.state === 'scan' && side === 1) { ax = 12 * s; ay = by - 12 * s; }
      } else { w = 2.3; ax = side * 14 * s; }
      ctx.strokeStyle = dark; ctx.lineWidth = (role === 'crush' ? 2.6 : 2) * s;
      ctx.beginPath(); ctx.moveTo(side * 8 * s, by - 1 * s); ctx.lineTo((side * 8 * s + ax) / 2 + side * 1.5 * s, Math.min(by - 6.5 * s, ay - 2 * s)); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = role === 'smelt' ? pal.lava : body;
      ctx.beginPath(); ctx.arc(ax, ay, w * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1 * s;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + side * w * s, ay + 1.2 * s); ctx.stroke();
      if (carried) drawPart(carried, ax + side * 4 * s, ay - 1 * s, s, 0);
      if (role === 'smelt' && c.carry && side === (c.state === 'smelt' ? 1 : c.dir)) {
        if (c.carry === 'bar') drawBar(ax + side * 5 * s, ay + 1 * s, s, c.state === 'smelt' ? c.heat : 0);
        else drawIngot(ax + side * 5 * s, ay, s);
      }
      if ((role === 'repair' || role === 'mech') && c.state === 'forge' && side === 1) drawPart(c.carry, ax + 5 * s, ay, s, c.heat);
      if (role === 'repair' && side === c.dir) {             // a wrench
        ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.3 * s;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + side * 6 * s, ay - 4 * s); ctx.stroke();
        ctx.beginPath(); ctx.arc(ax + side * 6.8 * s, ay - 4.6 * s, 1.4 * s, 0, TAU); ctx.stroke();
      }
    }
    if (role === 'crush' && c.state === 'crush') drawNod(0, gy - 3 * s, 3.4 * s * (1 - 0.4 * (1 - c.timer / K.T_CRUSH)), 1, T * 2);

    // gear on the back
    if (role === 'haul') {
      roundRect(-6.5 * s, by - 14 * s, 13 * s, 8 * s, 2 * s); ctx.fillStyle = pal.metal; ctx.fill(); ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = pal.nodule;
      for (i = 0; i < c.load; i++) { ctx.beginPath(); ctx.arc((-3.6 + i * 3.6) * s, by - 10.4 * s, 1.35 * s, 0, TAU); ctx.fill(); }
    } else if (role === 'drill') {
      roundRect(-5 * s, by - 13 * s, 10 * s, 7 * s, 1.5 * s); ctx.fillStyle = dark; ctx.fill();
      ctx.fillStyle = c.bitOk ? pal.metal : pal.warn; ctx.fillRect(-3 * s, by - 11.5 * s, 6 * s, 1.6 * s);
    } else if (role === 'crush') {
      roundRect(-7 * s, by - 12.5 * s, 14 * s, 6.5 * s, 1.5 * s); ctx.fillStyle = dark; ctx.fill();
      ctx.fillStyle = pal.metal; ctx.fillRect(-5 * s, by - 14.5 * s, 3 * s, 3 * s); ctx.fillRect(2 * s, by - 14.5 * s, 3 * s, 3 * s);
    } else if (role === 'smelt') {
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, by - 5 * s, 8 * s, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = pal.lava; ctx.globalAlpha = 0.5 + 0.5 * (c.state === 'smelt' ? 1 : 0.3); ctx.fillRect(-4 * s, by - 10.5 * s, 8 * s, 1.6 * s); ctx.globalAlpha = 1;
    } else if (role === 'scout') {                           // a dish that sweeps while scanning
      var sweep = c.state === 'scan' ? Math.sin(T * 5) * 0.8 : 0.2;
      ctx.strokeStyle = dark; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.moveTo(-2 * s, by - 6 * s); ctx.lineTo(-2 * s, by - 12 * s); ctx.stroke();
      ctx.save(); ctx.translate(-2 * s, by - 13 * s); ctx.rotate(sweep);
      ctx.fillStyle = pal.metal; ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * s, 2.4 * s, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
      if (c.state === 'scan') {
        ctx.strokeStyle = pal.scout; ctx.lineWidth = 1.2;
        for (i = 0; i < 3; i++) { var rr3 = ((T * 1.2 + i / 3) % 1); ctx.globalAlpha = 1 - rr3; ctx.beginPath(); ctx.ellipse(0, gy, (6 + rr3 * 30) * s, (6 + rr3 * 30) * s * 0.3, 0, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    } else if (role === 'repair' || role === 'mech') {          // whatever it is taking to the lava, or to a crab
      if (c.carry && c.state !== 'forge') drawPart(c.carry, 0, by - 9 * s, s * 0.9, 0);
      if (role === 'mech' && c.state === 'fix') spark(px + c.dir * 16 * s, by, 1, pal.lavaHot);
    } else {
      roundRect(-7 * s, by - 15 * s, 14 * s, 9 * s, 2 * s); ctx.fillStyle = dark; ctx.fill();
      var nc = sim.charges(), cw = 11.6 / nc;
      for (i = 0; i < nc; i++) { ctx.fillStyle = i < c.charges ? pal.light : pal.metalDark; ctx.fillRect((-5.6 + i * cw) * s, by - 13 * s, cw * 0.7 * s, 5 * s); }
      ctx.fillStyle = pal.metal; ctx.fillRect(-1.5 * s, by - 16.6 * s, 3 * s, 1.8 * s);
      if (c.state === 'refill') { ctx.strokeStyle = pal.lavaHot; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(7 * s, by - 10 * s); ctx.lineTo(16 * s, by - 6 * s + Math.sin(T * 9) * 1.5); ctx.stroke(); }
    }
    if (c.bload > 0 && role !== 'haul') {                   // nodules picked up on the backup job, balanced on the shell
      for (i = 0; i < c.bload; i++) drawNod((-3.5 + i * 3.5) * s, by - 9.5 * s - (i % 2) * 2 * s, 1.8 * s, 1, i);
    }
    // antenna lamp
    if (role !== 'energy' && role !== 'repair' && role !== 'mech') {
      ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(6 * s, by - 5 * s); ctx.lineTo(8.5 * s, by - 17 * s); ctx.stroke();
      ctx.fillStyle = low ? pal.warn : pal.light; ctx.globalAlpha = Math.sin(T * (low ? 12 : 4) + c.vph) > 0 ? 1 : 0.25;
      ctx.beginPath(); ctx.arc(8.5 * s, by - 17.5 * s, 1.5 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }

    // shell
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, by, 11 * s, 6.6 * s, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.ellipse(-2 * s, by - 2.6 * s, 6 * s, 1.9 * s, -0.12, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    if (f.mouth === 'open' || f.mouth === 'grin' || (f.eye === 'happy' && !f.party)) {   // rosy cheeks when pleased
      ctx.fillStyle = pal.tongue; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.ellipse(-6 * s, by + 0.8 * s, 1.8 * s, 1 * s, 0, 0, TAU); ctx.ellipse(6 * s, by + 0.8 * s, 1.8 * s, 1 * s, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (i = 0; i < c.stars; i++) star((i - (c.stars - 1) / 2) * 4.6 * s, by + 3 * s, 1.9 * s, pal.ingot, dark);   // veteran stars
    if (role === 'repair') {                                 // hard hat
      ctx.fillStyle = pal.hat; ctx.beginPath(); ctx.ellipse(0, by - 5.2 * s, 7.5 * s, 4.8 * s, 0, Math.PI, TAU); ctx.fill();
      ctx.fillRect(-9 * s, by - 5.6 * s, 18 * s, 1.6 * s);
    } else if (role === 'mech') {                            // a welder's cap with a lamp
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, by - 5 * s, 7 * s, 4.2 * s, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = pal.lavaHot; ctx.beginPath(); ctx.arc(0, by - 8.4 * s, 1.4 * s, 0, TAU); ctx.fill();
    }

    // eyes on stalks
    for (side = -1; side <= 1; side += 2) {
      var sway = moving ? Math.sin(c.vgait * 2 + side) * 0.6 * s : Math.sin(T * 1.3 + c.vph + side) * 0.3 * s;
      var sx = side * 3.6 * s, ex = side * 4.4 * s + sway + (f.party ? Math.sin(T * 9 + side) * s : 0), ey = by - (role === 'repair' || role === 'mech' ? 13 : 11) * s;
      if (f.eye === 'wide') ey -= 1.5 * s;
      ctx.strokeStyle = dark; ctx.lineWidth = 1.1 * s;
      ctx.beginPath(); ctx.moveTo(sx, by - 4.5 * s); ctx.lineTo(ex, ey + 1.5 * s); ctx.stroke();
      drawEye(ex, ey, s, f, look, c, side);
      if (f.brows || f.eye === 'angry') {
        ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.9 * s;
        ctx.beginPath(); ctx.moveTo(ex - side * 2.6 * s, ey - 3.6 * s); ctx.lineTo(ex + side * 1.6 * s, ey - 2.4 * s); ctx.stroke();
      }
    }
    drawMouth(by + 1.4 * s, s, f, dark);
    if (f.prop === 'pebble') { var jh = Math.abs(osc(T, 1.5)); drawNod(Math.sin(T * 4.7) * 5 * s, by - 16 * s - jh * 8 * s, 2.2 * s, 1, T * 3); }
    if (f.prop === 'note') { ctx.save(); ctx.globalAlpha = 1 - ((T * 0.8 + c.vph) % 1); ctx.fillStyle = pal.ink; ctx.font = '700 ' + Math.round(9 * s) + 'px ' + cssFont; ctx.fillText('♪', 8 * s + ((T * 0.8 + c.vph) % 1) * 6 * s, by - 6 * s - ((T * 0.8 + c.vph) % 1) * 14 * s); ctx.restore(); }
    if (f.prop === 'sparkle') { ctx.fillStyle = pal.light; for (i = 0; i < 4; i++) { var sa = T * 3 + i * 1.57, sr2 = 13 * s; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 9 + i); ctx.beginPath(); ctx.arc(Math.cos(sa) * sr2, by - 8 * s + Math.sin(sa) * sr2 * 0.5, 1.4 * s, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    if (f.prop === 'bubbles' && Math.random() < 0.25) bubbles.push({ x: px + c.dir * 3 * s, y: by + 1 * s, r: rr(1, 2.6) * s, vy: rr(16, 30), ph: rr(0, TAU) });
    if (f.sweat) {
      var sy = ((T * 0.9 + c.vph) % 1);
      ctx.fillStyle = pal.sweat; ctx.globalAlpha = 1 - sy;
      ctx.beginPath(); var dx = 9 * s, dy = by - 8 * s + sy * 6 * s;
      ctx.moveTo(dx, dy - 2.4 * s); ctx.quadraticCurveTo(dx + 1.6 * s, dy, dx, dy + 1.2 * s); ctx.quadraticCurveTo(dx - 1.6 * s, dy, dx, dy - 2.4 * s); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // battery gauge on the shell
    if (role !== 'energy' && !airborne) {
      col = c.bat < K.LOW ? pal.warn : (c.bat < 0.5 ? pal.ingot : pal.energy);
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-5 * s, by + 4 * s, 10 * s, 1.6 * s);
      if (!(low && Math.sin(T * 12) < 0)) { ctx.fillStyle = col; ctx.fillRect(-5 * s, by + 4 * s, 10 * s * Math.max(0.06, c.bat), 1.6 * s); }
    }
    ctx.restore();

    // what the crab is saying, or else thinking
    if (c.say && T < c.say.until) drawBubble(px + 12 * s, by - 28 * s, c.say.text, s, clamp((c.say.until - T) / 0.3, 0, 1), true, c.say.start !== undefined ? c.say : null);
    else if (f.glyph) {
      var gl = f.glyph, gy2 = by - 26 * s;
      if (gl === 'z') gl = ['z', 'zz', 'zzz'][Math.floor(T * 1.5 + c.vph) % 3];
      if (f.sleep) gy2 = by - 18 * s;
      var fade = c.vx && T < c.vx.until ? clamp((c.vx.until - T) / 0.3, 0, 1) : 1;
      drawBubble(px + 10 * s, gy2, gl, s, fade);
    }
    // the charge arc from an energy bot to the crab it is topping up
    if (role === 'energy' && c.state === 'charge' && c.target) {
      var tx = crabX(c.target), ty = groundY(tx, c.target.d) - 10 * scaleAt(c.target.d), sxx = px + 15 * s, syy = by - 6 * s;
      ctx.strokeStyle = pal.light; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(sxx, syy);
      for (i = 1; i < 5; i++) ctx.lineTo(sxx + (tx - sxx) * i / 5 + rr(-3, 3), syy + (ty - syy) * i / 5 + rr(-3, 3));
      ctx.lineTo(tx, ty); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (selected === c && T < selectedUntil) drawInfo(c, px, by - 32 * s, s);
  }
  var ROLE_NOUN = { scout: 'scout', drill: 'driller', haul: 'hauler', crush: 'crusher', smelt: 'smelter', energy: 'energy bot', repair: 'repair bot', mech: 'maintenance bot' };
  var JOB_NOUN = { scout: 'flags', drill: 'holes', haul: 'nodules stacked', crush: 'bars', smelt: 'ingots', energy: 'charges', repair: 'repairs', mech: 'legs mended' };
  function starText(c) { return c.stars ? ' ' + '★'.repeat(c.stars) : ''; }
  function recText(c) {                // a crab's personal record, in a line
    var r = c.rec, out = [r.jobs + ' ' + JOB_NOUN[c.role]];
    if (r.helped) out.push(r.helped + ' nodule' + (r.helped === 1 ? '' : 's') + ' helped');
    if (r.pearls) out.push(r.pearls + ' pearl' + (r.pearls === 1 ? '' : 's'));
    if (r.rides) out.push(r.rides + ' vent ride' + (r.rides === 1 ? '' : 's'));
    if (r.dances) out.push(r.dances + ' dance' + (r.dances === 1 ? '' : 's'));
    if (r.legs) out.push(r.legs + ' leg' + (r.legs === 1 ? '' : 's') + ' lost');
    return out.join(' · ');
  }
  function statusText(c) {
    var t = {
      scout: { go: 'heading out to scan', scan: 'scanning for metal', rest: 'resting: plenty of flags already' },
      drill: { go: c.flag ? 'walking to a flag' : 'no flags, so drilling blind', drill: 'drilling', rest: 'resting: the sand is littered' },
      haul: { seek: c.target ? 'fetching a nodule' : 'looking for nodules', pick: 'picking up a nodule', haul: 'carrying nodules to the ore pile', stack: S.ore >= sim.oreCap() ? 'waiting: the ore pile is full' : 'stacking the ore pile' },
      crush: { home: 'walking to the press', wait: 'waiting for two nodules', crush: 'crushing nodules into a bar', hold: 'waiting: the bar stack is full' },
      smelt: { toBar: 'walking to the bar stack', grab: S.bars ? 'grabbing a bar' : 'waiting for bars', toLava: 'carrying a bar to the lava', smelt: 'smelting in the lava', toStock: 'carrying an ingot to the stockpile', drop: 'stacking an ingot' },
      energy: { idle: 'standing by', go: 'running to recharge a crab', charge: 'recharging a crab', toEngine: 'heading to the Stirling engine', queue: 'queuing at the engine', refill: S.heat < 1 ? 'waiting: the engine is out of charge' : 'charging up at the engine' },
      repair: { idle: 'waiting in the workshop', toMat: 'fetching an ingot for a new bit', fetch: S.stock ? 'taking an ingot' : 'waiting: no metal on the stockpile', toForge: 'taking the ingot to the lava forge', forge: 'forging a new part in the lava', toJob: 'taking the new part to a crab', fix: 'fitting the new part' },
      mech: { idle: 'waiting in the workshop', toMat: 'fetching a bar for a new leg', fetch: S.bars ? 'taking a bar' : 'waiting: no bars on the stack', toForge: 'taking the bar to the lava forge', forge: 'forging a new leg in the lava', toJob: 'taking the new leg to a crab', fix: 'fitting the new leg' }
    }[c.role][c.state] || 'starting up';
    if (c.state === 'sleep') t = 'asleep: off shift';
    if (c.state && c.state.charAt(0) === 'b' && { bseek: 1, bpick: 1, bhaul: 1, bstack: 1 }[c.state]) t = 'helping out: ' + { bseek: 'fetching nodules', bpick: 'picking up a nodule', bhaul: 'carrying nodules to the ore pile', bstack: 'stacking the ore pile' }[c.state] + (c.role === 'drill' && !c.bitOk ? ' while its bit waits for repair' : '');
    if (S.si && S.si.night && c.role !== 'scout' && S.t - c.lastRest > K.REST_WINDOW * K.DAY / 24 && c.state !== 'sleep') t += ' (tired: half speed at night)';
    if (c.air) t = c.air.phase === 'walk' ? 'heading for the thermal vent' : (c.air.phase === 'rise' ? 'floating up the thermal vent' : 'swimming down the current');
    if (sim.isHeld(c)) t = 'being repaired';
    if (c.limp) t += ' (lost a leg)';
    if (c.role === 'drill' && !c.bitOk) t += ' (bit broken)';
    if (c.role === 'energy' && c.broken) t += ' (worn out)';
    if (c.role !== 'energy' && c.bat < K.LOW) t += ' (battery low)';
    return t;
  }
  function drawInfo(c, x, y, s) {
    var line1 = c.name + ', ' + NAMES[c.role].toLowerCase() + starText(c), line2 = statusText(c), line3 = recText(c), w;
    ctx.save();
    ctx.font = '700 12px ' + cssFont; w = ctx.measureText(line1).width;
    ctx.font = '11px ' + cssFont; w = Math.max(w, ctx.measureText(line2).width, ctx.measureText(line3).width) + 16;
    x = clamp(x, w / 2 + 4, W - w / 2 - 4); y = Math.max(y, 54);
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = pal.paper; roundRect(x - w / 2, y - 47, w, 45, 4); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 12px ' + cssFont; ctx.fillText(line1, x, y - 33);
    ctx.font = '11px ' + cssFont; ctx.fillText(line2, x, y - 20);
    ctx.globalAlpha = 0.75; ctx.fillText(line3, x, y - 7); ctx.globalAlpha = 1;
    ctx.restore();
  }

  function draw() {
    if (!W || !H || !S) return;
    var i, k, list, o, px, layers = [[], [], []];
    ctx.clearRect(0, 0, W, H);
    drawSurface(); drawSea(Math.min(0.05, T - (draw.lastT || T))); draw.lastT = T; drawCargo(); drawWhale(); drawSnow();
    // the far dune, a faint sheet behind everything
    sheet(3, farPath, pal.sandFar, farY, function (x) { return crestY(0, x); }, 0.75);
    drawWeeds(-1);
    // sort everything on the sand into its dune
    for (i = 0; i < S.nodules.length; i++) { o = S.nodules[i]; px = X(o.x); layers[layerOf(o.d)].push({ y: groundY(px, o.d), kind: 0, o: o }); }
    for (i = 0; i < S.flags.length; i++) { o = S.flags[i]; px = X(o.x); layers[layerOf(o.d)].push({ y: groundY(px, o.d) - 0.01, kind: 1, o: o }); }
    var air = [];
    for (i = 0; i < S.crabs.length; i++) { o = S.crabs[i]; px = crabX(o); if (o.alt > 0 || o.turtle) { air.push(o); continue; } layers[o.vfall > 0 ? 2 : crabLayer(o)].push({ y: groundY(px, o.d) + 0.01, kind: 2, o: o }); }
    for (i = 0; i < debris.length; i++) { o = debris[i]; px = X(o.x); layers[layerOf(o.d)].push({ y: groundY(px, o.d) - 0.02, kind: 3, f: drawDebris.bind(null, o) }); }
    layers[2].push({ y: basePos().y, kind: 3, f: drawBase });
    layers[2].push({ y: postPos().y, kind: 3, f: drawPost });
    if (S.trader) layers[2].push({ y: traderPos().y, kind: 3, f: drawTrader });
    layers[2].push({ y: groundY(X(S.pos.ORE), 0.8), kind: 3, f: drawOrePile });
    layers[2].push({ y: groundY(X(S.pos.BAR), 0.78), kind: 3, f: drawBarStack });
    layers[2].push({ y: groundY(X(S.pos.STOCK), 0.84), kind: 3, f: drawStockpile });
    layers[2].push({ y: groundY(X(S.pos.COLLECTOR), 0.7), kind: 3, f: drawCollector });
    layers[2].push({ y: groundY(X(K.STIRLING), 0.72), kind: 3, f: drawEngine });
    layers[2].push({ y: groundY(X(S.pos.WORKSHOP), 0.95), kind: 3, f: drawWorkshop });
    layers[2].push({ y: groundY(X(S.pos.DEN), 0.82), kind: 3, f: drawDen });
    for (k = 0; k < 3; k++) {
      sheet(k, dunePaths[k], pal[SAND[k]], function (x) { return crestY(k, x); }, k < 2 ? function (x) { return crestY(k + 1, x); } : null, 1);
      drawRipples(k);
      if (k === 0) { drawWeeds(0); drawRidge(); }
      if (k === 2) { drawCavern(); drawVent(); drawRiser(); drawLifts(); drawPlots(); drawCord(); }
      if (k > 0) drawLocked(k);
      list = layers[k];
      list.sort(function (a, b) { return a.y - b.y; });
      for (i = 0; i < list.length; i++) {
        o = list[i];
        if (o.kind === 0) drawGroundNodule(o.o);
        else if (o.kind === 1) drawFlag(o.o);
        else if (o.kind === 2) drawCrab(o.o);
        else o.f();
      }
      if (k === 2) { drawWires(); drawOcto(); }
    }
    drawPasses(); drawTideCurrents(); drawWhaleShadow(); drawInk();
    drawRings(); drawFlights();
    drawTurtle();
    for (i = 0; i < air.length; i++) drawCrab(air[i]);        // crabs riding the vent or the turtle are above everything
    drawNight(); drawPlankton(); drawStorm(); drawGlow(); drawBombs(); drawBubbles(); drawParticles(); drawFloaters();
  }

  // ===== the controls =====
  var ROLE_INFO = {
    scout: 'scans the dunes and flags deposits',
    drill: 'digs up flagged deposits',
    haul: 'carries nodules to the ore pile',
    crush: 'presses two nodules into a bar',
    smelt: 'melts bars into ingots in the lava',
    energy: 'recharges crabs, then plugs in at its base by the lava',
    repair: 'forges new bits from ingots in the lava and fits them',
    mech: 'forges new legs from bars in the lava and fits them'
  };
  var SHIFT_INFO = {
    all: { name: 'All hands', short: 'All hands', note: 'Everyone works around the clock. Fastest at first, but crabs that never rest wear out, and at night they work at half speed.' },
    day8: { name: '8-hour day', short: '8-hour day', note: 'Everyone works 08:00 to 16:00 and rests the other sixteen hours. Fresh crabs, little wear, but only a third of the day is worked.' },
    double8: { name: 'Two 8-hour shifts', short: 'Two 8s', note: 'Two 8-hour shifts a day with a 3-hour rest between: 05:00 to 13:00 and 16:00 to 24:00.' },
    custom: { name: 'Custom workday', short: 'Custom', note: 'Set the start hour, the length of a shift, how many a day, the rest between them, and how many groups take turns.' },
    ab: { name: 'A and B shifts', short: 'A/B', note: 'Everyone works the day. At night half of each crew sleeps, a different half each night, and the repair crews work faster.' },
    relief: { name: 'Three-shift relief', short: '3-shift', note: 'The day is cut into three 8-hour shifts. Two groups in three work while the third sleeps, so nobody wears out.' }
  };
  var UP_INFO = {
    den: { name: 'Crab den', fx: function (v) { return 'Room for ' + v + ' crabs'; } },
    field: { name: 'Dune claims', fx: function (v) { return ['The front dune only', 'Front and middle dunes: richer, bigger deposits', 'All three dunes: the richest deposits'][v - 1]; } },
    bits: { name: 'Hardened bits', fx: function (v) { return 'Bits break on ' + (v * 100).toFixed(1).replace('.0', '') + '% of holes'; } },
    scanner: { name: 'Sharper scanner', fx: function (v) { return 'Scans find metal ' + Math.round(v[0] * 100) + '% of the time' + (v[1] ? ', +' + v[1].toFixed(2) + ' richness' : ''); } },
    engine: { name: 'Stirling engine', fx: function (v) { return v + ' charges a minute from the lava'; } },
    riser: { name: 'Riser pump', fx: function (v) { return 'Sends an ingot up every ' + v + ' s (up to ' + Math.round(60 / v) + ' a minute)'; } },
    yard: { name: 'Bigger yard', fx: function (v) { return 'Ore pile holds ' + K.ORE_CAP[v] + ', bar stack ' + K.BAR_CAP[v]; } }
  };
  var STAGE_NAME = { scout: 'Scouting', drill: 'Drilling', haul: 'Hauling', crush: 'Crushing', smelt: 'Smelting', sell: 'Selling' };
  var ui = {
    aOcto: $('a-octo'), aTrader: $('a-trader'), aTraderLabel: $('a-trader-label'), roster: $('roster'), rosterBox: $('roster-box'), rosterCount: $('roster-count'), layoutList: $('layout-list'),
    credits: $('h-credits'), rate: $('h-rate'), rank: $('h-rank'), rankBar: $('h-rank-bar'), rankNext: $('h-rank-next'),
    price: $('h-price'), trend: $('h-trend'), stock: $('h-stock'), reserve: $('h-reserve'), rMinus: $('r-minus'), rPlus: $('r-plus'),
    speeds: document.querySelectorAll('[data-speed]'), advice: $('advice'), used: $('crew-used'), hint: $('crew-hint'),
    roles: $('roles'), cards: $('cards'), ledger: $('ledger'), toasts: $('toasts'),
    intro: $('intro'), start: $('start'), newgame: $('newgame'), win: $('win'), winText: $('win-text'),
    shift: $('h-shift'), shiftLeft: $('h-shift-left'), flow: $('h-flow'), flowNote: $('h-flow-note'), oc: $('oc-btn'), ocLabel: $('oc-label'), ocBar: $('oc-bar'),
    order: $('h-order'), orderN: $('h-order-n'), orderT: $('h-order-t'), orderBar: $('h-order-bar'), rival: $('h-rival'), rivalBar: $('h-rival-bar'),
    bigBtn: $('big-btn'), shiftNote: $('shift-note'), gaps: $('shift-gaps'), panRange: $('pan-range'), tech: $('techs'), arrangeBtn: $('arrange-btn'), arrangeNote: $('arrange-note'), postBtn: $('post-btn'), decor: $('decor-note'), traderCard: $('trader-card'), traderOffers: $('trader-offers'), traderTime: $('trader-time'), spares: $('spares-note')
  };
  var TRADE_INFO = {
    bits: ['Spare drill bits ×2', 'Repair bots fit them straight away, no trip to the forge.'],
    legs: ['Spare legs ×2', 'Maintenance bots fit them straight away.'],
    map: ['Treasure map', 'Three rich flags appear on your dunes.'],
    cells: ['Crate of cells', 'Fills the Stirling engine\'s store and every energy bot.'],
    gear: ['Gold gear', 'The whole crew gets the morning bonus now.'],
    lucky: ['Lucky shell', 'The next strike on a rich flag finds a pearl.']
  };
  function priceText(pay) { return pay.bars ? pay.bars + ' bar' + (pay.bars > 1 ? 's' : '') : pay.ingots + ' ingot' + (pay.ingots > 1 ? 's' : ''); }
  var TECH_INFO = {
    sonar: { name: 'Sonar lab', note: 'Unlocks scout upgrades.' },
    metallurgy: { name: 'Metallurgy', note: 'Unlocks drill and smelter upgrades.' },
    hydraulics: { name: 'Hydraulics', note: 'Unlocks hauler and crusher upgrades.' },
    power: { name: 'Power electronics', note: 'Unlocks energy bot upgrades.' },
    engineering: { name: 'Field engineering', note: 'Unlocks repair and maintenance bot upgrades.' }
  };
  var WUP_INFO = {
    nightEyes: ['Night eyes', 'At night, scans take 30% less time.'],
    nightBattery: ['Night battery', 'Scouts use no power at night: they can scan till dawn.'],
    flagBundle: ['Flag bundle', 'Up to 14 flags can stand at once, not 8, so a night of scouting leaves a field of flags by morning.'],
    moonFlags: ['Moon flags', 'At night, scans find a deposit 20 points more often.'],
    wideSonar: ['Wide sonar', 'Scans take a third less time.'],
    deepSonar: ['Deep sonar', 'Scouts find richer deposits: +0.08 richness and one more nodule a flag.'],
    diamondTips: ['Diamond tips', 'Holes take a quarter less time, and bits break 40% less often.'],
    twinAugers: ['Twin augers', 'A strike turns up a second nodule 45% of the time instead of 20%.'],
    bigHopper: ['Big hopper', 'Haulers carry five nodules instead of three.'],
    springLegs: ['Spring legs', 'Haulers walk 30% faster.'],
    hydraulicClaws: ['Hydraulic claws', 'Crushing takes a third less time.'],
    shockPads: ['Shock pads', 'Crushers wear out half as fast.'],
    heatTongs: ['Heat-proof tongs', 'Bars melt 40% faster.'],
    twinTongs: ['Twin tongs', 'Smelters carry two bars a trip.'],
    bigCells: ['Big cells', 'Energy bots hold six charges instead of four.'],
    fastPlug: ['Fast plug', 'Charging a crab takes half as long, and plugging in at the base is quicker.'],
    pocketForge: ['Pocket forge', 'Repair bots forge bits on the spot instead of walking to the lava.'],
    quickHands: ['Quick hands', 'Repair bots fit parts 40% faster.'],
    mechForge: ['Pocket forge', 'Maintenance bots forge legs on the spot.'],
    toughJoints: ['Tough joints', 'Every crab loses legs half as often.']
  };
  function clock(h) { var hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15; return ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2); }
  function money(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  // ----- every action within reach of the panel and the keyboard, not only of a click on the field -----
  function flashCard(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); el.scrollIntoView({ block: 'nearest' }); }
  function shoo() { if (sim.shoo()) { sim.drain().forEach(handle); renderHUD(); } }
  function openShop() { if (!S.trader) return; selectTab('t-build'); flashCard(ui.traderCard); }
  function showCrab(c) {                 // scroll the field to a crab and open its card
    selected = c; selectedUntil = T + 8;
    stage.scrollTo({ left: crabX(c) * Z - stage.clientWidth / 2, behavior: mqReduce.matches ? 'auto' : 'smooth' });
  }
  function renderAlerts() {
    var tr = S.trader;
    ui.aOcto.hidden = !S.octo || S.octo.state === 'flee';
    ui.aTrader.hidden = !tr || tr.state === 'leave';
    if (tr) ui.aTraderLabel.textContent = tr.state === 'stay' ? 'Trader open ' + fmtTime(tr.until - S.t) : 'Trader coming';
  }
  var rosterIds = '';
  function renderRoster() {              // rows are rebuilt only when the crew changes, so focus and clicks survive
    ui.rosterCount.textContent = '(' + S.crabs.length + ')';
    if (!ui.rosterBox.open) { rosterIds = ''; return; }
    var crew = S.crabs.slice().sort(function (a, b) { return K.ROLES.indexOf(a.role) - K.ROLES.indexOf(b.role) || a.id - b.id; }),
      ids = crew.map(function (c) { return c.id; }).join(), rows, i, c, li;
    if (ids !== rosterIds) {
      rosterIds = ids;
      ui.roster.innerHTML = crew.map(function (c) {
        return '<li data-id="' + c.id + '"><span class="dot" style="background:var(--c-' + (c.role === 'haul' ? 'crab' : c.role) + ')"></span>' +
          '<span class="who"><b></b><span class="stars"></span> <span class="kind"></span></span>' +
          '<button type="button" class="mini wide" data-show="' + c.id + '">Show</button><span class="what"></span></li>';
      }).join('');
    }
    rows = ui.roster.children;
    for (i = 0; i < crew.length; i++) {
      c = crew[i]; li = rows[i];
      li.querySelector('b').textContent = c.name;
      li.querySelector('.stars').textContent = c.stars ? new Array(c.stars + 1).join('★') : '';
      li.querySelector('.kind').textContent = NAMES[c.role].toLowerCase();
      li.querySelector('.what').textContent = statusText(c) + ' · ' + c.rec.jobs + ' job' + (c.rec.jobs === 1 ? '' : 's');
      li.querySelector('button').setAttribute('aria-label', 'Show ' + c.name + ' on the field');
    }
  }
  var layoutSig = '';
  function renderLayout() {              // the plots in order from the field to the lava, each building with buttons to move it
    var sig = JSON.stringify(S.layout), i, k, at = {}, html = '', lo = Math.max(K.FIELD0 + 30, K.STIRLING - K.CORD), hi = K.STIRLING - 40, b;
    if (sig !== layoutSig) {
      layoutSig = sig;
      for (k in S.layout) at[S.layout[k]] = k;
      for (i = 0; i < K.PLOTS.length; i++) {
        b = at[i];
        html += '<div class="plot"><span class="n">' + (i + 1) + '</span><span>' + (b ? BLD_NAMES[b] : '<span class="note">empty plot</span>') + '</span>' +
          (b ? '<button type="button" class="mini" data-move="' + b + '" data-to="' + (i - 1) + '"' + (i ? '' : ' disabled') + ' aria-label="Move the ' + BLD_NAMES[b].toLowerCase() + ' toward the field">◀</button>' +
            '<button type="button" class="mini" data-move="' + b + '" data-to="' + (i + 1) + '"' + (i < K.PLOTS.length - 1 ? '' : ' disabled') + ' aria-label="Move the ' + BLD_NAMES[b].toLowerCase() + ' toward the lava">▶</button>' : '<span></span><span></span>') + '</div>';
      }
      html += '<div class="plot"><span class="n">⚡</span><span>Refuel post</span><button type="button" class="mini" data-post="-1" aria-label="Move the refuel post toward the field">◀</button>' +
        '<button type="button" class="mini" data-post="1" aria-label="Move the refuel post toward the lava">▶</button></div>';
      ui.layoutList.innerHTML = html;
    }
    b = ui.layoutList.querySelectorAll('[data-post]');
    b[0].disabled = S.post.x <= lo + 1; b[1].disabled = S.post.x >= hi - 1;
  }
  function fmtTime(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
  function toast(title, body) {
    var d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = '<b></b><span></span>';
    d.firstChild.textContent = title; d.lastChild.textContent = body || '';
    ui.toasts.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 4700);
    while (ui.toasts.children.length > 3) ui.toasts.removeChild(ui.toasts.firstChild);
  }

  function buildRoles() {
    var html = '';
    K.ROLES.forEach(function (r) {
      html += '<div class="role" data-role="' + r + '"><span class="dot" style="background:var(--c-' + (r === 'haul' ? 'crab' : r) + ')"></span>' +
        '<span class="role-name"><b><em class="long">' + NAMES[r] + 's</em><em class="short">' + SHORT[r] + '</em></b><span>' + ROLE_INFO[r] + '</span></span>' +
        '<span class="role-ctl"><button type="button" class="mini" data-act="retire" aria-label="Retire one ' + NAMES[r].toLowerCase() + '">−</button>' +
        '<output aria-label="' + NAMES[r] + 's">0</output>' +
        '<button type="button" class="hire" data-act="hire" aria-label="Hire one ' + NAMES[r].toLowerCase() + '">+ $0</button></span></div>';
    });
    ui.roles.innerHTML = html;
    html = '';
    Object.keys(K.TECH).forEach(function (id) {   // each technology, then the worker upgrades it unlocks
      html += '<div class="card tech" data-tech="' + id + '"><div class="card-top"><h3>' + TECH_INFO[id].name + '</h3><button type="button" class="hire" data-act="research">$' + K.TECH[id].cost + '</button></div><p class="now">' + TECH_INFO[id].note + '</p></div>';
      K.TECH[id].roles.forEach(function (role) {
        Object.keys(K.WUP).forEach(function (w) {
          if (K.WUP[w].role !== role) return;
          html += '<div class="card wup" data-wup="' + w + '"><div class="card-top"><h3><span class="dot" style="background:var(--c-' + (role === 'haul' ? 'crab' : role) + ')"></span> ' + WUP_INFO[w][0] + '</h3><button type="button" class="hire" data-act="wup">$' + K.WUP[w].cost + '</button></div><p class="now">' + NAMES[role] + 's: ' + WUP_INFO[w][1] + '</p></div>';
        });
      });
    });
    ui.tech.innerHTML = html;
    html = '';
    Object.keys(K.UP).forEach(function (id) {
      html += '<div class="card" data-up="' + id + '"><div class="card-top"><h3>' + UP_INFO[id].name + '<span class="pips"></span></h3>' +
        '<button type="button" class="hire" data-act="buy">$0</button></div><p class="now"></p><p class="next"></p></div>';
    });
    ui.cards.innerHTML = html;
  }
  function renderPanel() {
    var n = sim.counts(), cap = sim.crewCap(), full = S.crabs.length >= cap, rows = document.querySelectorAll('.role'), i, r, row, cost, hire, cards = ui.cards.children, id, u, lvl, max, pips, v;
    renderLayout();
    ui.used.textContent = S.crabs.length + ' of ' + cap;
    Array.prototype.forEach.call(document.querySelectorAll('[data-shift]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-shift') === S.shift)); });
    ui.shiftNote.textContent = SHIFT_INFO[S.shift].note;
    renderWorkday();
    var g = sim.gaps();
    ui.gaps.hidden = !g.length;
    if (g.length) ui.gaps.textContent = 'Not covered: ' + g.slice(0, 4).map(function (x) { return NAMES[x.role].toLowerCase() + 's in ' + x.shift; }).join(', ') + (g.length > 4 ? ', and more' : '') + '. Hire another so every shift has one.';
    ui.hint.textContent = full ? (sim.upgradeCost('den') !== null ? 'Den full: build a bigger den' : 'Den full') : '';
    for (i = 0; i < rows.length; i++) {
      row = rows[i]; r = row.getAttribute('data-role'); cost = sim.hireCost(r);
      row.querySelector('output').textContent = n[r];
      hire = row.querySelector('[data-act="hire"]');
      hire.textContent = '+ ' + money(cost);
      hire.disabled = full || S.credits < cost;
      hire.title = full ? 'The den is full' : (S.credits < cost ? 'Not enough credits' : 'Hire for ' + money(cost));
      var ret = row.querySelector('[data-act="retire"]');
      ret.disabled = n[r] <= 0;
      ret.title = n[r] ? 'Retire one for a refund of ' + money(sim.refund(r)) : '';
    }
    Array.prototype.forEach.call(ui.tech.querySelectorAll('[data-tech]'), function (card) {
      var t = card.getAttribute('data-tech'), b = card.querySelector('button'), done = !!S.tech[t];
      b.textContent = done ? 'Researched' : money(K.TECH[t].cost); b.disabled = done || S.credits < K.TECH[t].cost;
      card.classList.toggle('done', done);
    });
    Array.prototype.forEach.call(ui.tech.querySelectorAll('[data-wup]'), function (card) {
      var w = card.getAttribute('data-wup'), b = card.querySelector('button'), done = sim.has(w), open = sim.unlocked(K.WUP[w].role);
      b.textContent = done ? 'Fitted' : (open ? money(K.WUP[w].cost) : 'Locked'); b.disabled = done || !open || S.credits < K.WUP[w].cost;
      card.classList.toggle('done', done); card.classList.toggle('locked', !open);
    });
    ui.arrangeBtn.setAttribute('aria-pressed', String(arrange));
    ui.arrangeNote.textContent = arrange ? (pick === 'post' ? 'Now tap the front dune where the refuel post should go.' : pick ? 'Now tap the plot to move the ' + BLD_NAMES[pick].toLowerCase() + ' to.' : 'Tap a building, or the refuel post, to pick it up.') : 'The line\'s buildings stand on plots along the front dune. Shorter walks between them mean more metal.';
    ui.decor.innerHTML = '<b>Den decorations: ' + S.decor.length + ' of ' + sim.decorMax() + '</b>' + (S.decor.length ? ' · ' + S.decor.map(function (d) { return DECOR_NAMES[d.kind]; }).join(', ') : '') +
      '<br>Morning bonus ' + Math.round((K.MORNING_BONUS - 1 + S.decor.length * K.DECOR_MORNING) * 100) + '% for ' + (K.MORNING_TIME + S.decor.length * K.DECOR_MORNING_TIME) + ' s; dancing recharges ' + Math.round(S.decor.length * K.DECOR_DANCE * 100) + '% faster. Idle crabs make more, up to the den\'s room.';
    var tr = S.trader, open = tr && tr.state === 'stay';
    ui.traderCard.hidden = !tr;
    if (tr) {
      ui.traderTime.textContent = open ? 'open ' + fmtTime(tr.until - S.t) : (tr.state === 'come' ? 'on the way' : 'leaving');
      ui.traderOffers.innerHTML = tr.offers.map(function (id) {
        var T = K.TRADES[id], short = (T.pay.bars || 0) > S.bars || (T.pay.ingots || 0) > S.stock, sold = tr.sold[id];
        return '<div class="offer"><span><b>' + TRADE_INFO[id][0] + '</b><br>' + TRADE_INFO[id][1] + '</span><button type="button" class="hire" data-trade="' + id + '"' + (!open || sold || short ? ' disabled' : '') + '>' + (sold ? 'Swapped' : 'Swap ' + priceText(T.pay)) + '</button></div>';
      }).join('');
    }
    ui.spares.textContent = (S.spares.bit || S.spares.leg || S.luckyPearls) ? 'In stock from the trader: ' + S.spares.bit + ' spare bit' + (S.spares.bit === 1 ? '' : 's') + ', ' + S.spares.leg + ' spare leg' + (S.spares.leg === 1 ? '' : 's') + (S.luckyPearls ? ', a lucky shell' : '') + '.' : '';
    ui.postBtn.textContent = S.post.auto ? 'Bots move it' : 'Pinned';
    ui.postBtn.setAttribute('aria-pressed', String(S.post.auto));
    for (i = 0; i < cards.length; i++) {
      id = cards[i].getAttribute('data-up'); u = K.UP[id]; lvl = S.lv[id]; max = u.costs.length; cost = sim.upgradeCost(id);
      pips = ''; for (v = 0; v < max; v++) pips += '<i class="' + (v < lvl ? 'on' : '') + '"></i>';
      cards[i].querySelector('.pips').innerHTML = pips;
      cards[i].querySelector('.now').textContent = 'Now: ' + UP_INFO[id].fx(u.vals[lvl]);
      cards[i].querySelector('.next').textContent = cost === null ? 'Fully upgraded.' : 'Next: ' + UP_INFO[id].fx(u.vals[lvl + 1]);
      var b = cards[i].querySelector('button');
      b.textContent = cost === null ? 'Done' : money(cost);
      b.disabled = cost === null || S.credits < cost;
    }
  }
  // ----- the workday editor and its 24-hour timeline -----
  function renderWorkday() {
    var P = sim.pattern(), custom = S.shift === 'custom', w = S.work, html = '', rows = [], g, h, i, hr, on, cells, now = Math.floor(S.si ? S.si.hour : 6);
    $('work-custom').hidden = !custom;
    $('scouts-night-row').hidden = !P;
    $('scouts-night').checked = S.scoutsNight;
    if (custom) { $('w-start').textContent = ('0' + w.start).slice(-2) + ':00'; $('w-len').textContent = w.len + ' h'; $('w-count').textContent = String(w.count); $('w-rest').textContent = w.rest + ' h'; $('w-groups').textContent = String(w.groups); }
    var groups = S.shift === 'relief' ? 3 : S.shift === 'ab' ? 2 : P ? P.groups : 1;
    for (g = 0; g < groups; g++) rows.push({ name: groups === 1 ? 'Everyone' : 'Group ' + 'ABC'.charAt(g), role: 'drill', k: g });
    if (P && S.scoutsNight) rows.push({ name: 'Scouts', role: 'scout', k: 0 });
    if (S.shift === 'ab') rows.push({ name: 'Repair crews', role: 'repair', k: 0 });
    html += '<div class="tl-hours"><span></span>';
    for (i = 0; i < 24; i += 6) html += '<span style="grid-column:span 6">' + ('0' + (6 + i) % 24).slice(-2) + ':00</span>';
    html += '</div>';
    rows.forEach(function (row) {
      cells = '';
      for (i = 0; i < 24; i++) {
        hr = (6 + i) % 24; on = sim.dutyFor(row.role, row.k, hr + 0.5, 1);
        cells += '<i class="' + (on ? 'on' : '') + (hr >= K.NIGHT_FROM || hr < K.NIGHT_TO ? ' night' : '') + (hr === now ? ' now' : '') + '" title="' + ('0' + hr).slice(-2) + ':00 ' + (on ? 'on duty' : 'resting') + '"></i>';
      }
      html += '<div class="tl-row"><span>' + row.name + '</span>' + cells + '</div>';
    });
    if (S.shift === 'ab') html += '<p class="note">At night half of each role sleeps, a different half each night.</p>';
    $('timeline').innerHTML = html;
  }
  function advice() {
    var b = sim.bottleneck(), c = sim.capacity(), broken = 0, waitMetal = false, i, cr, msg;
    for (i = 0; i < S.crabs.length; i++) {
      cr = S.crabs[i];
      if ((cr.role === 'drill' && !cr.bitOk) || (cr.role === 'energy' && cr.broken)) broken++;
      if (cr.role === 'repair' && cr.state === 'fetch' && cr.carry !== 'ingot') waitMetal = true;
    }
    if (S.octo && S.octo.state !== 'flee') return 'Advisor: <b>An octopus is after your ' + (S.ore > 0 ? 'ore pile' : 'nodules') + '!</b> Click it or press Shoo to chase it away.';
    if (S.order && !S.storm) {
      var left = S.order.need - S.order.got, rv = S.order.rivalRate ? S.order.need - Math.floor(S.order.rival) : 0;
      if (rv && rv < left) return 'Advisor: <b>The rival crew is ahead: they need ' + rv + ' more, you need ' + left + '.</b>' + (S.reserve > 0 ? ' Lower the stockpile reserve to send more up.' : '') + (S.ocBank >= 5 && !S.oc ? ' Overclock to speed the line.' : '') + ' Losing the race costs a reputation star.';
      return 'Advisor: <b>The ship wants ' + left + ' more ingot' + (left === 1 ? '' : 's') + ' in ' + fmtTime(S.order.until - S.t) + '.</b> Each pays ' + Math.round(S.order.premium * 100) + '% extra.' + (S.reserve > 0 ? ' Lower the stockpile reserve to send more up.' : '') + (S.ocBank >= 5 && !S.oc ? ' Overclock to speed the line.' : '');
    }
    if (sim.pattern() && S.scoutsNight && !S.si.night && !S.flags.length && !sim.has('flagBundle') && sim.counts().scout)
      return 'Advisor: <b>The drills have run out of flags.</b> Your scouts work nights. Give them a bigger flag bundle in the Tech tab (Sonar lab), or untick "Scouts work the night".';
    if (S.trader && S.trader.state === 'stay') return 'Advisor: <b>The hermit-crab trader is open for ' + fmtTime(S.trader.until - S.t) + '.</b> Swap bars or ingots for its goods in the Build tab.';
    if (S.storm) return 'Advisor: <b>Storm!</b> Everyone walks slower and the riser sells at half speed, but the waves are turning up free nodules. Let the haulers gather them.';
    if (S.lavaSurge) return 'Advisor: <b>Lava surge!</b> Smelting and forging run twice as fast and the engine makes double charge.' + (S.ocBank >= 5 && !S.oc ? ' Overclock now to make the most of it.' : '');
    if (waitMetal && S.stock === 0) return 'Advisor: <b>Repairs are stuck.</b> A repair bot is waiting at an empty stockpile. Keep more ingots back with the + beside the stockpile.';
    var gp = sim.gaps();
    if (gp.length) return 'Advisor: <b>Nobody covers ' + NAMES[gp[0].role].toLowerCase() + ' work in ' + gp[0].shift + '.</b> The line stops then. Hire a second one, or go back to all hands.';
    msg = {
      scout: '<b>Drills are short of flags.</b> Hire a scout, or claim a richer dune.',
      drill: '<b>Haulers are waiting for nodules.</b> Hire a drill crab.',
      haul: '<b>Nodules are piling up on the sand.</b> Hire a hauler.',
      crush: '<b>The ore pile is backing up.</b> Hire a crusher.',
      smelt: '<b>Bars are waiting for the lava.</b> Hire a smelter.',
      sell: '<b>The riser can\'t keep up.</b> Upgrade the riser pump in the Build tab.',
      power: c.engine < c.bots ? '<b>The Stirling engine can\'t make charge fast enough.</b> Upgrade it in the Build tab.' : '<b>Crabs are running flat.</b> Hire an energy bot.',
      repair: '<b>Breakdowns are piling up' + (broken ? ' (' + broken + ' broken now)' : '') + '.</b> Hire a repair bot.',
      mech: '<b>Crabs are limping on missing legs.</b> Hire a maintenance bot. It forges new legs from bars in the lava.'
    }[b];
    if (S.shift === 'all' && sim.avgWear() > K.WEAR_FREE) msg += ' Your crabs have worked four minutes without rest and are wearing out: try A and B shifts.';
    if (!S.oc && S.ocBank >= 10) msg += ' Overclock is charged.';
    if (S.crabs.length >= sim.crewCap() && b !== 'sell' && !(b === 'power' && c.engine < c.bots)) msg += ' Your den is full, so build a bigger den first, or retire a crab from another job.';
    return 'Advisor: ' + msg;
  }
  function renderHUD() {
    renderAlerts();
    var r = sim.rates(60), rk = S.rank, next = K.RANKS[rk + 1], prev = K.RANKS[rk][0], h = S.hist, old = h[Math.max(0, h.length - 11)];
    ui.credits.textContent = money(S.credits);
    ui.rate.textContent = '+' + money(r.revenue) + ' a minute';
    ui.rank.textContent = K.RANKS[rk][1];
    if (next) {
      ui.rankBar.style.width = clamp((S.earned - prev) / (next[0] - prev) * 100, 0, 100) + '%';
      ui.rankNext.textContent = money(S.earned) + ' of ' + money(next[0]) + ' earned → ' + next[1];
    } else { ui.rankBar.style.width = '100%'; ui.rankNext.textContent = money(S.earned) + ' earned. Top rank!'; }
    ui.price.textContent = '$' + S.price.toFixed(1);
    var d = S.price - old.price;
    ui.trend.textContent = d > 0.15 ? '▲ rising' : (d < -0.15 ? '▼ falling' : 'steady');
    ui.trend.className = 'hud-rate ' + (d > 0.15 ? 'up' : (d < -0.15 ? 'down' : ''));
    ui.stock.textContent = String(S.stock);
    ui.reserve.textContent = String(S.reserve);
    ui.rMinus.disabled = S.reserve <= 0; ui.rPlus.disabled = S.reserve >= 12;
    ui.advice.innerHTML = advice();
    var si = sim.shiftInfo();
    ui.shift.textContent = 'Day ' + si.day + ' · ' + clock(si.hour) + (si.night ? ' night' : '') + (si.periods > 1 ? ' · ' + si.name : '');
    ui.shiftLeft.textContent = (si.periods > 1 ? SHIFT_INFO[S.shift].short + ' · ' + Math.ceil(si.left / (K.DAY / 24)) + ' h to change' : SHIFT_INFO[S.shift].name) + ' · ' + (S.storm ? 'storm!' : S.lavaSurge ? 'lava surge!' : S.tide > 0.75 ? 'high tide' : S.tide < -0.75 ? 'low tide' : S.tide > 0 ? 'tide rising' : 'tide falling');
    ui.flow.textContent = '×' + sim.flowMult().toFixed(2);
    ui.flowNote.textContent = S.streak ? S.streak + ' deliveries in a row' : 'deliver steadily';
    ui.order.hidden = !S.order;
    if (S.order) {
      ui.orderN.textContent = S.order.got + ' of ' + S.order.need + (S.order.rivalRate ? ' · rival ' + Math.floor(S.order.rival) : '');
      ui.rival.hidden = !S.order.rivalRate;
      if (S.order.rivalRate) ui.rivalBar.style.width = (S.order.rival / S.order.need * 100).toFixed(1) + '%';
      ui.orderT.textContent = fmtTime(S.order.until - S.t) + ' left · +' + Math.round(S.order.premium * 100) + '% · ' + '★'.repeat(S.rep) + '☆'.repeat(K.REP_MAX - S.rep);
      ui.orderBar.style.width = (S.order.got / S.order.need * 100).toFixed(1) + '%';
    }
    ui.oc.setAttribute('aria-pressed', String(S.oc));
    ui.oc.disabled = !S.oc && S.ocBank < 1;
    ui.ocLabel.textContent = (S.oc ? 'Overclocked ' : 'Overclock ') + Math.floor(S.ocBank) + ' s';
    ui.ocBar.style.width = (S.ocBank / K.OC_MAX * 100).toFixed(1) + '%';
    for (var i = 0; i < ui.speeds.length; i++) ui.speeds[i].setAttribute('aria-pressed', String(parseFloat(ui.speeds[i].getAttribute('data-speed')) === speed));
  }

  // ----- the ledger: where the money comes from and where the line is slow -----
  // The whole game in bars: the metal's journey from sand to ship, the upkeep, and every kind of crab talk by count.
  var FUNNEL = [['scans', 'Scans of the sand'], ['finds', 'Deposits flagged'], ['holes', 'Holes drilled'], ['strikes', 'Strikes of metal'],
    ['stacked', 'Nodules carried to the ore pile'], ['bars', 'Bars crushed'], ['ingots', 'Ingots smelted'], ['sold', 'Ingots delivered up the riser']];
  var UPKEEP = [['charges', 'Charges given'], ['repairs', 'Drill bits fitted'], ['mends', 'Legs mended'], ['backup', 'Backup trips'],
    ['rides', 'Rides up the vent'], ['danced', 'Dances'], ['mornings', 'Morning bonuses'], ['nightFlags', 'Flags planted at night']];
  function barRows(rows, max) {
    return rows.map(function (r) {
      return '<tr><th scope="row">' + r[0] + '</th><td><div class="cap" aria-hidden="true"><i style="width:' + (max ? r[1] / max * 100 : 0).toFixed(1) + '%"></i></div></td><td class="n">' + r[1].toLocaleString('en-US') + '</td></tr>';
    }).join('');
  }
  function ledgerTotals() {
    var f = FUNNEL.map(function (x) { return [x[1], S.stat[x[0]]]; }), u = UPKEEP.map(function (x) { return [x[1], S.stat[x[0]]]; });
    return '<h3>From sand to ship: the whole game</h3><table class="ltable bars"><tbody>' + barRows(f, Math.max.apply(null, f.map(function (x) { return x[1]; }))) + '</tbody></table>' +
      '<h3>Keeping the line running: the whole game</h3><table class="ltable bars"><tbody>' + barRows(u, Math.max.apply(null, u.map(function (x) { return x[1]; }))) + '</tbody></table>';
  }
  function ledgerTalk() {
    var keys = Object.keys(TALK).sort(function (a, b) { return (talkCount[b] || 0) - (talkCount[a] || 0) || TALK_LABEL[a].localeCompare(TALK_LABEL[b]); }),
      total = 0, max = 0, said = 0;
    keys.forEach(function (k) { var n = talkCount[k] || 0; total += n; max = Math.max(max, n); if (n) said++; });
    return '<h3>Crab talk: everything said, by count</h3><p class="note">' + total.toLocaleString('en-US') + ' things said, ' + said + ' of ' + keys.length + ' kinds heard so far.</p>' +
      '<table class="ltable bars talk"><tbody>' + keys.map(function (k) {
        var n = talkCount[k] || 0;
        return '<tr' + (n ? '' : ' class="unheard"') + '><th scope="row">' + TALK_LABEL[k] + '<span class="says">' + TALK[k].map(spoken).join(' · ') + '</span></th>' +
          '<td><div class="cap" aria-hidden="true"><i style="width:' + (max ? n / max * 100 : 0).toFixed(1) + '%"></i></div></td><td class="n">' + n.toLocaleString('en-US') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function renderLedger() {
    var r = sim.rates(60), c = sim.capacity(), b = sim.bottleneck(), flows = sim.FLOW, maxc = 0, i, k, html, broken = 0, limping = 0, cr, avgPrice, bat = sim.avgBattery();
    for (i = 0; i < flows.length; i++) maxc = Math.max(maxc, c[flows[i]]);
    for (i = 0; i < S.crabs.length; i++) { cr = S.crabs[i]; if ((cr.role === 'drill' && !cr.bitOk) || (cr.role === 'energy' && cr.broken)) broken++; if (cr.limp) limping++; }
    avgPrice = r.sold ? r.revenue / r.sold : S.price;
    var now = {
      scout: r.finds.toFixed(1) + ' flags/min',
      drill: r.holes.toFixed(0) + ' holes/min, ' + (r.holes ? Math.round(r.strikes / r.holes * 100) : 0) + '% strike',
      haul: r.stacked.toFixed(1) + ' nodules/min',
      crush: r.bars.toFixed(1) + ' bars/min',
      smelt: r.ingots.toFixed(1) + ' ingots/min',
      sell: r.sold.toFixed(1) + ' ingots/min'
    };
    var lost = r.metalUsed * avgPrice, share = r.sold + r.metalUsed ? Math.round(r.sold / (r.sold + r.metalUsed) * 100) : 100;
    html = '<h3>Money, last minute</h3><table class="ltable"><tbody>' +
      '<tr><th scope="row">Ingots sold up the riser</th><td class="n">' + r.sold.toFixed(1) + ' at ' + money(avgPrice) + '</td><td class="n">+' + money(r.revenue) + '</td></tr>' +
      '<tr><th scope="row">Ingots spent on repairs</th><td class="n">' + r.metalUsed.toFixed(1) + '</td><td class="n">' + (lost ? '−' : '') + money(lost) + '</td></tr>' +
      '<tr class="total"><td>Metal that reached the surface</td><td></td><td class="n">' + share + '%</td></tr>' +
      '</tbody></table>' +
      '<p class="note">Earned in total: ' + money(S.earned) + ' · spent on crabs and upgrades: ' + money(S.stat.spent) + ' · repairs: ' + S.stat.repairs + ' · crab time ' + fmtTime(S.t) + '</p>';
    html += '<p class="share-row"><button type="button" class="mini wide" data-share>Copy a summary of this run</button></p>' + ledgerCharts() + ledgerTotals() + ledgerTalk();
    html += '<h3>Metal price, last five minutes</h3><div class="spark-wrap" id="spark-wrap">' + sparkline() + '</div>';
    html += '<h3>The line: what each stage could do, ingots a minute</h3><table class="ltable"><thead><tr><th scope="col">Stage</th><th scope="col">Capacity</th><th scope="col" class="n">Doing now</th></tr></thead><tbody>';
    for (i = 0; i < flows.length; i++) {
      k = flows[i];
      html += '<tr' + (k === b ? ' class="slow"' : '') + '><th scope="row">' + STAGE_NAME[k] + (k === b ? ' <span class="flag-slow">◀ slowest</span>' : '') + '</th>' +
        '<td><div class="cap" title="' + c[k].toFixed(1) + ' ingots a minute"><i style="width:' + (maxc ? c[k] / maxc * 100 : 0).toFixed(1) + '%"></i></div><span class="note">' + c[k].toFixed(1) + '</span></td>' +
        '<td class="n">' + now[k] + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<h3>Overheads</h3><table class="ltable"><tbody>' +
      '<tr' + (b === 'power' ? ' class="slow"' : '') + '><th scope="row">Power' + (b === 'power' ? ' <span class="flag-slow">◀ short</span>' : '') + '</th><td class="n">average battery ' + Math.round(bat * 100) + '%</td></tr>' +
      '<tr><th scope="row">Energy bots</th><td class="n">' + sim.counts().energy + ' bots, enough for ' + Math.round(c.bots * (S.crabs.length - sim.counts().energy)) + ' crabs</td></tr>' +
      '<tr><th scope="row">Stirling engine</th><td class="n">' + sim.up('engine') + ' charges/min, enough for ' + Math.round(c.engine * (S.crabs.length - sim.counts().energy)) + ' crabs</td></tr>' +
      '<tr' + (b === 'repair' ? ' class="slow"' : '') + '><th scope="row">Repairs' + (b === 'repair' ? ' <span class="flag-slow">◀ short</span>' : '') + '</th><td class="n">' + broken + ' broken now, ' + r.bitsBroken.toFixed(1) + ' bits and ' + r.ebotsBroken.toFixed(1) + ' bots break a minute</td></tr>' +
      '<tr' + (b === 'mech' ? ' class="slow"' : '') + '><th scope="row">Legs' + (b === 'mech' ? ' <span class="flag-slow">◀ short</span>' : '') + '</th><td class="n">' + limping + ' limping now, ' + r.legsLost.toFixed(1) + ' lost and ' + r.mends.toFixed(1) + ' mended a minute, ' + r.barsUsed.toFixed(1) + ' bars used</td></tr>' +
      '<tr><th scope="row">Backup work</th><td class="n">' + S.stat.backup + ' trips fetching nodules by crabs whose own work was stuck</td></tr>' +
      '<tr><th scope="row">Night scouting</th><td class="n">' + S.stat.nightFlags + ' flags planted at night</td></tr>' +
      '<tr><th scope="row">Wear</th><td class="n">average ' + Math.round(sim.avgWear()) + ' s without rest (trouble starts at ' + K.WEAR_FREE + ')</td></tr>' +
      '<tr><th scope="row">Thermal vent</th><td class="n">' + r.rides.toFixed(1) + ' rides a minute</td></tr>' +
      '</tbody></table>';
    var cov = sim.coverage(), ri, si2, cell;
    html += '<h3>Shifts: crabs on duty in each part of the day</h3><table class="ltable"><thead><tr><th scope="col">Role</th>';
    for (si2 = 0; si2 < cov.length; si2++) html += '<th scope="col" class="n">' + cov[si2].name.replace(' (', '<br>(') + '</th>';
    html += '</tr></thead><tbody>';
    for (ri = 0; ri < K.ROLES.length; ri++) {
      if (!sim.counts()[K.ROLES[ri]]) continue;
      html += '<tr><th scope="row">' + NAMES[K.ROLES[ri]] + 's</th>';
      for (si2 = 0; si2 < cov.length; si2++) { cell = cov[si2].roles[K.ROLES[ri]]; html += '<td class="n">' + (cell ? cell : '<span class="flag-slow">0 ⚠</span>') + '</td>'; }
      html += '</tr>';
    }
    html += '</tbody></table><p class="note">' + SHIFT_INFO[S.shift].note + ' Every role needs someone on duty in every part of the day, or the line stops then.</p>';
    var crew = S.crabs.slice().sort(function (a2, b2) { return b2.stars - a2.stars || b2.rec.jobs / K.VET_AT[b2.role] - a2.rec.jobs / K.VET_AT[a2.role]; }), shown = crew.slice(0, 12);
    html += '<h3>The crew: names, stars and records</h3><table class="ltable"><thead><tr><th scope="col">Crab</th><th scope="col">Job</th><th scope="col">Record</th></tr></thead><tbody>';
    shown.forEach(function (cr2) {
      var nextAt = cr2.stars < K.VET_LEVELS.length ? K.VET_AT[cr2.role] * K.VET_LEVELS[cr2.stars] : 0;
      html += '<tr><th scope="row">' + cr2.name + (cr2.stars ? ' <span class="vet" aria-label="' + cr2.stars + ' star' + (cr2.stars === 1 ? '' : 's') + '">' + '★'.repeat(cr2.stars) + '</span>' : '') + '</th><td>' + ROLE_NOUN[cr2.role] + '</td><td class="note">' + recText(cr2) +
        (nextAt ? ' (next star at ' + nextAt + ')' : '') + '</td></tr>';
    });
    html += '</tbody></table><p class="note">' + (crew.length > shown.length ? 'And ' + (crew.length - shown.length) + ' more. ' : '') + 'Each star makes a crab ' + Math.round(K.VET_BONUS * 100) + '% faster at its own job. Retiring takes the newest crab of a kind, so veterans stay.</p>';
    html += '<h3>The sea</h3><table class="ltable"><tbody>' +
      '<tr><th scope="row">Tide</th><td class="n">' + (S.tide > 0.75 ? 'high: washing nodules up' : S.tide < -0.75 ? 'low: burying idle flags' : S.tide > 0 ? 'rising' : 'falling') + '</td></tr>' +
      '<tr><th scope="row">Washed up / buried</th><td class="n">' + S.stat.washed + ' nodules / ' + S.stat.buried + ' flags</td></tr>' +
      '<tr><th scope="row">Octopus</th><td class="n">' + S.stat.octopi + ' visits, ' + S.stat.stolen + ' nodules stolen, ' + S.stat.shooed + ' shooed' + (S.octo ? ' (one is here now)' : '') + '</td></tr>' +
      '<tr><th scope="row">Weather</th><td class="n">' + S.stat.storms + ' storms, ' + S.stat.surges + ' lava surges' + (S.storm ? ' (storm now)' : S.lavaSurge ? ' (surge now)' : '') + '</td></tr>' +
      '<tr><th scope="row">Trader</th><td class="n">' + S.stat.trades + ' swaps; spares: ' + S.spares.bit + ' bits, ' + S.spares.leg + ' legs' + (S.trader ? ' (in town now)' : '') + '</td></tr>' +
      '<tr><th scope="row">Sea turtle</th><td class="n">' + S.stat.turtleRides + ' rides given</td></tr>' +
      '<tr><th scope="row">Den</th><td class="n">' + S.decor.length + ' of ' + sim.decorMax() + ' decorations</td></tr>' +
      '<tr><th scope="row">Ship orders</th><td class="n">' + S.stat.ordersFilled + ' of ' + S.stat.orders + ' filled, ' + money(S.stat.orderCredits) + ' in premiums and bonuses, reputation ' + '★'.repeat(S.rep) + '☆'.repeat(K.REP_MAX - S.rep) + '</td></tr>' +
      '<tr><th scope="row">Rival crew 🦞</th><td class="n">' + (S.rival ? 'races won ' + S.rival.lost + ', lost ' + S.rival.won + ' · they are pushing at ' + Math.round(S.rival.drive * 100) + '%' : 'arrives at ' + K.RANKS[K.RIVAL_RANK][1]) + '</td></tr>' +
      '<tr><th scope="row">Pearls</th><td class="n">' + S.stat.pearls + ' found, ' + money(S.stat.pearlCredits) + '</td></tr>' +
      '</tbody></table>';
    html += '<h3>Bonuses</h3><table class="ltable"><tbody>' +
      '<tr><th scope="row">Flow</th><td class="n">×' + sim.flowMult().toFixed(2) + ' on sales, ' + S.streak + ' in a row</td></tr>' +
      '<tr><th scope="row">Flow bonus earned</th><td class="n">' + money(r.flowBonus) + ' a minute, ' + money(S.stat.flowBonus) + ' in all</td></tr>' +
      '<tr><th scope="row">Overclock</th><td class="n">' + Math.floor(S.ocBank) + ' s banked' + (S.oc ? ', running now' : '') + '</td></tr>' +
      '</tbody></table><p class="note">A delivery within ' + K.FLOW_GAP + ' s of the last keeps the flow going: each one adds 2% to the price, up to 40%, and banks more overclock. Overclock makes the whole crew 50% faster, but they use more power and wear twice as fast.</p>';
    html += '<p class="note">Capacity is what each stage could deliver if nothing else held it back, measured from the simulation. The line can only go as fast as its slowest stage.</p>';
    ui.ledger.innerHTML = html;
    wireSpark(); wireCharts();
  }
  function sparkline() {
    var h = S.hist, n = h.length, i, lo = 1e9, hi = -1e9, pts = [], x, y, Wd = 300, Hd = 46;
    if (n < 2) return '<p class="note">Collecting prices…</p>';
    for (i = 0; i < n; i++) { lo = Math.min(lo, h[i].price); hi = Math.max(hi, h[i].price); }
    lo = Math.floor(lo) - 0.5; hi = Math.ceil(hi) + 0.5;
    for (i = 0; i < n; i++) { x = (i / (n - 1)) * Wd; y = Hd - 4 - (h[i].price - lo) / (hi - lo) * (Hd - 8); pts.push(x.toFixed(1) + ',' + y.toFixed(1)); }
    return '<svg class="spark" viewBox="0 0 ' + Wd + ' ' + Hd + '" preserveAspectRatio="none" role="img" aria-label="Metal price over the last five minutes, between ' + money(lo + 0.5) + ' and ' + money(hi - 0.5) + ', now $' + S.price.toFixed(1) + '">' +
      '<line x1="0" x2="' + Wd + '" y1="' + (Hd - 4 - (K.PRICE - lo) / (hi - lo) * (Hd - 8)).toFixed(1) + '" y2="' + (Hd - 4 - (K.PRICE - lo) / (hi - lo) * (Hd - 8)).toFixed(1) + '" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>' +
      '<polyline fill="none" stroke="var(--link)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" points="' + pts.join(' ') + '"/>' +
      '<line id="spark-x" x1="0" x2="0" y1="0" y2="' + Hd + '" stroke="currentColor" stroke-opacity=".5" vector-effect="non-scaling-stroke" visibility="hidden"/></svg>' +
      '<p class="note">Dashed line: the 12-credit average. Now ' + money(S.price) + '.</p>';
  }
  // ----- whole-game line charts in the Ledger: one series each, its own axis, a crosshair and readout on hover -----
  var chartHover = {};
  function lineChart(id, pts, title, fmt, refs) {   // pts: [{t, v}]; refs: [{v, label}] dashed reference lines
    var Wd = 300, Hd = 90, n = pts.length, i, hi = 0, xs, ys, line = [], t0, t1, html;
    if (n < 2) return '<h3>' + title + '</h3><p class="note">The chart fills in as the game goes on.</p>';
    t0 = pts[0].t; t1 = pts[n - 1].t;
    for (i = 0; i < n; i++) hi = Math.max(hi, pts[i].v);
    if (hi <= 0) return '<h3>' + title + '</h3><p class="note">Nothing yet: the line starts with the first ingot sold.</p>';
    (refs || []).forEach(function (r) { if (r.v <= hi * 1.6) hi = Math.max(hi, r.v); });
    hi = hi > 0 ? hi * 1.08 : 1;
    xs = function (t) { return (t - t0) / Math.max(1, t1 - t0) * Wd; }; ys = function (v) { return Hd - 2 - v / hi * (Hd - 6); };
    for (i = 0; i < n; i++) line.push(xs(pts[i].t).toFixed(1) + ',' + ys(pts[i].v).toFixed(1));
    html = '<h3>' + title + '</h3><div class="spark-wrap chart" id="' + id + '"><svg class="spark big" viewBox="0 0 ' + Wd + ' ' + Hd + '" preserveAspectRatio="none" role="img" aria-label="' +
      title + ': from ' + fmt(pts[0].v) + ' at the start to ' + fmt(pts[n - 1].v) + ' now, highest ' + fmt(Math.max.apply(null, pts.map(function (p) { return p.v; }))) + '.">';
    (refs || []).forEach(function (r) {
      if (r.v > hi) return;
      html += '<line x1="0" x2="' + Wd + '" y1="' + ys(r.v).toFixed(1) + '" y2="' + ys(r.v).toFixed(1) + '" stroke="currentColor" stroke-opacity=".3" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>';
    });
    html += '<line x1="0" x2="' + Wd + '" y1="' + (Hd - 2) + '" y2="' + (Hd - 2) + '" stroke="currentColor" stroke-opacity=".35" vector-effect="non-scaling-stroke"/>' +
      '<polyline fill="none" stroke="var(--link)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" points="' + line.join(' ') + '"/>' +
      '<line class="chart-x" x1="0" x2="0" y1="0" y2="' + Hd + '" stroke="currentColor" stroke-opacity=".5" vector-effect="non-scaling-stroke" visibility="hidden"/></svg>';
    var lastY = 1e9;                     // label a reference line only if it clears the one above it
    (refs || []).slice().reverse().forEach(function (r) {
      var y = ys(r.v) / Hd * 100;
      if (r.v > hi || Math.abs(lastY - y) < 11) return;
      lastY = y; html += '<span class="chart-ref" style="top:' + y.toFixed(1) + '%">' + r.label + '</span>';
    });
    html += '</div><p class="note chart-axis"><span>start</span><span>' + fmt(0) + ' to ' + fmt(hi / 1.08) + '</span><span>now, ' + fmtTime(t1) + ' in</span></p>';
    return html;
  }
  function wireChart(id, pts, tipText) {
    var wrap = $(id), svg = wrap && wrap.querySelector('svg');
    if (!svg || pts.length < 2) return;
    var tip = document.createElement('span'); tip.className = 'spark-tip'; tip.hidden = true; wrap.appendChild(tip);
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    function show(clientX) {
      var rect = svg.getBoundingClientRect(), f = clamp((clientX - rect.left) / rect.width, 0, 1), t = t0 + f * (t1 - t0), i, best = 0, ln = svg.querySelector('.chart-x');
      for (i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - t) < Math.abs(pts[best].t - t)) best = i;
      f = (pts[best].t - t0) / Math.max(1, t1 - t0);
      tip.hidden = false; tip.style.left = (f * rect.width) + 'px'; tip.textContent = tipText(pts[best]);
      if (ln) { ln.setAttribute('x1', f * 300); ln.setAttribute('x2', f * 300); ln.setAttribute('visibility', 'visible'); }
      chartHover[id] = clientX;
    }
    svg.addEventListener('pointermove', function (e) { show(e.clientX); });
    svg.addEventListener('pointerleave', function () { tip.hidden = true; chartHover[id] = null; svg.querySelector('.chart-x').setAttribute('visibility', 'hidden'); });
    if (chartHover[id] != null) show(chartHover[id]);
  }
  function wholeGame() {                 // the series behind the two whole-game charts
    var L = S.long.concat([{ t: S.t, earned: S.earned, sold: S.stat.sold, crabs: S.crabs.length }]), earned = [], rate = [], i, j, dt;
    for (i = 0; i < L.length; i++) {
      earned.push({ t: L[i].t, v: L[i].earned, crabs: L[i].crabs });
      // sales come in bursts, so the rate is taken over the last two minutes or so, not between neighbours
      for (j = i - 1; j > 0 && L[i].t - L[j].t < 120; j--);
      if (i) { dt = L[i].t - L[j].t; if (dt > 0.5) rate.push({ t: L[i].t, v: (L[i].sold - L[j].sold) / dt * 60, crabs: L[i].crabs }); }
    }
    return { earned: earned, rate: rate };
  }
  // ----- share a run: a plain-text summary of this game, for the clipboard -----
  function runSummary() {
    var g = wholeGame(), n = sim.counts(), crew = [], ranks = [], i, r, at, bestRate = 0;
    for (r = 1; r <= S.rank; r++) {                  // when each rank came, from the whole-game history
      at = null; for (i = 0; i < g.earned.length && at === null; i++) if (g.earned[i].v >= K.RANKS[r][0]) at = g.earned[i].t;
      ranks.push(K.RANKS[r][1] + ' ' + (at === null ? '?' : fmtTime(at)));
    }
    K.ROLES.forEach(function (k) { if (n[k]) crew.push(n[k] + ' ' + (n[k] === 1 ? NAMES[k] : NAMES[k] + 's').toLowerCase()); });
    g.rate.forEach(function (p) { bestRate = Math.max(bestRate, p.v); });
    return ['🦀 Crabminer, day ' + S.day + ': ' + K.RANKS[S.rank][1],
      money(S.earned) + ' earned in ' + fmtTime(S.t) + ' of crab time',
      ranks.length ? 'Ranks: ' + ranks.join(' · ') : 'No rank-ups yet',
      'Crew of ' + S.crabs.length + ': ' + crew.join(', '),
      S.stat.sold.toLocaleString('en-US') + ' ingots delivered, best pace ' + bestRate.toFixed(1) + ' a minute, ' + S.stat.ordersFilled + ' of ' + S.stat.orders + ' ship orders, ' + S.stat.pearls + ' pearls',
      'https://crabminer.com'].join('\n');
  }
  function copySummary() {
    var text = runSummary(), done = function () { toast('Copied a summary of this run', 'Paste it anywhere to share it.'); };
    function fallback() {                 // older browsers, or a page without clipboard permission
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) done(); else toast('Could not copy', 'Your browser blocked the clipboard. The summary is in the Ledger tab.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  function ledgerCharts() {
    var g = wholeGame(), refs = K.RANKS.slice(1).map(function (r) { return { v: r[0], label: r[1] }; });
    return lineChart('chart-earned', g.earned, 'Earned over the whole game', money, refs) +
      lineChart('chart-rate', g.rate, 'Ingots delivered a minute, over the whole game', function (v) { return v.toFixed(1); });
  }
  function wireCharts() {
    var g = wholeGame();
    wireChart('chart-earned', g.earned, function (p) { return fmtTime(p.t) + ': ' + money(p.v) + ' earned, ' + p.crabs + ' crabs'; });
    wireChart('chart-rate', g.rate, function (p) { return fmtTime(p.t) + ': ' + p.v.toFixed(1) + ' a minute, ' + p.crabs + ' crabs'; });
  }
  var sparkHover = null;
  function wireSpark() {
    var wrap = $('spark-wrap'), svg = wrap && wrap.querySelector('svg');
    if (!svg) return;
    var tip = document.createElement('span'); tip.className = 'spark-tip'; tip.hidden = true; wrap.appendChild(tip);
    function show(clientX) {
      var rect = svg.getBoundingClientRect(), h = S.hist, f = clamp((clientX - rect.left) / rect.width, 0, 1), i = Math.round(f * (h.length - 1)), ln = $('spark-x');
      tip.hidden = false; tip.style.left = (f * rect.width) + 'px';
      tip.textContent = Math.round(h[h.length - 1].t - h[i].t) + ' s ago: $' + h[i].price.toFixed(1);
      if (ln) { ln.setAttribute('x1', f * 300); ln.setAttribute('x2', f * 300); ln.setAttribute('visibility', 'visible'); }
      sparkHover = clientX;
    }
    svg.addEventListener('pointermove', function (e) { show(e.clientX); });
    svg.addEventListener('pointerleave', function () { tip.hidden = true; sparkHover = null; var ln = $('spark-x'); if (ln) ln.setAttribute('visibility', 'hidden'); });
    if (sparkHover !== null) show(sparkHover);
  }

  // ----- game flow -----
  var SAVE_KEY = 'crabminer-save', saveTick = 0;
  function saveGame() {                 // the whole game goes to localStorage, so a reload carries on where it was
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(sim.save())); } catch (e) { /* storage may be unavailable or full */ }
    try { localStorage.setItem(TALK_SAVE_KEY, JSON.stringify(talkCount)); } catch (e) { /* the talk tally is only a nicety */ }
  }
  function loadGame() {                 // true if a saved game was found and restored
    var data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
    if (!data) return false;
    try { if (sim.load(data) !== true) return false; } catch (e) { return false; }
    S = sim.state();
    freshView();
    try { var tc = JSON.parse(localStorage.getItem(TALK_SAVE_KEY)) || {}; for (var k in tc) if (TALK[k] && tc[k] > 0) talkCount[k] = tc[k]; } catch (e) { /* start the tally afresh */ }
    won = S.rank >= K.RANKS.length - 1;   // a game already won does not show the win card again
    if (S.order) cargo = { x: W + 160, phase: 'in' };   // a ship that was waiting sails back in
    return true;
  }
  function newGame() {
    S = sim.reset();
    talkCount = {};
    freshView();
    sim.drain().forEach(handle);
    renderPanel(); renderHUD();
    saveGame();
  }
  function freshView() {                // forget everything the view was animating from the last game
    flights = []; lifts = []; rivalLifts = []; sparks = []; floaters = []; confetti = []; rings = []; puffs = []; debris = []; lastShift = ''; cargo = { x: -1, phase: 'gone' };
    won = false; startedAt = 0; acc = 0; selected = null;
  }
  function closeIntro() { ui.intro.hidden = true; setSpeed(speed || 1); }
  function openIntro() {
    ui.intro.hidden = false;
    ui.start.textContent = started ? 'Resume' : 'Start';
    ui.newgame.hidden = !started;
    ui.start.focus();
  }
  function showWin() {
    var secs = S.t;
    if (!best || secs < best) { best = secs; try { localStorage.setItem('crabminer-best', String(best)); } catch (e) { /* storage may be unavailable */ } }
    ui.winText.textContent = 'You earned ' + money(K.RANKS[K.RANKS.length - 1][0]) + ' in ' + fmtTime(secs) + ' of crab time, with ' + S.crabs.length + ' crabs and ' + S.stat.sold + ' ingot' + (S.stat.sold === 1 ? '' : 's') + ' sold. Your best time is ' + fmtTime(best) + '. Crab profit!';
    ui.win.hidden = false;
    $('win-keep').focus();
  }
  function setSpeed(v) { speed = v; renderHUD(); }
  function setBig(on) {                 // big playfield: the stage fills the screen and the sand fills its lower half
    document.body.classList.toggle('big', on);
    ui.bigBtn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('crabminer-big', on ? '1' : '0'); } catch (e) { /* storage may be unavailable */ }
    measure(); draw();
    stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * (on ? 0.62 : 0.55);
  }

  function wire() {
    buildRoles();
    function onRoleClick(e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var r = b.closest('.role').getAttribute('data-role'), res;
      if (b.getAttribute('data-act') === 'hire') { res = sim.hire(r); if (res === true) toast('Hired a ' + NAMES[r].toLowerCase(), ROLE_INFO[r].replace(/^./, function (m) { return m.toUpperCase(); }) + '.'); }
      else sim.retire(r);
      sim.drain().forEach(handle);
      renderPanel(); renderHUD();
    }
    ui.roles.addEventListener('click', onRoleClick);
    ui.aOcto.addEventListener('click', shoo);
    ui.aTrader.addEventListener('click', openShop);
    ui.rosterBox.addEventListener('toggle', renderRoster);
    ui.roster.addEventListener('click', function (e) {
      var b = e.target.closest('[data-show]'), id = b && +b.getAttribute('data-show'), c = null, i;
      for (i = 0; b && i < S.crabs.length; i++) if (S.crabs[i].id === id) c = S.crabs[i];
      if (c) showCrab(c);
    });
    ui.layoutList.addEventListener('click', function (e) {
      var b = e.target.closest('button'), m, to, here = null, k, dir;
      if (!b || b.disabled) return;
      if (b.hasAttribute('data-post')) {
        dir = +b.getAttribute('data-post');
        sim.placePost(S.post.x + 30 * dir, S.post.d); sim.drain().forEach(handle);
        toast('Moved the refuel post', 'It stays put until you let the energy bots move it again.');
      } else {
        m = b.getAttribute('data-move'); to = +b.getAttribute('data-to'); dir = to > S.layout[m] ? 1 : -1;
        for (k in S.layout) if (S.layout[k] === to) here = k;
        if (sim.place(m, to)) toast('Moved the ' + BLD_NAMES[m].toLowerCase(), here ? 'It swapped places with the ' + BLD_NAMES[here].toLowerCase() + '.' : 'The crabs will find it there.');
        sim.drain();
      }
      renderPanel(); draw();
      // keep the focus on the same button, which the rebuilt list replaced
      var again = ui.layoutList.querySelector(m ? '[data-move="' + m + '"][data-to="' + (S.layout[m] + dir) + '"]' : '[data-post="' + dir + '"]');
      if (again && !again.disabled) again.focus();
    });
    ui.tech.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var card = b.closest('.card'), t = card.getAttribute('data-tech'), w = card.getAttribute('data-wup');
      if (t && sim.research(t) === true) toast('Researched: ' + TECH_INFO[t].name, TECH_INFO[t].note);
      if (w && sim.upgradeWorker(w) === true) toast('Fitted: ' + WUP_INFO[w][0], WUP_INFO[w][1]);
      sim.drain().forEach(handle); renderPanel(); renderHUD();
    });
    ui.arrangeBtn.addEventListener('click', function () { arrange = !arrange; pick = null; renderPanel(); draw(); });
    ui.postBtn.addEventListener('click', function () { sim.setPostAuto(!S.post.auto); renderPanel(); });
    ui.traderOffers.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (sim.trade(b.getAttribute('data-trade')) === true) {} sim.drain().forEach(handle); renderPanel(); renderHUD();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-work]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-work'), d = parseInt(b.getAttribute('data-d'), 10), o = {};
        o[k] = S.work[k] + d; sim.setWork(o); sim.drain().forEach(handle); renderPanel(); renderHUD();
      });
    });
    $('scouts-night').addEventListener('change', function () { sim.setScoutsNight(this.checked); renderPanel(); renderHUD(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-shift]'), function (b) {
      b.addEventListener('click', function () { sim.setShift(b.getAttribute('data-shift')); sim.drain().forEach(handle); renderPanel(); renderHUD(); });
    });
    ui.oc.addEventListener('click', function () { sim.overclock(!S.oc); sim.drain().forEach(handle); renderHUD(); });
    ui.bigBtn.addEventListener('click', function () { setBig(!document.body.classList.contains('big')); });
    function pan(f) { stage.scrollBy({ left: f * stage.clientWidth, behavior: mqReduce.matches ? 'auto' : 'smooth' }); }
    $('pan-l').addEventListener('click', function () { pan(-0.6); });
    $('pan-r').addEventListener('click', function () { pan(0.6); });
    ui.panRange.addEventListener('input', function () { stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * ui.panRange.value / 100; });
    stage.addEventListener('scroll', function () { var m = stage.scrollWidth - stage.clientWidth; ui.panRange.value = m > 0 ? Math.round(stage.scrollLeft / m * 100) : 0; });
    ui.cards.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var id = b.closest('.card').getAttribute('data-up');
      if (sim.buy(id) === true) toast('Built: ' + UP_INFO[id].name, UP_INFO[id].fx(K.UP[id].vals[S.lv[id]]) + '.');
      sim.drain().forEach(handle);
      renderPanel(); renderHUD();
    });
    ui.rMinus.addEventListener('click', function () { sim.setReserve(S.reserve - 1); renderHUD(); });
    ui.rPlus.addEventListener('click', function () { sim.setReserve(S.reserve + 1); renderHUD(); });
    for (var i = 0; i < ui.speeds.length; i++) ui.speeds[i].addEventListener('click', function () { setSpeed(parseFloat(this.getAttribute('data-speed'))); });
    var tabs = document.querySelectorAll('[role="tab"]');
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener('click', function () { selectTab(t.id); });
      t.addEventListener('keydown', function (e) {
        var list = Array.prototype.slice.call(tabs), j = list.indexOf(t);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { j = (j + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length; list[j].focus(); selectTab(list[j].id); }
      });
    });
    $('help').addEventListener('click', function () { setSpeed(0); openIntro(); });
    ui.start.addEventListener('click', function () { if (!started) { started = true; newGame(); } closeIntro(); });
    ui.newgame.addEventListener('click', function () { newGame(); closeIntro(); });
    $('readmore').addEventListener('click', function () { ui.intro.hidden = true; if (!started) { started = true; newGame(); setSpeed(0); } });
    $('win-keep').addEventListener('click', function () { ui.win.hidden = true; });
    $('win-share').addEventListener('click', copySummary);
    ui.ledger.addEventListener('click', function (e) { if (e.target.closest('[data-share]')) copySummary(); });
    $('win-new').addEventListener('click', function () { ui.win.hidden = true; newGame(); });
    document.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.key === 'Escape' && !ui.intro.hidden && started) { closeIntro(); return; }
      if (e.key === 'Escape' && arrange) { arrange = false; pick = null; renderPanel(); return; }
      if (!ui.intro.hidden || !ui.win.hidden) return;
      if (e.key === ' ' && !(e.target.closest && e.target.closest('button, a'))) { e.preventDefault(); setSpeed(speed ? 0 : 1); }
      if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) setBig(!document.body.classList.contains('big'));
      if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey) { sim.overclock(!S.oc); sim.drain().forEach(handle); renderHUD(); }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key, list = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]')), j;
      if (k === '1' || k === '2' || k === '3') setSpeed([1, 2, 4][+k - 1]);
      else if (k === 's') shoo();
      else if (k === 't') openShop();
      else if (k === 'm') { selectTab('t-build'); ui.arrangeBtn.click(); }
      else if (k === '[' || k === ']') {
        for (j = 0; j < list.length; j++) if (list[j].getAttribute('aria-selected') === 'true') break;
        selectTab(list[(j + (k === ']' ? 1 : list.length - 1)) % list.length].id);
      } else if (k === '?') { setSpeed(0); openIntro(); }
    });
    cv.addEventListener('click', function (e) {
      var rect = cv.getBoundingClientRect(), x = (e.clientX - rect.left) / Z, y = (e.clientY - rect.top) / Z, bestC = null, bd = 1e9, i, c, px, py, d, z;
      if (S.trader) {                     // the trader: show its goods
        var trp = traderPos();
        if (Math.abs(trp.x - x) < 26 * CS && y > trp.y - 60 * CS && y < trp.y + 6) {
          selectTab('t-build'); ui.traderCard.classList.remove('flash'); void ui.traderCard.offsetWidth; ui.traderCard.classList.add('flash'); ui.traderCard.scrollIntoView({ block: 'nearest' });
          return;
        }
      }
      if (S.octo) {                       // shoo the octopus
        var opp = octoPos(), op = opp.x, oy = opp.y - 14 * scaleAt(S.octo.d) * 1.15;
        if (Math.hypot(op - x, oy - y) < 32 * CS) { sim.shoo(); sim.drain().forEach(handle); return; }
      }
      if (arrange) {                     // pick a building up, then put it down on another plot
        var hit = -1, pr, k2, here = null, pp = postPos();
        if (pick === 'post') {          // the post goes wherever the front dune is tapped, within the cord's reach
          var dd = 0.72, bestD = 1e9, dv;
          for (dv = 0.72; dv <= 0.97; dv += 0.01) { var gyv = groundY(x, dv); if (Math.abs(gyv - y) < bestD) { bestD = Math.abs(gyv - y); dd = dv; } }
          sim.placePost(Xinv(x), dd); pick = null; toast('Moved the refuel post', 'It stays put until you let the energy bots move it again (Build tab).');
          sim.drain().forEach(handle); renderPanel(); draw(); return;
        }
        if (Math.abs(x - pp.x) < 18 * CS && y > pp.y - 45 * CS && y < pp.y + 6) { pick = 'post'; renderPanel(); draw(); return; }
        for (i = 0; i < K.PLOTS.length; i++) { pr = plotRect(i); if (Math.abs(x - pr.x) <= pr.half && y >= pr.y0 - 50 * CS && y <= pr.y1 + 10) hit = i; }
        if (hit < 0) { pick = null; renderPanel(); return; }
        for (k2 in S.layout) if (S.layout[k2] === hit) here = k2;
        if (!pick) { pick = here; }
        else { if (sim.place(pick, hit)) toast('Moved the ' + BLD_NAMES[pick].toLowerCase(), here ? 'It swapped places with the ' + BLD_NAMES[here].toLowerCase() + '.' : 'The crabs will find it there.'); pick = null; }
        sim.drain(); renderPanel(); draw();
        return;
      }
      for (i = 0; i < S.crabs.length; i++) {
        c = S.crabs[i]; px = crabX(c); py = groundY(px, c.d) - 10 * scaleAt(c.d);
        if (c.alt > 0) { var ap = airPos(c); px = ap.x; py = ap.y; }
        d = Math.hypot(px - x, py - y);
        if (d < bd) { bd = d; bestC = c; }
      }
      if (bestC && bd < 26 * CS) { selected = bestC; selectedUntil = T + 5; return; }
      for (z in lockHit) {
        c = lockHit[z];
        if (z >= sim.up('field') && x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) {
          selectTab('t-build');
          var card = ui.cards.querySelector('[data-up="field"]');
          card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
          card.scrollIntoView({ block: 'nearest' });
          return;
        }
      }
      selected = null;
    });
  }
  function selectTab(id) {
    Array.prototype.forEach.call(document.querySelectorAll('[role="tab"]'), function (t) {
      var on = t.id === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (id === 't-ledger') renderLedger();
    document.querySelector('.panel').classList.toggle('collapsed', id === 't-view');
  }

  // ----- loop and lifecycle -----
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now; T += dt;
    wheel += dt * (sim.up('engine') / 32) * (S.heat >= 1 ? 3 : 0.8) * (speed ? 1 : 0);
    update(dt);
    if (stageVisible) draw();
    uiTick += dt; ledgerTick += dt;
    if (uiTick > 0.25) { uiTick = 0; renderHUD(); renderPanel(); renderRoster(); }
    if (ledgerTick > 1 && !$('p-ledger').hidden) { ledgerTick = 0; renderLedger(); }
    saveTick += dt;
    if (saveTick > 10) { saveTick = 0; saveGame(); }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function onChange(mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); }

  var resizeQueued = false;
  window.addEventListener('resize', function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () { resizeQueued = false; measure(); draw(); });
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); saveGame(); } else start(); });
  window.addEventListener('pagehide', saveGame);
  if (window.ResizeObserver) {          // the stage changes size without the window doing so: the sheet folding away, say
    new ResizeObserver(function () { if (stage.clientHeight / Z !== H || stage.clientWidth / Z > W) { measure(); draw(); } }).observe(stage);
  }
  onChange(mqDark, function () { readPalette(); draw(); });
  if (window.MutationObserver) {
    new MutationObserver(function () { readPalette(); draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (window.IntersectionObserver) {   // skip drawing while the game is scrolled out of view
    new IntersectionObserver(function (en) { stageVisible = en[0].isIntersecting; }).observe($('game'));
  }

  window.crabminer = { sim: sim, state: function () { return S; }, view: function () { return { stormA: stormA, lavaA: lavaA, nightA: nightA, rain: rain.length, T: T, whale: !!whale, cargo: cargo.phase, selected: selected && selected.id, Z: Z }; }, at: function (c) { var px = crabX(c); return { x: px * Z, y: (groundY(px, c.d) - 10 * scaleAt(c.d)) * Z }; }, summary: runSummary, talk: function () { var o = {}; Object.keys(TALK).forEach(function (k) { o[k] = talkCount[k] || 0; }); return o; }, select: function (c) { selected = c; selectedUntil = T + 5; }, summonWhale: function () { whale = { x: W * 0.5, y: (surfH + base[0]) / 2, v: 50, id: ++whaleId, ph: 0 }; } };   // for poking at the economy from the console
  try { best = parseFloat(localStorage.getItem('crabminer-best')) || null; } catch (e) { best = null; }
  readPalette();
  var bigPref = null;
  try { bigPref = localStorage.getItem('crabminer-big'); } catch (e) { /* storage may be unavailable */ }
  if (bigPref !== '0') { document.body.classList.add('big'); ui.bigBtn.setAttribute('aria-pressed', 'true'); }   // the big field is the default
  measure();
  wire();
  started = true;                       // straight into the game, the saved one if there is one; the ? button brings up the intro
  var resumed = loadGame();
  if (!resumed) newGame();
  ui.intro.hidden = true;
  renderPanel(); renderHUD();
  if (stage.scrollWidth > stage.clientWidth) stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * (document.body.classList.contains('big') ? 0.62 : 0.55);
  draw();
  start();
  if (resumed) toast('Welcome back to day ' + S.day + '.', 'Your crew kept your place: ' + money(S.credits) + ' in the bank. New game is under ?.');
  else toast('It\'s a Crab Mining Game.', 'Hire crabs, sell metal up the riser, and climb to Crab Tycoon. Press ? for how to play.');
})();
