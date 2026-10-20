// The feature guide's pictures, played: a new game in headless Chromium, driven over the DevTools protocol
// through the page's own buttons and keys, with numbered rings drawn over what each picture is about.
// It follows the tutorial (a second smelter, the advisor's hire, overclock, A/B shifts, the middle dune),
// then lets the sea's own timers bring the visitors, and only then reaches for the debug hooks.
//
//   node scripts/feature-guide.js                      → docs/features/NN-name.png
//   node scripts/feature-guide.js --root DIR --port 8130 --out DIR
//
// --root is the folder served (default: this checkout; `git archive HEAD | tar -x -C DIR` serves the
// committed game instead of the working tree). It serves it with `python3 -m http.server` on --port and
// talks to Chromium on --port + 1. It needs Node 22 or later (the built-in WebSocket), python3 and
// chromium; nothing to install. A picture over 600 KB is reduced to 256 colours if ImageMagick's `magick`
// is on the PATH, and left as it is otherwise.
//
// What is not plain play is said in the log and in docs/FEATURE_GUIDE.md: frames stall on a headless
// page, so time moves on through crabminer.advance(); the late game is reached by adding credits; and the
// festival, the pets and the win are forced through window.crabminer, the same hooks tests/browser.js uses.
'use strict';
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const SERVE = path.resolve(arg('root', ROOT));
const OUT = path.resolve(arg('out', path.join(ROOT, 'docs', 'features')));
const PORT = Number(arg('port', 8130)), CDP = PORT + 1, PAGE = 'http://127.0.0.1:' + PORT + '/index.html';
const W = 1280, H = 800, MAX_BYTES = 600 * 1024;
const wait = ms => new Promise(r => setTimeout(r, ms));
const say = (...a) => console.log(...a);
const which = c => process.env.PATH.split(':').some(d => fs.existsSync(path.join(d, c)));

// ── the overlay: rings and numbered captions, drawn in the page and removed after each picture ──────────
const OVERLAY = `
window.__clear = () => document.querySelectorAll('.__g').forEach(e => e.remove());
window.__box = (x, y, w, h) => {          // an invisible element over a spot on the canvas, for a ring to go round
  const b = document.createElement('div'); b.className = '__g';
  b.style.cssText = 'position:fixed;pointer-events:none;left:' + (x - w / 2) + 'px;top:' + (y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px';
  document.body.appendChild(b); return b;
};
window.__spot = (o, w, h, dy) => {         // a world point {x, d} (a crab, a flag, a building) → a box on the screen
  if (!o) return null;
  const p = crabminer.at(o), r = document.getElementById('scene').getBoundingClientRect();
  return __box(r.left + p.x, r.top + p.y + (dy || 0), w || 40, h || 40);
};
window.__mark = (items) => {
  const vw = innerWidth, vh = innerHeight, found = [], rings = [], caps = [];
  const over = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  items.forEach(([el]) => {
    const r = el && el.getBoundingClientRect();
    if (!r || r.width === 0 || r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) { found.push(false); rings.push(null); return; }
    found.push(true);
    const x = Math.max(4, r.left - 4), y = Math.max(4, r.top - 4), w = Math.min(vw - 8 - x, r.width + 8), h = Math.min(vh - 8 - y, r.height + 8);
    const ring = document.createElement('div'); ring.className = '__g';
    ring.style.cssText = 'position:fixed;z-index:99998;pointer-events:none;border:3px solid #c2185b;border-radius:6px;box-shadow:0 0 0 2px #fff;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px';
    document.body.appendChild(ring); rings.push({ x, y, w, h });
  });
  items.forEach(([el, text], i) => {
    const g = rings[i]; if (!g) return;
    const cap = document.createElement('div'); cap.className = '__g';
    const n = document.createElement('b'); n.textContent = String(i + 1);
    n.style.cssText = 'display:inline-block;background:#fff;color:#c2185b;border-radius:50%;width:20px;height:20px;line-height:20px;text-align:center;margin-right:7px';
    cap.appendChild(n); cap.appendChild(document.createTextNode(text));
    cap.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;max-width:270px;background:#c2185b;color:#fff;font:600 13px/1.35 system-ui,sans-serif;padding:6px 10px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.4);left:0;top:0';
    document.body.appendChild(cap);
    const c = cap.getBoundingClientRect(), cw = c.width, ch = c.height, m = 8;
    const spots = [[g.x, g.y + g.h + m], [g.x + g.w - cw, g.y + g.h + m], [g.x, g.y - ch - m], [g.x + g.w - cw, g.y - ch - m], [g.x + g.w + m, g.y], [g.x - cw - m, g.y],
      [g.x + g.w - cw - m, g.y + g.h - ch - m], [g.x + g.w - cw - m, g.y + m], [g.x + m, g.y + g.h - ch - m]];
    let best = null;
    spots.forEach(([sx, sy], k) => {
      const fits = sx >= 4 && sy >= 4 && sx + cw <= vw - 4 && sy + ch <= vh - 4;
      const x = Math.min(Math.max(4, sx), vw - cw - 4), y = Math.min(Math.max(4, sy), vh - ch - 4), box = { x, y, w: cw, h: ch };
      const cost = rings.reduce((a, r, j) => a + (r ? over(box, r) * (j === i ? (k >= 6 ? 0.02 : 1) : 3) : 0), 0) + caps.reduce((a, r) => a + over(box, r) * 10, 0) + (fits ? 0 : 500) + k;
      if (!best || cost < best.cost) best = { x, y, cost };
    });
    cap.style.left = best.x + 'px'; cap.style.top = best.y + 'px'; caps.push({ x: best.x, y: best.y, w: cw, h: ch });
  });
  return found;
};`;

// ── the browser ────────────────────────────────────────────────────────────────────────────────────────
let ws, seq = 0, server, chrome, profile;
const pending = new Map(), pageErrors = [];
const send = (method, params = {}) => new Promise(res => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
async function js(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 300) + '\n  in: ' + expr.slice(0, 200));
  return r.result && r.result.result && r.result.result.value;
}
const key = k => js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true })); true`);
const click = async (sel, what) => { if (!(await js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.disabled) return false; e.click(); return true; })()`))) say('   ! could not click ' + (what || sel)); };
const tab = async id => { await js(`document.getElementById('t-${id}').click(); true`); await wait(350); };
const S = expr => js('(() => { const S = crabminer.state(), sim = crabminer.sim; return ' + expr + '; })()');
// Time: frames stall headless, so the game is stepped on through the view's own update().
async function advance(secs) { for (let s = 0; s < secs; s += 10) await js(`crabminer.advance(${Math.min(10, secs - s)}); true`); await wait(150); }
async function until(cond, maxSecs, what) {
  for (let s = 0; s < maxSecs; s += 2) { if (await S(cond)) return true; await js('crabminer.advance(2); true'); }
  say('   ! ' + (what || cond) + ': not within ' + maxSecs + ' s'); return false;
}
// Scroll the field so that world x sits at the given share of the screen's width.
const look = (x, share = 0.5) => js(`(() => { const st = document.getElementById('stage'), r = document.getElementById('scene').getBoundingClientRect(), p = crabminer.at({ x: ${x}, d: 0.8 });
  st.scrollLeft += r.left + p.x - innerWidth * ${share}; return st.scrollLeft; })()`);
const clock = () => S(`'day ' + S.day + ', t ' + Math.round(S.t) + ' s, $' + Math.round(S.credits) + ', earned $' + Math.round(S.earned) + ', ' + S.crabs.length + ' crabs'`);

let shotN = 0;
const shots = [];
async function shot(name, marks = [], { page = false } = {}) {
  await js('__clear(); true');
  if (!page) await js('window.scrollTo(0, 0); true');   // a scrollIntoView in the panel can scroll the page too
  await wait(900);                                        // a few frames: the top bar and the panel refresh every 0.25 s
  // A button over the field or a card in the panel can show a refresh or two after the state that calls for it.
  let found;
  for (let i = 0; i < 8; i++) {
    await refresh();
    found = await js(`__mark([${marks.map(([e, t]) => `[${e}, ${JSON.stringify(t)}]`).join(',')}])`);
    if (!found || found.every(Boolean)) break;
    await js('__clear(); true'); await wait(400);
  }
  (found || []).forEach((ok, i) => { if (!ok) say(`   ! nothing to ring for mark ${i + 1} of ${name}: ${marks[i][1]}`); });
  await wait(120);
  const file = String(++shotN).padStart(2, '0') + '-' + name + '.png';
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const full = path.join(OUT, file);
  fs.writeFileSync(full, Buffer.from(r.result.data, 'base64'));
  await js('__clear(); true');
  let bytes = fs.statSync(full).size, note = '';
  if (bytes > MAX_BYTES && which('magick')) {
    spawnSync('magick', [full, '-strip', '-dither', 'FloydSteinberg', '-colors', '256', 'PNG8:' + full]);
    note = ' (reduced from ' + Math.round(bytes / 1024) + ' KB)'; bytes = fs.statSync(full).size;
  }
  const kept = marks.filter((_, i) => found && found[i]).map(m => m[1]);
  shots.push({ file, marks: kept });
  say(`   ${file}  ${Math.round(bytes / 1024)} KB${note}  [${await clock()}]`);
  kept.forEach((m, i) => say(`      ${i + 1}. ${m}`));
}
const q = sel => `document.querySelector(${JSON.stringify(sel)})`;
const hud = sel => `(${q(sel)} || document.body).closest('.hud-item, .seg')`;
const crab = (role, extra) => `crabminer.state().crabs.find(c => c.role === '${role}' && !c.air && !c.turtle && !c.manta && !(c.alt > 0)${extra ? ' && ' + extra : ''})`;
const spot = (obj, w, h, dy) => `__spot(${obj}, ${w || 40}, ${h || 40}, ${dy || 0})`;
const pos = (k, d) => `({ x: crabminer.state().pos.${k}, d: ${d} })`;
const h3 = re => `[...document.querySelectorAll('#ledger h3')].find(h => ${re}.test(h.textContent))`;
// Frames stall on a headless page (a few a second once the sea is busy), and the top bar and the panel only
// redraw on a frame or a control. Re-setting "Scouts work the night" to what it already is redraws both.
const refresh = () => js(`(() => { const e = document.getElementById('scouts-night'); e.dispatchEvent(new Event('change')); return true; })()`);
// Scroll the panel (not the page) so an element is at its top.
async function into(expr) {
  for (let i = 0; i < 10; i++) {
    await refresh();
    if (await js(`(() => { const e = ${expr}; if (!e || !e.offsetParent) return false; e.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); return true; })()`)) return true;
    await wait(300);
  }
  say('   ! nothing to scroll to: ' + expr.slice(0, 80)); return false;
}
// A button the panel has just enabled may wait for its next refresh: try for a couple of seconds.
async function press(sel, what) {
  for (let i = 0; i < 12; i++) {
    await refresh();
    if (await js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.disabled) return false; e.click(); return true; })()`)) return true;
    await wait(250);
  }
  say('   ! could not press ' + (what || sel) + ': ' + (await js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? 'disabled, ' + e.title + ' ' + e.textContent : 'not found'; })()`)) + ', $' + Math.round(await S('S.credits'))); return false;
}

async function stop() {
  try { ws && ws.close(); } catch (e) { /* closing anyway */ }
  try { chrome && chrome.kill(); } catch (e) { /* gone */ }
  try { server && server.kill(); } catch (e) { /* gone */ }
  await wait(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* the profile is in tmp */ }
}

(async () => {
  if (!which('chromium')) throw new Error('chromium is not on the PATH');
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (/^\d\d-.*\.png$/.test(f)) fs.rmSync(path.join(OUT, f));
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SERVE], { stdio: 'ignore' });
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'crabminer-guide-'));
  // In a VM the GPU process and the seccomp sandbox both crash Chromium; it only opens the local page.
  chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--disk-cache-size=1048576', '--remote-debugging-port=' + CDP,
    '--user-data-dir=' + profile, '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 80; i++) { await wait(250); try { targets = await (await fetch('http://127.0.0.1:' + CDP + '/json')).json(); if (targets.some(t => t.type === 'page')) break; } catch (e) { /* not yet */ } }
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  ws.onmessage = m => {
    const j = JSON.parse(m.data);
    if (j.id && pending.has(j.id)) { pending.get(j.id)(j); pending.delete(j.id); }
    if (j.method === 'Runtime.exceptionThrown') pageErrors.push((j.params.exceptionDetails.exception?.description || j.params.exceptionDetails.text).slice(0, 200));
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });   // the game stops in a hidden tab
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  for (let i = 0; i < 40; i++) { try { await send('Page.navigate', { url: PAGE }); break; } catch (e) { await wait(250); } }
  for (let i = 0; i < 100 && !(await js('document.readyState === "complete" && !!window.crabminer').catch(() => false)); i++) await wait(100);
  await js(OVERLAY);
  say('serving ' + SERVE + ' on ' + PAGE);

  // ═══ 1. A new game ══════════════════════════════════════════════════════════════════════════════════
  say('\n1. a new game');
  await click('#help'); await click('#newgame');
  await shot('new-game', [
    [hud('#h-rank'), 'Rank: lifetime earnings toward the next of six ranks.'],
    [q('#advice'), 'The advisor names what to do next.'],
    [q('#tutorial'), 'The tutorial opens on every new game.'],
  ]);
  await click('#help');
  await js(`(() => { const i = document.getElementById('intro'); [i, ...i.querySelectorAll('*')].forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); return true; })()`);
  await shot('intro', [
    [q('#intro-title'), 'The introduction, under ?'],
    [`[...document.querySelectorAll('#intro h2')].find(h => /how you play/.test(h.textContent))`, 'How you play: hire, keep them running, sell, run shifts, grow.'],
  ]);
  await click('#start');

  // ═══ 2. The line ════════════════════════════════════════════════════════════════════════════════════
  say('\n2. the line, left to right');
  await tab('view');                                     // the View tab folds the panel down
  await advance(60);
  // The crabs out in the field, not the ones at the den: the leftmost of each kind.
  const far = (role) => `crabminer.state().crabs.filter(c => c.role === '${role}' && !c.air && !c.turtle && !c.manta && !(c.alt > 0)).sort((a, b) => a.x - b.x)[0]`;
  await look(await S(`Math.max(330, (S.crabs.filter(c => c.role === 'drill').sort((a, b) => a.x - b.x)[0] || { x: 400 }).x + 60)`), 0.5);
  await shot('field', [
    [spot(far('scout'), 44, 44), 'A scout scans the sand and plants flags.'],
    [spot('crabminer.state().flags.slice().sort((a, b) => a.x - b.x)[0]', 34, 50, -14), 'A flag on a deposit.'],
    [spot(far('drill'), 44, 44), 'A drill digs the flag out, hole by hole.'],
    [spot(far('haul'), 44, 44), 'A hauler carries nodules to the ore pile.'],
    [q('.panel'), 'The View tab: pan, zoom and shell marks.'],
  ]);
  await look(730, 0.5);
  await shot('plots', [
    [spot(pos('DEN', 0.8), 120, 100, -30), 'The den'],
    [spot(pos('ORE', 0.8), 70, 50), 'Ore pile'],
    [spot(pos('CRUSH', 0.8), 70, 60), 'Crushing yard'],
    [spot(pos('BAR', 0.8), 60, 50), 'Bar stack'],
    [spot(pos('STOCK', 0.8), 60, 50), 'Stockpile'],
    [spot(pos('COLLECTOR', 0.8), 120, 110, -80), 'The collector, at the foot of the riser to the ship.'],
    [spot('({ x: crabminer.state().post.x, d: crabminer.state().post.d })', 40, 60, -10), 'The refuel post, on its cord from the Stirling engine by the lava.'],
  ]);

  // ═══ 3. Hire: the tutorial's first two steps ═══════════════════════════════════════════════════════
  say('\n3. the crew');
  await tab('crew');
  await press('.role[data-role="smelt"] [data-act="hire"]', 'hire a smelter');
  await into(q('#crew-used'));
  await shot('crew', [
    [q('#crew-used'), 'Crabs against the room in the den.'],
    [q('.role[data-role="smelt"] [data-act="hire"]'), '+ hires one; − retires the newest.'],
    [q('.role[data-role="smelt"] [data-act="app"]'), 'An apprentice: half the price, half the pace, a full crab after a day.'],
    [q('#tutorial'), 'The tutorial moves on by itself.'],
  ]);
  // Step 2: room in the den, then whatever the advisor names.
  await until('S.credits >= sim.upgradeCost("den")', 240, 'credits for the den');
  await tab('build'); await press('[data-up="den"] button', 'build a bigger den'); await tab('crew');
  for (let i = 0; i < 2; i++) {
    const b = await S('sim.bottleneck()');
    const role = { power: 'energy', sell: 'smelt' }[b] || b;
    await until(`S.credits >= sim.hireCost(${JSON.stringify(role)})`, 240, 'credits for a ' + role);
    let ok = await press(`.role[data-role="${role}"] [data-act="hire"]`, 'hire a ' + role);
    if (!ok) { await advance(10); ok = await press(`.role[data-role="${role}"] [data-act="hire"]`, 'hire a ' + role + ', again'); }
    if (ok) say('   hired a ' + role + ' (the advisor\'s bottleneck: ' + b + ')');
    else say('   ' + (await S(`JSON.stringify({ credits: Math.round(S.credits), cost: sim.hireCost(${JSON.stringify(role)}), crabs: S.crabs.length, cap: sim.crewCap() })`)));
  }

  // A crab's card: click the crab on the canvas, paused.
  await tab('view');
  await key(' ');
  const pick = await js(`(() => { const c = crabminer.state().crabs.filter(c => c.role === 'haul' && !c.air && !c.turtle && !c.manta && !(c.alt > 0) && c.x > 520 && c.x < 800)[0] || crabminer.state().crabs[0]; return c.id; })()`);
  await look(await js(`crabminer.state().crabs.find(c => c.id === ${pick}).x`), 0.55);
  const p2 = await js(`(() => { const c = crabminer.state().crabs.find(c => c.id === ${pick}), p = crabminer.at(c), r = document.getElementById('scene').getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p2.x, y: p2.y, button: 'left', clickCount: 1 });
  say('   selected crab ' + (await js('crabminer.view().selected')) + ' (clicked ' + pick + ')');
  await shot('crab-card', [
    [`__box(${p2.x}, ${p2.y - 100}, 190, 74)`, 'Click a crab: its name, kind, stars, what it is doing, and its record.'],
  ]);
  await key(' ');

  // ═══ 4. Money: overclock and the order ═════════════════════════════════════════════════════════════
  say('\n4. money');
  await until('S.ocBank >= 10 && !!S.order', 400, 'ten seconds of overclock and a ship order');
  await key('o');
  await advance(1);
  await shot('money', [
    [q('#oc-btn'), 'Overclock, banked by sales, now spent.'],
    [q('#h-order'), 'A ship\'s order: so many ingots in 100 s.'],
    [q('#h-stock').replace('")', '").closest(".hud-item")') + ' || ' + q('#h-stock'), 'The stockpile, and ingots kept back for repairs.'],
  ]);

  // ═══ 5. The workday: A and B shifts, then the night ════════════════════════════════════════════════
  say('\n5. the workday');
  await tab('crew');
  await press('[data-shift="ab"]', 'A/B shifts');
  await into(q('#advice'));
  await shot('shifts', [
    [q('#advice'), 'The advisor: the slowest stage, or the first gap.'],
    [q('[data-shift="ab"]'), 'A and B shifts: all by day, half of each kind sleeps each night.'],
    [q('#timeline'), 'Blue is day work, red night work; the outlined hour is now.'],
  ]);
  await until('S.si && S.si.night && S.crabs.filter(c => c.state === "sleep").length >= 3', 400, 'night, with crabs asleep');
  await tab('view');
  await look(await S('S.crabs.filter(c => c.state === "sleep").map(c => c.x).sort((a, b) => a - b)[1]'), 0.45);
  await shot('night', [
    [hud('#h-shift'), 'Night: 20:00 to 06:00, and whose shift it is.'],
    [spot('crabminer.state().crabs.find(c => c.state === "sleep")', 44, 40), 'Off duty: asleep where it stood, or dug in.'],
  ]);

  // ═══ 6. The sea's visitors, on their own timers ════════════════════════════════════════════════════
  say('\n6. the sea');
  await until('!!S.trader && S.trader.state === "stay"', 400, 'the trader');
  await tab('build');
  await into(q('#trader-card'));
  await look(await S('S.trader ? S.trader.x : 500'), 0.62);
  await shot('trader', [
    [spot('crabminer.state().trader', 90, 80, -20), 'The hermit-crab trader keeps shop by the den.'],
    [q('#trader-card'), 'Its goods, paid in bars and ingots.'],
    [q('#a-trader'), 'Its button over the field (T).'],
  ]);
  await tab('view');
  // It is shot on its way in, close to the pile: a crab near the pile scares it off before it can grab.
  const near = '!!S.octo && S.octo.state === "come" && Math.abs(S.octo.x - S.pos.ORE) < 90';
  let octo = await until(near, 300, 'the octopus near the pile');
  if (!octo) { await js('crabminer.state().nextOcto = crabminer.state().t; true'); octo = await until(near, 60, 'a summoned octopus'); say('   the octopus was summoned (S.nextOcto)'); }
  await look(await S('S.octo ? S.octo.x : S.pos.ORE'), 0.55);
  await shot('octopus', [
    [spot('crabminer.state().octo', 110, 220, -80), 'The octopus, swimming in for the ore pile.'],
    [q('#a-octo'), 'Shoo it: this button, the S key, or a click on it.'],
  ]);
  await key('s');
  await until('S.storm', 900, 'a storm');
  await advance(1);
  const chimney = await S('!!S.chimney');
  await look(await S('S.chimney ? S.chimney.x : 650'), 0.5);
  await shot('storm', [
    [q('#toasts'), 'What the storm does, said as it comes.'],
  ].concat(chimney ? [[spot('{ x: crabminer.state().chimney.x, d: 0.72 }', 60, 140, -60), 'A hydrothermal chimney: a second vent to ride.']] : []));

  // ═══ 7. Grow: Build and Tech ═══════════════════════════════════════════════════════════════════════
  say('\n7. build and research');
  await until(`S.credits >= sim.upgradeCost('field')`, 600, 'credits for the middle dune');
  await tab('build');
  await press('[data-up="field"] button', 'claim the middle dune');
  await into(q('[data-up="den"]'));
  await shot('build', [
    [q('[data-up="field"]'), 'Dune claims: the middle dune, claimed (the tutorial\'s fifth step).'],
    [q('[data-up="den"]'), 'A bigger den: room for more crabs.'],
    [q('#tutorial'), 'The tutorial\'s fifth step, done by that click.'],
  ]);
  await click('#tut-skip');
  await until(`S.credits >= sim.K.TECH.sonar.cost`, 600, 'credits for the Sonar lab');
  await tab('tech');
  await press('[data-tech="sonar"] [data-act="research"]', 'research the Sonar lab');
  await into(q('#p-tech'));
  await shot('tech', [
    [q('[data-tech="sonar"]'), 'A technology, researched.'],
    [q('[data-wup]'), 'Its worker upgrades: bought once, for every scout.'],
  ]);
  say('   end of plain play: ' + (await clock()));

  // ═══ 8. The late game, reached with credits ════════════════════════════════════════════════════════
  say('\n8. the late game (credits added)');
  await js(`(() => { const S = crabminer.state(), sim = crabminer.sim; S.credits += 6000;
    ['den', 'den', 'field', 'lamp', 'kelp', 'belt', 'pad', 'rim', 'annex', 'bits', 'riser'].forEach(u => sim.buy(u));
    ['haul', 'haul', 'drill', 'drill', 'crush', 'smelt', 'scout', 'energy'].forEach(r => sim.hire(r)); return true; })()`);
  await tab('view');
  await advance(60);
  await until('!!S.wreck', 180, 'a wreck on the back dune');   // its own timer: 420 s in, once the back dune is claimed
  await until('S.si && !S.si.night', 180, 'daylight');
  await js('crabminer.select(null); true');
  await look(330, 0.5);
  await shot('annex', [
    [spot(`({ x: crabminer.state().pos.ORE2, d: 0.5 })`, 70, 60), 'The annex: a second ore pile and yard on the middle dune.'],
    [spot('crabminer.state().wreck', 180, 90, -30), 'A wreck on the back dune, for the scouts to strip.'],
    [spot('({ x: 75, d: 0.8 })', 150, 120, -30), 'The kelp forest, claimed: richer, slower.'],
    [spot('({ x: 548, d: 0.74 })', 50, 120, -40), 'The lighthouse lamp.'],
  ]);
  await look(700, 0.5);
  await shot('conveyor', [
    [spot(`({ x: (546 + crabminer.state().pos.ORE) / 2, d: 0.8 })`, 160, 40), 'The ore conveyor: haulers drop nodules at its head.'],
    [spot(`({ x: crabminer.state().pos.PAD, d: 0.86 })`, 60, 30), 'The charging pad.'],
    [spot('({ x: 846, d: 0.94 })', 70, 40), 'The second smelting rim, nearer the plots.'],
  ]);

  // ═══ 9. Days and the den: the festival and pets (hooks) ═══════════════════════════════════════════
  say('\n9. the festival (hooks)');
  await js(`crabminer.festival(); ['slug', 'babyOcto', 'starfish', 'snail'].forEach(k => crabminer.adopt(k)); true`);
  await advance(3);
  await look(await S('S.pos.DEN'), 0.5);
  await shot('festival', [
    [spot(pos('DEN', 0.8), 170, 150, -40), 'Festival day: lanterns, bunting, and a rave at dawn.'],
    [spot(`({ x: crabminer.state().pos.DEN + 15, d: 0.88 })`, 250, 60), 'Pets by the den: pure charm.'],
  ]);

  // ═══ 10. The Ledger ════════════════════════════════════════════════════════════════════════════════
  say('\n10. the ledger');
  await tab('ledger'); await wait(1300);
  await into(h3('/^The line/'));
  await shot('ledger', [
    [h3('/^The line/') + '.nextElementSibling', 'What each stage could do, ingots a minute: the slowest sets the pace.'],
  ]);
  await into(h3('/^Achievements/'));
  await shot('achievements', [
    [h3('/^Achievements/'), 'Thirty-four achievements, each with the time it was won.'],
  ]);
  await into(`document.querySelector('#ledger canvas.portrait') && document.querySelector('#ledger canvas.portrait').closest('table')`);
  await shot('ledger-crew', [
    [`document.querySelector('#ledger canvas.portrait') && document.querySelector('#ledger canvas.portrait').closest('table')`, 'The crew by stars, each with a portrait in its mood.'],
  ]);

  // ═══ 11. The win, and a new dig site (earnings set just short of Crab Tycoon) ═════════════════════
  say('\n11. the win (earnings set)');
  await js(`(() => { const S = crabminer.state(); S.earned = Math.max(S.earned, 5990); return true; })()`);
  await tab('view');
  await until('S.rank === sim.K.RANKS.length - 1', 120, 'Crab Tycoon');
  await wait(2500);                                     // the win card follows the rank-up by 1.6 s of real time
  await shot('win', [
    [q('#win-text'), 'Crab Tycoon: the time it took, and the best time.'],
    [q('#site-box'), 'A new dig site, with one thing carried over.'],
  ]);
  await click('#win-keep', 'keep playing');

  // ═══ 12. The paper below the game ═════════════════════════════════════════════════════════════════
  say('\n12. the paper');
  await js(`document.getElementById('paper').scrollIntoView({ block: 'start' }); true`);
  await shot('paper', [
    [q('#paper h1'), 'The rules and a review of the economy, as an article under the game.'],
  ], { page: true });

  if (pageErrors.length) say('\npage errors:\n  ' + [...new Set(pageErrors)].join('\n  '));
  say('\n' + shotN + ' pictures in ' + OUT);
})().catch(e => { console.error('\nSTOPPED: ' + e.message); process.exitCode = 1; }).finally(stop);
