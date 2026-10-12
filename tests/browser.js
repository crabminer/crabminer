// Browser checks: open the page in headless Chromium over the DevTools protocol, play it through the
// controls, reload to check the save, and take screenshots, with any console error a failure.
// Usage: node tests/browser.js [screenshot dir]   (CHROME=/path/to/chrome to pick the browser)
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'crabminer-shots'));
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHROME = process.env.CHROME || ['chromium', 'chromium-browser', 'google-chrome'].find(c =>
  process.env.PATH.split(':').some(d => fs.existsSync(path.join(d, c))));
const SIZES = [
  { name: 'desktop', width: 1280, height: 800, mobile: false, dark: false },
  { name: 'iphone-se', width: 375, height: 553, mobile: true, dark: false },
  { name: 'dark', width: 1280, height: 800, mobile: false, dark: true },
  { name: '4k', width: 3840, height: 2160, mobile: false, dark: false },
  { name: '4k-hidpi', width: 1920, height: 1080, scale: 2, mobile: false, dark: false }
];
const wait = ms => new Promise(r => setTimeout(r, ms));
let done = false;

async function browser() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crabminer-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir,
    '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files', 'about:blank'],
    { stdio: 'ignore' });
  // In a VM, the GPU process and the seccomp sandbox both crash Chromium. It only ever opens this local page.
  proc.on('exit', code => { if (!done) { console.log('FAIL the browser exited (' + code + ')'); process.exit(1); } });
  const portFile = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await wait(100);
  if (!fs.existsSync(portFile)) throw new Error('the browser did not open its DevTools port');
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').split('\n');
  const ws = new WebSocket('ws://127.0.0.1:' + port + wsPath);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map(), listeners = [];
  ws.onmessage = m => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else listeners.forEach(f => f(msg));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    pending.set(++id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  return {
    send, on: f => listeners.push(f),
    close: async () => {               // wait for the browser to exit, then delete its profile (tens of MB each)
      ws.close();
      const gone = new Promise(r => proc.once('exit', r));
      proc.kill(); await Promise.race([gone, wait(5000)]);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

async function check(b, size) {
  const errors = [];
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p) => b.send(m, p, sessionId);
  b.on(msg => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'assert'))
      errors.push('console.' + msg.params.type + ': ' + msg.params.args.map(a => a.value ?? a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
  });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });   // the game stops in a hidden tab
  await send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: size.scale || (size.mobile ? 2 : 1), mobile: size.mobile });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: size.dark ? 'dark' : 'light' }] });
  const js = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(expr + ': ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const shot = async name => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, size.name + '-' + name + '.png'), Buffer.from(data, 'base64'));
  };
  const load = async () => {
    await send('Page.navigate', { url: PAGE });
    for (let i = 0; i < 50 && !(await js('document.readyState === "complete" && !!window.crabminer')); i++) await wait(100);
  };
  const problems = [];
  const expect = (cond, msg) => { if (!cond) problems.push(msg); };

  await load();
  expect(await js('!!window.crabminer'), 'window.crabminer is missing: the game did not start');
  await js('document.getElementById("help").click(); document.getElementById("newgame").click(); true');   // a new game
  expect(await js('crabminer.state().t < 1 && document.getElementById("intro").hidden'), 'New game did not start a new game');
  const t0 = await js('crabminer.state().t');
  await wait(1500);
  expect(await js('crabminer.state().t') > t0, 'the simulation is not running');
  expect(await js('document.documentElement.scrollWidth <= innerWidth + 1'), 'the page scrolls sideways');
  await shot('start');

  // play through the controls: speed, hire from each role, every tab
  await js('document.querySelector(\'[data-speed="4"]\') ? document.querySelector(\'[data-speed="4"]\').click() : null; true');
  await js('crabminer.state().credits = 2000; true');
  const before = await js('crabminer.state().crabs.length');
  await js(`document.querySelectorAll('#t-crew').forEach(t => t.click());
    document.querySelectorAll('.role[data-role] [data-act="hire"]').forEach(b => b.click()); true`);
  expect(await js('crabminer.state().crabs.length') > before, 'the hire buttons did not hire');
  for (const tab of ['build', 'tech', 'ledger', 'view', 'crew']) {
    await js(`document.getElementById('t-${tab}').click(); true`);
    expect(await js(`document.getElementById('t-${tab}').getAttribute('aria-selected') === 'true'`), 'the ' + tab + ' tab did not open');
    if (tab === 'ledger') {
      await shot('ledger');
      expect(await js('document.querySelectorAll("#ledger .ltable.talk tr").length') === await js('Object.keys(crabminer.talk()).length'), 'the Ledger does not list every kind of crab talk');
      expect(await js('document.querySelectorAll("#ledger .ltable.bars").length') >= 3, 'the Ledger is missing its whole-game bars');
      expect(await js('!!document.querySelector("#ledger [data-share]") && /Crabminer, day \\d+/.test(crabminer.summary())'), 'no run summary to share');
      expect(await js('/Earned over the whole game/.test(document.getElementById("ledger").textContent)'), 'the Ledger is missing its whole-game charts');
      expect(await js('document.querySelectorAll("#ledger .ltable.lab tbody tr:not(.group)").length') === await js('crabminer.eco().species.length'), 'the Ledger\'s lab report does not list every species');
      expect(await js('crabminer.eco().species.every(s => s.count > 0)'), 'a species of the food web has died out');
    }
  }
  await js('document.getElementById("help").click(); true');
  expect(await js('!document.getElementById("intro").hidden'), 'the ? button did not open the intro');
  await shot('intro');
  await js('document.getElementById("start").click(); true');
  await wait(3000);
  await shot('playing');

  // a click on a crab on the canvas opens its card: canvas coordinates line up with the screen
  await js('document.getElementById("t-view").click(); true');            // tuck the panel away
  const spot = await js(`(() => { const c = crabminer.state().crabs.find(c => !c.alt && !c.turtle), p = crabminer.at(c),
    stage = document.getElementById('stage'), r = document.getElementById('scene').getBoundingClientRect();
    stage.scrollLeft += r.left + p.x - innerWidth / 2;
    const r2 = document.getElementById('scene').getBoundingClientRect();
    return { id: c.id, x: r2.left + p.x, y: r2.top + p.y }; })()`);
  await js('document.querySelector(\'[data-speed="0"]\').click(); true');   // hold still for the click
  const p2 = await js(`(() => { const c = crabminer.state().crabs.find(c => c.id === ${spot.id}), p = crabminer.at(c), r = document.getElementById('scene').getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p2.x, y: p2.y, button: 'left', clickCount: 1 });
  expect(await js('crabminer.view().selected') === spot.id, 'a click on crab ' + spot.id + ' at ' + Math.round(p2.x) + ',' + Math.round(p2.y) + ' did not select it (got ' + (await js('crabminer.view().selected')) + ')');
  await shot('selected');
  await js('document.querySelector(\'[data-speed="1"]\').click(); document.getElementById("t-crew").click(); true');

  // every action has a button or a key as well as a click on the field
  const key = k => js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true })); true`);
  await key('2');
  expect(await js('document.querySelector(\'[data-speed="2"]\').getAttribute("aria-pressed") === "true"'), 'the 2 key did not set 2× speed');
  await key(']');
  expect(await js('document.getElementById("t-build").getAttribute("aria-selected") === "true"'), 'the ] key did not move to the next tab');
  await js('const S = crabminer.state(); S.ore = Math.max(S.ore, 4); S.nextOcto = S.t; S.nextTrader = S.t; true');
  for (let i = 0; i < 100 && await js('document.getElementById("a-octo").hidden || document.getElementById("a-trader").hidden'); i++) await wait(100);
  expect(!(await js('document.getElementById("a-octo").hidden')), 'no Shoo button in the top bar when the octopus came');
  expect(!(await js('document.getElementById("a-trader").hidden')), 'no trader button in the top bar when the trader came');
  await shot('alerts');
  await key('s');
  expect(await js('!crabminer.state().octo || crabminer.state().octo.state === "flee"'), 'the S key did not shoo the octopus');
  await js('document.getElementById("t-crew").click(); document.getElementById("a-trader").click(); true');
  expect(await js('document.getElementById("t-build").getAttribute("aria-selected") === "true" && !document.getElementById("trader-card").hidden'), 'the trader button did not open its shop');
  const before2 = await js('JSON.stringify(crabminer.state().layout)');
  await js('document.querySelector("#layout-list [data-move]:not(:disabled)").click(); true');
  expect(await js('JSON.stringify(crabminer.state().layout)') !== before2, 'a ◀ ▶ button did not move a building');
  const postX = await js('crabminer.state().post.x');
  await js('document.querySelector("#layout-list [data-post]:not(:disabled)").click(); true');
  expect(await js('crabminer.state().post.x') !== postX, 'a ◀ ▶ button did not move the refuel post');
  await js('document.getElementById("t-crew").click(); document.getElementById("roster-box").open = true; true');
  await wait(400);
  const shown = await js('(() => { const b = document.querySelector("#roster [data-show]"); b.click(); return +b.getAttribute("data-show"); })()');
  expect(await js('crabminer.view().selected') === shown, 'Show in the crew list did not open the crab\'s card');
  expect(await js('document.querySelectorAll("#roster li").length === crabminer.state().crabs.length'), 'the crew list does not list every crab');
  await shot('roster');
  await key('1');

  // festival day, the four pets and the manta, all at once: the hooks must work and draw without an error
  await js('crabminer.festival(); ["slug", "babyOcto", "starfish", "snail"].forEach(k => crabminer.adopt(k)); crabminer.summonManta(); true');
  await wait(300);
  await js('const m = crabminer.state().manta; if (m) m.x = m.dir > 0 ? 250 : 750; true');
  await wait(1200);
  expect(await js('crabminer.state().pets.length === 4 && crabminer.state().decor.some(d => d.kind === "lanterns") && crabminer.state().festival'), 'the festival hooks did not add the lanterns and the pets');
  await shot('festival');

  // an earthquake, a copper boom and an achievement, forced through the hooks: no console errors, and the Ledger lists them
  await js('crabminer.news("boom"); crabminer.quake(); crabminer.state().stat.pearls = Math.max(1, crabminer.state().stat.pearls); document.querySelector(\'[data-speed="4"]\').click(); true');
  for (let i = 0; i < 200 && !(await js('!!crabminer.state().ach.pearl && !!crabminer.state().news')); i++) await wait(100);   // a crab second or two; headless frames can be slow
  await key('1');
  expect(await js('!!crabminer.state().news && crabminer.state().news.kind === "boom"'), 'the news hook did not start a boom');
  expect(await js('!!crabminer.state().ach.pearl'), 'the pearl achievement was not won after the pearl');
  await js('document.getElementById("t-ledger").click(); true');
  await wait(1200);
  expect(await js('/Achievements: \\d+ of \\d+/.test(document.getElementById("ledger").textContent)'), 'the Ledger has no achievements list');
  await shot('quake');
  await js('document.getElementById("t-crew").click(); true');

  // a chimney, a contract offer, an apprentice and the lighthouse lamp: the hooks, the Accept button, the hire button and the Build card
  await js('crabminer.chimney(); crabminer.contract(); crabminer.state().credits = 3000; document.querySelector(\'[data-speed="4"]\').click(); true');
  for (let i = 0; i < 200 && !(await js('!!crabminer.state().chimney && !!crabminer.state().contract')); i++) await wait(100);
  await key('1');
  await wait(400);                                                                 // the panel refreshes four times a second
  expect(await js('!!crabminer.state().chimney'), 'the chimney hook did not open a chimney');
  expect(await js('!!crabminer.state().contract && crabminer.state().contract.state === "offer" && !document.getElementById("a-contract").hidden'), 'the contract hook did not make an offer with a button in the top bar');
  await key('c');
  expect(await js('document.getElementById("t-build").getAttribute("aria-selected") === "true" && !document.getElementById("contract-card").hidden'), 'the C key did not open the contract card');
  await js('document.getElementById("contract-accept").click(); true');
  expect(await js('crabminer.state().contract && crabminer.state().contract.state === "on" && !document.getElementById("h-contract").hidden'), 'Accept did not start the contract on the top bar');
  const lampBtn = await js('(() => { const b = document.querySelector(\'[data-up="lamp"] button\'); if (!b || b.disabled) return false; b.click(); return true; })()');
  expect(lampBtn && await js('crabminer.state().lv.lamp === 1'), 'the Build tab did not build the lighthouse lamp');
  await js('document.getElementById("t-crew").click(); true');
  await js('crabminer.sim.buy("den"); true');                                       // room for one more
  for (let i = 0; i < 200 && await js('document.querySelector(\'.role[data-role="haul"] [data-act="app"]\').disabled'); i++) await wait(100);   // until a frame has refreshed the panel
  const apps = await js('crabminer.state().crabs.filter(c => c.apprentice).length');
  await js('document.querySelector(\'.role[data-role="haul"] [data-act="app"]\').click(); true');
  expect(await js('crabminer.state().crabs.filter(c => c.apprentice).length') === apps + 1, 'the apprentice button did not hire an apprentice: ' + await js('JSON.stringify({ disabled: document.querySelector(\'.role[data-role="haul"] [data-act="app"]\').disabled, crabs: crabminer.state().crabs.length, cap: crabminer.sim.crewCap(), credits: crabminer.state().credits, t: crabminer.state().t })'));
  await wait(1500);
  await shot('chimney');

  // the kelp claim, the conveyor and the charging pad from the Build tab, and a new dig site from the win card
  await js('crabminer.state().credits = 5000; crabminer.sim.buy("kelp"); crabminer.sim.buy("belt"); crabminer.sim.buy("pad"); crabminer.sim.drain().forEach(() => 0); const S3 = crabminer.state(); for (let i = 0; i < 8; i++) S3.nodules.push({ x: 500 + i * 4, d: 0.8, alive: true, eddy: -1, by: null }); document.querySelector(\'[data-speed="4"]\').click(); true');
  for (let i = 0; i < 400 && !(await js('crabminer.state().stat.belted > 0')); i++) await wait(100);   // haulers drop onto the belt and it carries the ore; headless frames can be slow
  await key('1');
  expect(await js('crabminer.state().lv.kelp === 1 && crabminer.state().lv.belt === 1 && crabminer.state().lv.pad === 1'), 'the Build tab did not build the kelp claim, the conveyor and the pad');
  expect(await js('crabminer.state().stat.belted > 0'), 'no nodule rode the conveyor to the pile');
  await shot('belt');
  await js('document.getElementById("t-ledger").click(); true'); await wait(600);
  expect(await js('/Ore conveyor/.test(document.getElementById("ledger").textContent) && /Kelp forest/.test(document.getElementById("ledger").textContent)'), 'the Ledger has no conveyor or kelp rows');
  await js('const S2 = crabminer.state(); S2.rank = 5; S2.earned = 7000; S2.tech.sonar = true; document.getElementById("t-ledger").click(); true'); await wait(1200);
  await js('document.querySelector("#ledger [data-site]").click(); true');
  expect(await js('!document.getElementById("win").hidden && !document.getElementById("site-tech-btn").disabled'), 'the Ledger did not open the new-site card with a technology to keep');
  const site1 = await js('crabminer.state().site');
  await js('document.getElementById("site-tech-btn").click(); true');
  expect(await js('crabminer.state().site') === site1 + 1 && await js('crabminer.state().tech.sonar === true && crabminer.state().t < 1 && document.getElementById("win").hidden'), 'Keep that technology did not start a new site with the Sonar lab');
  await wait(800);
  expect(await js('/Site 2/.test(document.getElementById("h-shift").textContent)'), 'the top bar does not show the new site');
  await shot('site2');
  await js('document.getElementById("t-crew").click(); true');

  // the save: a reload picks up where the game was
  const saved = await js('(dispatchEvent(new Event("pagehide")), { t: crabminer.state().t, n: crabminer.state().crabs.length })');
  await load();
  const back = await js('({ t: crabminer.state().t, n: crabminer.state().crabs.length })');
  expect(back.n === saved.n && back.t >= saved.t - 1, 'the reload did not resume the game: ' + JSON.stringify({ saved, back }));

  await b.send('Target.closeTarget', { targetId });
  return problems.concat(errors.map(e => 'error: ' + e));
}

(async () => {
  if (!CHROME) { console.log('no Chromium found; set CHROME'); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const b = await browser();
  let failed = 0;
  try {
    for (const size of SIZES) {
      const problems = await check(b, size);
      if (problems.length) { failed++; console.log('FAIL ' + size.name + '\n  ' + problems.join('\n  ')); }
      else console.log('ok   ' + size.name + ' (' + size.width + '×' + size.height + ')');
    }
  } finally { done = true; await b.close(); }
  console.log('screenshots in ' + OUT);
  console.log(failed ? failed + ' of ' + SIZES.length + ' sizes failed' : 'all browser checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
