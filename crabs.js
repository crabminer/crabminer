// ===== The view, part 3: the crabs =====
// The view is four classic scripts, game.js, scene.js, crabs.js and controls.js, that share one global scope:
// every top-level var and function here is a window property the other three use, so each file is a chapter, not a module.
// This chapter is the crabs' repertoire of animations and the drawing of a crab: its shell and mark, its face and mood, its
// claws, legs and props, its name tag and speech bubble.
'use strict';

// ----- the crabs' repertoire: 119 animations (with the rave) -----
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
  grumble: function (c, u) { return { eye: 'angry', mouth: 'frown', tilt: osc(u, 17) * 0.07, arm: [-11, -11, 11, -11] }; },
  // acrobatics: whole-body turns; k runs 0 to 1 over the move and the body rises as it goes round
  twirl: function (c, u) { var k = Math.min(1, u / 1.1); return { eye: 'happy', mouth: 'open', tilt: k * TAU, dy: -Math.sin(k * Math.PI) * 4, arm: [-16, -12, 16, -12], legs: 'step' }; },
  backflip: function (c, u) { var k = Math.min(1, u / 0.9), e = k * k * (3 - 2 * k); return { eye: 'wide', mouth: 'open', tilt: -c.dir * TAU * e, dy: -Math.sin(k * Math.PI) * 16, arm: [-10, -12, 10, -12], legs: 'step' }; },
  frontflip: function (c, u) { var k = Math.min(1, u / 0.9), e = k * k * (3 - 2 * k); return { eye: 'squint', mouth: 'grin', tilt: c.dir * TAU * e, dy: -Math.sin(k * Math.PI) * 14, arm: [-8, -6, 8, -6], legs: 'step' }; },
  cartwheel: function (c, u) { var k = Math.min(1, u / 1.2); return { eye: 'happy', mouth: 'open', tilt: c.dir * TAU * k, dx: c.dir * Math.sin(k * Math.PI) * 10, dy: -Math.sin(k * Math.PI) * 6, arm: [-16, -10, 16, -10] }; },
  hopTwirl: function (c, u) { var h = Math.abs(osc(u, 1.5)); return { eye: 'happy', mouth: 'grin', dy: -h * 6, tilt: (u % 1.5) / 1.5 * TAU, arm: [-14, -12, 14, -12] }; },
  breakdance: function (c, u) { return { eye: 'closed', mouth: 'grin', tilt: Math.PI + osc(u, 1.2) * 0.5, dy: -10, arm: [-14, 6, 14, 6], legs: 'step' }; },
  // side-steps and shuffles
  sideStep: function (c, u) { var w = osc(u, 1.2); return { eye: 'happy', mouth: 'smile', dx: w * 6, tilt: -w * 0.05, legs: 'step', arm: [-14, -6 + w * 2, 14, -6 - w * 2] }; },
  grapevine: function (c, u) { var w = osc(u, 0.8); return { eye: 'happy', mouth: 'open', dx: w * 10, legs: 'step', tilt: w * 0.06, arm: w > 0 ? [-15, -4, 14, -12] : [-14, -12, 15, -4] }; },
  chaCha: function (c, u) { var w = osc(u, 2.4); return { eye: 'happy', mouth: 'grin', dx: w * 3, dy: -Math.abs(w) * 1, legs: 'step', arm: [-13, -8 + w * 4, 13, -8 - w * 4] }; },
  slide: function (c, u) { return { eye: 'happy', mouth: 'grin', dx: c.dir * (u % 1.6) * 6, legs: 'step', tilt: 0.08 * c.dir, arm: [-15, -8, 15, -8] }; },
  bounce: function (c, u) { var h = Math.abs(osc(u, 2.6)); return { eye: 'happy', mouth: 'open', dy: -h * 5, arm: [-12, -10 - h * 2, 12, -10 - h * 2] }; },
  twist: function (c, u) { var w = osc(u, 2); return { eye: 'happy', mouth: 'grin', dx: w * 3, tilt: -w * 0.08, legs: 'step', arm: [-10 + w * 6, -6, 10 + w * 6, -6] }; },
  charleston: function (c, u) { var w = osc(u, 2); return { eye: 'happy', mouth: 'open', dx: w * 2, legs: 'step', arm: [-6 + w * 8, -8, 6 + w * 8, -8] }; },
  runningMan: function (c, u) { var w = osc(u, 3); return { eye: 'focus', mouth: 'grin', legs: 'step', dx: w * 2, dy: -Math.abs(w) * 2, arm: [-12, -8 + w * 6, 12, -8 - w * 6] }; },
  shuffleKick: function (c, u) { var w = osc(u, 1.6); return { eye: 'happy', mouth: 'smile', legs: 'step', dx: w * 4, tilt: -w * 0.07, arm: [-13, -5, 13, -5] }; },
  canCan: function (c, u) { var w = osc(u, 2); return { eye: 'happy', mouth: 'open', legs: 'step', dy: -Math.abs(w) * 3, tilt: w * 0.08, arm: [-16, -12, 16, -12] }; },
  // dances on the spot
  wiggle: function (c, u) { var w = osc(u, 5); return { eye: 'happy', mouth: 'grin', tilt: w * 0.12, dx: w * 1.5, arm: [-14, -5, 14, -5] }; },
  bodyRoll: function (c, u) { var w = osc(u, 1), v = osc(u + 0.25, 1); return { eye: 'closed', mouth: 'smile', tilt: w * 0.15, body: v * 2, arm: [-13, -4 + w * 4, 13, -4 + w * 4] }; },
  limbo: function (c, u) { var k = Math.sin(Math.min(1, u / 1.5) * Math.PI); return { eye: 'closed', mouth: 'grit', tilt: -c.dir * 0.4 * k, body: 3 * k, arm: [-14, -14, 14, -14], legs: 'step' }; },
  hula: function (c, u) { var w = osc(u, 1.3); return { eye: 'happy', mouth: 'smile', dx: w * 4, tilt: w * 0.1, arm: [-15, -4 - w * 4, 15, -8 + w * 4] }; },
  boogie: function (c, u) { var w = osc(u, 2.2); return { eye: 'happy', mouth: 'open', dx: w * 2, dy: -Math.abs(w) * 2, arm: w > 0 ? [-10, -16, 15, -2] : [-15, -2, 10, -16] }; },
  dab: function (c, u) { var k = Math.min(1, u / 0.3); return { eye: 'closed', mouth: 'flat', tilt: c.dir * 0.25 * k, arm: c.dir > 0 ? [-18, -16, 6, -10] : [-6, -10, 18, -16] }; },
  sprinkler: function (c, u) { var w = (u * 3) % 1; return { eye: 'happy', mouth: 'grin', tilt: c.dir * 0.08, arm: c.dir > 0 ? [-5 + w * 2, -14, 8 + w * 10, -8 + w * 6] : [-8 - w * 10, -8 + w * 6, 5 - w * 2, -14] }; },
  armWave: function (c, u) { return { eye: 'happy', mouth: 'smile', arm: [-16, -8 + osc(u, 2) * 6, 16, -8 + osc(u + 0.25, 2) * 6] }; },
  bigWave: function (c, u) { var w = osc(u, 2.5); return { eye: 'happy', mouth: 'open', arm: [-14 + w * 4, -17, 14 + w * 4, -17], tilt: w * 0.04 }; },
  doubleWave: function (c, u) { var w = osc(u, 3); return { eye: 'happy', mouth: 'grin', arm: [-14, -14 + w * 3, 14, -14 - w * 3] }; },
  pointUp: function (c, u) { var p = Math.abs(osc(u, 2)); return { eye: 'up', mouth: 'open', dy: -p * 2, tilt: -c.dir * 0.08, arm: c.dir > 0 ? [-15, -2, 8, -18] : [-8, -18, 15, -2] }; },
  airGuitar: function (c, u) { return { eye: 'closed', mouth: 'open', tilt: -0.1 * c.dir, legs: 'tap', prop: 'note', arm: c.dir > 0 ? [-6, -6 + osc(u, 8) * 2, 14, -4] : [-14, -4, 6, -6 + osc(u, 8) * 2] }; },
  clawClick: function (c, u) { var w = Math.abs(osc(u, 2)); return { eye: 'happy', mouth: 'grin', dy: -w, arm: [-14, -10, 14, -10], prop: w > 0.9 ? 'sparkle' : null }; },
  armCircle: function (c, u) { var a = u * TAU * 0.8; return { eye: 'happy', mouth: 'smile', arm: [-6 - Math.cos(a) * 10, -8 + Math.sin(a) * 8, 6 + Math.cos(a) * 10, -8 - Math.sin(a) * 8] }; },
  windmill: function (c, u) { var a = u * TAU * 1.2; return { eye: 'wide', mouth: 'open', arm: c.dir > 0 ? [-15, -2, 6 + Math.cos(a) * 12, -8 + Math.sin(a) * 12] : [-6 - Math.cos(a) * 12, -8 + Math.sin(a) * 12, 15, -2] }; },
  swimArms: function (c, u) { var w = (u * 1.2) % 1, k = Math.sin(w * Math.PI); return { eye: 'happy', mouth: 'o', arm: [-8 - k * 10, -12 + k * 8, 8 + k * 10, -12 + k * 8], dy: -k * 2 }; },
  // two crabs dancing (the pose takes the partner's side from vpd)
  swing: function (c, u) { var p = c.vpd || 1, a = u * TAU * 0.6; return { eye: 'happy', mouth: 'open', dx: Math.cos(a) * 6 * p, dy: -Math.abs(Math.sin(a)) * 3, legs: 'step', arm: [-12, -10, 12, -10] }; },
  mirror: function (c, u) { var p = c.vpd || 1, w = osc(u, 1.5); return { eye: 'happy', mouth: 'smile', tilt: w * 0.08, arm: p > 0 ? [-15, -2 + w * 3, 14, -14 + w * 4] : [-14, -14 + w * 4, 15, -2 + w * 3] }; },
  seesaw: function (c, u) { var p = c.vpd || 1, h = Math.max(0, osc(u, 1) * p); return { eye: 'happy', mouth: 'open', dy: -h * 6, arm: [-13, -8 - h * 6, 13, -8 - h * 6] }; },
  pattyCake: function (c, u) { var p = c.vpd || 1, w = Math.abs(osc(u, 2.5)); return { eye: 'happy', mouth: 'grin', arm: p > 0 ? [-14, -4, 14 + w * 5, -10] : [-14 - w * 5, -10, 14, -4], prop: w > 0.92 ? 'sparkle' : null }; },
  tango: function (c, u) { var p = c.vpd || 1, w = osc(u, 0.7); return { eye: 'closed', mouth: 'smile', tilt: p * 0.2 + w * 0.08, dx: -p * w * 4, legs: 'step', arm: p > 0 ? [-14, -2, 18, -12] : [-18, -12, 14, -2] }; },
  bump: function (c, u) { var p = c.vpd || 1, w = Math.max(0, osc(u, 1.5)); return { eye: 'happy', mouth: 'open', dx: p * w * 5, tilt: -p * 0.1 * w, arm: [-14, -10, 14, -10] }; },
  twoStep: function (c, u) { var w = osc(u, 1); return { eye: 'happy', mouth: 'smile', dx: w * 5, legs: 'step', arm: [-13, -6 + w * 3, 13, -6 - w * 3] }; },
  lineDance: function (c, u) { var w = osc(u, 0.9); return { eye: 'happy', mouth: 'grin', dx: w * 6, legs: 'step', tilt: w * 0.05, arm: [-14, -10, 14, -10] }; },
  spinPair: function (c, u) { var p = c.vpd || 1; return { eye: 'wide', mouth: 'open', tilt: u * TAU * 0.8, dx: p * Math.cos(u * TAU * 0.4) * 5, arm: [-14, -8, 14, -8] }; },
  waltz: function (c, u) { var p = c.vpd || 1, w = osc(u, 0.5), b = Math.abs(osc(u, 1.5)); return { eye: 'closed', mouth: 'smile', dx: w * 8 * p, dy: -b * 1.5, legs: 'step', arm: p > 0 ? [-12, -6, 16, -10] : [-16, -10, 12, -6] }; },
  highTen: function (c, u) { var k = Math.min(1, u / 0.4); return { eye: 'happy', mouth: 'open', dy: -k * 2, arm: [-10 - 4 * k, -12 - 6 * k, 10 + 4 * k, -12 - 6 * k] }; },
  twirlDuet: function (c, u) { var p = c.vpd || 1; return p > 0 ? { eye: 'happy', mouth: 'open', tilt: (u % 1.4) / 1.4 * TAU, dy: -Math.sin((u % 1.4) / 1.4 * Math.PI) * 3, arm: [-16, -12, 16, -12] } : { eye: 'happy', mouth: 'grin', arm: [-3 - Math.abs(osc(u, 3)) * 7, -9, 3 + Math.abs(osc(u, 3)) * 7, -9] }; },
  // lending a claw: walking claw in claw, cheering the friend on, and the thanks after
  handHold: function (c, u) { var w = osc(u, 1.2); return { eye: 'happy', mouth: 'smile', tilt: w * 0.04, arm: [-16, -6 + w * 3, 16, -6 - w * 3] }; },
  cheerOn: function (c, u) { var p = Math.abs(osc(u, 2)); return { eye: 'happy', mouth: 'open', dy: -p * 1.5, arm: [-14, -14 - p * 3, 14, -14 - p * 3] }; },
  helpedDance: function (c, u) { var w = osc(u, 4); return { eye: 'happy', mouth: 'grin', tilt: w * 0.1, dx: w * 1.5, dy: -Math.abs(w) * 1.5, arm: [-14, -10, 14, -10] }; },
  helpedWalk: function (c, u) { var b = Math.abs(osc(u, 2.4)); return { eye: 'happy', mouth: 'open', dy: -b * 2, arm: [-16, -6 - b * 3, 16, -6 - b * 3] }; },
  thanks: function (c, u) { var k = Math.sin(Math.min(1, u / 1.4) * Math.PI); return { eye: 'heart', mouth: 'smile', tilt: c.dir * 0.3 * k, arm: [-12, 2, 12, 2] }; },
  // caught up in a dance nearby
  bop: function (c, u) { var w = osc(u, 2); return { eye: 'happy', mouth: 'smile', dy: -Math.abs(w) * 1.5, tilt: w * 0.05, arm: [-14, -6, 14, -6] }; },
  nodAlong: function (c, u) { return { eye: 'happy', mouth: 'smile', tilt: c.dir * osc(u, 2) * 0.08, arm: [-14, -4, 14, -4] }; },
  tapAlong: function (c, u) { return { eye: 'happy', mouth: 'smile', legs: 'tap', arm: [-13, -6 + osc(u, 2) * 2, 13, -6 - osc(u, 2) * 2] }; },
  snap: function (c, u) { var w = Math.abs(osc(u, 2)); return { eye: 'closed', mouth: 'grin', arm: c.dir > 0 ? [-15, -2, 12, -12 - w * 2] : [-12, -12 - w * 2, 15, -2], prop: w > 0.95 ? 'sparkle' : null }; },
  // more idle routines
  scratchHead: function (c, u) { return { eye: 'up', mouth: 'flat', glyph: '?', arm: c.dir > 0 ? [-15, -2, 4, -14 + osc(u, 3)] : [-4, -14 + osc(u, 3), 15, -2] }; },
  stretchUp: function (c, u) { var k = Math.sin(Math.min(1, u / 1.4) * Math.PI); return { eye: 'closed', mouth: 'o', arm: [-8, -6 - 12 * k, 8, -6 - 12 * k], dy: -k, body: -k }; },
  shakeOff: function (c, u) { return { eye: 'closed', mouth: 'flat', dx: osc(u, 12) * 1, tilt: osc(u, 12) * 0.06, arm: [-14, -4, 14, -4], prop: 'bubbles' }; },
  daydream: function (c, u) { return { eye: 'up', mouth: 'smile', tilt: 0.08, arm: [-12, 2, 12, 2], glyph: '…' }; },
  pushups: function (c, u) { var k = Math.abs(osc(u, 1.2)); return { eye: 'focus', mouth: 'grit', body: 2 + k * 3, arm: [-14, 4 + k * 2, 14, 4 + k * 2], legs: 'sit' }; },
  balance: function (c, u) { return { eye: 'wide', mouth: 'o', tilt: osc(u, 0.5) * 0.3, arm: [-18, -10, 18, -10], legs: 'tap' }; },
  drum: function (c, u) { var a = Math.abs(osc(u, 4)), b = Math.abs(osc(u + 0.125, 4)); return { eye: 'happy', mouth: 'grin', prop: 'note', arm: [-12, 2 - a * 6, 12, 2 - b * 6] }; },
  lookUp: function (c, u) { return { eye: 'wide', mouth: 'o', look: { x: 0, y: -1.3 }, tilt: -c.dir * 0.05 }; },
  // more moods
  nervous: function (c, u) { return { eye: 'wide', mouth: 'wavy', sweat: true, dx: osc(u, 10) * 0.5, arm: [-6, -3, 6, -3] }; },
  smug: function (c, u) { return { eye: 'closed', mouth: 'grin', tilt: -0.08 * c.dir, body: -1, arm: [-12, -8, 12, -8] }; },
  curious: function (c, u) { return { eye: 'wide', mouth: 'o', tilt: c.dir * 0.12, look: { x: c.dir, y: -0.5 } }; },
  sulk: function (c, u) { return { eye: 'sad', mouth: 'frown', tilt: -c.dir * 0.1, arm: [5, 1, -5, 1] }; },
  facepalm: function (c, u) { return { eye: 'closed', mouth: 'flat', tilt: c.dir * 0.12, arm: c.dir > 0 ? [-15, -2, 3, -12] : [-3, -12, 15, -2] }; },
  cheerUp: function (c, u) { return { eye: 'happy', mouth: 'open', dy: -Math.abs(osc(u, 3)) * 2, arm: [-13, -12, 13, -12] }; }
};
var ANIM_NAMES = Object.keys(ANIMS).concat(['rave']);
var DUETS = ['sway', 'salsa', 'dosido', 'cheek', 'conga', 'highFive', 'floss', 'disco', 'moonwalk', 'robot', 'shimmy', 'headbang',
  'swing', 'mirror', 'seesaw', 'pattyCake', 'tango', 'bump', 'twoStep', 'lineDance', 'spinPair', 'waltz', 'highTen', 'twirlDuet', 'chaCha', 'grapevine', 'sideStep', 'canCan', 'charleston', 'bodyRoll'];
var CHEERS = ['bop', 'nodAlong', 'tapAlong', 'snap', 'clawClick', 'wiggle'];
function helped(c) { return c.helper && c.helper.held && c.helper.helping === c; }   // a friend has it by the claw
function anyOf(a) { return a[Math.floor(Math.random() * a.length)]; }
function play(c, names, dur) {         // start an animation on a crab: one name, or a random one of several
  if (!c || c.state === 'sleep' || c.alt > 0) return;
  c.anim = { name: typeof names === 'string' ? names : anyOf(names), start: T, until: T + (dur || 2.2) };
}
function near(x, r) { return S.crabs.filter(function (c) { return Math.abs(c.x - x) < r && c.state !== 'sleep' && !(c.alt > 0); }); }
function moodFor(c) {                  // ongoing states pick a looping animation; u counts from when it began
  var u = T - (c.vmoodT || T), idle = c.vidle || 0;
  if (c.dance && c.dance.state !== 'sleep') return ANIMS[DUETS[(c.id + c.dance.id) % DUETS.length]](c, T);
  if (c.state === 'help' && c.held) return c.moving ? ANIMS.handHold(c, T + c.vph) : ANIMS.cheerOn(c, T + c.vph);   // claw in claw with the friend it helps
  if (helped(c) && c.moving) return ANIMS.helpedWalk(c, T + c.vph);
  if (c.cheer > S.t && !c.moving && !c.working) return ANIMS[CHEERS[c.id % CHEERS.length]](c, T + c.vph);   // a dance nearby: everyone bops along
  if (S.si && S.si.night && c.role !== 'scout' && S.t - c.lastRest > K.REST_WINDOW * K.DAY / 24 && (c.moving || c.working))
    return { eye: 'sleepy', mouth: 'flat', tilt: Math.sin(T * 1.5 + c.vph) * 0.06 };   // dragging through the night, half speed
  if (c.role === 'energy' && c.broken) return ANIMS.dizzy(c, T);
  if (c.role !== 'energy' && c.bat < K.LOW) return ANIMS.nod(c, T + c.vph);
  if (c.limp && c.moving) return ANIMS.struggle(c, T);
  if (c.role === 'haul' && c.load >= sim.carry() && c.moving) return ANIMS.struggle(c, T);
  if (c.state === 'scan') return ANIMS.think(c, T);
  if (S.oc && (c.moving || c.working)) return ANIMS.determined(c, T);
  if (c.wear > K.WEAR_FREE && !c.moving && !c.working) return ANIMS[Math.sin(T * 0.3 + c.vph) > 0 ? 'sigh' : 'slump'](c, T % 3);
  if (!c.moving && !c.working && idle > 0.6 && c.moodZone === 'grumpy') return ANIMS[['sulk', 'grumble', 'crossArms', 'eyeRoll', 'slump'][Math.floor((idle / 4 + c.id) % 5)]](c, idle % 4);   // a grumpy crab sulks
  if (!c.moving && !c.working && idle > 0.6 && c.moodZone === 'happy' && idle < 10) return ANIMS[['whistle', 'bounce', 'hula', 'daydream', 'jazz', 'sway'][Math.floor((idle / 3 + c.id) % 6)]](c, idle % 4);   // a happy one hums and sways
  if (!c.moving && !c.working && idle > 0.6) {               // the longer the wait, the sillier it gets
    var ladder = idle < 3 ? ['lookAround', 'curious'] : idle < 6 ? ['tap', 'lookAround', 'scratchHead', 'lookUp'] : idle < 10 ? ['crossArms', 'eyeRoll', 'tap', 'stretchUp', 'daydream'] : idle < 16 ? ['whistle', 'juggle', 'blowBubbles', 'sideStretch', 'balance', 'drum', 'shakeOff'] : ['sit', 'peekaboo', 'sneeze', 'whistle', 'juggle', 'pushups', 'airGuitar', 'armWave'];
    var name = ladder[Math.floor((idle / 4 + c.id) % ladder.length)];
    return ANIMS[name](c, idle % 4);
  }
  return null;
}

// ----- drawing: crabs, and the faces they pull -----
// A face is two eyes on stalks and a mouth on the shell. Events set a short-lived mood;
// otherwise the face follows the task: tongue out to drill, teeth gritted to crush, sweat at the lava.
function face(c) {
  var f = faceFor(c), g, k;
  if (c.cheer > S.t && !f.sleep && !f.party && (f.eye === 'normal' || f.eye === 'bored' || f.eye === 'squint' || f.eye === 'focus')) {   // a dance nearby: a smile at work
    g = {}; for (k in f) g[k] = f[k];
    g.eye = 'happy'; if (g.mouth === 'flat' || g.mouth === 'grit') g.mouth = 'smile';
    return g;
  }
  return f;
}
function faceFor(c) {
  var waiting = !c.moving && !c.working, m = c.vx && T < c.vx.until ? c.vx.name : null;
  if (c.vfall > 0) return { eye: 'wide', mouth: 'o', arms: 'up' };
  if (c.state === 'sleep') {
    var sf = c.vsleep || (c.vsleep = sleepForm(c, T - DIG_T)), dug = T - sf.t;
    if (sf.burrow && dug < DIG_T) {                   // dig, dig, dig: claws scooping, sinking as it goes
      var sc = Math.abs(Math.sin(dug * 9));
      return { eye: 'squint', mouth: 'flat', dy: dug / DIG_T * 7, legs: 'step', arm: dug * 9 % TAU < Math.PI ? [-12 - sc * 4, 4 - sc * 6, 12, 2] : [-12, 2, 12 + sc * 4, 4 - sc * 6] };
    }
    return { eye: 'closed', mouth: 'o', glyph: 'z', sleep: true, tilt: 0.12 };
  }
  if (c.turtle) return { eye: 'happy', mouth: 'open', arms: 'up', tilt: Math.sin(T * 3 + c.vph) * 0.12 };   // riding the turtle
  if (c.manta) return { eye: 'wide', mouth: 'open', arms: 'up', tilt: -c.dir * 0.12 + Math.sin(T * 2.4 + c.vph) * 0.1 };   // swept along on the manta's back
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
// Sleeping: some crabs tuck their legs in where they stand, and some dig themselves into the sand until only
// their eyes stick up. A crab that is tired when it goes off shift always digs in.
var DIG_T = 2.6;
function sleepForm(c, t) {
  var tired = c.wear > K.WEAR_FREE || S.t - c.lastRest > K.REST_WINDOW * K.DAY / 24;
  return { t: t, burrow: tired || ((c.id * 7 + (S.si ? S.si.day : 0) * 3) % 10) < 4 };
}
function burrowed(c) { return c.state === 'sleep' && c.vsleep && c.vsleep.burrow && T - c.vsleep.t >= DIG_T && !(c.alt > 0); }
function drawBurrow(c) {
  var s = scaleAt(c.d) * (c.role === 'energy' ? 0.86 : 1), px = crabX(c), gy = groundY(px, c.d), sand = pal[SAND[c.d < 1 / 3 ? 0 : c.d < 2 / 3 ? 1 : 2]];
  var breathe = Math.sin(T * 1.6 + c.vph) * 0.4 * s, side, ex, ey, peek = ((T + c.vph * 5) % 7) < 0.5;
  ctx.save(); ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(px + 2 * s, gy + 0.5 * s, 15 * s, 2.6 * s, 0, 0, TAU); ctx.fill();   // its shadow
  ctx.fillStyle = sand; ctx.strokeStyle = pal.sandLine; ctx.lineWidth = 1.6 * s;
  ctx.beginPath(); ctx.ellipse(px, gy - 1 * s, 13 * s, 6 * s + breathe, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();   // the mound
  ctx.lineWidth = 0.8 * s; ctx.globalAlpha = 0.6;
  for (var g = -1; g <= 1; g++) { ctx.beginPath(); ctx.arc(px + g * 5 * s, gy - 2 * s, 2.2 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }   // grains heaped over it
  ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.35; ctx.fillStyle = c.vbody || pal.sandLine;
  ctx.beginPath(); ctx.ellipse(px, gy - 2 * s, 7 * s, 2.4 * s + breathe, 0, Math.PI, 0); ctx.fill();                 // a hint of shell through the sand
  ctx.globalAlpha = 1;
  for (side = -1; side <= 1; side += 2) {                // the eyes stick up out of the sand
    ex = px + side * 3 * s; ey = gy - 12 * s + breathe;
    ctx.strokeStyle = STYLE[c.role]()[1]; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(px + side * 2 * s, gy - 4 * s); ctx.lineTo(ex, ey + 2 * s); ctx.stroke();
    drawEye(ex, ey, s, { eye: peek ? 'sleepy' : 'closed' }, { x: 0, y: 0 }, c, side);
  }
  ctx.restore();
  if (c.say && T < c.say.until) drawBubble(px + 12 * s, gy - 26 * s, c.say.text, s, clamp((c.say.until - T) / 0.3, 0, 1), true, c.say.start !== undefined ? c.say : null);
  else drawBubble(px + 10 * s, gy - 20 * s, ['z', 'zz', 'zzz'][Math.floor(T * 1.2 + c.vph) % 3], s, 1);
  if (selected === c && T < selectedUntil) drawInfo(c, px, gy - 30 * s, s);
}
// a crab holding claws with the one it helps, or with its helper: which side the partner is on, or 0
function holdSide(c) {
  var p = c.state === 'help' && c.held ? c.helping : (c.helper && c.helper.held && c.helper.helping === c ? c.helper : null);
  return p && !p.gone ? (crabX(p) >= crabX(c) ? 1 : -1) : 0;
}
// Every kind wears a mark on its shell as well as its colour, so no two roles are told apart by colour alone:
// scout ▲, drill ◆, hauler two bars, crusher ■, smelter ●, energy bot a bolt, repair bot +, maintenance bot ○.
// The crew rows and the roster show the same marks (markSVG).
var MARK_PATH = { scout: 'M6 1.6 10.6 10.2H1.4z', drill: 'M6 1 11 6 6 11 1 6z', haul: 'M2 4.2h8M2 8h8', crush: 'M2.6 2.6h6.8v6.8H2.6z',
  smelt: 'M6 6m-3.8 0a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0-7.6 0', energy: 'M7.6 1 3.8 6.6h4.2L4.4 11', repair: 'M6 1.5v9M1.5 6h9', mech: 'M6 6m-3.4 0a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0-6.8 0' };
var MARK_FILLED = { scout: 1, drill: 1, crush: 1, smelt: 1 };
function markSVG(role) {
  return '<svg class="mark" viewBox="0 0 12 12" aria-hidden="true"><path d="' + MARK_PATH[role] + '"' + (MARK_FILLED[role] ? ' fill="currentColor"' : ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '/></svg>';
}
function roleDot(role) { var c = role === 'haul' ? 'crab' : role; return '<span class="dot" style="background:var(--c-' + c + ');color:var(--c-' + c + '-dark)">' + markSVG(role) + '</span>'; }
var MARK_LETTER = { scout: 'S', drill: 'D', haul: 'H', crush: 'C', smelt: 'M', energy: 'E', repair: 'R', mech: 'L' };   // the letter option: Scout, Drill, Hauler, Crusher, sMelter, Energy, Repair, Legs
var markStyle = 'shape';               // 'shape', 'letter' or 'none', the View tab's choice, remembered
try { markStyle = localStorage.getItem('crabminer-marks') || 'shape'; } catch (e) {}
function setMarks(v) { markStyle = v; try { localStorage.setItem('crabminer-marks', v); } catch (e) {} document.body.classList.toggle('no-marks', v === 'none'); if (ui.marks) ui.marks.value = v; }
function drawRoleMark(role, s, by, dark) {
  var y = by - 0.8 * s, r = 2.3 * s;
  if (markStyle === 'none') return;
  if (markStyle === 'letter') { ctx.save(); ctx.fillStyle = dark; ctx.globalAlpha = 0.9; ctx.font = '700 ' + Math.round(6.2 * s) + 'px ' + cssFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(MARK_LETTER[role], 0, y + 0.2 * s); ctx.restore(); return; }
  ctx.save(); ctx.fillStyle = dark; ctx.strokeStyle = dark; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.1 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (role === 'scout') { ctx.moveTo(0, y - r); ctx.lineTo(r, y + r * 0.8); ctx.lineTo(-r, y + r * 0.8); ctx.closePath(); ctx.fill(); }
  else if (role === 'drill') { ctx.moveTo(0, y - r); ctx.lineTo(r, y); ctx.lineTo(0, y + r); ctx.lineTo(-r, y); ctx.closePath(); ctx.fill(); }
  else if (role === 'haul') { ctx.moveTo(-r, y - r * 0.55); ctx.lineTo(r, y - r * 0.55); ctx.moveTo(-r, y + r * 0.55); ctx.lineTo(r, y + r * 0.55); ctx.stroke(); }
  else if (role === 'crush') { ctx.rect(-r * 0.85, y - r * 0.85, r * 1.7, r * 1.7); ctx.fill(); }
  else if (role === 'smelt') { ctx.arc(0, y, r * 0.9, 0, TAU); ctx.fill(); ctx.fillStyle = pal.lava; ctx.beginPath(); ctx.arc(0, y, r * 0.45, 0, TAU); ctx.fill(); }
  else if (role === 'energy') { ctx.moveTo(r * 0.5, y - r * 1.2); ctx.lineTo(-r * 0.45, y + r * 0.15); ctx.lineTo(r * 0.45, y - r * 0.15); ctx.lineTo(-r * 0.5, y + r * 1.2); ctx.stroke(); }
  else if (role === 'repair') { ctx.moveTo(0, y - r); ctx.lineTo(0, y + r); ctx.moveTo(-r, y); ctx.lineTo(r, y); ctx.stroke(); }
  else { ctx.arc(0, y, r * 0.8, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawCrab(c) {
  if (burrowed(c)) { drawBurrow(c); return; }
  var role = c.role, st = STYLE[role](), body = st[0], dark = st[1];
  var s = scaleAt(c.d) * (role === 'energy' ? 0.86 : 1) * (c.apprentice ? 0.8 : 1);   // an apprentice is still small
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
  if (c.manta && S.manta) { var mp = mantaPos(), mi = S.manta.riders.indexOf(c), mn = S.manta.riders.length; px = mp.x + ((mi - (mn - 1) / 2) * 15 - 5) * CS; gy = mp.y - 3 * CS; moving = false; }   // riders sit along its back
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
  var giver = sim.heldBy(c), reach = giver ? passSide(c, giver) : holdSide(c), carried;   // a crab being handed something reaches for it, and partners hold claws
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
      if (c.carry === 'bar') drawBar(ax + side * 5 * s, ay + 1 * s, s, c.state === 'smelt' ? c.heat : 0, c.nFine > 0);
      else drawIngot(ax + side * 5 * s, ay, s, false, c.nFine > 0);
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
    for (i = 0; i < c.load; i++) { ctx.fillStyle = i < c.loadFine ? pal.ingot : pal.nodule; ctx.beginPath(); ctx.arc((-3.6 + i * 3.6) * s, by - 10.4 * s, 1.35 * s, 0, TAU); ctx.fill(); }   // fine ones show gold
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
    if (c.plate) {                                           // a plate off the wreck, carried on the shell
      roundRect(-7 * s, by - 17 * s, 14 * s, 7 * s, 1 * s); ctx.fillStyle = pal.metal; ctx.fill(); ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = pal.metalDark; ctx.beginPath(); ctx.arc(-5 * s, by - 15.5 * s, 0.7 * s, 0, TAU); ctx.arc(5 * s, by - 11.5 * s, 0.7 * s, 0, TAU); ctx.fill();
    }
    if (c.state === 'strip') spark(px + c.dir * 14 * s, by - 2 * s, 1, pal.metal);
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
    for (i = 0; i < c.bload; i++) drawNod((-3.5 + i * 3.5) * s, by - 9.5 * s - (i % 2) * 2 * s, 1.8 * s, 1, i, i < c.bloadFine);
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
  drawRoleMark(role, s, by, dark);
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
  if (c.apprentice || (c.vcap && T - c.vcap < 1.2)) {       // the apprentice's paper cap: a yellow cone with a pompom; it flies off at graduation
    var capT = c.apprentice ? 0 : (T - c.vcap) / 1.2, capX = -3 * s + capT * 14 * s * c.dir, capY = by - 6 * s - Math.sin(Math.min(1, capT) * Math.PI) * 26 * s, capR = capT * 3;
    ctx.save(); ctx.translate(capX, capY); ctx.rotate(-0.25 + capR); ctx.globalAlpha = 1 - capT * 0.7;
    ctx.fillStyle = pal.warn; ctx.beginPath(); ctx.moveTo(-4.5 * s, 0); ctx.lineTo(0, -9 * s); ctx.lineTo(4.5 * s, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.8 * s; ctx.stroke();
    ctx.fillStyle = pal.paper; ctx.beginPath(); ctx.arc(0, -9.2 * s, 1.6 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = dark; ctx.font = '700 ' + Math.round(5 * s) + 'px ' + cssFont; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('A', 0, -1.6 * s);
    ctx.restore();
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
  if (r.chests) out.push(r.chests + ' chest' + (r.chests === 1 ? '' : 's'));
  if (r.rides) out.push(r.rides + ' vent ride' + (r.rides === 1 ? '' : 's'));
  if (r.dances) out.push(r.dances + ' dance' + (r.dances === 1 ? '' : 's'));
  if (r.legs) out.push(r.legs + ' leg' + (r.legs === 1 ? '' : 's') + ' lost');
  return out.join(' · ');
}
function statusText(c) {
  var t = {
    scout: { go: 'heading out to scan', scan: 'scanning for metal', rest: 'resting: plenty of flags already' },
    drill: { go: c.flag ? 'walking to a flag' : 'no flags, so drilling blind', drill: 'drilling', rest: 'resting: the sand is littered' },
    haul: { seek: c.target ? 'fetching a nodule' : 'looking for nodules', pick: 'picking up a nodule', haul: sim.pileOf(c) === 2 ? 'carrying nodules up to the annex pile' : S.lv.belt ? 'carrying nodules to the conveyor' : 'carrying nodules to the ore pile', stack: sim.pileOf(c) === 2 ? (S.ore2 >= sim.oreCap() ? 'waiting: the annex pile is full' : 'stacking the annex pile') : S.lv.belt ? (S.belt.length >= K.BELT_CAP ? 'waiting: the conveyor is full' : 'dropping nodules on the conveyor') : S.ore >= sim.oreCap() ? 'waiting: the ore pile is full' : 'stacking the ore pile' },
    crush: { home: 'walking to the press' + (sim.yardOf(c) === 2 ? ' at the annex yard' : ''), wait: 'waiting for two nodules' + (sim.yardOf(c) === 2 ? ' at the annex' : ''), crush: 'crushing nodules into a bar' + (sim.yardOf(c) === 2 ? ' at the annex yard' : ''), hold: 'waiting: the bar stack is full' },
    smelt: { toBar: 'walking to the bar stack', grab: S.bars ? 'grabbing a bar' : 'waiting for bars', toLava: 'carrying a ' + (c.nFine ? 'fine ' : '') + 'bar to the ' + (c.rim === 2 && S.lv.rim ? 'second rim' : 'lava'), smelt: 'smelting in the lava' + (c.rim === 2 && S.lv.rim ? ' pocket' : ''), toStock: 'carrying a' + (c.nFine ? ' fine' : 'n') + ' ingot to the stockpile', drop: 'stacking a' + (c.nFine ? ' fine' : 'n') + ' ingot' },
    energy: { idle: 'standing by', go: 'running to recharge a crab', charge: 'recharging a crab', toEngine: 'heading to the Stirling engine', queue: 'queuing at the engine', refill: S.heat < 1 ? 'waiting: the engine is out of charge' : 'charging up at the engine' },
    repair: { idle: 'waiting in the workshop', toMat: 'fetching an ingot for a new bit', fetch: S.stock ? 'taking an ingot' : 'waiting: no metal on the stockpile', toForge: 'taking the ingot to the lava forge', forge: 'forging a new part in the lava', toJob: 'taking the new part to a crab', fix: 'fitting the new part' },
    mech: { idle: 'waiting in the workshop', toMat: 'fetching a bar for a new leg', fetch: S.bars ? 'taking a bar' : 'waiting: no bars on the stack', toForge: 'taking the bar to the lava forge', forge: 'forging a new leg in the lava', toJob: 'taking the new leg to a crab', fix: 'fitting the new leg' }
  }[c.role][c.state] || 'starting up';
  if (c.state === 'sleep') t = 'asleep: off shift';
  if (c.state && c.state.charAt(0) === 'b' && { bseek: 1, bpick: 1, bhaul: 1, bstack: 1 }[c.state]) t = 'helping out: ' + { bseek: 'fetching nodules', bpick: 'picking up a nodule', bhaul: 'carrying nodules to the ore pile', bstack: 'stacking the ore pile' }[c.state] + (c.role === 'drill' && !c.bitOk ? ' while its bit waits for repair' : '');
  if (S.si && S.si.night && c.role !== 'scout' && S.t - c.lastRest > K.REST_WINDOW * K.DAY / 24 && c.state !== 'sleep') t += ' (tired: half speed at night)';
  if (c.air) t = c.air.vent === 'chimney' ? (c.air.phase === 'walk' ? 'heading for the hydrothermal chimney' : c.air.phase === 'rise' ? 'riding up the chimney\'s plume' : 'swimming down from the chimney') :
    c.air.phase === 'walk' ? 'heading for the thermal vent' : (c.air.phase === 'rise' ? 'floating up the thermal vent' : 'swimming down the current');
  if (sim.isHeld(c)) t = 'being repaired';
  if (c.apprentice) t += ' · apprentice, half pace, graduates in ' + fmtTime(c.apprentice.until - S.t);
  if (c.onPad) t += ' · on the charging pad';
  if (sim.inKelp(c.x)) t += ' · in the kelp';
  if (c.limp) t += ' (lost a leg)';
  if (c.role === 'drill' && !c.bitOk) t += ' (bit broken)';
  if (c.role === 'energy' && c.broken) t += ' (worn out)';
  if (c.role !== 'energy' && c.bat < K.LOW) t += ' (battery low)';
  if (c.moodZone === 'grumpy') t += ' · grumpy'; else if (c.moodZone === 'happy') t += ' · happy';
  return t;
}
function moodWord(c) { return c.moodZone === 'happy' ? 'happy' : c.moodZone === 'grumpy' ? 'grumpy' : 'content'; }
function drawInfo(c, x, y, s) {
  var line1 = c.name + ', ' + (c.apprentice ? 'apprentice ' : '') + NAMES[c.role].toLowerCase() + starText(c), line2 = statusText(c), line3 = recText(c), w;
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
