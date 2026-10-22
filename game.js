// ===== The view, part 1: state, sound, talk, and the economy's events =====
// The view is four classic scripts, game.js, scene.js, crabs.js and controls.js, that share one global scope:
// every top-level var and function here is a window property the other three use, so each file is a chapter, not a module.
// This chapter keeps the view's state (the sim, the canvas, the clock, the palette), the sound, the dunes' geometry, the small
// effects, the crabs' talk, what each of the sim's events looks like, and update(), the per-frame step that drives the sim.
'use strict';

var $ = function (id) { return document.getElementById(id); };
var cv = $('scene'), stage = $('stage'), inner = $('stage-inner');
var ctx = cv && cv.getContext ? cv.getContext('2d') : null;   // null only on a page without the stage; then nothing below boots
var root = document.documentElement;
var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
var mqDark = window.matchMedia('(prefers-color-scheme: dark)');
var mqSmall = window.matchMedia('(max-width: 30rem)');
var TAU = Math.PI * 2;

var sim = CrabSim(), K = sim.K, S = null;
var W = 0, H = 0, Z = 1, DPR = 1, T = 0, last = 0, raf = 0, running = false, acc = 0, speed = 1, uiTick = 0, ledgerTick = 0;
var CS = 1, surfH = 0, F = 0, lavaL = 0, base = [0, 0, 0], farBase = 0, dunePaths = [], farPath = null, grain = null;
var pal = {};
// ----- sound: a few synthesised notes and noises through Web Audio, off until the player turns it on -----
var sfx = (function () {
  var on = false, ac = null, master = null, raveUntil = 0, raveStep = 0, nextRave = 0;
  function ready() {
    if (!on) return false;
    try {
      if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.22; master.connect(ac.destination); }
      if (ac.state === 'suspended') ac.resume();
      return ac.state !== 'closed';
    } catch (e) { return false; }
  }
  function tone(f, dur, type, vol, slideTo, at) {   // one note: an oscillator with a quick attack and a fade
    if (!ready()) return;
    var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + (at || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, lowpass, at) {           // a puff of filtered noise: sand, cracks, rumbles
    if (!ready()) return;
    var n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), data = buf.getChannelData(0), i, src = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter(), t0 = ac.currentTime + (at || 0);
    for (i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    src.buffer = buf; fl.type = 'lowpass'; fl.frequency.value = lowpass || 1200;
    g.gain.setValueAtTime(vol || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(master); src.start(t0);
  }
  var RAVE = [523, 659, 784, 659, 880, 784, 659, 523, 587, 698, 880, 698, 988, 880, 698, 587];   // a bouncy riff, two bars
  return {
    isOn: function () { return on; },
    set: function (v) { on = !!v; if (on) ready(); else if (ac && ac.state === 'running') ac.suspend(); },
    click: function () { tone(1400, 0.03, 'square', 0.08); },
    coin: function (big) { tone(880, 0.09, 'triangle', 0.35); tone(1320, 0.14, 'triangle', 0.3, 0, 0.07); if (big) tone(1760, 0.2, 'triangle', 0.3, 0, 0.14); },
    tick: function () { tone(220, 0.04, 'square', 0.12); },
    crack: function () { noise(0.12, 0.5, 3000); tone(160, 0.08, 'sawtooth', 0.2, 60); },
    chime: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.35, 'sine', 0.3, 0, i * 0.08); }); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.35, 0, i * 0.12); }); tone(1047, 0.5, 'triangle', 0.3, 0, 0.5); },
    bubble: function () { tone(600 + Math.random() * 500, 0.09, 'sine', 0.12, 1400); },
    splash: function () { noise(0.25, 0.25, 2400); },
    rumble: function (dur) { noise(dur || 4, 0.5, 120); },
    wind: function () { noise(3, 0.2, 500); },
    whale: function () { tone(170, 2.6, 'sine', 0.3, 95); tone(255, 2.2, 'sine', 0.12, 140, 0.3); },
    thud: function () { tone(90, 0.15, 'sine', 0.4, 40); },
    sigh: function () { tone(440, 0.3, 'sine', 0.12, 300); },
    rave: function (secs) { raveUntil = T + (secs || 5); },
    step: function () {                               // the crab-rave tune: a note every eighth while the rave lasts
      if (!on || T >= raveUntil || T < nextRave) return;
      nextRave = T + 0.14; tone(RAVE[raveStep % RAVE.length], 0.12, 'square', 0.14); if (raveStep % 4 === 0) tone(RAVE[raveStep % RAVE.length] / 4, 0.12, 'triangle', 0.2); raveStep++;
    }
  };
})();
var puffs = [], flights = [], lifts = [], rivalLifts = [], sparks = [], embers = [], weeds = [], kelp = [], snow = [], bubbles = [], lavaBub = [], floaters = [], confetti = [], rings = [];
var debris = [], nightA = 0, lastShift = '', big = false, lastTrend = 0, surgeToast = false, buryToast = false, inks = [];
var stormA = 0, lavaA = 0, flash = 0, rain = [], bombs = [];
var ecoLogSeen = 0, labToast = false, traderBubble = 0, vetToast = false, turtleToast = false, mantaToast = false, driftToast = false, cargo = { x: -1, phase: 'gone' }, whale = null, nextWhale = 60, whaleId = 0, whaleToast = false, glowToast = false, eelToast = false, eelA = 0, eelSnapT = -9, eelAim = 0, chimneyToast = false, lampToast = false, chimneyA = 0, insureToast = false, gullToast = false, fineToast = false;
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
  // the pinch zoom lays the canvas out as if the stage were `zoom` times bigger, and the stage scrolls both ways over it
  var cw = stage.clientWidth / Z * zoom, h = stage.clientHeight / Z * zoom, widthChanged;
  if (!cw || !h) return;
  big = document.body.classList.contains('big') || mqSmall.matches;   // small screens always get the big field's dunes
  CS = big ? clamp(Math.min(h / 360, cw / 640), 0.8, 1.9 * zoom) : clamp(Math.min(h / 470, cw / 860), 0.65, 1.45 * zoom);
  var w = Math.max(cw, Math.round((big ? 1150 : 860) * CS));   // the big field is wider than the screen: it scrolls
  widthChanged = w !== W;
  W = w; H = h;
  DPR = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(9e6 / (W * H))) * Z;   // zoomed in, no more than about nine million device pixels
  inner.style.width = W * Z + 'px'; inner.style.height = zoom > 1.002 ? H * Z + 'px' : '';
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
  if (widthChanged) { decorate(); ecoDirty = true; }
}
function decorate() {
  var i, j, n;
  weeds = []; kelp = [];
  for (i = 0; i < 3; i++) {                                  // the kelp forest: a stand of fronds on each dune at the field's left end
    n = Math.round(clamp(W / 90, 8, 16));
    for (j = 0; j < n; j++) kelp.push({ x: rr(K.FIELD0 + 4, K.KELP1 - 6), d: rr(K.ZONES[2 - i].d0, K.ZONES[2 - i].d1), k: i, front: Math.random() < 0.4, h: rr(38, 80), ph: rr(0, TAU), amp: rr(5, 11), sw: 1 });
  }
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
  bubbles = []; plankton = []; ecoDirty = true;
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
  needIngot: ['🪙❓', '🪙👀❓'], stockFull: ['🪙⛔', '🪙📦😅'], smelted: ['🪙✅🎶', '🔥🪙😎'], fineIngot: ['🪙✨🤩', '✨🪙✨'], annex: ['🪨⬆️🏗️', '🪨🏗️👍'], yard: ['🏗️🏃', '🪨❓🏗️'],
  toForgeIngot: ['🪙➡️🔥', '🪙🏃🔥'], toForgeBar: ['🧱➡️🔥', '🧱🏃🔥'], needHeat: ['🔥❓', '🔥🥶❓'],
  wake: ['☀️👋', '🥱☀️'], ride: ['🌋⬆️😆', '💨⬆️🤩'], land: ['🦀✅', '🦀👌'], oc: ['⚡💪', '⚡🏃💨'], rave: ['🎉🦀🎶', '🕺🦀💃'],
  dance: ['🎶🦀🦀🎶', '💃🦀🕺', '🦀❤️🦀'], morning: ['☀️💪', '☀️😄👋'],
  help: ['🦀🤝🦀', '💪🦀❓', '🦀🏃🤝'], helpRun: ['🏃🦀🦀🏃', '🦀💨🦀💨'], dig: ['⛏️😴', '🏖️💤', '🕳️🥱'],
  postGrab: ['🔌➡️', '🔌🏃'], postGrabTide: ['🔌🌊👍', '🔌🌊💪'], postDrift: ['🔌🌊❗', '🔌🌊😮'],
  pearl: ['🦪❗🎉', '🦪✨🤩'], chestFound: ['🧰❗👀', '🧰✨😮'], chest: ['🧰💰🎉', '🧰✨🤩'], flagsWashed: ['🚩💔🌊', '🌊🚩😭'], stack: ['🪨👍', '🪨📦👍'], stackBroken: ['⛏️💔🪨👍', '⛏️💔🪨💪'],
  spareBit: ['🛒⛏️👍', '🛒⛏️😊'], spareLeg: ['🛒🦵👍', '🛒🦵😊'], turtlePick: ['🐢😆', '🐢⬆️🤩'], turtleDrop: ['🐢❤️', '🐢👋😊'], glow: ['✨👀😊', '✨🦀👍'],
  decor: ['🐚✨🏠', '🏠🎀😍'], orderStart: ['🚢🪙❗', '🚢👀🪙'], orderDone: ['🚢✅🎉', '🚢🪙🥳'],
  rivalArrive: ['🦞❗😨', '🦞👀😬'], rivalWin: ['🦞🚢😤', '🦞🏆😒'], storm: ['🌩️😨', '🌊🌩️😱'], lava: ['🌋🔥🎉', '🌋🔥😎'],
  octoScared: ['🐙⛔', '🐙👊😤'], octoShoo: ['🐙🏃', '🐙👋😆'], octoSteal: ['🪨💔🐙', '🐙🪨😱'], eelSnap: ['🐍🪨😱', '🪨💔🐍'], eelShoo: ['🐍🏃', '🐍👋😆'], veteran: ['⭐🦀💪', '⭐✨😎'], whale: ['🐋👋', '🐋😮✨'],
  festival: ['🎪🎉🦀', '🏮🎶🦀', '🎪🥳'], mantaPick: ['🪁⬆️🤩', '🪁😆'], mantaDrop: ['🪁❤️', '🪁👋😊'], pet: ['🐾❤️🏠', '🐾😍'], petPat: ['🐾😊', '🐾❤️'],
  happy: ['🎶😊', '😄✨', '🦀😊🎶'], grumpy: ['😤💢', '😒💢', '🦀😤'], boom: ['📰📈🤩', '🪙📈😎'], glut: ['📰📉😩', '🪙📉😒'], rumour: ['📰🤷', '📰👀❓'],
  quake: ['😱🌊💥', '😵💫', '💥🦀😨'], achievement: ['🏆✨🎉', '🏆😎'],
  apprentice: ['🎓❓🦀', '🎓👀😅'], graduate: ['🎓✅🎉', '🎓💪😎'], contractOffer: ['📜🪙❓', '📜👀🪙'], contractDone: ['📜✅🎉', '📜🪙🥳'], contractFail: ['📜❌😩', '📜💔😤'],
  chimney: ['♨️⬆️😆', '♨️💨🤩'], lamp: ['🔦👀😊', '🔦🦀👍'],
  kelp: ['🌿🌿😅', '🌿🦀💨', '🌿👀✨'], belt: ['🪨🛤️👍', '🛤️🪨😎'], pad: ['🔌⚡😊', '⚡🦀👍'], newSite: ['🏕️🦀❗', '🏕️✨🤩', '🏕️💪'],
  gull: ['🐦🪨😱', '🪨💔🐦', '🐦👊😤'],
  market: ['🏮🛒🌙', '🌙🐚🛒', '🏮🦀😍'], cake: ['🎂😋', '🎂🦀❤️', '🍰🥳'], wreck: ['⛵❗👀', '⛵🔩😮', '🛶❓🦀'], plate: ['🔩🧱👍', '⛵🔩💪'], plateStack: ['🧱✅😎', '⛵🧱👍'],
  paddle: ['💦🦀😆', '🌊🦀😊', '💦🐾🦀']
};
var TALK_LABEL = {   // what each kind of talk means, for the tally in the Ledger
  needCharge: 'Asking for a charge', bringCharge: 'Bringing a charge', gotCharge: 'Thanks for a charge', ebotBreak: 'An energy bot wearing out',
  bitBreak: 'A drill bit snapping', needBit: 'Asking for a new bit', onBit: 'On the way with a bit', bringBit: 'Carrying a bit over', fixedBit: 'A bit fitted',
  legOff: 'A leg coming off', needLeg: 'Asking for a new leg', onLeg: 'On the way with a leg', bringLeg: 'Carrying a leg over', mended: 'A leg mended',
  strike: 'Striking metal', dry: 'A dry hole', flag: 'Flagging a deposit', miss: 'A scan that found nothing',
  needOre: 'Waiting for nodules', oreFull: 'The ore pile is full', needBar: 'Waiting for bars', barFull: 'The bar stack is full',
  needIngot: 'Waiting for ingots', stockFull: 'The stockpile is full', smelted: 'An ingot smelted', fineIngot: 'A fine ingot smelted', annex: 'A nodule stacked at the annex', yard: 'A crusher moving to the other yard',
  toForgeIngot: 'An ingot to the forge', toForgeBar: 'A bar to the forge', needHeat: 'The engine is cold',
  wake: 'Waking up', ride: 'Riding the vent', land: 'Landing from the vent', oc: 'Overclocked', rave: 'The crab rave',
  dance: 'Dancing with a friend', morning: 'Morning bonus', help: 'Lending a claw', helpRun: 'Running claw in claw', dig: 'Digging in to sleep', postGrab: 'Moving the refuel post', postGrabTide: 'Fetching the post back from the tide', postDrift: 'The tide moving the post',
  pearl: 'Finding a pearl', chestFound: 'Finding a sunken chest', chest: 'Opening a sunken chest', flagsWashed: 'The tide burying flags', stack: 'Stacking nodules', stackBroken: 'Hauling with a broken bit',
  spareBit: "Fitting the trader's spare bit", spareLeg: "Fitting the trader's spare leg", turtlePick: 'Climbing on the turtle', turtleDrop: 'Thanking the turtle', glow: 'Seeing by the glowing plankton',
  decor: 'Decorating the den', orderStart: 'A ship order', orderDone: 'An order filled', rivalArrive: 'The rival crew turning up', rivalWin: 'The rival filling an order',
  storm: 'A storm', lava: 'A lava surge', octoScared: 'Facing down the octopus', octoShoo: 'The octopus shooed', octoSteal: 'The octopus stealing ore', eelSnap: 'The eel snapping', eelShoo: 'The eel shooed',
  veteran: 'Earning a star', whale: 'Waving at the whale',
  festival: 'Festival day', mantaPick: 'Swept up by the manta', mantaDrop: 'Thanking the manta', pet: 'A pet moving in', petPat: "Petting the den's pet",
  happy: 'In a good mood', grumpy: 'In a bad mood', boom: 'A copper boom', glut: 'A glut at the surface', rumour: 'A rumour from the surface', quake: 'An earthquake', achievement: 'An achievement won',
  apprentice: 'An apprentice starting', graduate: 'An apprentice graduating', contractOffer: 'A contract offered', contractDone: 'A contract filled', contractFail: 'A contract run out',
  chimney: 'Riding the hydrothermal chimney', lamp: 'Seeing by the lighthouse lamp',
  kelp: 'Pushing through the kelp forest', belt: 'Dropping ore on the conveyor', pad: 'Topping up on the charging pad', newSite: 'A new dig site', gull: 'A gull snatching a nodule',
  market: 'The night market', cake: 'A slice of festival cake', wreck: 'A wreck on the back dune', plate: 'Prising a plate off the wreck', plateStack: 'A plate stacked as a bar', paddle: 'Paddling in the tide pool'
};
var TALK_KEY = new Map(), talkCount = {}, TALK_SAVE_KEY = 'crabminer-talk';   // which situation a phrase list is, and how often each was said
Object.keys(TALK).forEach(function (k) { TALK_KEY.set(TALK[k], k); });
var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
var WORDS = { '🔋': 'charge', '🦵': 'leg', '⛏': 'bit', '🪨': 'ore', '🧱': 'bar', '🪙': 'ingot', '🚩': 'flag', '🔥': 'forge', '🌋': 'vent',
  '🦀': 'crab', '❓': '?', '➡': '>', '👍': 'ok', '✅': 'done', '💔': 'broke', '⛔': 'full', '❗': '!', '❤': '♥', '❌': 'no',
  '😭': ':(', '😤': '#@!', '🤷': '?', '🎉': 'yay', '🎶': '♪', '😵': '@_@', '☀': 'up', '👋': 'hi', '⬆': '^', '😆': ':D', '⚡': 'zap', '💪': '!', '🔌': 'plug', '💨': '~', '🐙': 'octopus', '🦪': 'pearl', '🌊': 'tide', '🏃': 'run', '🌩': 'storm', '😨': 'eek', '🚢': 'ship', '🐋': 'whale', '🐚': 'shell', '✨': 'shiny', '🏠': 'den', '🐢': 'turtle', '🛒': 'shop', '⭐': 'star', '🦞': 'rival',
  '😩': 'ugh', '😊': ':)', '🔧': 'fix', '💥': 'bang', '😫': 'ugh', '🙈': 'oops', '😱': 'eek!', '🕳': 'hole', '😒': 'meh', '👀': 'look',
  '😴': 'zz', '📦': 'stack', '😅': 'phew', '😎': 'cool', '🥶': 'cold', '🥱': 'yawn', '🤩': 'wow', '👌': 'ok', '🕺': 'dance', '💃': 'dance',
  '😄': ':D', '😮': 'oh', '🎀': 'bow', '😍': '<3', '🥳': 'party', '😬': 'yikes', '🏆': 'won', '👊': 'pow', '🧰': 'chest', '💰': 'loot', '🐍': 'eel',
  '🎪': 'festival', '🏮': 'lantern', '🪁': 'manta', '🐾': 'pet', '💢': 'grr', '📰': 'news', '📈': 'up', '📉': 'down', '💫': 'dizzy',
  '🎓': 'apprentice', '📜': 'contract', '♨': 'chimney', '🔦': 'lamp', '🌿': 'kelp', '🛤': 'belt', '🏕': 'site', '🐦': 'gull', '🏗': 'annex' };
var NEWS_HEADLINES = {   // three headlines a kind; the sim picks which (S.news.n)
  boom: ['Copper boom at the surface!', 'Shipyards bid up every ingot!', 'Metal shortage on land: prices soar!'],
  glut: ['Glut at the docks: ingots pile up unsold', 'A rival port floods the market', 'Smelters on land undercut the sea'],
  rumour: ['Rumour of a boom... that comes to nothing', 'Traders whisper of a glut, then shrug', 'A headline about crabs. Nobody reads it']
};
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
  if (c.role === 'haul' && c.state === 'stack' && (sim.pileOf(c) === 2 ? S.ore2 : S.ore) >= sim.oreCap()) return TALK.oreFull;
  if (c.role === 'crush' && c.state === 'wait' && (sim.yardOf(c) === 2 ? S.ore2 : S.ore) < 2) return TALK.needOre;
  if (c.role === 'crush' && c.state === 'hold') return TALK.barFull;
  if (c.role === 'smelt' && c.state === 'grab' && c.carry !== 'bar' && S.bars <= 0) return TALK.needBar;
  if (c.role === 'smelt' && c.state === 'drop' && S.stock >= K.STOCK_CAP) return TALK.stockFull;
  if (c.role === 'repair' && c.state === 'fetch' && c.carry !== 'ingot' && S.stock <= 0) return TALK.needIngot;
  if (c.role === 'mech' && c.state === 'fetch' && c.carry !== 'bar' && S.bars <= 0) return TALK.needBar;
  if (c.role === 'energy' && c.state === 'refill' && S.heat < 1) return TALK.needHeat;
  return null;
}
function crabX(c) { return X(c.x); }
function clawPos(c, side) { var s = scaleAt(c.d), px = crabX(c); return { x: px + side * 15 * s, y: groundY(px, c.d) - 12 * s }; }
function oreSlot(i, pile) {          // the ore pile is a pyramid, six nodules wide; the annex pile the same on the middle dune
  var d = pile === 2 ? K.ANNEX_D : 0.8, row = 0, size = 6, k = i, s = scaleAt(d), rp = 4 * s, px = X(pile === 2 ? S.pos.ORE2 : S.pos.ORE);
  while (k >= size && size > 1) { k -= size; size--; row++; }
  return { x: px + (k - (size - 1) / 2) * rp * 2.3, y: groundY(px, d) - rp * 0.8 - row * rp * 1.45 };
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
function chimneyTop(x) { return Math.max(ventTop() + H * 0.06, groundY(X(x), K.CHIMNEY_D) - H * 0.2); }   // the smaller column tops out lower
function airPos(c) {                 // where a crab riding the vent or the chimney, or swimming down from it, is drawn
  var px = crabX(c), gy = groundY(px, c.d) - 9 * scaleAt(c.d), top = c.air && c.air.vent === 'chimney' ? chimneyTop(c.air.col) : ventTop();
  return { x: px + (c.air && c.air.phase === 'rise' ? Math.sin(T * 5 + c.vph) * 4 * CS : 0), y: gy + (top + 14 * CS - gy) * c.alt };
}

// ----- the economy's events become things you can see -----
function fly(kind, from, to, dur, extra) {
  var f = { kind: kind, x0: from.x, y0: from.y, to: to, t: 0, dur: dur };
  if (extra) for (var k in extra) f[k] = extra[k];
  flights.push(f);
}
function incoming(tag) { var n = 0; for (var i = 0; i < flights.length; i++) if (flights[i].tag === tag) n++; return n; }
var SOUNDS = {                         // which event makes which noise
  sell: function (e) { sfx.coin(e.a >= 15); }, pearl: sfx.chime, chest: sfx.chime, strike: sfx.tick, dry: sfx.sigh, bitBreak: sfx.crack, legOff: sfx.crack, ebotBreak: sfx.crack,
  rank: function () { sfx.fanfare(); sfx.rave(5); }, festival: function () { sfx.fanfare(); sfx.rave(20); }, orderDone: sfx.fanfare, contractDone: function () { sfx.fanfare(); sfx.rave(4); }, achievement: sfx.chime, veteran: sfx.chime, graduate: sfx.chime,
  ride: sfx.bubble, land: sfx.splash, quakeStart: function () { sfx.rumble(6); }, stormStart: sfx.wind, lavaStart: function () { sfx.rumble(2); }, octoShoo: sfx.splash, eelShoo: sfx.splash, sharkScare: sfx.splash,
  bar: sfx.thud, stack: sfx.tick, marketOpen: sfx.chime, plateStacked: sfx.thud, wreck: sfx.splash, chimneyOpen: function () { sfx.rumble(1.5); }, build: sfx.thud, tech: sfx.chime, wup: sfx.coin, join: sfx.bubble, pet: sfx.chime, newSite: sfx.fanfare
};
function handle(e) {
  var a = e.a, p, m, i, j;
  if (started && SOUNDS[e.type]) SOUNDS[e.type](e);
  switch (e.type) {
    case 'join': a.vfall = started ? 1 : 0; a.vjoin = true; break;
    case 'leave': p = crabX(a); burst(p, groundY(p, a.d) - 10, 6); near(a.x, 70).forEach(function (n) { play(n, ['wave', 'bow'], 1.6); }); break;
    case 'strike': p = X(a.x); poof(p, groundY(p, a.d), 8, 0.8); express(a, 'joy', 1.2); a.vhop = 1; say(a, TALK.strike, 1.4); play(a, ['pump', 'hopJoy', 'clap', 'jazz', 'backflip', 'twirl', 'hopTwirl'], 1.4); break;
    case 'uncover': p = X(a.x); poof(p, groundY(p, a.d), 5, 0.6); near(a.x, 30).forEach(function (n) { if (n.role === 'drill') play(n, ['cheer', 'spin'], 1.6); }); break;
    case 'dry': p = X(a.x); poof(p, groundY(p, a.d), 6, 0.5, pal.sandBack); express(a, 'grumble', 1.5); say(a, TALK.dry, 1.5); play(a, ['stomp', 'grumble', 'slump', 'shrug', 'facepalm', 'sulk'], 1.6); break;
    case 'bitBreak': p = clawPos(a, 0); spark(p.x, p.y + 10, 10, pal.drill); express(a, 'shock', 1.6); a.vhop = 0.6; say(a, TALK.bitBreak, 2); play(a, ['shock', 'ouch'], 1.6); break;
    case 'flag':
      e.b.vborn = T; p = X(e.b.x); rings.push({ x: p, y: groundY(p, e.b.d), t: 0, c: e.b.chest ? pal.ingot : pal.scout }); express(a, 'eureka', 1.4); a.vhop = 0.8;
      say(a, e.b.chest ? TALK.chestFound : TALK.flag, 1.5); play(a, ['jazz', 'pump', 'disco'], 1.5);
      if (e.b.chest) toast('A scout found a sunken chest', 'It is on the back dune. The next drill crab to reach it breaks it open: credits, and one of the trader\'s goods for free.');
      break;
    case 'miss': express(a, 'shrug', 1.4); say(a, TALK.miss, 1.4); play(a, ['shrug', 'think', 'sigh'], 1.5); break;
    case 'flagDone': p = X(a.x); poof(p, groundY(p, a.d) - 6, 5, 0.5); near(a.x, 40).forEach(function (n) { if (n.role === 'drill') play(n, ['bow', 'wave'], 1.4); }); break;
    case 'stack':
      if (/belt/.test(e.b)) { fly('nod', clawPos(a, 1), beltPoint(K.BELT_HEAD), 0.3, { tag: 'belt', fine: /Fine/.test(e.b) }); if (Math.random() < 0.15) say(a, TALK.belt, 1.4); }
      else if (/annex/.test(e.b)) { fly('nod', clawPos(a, 1), oreSlot(Math.max(0, S.ore2 - 1), 2), 0.32, { tag: 'ore2', fine: /Fine/.test(e.b) }); if (Math.random() < 0.15) say(a, TALK.annex, 1.4); }
      else fly('nod', clawPos(a, 1), oreSlot(Math.max(0, S.ore - 1)), 0.32, { tag: 'ore', fine: /fine/.test(e.b) });
      if (a.load === 0) { express(a, 'phew', 1); if (Math.random() < 0.4) play(a, ['flex', 'sigh'], 1.2); }
      break;
    case 'belted': fly('nod', beltPoint(S.pos.BELT_END), oreSlot(Math.max(0, S.ore - 1)), 0.3, { tag: 'ore', fine: !!e.b }); break;
    case 'fineSell':                                   // the ingot on its way up was a fine one: mark its flight and sparkle
      for (i = flights.length - 1; i >= 0; i--) if (flights[i].lift) { flights[i].fine = true; break; }
      p = chuteMouth(); spark(p.x, p.y, 6, pal.light);
      break;
    case 'padOn': p = clawPos(a, 0); spark(p.x, p.y + 6 * CS, 4, pal.light); if (Math.random() < 0.25) say(a, TALK.pad, 1.4); break;
    case 'insurance': if (started) toast(a ? 'Insured' : e.b === 'lapsed' ? 'The insurance has lapsed' : 'Insurance cancelled', a ? 'The insurer pays $' + K.INSURE_NODULE + ' for every nodule the octopus gets away with or a quake buries, and $' + K.INSURE_FLAG + ' for every flag the tide, a storm or a quake buries. The premium is $' + K.INSURE_DAY + ' a day, taken at dawn.' : e.b === 'lapsed' ? 'There was not $' + K.INSURE_DAY + ' for the premium at dawn. Insure again from the Build tab.' : 'No more premiums, and no more payouts.'); break;
    case 'insurePay': floater('+$' + a + ' insured', collectorBase().x, collectorBase().y - 70 * CS, false); if (!insureToast && started) { insureToast = true; toast('The insurer paid $' + a, 'For what the ' + e.b + ' took. The Ledger keeps premiums against payouts.'); } break;
    case 'insurePremium': break;
    case 'sharkScare':
      ink(a); near(a.x, 160).forEach(function (n) { say(n, TALK.octoShoo, 1.4); play(n, ['cheer', 'pump', 'sparkleEyes'], 1.6); });
      toast('The shark chased the octopus off!', a && e.b ? 'It dropped the ' + e.b + ' nodule' + (e.b > 1 ? 's' : '') + ' it took. The sea looks after its own now and then.' : 'It fled empty-handed. The sea looks after its own now and then.');
      break;
    case 'gullSnatch':
      p = crabX(a); poof(p, groundY(p, a.d) - 8 * CS, 6, 0.6); express(a, 'shock', 1.6); a.vhop = 0.8; say(a, TALK.gull, 1.8); play(a, ['shock', 'stomp', 'lookAround'], 1.6);
      if (!gullToast) { gullToast = true; toast('A gull snatched a nodule', 'It swooped on ' + a.name + ' along the back dune\'s crest, where the sky is close. Haulers there carry at their own risk.'); }
      break;
    case 'newSite':
      S = sim.state(); freshView(); won = false;
      toast('Dig site ' + a + ': fresh dunes', (e.b.kind === 'tech' ? TECH_INFO[e.b.id].name + ' came along, researched already.' : e.b.kind === 'decor' ? 'The den\'s ' + e.b.n + ' decorations came along.' : e.b.name + ' the ' + ROLE_NOUN[e.b.role] + ' came along, stars and all.') + ' Your career record is in the Ledger.');
      S.crabs.forEach(function (n, j2) { play(n, ['salute', 'pointUp', 'lookAround'], 2); if (j2 % 2 === 0) say(n, TALK.newSite, 2.2); });
      break;
    case 'feed': m = sim.yardOf(a); p = m === 2 ? S.ore2 : S.ore; fly('nod', oreSlot(p + 1, m), clawPos(a, -1), 0.3, { fine: a.fine }); fly('nod', oreSlot(p, m), clawPos(a, -1), 0.36, { fine: a.fine }); break;
    case 'bar': p = clawPos(a, 1); m = sim.yardOf(a) === 2; fly('bar', p, barSlot(Math.max(0, S.bars - 1)), m ? 2.2 : 0.32, { tag: 'bars', fine: e.b, cable: m }); poof(crabX(a), groundY(crabX(a), a.d) - 6 * CS, 5, 0.5, pal.barDark); if (e.b) spark(p.x, p.y, 5, pal.ingot); if (Math.random() < 0.35) play(a, ['clap', 'flex'], 1.2); break;
    case 'yard': express(a, 'determined', 1.4); say(a, TALK.yard, 1.5); play(a, ['pointUp', 'salute', 'determined'], 1.4); break;
    case 'grab': fly('bar', barSlot(S.bars), clawPos(a, -1), 0.26, { fine: a.nFine > 0 }); break;
    case 'ingot':
      express(a, 'proud', 1.4); if (Math.random() < 0.5) say(a, e.b ? TALK.fineIngot : TALK.smelted, 1.3); play(a, e.b ? ['sparkleEyes', 'spin', 'hopJoy'] : ['flex', 'pump', 'clap'], 1.2); spark(clawPos(a, 1).x, clawPos(a, 1).y, 5, pal.lavaHot);
      if (e.b) { spark(clawPos(a, 1).x, clawPos(a, 1).y - 8 * CS, 8, pal.light); if (!fineToast && started) { fineToast = true; toast((emojiOK ? '✨ ' : '★ ') + 'Fine metal!', a.name + ' smelted a fine ingot from a rich deposit (richness ' + K.FINE_Q + ' or more). It goes on its own shelf by the stockpile and sells for half as much again. Keep some back with the fine reserve beside the stockpile in the top bar.'); } }
      break;
    case 'stock':
      if (e.b) { for (i = 0; i < e.b; i++) fly('ingot', clawPos(a, 1), fineSlot(Math.max(0, S.stockFine - 1 - i)), 0.34 + i * 0.05, { tag: 'stockFine', fine: true }); }
      if (a.n > e.b) fly('ingot', clawPos(a, 1), stockSlot(Math.max(0, S.stock - S.stockFine - 1)), 0.34, { tag: 'stock' });
      break;
    case 'sell':
      fly('ingot', stockSlot(S.stock), chuteMouth(), 0.4, { lift: true, value: a, streak: e.b });
      if (a >= 15) near(S.pos.COLLECTOR, 140).forEach(function (n) { play(n, ['cheer', 'headbang', 'disco', 'sparkleEyes', 'cartwheel', 'backflip', 'bigWave'], 2); });
      else if (Math.random() < 0.3) { var nb = near(S.pos.COLLECTOR, 120); if (nb.length) play(anyOf(nb), ['clap', 'jazz', 'whistle'], 1.4); }
      if (e.b === 5 || e.b === 10 || e.b === 20) near(S.pos.STOCK, 160).forEach(function (n) { play(n, { 5: 'shimmy', 10: 'robot', 20: 'floss' }[e.b], 2.4); });
      break;
    case 'takeMat': if (!sim.has(a.role === 'repair' ? 'pocketForge' : 'mechForge')) say(a, a.role === 'repair' ? TALK.toForgeIngot : TALK.toForgeBar, 1.6);
      if (a.role === 'repair') fly('ingot', stockSlot(S.stock), clawPos(a, 1), 0.3); else fly('bar', barSlot(S.bars), clawPos(a, 1), 0.3); break;
    case 'forged': p = clawPos(a, 1); spark(p.x + 8 * CS, p.y, 10, pal.lavaHot); express(a, 'proud', 1.2); say(a, a.role === 'mech' ? TALK.bringLeg : TALK.bringBit, 2); break;
    case 'legOff': debris.push({ x: a.x, d: a.d, crab: a, rot: rr(-1, 1) }); p = clawPos(a, -1); spark(p.x, p.y + 8, 8, pal.metal); express(a, 'ouch', 1.8); a.vhop = 0.5; say(a, TALK.legOff, 2); break;
    case 'sleep': express(a, 'yawn', 1.2); a.anim = null; a.vsleep = sleepForm(a, T); if (a.vsleep.burrow && Math.random() < 0.5) say(a, TALK.dig, 1.4); break;
    case 'help': if (Math.random() < 0.6) say(a, TALK.help, 1.4); express(a, 'proud', 1); break;
    case 'holdClaw':                                   // claws meet: a high-five from the helper, a little dance from the friend it helps
      if (e.b && e.b.role === 'energy') say(a, TALK.helpRun, 1.5); else express(a, 'joy', 1);
      play(a, 'highFive', 0.8); if (e.b) { e.b.vpd = crabX(a) >= crabX(e.b) ? 1 : -1; play(e.b, ['helpedDance', 'wiggle', 'twirl'], 1.2); }
      break;
    case 'helpEnd':                                    // the thanks: both bow, or dance a short duet
      if (a.state === 'bhaul') break;
      if (e.b && !e.b.gone && e.b.state !== 'sleep') { a.vpd = crabX(e.b) >= crabX(a) ? 1 : -1; e.b.vpd = -a.vpd; p = anyOf(['pattyCake', 'highTen', 'twirlDuet', 'thanks']); play(a, p, 1.6); play(e.b, p, 1.6); }
      else play(a, ['wave', 'salute', 'thanks'], 0.9);
      break;
    case 'wake': if (a.vsleep && a.vsleep.burrow) { p = X(a.x); poof(p, groundY(p, a.d), 12, 0.9); play(a, ['shiver', 'shock'], 0.8); } a.vsleep = null;
      express(a, 'stretch', 1.2); say(a, TALK.wake, 1.4); play(a, ['yawnStretch', 'sideStretch', 'wave'], 1.6); break;
    case 'ride':
      if (e.b === 'chimney') { p = X(a.air ? a.air.col : K.CHIMNEY_SPOTS[0]); burst(p, groundY(p, K.CHIMNEY_D) - 6, 8); express(a, 'wheee', 2); say(a, TALK.chimney, 2); }
      else { p = X(K.VENT_IN); burst(p, groundY(p, 0.8) - 6, 6); express(a, 'wheee', 2.5); say(a, TALK.ride, 2.2); }
      break;
    case 'chimneyOpen':
      p = X(a.x); poof(p, groundY(p, a.d), 16, 1, pal.sandLine); spark(p, groundY(p, a.d) - 10 * CS, 10, pal.lavaHot);
      near(a.x, 120).forEach(function (n) { play(n, ['shock', 'curious', 'sparkleEyes', 'lookAround'], 1.8); });
      if (!chimneyToast && started) { chimneyToast = true; toast('A hydrothermal chimney has opened behind the plots', 'For two days crabs near it with a long way to go ride its column up and swim down, either way along the line, and the Stirling engine draws half again as much heat from it.'); }
      else if (started) toast('A hydrothermal chimney has opened', 'It stands behind the plots for two days: a shortcut for the crabs and extra heat for the engine.');
      break;
    case 'chimneyFade': p = X(a.x); poof(p, groundY(p, a.d), 10, 0.7, pal.sandLine); if (started) toast('The chimney has gone cold', 'It gave ' + a.rides + ' ride' + (a.rides === 1 ? '' : 's') + '. Another will open in a while.'); break;
    case 'apprentice': if (started) toast(a.name + ' starts as an apprentice ' + ROLE_NOUN[a.role], 'Half the price, half the pace, and a full ' + ROLE_NOUN[a.role] + ' after a day on the job.'); break;
    case 'graduate':
      p = clawPos(a, 0); spark(p.x, p.y - 10 * CS, 16, pal.ingot); a.vhop = 1; a.vcap = T;   // the cap flies
      say(a, TALK.graduate, 2.2); play(a, ['backflip', 'spin', 'hopJoy', 'flex'], 2);
      near(a.x, 90).forEach(function (n) { if (n !== a) play(n, ['clap', 'cheer', 'bigWave'], 1.6); });
      for (i = 0; i < 30; i++) confetti.push({ x: crabX(a) + rr(-20, 20), y: groundY(crabX(a), a.d) - 30 * CS, vx: rr(-30, 30), vy: rr(-60, 20), r: rr(0, TAU), vr: rr(-6, 6), c: [pal.ingot, pal.warn, pal.light][i % 3], life: 0 });
      if (started) toast(a.name + ' has graduated', 'A full ' + ROLE_NOUN[a.role] + ' now, at full pace. ' + S.stat.graduates + ' apprentice' + (S.stat.graduates === 1 ? ' has' : 's have') + ' graduated.');
      break;
    case 'contractOffer':
      if (started) toast('📜 A contract from the surface: ' + a.need + ' ingots in three days', 'It pays ' + money(a.need * a.pay) + ' and a ' + DECOR_NAMES[a.decor] + ' for the den. Accept it in the Build tab (C) within ' + fmtTime(a.acceptBy - S.t) + '. A contract taken and not filled costs a reputation star; one left alone costs nothing.');
      near(S.pos.STOCK, 140).forEach(function (n, j2) { if (j2 % 2 === 0) say(n, TALK.contractOffer, 2); play(n, ['curious', 'think', 'lookAround'], 1.8); });
      break;
    case 'contractStart': toast('Contract accepted: ' + a.need + ' ingots by day ' + Math.floor(a.until / K.DAY + 1), 'Every ingot up the riser counts. The top bar keeps the tally.'); S.crabs.forEach(function (n) { if (n.role === 'smelt' || n.role === 'crush') play(n, ['salute', 'determined', 'flex'], 1.6); }); break;
    case 'contractLapse': if (started && !e.b) toast('The contract offer has lapsed', 'Nothing lost. Another will come along.'); break;
    case 'contractDone':
      partyUntil = T + 4;
      toast('Contract filled! +$' + e.b, 'The surface pays up, and the crabs hang a ' + DECOR_NAMES[a.decor] + ' by the den. Crab profit!');
      floater('Contract filled! +$' + e.b, collectorBase().x, collectorBase().y - 100 * CS, true);
      for (i = 0; i < 120; i++) confetti.push({ x: rr(0, W), y: rr(-H * 0.3, 0), vx: rr(-20, 20), vy: rr(40, 110), r: rr(0, TAU), vr: rr(-6, 6), c: [pal.ingot, pal.crab, pal.energy, pal.light][i % 4], life: 0 });
      S.crabs.forEach(function (n, j2) { if (n.state !== 'sleep') { play(n, ['cheer', 'jazz', 'disco', 'clap', 'cartwheel', 'bigWave'], 2); if (j2 % 3 === 0) say(n, TALK.contractDone, 2); } });
      break;
    case 'contractFail':
      toast('The contract ran out', 'You sent ' + a.got + ' of ' + a.need + '. Reputation drops to ' + S.rep + ' star' + (S.rep === 1 ? '' : 's') + '. Take a smaller one next time, or none.');
      S.crabs.forEach(function (n, j2) { if (n.role === 'smelt' || j2 % 4 === 0) { play(n, ['slump', 'sigh', 'facepalm'], 1.8); if (j2 % 4 === 0) say(n, TALK.contractFail, 1.8); } });
      break;
    case 'land': p = X(a.x); poof(p, groundY(p, a.d), 8, 0.7); a.vhop = 0.7; say(a, TALK.land, 1); play(a, ['hopJoy', 'bow', 'jazz', 'frontflip', 'balance'], 1.2); break;
    case 'plug': p = postPos(); spark(p.x, p.y - 18 * CS, 4, pal.light); break;
    case 'ocStart': for (i = 0; i < S.crabs.length; i++) { p = clawPos(S.crabs[i], 0); spark(p.x, p.y, 3, pal.light); if (i % 3 === 0) say(S.crabs[i], TALK.oc, 1.6); if (i % 3 === 1) play(S.crabs[i], ['flex', 'determined'], 1.4); } break;
    case 'shiftMode': toast(SHIFT_INFO[a].name, SHIFT_INFO[a].note); S.crabs.forEach(function (n) { play(n, 'salute', 1.2); }); break;
    case 'ocEnd': S.crabs.forEach(function (n, j2) { if (j2 % 2) play(n, 'sigh', 1.2); }); break;
    case 'flowLost': near(S.pos.STOCK, 90).forEach(function (n) { play(n, 'slump', 1.4); }); break;
    case 'dance': a.vpd = e.b.x >= a.x ? 1 : -1; e.b.vpd = -a.vpd; if (Math.random() < 0.5) say(a, TALK.dance, 1.6); break;
    case 'morning': say(a, TALK.morning, 1.8); play(a, ['salute', 'flex', 'jazz', 'yawnStretch', 'stretchUp', 'pointUp'], 1.8); break;
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
    case 'chest':
      m = e.b; p = X(m.flag.x); i = groundY(p, m.flag.d);
      spark(p, i - 6 * CS, 22, pal.ingot); spark(p, i - 6 * CS, 10, pal.light); rings.push({ x: p, y: i, t: 0, c: pal.ingot });
      fly('gold', { x: p, y: i - 6 * CS }, chuteMouth(), 0.9, { lift: true, value: m.value, chest: true });
      say(a, TALK.chest, 2.2); play(a, ['spin', 'jazz', 'hopJoy'], 2);
      near(a.x, 120).forEach(function (n) { if (n !== a) play(n, ['cheer', 'clap', 'sparkleEyes'], 1.8); });
      toast('Sunken treasure! +$' + m.value, 'The chest also held a ' + TRADE_INFO[m.good][0].toLowerCase() + ': ' + TRADE_INFO[m.good][1].charAt(0).toLowerCase() + TRADE_INFO[m.good][1].slice(1));
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
    case 'traderArrive':
      if (a.market) toast('The night market is coming', 'Festival eve: the trader keeps shop by the den all night, with a fourth good, the festival cake.');
      else toast('A hermit-crab trader is coming', 'It keeps shop by the den for a minute. Its goods are in the Build tab.');
      break;
    case 'marketOpen':
      toast('The night market is open', 'Lanterns on the stall until dawn. The festival cake is in the Build tab.');
      near(K.TRADER_SPOT, 160).forEach(function (n) { play(n, ['sparkleEyes', 'bigWave', 'hopJoy', 'curious'], 1.6); if (Math.random() < 0.5) say(n, TALK.market, 1.8); });
      traderBubble = T + 4;
      break;
    case 'wreck':
      p = X(a.x); i = groundY(p, a.d);
      rings.push({ x: p, y: i, t: 0, c: pal.foam }); spark(p, i - 8 * CS, 16, pal.foam);
      toast('A wreck has settled on the back dune', a.plates + ' plates on its hull. Scouts prise them off, a bar each, and carry them to the bar stack.');
      near(a.x, 140).forEach(function (n) { play(n, ['curious', 'shock', 'lookAround'], 1.6); if (Math.random() < 0.5) say(n, TALK.wreck, 1.8); });
      break;
    case 'plate': p = crabX(a); i = groundY(p, a.d); spark(p, i - 8 * CS, 8, pal.metal); say(a, TALK.plate, 1.6); break;
    case 'plateStacked': p = X(S.pos.BAR); i = groundY(p, 0.78); spark(p, i - 8 * CS, 6, pal.metal); say(a, TALK.plateStack, 1.4); play(a, ['salute', 'flex', 'nod'], 1.4); break;
    case 'wreckBare': toast('The wreck is stripped bare', a.plates + ' plates became bars. The hull sinks into the sand.'); break;
    case 'traderOpen':
      near(K.TRADER_SPOT, 120).forEach(function (n) { play(n, ['wave', 'sparkleEyes', 'curious', 'bigWave'], 1.4); });
      traderBubble = T + 3;
      break;
    case 'trade':
      var tp = traderPos(); spark(tp.x, tp.y - 30 * CS, 14, pal.ingot);
      toast('Swapped: ' + TRADE_INFO[a][0], TRADE_INFO[a][1]); traderBubble = T + 2;
      if (a === 'map') S.flags.forEach(function (f) { if (f.map && !f.vborn) { f.vborn = T; var fx = X(f.x); rings.push({ x: fx, y: groundY(fx, f.d), t: 0, c: pal.ingot }); } });
      if (a === 'cake') S.crabs.forEach(function (n) { if (n.state !== 'sleep') { play(n, ['hopJoy', 'cheer', 'clap', 'sparkleEyes', 'hug'], 2); if (Math.random() < 0.4) say(n, TALK.cake, 1.8); } });
      break;
    case 'spareUsed': say(a, a.role === 'repair' ? TALK.spareBit : TALK.spareLeg, 1.6); break;
    case 'turtleArrive': if (!turtleToast) { turtleToast = true; toast('A sea turtle is passing', 'It gives a crab with a long way to go a lift across the dunes.'); } break;
    case 'glow':
      if (e.b === 'lamp') {
        if (!a.say || a.say.until < T) { if (Math.random() < 0.4) say(a, TALK.lamp, 1.4); }
        if (!lampToast) { lampToast = true; toast('The lighthouse lamp lights the way', 'A tired crab in its light works at full speed at night, like one in the glowing plankton. The next level reaches further over the field.'); }
        break;
      }
      if (!a.say || a.say.until < T) { if (Math.random() < 0.4) say(a, TALK.glow, 1.4); }
      if (!glowToast) { glowToast = true; toast('Glowing plankton light the way', 'A tired crab inside a patch of glowing plankton works at full speed at night. The tide pushes the patches along the sand, and storms and ships make them bigger.'); }
      break;
    case 'turtlePick': say(a, TALK.turtlePick, 2); a.vhop = 1; break;
    case 'turtleDrop': p = X(a.x); poof(p, groundY(p, a.d), 8, 0.6); say(a, TALK.turtleDrop, 1.6); play(a, ['bow', 'wave', 'hopJoy'], 1.4); break;
    case 'mantaArrive': if (!mantaToast && started) { mantaToast = true; toast('A manta ray glides over the claim', 'Every crab walking its way beneath it is swept along a short way and set down again. Several at once.'); } break;
    case 'mantaPick': say(a, TALK.mantaPick, 2); a.vhop = 1; break;
    case 'mantaDrop': p = X(a.x); poof(p, groundY(p, a.d), 8, 0.6); say(a, TALK.mantaDrop, 1.6); play(a, ['bow', 'wave', 'hopJoy', 'twirl'], 1.4); break;
    case 'festival':
      if (!started) break;
      partyUntil = T + 20;                             // the festival rave: twenty seconds of claws in the air
      for (j = 0; j < S.crabs.length; j++) if (j % 2 === 0) say(S.crabs[j], TALK.festival, 3);
      for (i = 0; i < 220; i++) confetti.push({ x: rr(0, W), y: rr(-H * 0.4, 0), vx: rr(-20, 20), vy: rr(30, 100), r: rr(0, TAU), vr: rr(-6, 6), c: ['#ff5c5c', '#ffd23f', '#5cc8ff', '#7fe08a', pal.ingot][i % 5], life: 0 });
      toast('Crab festival day!', 'Day ' + a + ': a long rave at dawn, every crab starts fresh, the flow bonus is doubled all day, and the den gets a string of lanterns. Every tenth day is a festival.');
      break;
    case 'happy': if (Math.random() < 0.4) say(a, TALK.happy, 1.6); play(a, ['jazz', 'bounce', 'whistle', 'hopJoy', 'sparkleEyes'], 1.6); break;
    case 'grumpy': if (Math.random() < 0.5) say(a, TALK.grumpy, 1.6); play(a, ['grumble', 'sulk', 'crossArms', 'stomp'], 1.8); break;
    case 'quakeStart':
      toast('Earthquake!', 'The ' + K.ZONES[a.zone].name.toLowerCase() + ' is shaking. Walking is slow for six seconds, and then the sand slides: nodules and idle flags in its path get buried, and the slide bares a rich patch somewhere else.');
      S.crabs.forEach(function (n, j2) { if (n.state === 'sleep') return; if (j2 % 3 === 0) say(n, TALK.quake, 2); play(n, ['dizzy', 'shock', 'nervous', 'struggle', 'hug'], 2.5); });
      break;
    case 'quakeEnd':
      var qz = K.ZONES[a.zone], qb = e.b, qi;
      for (qi = 0; qi < 24; qi++) { p = X(a.x + rr(-K.QUAKE_BAND / 2, K.QUAKE_BAND / 2)); poof(p, groundY(p, rr(qz.d0, qz.d1)), 3, 0.9, pal.sandLine); }
      p = X(qb.x); rings.push({ x: p, y: groundY(p, qb.d), t: 0, c: pal.energy }); spark(p, groundY(p, qb.d) - 8, 12, pal.energy);
      S.flags.forEach(function (f) { if (f.quake && !f.vborn) { f.vborn = T; var fx = X(f.x); rings.push({ x: fx, y: groundY(fx, f.d), t: 0, c: pal.ingot }); } });
      toast('The sand has settled', 'The slide on the ' + qz.name.toLowerCase() + ' buried ' + qb.buried + ' nodule' + (qb.buried === 1 ? '' : 's') + ' and ' + qb.flags + ' flag' + (qb.flags === 1 ? '' : 's') + ', and bared a rich patch of three flags on the ' + K.ZONES[sim.zoneOf(qb.d)].name.toLowerCase() + '.');
      near(qb.x, 80).forEach(function (n) { play(n, ['sparkleEyes', 'pointUp', 'cheer'], 1.8); });
      break;
    case 'newsStart':
      toast('Surface news: ' + NEWS_HEADLINES[a.kind][a.n], a.kind === 'boom' ? 'Ingots fetch 40% more for a minute. Drop the reserve and send everything up.' : a.kind === 'glut' ? 'Ingots fetch 35% less for a minute. Raise the reserve and hold them back if you can.' : 'The price does not move. News is like that.');
      near(S.pos.STOCK, 140).forEach(function (n, j2) { if (j2 % 2 === 0) say(n, TALK[a.kind], 2); play(n, a.kind === 'boom' ? ['cheer', 'sparkleEyes', 'pump'] : a.kind === 'glut' ? ['slump', 'sigh', 'facepalm'] : ['shrug', 'think', 'eyeRoll'], 1.8); });
      break;
    case 'newsEnd': if (a.kind !== 'rumour') toast('The ' + a.kind + ' is over', 'The metal price is back to its own swell' + (a.sold ? ', after ' + a.sold + ' ingot' + (a.sold === 1 ? '' : 's') + ' sold while it lasted' : '') + '.'); break;
    case 'achievement':
      var ach = sim.achievements().filter(function (x) { return x.id === a; })[0];
      if (ach && started) toast('🏆 ' + ach.name, ach.what + '. ' + Object.keys(S.ach).length + ' of ' + sim.achievements().length + ' achievements; the Ledger keeps the list.');
      for (i = 0; i < 50; i++) confetti.push({ x: rr(W * 0.3, W * 0.7), y: rr(-H * 0.2, 0), vx: rr(-20, 20), vy: rr(40, 100), r: rr(0, TAU), vr: rr(-6, 6), c: [pal.ingot, pal.energy, pal.crab][i % 3], life: 0 });
      S.crabs.forEach(function (n, j2) { if (j2 % 3 === 0 && n.state !== 'sleep') { play(n, ['pump', 'clap', 'cheer'], 1.6); if (j2 % 6 === 0) say(n, TALK.achievement, 1.8); } });
      break;
    case 'pet':
      p = X(S.pos.DEN); spark(p, groundY(p, 0.9) - 10 * CS, 14, pal.light); poof(p, groundY(p, 0.9), 6, 0.5);
      near(S.pos.DEN, 120).forEach(function (n) { play(n, ['sparkleEyes', 'clap', 'hopJoy'], 2); if (Math.random() < 0.5) say(n, TALK.pet, 2); });
      if (started) toast(a.name + ' the ' + PET_NAMES[a.kind] + ' has moved in', (a.how === 'rank' ? 'A rank-up gift. ' : 'From the trader. ') + 'It lives by the den, and idle crabs stop to pet it. Pure charm: it changes nothing in the economy.');
      break;
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
      S.crabs.forEach(function (n, j2) { if (n.state !== 'sleep') { play(n, ['cheer', 'jazz', 'disco', 'clap', 'backflip', 'cartwheel', 'bigWave', 'canCan'], 2); if (j2 % 3 === 0) say(n, TALK.orderDone, 1.8); } });
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
      S.crabs.forEach(function (n, j2) { if (n.state === 'sleep') return; if (j2 % 3 === 0) say(n, TALK.storm, 1.8); play(n, ['shiver', 'shock', 'hug', 'nervous'], 2); });
      break;
    case 'stormEnd': toast('The storm has passed', 'Calm water again.'); S.crabs.forEach(function (n) { if (n.state !== 'sleep') play(n, ['cheer', 'sigh', 'jazz', 'shakeOff', 'cheerUp'], 1.6); }); break;
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
    case 'eelOut':
      if (!eelToast) { eelToast = true; toast('A moray eel is out of its crack', 'It snaps at crabs carrying nodules past it on the front dune, and they drop them. Click it or press Shoo (S) to send it back in.'); }
      break;
    case 'eelSnap':
      eelSnapT = T; eelAim = Math.sign(a.x - K.EEL_X) || 1;
      p = X(a.x); poof(p, groundY(p, a.d) - 6, 10, 0.7); express(a, 'shock', 1.6); a.vhop = 0.8;
      say(a, TALK.eelSnap, 1.8); play(a, ['shock', 'ouch', 'stomp'], 1.6);
      break;
    case 'eelShoo':
      p = X(K.EEL_X); poof(p, groundY(p, K.EEL_D) - 8, 14, 0.8);
      near(K.EEL_X, 160).forEach(function (n) { say(n, TALK.eelShoo, 1.4); play(n, ['cheer', 'pump', 'jazz'], 1.6); });
      toast('Shoo!', 'The eel slid back into its crack. It will be out again in a few minutes.');
      break;
    case 'octoSteal':
      if (e.b) near(a.x, 120).forEach(function (n) { say(n, TALK.octoSteal, 1.8); play(n, ['shock', 'stomp'], 1.6); });
      break;
    case 'octoGone':
      if (e.b) toast('The octopus got away', 'It took ' + e.b + ' nodule' + (e.b > 1 ? 's' : '') + '. Next time, shoo it before it reaches the pile.');
      buryToast = false;
      break;
    case 'layout': var bx = S.pos[{ den: 'DEN', workshop: 'WORKSHOP', ore: 'ORE', crush: 'CRUSH', bar: 'BAR', stock: 'STOCK', collector: 'COLLECTOR' }[a]]; near(bx, 90).forEach(function (n) { play(n, ['lookAround', 'think'], 1.6); }); break;
    case 'charge': p = clawPos(e.b, 0); spark(p.x, p.y, 6); express(e.b, 'zap', 1.2); say(e.b, TALK.gotCharge, 1.6); play(e.b, ['spin', 'shimmy', 'sparkleEyes', 'twirl', 'bounce'], 1.4); play(a, ['salute', 'wave', 'snap'], 1); break;
    case 'ebotBreak': p = clawPos(a, 0); spark(p.x, p.y, 10, pal.warn); express(a, 'shock', 1.6); say(a, TALK.ebotBreak, 2); play(a, 'dizzy', 2.4); break;
    case 'refill': express(a, 'phew', 1); play(a, ['sigh', 'robot'], 1.2); break;
    case 'fixed':
      p = clawPos(e.b, 0); spark(p.x, p.y, 8, a.role === 'mech' ? pal.lavaHot : pal.hat); express(e.b, 'relief', 1.8); express(a, 'proud', 1.4); e.b.vhop = 0.8;
      say(e.b, a.role === 'mech' ? TALK.mended : TALK.fixedBit, 2);
      play(e.b, ['relief', 'hug', 'bow', 'spin', 'thanks', 'twirl'], 1.8); play(a, ['flex', 'salute', 'bow', 'smug'], 1.4);
      if (a.role === 'mech') debris = debris.filter(function (dd) { return dd.crab !== e.b; });   // the leg goes back on
      break;
    case 'veteran':                                    // a crab earns a star at its own job
      p = clawPos(a, 1); spark(p.x, p.y - 6 * CS, 12, pal.ingot); express(a, 'proud', 2); a.vhop = 0.8;
      say(a, TALK.veteran, 2); play(a, ['flex', 'pump', 'sparkleEyes', 'backflip', 'smug'], 1.8);
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
      if (a === 'annex') { p = oreSlot(0, 2); poof(p.x, p.y, 16, 1, pal.sandLine); p = cableEnds(); spark(p.a.x, p.a.y - 30 * p.a.s, 8, pal.hat); spark(p.b.x, p.b.y - 30 * p.b.s, 8, pal.hat); toast('The annex is open', 'A second ore pile and crushing yard stand in the middle of the middle dune, among the deep deposits. Haulers drop at the nearer pile, crushers follow the ore between the two yards, and the annex\'s bars ride the cableway down to the bar stack. Both annex buildings can be moved along its three plots from the Build tab.'); }
      if (a === 'rim') { p = rim2Pos(); spark(p.x, p.y - 6 * CS, 24, pal.lavaHot); for (i = 0; i < 10; i++) bombs.push({ x: p.x + rr(-6, 6) * CS, y: p.y, vx: rr(-40, 40), vy: rr(-120, -60), life: 0, max: rr(0.6, 1.1) }); }
      S.crabs.forEach(function (n) {
        if (a === 'rim' && (n.role === 'smelt' || n.role === 'repair' || n.role === 'mech')) play(n, ['cheer', 'sparkleEyes', 'jazz'], 2);
        if (a === 'annex' && (n.role === 'haul' || n.role === 'crush')) play(n, ['cheer', 'backflip', 'pointUp'], 2);
        if (a === 'kelp' && (n.role === 'scout' || n.role === 'drill')) play(n, ['sparkleEyes', 'pointUp', 'jazz'], 2);
        if (a === 'belt' && n.role === 'haul') play(n, ['cheer', 'backflip', 'jazz'], 2);
        if (a === 'pad' && n.role !== 'energy') play(n, ['sparkleEyes', 'clap'], 1.6);
        if (a === 'den' || a === 'lamp' || (a === 'field' && (n.role === 'scout' || n.role === 'drill')) || (a === 'engine' && n.role === 'energy') || (a === 'riser' && n.role === 'smelt') || (a === 'bits' && n.role === 'drill') || (a === 'yard' && (n.role === 'haul' || n.role === 'crush')) || (a === 'scanner' && n.role === 'scout')) play(n, a === 'engine' ? 'disco' : a === 'lamp' ? ['sparkleEyes', 'pointUp', 'clap'] : ['cheer', 'jazz', 'clap'], 2);
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
  if (id === 'lamp') { px = lampPos(); return { x: px.x, y: px.y - 20 * CS }; }
  if (id === 'kelp') { px = X(75); return { x: px, y: groundY(px, 0.85) - 20 * CS }; }
  if (id === 'belt') { px = beltPoint((K.BELT_HEAD + S.pos.BELT_END) / 2); return { x: px.x, y: px.y }; }
  if (id === 'pad') { px = padPos(); return { x: px.x, y: px.y - 6 * CS }; }
  if (id === 'rim') { px = rim2Pos(); return { x: px.x, y: px.y - 4 * CS }; }
  if (id === 'annex') { px = X(S.pos.ORE2); return { x: px, y: groundY(px, K.ANNEX_D) }; }
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
    if (c.state === 'sleep' && c.vsleep && c.vsleep.burrow && T - c.vsleep.t < DIG_T && Math.random() < dtReal * 4) poof(px - c.dir * 16 * scaleAt(c.d), groundY(px, c.d) - 2, 1, 0.5);
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
        else if (n.chest) floater('Treasure! +$' + n.value, b.x, b.y - 70 * CS, true);
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
  chimneyA += ((S.chimney && S.t < S.chimney.until - 20 ? 1 : 0) - chimneyA) * Math.min(1, dtReal * 0.25);   // the chimney grows over a few seconds and fades over its last twenty
  if (S.chimney && chimneyA > 0.1 && !reduce && Math.random() < dtReal * 10 * chimneyA) { var chp = chimneyPos(); bubbles.push({ x: chp.x + rr(-5, 5) * CS, y: chp.y - 16 * chp.s, r: rr(1.2, 3.4), vy: rr(50, 90), ph: rr(0, TAU), top: chimneyTop(S.chimney.x) }); }
  eelA += ((S.eel.out ? 1 : 0) - eelA) * Math.min(1, dtReal * 3);   // the eel slides out of its crack, and back
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
    if (started) sfx.whale();
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
  if (eco && started) {                            // the first bite on the fisherman's bait opens the lab report
    var lab = eco.report(), lg = lab.log || [];
    if (!labToast) for (i = Math.max(0, ecoLogSeen - 0); i < lg.length; i++) if (/bait/i.test(lg[i].text)) {
      labToast = true; toast('Lab report: ' + lg[i].text, 'The sea is a closed food web: whatever is eaten is born again, and the fisherman\'s bait feeds more fish than it catches. The Ledger keeps the lab report: every species by count, who ate whom, and the latest observations.');
      break;
    }
    ecoLogSeen = lg.length;
  }
  updatePets(dtReal);
  updatePool();
  if (S.quake && !reduce && Math.random() < dtReal * 24) {   // the shaking dune throws up sand along the band that will slide
    var qz2 = K.ZONES[S.quake.zone], qx2 = X(S.quake.x + rr(-K.QUAKE_BAND / 2, K.QUAKE_BAND / 2));
    poof(qx2, groundY(qx2, rr(qz2.d0, qz2.d1)), 2, 0.6, pal.sandLine);
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
    if (n.y < (n.top !== undefined ? n.top : n.vent ? H * 0.1 : surfH * 0.7)) bubbles.splice(i, 1);
  }
}
