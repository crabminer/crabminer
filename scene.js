// ===== The view, part 2: the scene =====
// The view is four classic scripts, game.js, scene.js, crabs.js and controls.js, that share one global scope:
// every top-level var and function here is a window property the other three use, so each file is a chapter, not a module.
// This chapter draws everything that is not a crab: the water, the paper dunes, the cavern and the engine, the stations, the
// den and its pets, goods and flags, the ship, the plankton, the wreck and the tide pool, and ends with draw(), which composes
// the frame from all of them and from drawCrab() in crabs.js.
'use strict';

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
  for (var i = 0; i < bubbles.length; i++) { if (bubbles[i].x < visL || bubbles[i].x > visR) continue; ctx.beginPath(); ctx.arc(bubbles[i].x, bubbles[i].y, bubbles[i].r, 0, TAU); ctx.stroke(); }
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
  if (S.lv.rim) {                      // and the lava pocket's own smaller glow
    var p = rim2Pos(), r2 = 70 * p.s;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.45);
    g = ctx.createRadialGradient(0, 0, 2, 0, 0, r2);
    g.addColorStop(0, 'rgba(255,150,50,' + (0.3 + 0.06 * Math.sin(T * 2.6)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.fill();
    ctx.restore();
  }
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
  inkPainting: 'octopus-ink painting', driftwood: 'storm driftwood sculpture', shipBottle: 'ship in a bottle', lavaLamp: 'lava lamp', lanterns: 'string of festival lanterns',
  brassBell: 'brass ship\'s bell', goldAnchor: 'golden anchor', contractPlaque: 'contract plaque', shipWheel: 'ship\'s wheel',
  kelpRope: 'kelp-rope garland', kelpHammock: 'kelp hammock', kelpLantern: 'kelp lantern', cake: 'festival cake stand' };
var PET_NAMES = { slug: 'sea slug', babyOcto: 'baby octopus', starfish: 'starfish', snail: 'sea snail' };
var DEN_S = 2;                         // the den is drawn at twice the scale of the crabs: four times the house
function decorSlot(i) {                // decorations ring the den on the sand, nearest first
  var p = X(S.pos.DEN), y = groundY(p, 0.82), s = scaleAt(0.82), spots = [[-44, 2], [44, 2], [-56, 7], [56, 7], [-50, -6], [50, -6], [-66, 0], [66, 0], [-74, 6], [74, 6], [-62, -12], [62, -12], [-84, 0], [84, 0]];
  var sp = spots[i % spots.length];
  return { x: p + sp[0] * s, y: y + sp[1] * s, s: s };
}
function drawCake(x, y, s) {           // a two-tier festival cake: pink icing, a cherry and a candle
  var i;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#f7e0b5'; ctx.fillRect(-7, -5, 14, 5); ctx.fillRect(-4.5, -9.5, 9, 4.5);
  ctx.fillStyle = '#ff9ec4'; ctx.fillRect(-7, -6, 14, 1.6); ctx.fillRect(-4.5, -10.5, 9, 1.6);
  for (i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 3, -4.6, 0.9, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#e2443b'; ctx.beginPath(); ctx.arc(-1, -11.5, 1.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(2.5, -10.5); ctx.lineTo(2.5, -14); ctx.stroke();
  ctx.fillStyle = pal.lavaHot; ctx.beginPath(); ctx.ellipse(2.5, -15, 0.8, 1.3 + Math.sin(T * 9) * 0.2, 0, 0, TAU); ctx.fill();
  ctx.restore();
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
    case 'lanterns':                   // festival day's gift: paper lanterns on a string between two posts, lit at night
      ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-10, 0); ctx.moveTo(10, -14); ctx.lineTo(10, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, -13); ctx.quadraticCurveTo(0, -9, 10, -13); ctx.stroke();
      for (i = 0; i < 4; i++) {
        var lx = -7.5 + i * 5 + Math.sin(T * 2 + i) * 0.6, ly = -11.6 + Math.abs(i - 1.5) * -0.9 + 3;
        ctx.fillStyle = 'rgba(255,230,150,' + (0.15 + 0.45 * nightA).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, TAU); ctx.fill();
        ctx.fillStyle = i % 2 ? '#ffb347' : '#ff5c5c'; ctx.beginPath(); ctx.ellipse(lx, ly, 1.8, 2.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = pal.ingot; ctx.fillRect(lx - 0.8, ly - 2.9, 1.6, 0.8);
      }
      break;
    case 'brassBell':                  // contract rewards: a bell on a gallows, swinging a little
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-7, -15); ctx.lineTo(7, -15); ctx.lineTo(7, 0); ctx.stroke();
      ctx.save(); ctx.translate(0, -15); ctx.rotate(Math.sin(T * 1.7) * 0.15);
      ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.moveTo(-1.5, 0); ctx.lineTo(1.5, 0); ctx.quadraticCurveTo(2.5, 5, 5, 8); ctx.lineTo(-5, 8); ctx.quadraticCurveTo(-2.5, 5, -1.5, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = pal.metalDark; ctx.beginPath(); ctx.arc(0, 9, 1.2, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    case 'goldAnchor':
      ctx.strokeStyle = pal.ingot; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -2); ctx.moveTo(-6, -11); ctx.lineTo(6, -11); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -6, 7, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -17.5, 2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -2); ctx.stroke();
      break;
    case 'contractPlaque':
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(-9, -15, 18, 12); ctx.fillStyle = pal.ingot; ctx.fillRect(-7.5, -13.5, 15, 9);
      ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.7; for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-5.5, -11.5 + i * 2.6); ctx.lineTo(5.5, -11.5 + i * 2.6); ctx.stroke(); }
      ctx.fillStyle = pal.crab; ctx.beginPath(); ctx.arc(4.5, -6.5, 1.3, 0, TAU); ctx.fill();
      break;
    case 'kelpRope':                   // the kelp forest's pieces: a twisted rope swag, a hammock between posts, a lantern in a kelp cage
      ctx.strokeStyle = pal.weed; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -13); ctx.quadraticCurveTo(0, -3, 9, -13); ctx.stroke();
      ctx.strokeStyle = pal.weed2; ctx.lineWidth = 0.8; for (i = 0; i < 6; i++) { var rx = -7.5 + i * 3, ry = -12.2 + 8 * (1 - Math.pow((rx) / 9, 2)) * 0.95; ctx.beginPath(); ctx.moveTo(rx - 1, ry - 1.5); ctx.lineTo(rx + 1, ry + 1.5); ctx.stroke(); }
      ctx.fillStyle = '#ffd1dc'; for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-6 + i * 6, -11 + (i === 1 ? 4 : 1.5), 1.6, 0, TAU); ctx.fill(); }
      break;
    case 'kelpHammock':
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10, -12); ctx.moveTo(10, 0); ctx.lineTo(10, -12); ctx.stroke();
      ctx.strokeStyle = pal.weed; ctx.lineWidth = 1.2; for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10, -11); ctx.quadraticCurveTo(0, -4 + i * 1.6, 10, -11); ctx.stroke(); }
      ctx.strokeStyle = pal.weed2; ctx.lineWidth = 0.8; for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 4, -9.6 + Math.abs(i - 1.5) * -1.2 + 3); ctx.lineTo(-6 + i * 4, -9.6 + Math.abs(i - 1.5) * -1.2 + 6.2); ctx.stroke(); }
      break;
    case 'kelpLantern':
      ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,150,' + (0.15 + 0.45 * nightA).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(0, -11, 5.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.weed; ctx.lineWidth = 1.1; for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, -11, 1.2 + i * 1.4, 4.2, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.arc(0, -11, 1.4, 0, TAU); ctx.fill();
      break;
    case 'cake':                       // the night market's cake, on a little stand on the porch
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-4, -6); ctx.moveTo(5, 0); ctx.lineTo(4, -6); ctx.stroke();
      ctx.fillStyle = '#d9c7a8'; ctx.fillRect(-7, -7, 14, 1.6);
      drawCake(0, -7, 0.9);
      break;
    case 'shipWheel':
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -6); ctx.stroke();
      ctx.save(); ctx.translate(0, -12); ctx.rotate(mqReduce.matches ? 0 : T * 0.4);
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1.2; for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(Math.cos(i * Math.PI / 4) * 8, Math.sin(i * Math.PI / 4) * 8); ctx.lineTo(-Math.cos(i * Math.PI / 4) * 8, -Math.sin(i * Math.PI / 4) * 8); ctx.stroke(); }
      ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fill();
      ctx.restore();
      break;
  }
  ctx.restore();
}
function drawDen() {                   // a big round crab house: two floors of lit windows, a porch, a chimney, a flag, and the crabs' decorations
  var p = X(S.pos.DEN), y = groundY(p, 0.82), s = scaleAt(0.82), i, d, k = T * 1.5, still = mqReduce.matches;
  for (i = 0; i < S.decor.length; i++) { d = decorSlot(i); if (d.y < y - 20 * s) drawDecor(S.decor[i].kind, d.x, d.y, d.s); }   // the ones behind first
  ctx.save(); ctx.translate(p, y); ctx.scale(s * DEN_S, s * DEN_S); ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(2, 1, 22, 3.2, 0, 0, TAU); ctx.fill();   // its shadow on the sand
  ctx.fillStyle = pal.crab; ctx.beginPath(); ctx.ellipse(0, -10, 18, 14, 0, Math.PI, TAU); ctx.lineTo(18, 0); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill();   // the shell
  ctx.strokeStyle = pal.crabDark; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.quadraticCurveTo(0, -13, 18, -8); ctx.stroke(); ctx.globalAlpha = 1;   // the line between the floors
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-6, -17, 7, 2.6, -0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.crabDark; ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 6.5, 0, Math.PI, TAU); ctx.fill();   // the door
  ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.arc(2.6, -2.6, 0.5, 0, TAU); ctx.fill();                   // its handle
  ctx.fillStyle = pal.sandLine; ctx.globalAlpha = 0.7; ctx.fillRect(-7, -0.5, 14, 1.2); ctx.globalAlpha = 1;   // the porch step
  ctx.fillStyle = pal.light;                                                                                   // lit windows: four downstairs, three up, each on its own flicker
  [[-11, -6], [-6, -5], [6, -5], [11, -6]].forEach(function (w, j) { ctx.globalAlpha = 0.55 + 0.35 * Math.sin(k + j * 1.7); ctx.beginPath(); ctx.arc(w[0], w[1], 1.5, 0, TAU); ctx.fill(); });
  [[-7, -14], [0, -17], [7, -14]].forEach(function (w, j) { ctx.globalAlpha = 0.55 + 0.35 * Math.sin(k * 1.2 + j * 2.1 + 1); ctx.beginPath(); ctx.arc(w[0], w[1], 1.3, 0, TAU); ctx.fill(); });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.crabDark; ctx.lineWidth = 0.5;                                                         // window frames
  [[-11, -6, 1.5], [-6, -5, 1.5], [6, -5, 1.5], [11, -6, 1.5], [-7, -14, 1.3], [0, -17, 1.3], [7, -14, 1.3]].forEach(function (w) { ctx.beginPath(); ctx.arc(w[0], w[1], w[2], 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w[0] - w[2], w[1]); ctx.lineTo(w[0] + w[2], w[1]); ctx.moveTo(w[0], w[1] - w[2]); ctx.lineTo(w[0], w[1] + w[2]); ctx.stroke(); });
  ctx.fillStyle = pal.crabDark; ctx.fillRect(10, -24, 3, 6);                                                   // the chimney, with a bubble now and then
  if (!still && Math.random() < 0.02) bubbles.push({ x: p + 11.5 * s * DEN_S, y: y - 25 * s * DEN_S, r: rr(1, 2.2) * s, vy: rr(14, 24), ph: rr(0, TAU) });
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -33); ctx.stroke();   // the flagpole
  ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.moveTo(0, -33); ctx.lineTo(7, -30.5 + Math.sin(T * 3) * 0.8); ctx.lineTo(0, -28); ctx.closePath(); ctx.fill();
  if (S.festival) {                                                                                            // festival day: bunting from the flagpole to a post either side
    ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.4;
    [-1, 1].forEach(function (sd) {
      var j, t, bx, bY, fl;
      ctx.beginPath(); ctx.moveTo(0, -33); ctx.quadraticCurveTo(sd * 16, -22, sd * 30, -14); ctx.moveTo(sd * 30, -14); ctx.lineTo(sd * 30, 0); ctx.stroke();
      for (j = 1; j <= 6; j++) {
        t = j / 7; bx = 2 * (1 - t) * t * sd * 16 + t * t * sd * 30; bY = (1 - t) * (1 - t) * -33 + 2 * (1 - t) * t * -22 + t * t * -14; fl = Math.sin(T * 4 + j + sd) * 0.5;
        ctx.fillStyle = ['#ff5c5c', '#ffd23f', '#5cc8ff', '#7fe08a'][j % 4]; ctx.beginPath(); ctx.moveTo(bx - 1.6, bY); ctx.lineTo(bx + 1.6, bY); ctx.lineTo(bx + fl, bY + 3.2); ctx.closePath(); ctx.fill();
      }
    });
  }
  ctx.restore();
  for (i = 0; i < S.decor.length; i++) { d = decorSlot(i); if (d.y >= y - 20 * s) drawDecor(S.decor[i].kind, d.x, d.y, d.s); }
}
// ----- pets: they live by the den, wander, sleep by the porch at night, and get petted -----
// Their view state hangs on the sim's pet objects under v-names, so saves leave it out and a new game forgets it.
var PET_SPEED = { slug: 5, babyOcto: 26, starfish: 3, snail: 4 };
function updatePets(dtReal) {
  var i, j, p, c, home = S.pos.DEN, night = S.si && S.si.night, dtv = dtReal * Math.max(speed, 0.25), tx, v, st, cand;
  for (i = 0; i < S.pets.length; i++) {
    p = S.pets[i];
    if (p.vx === undefined) { p.vx = home + rr(-40, 40); p.vd = rr(0.88, 0.95); p.vdir = 1; p.vph = rr(0, TAU); p.vmode = 'rest'; p.vt = rr(1, 4); p.vhop = 0; p.vfriend = null; p.vtx = p.vx; }
    p.vt -= dtv;
    if (p.vhop > 0) p.vhop = Math.max(0, p.vhop - dtv * 2.5);
    if (night) p.vmode = 'sleep';
    else if (p.vmode === 'sleep' || p.vt <= 0) {
      var r = Math.random();
      if (p.vmode === 'paddle' && p.vd0 !== undefined) { p.vd = p.vd0; p.vd0 = undefined; }
      if (poolFill() > 0.6 && r < 0.3) {                      // high water: a paddle in the tide pool
        p.vmode = 'paddle'; p.vtx = POOL_X + rr(-9, 9); p.vt = rr(6, 12); p.vd0 = p.vd; p.vd = POOL_D + rr(-0.012, 0.012);
      } else if (p.kind === 'babyOcto' && r < 0.35) {              // the baby octopus tags along after a crab passing the den
        cand = near(home, 110).filter(function (n) { return n.d > 0.75 && !n.manta && !n.turtle; });
        p.vfriend = cand.length ? anyOf(cand) : null; p.vmode = p.vfriend ? 'follow' : 'wander'; p.vtx = home + rr(-70, 70); p.vt = rr(4, 9);
      } else if (r < 0.55) { p.vmode = 'wander'; p.vtx = home + rr(-70, 70); p.vt = rr(3, 8); }
      else { p.vmode = 'rest'; p.vt = rr(2, 6); }
    }
    if (speed === 0) continue;
    tx = null;
    if (p.vmode === 'sleep') tx = home + 24 + i * 9;       // curled up by the porch
    else if (p.vmode === 'follow') {
      if (p.vfriend && !p.vfriend.gone && p.vfriend.state !== 'sleep' && Math.abs(p.vfriend.x - home) < 140) tx = p.vfriend.x - p.vfriend.dir * 14;
      else { p.vmode = 'wander'; tx = p.vtx; }
    } else if (p.vmode === 'wander') tx = p.vtx;
    else if (p.vmode === 'paddle') { tx = p.vtx; if (poolFill() < 0.3) p.vt = 0; }   // the tide going out ends the paddle
    if (tx !== null && Math.abs(tx - p.vx) > 2) {
      v = PET_SPEED[p.kind] * dtv; st = clamp(tx - p.vx, -v, v);
      p.vdir = st > 0 ? 1 : -1; p.vx += st; p.vmoving = true;
      if (p.kind === 'babyOcto' && p.vhop === 0) p.vhop = 1;   // it gets about in little jets
    } else p.vmoving = false;
    if (p.vmode !== 'sleep') for (j = 0; j < S.crabs.length; j++) {     // an idle crab beside a pet stops to pet it
      c = S.crabs[j];
      if (c.moving || c.working || c.state === 'sleep' || c.alt > 0 || c.d < 0.75 || Math.abs(c.x - p.vx) > 18 || T < (c.vnextPat || 0)) continue;
      c.vnextPat = T + rr(8, 16); play(c, ['sparkleEyes', 'wave', 'bow', 'cheerUp'], 1.8);
      if (Math.random() < 0.6) say(c, TALK.petPat, 1.6);
      p.vhappy = T + 2; p.vt = Math.max(p.vt, 2); break;
    }
  }
}
function petY(p) { return p.vx === undefined ? groundY(X(S.pos.DEN), 0.9) : groundY(X(p.vx), p.vd); }
function drawPet(p) {
  if (p.vx === undefined) return;
  var px = X(p.vx), gy = petY(p), s = scaleAt(p.vd) * 0.7, asleep = p.vmode === 'sleep', happy = p.vhappy > T, k = p.kind, i, hop = Math.sin((p.vhop || 0) * Math.PI) * 6;
  var eyes = function (x, y, r, gap) {   // two eyes: closed lines asleep, happy arcs when petted, else white with a pupil
    var e;
    for (e = -1; e <= 1; e += 2) {
      var ex = x + e * gap;
      if (asleep) { ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(ex - r, y); ctx.lineTo(ex + r, y); ctx.stroke(); }
      else if (happy) { ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(ex, y + r * 0.6, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.arc(ex + 0.3, y, r * 0.5, 0, TAU); ctx.fill(); }
    }
  };
  var paddling = p.vmode === 'paddle' && !p.vmoving && Math.abs(p.vx - POOL_X) < 14 && poolFill() > 0.3;
  if (paddling) gy += Math.sin(T * 2.2 + p.vph) * 1.2 * s + 1.5 * s;   // afloat in the pool, bobbing
  ctx.save(); ctx.translate(px, gy); ctx.scale(s * p.vdir, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.beginPath(); ctx.ellipse(0, 0.5, 9, 2, 0, 0, TAU); ctx.fill();
  if (paddling) {                      // ripples round a paddling pet, and the odd bubble
    ctx.strokeStyle = pal.foam; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(0, 0, 11 + Math.sin(T * 3 + p.vph) * 1.5, 3, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (Math.random() < 0.03) bubbles.push({ x: px + rr(-6, 6) * s, y: gy - 2 * s, r: rr(0.8, 1.6) * s, vy: rr(12, 20), ph: rr(0, TAU) });
  }
  if (k === 'slug') {                  // a nudibranch: an orange body, purple cerata with yellow tips along its back, two rhinophores
    var inch = p.vmoving ? Math.abs(Math.sin(T * 5 + p.vph)) : 0;
    ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.ellipse(0, -3, 10 + inch * 2, 3.2, 0, 0, TAU); ctx.fill();
    for (i = -3; i <= 3; i++) {
      var cx = i * 2.6 + Math.sin(T * 3 + i + p.vph) * 0.8, cy = -8.5 + Math.abs(i) * 0.4;
      ctx.strokeStyle = '#a65cff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(i * 2.6, -5); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(cx, cy, 0.9, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#a65cff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(9.5, -9); ctx.moveTo(10, -4.5); ctx.lineTo(12, -8); ctx.stroke();   // rhinophores
    eyes(9, -3.6, 0.8, 1.2);
  } else if (k === 'babyOcto') {       // a baby octopus: a round pink head with big eyes, six little arms, jetting about in hops
    var sq = p.vmoving ? 1 + 0.12 * Math.sin(T * 8) : 1 + 0.04 * Math.sin(T * 2 + p.vph);
    ctx.translate(0, -hop);
    if (hop > 1) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(-4, 1 + hop, 1.2, 0, TAU); ctx.arc(-6, 2 + hop, 0.8, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#e88bd0'; ctx.lineWidth = 1.6;
    for (i = 0; i < 6; i++) { var ax = -5 + i * 2, aw = Math.sin(T * 5 + i + p.vph); ctx.beginPath(); ctx.moveTo(ax, -4); ctx.quadraticCurveTo(ax + aw * 2, -1.5, ax + aw * 2.5, 0.2); ctx.stroke(); }
    ctx.fillStyle = '#e88bd0'; ctx.beginPath(); ctx.ellipse(0, -8, 6 * sq, 6.5 / sq, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; [[-3, -12], [2, -13.5], [4, -10]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 0.8, 0, TAU); ctx.fill(); });
    eyes(0, -8.5, 1.7, 2.6);
    ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(0, -5.6, 1.2, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  } else if (k === 'starfish') {       // a starfish: five orange arms with pale dots, a tiny face in the middle, creeping along
    ctx.save(); ctx.translate(0, -5); ctx.rotate(p.vmoving ? T * 0.8 * p.vdir : Math.sin(T + p.vph) * 0.08);
    star(0, 0, 6.5, '#ff7a59', '#d85a3a');
    ctx.fillStyle = '#ffd6b8'; for (i = 0; i < 5; i++) { var sa = -Math.PI / 2 + i * TAU / 5; ctx.beginPath(); ctx.arc(Math.cos(sa) * 3.2, Math.sin(sa) * 3.2, 0.6, 0, TAU); ctx.arc(Math.cos(sa) * 5, Math.sin(sa) * 5, 0.45, 0, TAU); ctx.fill(); }
    ctx.restore();
    eyes(0, -5.6, 0.7, 1.2);
    ctx.strokeStyle = pal.pupil; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(0, -4.4, 0.9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {                             // a sea snail: a green foot, eye stalks, a spiral shell, and a glistening trail
    ctx.fillStyle = 'rgba(255,255,255,.35)'; for (i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(-9 - i * 4 + Math.sin(i * 7) , 0.2, 0.9, 0, TAU); ctx.fill(); }
    var slide = p.vmoving ? Math.sin(T * 4 + p.vph) * 0.6 : 0;
    ctx.fillStyle = '#9ad67a'; ctx.beginPath(); ctx.ellipse(2 + slide, -2, 8.5, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9ad67a'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(9.5 + slide, -8.5); ctx.moveTo(9.5, -3); ctx.lineTo(11.5 + slide, -8); ctx.stroke();
    ctx.fillStyle = '#d9a066'; ctx.beginPath(); ctx.arc(-2, -6.5, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a8743f'; ctx.lineWidth = 0.9; ctx.beginPath();
    for (i = 0; i <= 18; i++) { var th = i * 0.6, rad = 4.4 - i * 0.22; ctx.lineTo(-2 + Math.cos(th) * rad, -6.5 + Math.sin(th) * rad); } ctx.stroke();
    eyes(10.5 + slide, -8.6, 0.7, 1);
  }
  if (asleep) { ctx.fillStyle = pal.ink || pal.pupil; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center'; ctx.scale(p.vdir, 1); ctx.fillText('z', 6, -14 + Math.sin(T * 2) * 1); }
  else if (happy) {                    // a little heart over its head
    ctx.fillStyle = '#ff5c8a'; ctx.save(); ctx.translate(0, -17 - (T - (p.vhappy - 2)) * 3); ctx.beginPath(); ctx.moveTo(0, 2.6); ctx.lineTo(-2.6, 0); ctx.arc(-1.3, -0.6, 1.5, Math.PI, 0); ctx.arc(1.3, -0.6, 1.5, Math.PI, 0); ctx.lineTo(2.6, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
// The crushing yard is a line of press stations, one a crusher, on a roller table: each press is a frame with a
// hammer block that drops as its crusher pounds. Haulers queue up to the ore pile on the field side, and the smelters
// line up to the bar stack, so the yard reads as a factory floor rather than a huddle.
function drawPress(c) {                // one crusher's press station, drawn just behind the crusher
  var st = sim.crushSpot(c), px = X(st.x), y = groundY(px, st.d), s = scaleAt(st.d), hit = c.state === 'crush' ? Math.abs(Math.sin(T * 9 + c.vph)) : 0.1;
  ctx.save(); ctx.translate(px, y); ctx.scale(s, s);
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-9, -26); ctx.lineTo(9, -26); ctx.lineTo(9, 0); ctx.stroke();           // the frame
  ctx.fillStyle = pal.metal; ctx.fillRect(-10, -27.5, 20, 3);                                                             // the crossbar
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -21 + hit * 7); ctx.stroke();   // the ram
  ctx.fillStyle = pal.crushDark; roundRect(-5, -21 + hit * 7, 10, 5, 1); ctx.fill();                                      // the hammer block
  ctx.fillStyle = pal.metalDark; ctx.globalAlpha = 0.8; ctx.fillRect(-11, -2.2, 22, 2.2); ctx.globalAlpha = 1;             // the anvil plate
  ctx.restore();
}
function drawRollers(yard) {           // the roller table the front row of presses stands on; an empty press marks a yard with no crushers
  var two = yard === 2, d = two ? K.ANNEX_D : 0.78, i, c, st, px, x0 = 1e9, x1 = -1e9, s = scaleAt(d), y = groundY(X(two ? S.pos.CRUSH2 : S.pos.CRUSH), d);
  for (i = 0; i < S.crabs.length; i++) { c = S.crabs[i]; if (c.role !== 'crush' || sim.yardOf(c) !== (two ? 2 : 1)) continue; st = sim.crushSpot(c); if (st.d > d - 0.03) { px = X(st.x); x0 = Math.min(x0, px); x1 = Math.max(x1, px); } }
  if (x0 > x1) {
    px = X(two ? S.pos.CRUSH2 : S.pos.CRUSH);
    ctx.save(); ctx.translate(px, y); ctx.scale(s, s); ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-9, -26); ctx.lineTo(9, -26); ctx.lineTo(9, 0); ctx.stroke(); ctx.fillStyle = pal.metal; ctx.fillRect(-10, -27.5, 20, 3); ctx.restore();
    return;
  }
  ctx.save(); ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(x0 - 14 * s, y + 1.5 * s); ctx.lineTo(x1 + 14 * s, y + 1.5 * s); ctx.stroke();
  for (px = x0 - 12 * s; px <= x1 + 12 * s; px += 5 * s) { ctx.beginPath(); ctx.arc(px, y + 1.5 * s, 1.4 * s, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawOrePile(pile) {           // the fine nodules sit on top of the pile
  var two = pile === 2, n = Math.max(0, (two ? S.ore2 : S.ore) - incoming(two ? 'ore2' : 'ore')), nf = Math.min(n, two ? S.ore2Fine : S.oreFine), i, s, sc = scaleAt(two ? K.ANNEX_D : 0.8);
  for (i = 0; i < n; i++) { s = oreSlot(i, pile); drawNod(s.x, s.y, (3.6 + ((i * 37) % 7) / 10) * sc, 1, ((i * 53) % 9) / 10 - 0.4, i >= n - nf); }
}
function drawBarStack() {
  var n = Math.max(0, S.bars - incoming('bars')), nf = Math.min(n, S.barsFine), i, s;
  for (i = 0; i < n; i++) { s = barSlot(i); drawBar(s.x, s.y, scaleAt(0.78), 0, i >= n - nf); }
}
function fineSlot(i) {                 // fine ingots on their own shelf, a step to the right of the pile, three to a row
  var s = scaleAt(0.84), px = X(S.pos.STOCK) + 36 * s, y = groundY(px, 0.84) - 10 * s;
  return { x: px + ((i % 3) - 1) * 8.6 * s, y: y - 2.2 * s - Math.floor(i / 3) * 4.2 * s };
}
function drawStockpile() {
  var n = Math.max(0, S.stock - S.stockFine - incoming('stock')), nf = Math.max(0, S.stockFine - incoming('stockFine')), shown = Math.min(n, 15), shownF = Math.min(nf, 9), i, s, px = X(S.pos.STOCK), y = groundY(px, 0.84), sc = scaleAt(0.84), fx = px + 36 * sc, fy = y - 10 * sc;
  // a pallet under the pile
  ctx.fillStyle = pal.metalDark; ctx.globalAlpha = 0.7; ctx.fillRect(px - 26 * sc, y - 1.5 * sc, 52 * sc, 3 * sc); ctx.globalAlpha = 1;
  for (i = 0; i < shown; i++) { s = stockSlot(i); drawIngot(s.x, s.y, sc * 0.95, i < S.reserve); }
  ctx.font = '700 ' + Math.round(10 * sc + 1) + 'px ' + cssFont; ctx.textAlign = 'center'; ctx.fillStyle = pal.ink;
  if (n > shown) ctx.fillText('+' + (n - shown), px + 30 * sc, y - 4 * sc);
  // the fine shelf: a plank on two legs, the fine ingots stacked on it
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.4 * sc; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(fx - 10 * sc, fy); ctx.lineTo(fx - 10 * sc, y + 0.5 * sc); ctx.moveTo(fx + 10 * sc, fy); ctx.lineTo(fx + 10 * sc, y + 0.5 * sc); ctx.stroke();
  ctx.fillStyle = pal.barDark; ctx.fillRect(fx - 15 * sc, fy - 1.2 * sc, 30 * sc, 2.4 * sc); ctx.globalAlpha = 1;
  for (i = 0; i < shownF; i++) { s = fineSlot(i); drawIngot(s.x, s.y, sc * 0.95, i < S.reserveFine, true); }
  if (nf > shownF) { ctx.fillStyle = pal.ink; ctx.fillText('+' + (nf - shownF), fx + 20 * sc, fy - 4 * sc); }
  // the reserve tags
  var tag = 'keep ' + S.reserve;
  ctx.save(); ctx.translate(px - 30 * sc, y - 18 * sc); ctx.rotate(-0.08);
  ctx.fillStyle = pal.paper; ctx.fillRect(-15 * sc, -7 * sc, 30 * sc, 12 * sc);
  ctx.fillStyle = pal.ink; ctx.font = '700 ' + Math.round(8 * sc + 1) + 'px ' + cssFont; ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, -1 * sc);
  ctx.restore();
  if (S.stockFine || S.reserveFine || S.stat.fineIngots) {
    ctx.save(); ctx.translate(fx, fy + 7 * sc); ctx.rotate(0.06);
    ctx.fillStyle = pal.paper; ctx.fillRect(-14 * sc, -5.5 * sc, 28 * sc, 10 * sc);
    ctx.fillStyle = pal.ink; ctx.font = '700 ' + Math.round(7 * sc + 1) + 'px ' + cssFont; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText('fine · keep ' + S.reserveFine, 0, -0.5 * sc);
    ctx.restore();
  }
}

// ----- drawing: goods and flags -----
// Fine metal (from the richest deposits) carries a gold glint at every stage: nodule, bar and ingot.
function drawNod(x, y, r, a, rot, fine) {
  ctx.globalAlpha = a; ctx.fillStyle = pal.nodule;
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * 0.85, rot || 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = a * 0.25; ctx.fillStyle = pal.sandLine;
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.3, r * 0.45, r * 0.22, rot || 0, 0, TAU); ctx.fill();
  if (fine) { ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(T * 5 + x)); ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.arc(x + r * 0.3, y + r * 0.1, r * 0.32, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawBar(x, y, s, heat, fine) {
  roundRect(x - 4.4 * s, y - 2 * s, 8.8 * s, 4 * s, 1.2 * s);
  ctx.fillStyle = pal.bar; ctx.fill();
  ctx.strokeStyle = pal.barDark; ctx.lineWidth = 0.8; ctx.stroke();
  if (fine) { ctx.fillStyle = pal.ingot; ctx.fillRect(x - 3.2 * s, y - 0.6 * s, 6.4 * s, 1.2 * s); }
  if (heat > 0) { ctx.globalAlpha = heat; ctx.fillStyle = pal.lavaHot; ctx.fill(); ctx.globalAlpha = 1; }
}
function drawIngot(x, y, s, held, fine) {
  ctx.fillStyle = fine ? pal.light : pal.ingot; ctx.globalAlpha = held ? 0.12 : (fine ? 0.45 : 0.3);
  ctx.beginPath(); ctx.arc(x, y, 6.5 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(x - 4.6 * s, y + 2 * s); ctx.lineTo(x - 3.2 * s, y - 2 * s); ctx.lineTo(x + 3.2 * s, y - 2 * s); ctx.lineTo(x + 4.6 * s, y + 2 * s); ctx.closePath();
  ctx.fillStyle = held ? pal.ingotDark : pal.ingot;
  ctx.fill(); ctx.strokeStyle = pal.ingotDark; ctx.lineWidth = 0.8; ctx.stroke();
  if (fine) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.55 + 0.45 * Math.sin(T * 6 + x * 0.3); star(x + 1.6 * s, y - 0.4 * s, 1.5 * s, '#fff', pal.ingotDark); ctx.globalAlpha = 1; }
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
function chimneyPos() { var ch = S.chimney, px = X(ch.x); return { x: px, y: groundY(px, ch.d), s: scaleAt(ch.d) }; }
function drawChimney() {             // the hydrothermal chimney: a stack of rock with a shimmering column of hot water, fading in and out
  var ch = S.chimney, p, s, top, g, i, y, w, a = chimneyA, cx;
  if (!ch || a < 0.02) return;
  p = chimneyPos(); s = p.s; top = chimneyTop(ch.x); w = 14 * CS * a;
  ctx.save(); ctx.globalAlpha = a;
  g = ctx.createLinearGradient(0, top, 0, p.y);
  g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(0.5, 'rgba(255,190,120,.12)'); g.addColorStop(1, 'rgba(255,150,80,.3)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x - w * 0.5, p.y - 14 * s);
  for (y = p.y - 14 * s; y >= top; y -= 10) ctx.lineTo(p.x - w * (0.3 + 0.3 * (y - top) / (p.y - top)) + Math.sin(y * 0.07 + T * 2.4) * 3, y);
  for (y = top; y <= p.y - 14 * s; y += 10) ctx.lineTo(p.x + w * (0.3 + 0.3 * (y - top) / (p.y - top)) + Math.sin(y * 0.07 + T * 2.4 + 1) * 3, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.foam; ctx.lineWidth = 1; ctx.globalAlpha = 0.3 * a;   // the shimmer
  for (i = 0; i < 2; i++) { ctx.beginPath(); for (y = p.y - 14 * s; y >= top; y -= 8) { cx = p.x + Math.sin(y * 0.05 - T * 3.5 + i * 2.5) * w * 0.3; if (y === p.y - 14 * s) ctx.moveTo(cx, y); else ctx.lineTo(cx, y); } ctx.stroke(); }
  ctx.globalAlpha = a;
  // the stack: a cone of dark rock with a glowing throat, mineral crusts down its sides
  ctx.fillStyle = pal.mechDark; ctx.beginPath(); ctx.moveTo(p.x - 13 * s, p.y); ctx.lineTo(p.x - 5 * s, p.y - 16 * s); ctx.lineTo(p.x + 5 * s, p.y - 16 * s); ctx.lineTo(p.x + 13 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = pal.ingot; ctx.globalAlpha = 0.5 * a; ctx.fillRect(p.x - 8 * s, p.y - 6 * s, 3 * s, 1.5 * s); ctx.fillRect(p.x + 4 * s, p.y - 9 * s, 3 * s, 1.5 * s); ctx.fillRect(p.x - 3 * s, p.y - 12 * s, 2 * s, 1.5 * s);
  ctx.globalAlpha = a; ctx.fillStyle = pal.lavaHot; ctx.beginPath(); ctx.ellipse(p.x, p.y - 16 * s, 4.5 * s, 1.6 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,120,' + (0.25 + 0.15 * Math.sin(T * 3)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 17 * s, 7 * s, 3 * s, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function beltPoint(lx) { var px = X(lx); return { x: px, y: groundY(px, K.BELT_D) - 5 * scaleAt(K.BELT_D) }; }   // a point on the conveyor's band
function drawBelt() {                // the ore conveyor: a band on rollers from the field's edge to the ore pile, nodules riding it
  if (!S.lv.belt) return;
  var s = scaleAt(K.BELT_D), x0 = X(K.BELT_HEAD), x1 = X(S.pos.BELT_END), y = groundY(X(K.BELT_HEAD), K.BELT_D), i, px, off = (T * K.BELT_SPEED * (X(1) - X(0))) % (8 * s);
  ctx.save(); ctx.lineCap = 'round';
  for (px = x0 + 6 * s; px < x1; px += 22 * s) { ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(px, y - 3 * s); ctx.lineTo(px, y + 1 * s); ctx.stroke(); }   // legs
  ctx.fillStyle = pal.mechDark; roundRect(x0 - 4 * s, y - 8 * s, x1 - x0 + 8 * s, 5 * s, 2.5 * s); ctx.fill();   // the band
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2 * s, y - 8 * s, x1 - x0 + 4 * s, 5 * s); ctx.clip();                   // ridges moving along it
  ctx.strokeStyle = pal.metal; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
  for (px = x0 - 8 * s + off; px < x1 + 8 * s; px += 8 * s) { ctx.beginPath(); ctx.moveTo(px, y - 8 * s); ctx.lineTo(px - 2 * s, y - 3 * s); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = pal.metal; ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1;                                 // the end rollers
  ctx.beginPath(); ctx.arc(x0 - 4 * s, y - 5.5 * s, 3 * s, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x1 + 4 * s, y - 5.5 * s, 3 * s, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pal.metalDark; ctx.beginPath(); ctx.arc(x0 - 4 * s + Math.cos(T * 4) * 1.2 * s, y - 5.5 * s + Math.sin(T * 4) * 1.2 * s, 0.8 * s, 0, TAU); ctx.fill();
  for (i = 0; i < S.belt.length; i++) drawNod(X(S.belt[i].x), y - 9.5 * s, 3.4 * s, 1, i * 0.7 + S.belt[i].x * 0.05);   // the nodules riding it
  ctx.restore();
}
function rim2Pos() { var px = X(K.RIM2); return { x: px, y: groundY(px, K.RIM2_D), s: scaleAt(K.RIM2_D) }; }
function drawRim2() {                // the second smelting rim: a pocket of lava open in the cavern side, ringed with dark rock
  var p = rim2Pos(), s = p.s, i, g, t, bx;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = pal.rock; ctx.beginPath(); ctx.ellipse(0, 0, 21 * s, 8.5 * s, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = pal.rockLine; ctx.lineWidth = 1; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
  g = ctx.createRadialGradient(0, 0, 1, 0, 0, 15 * s);
  g.addColorStop(0, pal.lavaHot); g.addColorStop(0.55, pal.lava); g.addColorStop(1, pal.lavaDeep);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0.5 * s, 15 * s, 5.5 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.rockDark; ctx.globalAlpha = 0.45;                            // crust drifting on the pocket
  for (i = 0; i < 2; i++) { t = (T * 0.05 + i * 0.5) % 1; ctx.beginPath(); ctx.ellipse((-9 + 18 * t) * s, (1.5 - i * 2) * s, 3.6 * s, 1.2 * s, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.fillStyle = pal.lavaHot;                               // bubbles breaking its skin
  for (i = 0; i < 3; i++) { t = (T * 0.5 + i * 0.37) % 1; bx = (-7 + 7 * i) * s; if (t < 0.7) { ctx.beginPath(); ctx.arc(bx, 0.5 * s, 2 * s * t / 0.7, Math.PI, TAU); ctx.fill(); } }
  ctx.strokeStyle = pal.lavaHot; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(0, 0.5 * s, 15 * s, 5.5 * s, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
}
function cableEnds() {               // the cableway: a pylon by the annex yard, a pylon by the bar stack, a cable between
  var ax = X(S.pos.CRUSH2 + 18), ay = groundY(ax, K.ANNEX_D - 0.03), bx = X(S.pos.BAR - 14), by = groundY(bx, 0.76);
  return { a: { x: ax, y: ay, s: scaleAt(K.ANNEX_D) }, b: { x: bx, y: by, s: scaleAt(0.76) } };
}
function cablePoint(t) { var e = cableEnds(), ya = e.a.y - 30 * e.a.s, yb = e.b.y - 30 * e.b.s; return { x: e.a.x + (e.b.x - e.a.x) * t, y: ya + (yb - ya) * t + Math.sin(Math.PI * t) * 10 * CS }; }
function drawCableway() {            // drawn over the middle dune, under the front dune's crabs: bars from the annex yard ride buckets down it
  var e = cableEnds(), i, p, t;
  ctx.save(); ctx.strokeStyle = pal.metalDark; ctx.lineCap = 'round';
  for (i = 0; i < 2; i++) {          // the pylons
    p = i ? e.b : e.a; ctx.lineWidth = 2.2 * p.s;
    ctx.beginPath(); ctx.moveTo(p.x - 5 * p.s, p.y); ctx.lineTo(p.x, p.y - 32 * p.s); ctx.lineTo(p.x + 5 * p.s, p.y); ctx.stroke();
    ctx.lineWidth = 1.2 * p.s; ctx.beginPath(); ctx.moveTo(p.x - 3 * p.s, p.y - 14 * p.s); ctx.lineTo(p.x + 3 * p.s, p.y - 14 * p.s); ctx.stroke();
    ctx.fillStyle = pal.metal; ctx.beginPath(); ctx.arc(p.x, p.y - 32 * p.s, 2.4 * p.s, 0, TAU); ctx.fill();
  }
  ctx.lineWidth = 1.1; ctx.globalAlpha = 0.85;              // the cable, sagging a little
  ctx.beginPath(); for (t = 0; t <= 1.001; t += 0.05) { p = cablePoint(t); if (t === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); } ctx.stroke();
  ctx.globalAlpha = 0.5; ctx.lineWidth = 0.8;              // the return cable
  ctx.beginPath(); for (t = 0; t <= 1.001; t += 0.05) { p = cablePoint(t); if (t === 0) ctx.moveTo(p.x, p.y + 4 * CS); else ctx.lineTo(p.x, p.y + 4 * CS); } ctx.stroke();
  for (i = 0; i < 3; i++) {          // empty buckets going back up
    t = 1 - ((T * 0.09 + i / 3) % 1); p = cablePoint(t);
    ctx.globalAlpha = 0.7; ctx.fillStyle = pal.metal; ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 4 * CS); ctx.lineTo(p.x, p.y + 9 * CS); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - 4 * CS, p.y + 9 * CS); ctx.lineTo(p.x + 4 * CS, p.y + 9 * CS); ctx.lineTo(p.x + 3 * CS, p.y + 14 * CS); ctx.lineTo(p.x - 3 * CS, p.y + 14 * CS); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function padPos() { var px = X(S.pos.PAD); return { x: px, y: groundY(px, K.PAD_D), s: scaleAt(K.PAD_D) }; }
function drawPad() {                 // the charging pad: a disc with rings and a bolt, glowing while a crab stands on it
  if (!S.lv.pad) return;
  var p = padPos(), s = p.s, on = false, i, lv = S.lv.pad, pulse = 0.5 + 0.5 * Math.sin(T * 3);
  for (i = 0; i < S.crabs.length; i++) if (S.crabs[i].onPad) { on = true; break; }
  ctx.save(); ctx.translate(p.x, p.y);
  if (on) { ctx.fillStyle = pal.light; ctx.globalAlpha = 0.18 + 0.12 * pulse; ctx.beginPath(); ctx.ellipse(0, 0, 26 * s, 9 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = pal.metalDark; ctx.beginPath(); ctx.ellipse(0, 0, 19 * s, 6.5 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.metal; ctx.beginPath(); ctx.ellipse(0, -0.8 * s, 17 * s, 5.5 * s, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = on ? pal.light : pal.energy; ctx.lineWidth = 1.2 * s; ctx.globalAlpha = on ? 0.6 + 0.4 * pulse : 0.7;
  for (i = 1; i <= lv + 1; i++) { ctx.beginPath(); ctx.ellipse(0, -0.8 * s, (5 + i * 4.5) * s, (1.6 + i * 1.4) * s, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = on ? pal.light : pal.energy;                                                   // the bolt
  ctx.beginPath(); ctx.moveTo(1 * s, -4.5 * s); ctx.lineTo(-2 * s, -0.5 * s); ctx.lineTo(0.3 * s, -0.5 * s); ctx.lineTo(-1 * s, 3 * s); ctx.lineTo(2.2 * s, -1.2 * s); ctx.lineTo(0, -1.2 * s); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// The kelp forest at the field's left end: tall fronds on every dune, behind and in front of whoever walks through,
// swaying with the water and parting round a crab. Roped off with a paper tag until it is claimed.
function drawKelp(k, front) {
  var i, w, by, px, h, sway, near2, j, c, seg, f, x, y;
  for (i = 0; i < kelp.length; i++) {
    w = kelp[i]; if (w.k !== k || w.front !== front) continue;
    px = X(w.x); by = groundY(px, w.d); h = w.h * CS; near2 = 0;
    for (j = 0; j < S.crabs.length; j++) { c = S.crabs[j]; if (Math.abs(c.x - w.x) < 14 && Math.abs(c.d - w.d) < 0.08 && c.moving) { near2 = 1; break; } }
    w.sw += ((near2 ? 2.2 : 1) - w.sw) * 0.08;
    sway = w.amp * w.sw * CS;
    ctx.strokeStyle = pal.weed; ctx.lineWidth = 2.2 * CS; ctx.lineCap = 'round'; ctx.globalAlpha = front ? 0.85 : 0.95;
    ctx.beginPath(); ctx.moveTo(px, by);
    for (seg = 1; seg <= 7; seg++) { f = seg / 7; x = px + Math.sin(T * 0.9 * w.sw + w.ph + f * 2.2) * sway * f * f; y = by - h * f; ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = pal.weed2; ctx.globalAlpha = front ? 0.7 : 0.8;                       // the blades
    for (seg = 2; seg <= 7; seg++) {
      f = seg / 7; x = px + Math.sin(T * 0.9 * w.sw + w.ph + f * 2.2) * sway * f * f; y = by - h * f;
      ctx.save(); ctx.translate(x, y); ctx.rotate((seg % 2 ? 1 : -1) * (0.7 + 0.3 * Math.sin(T * 1.3 + w.ph + seg)));
      ctx.beginPath(); ctx.ellipse(0, -5 * CS, 2.2 * CS, 6 * CS, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
function drawKelpTag() {             // the rope and tag while the kelp forest is unclaimed
  if (sim.up('kelp')) { delete lockHit.kelp; return; }
  var x1 = X(K.KELP1), px, cost = sim.upgradeCost('kelp'), tag = 'Kelp forest: claim for $' + cost, ty, tw, gy, d;
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.8;        // a rope down the forest's edge on the front dune
  ctx.beginPath();
  for (d = 0.7; d <= 0.97; d += 0.054) { gy = groundY(x1, d); if (d === 0.7) ctx.moveTo(x1, gy - 9 * CS); else ctx.quadraticCurveTo(x1 + 5 * CS, gy - 2 * CS, x1, gy - 9 * CS); }
  ctx.stroke(); ctx.globalAlpha = 1;
  px = X(75); ty = groundY(px, 0.86);
  ctx.font = '700 ' + Math.round(11 * CS + 1) + 'px ' + cssFont; tw = ctx.measureText(tag).width + 14 * CS;
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, ty + 14 * CS); ctx.lineTo(px, ty - 6 * CS); ctx.stroke();
  ctx.save(); ctx.translate(px, ty - 14 * CS); ctx.rotate(0.03);
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = pal.paper || '#f5fafa'; ctx.fillRect(-tw / 2, -10 * CS, tw, 18 * CS);
  ctx.shadowColor = 'transparent'; ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tag, 0, -1 * CS);
  ctx.restore();
  lockHit.kelp = { x0: px - tw / 2, x1: px + tw / 2, y0: ty - 26 * CS, y1: ty + 16 * CS };
}
function lampPos() { var px = X(K.LAMP_X); return { x: px, y: groundY(px, K.LAMP_D), s: scaleAt(K.LAMP_D) }; }
function drawLamp() {                // the lighthouse lamp: a little striped tower at the field's edge with a lantern room on top
  if (!S.lv.lamp) return;
  var p = lampPos(), s = p.s * 1.15, i, on = nightA > 0.05, lv = S.lv.lamp;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.fillStyle = pal.sandLine; ctx.beginPath(); ctx.ellipse(0, 0, 11, 3.2, 0, 0, TAU); ctx.fill();   // its footing
  ctx.fillStyle = pal.paper; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-4.5, -26); ctx.lineTo(4.5, -26); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = pal.crab;                                                          // red bands
  for (i = 0; i < 3; i++) { var y0 = -4 - i * 8, k0 = 7 - (4 + i * 8) * 0.096, k1 = 7 - (8 + i * 8) * 0.096; ctx.beginPath(); ctx.moveTo(-k0, y0); ctx.lineTo(-k1, y0 - 4); ctx.lineTo(k1, y0 - 4); ctx.lineTo(k0, y0); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = pal.metalDark; ctx.fillRect(-6, -28, 12, 2);                       // the gallery
  ctx.fillStyle = on ? 'rgba(255,236,160,' + (0.5 + 0.5 * nightA).toFixed(2) + ')' : 'rgba(200,230,255,.6)'; ctx.fillRect(-3.5, -34, 7, 6);   // the lantern room
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8; ctx.strokeRect(-3.5, -34, 7, 6); ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, -28); ctx.stroke();
  ctx.fillStyle = pal.metalDark; ctx.beginPath(); ctx.moveTo(-4.5, -34); ctx.lineTo(0, -38); ctx.lineTo(4.5, -34); ctx.closePath(); ctx.fill();   // the cap
  if (lv > 1) { ctx.fillStyle = pal.ingot; ctx.beginPath(); ctx.arc(0, -39, 1.4, 0, TAU); ctx.fill(); }   // a finial for the bigger lamp
  ctx.restore();
}
function drawLampLight() {           // at night: a pool of warm light over the sand the lamp reaches, and a beam that sweeps round
  if (!S.lv.lamp || nightA < 0.03) return;
  var p = lampPos(), r = sim.up('lamp'), rx = X(r) - X(0), ry = Math.max(6 * CS, Math.abs(groundY(p.x, Math.min(1, K.LAMP_D + r / K.DEPTH)) - p.y)), g, a = nightA, ly = p.y - 31 * p.s * 1.15, ang, i;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, ry / rx);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(255,230,150,' + (0.22 * a).toFixed(3) + ')'); g.addColorStop(0.6, 'rgba(255,225,140,' + (0.1 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,220,130,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save();                                                        // the beam: two wedges turning slowly from the lantern room
  ang = mqReduce.matches ? 0.4 : T * 0.6;
  for (i = 0; i < 2; i++) {
    var th = ang + i * Math.PI, len = rx * 1.3, c0 = Math.cos(th), s0 = Math.sin(th) * 0.35;
    g = ctx.createLinearGradient(p.x, ly, p.x + c0 * len, ly + s0 * len);
    g.addColorStop(0, 'rgba(255,240,180,' + (0.16 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x, ly);
    ctx.lineTo(p.x + Math.cos(th - 0.12) * len, ly + Math.sin(th - 0.12) * 0.35 * len); ctx.lineTo(p.x + Math.cos(th + 0.12) * len, ly + Math.sin(th + 0.12) * 0.35 * len);
    ctx.closePath(); ctx.fill();
  }
  g = ctx.createRadialGradient(p.x, ly, 0, p.x, ly, 16 * CS);
  g.addColorStop(0, 'rgba(255,240,190,' + (0.6 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, ly, 16 * CS, 0, TAU); ctx.fill();
  ctx.restore();
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
function plotRectA(i) {                // an annex plot: a tile of middle-dune sand
  var px = X(K.ANNEX_PLOTS[i]), half = (X(43) - X(0)) * 0.46 * scaleAt(K.ANNEX_D) / scaleAt(0.83);
  return { x: px, half: half, y0: groundY(px, K.ANNEX_D0), y1: groundY(px, K.ANNEX_D1) };
}
function drawPlots(annex) {            // the front dune's plots, or with `annex` the annex's on the middle dune
  var i, p, b, occ = {}, k, L = annex ? S.layoutA : S.layout, n = annex ? K.ANNEX_PLOTS.length : K.PLOTS.length, fd = annex ? K.ANNEX_D + 0.02 : 0.83;
  if (annex && !S.lv.annex) return;
  for (k in L) occ[L[k]] = k;
  for (i = 0; i < n; i++) {
    p = annex ? plotRectA(i) : plotRect(i); b = occ[i];
    if (b) {                           // a paper foundation under each building, so it sits on the sand rather than in it
      ctx.save(); ctx.fillStyle = pal.sandBack; ctx.globalAlpha = 0.28;
      ctx.beginPath(); ctx.ellipse(p.x, groundY(p.x, fd), p.half * 0.85, p.half * 0.22, 0, 0, TAU); ctx.fill();
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
var BLD_NAMES = { den: 'Den', workshop: 'Workshop', ore: 'Ore pile', crush: 'Crushing yard', bar: 'Bar stack', stock: 'Stockpile', collector: 'Collector', ore2: 'Annex ore pile', crush2: 'Annex yard' };
var BLD_SHORT = { den: 'Den', workshop: 'Workshop', ore: 'Ore', crush: 'Crusher', bar: 'Bars', stock: 'Stock', collector: 'Riser', ore2: 'Ore', crush2: 'Crusher' };
var arrange = false, pick = null;

// ----- sea life: the food web in eco.js (Script 4), and the ship at the top of the riser -----
// eco.js runs the closed ecosystem: shoals and shrimp, their predators, the fisherman, the birds and the deep.
// It is decoration like the plankton: it reads the geometry and the weather from here and never touches the sim.
var eco = typeof CrabEco === 'function' ? CrabEco() : null, ecoDirty = true, lures = [];
var ecoGeom = {
  surfH: 0, farBase: 0, base: [0, 0, 0],
  farY: function (x) { return farY(x); }, crestY: function (k, x) { return crestY(k, x); }, groundY: function (px, d) { return groundY(px, d); },
  waveY: function (x) { return waveY(LAYERS[2], x); }, X: function (lx) { return X(lx); }, scaleAt: function (d) { return scaleAt(d); }
};
var ecoEnvObj = null;
function ecoEnv() {                    // rebuilt once a frame: what the ecosystem needs to know about the scene
  var top = riserPoint(1), sy = waveY(LAYERS[2], top.x) - 4, i, c, px, e;
  ecoGeom.surfH = surfH; ecoGeom.farBase = farBase; ecoGeom.base = base;
  e = ecoEnvObj = {
    W: W, H: H, CS: CS, T: T, pal: pal, nightA: nightA, stormA: stormA, tide: S ? S.tide : 0, bloom: bloom, still: mqReduce.matches,
    whale: whale ? { x: whale.x, y: whale.y, v: whale.v } : null,
    cargo: cargo.phase !== 'gone' && cargo.x >= 0 ? { x: cargo.x, y: waveY(LAYERS[2], cargo.x) - 6 } : null,
    riserShip: { x: top.x, y: sy }, perches: [{ x0: top.x - 40, x1: top.x + 40, y: sy - 6 }], crabs: [], geom: ecoGeom
  };
  if (e.cargo) e.perches.push({ x0: e.cargo.x - 76, x1: e.cargo.x + 40, y: e.cargo.y - 10 });
  e.octo = S && S.octo && S.octo.state !== 'flee' ? octoPos() : null;   // for the shark to chase
  e.carriers = [];                                                       // crabs with nodules along the back dune's crest, for the gulls
  if (S) for (i = 0; i < S.crabs.length; i++) {
    c = S.crabs[i]; if (c.alt > 0 || c.turtle || c.manta) continue; px = crabX(c); e.crabs.push({ x: px, y: groundY(px, c.d), d: c.d });
    if ((c.load > 0 || c.bload > 0) && c.d < 0.14 && c.state !== 'sleep') e.carriers.push({ id: c.id, x: px, y: groundY(px, c.d) });
  }
  return e;
}
function drawDeep(dt) {                // the far silhouettes, and the ecosystem's step for the frame
  if (!eco) return;
  var e = ecoEnv(), ev = null, i, acted = false;
  if (ecoDirty) { eco.reset(e); ecoDirty = false; }
  eco.update(dt, e);
  ev = eco.events();                   // the web's bites at the game go through the sim's API, like a click would
  for (i = 0; i < ev.length; i++) {
    if (ev[i].kind === 'sharkScare') { if (sim.scare()) acted = true; }
    else if (ev[i].kind === 'gullSnatch') { if (sim.snatch(ev[i].id)) acted = true; }
  }
  if (acted) sim.drain().forEach(handle);
  lures = eco.lures();
  eco.drawDeep(ctx, e);
}
function drawEcoWater() { if (eco && ecoEnvObj) eco.drawWater(ctx, ecoEnvObj); }
function drawEcoFloor(k) { if (eco && ecoEnvObj) eco.drawFloor(ctx, ecoEnvObj, k); }
function drawEcoSurface() { if (eco && ecoEnvObj) eco.drawSurface(ctx, ecoEnvObj); }

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
  bloom = S.bloom;                       // the bloom lives in the sim: fed by storms and ships, it ebbs over a few minutes
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
// The patches on the sand that light tired crabs at night (sim.lit): a soft pool of light with sparks in it.
// The track wraps round for the patches, so one near an edge is drawn at both ends.
function drawGlowPatches() {
  var i, j, k, p, px, cx, y, rx, ry, g, a = nightA * (0.5 + 0.5 * bloom), r = sim.glowR(), still = mqReduce.matches;
  for (i = 0; i < S.glow.length; i++) {
    p = S.glow[i]; px = X(p.x); y = groundY(px, p.d); rx = X(r); ry = Math.max(4 * CS, Math.abs(groundY(px, Math.min(1, p.d + r / K.DEPTH)) - y));
    for (k = -1; k <= 1; k++) {
      cx = px + k * W;
      if (cx + rx < 0 || cx - rx > W) continue;
      ctx.save(); ctx.translate(cx, y); ctx.scale(1, ry / rx);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(' + GLOW + ',' + (0.26 * a).toFixed(3) + ')'); g.addColorStop(0.7, 'rgba(' + GLOW + ',' + (0.1 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + GLOW + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
      ctx.restore();
      for (j = 0; j < 14; j++) {           // sparks, fixed in the patch, twinkling
        var u = Math.sin(j * 12.9898 + i * 78.233) * 43758.5453 % 1, v = Math.sin(j * 4.1414 + i * 9.17) * 24634.6345 % 1, tw = still ? 0.7 : 0.5 + 0.5 * Math.sin(T * (2 + j % 3) + j * 1.7 + i);
        ctx.fillStyle = 'rgba(' + GLOW + ',' + (a * 0.8 * tw).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx + u * rx * 0.85, y + v * ry * 0.85, 1.2 * CS, 0, TAU); ctx.fill();
      }
    }
  }
}
function drawPlankton() {                // drawn over the night, so the glow is not dimmed by it
  var i, p, a, n = Math.round(PLANKTON * (0.45 + 0.55 * bloom)), tw, still = mqReduce.matches, day = 1 - nightA;
  ctx.save();
  if (day > 0.05) {                      // by day: faint drifting specks
    ctx.fillStyle = pal.foam;
    for (i = 0; i < n; i++) { p = plankton[i]; if (p.y === undefined || p.x < visL || p.x > visR) continue; ctx.globalAlpha = 0.14 * day * p.s; ctx.fillRect(p.x, p.y, 1.4, 1.4); }
  }
  if (nightA > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlowPatches(); drawLampLight();
    for (i = 0; i < n; i++) {
      p = plankton[i]; if (p.y === undefined || p.x < visL || p.x > visR) continue;
      tw = still ? 1 : 0.6 + 0.4 * Math.sin(p.ph * 3.1 + i);
      a = nightA * (0.3 + 0.45 * bloom + 0.9 * p.fl) * tw;
      if (a < 0.02) continue;
      ctx.fillStyle = 'rgba(' + GLOW + ',' + (a * 0.3).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, (3 + 4 * p.fl) * p.s * CS, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(' + GLOW + ',' + Math.min(1, a).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 * p.s * CS, 0, TAU); ctx.fill();
    }
    for (i = 0; i < motes.length; i++) {
      var m = motes[i], k = 1 - m.life / m.max; if (m.x < visL || m.x > visR) continue;
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
  drawDeep(dt); updatePlankton(dt);
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
  return { visL: visL, visR: visR, x: px, y: gy - alt * (gy - H * 0.2), alt: alt };
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
function eelHead() {                   // where the eel's head is: up out of the crack, swaying, lunging when it snaps
  var px = X(K.EEL_X), gy = groundY(px, K.EEL_D), s = scaleAt(K.EEL_D), lunge = clamp(1 - (T - eelSnapT) / 0.5, 0, 1), sway = mqReduce.matches ? 0 : Math.sin(T * 1.7) * 6;
  return { x: px + (sway + eelAim * lunge * 22) * s * eelA, y: gy - (6 + 30 * eelA - lunge * 10) * s, s: s, gy: gy, px: px, lunge: lunge };
}
function drawEel() {                   // the crack in the sand, and the eel when it is out
  var h = eelHead(), s = h.s, px = h.px, gy = h.gy, i, t, x, y, dir = h.x >= px ? 1 : -1;
  ctx.save();
  ctx.fillStyle = pal.rock; ctx.strokeStyle = pal.rockLine; ctx.lineWidth = 1;   // two stones either side of the crack
  ctx.beginPath(); ctx.ellipse(px - 13 * s, gy - 2 * s, 8 * s, 5 * s, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(px + 12 * s, gy - 1.5 * s, 7 * s, 4 * s, 0.25, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pal.rockDark; ctx.beginPath(); ctx.ellipse(px, gy, 8 * s, 2.6 * s, 0, 0, TAU); ctx.fill();   // the crack
  if (eelA > 0.02) {
    ctx.lineCap = 'round'; ctx.strokeStyle = '#4f6b2c'; ctx.lineWidth = 7 * s;   // the body, rising in an S from the crack
    ctx.beginPath(); ctx.moveTo(px, gy);
    ctx.bezierCurveTo(px - 8 * s * eelA, gy - 14 * s * eelA, h.x + 8 * s * dir * eelA, h.y + 14 * s * eelA, h.x, h.y);
    ctx.stroke();
    ctx.strokeStyle = '#c9c46a'; ctx.lineWidth = 1.4 * s; ctx.globalAlpha = 0.6;   // spots along it
    for (i = 1; i < 6; i++) {
      t = i / 6; x = (1 - t) * (1 - t) * (1 - t) * px + 3 * (1 - t) * (1 - t) * t * (px - 8 * s * eelA) + 3 * (1 - t) * t * t * (h.x + 8 * s * dir * eelA) + t * t * t * h.x;
      y = (1 - t) * (1 - t) * (1 - t) * gy + 3 * (1 - t) * (1 - t) * t * (gy - 14 * s * eelA) + 3 * (1 - t) * t * t * (h.y + 14 * s * eelA) + t * t * t * h.y;
      ctx.beginPath(); ctx.arc(x, y, 1.2 * s, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.translate(h.x, h.y); ctx.scale(dir, 1);                                    // the head: a long jaw that opens to snap
    var gape = 0.15 + 0.5 * h.lunge;
    ctx.fillStyle = '#5c7a33';
    ctx.beginPath(); ctx.moveTo(-4 * s, -4 * s); ctx.quadraticCurveTo(6 * s, -7 * s, 13 * s, -2 * s - gape * 4 * s); ctx.lineTo(2 * s, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4 * s, 3 * s); ctx.quadraticCurveTo(6 * s, 4 * s, 12 * s, 1 * s + gape * 4 * s); ctx.lineTo(2 * s, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2 * s, 0, 5 * s, 4 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1.5 * s, -3 * s, 1.8 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.arc(2 * s, -3 * s, 0.9 * s, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (S.eel.out && eelA > 0.8 && T % 3 < 1.2) drawBubble(h.x + 10 * s, h.y - 16 * s, emojiOK ? '🐍🪨❓' : spoken('🐍🪨❓'), s, 1, true);
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
  if (tr.market) {                     // the night market: paper lanterns along the stall, lit at night, and the cake on the counter
    for (i = 0; i < 4; i++) {
      var lx = -13.5 + i * 6.3 + Math.sin(T * 2 + i) * 0.5, ly = -37 - bob + Math.abs(i - 1.5) * 0.6;
      ctx.fillStyle = 'rgba(255,230,150,' + (0.15 + 0.5 * nightA).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(lx, ly, 4.2, 0, TAU); ctx.fill();
      ctx.fillStyle = i % 2 ? '#ffb347' : '#ff5c5c'; ctx.beginPath(); ctx.ellipse(lx, ly, 1.8, 2.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.ingot; ctx.fillRect(lx - 0.8, ly - 2.9, 1.6, 0.8);
    }
    drawCake(-3, -27 - bob, 0.5);
  }
  ctx.restore();
  if (tr.state === 'stay' || T < traderBubble) drawBubble(p.x + 18 * s, p.y - 58 * s, emojiOK ? (tr.market ? '🏮🛒🌙' : '🐚🛒❓') : spoken(tr.market ? '🏮🛒🌙' : '🐚🛒❓'), s, 1, true);
}
// ----- the wreck: a sunken boat on the back dune, its hull plated until the scouts have prised the plates off -----
function drawWreck() {
  var w = S.wreck; if (!w) return;
  var px = X(w.x), gy = groundY(px, w.d), s = scaleAt(w.d) * 1.9, sink = w.bareAt ? clamp((S.t - w.bareAt) / K.WRECK_LINGER, 0, 1) : 0, i, n = w.plates, gone = n - w.left;
  if (px + 40 * s < visL || px - 40 * s > visR) return;
  ctx.save(); ctx.translate(px, gy + sink * sink * 16 * s); ctx.scale(s, s); ctx.globalAlpha = 1 - sink * 0.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(0, 1, 30, 4, 0, 0, TAU); ctx.fill();   // its shadow in the sand
  ctx.save(); ctx.rotate(-0.12);
  ctx.fillStyle = '#6b4a33'; ctx.beginPath(); ctx.moveTo(-28, -10); ctx.quadraticCurveTo(-24, 4, -10, 5); ctx.lineTo(14, 5); ctx.quadraticCurveTo(30, 3, 34, -12); ctx.lineTo(28, -12); ctx.quadraticCurveTo(26, -3, 14, -1); ctx.lineTo(-10, -1); ctx.quadraticCurveTo(-20, -2, -22, -10); ctx.closePath(); ctx.fill();   // the hull
  ctx.strokeStyle = '#4a3122'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = '#4a3122'; ctx.lineWidth = 0.8; for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-24 + i * 2, -9 + i * 3); ctx.quadraticCurveTo(0, -5 + i * 3.4, 30, -10 + i * 3); ctx.stroke(); }   // planking
  for (i = 0; i < n; i++) {            // the plates along the hull: riveted while they are on, a dark gap once prised off
    var pxp = -20 + i * (44 / Math.max(1, n - 1)) - 2, pyp = -7;
    if (i < gone) { ctx.fillStyle = '#3a2619'; ctx.fillRect(pxp - 2.6, pyp - 2.2, 5.2, 4.4); continue; }
    ctx.fillStyle = pal.metal; ctx.fillRect(pxp - 2.8, pyp - 2.4, 5.6, 4.8); ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.6; ctx.strokeRect(pxp - 2.8, pyp - 2.4, 5.6, 4.8);
    ctx.fillStyle = pal.metalDark; ctx.beginPath(); ctx.arc(pxp - 1.6, pyp - 1.2, 0.4, 0, TAU); ctx.arc(pxp + 1.6, pyp + 1.2, 0.4, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#7d5a40'; ctx.fillRect(-6, -20, 14, 9); ctx.strokeStyle = '#4a3122'; ctx.lineWidth = 0.8; ctx.strokeRect(-6, -20, 14, 9);   // the wheelhouse
  ctx.fillStyle = 'rgba(120,200,230,.55)'; ctx.beginPath(); ctx.arc(-1, -15.5, 1.8, 0, TAU); ctx.arc(4.5, -15.5, 1.8, 0, TAU); ctx.fill();   // its windows
  ctx.strokeStyle = '#4a3122'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(18, -11); ctx.lineTo(22, -34); ctx.stroke();   // a snapped mast
  ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(22, -34); ctx.lineTo(27, -40); ctx.stroke();
  ctx.fillStyle = 'rgba(240,235,220,.75)';                                                                                   // and a rag of sail in the current
  ctx.beginPath(); ctx.moveTo(21, -30); ctx.quadraticCurveTo(26 + Math.sin(T * 2) * 2, -27, 30 + Math.sin(T * 1.6) * 3, -20); ctx.quadraticCurveTo(24, -22, 20, -24); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.weed; ctx.lineWidth = 1.1; for (i = 0; i < 4; i++) { var wx = -26 + i * 18; ctx.beginPath(); ctx.moveTo(wx, 3); ctx.quadraticCurveTo(wx + Math.sin(T * 1.4 + i) * 2, -3, wx + 1 + Math.sin(T * 1.1 + i) * 3, -9); ctx.stroke(); }   // weed on the hull
  ctx.fillStyle = '#e9e2d2'; for (i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-14 + i * 7 + (i % 2) * 2, 2 - (i % 3), 1, 0, TAU); ctx.fill(); }   // barnacles
  ctx.restore();
  ctx.restore();
}
// ----- the tide pool: a hollow on the front dune that fills at high water; pets paddle in it and crabs splash through -----
var POOL_X = 505, POOL_D = 0.93;
var poolForce = null;                  // a debug knob: the pool's fill, when set from the console
function poolFill() { return poolForce !== null ? poolForce : clamp((S.tide - 0.15) / 0.55, 0, 1); }   // fills on the rising tide, brim full near high water
function poolPos() { var px = X(POOL_X); return { x: px, y: groundY(px, POOL_D) }; }
function inPool(x, d) { return Math.abs(x - POOL_X) < 22 && Math.abs(d - POOL_D) < 0.045; }
function drawPool() {
  var p = poolPos(), s = scaleAt(POOL_D), fill = poolFill(), rx = 26 * s, ry = 7.5 * s, i, a, r2;
  if (p.x + rx < visL || p.x - rx > visR) return;
  ctx.save();
  ctx.fillStyle = 'rgba(70,45,20,.16)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); ctx.fill();                      // the hollow, wet sand round its rim
  ctx.fillStyle = 'rgba(40,30,15,.14)'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 1 * s, rx * 0.86, ry * 0.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd1dc'; ctx.beginPath(); ctx.arc(p.x - 11 * s, p.y + 1.5 * s, 1.9 * s, Math.PI, TAU); ctx.fill();               // shells on the bottom
  ctx.fillStyle = '#fff0c8'; ctx.beginPath(); ctx.arc(p.x + 13 * s, p.y + 2.5 * s, 1.5 * s, Math.PI, TAU); ctx.fill();
  ctx.strokeStyle = '#e88bd0'; ctx.lineWidth = 1.1 * s; ctx.lineCap = 'round';                                                       // an anemone waving its arms
  for (i = 0; i < 7; i++) { a = i / 7 * TAU; ctx.beginPath(); ctx.moveTo(p.x + 3 * s, p.y + 0.5 * s); ctx.lineTo(p.x + 3 * s + Math.cos(a) * 3.4 * s, p.y - 2.2 * s + Math.sin(a + T * 1.5) * 1.6 * s); ctx.stroke(); }
  if (fill > 0.02) {                   // the water: a sheet that spreads as the tide comes in, with a glint and slow ripples
    ctx.globalAlpha = 0.28 + 0.32 * fill; ctx.fillStyle = '#5fb8d6'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 1 * s, rx * (0.55 + 0.35 * fill), ry * (0.55 + 0.35 * fill), 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.foam; ctx.lineWidth = 1;
    for (i = 0; i < 2; i++) { r2 = ((T * 0.4 + i / 2) % 1); ctx.globalAlpha = 0.45 * fill * (1 - r2); ctx.beginPath(); ctx.ellipse(p.x, p.y - 1 * s, rx * (0.15 + r2 * 0.7), ry * (0.15 + r2 * 0.7), 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 0.45 * fill; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(p.x - 7 * s, p.y - 4 * s, 5 * s, 1.1 * s, -0.1, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function updatePool() {                // crabs in the full pool: splashes as they wade, and a paddle when they stand in it
  var fill = poolFill(), i, c, px, gy;
  if (fill < 0.5 || speed === 0) return;
  for (i = 0; i < S.crabs.length; i++) {
    c = S.crabs[i];
    if (c.state === 'sleep' || c.alt > 0 || c.turtle || c.manta || !inPool(c.x, c.d)) continue;
    px = crabX(c); gy = groundY(px, c.d);
    if (c.moving) { if (Math.random() < 0.25) { rings.push({ x: px, y: gy, t: 0.3, c: pal.foam }); bubbles.push({ x: px + rr(-4, 4) * CS, y: gy - 2 * CS, r: rr(0.8, 1.8) * CS, vy: rr(14, 24), ph: rr(0, TAU) }); } }
    else if (!c.working && T > (c.vnextPaddle || 0)) { c.vnextPaddle = T + rr(5, 10); play(c, ['swimArms', 'wiggle', 'bounce', 'blowBubbles', 'shakeOff'], 2.2); if (Math.random() < 0.6) say(c, TALK.paddle, 1.6); rings.push({ x: px, y: gy, t: 0, c: pal.foam }); }
  }
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
function mantaPos() { var m = S.manta, px = X(m.x), gy = groundY(px, clamp(m.d, 0.02, 0.98)); return { x: px, y: gy - 42 * CS + Math.sin(T * 1.6) * 4 * CS, gy: gy }; }
function drawManta() {                 // a manta ray gliding low over the dunes: wings beating slowly, two head fins, a whip of a tail
  var m = S.manta; if (!m) return;
  var p = mantaPos(), s = CS * 1.9, f = Math.sin(T * 2.4), span = 17 + f * 7, i;
  ctx.save(); ctx.fillStyle = 'rgba(8,24,40,.16)'; ctx.beginPath(); ctx.ellipse(p.x, p.gy, 42 * s, 6 * s, 0, 0, TAU); ctx.fill(); ctx.restore();   // its shadow on the sand
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(m.dir * s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2b3a4e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-30, 2 - f * 3, -44, -1 + f * 5); ctx.stroke();   // the tail
  ctx.fillStyle = '#34465f';                                                                                                                 // the far wing
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.quadraticCurveTo(10, -4, -2, -span); ctx.quadraticCurveTo(-9, -span * 0.9, -16, -3); ctx.quadraticCurveTo(-18, -1, -20, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a607c';                                                                                                                 // the near wing, in the light
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.quadraticCurveTo(10, 4, -2, span); ctx.quadraticCurveTo(-9, span * 0.9, -16, 3); ctx.quadraticCurveTo(-18, 1, -20, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d5270'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.quadraticCurveTo(4, -3.5, -18, -1.5); ctx.lineTo(-18, 1.5); ctx.quadraticCurveTo(4, 3.5, 18, 0); ctx.closePath(); ctx.fill();   // the body down the middle
  ctx.fillStyle = 'rgba(255,255,255,.25)'; for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-4 - i * 3, (i % 2 ? 1 : -1) * (2 + i), 0.9, 0, TAU); ctx.fill(); }   // pale spots on its back
  ctx.strokeStyle = '#2b3a4e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(16, -2.5); ctx.quadraticCurveTo(22, -4, 23, -1); ctx.moveTo(16, 2.5); ctx.quadraticCurveTo(22, 4, 23, 1); ctx.stroke();   // the head fins
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(13, -3.6, 1.3, 0, TAU); ctx.arc(13, 3.6, 1.3, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.arc(13.4, -3.6, 0.6, 0, TAU); ctx.arc(13.4, 3.6, 0.6, 0, TAU); ctx.fill();
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
    var c = S.crabs[i], s = scaleAt(c.d), px = crabX(c), y = c.alt > 0 ? airPos(c).y : c.turtle && S.turtle ? turtlePos().y : c.manta && S.manta ? mantaPos().y : groundY(px, c.d) - 9 * s;
    if (c.state === 'sleep') continue;
    var g = ctx.createRadialGradient(px, y - 6 * s, 1, px, y - 6 * s, 22 * s), col = c.glow && !(sim.lampLit(c.x, c.d) && !sim.lit(c.x, c.d)) ? GLOW : '255,240,170';   // lit by plankton: a blue-green glow; by the lamp: warm
    g.addColorStop(0, 'rgba(' + col + ',' + (0.35 * nightA).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
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
  if (n.eddy >= 0) { drawEddy(n, px, y, s); a = clamp((n.eddy - 0.5) / 0.5, 0, 1); if (a > 0) drawNod(px, y, n.vr * s * (0.7 + 0.3 * a), a * 0.6, 0, n.fine); }
  else drawNod(px, y, n.vr * s, 1, 0, n.fine);
}
function drawChest(f, px, y, s, grow) {   // a sunken chest, half in the sand, with a glint of gold under the lid
  var gl = 0.5 + 0.5 * Math.sin(T * 2.4 + f.id);
  ctx.save(); ctx.translate(px, y); ctx.scale(s, s * grow);
  ctx.fillStyle = pal.barDark; ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.rect(-9, -8, 18, 9); ctx.fill(); ctx.stroke();                     // the box
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.quadraticCurveTo(0, -16, 9, -8); ctx.closePath(); ctx.fill(); ctx.stroke();   // the lid
  ctx.fillStyle = pal.ingot; ctx.fillRect(-9, -9, 18, 1.6); ctx.fillRect(-1.5, -10, 3, 5);   // the band and the lock
  ctx.globalAlpha = 0.35 + 0.5 * gl; ctx.beginPath(); ctx.arc(5, -12, 1.4 + gl, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = pal.sandBack; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(0, 1, 12, 2.6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;   // sand heaped round it
  if (f.by) { ctx.strokeStyle = pal.drillDark; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 1, 13, 3.4, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawFlag(f) {               // a stake with a pennant: its colour says how rich, its pips how big
  var px = X(f.x), y = groundY(px, f.d), s = scaleAt(f.d), grow = f.vborn ? clamp((T - f.vborn) / 0.4, 0, 1) : 1, i, wave = Math.sin(T * 3 + f.id) * 1.5;
  if (f.chest) return drawChest(f, px, y, s, grow);
  var col = f.q >= 0.75 ? pal.energy : (f.q >= 0.55 ? pal.ingot : pal.lava);
  ctx.save(); ctx.translate(px, y); ctx.scale(s, s * grow);
  ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(7, -20 + wave, 13, -18 + wave); ctx.quadraticCurveTo(7, -15 + wave * 0.5, 0, -14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = pal.nodule;
  for (i = 0; i < Math.min(f.size, 7); i++) { ctx.beginPath(); ctx.arc(-1.5 + (i % 4) * 3.2 - 4, 3 + Math.floor(i / 4) * 2.6, 1.1, 0, TAU); ctx.fill(); }
  if (f.q >= K.FINE_Q) { ctx.fillStyle = pal.ingot; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(T * 4 + f.id); star(6, -18 + wave * 0.7, 2.2, pal.ingot, pal.ink); ctx.globalAlpha = 1; }   // a fine deposit: a gold star on the pennant
  if (f.by) { ctx.strokeStyle = pal.drillDark; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 1, 10, 3, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawFlights() {
  for (var i = 0; i < flights.length; i++) {
    var f = flights[i], t = clamp(f.t, 0, 1), x = f.x0 + (f.to.x - f.x0) * t, y = f.y0 + (f.to.y - f.y0) * t - Math.sin(Math.PI * t) * 10 * CS;
    if (f.cable) {                     // a bar in a bucket on the cableway: up to the cable, along it, and down to the stack
      var cp = cablePoint(clamp((t - 0.1) / 0.8, 0, 1)), lift = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
      x = t < 0.1 ? f.x0 + (cp.x - f.x0) * lift : t > 0.9 ? cp.x + (f.to.x - cp.x) * (1 - lift) : cp.x;
      y = t < 0.1 ? f.y0 + (cp.y + 12 * CS - f.y0) * lift : t > 0.9 ? cp.y + 12 * CS + (f.to.y - cp.y - 12 * CS) * (1 - lift) : cp.y + 12 * CS;
      if (lift >= 1) { ctx.strokeStyle = pal.metalDark; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, cp.y); ctx.lineTo(x, y - 3 * CS); ctx.stroke(); ctx.fillStyle = pal.metal; ctx.beginPath(); ctx.moveTo(x - 5 * CS, y - 3 * CS); ctx.lineTo(x + 5 * CS, y - 3 * CS); ctx.lineTo(x + 4 * CS, y + 3 * CS); ctx.lineTo(x - 4 * CS, y + 3 * CS); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    if (f.kind === 'pearl') { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 7 * CS, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#f4f0ff'; ctx.beginPath(); ctx.arc(x, y, 3.4 * CS, 0, TAU); ctx.fill(); ctx.strokeStyle = pal.scout; ctx.lineWidth = 0.8; ctx.stroke(); }
    else if (f.kind === 'nod') drawNod(x, y, 3.8 * CS, 1, t * 4, f.fine);
    else if (f.kind === 'bar') drawBar(x, y, CS, 0, f.fine);
    else drawIngot(x, y, CS * (1 - 0.2 * t), false, f.fine);
  }
}
function drawRings() {
  for (var i = 0; i < rings.length; i++) {
    var r = rings[i]; if (r.x < visL || r.x > visR) continue;
    ctx.strokeStyle = r.c; ctx.lineWidth = 2; ctx.globalAlpha = 1 - r.t;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, 8 + r.t * 40 * CS, (8 + r.t * 40 * CS) * 0.35, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawParticles() {
  var i, p;
  for (i = 0; i < puffs.length; i++) {
    p = puffs[i]; if (p.x < visL || p.x > visR) continue; ctx.globalAlpha = (1 - p.life / p.max) * 0.5; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = pal.lavaHot;
  for (i = 0; i < embers.length; i++) { p = embers[i]; if (p.x < visL || p.x > visR) continue; ctx.globalAlpha = 1 - p.life / p.max; ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, TAU); ctx.fill(); }
  for (i = 0; i < sparks.length; i++) { p = sparks[i]; if (p.x < visL || p.x > visR) continue; ctx.fillStyle = p.c; ctx.globalAlpha = 1 - p.life / p.max; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (i = 0; i < confetti.length; i++) {
    p = confetti[i]; if (p.x < visL || p.x > visR) continue; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-3, -1.5, 6, 3); ctx.restore();
  }
}
function drawFloaters() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (var i = 0; i < floaters.length; i++) {
    var f = floaters[i]; if (f.x < visL || f.x > visR) continue; var a = f.life < 0.2 ? f.life / 0.2 : 1 - Math.max(0, f.life - f.max + 0.5) / 0.5;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = '700 ' + Math.round((f.big ? 15 : 12) * CS + 2) + 'px ' + cssFont;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = pal.ingot; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

var visL = -1e9, visR = 1e9;           // the visible band of the canvas for this frame (set in draw()): particles outside it are skipped
function draw() {
  if (!W || !H || !S) return;
  var i, k, list, o, px, layers = [[], [], []], shaking = S.quake && !mqReduce.matches;
  // the band of the canvas that is on screen, with a margin: sprites outside it are not drawn (the big field and the zoom
  // make the canvas wider than the stage, and nothing a crab does reaches further than a talk bubble)
  var vm = 110 * CS, vis0 = stage.scrollLeft / Z - vm, vis1 = (stage.scrollLeft + stage.clientWidth) / Z + vm;
  if (W <= stage.clientWidth / Z + 2) { vis0 = -1e9; vis1 = 1e9; }
  visL = vis0; visR = vis1;
  ctx.clearRect(0, 0, W, H);
  if (shaking) { ctx.save(); ctx.translate(rr(-3, 3) * CS, rr(-2, 2) * CS); }   // the whole sea judders through an earthquake
  drawSurface(); drawSea(Math.min(0.05, T - (draw.lastT || T))); draw.lastT = T; drawCargo(); drawWhale(); drawEcoSurface(); drawSnow();
  // the far dune, a faint sheet behind everything
  sheet(3, farPath, pal.sandFar, farY, function (x) { return crestY(0, x); }, 0.75);
  drawEcoWater();
  drawWeeds(-1);
  // sort everything on the sand into its dune
  for (i = 0; i < S.nodules.length; i++) { o = S.nodules[i]; px = X(o.x); if (px < vis0 || px > vis1) continue; layers[layerOf(o.d)].push({ y: groundY(px, o.d), kind: 0, o: o }); }
  for (i = 0; i < S.flags.length; i++) { o = S.flags[i]; px = X(o.x); if (px < vis0 || px > vis1) continue; layers[layerOf(o.d)].push({ y: groundY(px, o.d) - 0.01, kind: 1, o: o }); }
  var air = [];
  for (i = 0; i < S.crabs.length; i++) {
    o = S.crabs[i]; px = crabX(o);
    if (o.alt > 0 || o.turtle || o.manta) { if (o.alt > 0) px = airPos(o).x; if (px >= vis0 && px <= vis1) air.push(o); continue; }
    if (px < vis0 || px > vis1) continue;
    layers[o.vfall > 0 ? 2 : crabLayer(o)].push({ y: groundY(px, o.d) + 0.01, kind: 2, o: o });
  }
  for (i = 0; i < debris.length; i++) { o = debris[i]; px = X(o.x); if (px < vis0 || px > vis1) continue; layers[layerOf(o.d)].push({ y: groundY(px, o.d) - 0.02, kind: 3, f: drawDebris.bind(null, o) }); }
  layers[2].push({ y: basePos().y, kind: 3, f: drawBase });
  layers[2].push({ y: postPos().y, kind: 3, f: drawPost });
  if (S.trader) layers[2].push({ y: traderPos().y, kind: 3, f: drawTrader });
  layers[2].push({ y: groundY(X(S.pos.ORE), 0.8), kind: 3, f: drawOrePile.bind(null, 1) });
  layers[2].push({ y: groundY(X(S.pos.BAR), 0.78), kind: 3, f: drawBarStack });
  layers[2].push({ y: groundY(X(S.pos.CRUSH), 0.78) - 1, kind: 3, f: drawRollers.bind(null, 1) });
  if (S.lv.annex) {
    layers[1].push({ y: groundY(X(S.pos.ORE2), K.ANNEX_D), kind: 3, f: drawOrePile.bind(null, 2) });
    layers[1].push({ y: groundY(X(S.pos.CRUSH2), K.ANNEX_D) - 1, kind: 3, f: drawRollers.bind(null, 2) });
  }
  for (i = 0; i < S.crabs.length; i++) { o = S.crabs[i]; if (o.role === 'crush') { var st = sim.crushSpot(o); px = X(st.x); layers[layerOf(st.d)].push({ y: groundY(px, st.d) - 0.5, kind: 3, f: drawPress.bind(null, o) }); } }
  layers[2].push({ y: groundY(X(S.pos.STOCK), 0.84), kind: 3, f: drawStockpile });
  layers[2].push({ y: groundY(X(S.pos.COLLECTOR), 0.7), kind: 3, f: drawCollector });
  layers[2].push({ y: groundY(X(K.STIRLING), 0.72), kind: 3, f: drawEngine });
  layers[2].push({ y: groundY(X(S.pos.WORKSHOP), 0.95), kind: 3, f: drawWorkshop });
  layers[2].push({ y: groundY(X(S.pos.DEN), 0.82), kind: 3, f: drawDen });
  if (S.lv.lamp) layers[2].push({ y: lampPos().y, kind: 3, f: drawLamp });
  if (S.lv.belt) layers[2].push({ y: groundY(X(K.BELT_HEAD), K.BELT_D) - 0.5, kind: 3, f: drawBelt });
  if (S.lv.pad) layers[2].push({ y: padPos().y - 6 * CS, kind: 3, f: drawPad });
  if (S.lv.rim) layers[2].push({ y: rim2Pos().y - 0.5, kind: 3, f: drawRim2 });
  layers[2].push({ y: poolPos().y - 2, kind: 3, f: drawPool });
  if (S.wreck) layers[0].push({ y: groundY(X(S.wreck.x), S.wreck.d) - 0.5, kind: 3, f: drawWreck });
  for (i = 0; i < S.pets.length; i++) layers[2].push({ y: petY(S.pets[i]) + 0.02, kind: 3, f: drawPet.bind(null, S.pets[i]) });
  layers[2].push({ y: groundY(X(K.EEL_X), K.EEL_D), kind: 3, f: drawEel });
  for (k = 0; k < 3; k++) {
    sheet(k, dunePaths[k], pal[SAND[k]], function (x) { return crestY(k, x); }, k < 2 ? function (x) { return crestY(k + 1, x); } : null, 1);
    drawRipples(k); drawEcoFloor(k);
    if (k === 0) { drawWeeds(0); drawRidge(); }
    if (k === 1) drawPlots(true);
    if (k === 2) { drawCavern(); drawVent(); drawChimney(); drawRiser(); drawLifts(); drawPlots(false); if (S.lv.annex) drawCableway(); drawCord(); }
    if (k > 0) drawLocked(k);
    drawKelp(k, false);
    list = layers[k];
    list.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < list.length; i++) {
      o = list[i];
      if (o.kind === 0) drawGroundNodule(o.o);
      else if (o.kind === 1) drawFlag(o.o);
      else if (o.kind === 2) drawCrab(o.o);
      else o.f();
    }
    drawKelp(k, true);
    if (k === 2) { drawKelpTag(); drawWires(); drawOcto(); }
  }
  drawPasses(); drawTideCurrents(); drawWhaleShadow(); drawInk();
  drawRings(); drawFlights();
  drawTurtle(); drawManta();
  for (i = 0; i < air.length; i++) drawCrab(air[i]);        // crabs riding the vent, the turtle or the manta are above everything
  drawNight(); drawPlankton(); drawStorm(); drawGlow(); drawBombs(); drawBubbles(); drawParticles(); drawFloaters();
  if (shaking) ctx.restore();
}
