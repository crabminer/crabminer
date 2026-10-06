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
  { name: 'dark', width: 1280, height: 800, mobile: false, dark: true }
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
    close: () => { ws.close(); proc.kill(); setTimeout(() => fs.rmSync(dir, { recursive: true, force: true }), 500); }
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
  await send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: size.mobile ? 2 : 1, mobile: size.mobile });
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
    if (tab === 'ledger') await shot('ledger');
  }
  await js('document.getElementById("help").click(); true');
  expect(await js('!document.getElementById("intro").hidden'), 'the ? button did not open the intro');
  await shot('intro');
  await js('document.getElementById("start").click(); true');
  await wait(3000);
  await shot('playing');

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
  } finally { done = true; b.close(); }
  console.log('screenshots in ' + OUT);
  console.log(failed ? failed + ' of ' + SIZES.length + ' sizes failed' : 'all browser checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
