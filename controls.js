// ===== The view, part 4: the controls, and the boot =====
// The view is four classic scripts, game.js, scene.js, crabs.js and controls.js, that share one global scope:
// every top-level var and function here is a window property the other three use, so each file is a chapter, not a module.
// This chapter is the HUD and the panel, the actions behind every button and key, the workday editor, the Ledger with its
// portraits and charts, sharing a run, the game flow (new game, save, load, win), the tutorial, the gestures on the field, and
// at the end the frame loop and the boot that starts the game.
'use strict';

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
  yard: { name: 'Bigger yard', fx: function (v) { return 'Ore pile holds ' + K.ORE_CAP[v] + ', bar stack ' + K.BAR_CAP[v]; } },
  lamp: { name: 'Lighthouse lamp', fx: function (v) { return v ? 'Lights ' + v + ' units around the field\'s edge at night: tired crabs there are not slowed by the dark' : 'No lamp: tired crabs work at half speed in the dark'; } },
  kelp: { name: 'Kelp forest claim', fx: function (v) { return v ? 'The kelp at the field\'s left end is yours: deposits there are richer (+0.1) and bigger (+1 nodule), walking through the fronds is slow, and idle crabs weave kelp pieces for the den' : 'The kelp forest at the field\'s left end is roped off'; } },
  belt: { name: 'Ore conveyor', fx: function (v) { return v ? 'A belt from the field\'s edge to the ore pile: haulers drop nodules on it and turn straight back' : 'Haulers walk every nodule all the way to the ore pile'; } },
  pad: { name: 'Charging pad', fx: function (v) { return v ? 'Crabs standing on it (between the ore pile and the crushing yard) charge ' + (v * 100).toFixed(1) + '% a second by themselves' : 'Only energy bots charge crabs'; } },
  annex: { name: 'Annex on the middle dune', fx: function (v) { return v ? 'A second ore pile and crushing yard in the middle of the middle dune: haulers drop at the nearer pile, crushers follow the ore, and the annex\'s bars ride a cableway to the bar stack' : 'One ore pile and one yard, on the front dune (needs the middle dune claimed)'; } },
  rim: { name: 'Second smelting rim', fx: function (v) { return v ? 'A lava pocket in the cavern side, nearer the plots: smelters spread over both rims, and the repair crews forge at the nearer one' : 'One lava rim: every smelter and forge shares it'; } }
};
var STAGE_NAME = { scout: 'Scouting', drill: 'Drilling', haul: 'Hauling', crush: 'Crushing', smelt: 'Smelting', sell: 'Selling' };
var ui = {
  aOcto: $('a-octo'), aEel: $('a-eel'), aTrader: $('a-trader'), aTraderLabel: $('a-trader-label'), aContract: $('a-contract'), aContractLabel: $('a-contract-label'),
  contract: $('h-contract'), contractN: $('h-contract-n'), contractT: $('h-contract-t'), contractBar: $('h-contract-bar'),
  contractCard: $('contract-card'), contractText: $('contract-text'), contractTime: $('contract-time'), contractAccept: $('contract-accept'), contractDecline: $('contract-decline'), appMode: $('app-mode'), insureBtn: $('insure-btn'), insureText: $('insure-text'), soundBtn: $('sound-btn'), tutorial: $('tutorial'), tutStep: $('tut-step'), tutText: $('tut-text'), tutSkip: $('tut-skip'), tutorialBtn: $('tutorial-btn'), siteTech: $('site-tech'), siteTechBtn: $('site-tech-btn'), siteDecorBtn: $('site-decor-btn'), siteCrabBtn: $('site-crab-btn'), roster: $('roster'), rosterBox: $('roster-box'), rosterCount: $('roster-count'), layoutList: $('layout-list'),
  credits: $('h-credits'), rate: $('h-rate'), rank: $('h-rank'), rankBar: $('h-rank-bar'), rankNext: $('h-rank-next'),
  price: $('h-price'), trend: $('h-trend'), stock: $('h-stock'), reserve: $('h-reserve'), rMinus: $('r-minus'), rPlus: $('r-plus'),
  fineWrap: $('h-fine-wrap'), fine: $('h-fine'), reserveFine: $('h-reserve-fine'), rfMinus: $('rf-minus'), rfPlus: $('rf-plus'), zoomOut: $('zoom-out'), zoomIn: $('zoom-in'), zoomFit: $('zoom-fit'), zoomLevel: $('zoom-level'), marks: $('marks'),
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
  lucky: ['Lucky shell', 'The next strike on a rich flag finds a pearl.'],
  pet: ['A pet for the den', 'A starfish, then a sea snail, moves in by the den. Charm only.'],
  cake: ['Festival cake', 'A slice for every crab lifts its mood, and the cake stand goes on the den\'s porch. Night market only.']
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
function shoo() { if (sim.shoo() || sim.shooEel()) { sim.drain().forEach(handle); renderHUD(); } }   // the octopus first, then the eel
function openShop() { if (!S.trader) return; selectTab('t-build'); flashCard(ui.traderCard); }
function showCrab(c) {                 // scroll the field to a crab and open its card
  selected = c; selectedUntil = T + 8;
  stage.scrollTo({ left: crabX(c) * Z - stage.clientWidth / 2, behavior: mqReduce.matches ? 'auto' : 'smooth' });
}
function renderAlerts() {
  var tr = S.trader, co = S.contract;
  ui.aOcto.hidden = !S.octo || S.octo.state === 'flee';
  ui.aEel.hidden = !S.eel.out;
  ui.aTrader.hidden = !tr || tr.state === 'leave';
  if (tr) ui.aTraderLabel.textContent = tr.state === 'stay' ? (tr.market ? 'Night market ' : 'Trader open ') + fmtTime(tr.until - S.t) : (tr.market ? 'Night market coming' : 'Trader coming');
  ui.aContract.hidden = !co || co.state !== 'offer';
  if (co && co.state === 'offer') ui.aContractLabel.textContent = 'Contract offer ' + fmtTime(co.acceptBy - S.t);
}
function openContract() { if (!S.contract) return; renderPanel(); selectTab('t-build'); flashCard(ui.contractCard); }
var rosterIds = '';
function renderRoster() {              // rows are rebuilt only when the crew changes, so focus and clicks survive
  ui.rosterCount.textContent = '(' + S.crabs.length + ')';
  if (!ui.rosterBox.open) { rosterIds = ''; return; }
  var crew = S.crabs.slice().sort(function (a, b) { return K.ROLES.indexOf(a.role) - K.ROLES.indexOf(b.role) || a.id - b.id; }),
    ids = crew.map(function (c) { return c.id; }).join(), rows, i, c, li;
  if (ids !== rosterIds) {
    rosterIds = ids;
    ui.roster.innerHTML = crew.map(function (c) {
      return '<li data-id="' + c.id + '">' + roleDot(c.role) +
        '<span class="who"><b></b><span class="stars"></span> <span class="kind"></span></span>' +
        '<button type="button" class="mini wide" data-show="' + c.id + '">Show</button><span class="what"></span></li>';
    }).join('');
  }
  rows = ui.roster.children;
  for (i = 0; i < crew.length; i++) {
    c = crew[i]; li = rows[i];
    li.querySelector('b').textContent = c.name;
    li.querySelector('.stars').textContent = c.stars ? new Array(c.stars + 1).join('★') : '';
    li.querySelector('.kind').textContent = (c.apprentice ? 'apprentice ' : '') + NAMES[c.role].toLowerCase();
    li.querySelector('.what').textContent = statusText(c) + ' · ' + c.rec.jobs + ' job' + (c.rec.jobs === 1 ? '' : 's');
    li.querySelector('button').setAttribute('aria-label', 'Show ' + c.name + ' on the field');
  }
}
var layoutSig = '';
function renderLayout() {              // the plots in order from the field to the lava, each building with buttons to move it
  var sig = JSON.stringify(S.layout) + JSON.stringify(S.layoutA) + S.lv.annex, i, k, at = {}, html = '', lo = Math.max(K.FIELD0 + 30, K.STIRLING - K.CORD), hi = K.STIRLING - 40, b;
  if (sig !== layoutSig) {
    layoutSig = sig;
    for (k in S.layout) at[S.layout[k]] = k;
    for (i = 0; i < K.PLOTS.length; i++) {
      b = at[i];
      html += '<div class="plot"><span class="n">' + (i + 1) + '</span><span>' + (b ? BLD_NAMES[b] : '<span class="note">empty plot</span>') + '</span>' +
        (b ? '<button type="button" class="mini" data-move="' + b + '" data-to="' + (i - 1) + '"' + (i ? '' : ' disabled') + ' aria-label="Move the ' + BLD_NAMES[b].toLowerCase() + ' toward the field">◀</button>' +
          '<button type="button" class="mini" data-move="' + b + '" data-to="' + (i + 1) + '"' + (i < K.PLOTS.length - 1 ? '' : ' disabled') + ' aria-label="Move the ' + BLD_NAMES[b].toLowerCase() + ' toward the lava">▶</button>' : '<span></span><span></span>') + '</div>';
    }
    if (S.lv.annex) {
      var atA = {}, LA = S.layoutA;
      for (k in LA) atA[LA[k]] = k;
      for (i = 0; i < K.ANNEX_PLOTS.length; i++) {
        b = atA[i];
        html += '<div class="plot"><span class="n">A' + (i + 1) + '</span><span>' + (b ? BLD_NAMES[b] : '<span class="note">empty annex plot</span>') + '</span>' +
          (b ? '<button type="button" class="mini" data-move="' + b + '" data-to="' + (i - 1) + '"' + (i ? '' : ' disabled') + ' aria-label="Move the ' + BLD_NAMES[b].toLowerCase() + ' toward the kelp">◀</button>' +
            '<button type="button" class="mini" data-move="' + b + '" data-to="' + (i + 1) + '"' + (i < K.ANNEX_PLOTS.length - 1 ? '' : ' disabled') + ' aria-label="Move the ' + BLD_NAMES[b].toLowerCase() + ' toward the plots">▶</button>' : '<span></span><span></span>') + '</div>';
      }
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
    html += '<div class="role" data-role="' + r + '">' + roleDot(r) +
      '<span class="role-name"><b><em class="long">' + NAMES[r] + 's</em><em class="short">' + SHORT[r] + '</em></b><span>' + ROLE_INFO[r] + '</span></span>' +
      '<span class="role-ctl"><button type="button" class="mini" data-act="retire" aria-label="Retire one ' + NAMES[r].toLowerCase() + '">−</button>' +
      '<output aria-label="' + NAMES[r] + 's">0</output>' +
      '<button type="button" class="hire" data-act="hire" aria-label="Hire one ' + NAMES[r].toLowerCase() + '">+ $0</button>' +
      '<button type="button" class="hire app" data-act="app" aria-label="Hire an apprentice ' + NAMES[r].toLowerCase() + ': half the price, half the pace, a full crab after a day">🎓 $0</button></span></div>';
  });
  ui.roles.innerHTML = html;
  html = '';
  Object.keys(K.TECH).forEach(function (id) {   // each technology, then the worker upgrades it unlocks
    html += '<div class="card tech" data-tech="' + id + '"><div class="card-top"><h3>' + TECH_INFO[id].name + '</h3><button type="button" class="hire" data-act="research">$' + K.TECH[id].cost + '</button></div><p class="now">' + TECH_INFO[id].note + '</p></div>';
    K.TECH[id].roles.forEach(function (role) {
      Object.keys(K.WUP).forEach(function (w) {
        if (K.WUP[w].role !== role) return;
        html += '<div class="card wup" data-wup="' + w + '"><div class="card-top"><h3>' + roleDot(role) + ' ' + WUP_INFO[w][0] + '</h3><button type="button" class="hire" data-act="wup">$' + K.WUP[w].cost + '</button></div><p class="now">' + NAMES[role] + 's: ' + WUP_INFO[w][1] + '</p></div>';
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
    var app = row.querySelector('[data-act="app"]'), appCost = sim.hireCost(r, true), appMode = ui.appMode.checked;   // on phones the toggle turns + into the apprentice button
    hire.textContent = (appMode ? '🎓 ' : '+ ') + money(appMode ? appCost : cost);
    hire.disabled = full || S.credits < (appMode ? appCost : cost);
    hire.classList.toggle('on-app', appMode);
    hire.title = full ? 'The den is full' : (S.credits < cost ? 'Not enough credits' : (appMode ? 'An apprentice for ' + money(appCost) : 'Hire for ' + money(cost)));
    app.textContent = '🎓 ' + money(appCost);
    app.disabled = full || S.credits < appCost;
    app.title = full ? 'The den is full' : (S.credits < appCost ? 'Not enough credits' : 'An apprentice for ' + money(appCost) + ': half the pace, a full ' + ROLE_NOUN[r] + ' after a day');
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
    '<br>Morning bonus ' + Math.round((K.MORNING_BONUS - 1 + S.decor.length * K.DECOR_MORNING) * 100) + '% for ' + (K.MORNING_TIME + S.decor.length * K.DECOR_MORNING_TIME) + ' s; dancing recharges ' + Math.round(S.decor.length * K.DECOR_DANCE * 100) + '% faster. Idle crabs make more, up to the den\'s room.' +
    (S.pets.length ? '<br>Pets: ' + S.pets.map(function (p) { return p.name + ' the ' + PET_NAMES[p.kind]; }).join(', ') + '.' : '');
  var tr = S.trader, open = tr && tr.state === 'stay';
  ui.traderCard.hidden = !tr;
  if (tr) {
    ui.traderTime.textContent = (tr.market ? 'night market: ' : '') + (open ? 'open ' + fmtTime(tr.until - S.t) : (tr.state === 'come' ? 'on the way' : 'leaving'));
    ui.traderOffers.innerHTML = tr.offers.map(function (id) {
      var T = K.TRADES[id], short = (T.pay.bars || 0) > S.bars || (T.pay.ingots || 0) > S.stock, sold = tr.sold[id];
      return '<div class="offer"><span><b>' + TRADE_INFO[id][0] + '</b><br>' + TRADE_INFO[id][1] + '</span><button type="button" class="hire" data-trade="' + id + '"' + (!open || sold || short ? ' disabled' : '') + '>' + (sold ? 'Swapped' : 'Swap ' + priceText(T.pay)) + '</button></div>';
    }).join('');
  }
  var co = S.contract;
  ui.contractCard.hidden = !co;
  if (co) {
    ui.contractTime.textContent = co.state === 'offer' ? 'offer open ' + fmtTime(co.acceptBy - S.t) : fmtTime(co.until - S.t) + ' left';
    ui.contractText.textContent = co.state === 'offer'
      ? 'The surface wants ' + co.need + ' ingots within three days (' + fmtTime(K.CONTRACT_DAYS * K.DAY) + ' of crab time). Filled, it pays ' + money(co.need * co.pay) + ' (' + money(co.pay) + ' an ingot' + (S.rep ? ', raised by your ' + S.rep + ' star' + (S.rep === 1 ? '' : 's') : '') + ') and a ' + DECOR_NAMES[co.decor] + ' for the den. Run out, it costs a reputation star. Let it lapse and nothing happens.'
      : co.got + ' of ' + co.need + ' ingots sent up, ' + fmtTime(co.until - S.t) + ' to go. Pays ' + money(co.need * co.pay) + ' and a ' + DECOR_NAMES[co.decor] + ' when filled; a star if not.';
    ui.contractAccept.hidden = ui.contractDecline.hidden = co.state !== 'offer';
  }
  ui.insureBtn.textContent = S.insured ? 'Insured' : 'Insure';
  ui.insureBtn.setAttribute('aria-pressed', String(S.insured));
  ui.insureBtn.disabled = !S.insured && S.credits < K.INSURE_DAY;
  ui.insureText.textContent = (S.insured ? 'Covered: ' : 'Not covered: ') + '$' + K.INSURE_DAY + ' a day at dawn buys $' + K.INSURE_NODULE + ' back for every nodule the octopus gets away with or a quake buries, and $' + K.INSURE_FLAG + ' for every flag the tide, a storm or a quake buries. So far: $' + S.stat.premiums + ' in premiums, $' + S.stat.payouts + ' paid out.' + (S.insured ? ' Press Insured to cancel.' : '');
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
  if (S.contract && S.contract.state === 'offer') {
    var coRate = sim.rates(300).sold * K.CONTRACT_DAYS * K.DAY / 60;
    return 'Advisor: <b>A contract offers ' + money(S.contract.need * S.contract.pay) + ' for ' + S.contract.need + ' ingots in three days.</b> At the last five minutes\' pace you would send about ' + Math.round(coRate) + '. ' + (coRate >= S.contract.need * 1.1 ? 'Take it in the Build tab (C).' : 'Tight: it costs a star if you fall short. Hire first, or let it lapse.');
  }
  if (S.contract && S.contract.state === 'on' && !S.order && S.t - S.contract.at > 60) {   // a minute in, once the rate means something
    var coLeft = S.contract.need - S.contract.got, coNeedRate = coLeft / Math.max(1, (S.contract.until - S.t) / 60), coNow = sim.rates(60).sold;
    var coB = sim.bottleneck(), coStage = (STAGE_NAME[coB] || { power: 'power', repair: 'repairs', mech: 'legs' }[coB] || coB).toLowerCase();
    if (coNeedRate > coNow * 1.05) return 'Advisor: <b>The contract is falling behind: ' + coLeft + ' more ingots in ' + fmtTime(S.contract.until - S.t) + ' needs ' + coNeedRate.toFixed(1) + ' a minute, and the line makes ' + coNow.toFixed(1) + '.</b>' + (S.reserve > 0 ? ' Lower the reserve.' : '') + (S.ocBank >= 5 && !S.oc ? ' Overclock.' : '') + ' The slowest stage is ' + coStage + '.';
  }
  if (S.quake) return 'Advisor: <b>Earthquake!</b> The ' + K.ZONES[S.quake.zone].name.toLowerCase() + ' is shaking. When the sand slides it buries what lies in its path and bares a rich patch elsewhere: send the scouts and drills there.';
  if (S.news && S.news.kind === 'boom') return 'Advisor: <b>Copper boom!</b> Ingots fetch 40% more for ' + fmtTime(S.news.until - S.t) + '.' + (S.reserve > 0 ? ' Drop the stockpile reserve to send everything up.' : '') + (S.ocBank >= 5 && !S.oc ? ' Overclock to make the most of it.' : '');
  if (S.news && S.news.kind === 'glut') return 'Advisor: <b>A glut at the surface.</b> Ingots fetch 35% less for ' + fmtTime(S.news.until - S.t) + '. Raise the stockpile reserve to hold them back until it passes' + (S.order ? ', unless the ship order matters more' : '') + '.';
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
  var nk = S.news && S.news.kind;
  ui.trend.textContent = nk === 'boom' ? '▲ boom! ' + fmtTime(S.news.until - S.t) : nk === 'glut' ? '▼ glut ' + fmtTime(S.news.until - S.t) : d > 0.15 ? '▲ rising' : (d < -0.15 ? '▼ falling' : 'steady');
  ui.trend.className = 'hud-rate ' + (nk === 'boom' || (!nk && d > 0.15) ? 'up' : (nk === 'glut' || (!nk && d < -0.15) ? 'down' : ''));
  ui.stock.textContent = String(S.stock - S.stockFine);
  ui.reserve.textContent = String(S.reserve);
  ui.rMinus.disabled = S.reserve <= 0; ui.rPlus.disabled = S.reserve >= 12;
  ui.fineWrap.hidden = !(S.stockFine || S.reserveFine || S.stat.fineIngots);   // the fine shelf shows once there is fine metal
  ui.fine.textContent = String(S.stockFine);
  ui.reserveFine.textContent = String(S.reserveFine);
  ui.rfMinus.disabled = S.reserveFine <= 0; ui.rfPlus.disabled = S.reserveFine >= 12;
  ui.advice.innerHTML = advice();
  var si = sim.shiftInfo();
  ui.shift.textContent = (S.site > 1 ? 'Site ' + S.site + ' · ' : '') + 'Day ' + si.day + (S.festival ? ' festival' : '') + ' · ' + clock(si.hour) + (si.night ? ' night' : '') + (si.periods > 1 ? ' · ' + si.name : '');
  ui.shiftLeft.textContent = (si.periods > 1 ? SHIFT_INFO[S.shift].short + ' · ' + Math.ceil(si.left / (K.DAY / 24)) + ' h to change' : SHIFT_INFO[S.shift].name) + ' · ' + (S.storm ? 'storm!' : S.lavaSurge ? 'lava surge!' : S.tide > 0.75 ? 'high tide' : S.tide < -0.75 ? 'low tide' : S.tide > 0 ? 'tide rising' : 'tide falling');
  ui.flow.textContent = '×' + sim.flowMult().toFixed(2);
  ui.flowNote.textContent = (S.festival ? 'festival: bonus doubled · ' : '') + (S.streak ? S.streak + ' deliveries in a row' : 'deliver steadily');
  ui.order.hidden = !S.order;
  if (S.order) {
    ui.orderN.textContent = S.order.got + ' of ' + S.order.need + (S.order.rivalRate ? ' · rival ' + Math.floor(S.order.rival) : '');
    ui.rival.hidden = !S.order.rivalRate;
    if (S.order.rivalRate) ui.rivalBar.style.width = (S.order.rival / S.order.need * 100).toFixed(1) + '%';
    ui.orderT.textContent = fmtTime(S.order.until - S.t) + ' left · +' + Math.round(S.order.premium * 100) + '% · ' + '★'.repeat(S.rep) + '☆'.repeat(K.REP_MAX - S.rep);
    ui.orderBar.style.width = (S.order.got / S.order.need * 100).toFixed(1) + '%';
  }
  var co = S.contract, onCo = co && co.state === 'on';
  ui.contract.hidden = !onCo;
  if (onCo) {
    ui.contractN.textContent = co.got + ' of ' + co.need;
    ui.contractT.textContent = fmtTime(co.until - S.t) + ' left · ' + money(co.need * co.pay);
    ui.contractBar.style.width = (co.got / co.need * 100).toFixed(1) + '%';
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
// The lab report: the sea's food web as eco.js keeps it, with the fisherman's book and the latest observations.
var ECO_LEVEL = { 1: 'Grazers and small fry', 2: 'Hunters', 3: 'Top of the chain', bird: 'Above the water' };
function ledgerLab() {
  if (!eco) return '';
  var r = eco.report(), lastLevel = null, html, f = r.fisherman, eaten = 0, born = 0, i;
  for (i = 0; i < r.species.length; i++) { eaten += r.species[i].eaten || 0; born += r.species[i].born || 0; }
  html = '<h3>Lab report: the food web</h3><p class="note">A closed ecosystem, decoration only. Every animal eaten is replaced by a birth, so the pyramid keeps its shape: many small fry, a few hunters, one or two sharks. ' +
    born.toLocaleString('en-US') + ' born and ' + eaten.toLocaleString('en-US') + ' eaten so far.</p>' +
    '<table class="ltable lab"><thead><tr><th scope="col">Species</th><th scope="col" class="n">Now</th><th scope="col" class="n">Born</th><th scope="col" class="n">Eaten</th><th scope="col" class="n">Landed</th></tr></thead><tbody>';
  r.species.forEach(function (sp) {
    if (sp.level !== lastLevel) { lastLevel = sp.level; html += '<tr class="group"><th scope="row" colspan="5">' + (ECO_LEVEL[sp.level] || sp.level) + '</th></tr>'; }
    var by = Object.keys(sp.eatenBy || {}).sort(function (a, b) { return sp.eatenBy[b] - sp.eatenBy[a]; }).slice(0, 2).map(function (k) { return sp.eatenBy[k] + ' by ' + k; }).join(', ');
    html += '<tr><th scope="row">' + (emojiOK ? sp.emoji + ' ' : '') + sp.plural + (by ? '<span class="says">' + by + '</span>' : '') + '</th><td class="n">' + sp.count + ' / ' + sp.target + '</td><td class="n">' + sp.born + '</td><td class="n">' + sp.eaten + '</td><td class="n">' + (sp.caught || 0) + '</td></tr>';
  });
  html += '</tbody></table>';
  if (f) html += '<p class="note">The fisherman: ' + f.casts + ' casts with jellyfish for bait, ' + f.bites + ' bites, ' + f.hooked + ' landed and ' + f.escaped + ' got away fed. ' + f.bucket + ' in the bait bucket; now ' + f.state + '.</p>';
  if (r.log && r.log.length) html += '<h3>Observations, latest first</h3><ul class="lab-log">' + r.log.slice(-10).reverse().map(function (l) { return '<li><span class="when">' + fmtTime(l.t) + '</span> ' + l.text + '</li>'; }).join('') + '</ul>';
  return html;
}
// ----- crab portraits: a little drawn face per crab in the Ledger's crew table, wearing its mood -----
var PORTRAIT = 48;
function drawPortrait(c, cv) {
  var pc = cv.getContext('2d'), old = ctx, dpr = Math.min(2, window.devicePixelRatio || 1), s = 1.4, st = STYLE[c.role](), body = st[0], dark = st[1], f = face(c), by = 30, side, i, look = { x: c.dir * 0.6, y: 0.2 };
  if (cv.width !== PORTRAIT * dpr) { cv.width = PORTRAIT * dpr; cv.height = PORTRAIT * dpr; }
  ctx = pc; pc.setTransform(dpr, 0, 0, dpr, 0, 0); pc.clearRect(0, 0, PORTRAIT, PORTRAIT);
  pc.save(); pc.translate(PORTRAIT / 2, 0); pc.lineCap = 'round'; pc.lineJoin = 'round';
  if (f.tilt) { pc.translate(0, by); pc.rotate(f.tilt); pc.translate(0, -by); }
  for (side = -1; side <= 1; side += 2) {                     // claws at the sides, up for a cheer
    var ax = side * 15 * s, ay = by - (f.arms === 'up' || f.arms === 'pump' ? 12 : 2) * s;
    pc.strokeStyle = dark; pc.lineWidth = 2 * s; pc.beginPath(); pc.moveTo(side * 8 * s, by - 1 * s); pc.lineTo((side * 8 * s + ax) / 2 + side * 1.5 * s, Math.min(by - 6.5 * s, ay - 2 * s)); pc.lineTo(ax, ay); pc.stroke();
    pc.fillStyle = c.role === 'smelt' ? pal.lava : body; pc.beginPath(); pc.arc(ax, ay, 2.6 * s, 0, TAU); pc.fill();
    pc.strokeStyle = dark; pc.lineWidth = 1 * s; pc.beginPath(); pc.moveTo(ax, ay); pc.lineTo(ax + side * 2.6 * s, ay + 1.2 * s); pc.stroke();
  }
  pc.fillStyle = body; pc.beginPath(); pc.ellipse(0, by, 11 * s, 6.6 * s, 0, 0, TAU); pc.fill(); pc.strokeStyle = dark; pc.lineWidth = 1; pc.stroke();   // the shell
  pc.fillStyle = '#fff'; pc.globalAlpha = 0.22; pc.beginPath(); pc.ellipse(-2 * s, by - 2.6 * s, 6 * s, 1.9 * s, -0.12, 0, TAU); pc.fill(); pc.globalAlpha = 1;
  drawRoleMark(c.role, s, by, dark);
  if (f.mouth === 'open' || f.mouth === 'grin' || f.eye === 'happy') {
    pc.fillStyle = pal.tongue; pc.globalAlpha = 0.35; pc.beginPath(); pc.ellipse(-6 * s, by + 0.8 * s, 1.8 * s, 1 * s, 0, 0, TAU); pc.ellipse(6 * s, by + 0.8 * s, 1.8 * s, 1 * s, 0, 0, TAU); pc.fill(); pc.globalAlpha = 1;
  }
  for (i = 0; i < c.stars; i++) star((i - (c.stars - 1) / 2) * 4.6 * s, by + 3 * s, 1.9 * s, pal.ingot, dark);
  if (c.role === 'repair') { pc.fillStyle = pal.hat; pc.beginPath(); pc.ellipse(0, by - 5.2 * s, 7.5 * s, 4.8 * s, 0, Math.PI, TAU); pc.fill(); pc.fillRect(-9 * s, by - 5.6 * s, 18 * s, 1.6 * s); }
  else if (c.role === 'mech') { pc.fillStyle = dark; pc.beginPath(); pc.ellipse(0, by - 5 * s, 7 * s, 4.2 * s, 0, Math.PI, TAU); pc.fill(); pc.fillStyle = pal.lavaHot; pc.beginPath(); pc.arc(0, by - 8.4 * s, 1.4 * s, 0, TAU); pc.fill(); }
  if (c.apprentice) {                                          // the paper cap
    pc.fillStyle = pal.warn; pc.beginPath(); pc.moveTo(-7.5 * s, by - 6 * s); pc.lineTo(-3 * s, by - 15 * s); pc.lineTo(1.5 * s, by - 6 * s); pc.closePath(); pc.fill(); pc.strokeStyle = dark; pc.lineWidth = 0.8 * s; pc.stroke();
    pc.fillStyle = pal.paper; pc.beginPath(); pc.arc(-3 * s, by - 15.2 * s, 1.6 * s, 0, TAU); pc.fill();
  }
  for (side = -1; side <= 1; side += 2) {                     // eyes on stalks, with the mood's expression
    var ex = side * 4.4 * s, ey = by - (c.role === 'repair' || c.role === 'mech' ? 13 : 11) * s;
    if (f.eye === 'wide') ey -= 1.5 * s;
    pc.strokeStyle = dark; pc.lineWidth = 1.1 * s; pc.beginPath(); pc.moveTo(side * 3.6 * s, by - 4.5 * s); pc.lineTo(ex, ey + 1.5 * s); pc.stroke();
    drawEye(ex, ey, s, f, look, c, side);
    if (f.brows || f.eye === 'angry') { pc.strokeStyle = pal.pupil; pc.lineWidth = 0.9 * s; pc.beginPath(); pc.moveTo(ex - side * 2.6 * s, ey - 3.6 * s); pc.lineTo(ex + side * 1.6 * s, ey - 2.4 * s); pc.stroke(); }
  }
  drawMouth(by + 1.4 * s, s, f, dark);
  if (f.sweat) { pc.fillStyle = pal.sweat; pc.beginPath(); pc.moveTo(9 * s, by - 10 * s); pc.quadraticCurveTo(10.6 * s, by - 7.6 * s, 9 * s, by - 6.4 * s); pc.quadraticCurveTo(7.4 * s, by - 7.6 * s, 9 * s, by - 10 * s); pc.fill(); }
  if (f.glyph === 'z') { pc.fillStyle = pal.ink || pal.pupil; pc.font = '700 ' + Math.round(7 * s) + 'px ' + cssFont; pc.textAlign = 'center'; pc.fillText('z', 12 * s, by - 12 * s); }
  pc.restore(); ctx = old;
}
function drawPortraits() {
  var cvs = ui.ledger.querySelectorAll('canvas[data-portrait]'), byId = {}, i, c;
  for (i = 0; i < S.crabs.length; i++) byId[S.crabs[i].id] = S.crabs[i];
  for (i = 0; i < cvs.length; i++) { c = byId[cvs[i].getAttribute('data-portrait')]; if (c) drawPortrait(c, cvs[i]); }
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
    '<tr><th scope="row">Of them fine ingots, at half as much again</th><td class="n">' + r.fineSold.toFixed(1) + '</td><td class="n">+' + money(r.fineCredits) + ' extra</td></tr>' +
    '<tr><th scope="row">Ingots spent on repairs</th><td class="n">' + r.metalUsed.toFixed(1) + '</td><td class="n">' + (lost ? '−' : '') + money(lost) + '</td></tr>' +
    '<tr class="total"><td>Metal that reached the surface</td><td></td><td class="n">' + share + '%</td></tr>' +
    '</tbody></table>' +
    '<p class="note">Earned in total: ' + money(S.earned) + ' · spent on crabs and upgrades: ' + money(S.stat.spent) + ' · repairs: ' + S.stat.repairs + ' · crab time ' + fmtTime(S.t) + '</p>';
  html += '<p class="share-row"><button type="button" class="mini wide" data-share>Copy a summary of this run</button></p>' + ledgerCharts() + ledgerTotals() + ledgerTalk() + ledgerLab();
  var achs = sim.achievements(), won = achs.filter(function (x) { return S.ach[x.id]; }).length;
  html += '<h3>Achievements: ' + won + ' of ' + achs.length + '</h3><table class="ltable ach"><tbody>' + achs.map(function (x) {
    var at = S.ach[x.id];
    return '<tr' + (at ? '' : ' class="unheard"') + '><th scope="row">' + (at ? '🏆 ' : '○ ') + x.name + '<span class="says">' + x.what + '</span></th><td class="n">' + (at ? 'won at ' + fmtTime(at) : 'not yet') + '</td></tr>';
  }).join('') + '</tbody></table>';
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
    '<tr><th scope="row">Plankton light</th><td class="n">' + Math.round(S.stat.glowLit) + ' s of tired crabs working at full speed at night</td></tr>' +
    '<tr><th scope="row">Wear</th><td class="n">average ' + Math.round(sim.avgWear()) + ' s without rest (trouble starts at ' + K.WEAR_FREE + ')</td></tr>' +
    '<tr><th scope="row">Thermal vent</th><td class="n">' + r.rides.toFixed(1) + ' rides a minute</td></tr>' +
    '<tr><th scope="row">Lighthouse lamp</th><td class="n">' + (S.lv.lamp ? 'lights ' + sim.up('lamp') + ' units; ' + Math.round(S.stat.lampLit) + ' s of tired crabs working at full speed in its light' : 'not built (Build tab)') + '</td></tr>' +
    '<tr><th scope="row">Apprentices</th><td class="n">' + S.stat.apprentices + ' hired, ' + S.stat.graduates + ' graduated, ' + S.crabs.filter(function (c2) { return c2.apprentice; }).length + ' learning now</td></tr>' +
    '<tr><th scope="row">Ore conveyor</th><td class="n">' + (S.lv.belt ? S.stat.belted + ' nodules ridden to the pile, ' + S.belt.length + ' on the belt now' : 'not built (Build tab)') + '</td></tr>' +
    '<tr><th scope="row">Charging pad</th><td class="n">' + (S.lv.pad ? S.stat.padCharge.toFixed(1) + ' batteries\' worth given, ' + S.crabs.filter(function (c2) { return c2.onPad; }).length + ' crab' + (S.crabs.filter(function (c2) { return c2.onPad; }).length === 1 ? '' : 's') + ' on it now' : 'not built (Build tab)') + '</td></tr>' +
    '<tr><th scope="row">Second smelting rim</th><td class="n">' + (S.lv.rim ? S.stat.rim2 + ' smeltings at the lava pocket, ' + S.crabs.filter(function (c2) { return c2.role === 'smelt' && c2.rim === 2 && (c2.state === 'toLava' || c2.state === 'smelt'); }).length + ' smelter' + (S.crabs.filter(function (c2) { return c2.role === 'smelt' && c2.rim === 2 && (c2.state === 'toLava' || c2.state === 'smelt'); }).length === 1 ? '' : 's') + ' there now' : 'not built (Build tab)') + '</td></tr>' +
    '<tr><th scope="row">Annex</th><td class="n">' + (S.lv.annex ? S.stat.stacked2 + ' nodules stacked on the annex pile (' + S.ore2 + ' there now), ' + S.stat.bars2 + ' bars down the cableway, ' + S.crabs.filter(function (c2) { return c2.role === 'crush' && sim.yardOf(c2) === 2; }).length + ' crusher' + (S.crabs.filter(function (c2) { return c2.role === 'crush' && sim.yardOf(c2) === 2; }).length === 1 ? '' : 's') + ' at its yard' : S.lv.field < K.ANNEX_FIELD ? 'claim the middle dune, then build it (Build tab)' : 'not built (Build tab)') + '</td></tr>' +
    '<tr><th scope="row">Metal grades</th><td class="n">fine now: ' + S.oreFine + ' nodule' + (S.oreFine === 1 ? '' : 's') + ' on the pile, ' + S.barsFine + ' bar' + (S.barsFine === 1 ? '' : 's') + ', ' + S.stockFine + ' ingot' + (S.stockFine === 1 ? '' : 's') + ' on the shelf · ' + S.stat.fineIngots + ' fine ingots smelted, ' + S.stat.fineSold + ' sold for ' + money(S.stat.fineCredits) + ' extra (deposits of richness ' + K.FINE_Q + ' and up)</td></tr>' +
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
    html += '<tr><th scope="row"><canvas class="portrait" data-portrait="' + cr2.id + '" width="96" height="96" aria-hidden="true"></canvas>' + cr2.name + (cr2.stars ? ' <span class="vet" aria-label="' + cr2.stars + ' star' + (cr2.stars === 1 ? '' : 's') + '">' + '★'.repeat(cr2.stars) + '</span>' : '') + '</th><td>' + (cr2.apprentice ? 'apprentice ' : '') + ROLE_NOUN[cr2.role] + '</td><td class="note">' + recText(cr2) +
      (nextAt ? ' (next star at ' + nextAt + ')' : '') + '</td></tr>';
  });
  var nHappy = 0, nGrumpy = 0, moodSum = 0;
  S.crabs.forEach(function (c2) { moodSum += c2.mood; if (c2.moodZone === 'happy') nHappy++; else if (c2.moodZone === 'grumpy') nGrumpy++; });
  html += '</tbody></table><p class="note">' + (crew.length > shown.length ? 'And ' + (crew.length - shown.length) + ' more. ' : '') + 'Each star makes a crab ' + Math.round(K.VET_BONUS * 100) + '% faster at its own job. Retiring takes the newest crab of a kind, so veterans stay.</p>';
  html += '<h3>Moods</h3><table class="ltable"><tbody>' +
    '<tr><th scope="row">The crew now</th><td class="n">' + nHappy + ' happy, ' + nGrumpy + ' grumpy, ' + (S.crabs.length - nHappy - nGrumpy) + ' content; average ' + (S.crabs.length ? Math.round(moodSum / S.crabs.length * 100) : 0) + '%</td></tr>' +
    '<tr><th scope="row">Whole game</th><td class="n">' + fmtTime(S.stat.happyTime) + ' of crab time happy, ' + fmtTime(S.stat.grumpyTime) + ' grumpy; ' + S.stat.happy + ' good moods and ' + S.stat.grumpy + ' bad ones begun</td></tr>' +
    '</tbody></table><p class="note">Dancing, rest, a dance nearby, fresh mornings, decorations and festivals lift a mood; breakdowns, dry holes, lost legs, flat batteries, long wear and tired nights drag it. A happy crab (75% up) dances with friends from further off; a grumpy one (25% down) sulks and works 5% slower.</p>';
  html += '<h3>The sea</h3><table class="ltable"><tbody>' +
    '<tr><th scope="row">Tide</th><td class="n">' + (S.tide > 0.75 ? 'high: washing nodules up' : S.tide < -0.75 ? 'low: burying idle flags' : S.tide > 0 ? 'rising' : 'falling') + '</td></tr>' +
    '<tr><th scope="row">Washed up / buried</th><td class="n">' + S.stat.washed + ' nodules / ' + S.stat.buried + ' flags</td></tr>' +
    '<tr><th scope="row">Moray eel</th><td class="n">' + S.stat.eels + ' times out, ' + S.stat.eelSnaps + ' snaps, ' + S.stat.eelDropped + ' nodules dropped, ' + S.stat.eelShooed + ' shooed' + (S.eel.out ? ' (it is out now)' : '') + '</td></tr>' +
    '<tr><th scope="row">Octopus</th><td class="n">' + S.stat.octopi + ' visits, ' + S.stat.stolen + ' nodules stolen, ' + S.stat.shooed + ' shooed' + (S.octo ? ' (one is here now)' : '') + '</td></tr>' +
    '<tr><th scope="row">Weather</th><td class="n">' + S.stat.storms + ' storms, ' + S.stat.surges + ' lava surges' + (S.storm ? ' (storm now)' : S.lavaSurge ? ' (surge now)' : '') + '</td></tr>' +
    '<tr><th scope="row">Trader</th><td class="n">' + S.stat.trades + ' swaps; spares: ' + S.spares.bit + ' bits, ' + S.spares.leg + ' legs' + (S.trader ? ' (in town now)' : '') + '</td></tr>' +
    '<tr><th scope="row">Sea turtle</th><td class="n">' + S.stat.turtleRides + ' rides given</td></tr>' +
    '<tr><th scope="row">Manta ray</th><td class="n">' + S.stat.mantaRides + ' crabs swept along' + (S.manta ? ' (gliding over now)' : '') + '</td></tr>' +
    '<tr><th scope="row">Den</th><td class="n">' + S.decor.length + ' of ' + sim.decorMax() + ' decorations' + (S.pets.length ? ' · pets: ' + S.pets.map(function (p) { return p.name + ' the ' + PET_NAMES[p.kind]; }).join(', ') : '') + '</td></tr>' +
    '<tr><th scope="row">Ship orders</th><td class="n">' + S.stat.ordersFilled + ' of ' + S.stat.orders + ' filled, ' + money(S.stat.orderCredits) + ' in premiums and bonuses, reputation ' + '★'.repeat(S.rep) + '☆'.repeat(K.REP_MAX - S.rep) + '</td></tr>' +
    '<tr><th scope="row">Rival crew 🦞</th><td class="n">' + (S.rival ? 'races won ' + S.rival.lost + ', lost ' + S.rival.won + ' · they are pushing at ' + Math.round(S.rival.drive * 100) + '%' : 'arrives at ' + K.RANKS[K.RIVAL_RANK][1]) + '</td></tr>' +
    '<tr><th scope="row">Pearls</th><td class="n">' + S.stat.pearls + ' found, ' + money(S.stat.pearlCredits) + '</td></tr>' +
    '<tr><th scope="row">Sunken chests</th><td class="n">' + S.stat.chests + ' opened, ' + money(S.stat.chestCredits) + '</td></tr>' +
    '<tr><th scope="row">Wrecks</th><td class="n">' + S.stat.wrecks + ' settled, ' + S.stat.wrecksStripped + ' stripped bare, ' + S.stat.wreckBars + ' bars salvaged' + (S.wreck ? ' (one on the back dune now, ' + S.wreck.left + ' plates left)' : '') + '</td></tr>' +
    '<tr><th scope="row">Night market</th><td class="n">' + S.stat.markets + ' held, ' + S.stat.marketTrades + ' swaps' + (S.trader && S.trader.market ? ' (open now)' : '') + '</td></tr>' +
    '<tr><th scope="row">Earthquakes</th><td class="n">' + S.stat.quakes + ', burying ' + S.stat.quakeBuried + ' nodules and ' + S.stat.quakeFlags + ' flags' + (S.quake ? ' (shaking now!)' : '') + '</td></tr>' +
    '<tr><th scope="row">Surface news</th><td class="n">' + S.stat.news + ' headlines, ' + (S.stat.newsCredits < 0 ? '−' : '+') + money(Math.abs(S.stat.newsCredits)) + ' from booms and gluts' + (S.news ? ' (' + S.news.kind + ' now)' : '') + '</td></tr>' +
    '<tr><th scope="row">Contracts</th><td class="n">' + S.stat.contractsFilled + ' filled, ' + S.stat.contractsFailed + ' run out, ' + (S.stat.contracts - S.stat.contractsFilled - S.stat.contractsFailed - (S.contract ? 1 : 0)) + ' let lapse; ' + money(S.stat.contractCredits) + ' earned' + (S.contract ? (S.contract.state === 'offer' ? ' (one on offer now)' : ' (' + S.contract.got + ' of ' + S.contract.need + ' under way)') : '') + '</td></tr>' +
    '<tr><th scope="row">Hydrothermal chimney</th><td class="n">' + S.stat.chimneys + ' opened, ' + S.stat.chimneyRides + ' rides' + (S.chimney ? ' (open now at ' + S.chimney.x + ', ' + fmtTime(S.chimney.until - S.t) + ' left)' : '') + '</td></tr>' +
    '<tr><th scope="row">Kelp forest</th><td class="n">' + (S.lv.kelp ? S.stat.kelpFlags + ' deposits flagged in it (richer by 0.1, a nodule bigger)' : 'roped off; claim it in the Build tab') + '</td></tr>' +
    '<tr><th scope="row">Insurance</th><td class="n">' + (S.insured ? 'covered' : 'not covered') + ' · $' + S.stat.premiums + ' in premiums, $' + S.stat.payouts + ' paid out</td></tr>' +
    '<tr><th scope="row">The food web\'s bites</th><td class="n">the shark chased the octopus off ' + S.stat.sharkScares + ' time' + (S.stat.sharkScares === 1 ? '' : 's') + ', gulls snatched ' + S.stat.gullSnatched + ' nodule' + (S.stat.gullSnatched === 1 ? '' : 's') + ' on the crest</td></tr>' +
    '</tbody></table>';
  if (S.site > 1 || S.rank >= K.RANKS.length - 1) {
    html += '<h3>Career</h3><p class="note">' + (S.site > 1 ? 'Dig site ' + S.site + '. Before it: ' + S.career.sites + ' site' + (S.career.sites === 1 ? '' : 's') + ', ' + money(S.career.earned) + ' earned and ' + S.career.sold.toLocaleString('en-US') + ' ingots sold in ' + fmtTime(S.career.time) + ' of crab time. Carried over: ' +
      S.perks.map(function (p2) { return p2.kind === 'tech' ? TECH_INFO[p2.id].name : p2.kind === 'decor' ? p2.n + ' decorations' : p2.name + ' the ' + ROLE_NOUN[p2.role] + ' ' + '★'.repeat(p2.stars); }).join(', ') + '.' : 'Crab Tycoon on the first site.') +
      (S.rank >= K.RANKS.length - 1 ? ' <button type="button" class="mini wide" data-site>Start a new dig site…</button>' : '') + '</p>';
  }
  html += '<h3>Bonuses</h3><table class="ltable"><tbody>' +
    '<tr><th scope="row">Flow</th><td class="n">×' + sim.flowMult().toFixed(2) + ' on sales, ' + S.streak + ' in a row' + (S.festival ? ' (festival day: doubled)' : '') + '</td></tr>' +
    '<tr><th scope="row">Festival days</th><td class="n">' + S.stat.festivals + ' so far' + (S.festival ? ', today!' : '; the next is day ' + (Math.floor(S.day / K.FESTIVAL_EVERY) + 1) * K.FESTIVAL_EVERY) + '</td></tr>' +
    '<tr><th scope="row">Flow bonus earned</th><td class="n">' + money(r.flowBonus) + ' a minute, ' + money(S.stat.flowBonus) + ' in all</td></tr>' +
    '<tr><th scope="row">Overclock</th><td class="n">' + Math.floor(S.ocBank) + ' s banked' + (S.oc ? ', running now' : '') + '</td></tr>' +
    '</tbody></table><p class="note">A delivery within ' + K.FLOW_GAP + ' s of the last keeps the flow going: each one adds 2% to the price, up to 40%, and banks more overclock. Overclock makes the whole crew 50% faster, but they use more power and wear twice as fast.</p>';
  html += '<p class="note">Capacity is what each stage could deliver if nothing else held it back, measured from the simulation. The line can only go as fast as its slowest stage.</p>';
  ui.ledger.innerHTML = html;
  drawPortraits();
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
  return ['🦀 Crabminer, ' + (S.site > 1 ? 'dig site ' + S.site + ', ' : '') + 'day ' + S.day + ': ' + K.RANKS[S.rank][1],
    money(S.earned) + ' earned in ' + fmtTime(S.t) + ' of crab time',
    ranks.length ? 'Ranks: ' + ranks.join(' · ') : 'No rank-ups yet',
    'Crew of ' + S.crabs.length + ': ' + crew.join(', '),
    S.stat.sold.toLocaleString('en-US') + ' ingots delivered' + (S.stat.fineSold ? ' (' + S.stat.fineSold + ' fine)' : '') + ', best pace ' + bestRate.toFixed(1) + ' a minute, ' + S.stat.ordersFilled + ' of ' + S.stat.orders + ' ship orders, ' + S.stat.pearls + ' pearls' + (S.stat.chests ? ', ' + S.stat.chests + ' sunken chest' + (S.stat.chests === 1 ? '' : 's') : '') + ', ' + Object.keys(S.ach).length + ' of ' + sim.achievements().length + ' achievements',
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
  startTutorial();
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
  ui.winText.textContent = (S.site > 1 ? 'Dig site ' + S.site + ': you' : 'You') + ' earned ' + money(K.RANKS[K.RANKS.length - 1][0]) + ' in ' + fmtTime(secs) + ' of crab time, with ' + S.crabs.length + ' crabs and ' + S.stat.sold + ' ingot' + (S.stat.sold === 1 ? '' : 's') + ' sold. Your best time is ' + fmtTime(best) + '. Crab profit!';
  renderSiteOptions();
  ui.win.hidden = false;
  $('win-keep').focus();
}
function bestCrab() {                 // the crab worth carrying to a new site: most stars, then most jobs
  return S.crabs.slice().sort(function (a, b) { return b.stars - a.stars || b.rec.jobs - a.rec.jobs; })[0] || null;
}
function renderSiteOptions() {        // the new-site perks on the win card: one technology, the den's decorations, or the best crab
  var techs = Object.keys(K.TECH).filter(function (id) { return S.tech[id]; }), c = bestCrab();
  ui.siteTech.innerHTML = techs.length ? techs.map(function (id) { return '<option value="' + id + '">' + TECH_INFO[id].name + '</option>'; }).join('') : '<option value="">No technology researched</option>';
  ui.siteTech.disabled = ui.siteTechBtn.disabled = !techs.length;
  ui.siteDecorBtn.disabled = !S.decor.length;
  ui.siteDecorBtn.textContent = S.decor.length ? 'Keep the den\'s ' + S.decor.length + ' decoration' + (S.decor.length === 1 ? '' : 's') : 'No decorations to keep';
  ui.siteCrabBtn.disabled = !c;
  ui.siteCrabBtn.textContent = c ? 'Keep ' + c.name + ' the ' + ROLE_NOUN[c.role] + (c.stars ? ' ' + '★'.repeat(c.stars) : '') : 'No crab to keep';
}
function startSite(perk) {            // start a new dig site with the perk, and show it
  var r = sim.newSite(perk);
  if (r !== true) { toast('No new site yet', r === 'rank' ? 'Reach Crab Tycoon first.' : 'That perk is not available.'); return; }
  S = sim.state(); talkCount = {}; freshView(); selected = null;
  sim.drain().forEach(handle);
  ui.win.hidden = true;
  renderPanel(); renderHUD(); renderRoster(); if (!$('p-ledger').hidden) renderLedger();
  if (stage.scrollWidth > stage.clientWidth) stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * 0.55;
  saveGame();
}
function setSpeed(v) { speed = v; renderHUD(); }
function setSound(on) {               // the sound toggle in the top bar (N); remembered between visits
  sfx.set(on);
  ui.soundBtn.textContent = on ? '🔊' : '🔇'; ui.soundBtn.setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('crabminer-sound', on ? '1' : '0'); } catch (e) { /* storage may be unavailable */ }
}
// ----- the tutorial: a guided first few minutes, one step at a time in a card over the field -----
var TUT = [
  { text: 'Welcome, boss. Your crew is already mining. Open the Crew tab and hire a second smelter: bars are waiting for the lava.', done: function () { return sim.counts().smelt >= 2; } },
  { text: 'The advisor at the top of the Crew tab names the slowest stage. Hire what it asks for next.', done: function () { return S.crabs.length >= 11; } },
  { text: 'Every delivery banks overclock. When ⚡ Overclock shows 10 s or more, press it (or O) for a burst of speed.', done: function () { return S.oc || S.stat.sold >= 200; } },
  { text: 'Crabs that never rest wear out and break. Try A/B shifts in the Crew tab: everyone works the day, half sleep each night.', done: function () { return S.shift !== 'all'; } },
  { text: 'With $200 spare, claim the middle dune in the Build tab: richer, bigger deposits. Click a locked dune to jump there.', done: function () { return S.lv.field >= 2; } },
  { text: 'That is the loop: feed the slowest stage, keep every job covered on every shift, and let the crabs rest and dance. The Ledger tells the rest. Crab profit!', done: function () { return false; }, last: true }
];
var tut = { step: -1, until: 0 }, TUT_KEY = 'crabminer-tutorial';
function startTutorial() { tut.step = 0; tut.until = 0; renderTutorial(); }
function endTutorial(skipped) {
  tut.step = -1; ui.tutorial.hidden = true;
  try { localStorage.setItem(TUT_KEY, 'done'); } catch (e) { /* storage may be unavailable */ }
  if (!skipped) sfx.chime();
}
function renderTutorial() {
  var st = TUT[tut.step];
  ui.tutorial.hidden = tut.step < 0 || !started || !ui.intro.hidden;
  if (tut.step < 0) return;
  ui.tutStep.textContent = st.last ? 'Tutorial done' : 'Tutorial ' + (tut.step + 1) + ' of ' + (TUT.length - 1);
  ui.tutText.textContent = st.text;
  ui.tutSkip.textContent = st.last ? 'Close' : 'Skip the tutorial';
}
function updateTutorial() {           // a few times a second: move on when the step is done; the last card closes itself
  var st;
  if (tut.step < 0) return;
  st = TUT[tut.step];
  if (st.last) { if (tut.until && T > tut.until) endTutorial(false); return; }
  if (st.done()) { tut.step++; if (TUT[tut.step].last) tut.until = T + 12; sfx.coin(false); renderTutorial(); }
}
function setBig(on) {                 // big playfield: the stage fills the screen and the sand fills its lower half
  document.body.classList.toggle('big', on);
  ui.bigBtn.setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('crabminer-big', on ? '1' : '0'); } catch (e) { /* storage may be unavailable */ }
  measure(); draw();
  stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * (on ? 0.62 : 0.55);
}

function wire() {
  buildRoles();
  Array.prototype.forEach.call(document.querySelectorAll('[data-mark]'), function (el) { el.innerHTML = markSVG(el.getAttribute('data-mark')); });   // the intro's legend wears the marks too
  function onRoleClick(e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var r = b.closest('.role').getAttribute('data-role'), res;
    if (b.getAttribute('data-act') === 'hire' && !ui.appMode.checked) { res = sim.hire(r); if (res === true) toast('Hired a ' + NAMES[r].toLowerCase(), ROLE_INFO[r].replace(/^./, function (m) { return m.toUpperCase(); }) + '.'); }
    else if (b.getAttribute('data-act') === 'app' || b.getAttribute('data-act') === 'hire') sim.hire(r, true);   // the apprentice event raises its own toast
    else sim.retire(r);
    sim.drain().forEach(handle);
    renderPanel(); renderHUD();
  }
  ui.roles.addEventListener('click', onRoleClick);
  ui.aOcto.addEventListener('click', shoo);
  ui.aEel.addEventListener('click', function () { if (sim.shooEel()) { sim.drain().forEach(handle); renderHUD(); } });
  ui.aTrader.addEventListener('click', openShop);
  ui.aContract.addEventListener('click', openContract);
  ui.insureBtn.addEventListener('click', function () { var r = sim.setInsured(!S.insured); if (r === 'credits') toast('Not enough credits', 'The first premium is $' + K.INSURE_DAY + '.'); sim.drain().forEach(handle); renderPanel(); renderHUD(); });
  ui.soundBtn.addEventListener('click', function () { setSound(!sfx.isOn()); if (sfx.isOn()) sfx.coin(true); });
  ui.tutSkip.addEventListener('click', function () { endTutorial(true); });
  ui.tutorialBtn.addEventListener('click', function () { startTutorial(); closeIntro(); });
  document.addEventListener('click', function (e) { if (sfx.isOn() && e.target.closest && e.target.closest('button')) sfx.click(); });
  ui.contractAccept.addEventListener('click', function () { sim.acceptContract(); sim.drain().forEach(handle); renderPanel(); renderHUD(); });
  ui.contractDecline.addEventListener('click', function () { if (sim.declineContract()) toast('Contract declined', 'Nothing lost. Another will come along in a while.'); sim.drain().forEach(handle); renderPanel(); renderHUD(); });
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
      m = b.getAttribute('data-move'); to = +b.getAttribute('data-to'); var LM = K.ANNEX_BUILDINGS.indexOf(m) >= 0 ? S.layoutA : S.layout; dir = to > LM[m] ? 1 : -1;
      for (k in LM) if (LM[k] === to) here = k;
      if (sim.place(m, to)) toast('Moved the ' + BLD_NAMES[m].toLowerCase(), here ? 'It swapped places with the ' + BLD_NAMES[here].toLowerCase() + '.' : 'The crabs will find it there.');
      sim.drain();
    }
    renderPanel(); draw();
    // keep the focus on the same button, which the rebuilt list replaced
    var again = ui.layoutList.querySelector(m ? '[data-move="' + m + '"][data-to="' + ((K.ANNEX_BUILDINGS.indexOf(m) >= 0 ? S.layoutA : S.layout)[m] + dir) + '"]' : '[data-post="' + dir + '"]');
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
  ui.appMode.addEventListener('change', renderPanel);
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
    var res = sim.buy(id);
    if (res === true) toast('Built: ' + UP_INFO[id].name, UP_INFO[id].fx(K.UP[id].vals[S.lv[id]]) + '.');
    else if (res === 'locked') toast('Claim the middle dune first', 'The annex stands on the middle dune. Buy the Dune claims upgrade, then come back.');
    sim.drain().forEach(handle);
    renderPanel(); renderHUD();
  });
  ui.rMinus.addEventListener('click', function () { sim.setReserve(S.reserve - 1); renderHUD(); });
  ui.rPlus.addEventListener('click', function () { sim.setReserve(S.reserve + 1); renderHUD(); });
  ui.rfMinus.addEventListener('click', function () { sim.setReserveFine(S.reserveFine - 1); renderHUD(); });
  ui.rfPlus.addEventListener('click', function () { sim.setReserveFine(S.reserveFine + 1); renderHUD(); });
  ui.zoomIn.addEventListener('click', function () { setZoom(zoom * 1.25); });
  ui.zoomOut.addEventListener('click', function () { setZoom(zoom / 1.25); });
  ui.zoomFit.addEventListener('click', function () { setZoom(1); });
  ui.marks.addEventListener('change', function () { setMarks(ui.marks.value); });
  setMarks(markStyle);
  wireGestures();
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
  ui.siteTechBtn.addEventListener('click', function () { startSite({ kind: 'tech', id: ui.siteTech.value }); });
  ui.siteDecorBtn.addEventListener('click', function () { startSite({ kind: 'decor' }); });
  ui.siteCrabBtn.addEventListener('click', function () { var c = bestCrab(); if (c) startSite({ kind: 'crab', id: c.id }); });
  ui.ledger.addEventListener('click', function (e) {
    if (e.target.closest('[data-share]')) copySummary();
    if (e.target.closest('[data-site]')) { setSpeed(0); showWin(); }
  });
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
    else if (k === '+' || k === '=') setZoom(zoom * 1.25);
    else if (k === '-') setZoom(zoom / 1.25);
    else if (k === '0') setZoom(1);
    else if (k === 's') shoo();
    else if (k === 't') openShop();
    else if (k === 'c') openContract();
    else if (k === 'n') { setSound(!sfx.isOn()); if (sfx.isOn()) sfx.coin(true); }
    else if (k === 'm') { selectTab('t-build'); ui.arrangeBtn.click(); }
    else if (k === '[' || k === ']') {
      for (j = 0; j < list.length; j++) if (list[j].getAttribute('aria-selected') === 'true') break;
      selectTab(list[(j + (k === ']' ? 1 : list.length - 1)) % list.length].id);
    } else if (k === '?') { setSpeed(0); openIntro(); }
  });
  cv.addEventListener('click', function (e) {
    var rect = cv.getBoundingClientRect(), x = (e.clientX - rect.left) / Z, y = (e.clientY - rect.top) / Z, bestC, i, c, z;
    if (suppressClick) { suppressClick = false; return; }   // the end of a drag, a pinch or a long press is not a click
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
    if (S.eel.out) {                    // shoo the eel
      var eh = eelHead();
      if (Math.hypot(eh.x - x, eh.y - y) < 30 * CS || Math.hypot(eh.px - x, eh.gy - y) < 20 * CS) { sim.shooEel(); sim.drain().forEach(handle); return; }
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
      var hitA = -1;
      if (S.lv.annex) for (i = 0; i < K.ANNEX_PLOTS.length; i++) { pr = plotRectA(i); if (Math.abs(x - pr.x) <= pr.half && y >= pr.y0 - 40 * CS && y <= pr.y1 + 6) hitA = i; }
      for (i = 0; i < K.PLOTS.length; i++) { pr = plotRect(i); if (Math.abs(x - pr.x) <= pr.half && y >= pr.y0 - 50 * CS && y <= pr.y1 + 10) hit = i; }
      if (hit < 0 && hitA < 0) { pick = null; renderPanel(); return; }
      var onAnnex = hit < 0, LH = onAnnex ? S.layoutA : S.layout; if (onAnnex) hit = hitA;
      for (k2 in LH) if (LH[k2] === hit) here = k2;
      if (!pick) { pick = here; }
      else if ((K.ANNEX_BUILDINGS.indexOf(pick) >= 0) !== onAnnex) { toast('Not there', onAnnex ? 'Only the annex\'s own pile and yard can stand on the annex.' : 'The annex\'s pile and yard stay on the annex\'s plots.'); pick = null; }
      else { if (sim.place(pick, hit)) toast('Moved the ' + BLD_NAMES[pick].toLowerCase(), here ? 'It swapped places with the ' + BLD_NAMES[here].toLowerCase() + '.' : 'The crabs will find it there.'); pick = null; }
      sim.drain(); renderPanel(); draw();
      return;
    }
    bestC = crabAt(x, y);
    if (bestC) { selected = bestC; selectedUntil = T + 5; return; }
    for (z in lockHit) {
      c = lockHit[z];
      if ((z === 'kelp' || z >= sim.up('field')) && x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) {
        selectTab('t-build');
        var card = ui.cards.querySelector('[data-up="' + (z === 'kelp' ? 'kelp' : 'field') + '"]');
        card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
        card.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
    selected = null;
  });
}
function crabAt(x, y) {                // the crab under a point on the canvas (canvas units), or null
  var bestC = null, bd = 1e9, i, c, px, py, d;
  for (i = 0; i < S.crabs.length; i++) {
    c = S.crabs[i]; px = crabX(c); py = groundY(px, c.d) - 10 * scaleAt(c.d);
    if (c.alt > 0) { var ap = airPos(c); px = ap.x; py = ap.y; }
    d = Math.hypot(px - x, py - y);
    if (d < bd) { bd = d; bestC = c; }
  }
  return bestC && bd < 26 * CS ? bestC : null;
}
// ----- the field under the fingers: drag to pan, pinch to zoom, long-press a crab for its card -----
// The canvas takes every pointer itself (touch-action: none), so one finger pans the stage, two fingers pinch the
// zoom about their midpoint, and a finger held still on a crab opens its card and keeps it open. A mouse drags and
// Ctrl-scrolls the same way. A pointer that moved, or that long-pressed, swallows the click that follows it.
var zoom = 1, ZOOM_MAX = 2.5, suppressClick = false;
function setZoom(z, cx, cy) {          // zoom the field about a point of the stage's viewport (CSS px), or its middle
  z = clamp(z, 1, ZOOM_MAX);
  if (Math.abs(z - zoom) < 0.002) return;
  if (cx === undefined) { cx = stage.clientWidth / 2; cy = stage.clientHeight / 2; }
  var fx = (stage.scrollLeft + cx) / Math.max(1, stage.scrollWidth), fy = (stage.scrollTop + cy) / Math.max(1, stage.scrollHeight);   // the world point under the finger, as a share of the canvas
  zoom = z;
  stage.classList.toggle('zoomed', zoom > 1.002);
  measure();
  stage.scrollLeft = fx * stage.scrollWidth - cx;
  stage.scrollTop = fy * stage.scrollHeight - cy;
  if (ui.zoomLevel) { ui.zoomLevel.textContent = '×' + zoom.toFixed(zoom >= 2 ? 1 : 2).replace(/\.?0+$/, ''); ui.zoomOut.disabled = zoom <= 1.002; ui.zoomIn.disabled = zoom >= ZOOM_MAX - 0.002; ui.zoomFit.disabled = zoom <= 1.002; }
  if (!running) draw();
}
function wireGestures() {
  var ptrs = {}, g = null, pressTimer = 0, lastPinch = 0;
  function count() { return Object.keys(ptrs).length; }
  function two() { var k = Object.keys(ptrs); return [ptrs[k[0]], ptrs[k[1]]]; }
  function endPress() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = 0; } }
  function swallow() { suppressClick = true; setTimeout(function () { suppressClick = false; }, 400); }   // a touch drag raises no click at all
  cv.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    endPress();
    if (count() === 2) { var p = two(); g = { kind: 'pinch', d0: Math.max(10, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)), z0: zoom, moved: true }; }
    else if (count() === 1) {
      g = { kind: 'drag', moved: false, sl: stage.scrollLeft, st: stage.scrollTop };
      pressTimer = setTimeout(function () {                // a finger held still: the crab under it, card pinned open
        pressTimer = 0; if (!g || g.moved) return;
        var rect = cv.getBoundingClientRect(), c = crabAt((e.clientX - rect.left) / Z, (e.clientY - rect.top) / Z);
        g.pressed = true; swallow();
        if (c) { selected = c; selectedUntil = T + 20; if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) {} play(c, ['wave', 'salute'], 1); }
      }, 550);
    }
  });
  cv.addEventListener('pointermove', function (e) {
    var p = ptrs[e.pointerId], rect, q, d, mx, my;
    if (!p || !g) return;
    p.x = e.clientX; p.y = e.clientY;
    if (g.kind === 'pinch' && count() === 2) {
      q = two(); d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y); rect = stage.getBoundingClientRect();
      mx = (q[0].x + q[1].x) / 2 - rect.left; my = (q[0].y + q[1].y) / 2 - rect.top;
      if (performance.now() - lastPinch > 60) { lastPinch = performance.now(); setZoom(g.z0 * d / g.d0, mx, my); }   // re-measuring is the dear part: not on every event
    } else if (g.kind === 'drag') {
      var dx = p.x - p.x0, dy = p.y - p.y0;
      if (!g.moved && Math.hypot(dx, dy) > 6) { g.moved = true; endPress(); }
      if (g.moved) { stage.scrollLeft = g.sl - dx; if (stage.classList.contains('zoomed')) stage.scrollTop = g.st - dy; }
    }
  });
  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    endPress();
    if (g && (g.moved || g.pressed)) swallow();
    if (count() === 0) g = null;
    else if (count() === 1) { var k = Object.keys(ptrs)[0], p = ptrs[k]; p.x0 = p.x; p.y0 = p.y; g = { kind: 'drag', moved: true, sl: stage.scrollLeft, st: stage.scrollTop }; }   // one finger left after a pinch: it pans
  }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', function (e) {              // Ctrl (or ⌘) and the wheel: zoom about the cursor
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    var rect = stage.getBoundingClientRect();
    setZoom(zoom * Math.exp(-e.deltaY * 0.0025), e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });
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
  if (uiTick > 0.25) { uiTick = 0; renderHUD(); renderPanel(); renderRoster(); updateTutorial(); if (tut.step >= 0) ui.tutorial.hidden = !ui.intro.hidden; }
  sfx.step();
  if (ledgerTick > 1 && !$('p-ledger').hidden) { ledgerTick = 0; renderLedger(); }
  saveTick += dt;
  if (saveTick > 10) { saveTick = 0; saveGame(); }
  raf = requestAnimationFrame(frame);
}
function start() { if (running || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
function halt() { running = false; cancelAnimationFrame(raf); }
function onChange(mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); }

var resizeQueued = false;
if (ctx && typeof CrabSim === 'function') {   // the page has the stage: wire the window, then play
  window.addEventListener('resize', function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () { resizeQueued = false; measure(); draw(); });
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { halt(); saveGame(); } else start(); });
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

  window.crabminer = { sim: sim, state: function () { return S; }, view: function () { return { stormA: stormA, lavaA: lavaA, nightA: nightA, rain: rain.length, T: T, whale: !!whale, cargo: cargo.phase, selected: selected && selected.id, Z: Z, zoom: zoom, W: W, sound: sfx.isOn(), tutorial: tut.step }; }, setZoom: setZoom, at: function (c) { var px = crabX(c); return { x: px * Z, y: (groundY(px, c.d) - 10 * scaleAt(c.d)) * Z }; }, summary: runSummary, talk: function () { var o = {}; Object.keys(TALK).forEach(function (k) { o[k] = talkCount[k] || 0; }); return o; }, select: function (c) { selected = c; selectedUntil = T + 5; }, summonWhale: function () { whale = { x: W * 0.5, y: (surfH + base[0]) / 2, v: 50, id: ++whaleId, ph: 0 }; }, summonManta: function () { S.nextManta = S.t; }, quake: function () { S.nextQuake = S.t; }, news: function (k) { S.nextNews = S.t; if (k) { var i2 = K.NEWS_KINDS.indexOf(k); if (i2 >= 0) K.NEWS_KINDS.splice(0, K.NEWS_KINDS.length, k, k, k); } }, festival: function () { S.festival = true; S.decor.push({ kind: 'lanterns', at: S.t }); handle({ type: 'festival', a: S.day }); }, adopt: function (kind) { sim.adopt(kind, 'shop'); sim.drain().forEach(handle); }, chimney: function () { S.nextChimney = S.t; }, contract: function () { S.nextContract = S.t; }, wreck: function () { while (S.lv.field < 2) { S.credits += 1000; sim.buy('field'); } S.nextWreck = S.t; }, market: function () { S.trader = { x: K.TRADER_SPOT, d: 0.9, state: 'stay', offers: ['cake', 'bits', 'map', 'gear'], sold: {}, until: S.t + 120, market: true }; handle({ type: 'marketOpen', a: S.trader }); renderHUD(); renderPanel(); }, pool: function (v) { poolForce = v === undefined ? null : v; }, advance: function (secs) { var sp = speed, i; speed = 1; for (i = 0; i < Math.round(secs * 2); i++) update(0.5); speed = sp; }, apprentice: function (role) { S.credits += 200; sim.hire(role || 'haul', true); sim.drain().forEach(handle); }, eco: function () { return eco ? eco.report() : null; }, anims: ANIM_NAMES.length, drawMs: function (n) { var t = performance.now(), i; for (i = 0; i < (n || 20); i++) draw(); return (performance.now() - t) / (n || 20); } };   // for poking at the economy from the console
  try { best = parseFloat(localStorage.getItem('crabminer-best')) || null; } catch (e) { best = null; }
  readPalette();
  var bigPref = null;
  try { bigPref = localStorage.getItem('crabminer-big'); } catch (e) { /* storage may be unavailable */ }
  if (bigPref !== '0') { document.body.classList.add('big'); ui.bigBtn.setAttribute('aria-pressed', 'true'); }   // the big field is the default
  measure();
  wire();
  started = true;                       // straight into the game, the saved one if there is one; the ? button brings up the intro
  var resumed = loadGame(), tutDone = null, soundPref = null;
  if (!resumed) newGame();
  ui.intro.hidden = true;
  try { tutDone = localStorage.getItem(TUT_KEY); soundPref = localStorage.getItem('crabminer-sound'); } catch (e) { /* storage may be unavailable */ }
  if (resumed && tutDone !== 'done') startTutorial();   // a saved game that never finished the tutorial picks it up again
  if (soundPref === '1') setSound(true);
  renderPanel(); renderHUD();
  if (stage.scrollWidth > stage.clientWidth) stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * (document.body.classList.contains('big') ? 0.62 : 0.55);
  draw();
  start();
  if (resumed) toast('Welcome back to day ' + S.day + '.', 'Your crew kept your place: ' + money(S.credits) + ' in the bank. New game is under ?.');
  else toast('It\'s a Crab Mining Game.', 'Hire crabs, sell metal up the riser, and climb to Crab Tycoon. Press ? for how to play.');
}
