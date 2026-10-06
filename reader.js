(function () {
  'use strict';
  var bar = document.getElementById('reader');
  if (!bar) return;
  var $ = function (id) { return document.getElementById(id); };
  var playBtn = $('rd-play'), playLabel = $('rd-play-label'), more = $('rd-more');
  var prevBtn = $('rd-prev'), nextBtn = $('rd-next'), stopBtn = $('rd-stop');
  var rateSel = $('rd-rate'), voiceSel = $('rd-voice'), statusEl = $('rd-status'), intro = $('intro');

  var synth = window.speechSynthesis, Utter = window.SpeechSynthesisUtterance;
  function status(msg) { statusEl.textContent = msg || ''; statusEl.hidden = !msg; }
  if (!synth || !Utter) {
    playBtn.disabled = true;
    status('Read-aloud is not available in this browser.');
    return;
  }

  function load(k, d) { try { var v = localStorage.getItem('reader-' + k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('reader-' + k, v); } catch (e) { /* storage may be unavailable */ } }

  // ----- what gets read, in document order -----
  // Reading starts only from Listen all in the intro: first the intro, then the paper.
  // Add data-nospeak to an element (or a parent) to keep it silent.
  // Add data-speak="..." to an element to say something other than what is written.
  var SELECTOR = '#intro h1, #intro .lede, #intro h2, #intro li, ' +
    '.paper .titleblock h1, .paper .titleblock .author, .paper .titleblock .affil, ' +
    '.paper h2, .paper h3, .paper p, .paper li, .paper blockquote, ' +
    '.paper caption, .paper tbody tr, .paper figcaption';
  var found = Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (el) {
    return !el.closest('[data-nospeak]');
  });
  var blocks = found.filter(function (el) { // keep the innermost block when two are nested
    return !found.some(function (other) { return other !== el && el.contains(other); });
  });
  blocks.forEach(function (el, i) { el.setAttribute('data-say', String(i)); });

  // ----- pronunciation: [pattern, spoken form]. Add your own terms here. -----
  var SAY = [
    [/\bFig\.\s*/g, 'Figure '],
    [/\bet al\./g, 'and colleagues'],
    [/\be\.g\.,?/g, 'for example,'],
    [/\bi\.e\.,?/g, 'that is,'],
    [/\bU\.S\./g, 'US'],
    [/\bIEEE\b/g, 'I triple E'],
    [/\s*°C/g, ' degrees Celsius'],
    [/(\d) s\b/g, '$1 seconds'],
    [/\bTable IV\b/g, 'Table 4'],
    [/\bTable III\b/g, 'Table 3'],
    [/\bTable II\b/g, 'Table 2'],
    [/\bTable I\b/g, 'Table 1'],
    [/\bNode\.js\b/g, 'Node J S']
  ];

  var ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
  function stop1(s) { s = s.trim(); return /[.!?]$/.test(s) ? s : s + '.'; }
  function clean(el) { // text of an element without citations, drawings, or silent parts
    var copy = el.cloneNode(true), drop = copy.querySelectorAll('.c, svg, [data-nospeak]'), i;
    for (i = 0; i < drop.length; i++) drop[i].parentNode.removeChild(drop[i]);
    return copy.textContent;
  }
  function rawText(el) {
    var custom = el.getAttribute('data-speak');
    if (custom) return custom;
    if (el.tagName === 'TR') { // read a table row cell by cell
      return Array.prototype.map.call(el.children, function (c) {
        return c.hasAttribute('data-nospeak') ? '' : clean(c).trim();
      }).filter(Boolean).map(stop1).join(' ');
    }
    var m, t = clean(el);
    if (el.tagName === 'H2') {
      m = /^\s*([IVX]+)\.\s+(.*)$/.exec(t);
      if (m && ROMAN[m[1]]) t = 'Section ' + ROMAN[m[1]] + '. ' + m[2];
    }
    if (/^(H[123]|LI|BLOCKQUOTE)$/.test(el.tagName) || el.classList.contains('author') || el.classList.contains('affil')) t = stop1(t);
    return t;
  }
  function normalize(t) {
    t = t.replace(/\s+/g, ' ').replace(/\u2011/g, '-').replace(/^ ?(Abstract|Index Terms)—/, '$1. ');
    SAY.forEach(function (pair) { t = t.replace(pair[0], pair[1]); });
    return t.replace(/(\d)–(\d)/g, '$1 to $2')
      .replace(/\s*—\s*/g, ', ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/,(\s*,)+/g, ',')
      .replace(/,\s*([.;:])/g, '$1')
      .trim();
  }
  // One utterance per sentence keeps start-up fast and avoids the long-utterance cut-off in some browsers.
  function sentences(t) {
    var out = [], start = 0, i, j, ch;
    for (i = 0; i < t.length; i++) {
      ch = t.charAt(i);
      if (ch === '.' || ch === '!' || ch === '?') {
        j = i + 1;
        while (j < t.length && /["”’')\]]/.test(t.charAt(j))) j++;
        if (j >= t.length || t.charAt(j) === ' ') { out.push(t.slice(start, j).trim()); start = j; i = j - 1; }
      }
    }
    if (start < t.length && t.slice(start).trim()) out.push(t.slice(start).trim());

    var merged = [], buf = '';
    out.forEach(function (s) {
      if (!buf) buf = s;
      else if (buf.length < 28 && buf.length + s.length < 200) buf += ' ' + s;
      else { merged.push(buf); buf = s; }
    });
    if (buf) merged.push(buf);

    var fin = [];
    merged.forEach(function (s) {
      while (s.length > 200) {
        var cut = s.lastIndexOf(', ', 190);
        if (cut < 70) cut = s.lastIndexOf(' ', 190);
        if (cut < 1) break;
        fin.push(s.slice(0, cut + 1).trim());
        s = s.slice(cut + 1).trim();
      }
      if (s) fin.push(s);
    });
    return fin;
  }

  // ----- voices: pick the best one the device offers -----
  var voices = [], voice = null;
  var NOVELTY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
  function score(v) {
    var n = v.name || '', l = (v.lang || '').replace('_', '-').toLowerCase(), s = 0;
    if (/natural|neural/i.test(n)) s += 50;
    if (/premium/i.test(n)) s += 45;
    if (/enhanced/i.test(n)) s += 40;
    if (/siri/i.test(n)) s += 38;
    if (/google/i.test(n)) s += 30;
    if (/\b(Samantha|Ava|Allison|Evan|Zoe|Nathan|Tom|Susan|Karen|Daniel|Serena|Moira|Tessa)\b/i.test(n)) s += 20;
    if (/espeak/i.test(n)) s -= 30;
    if (NOVELTY.test(n)) s -= 45;
    if (l === 'en-us') s += 8; else if (l === 'en-gb') s += 4;
    if (v.default) s += 3;
    return s;
  }
  function loadVoices() {
    var all = synth.getVoices() || [];
    if (!all.length) return;
    var en = all.filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ''); });
    voices = (en.length ? en : all).slice().sort(function (a, b) { return score(b) - score(a); }).slice(0, 14);
    var wanted = load('voice', ''), pick = voices[0];
    voiceSel.textContent = '';
    voices.forEach(function (v, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = v.name.replace(/^Microsoft\s+/, '').replace(/\s*-\s*English.*$/, '') + ' (' + (v.lang || '').replace('_', '-') + ')';
      voiceSel.appendChild(o);
      if (v.name === wanted) pick = v;
    });
    voice = pick;
    voiceSel.value = String(voices.indexOf(pick));
  }
  loadVoices();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
  else synth.onvoiceschanged = loadVoices;

  // ----- playback -----
  var state = 'idle', idx = -1, sidx = 0, queue = [], gen = 0, current = null, watch = 0, failures = 0;
  var rate = parseFloat(load('rate', '1')) || 1;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  rateSel.value = String(rate);
  if (rateSel.selectedIndex < 0) { rate = 1; rateSel.value = '1'; }

  function render() {
    var open = state !== 'idle';
    bar.classList.toggle('is-open', open);
    bar.classList.toggle('is-playing', state === 'playing');
    more.hidden = !open;
    var label = state === 'playing' ? 'Pause' : (state === 'paused' ? 'Resume' : 'Listen all');
    playLabel.textContent = label;
    playBtn.setAttribute('aria-label', label);
    playBtn.title = state === 'idle' ? 'Read the intro and the paper aloud' : label;
  }
  function mark(i) {
    var old = document.querySelector('[data-say].saying');
    if (old) old.classList.remove('saying');
    if (i < 0 || i >= blocks.length) return;
    var el = blocks[i], r = el.getBoundingClientRect();
    el.classList.add('saying');
    if (r.top < 70 || r.bottom > window.innerHeight - 40) {
      el.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
    }
  }
  function loadBlock(i) {
    idx = i; sidx = 0;
    if (!intro.hidden && !intro.contains(blocks[i])) intro.hidden = true;   // done with the intro: show the paper being read
    queue = sentences(normalize(rawText(blocks[i])));
    mark(i);
  }
  function speakNext() {
    if (state !== 'playing') return;
    while (sidx >= queue.length) {
      if (idx + 1 >= blocks.length) { finish(); return; }
      loadBlock(idx + 1);
    }
    var my = ++gen, started = false, u = new Utter(queue[sidx]);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-US'; }
    u.rate = rate;
    u.onstart = function () { if (my === gen) { started = true; failures = 0; status(''); } };
    u.onend = function () { if (my === gen) { sidx++; speakNext(); } };
    u.onerror = function (e) {
      if (my !== gen) return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      if (e && e.error === 'not-allowed') { state = 'paused'; render(); status('The browser blocked audio. Press Resume to try again.'); return; }
      // A real engine failure. Online voices can drop out, so fall back once to a voice stored on the device.
      failures++;
      var local = voices.filter(function (v) { return v.localService && v !== voice; })[0];
      if (failures === 1 && voice && voice.localService === false && local) {
        voice = local;
        voiceSel.value = String(voices.indexOf(local));
        speakNext();
        return;
      }
      state = 'paused'; halt(); render();
      status('The speech engine could not play this' + (e && e.error ? ' (' + e.error + ')' : '') + '. Pick another voice, then press Resume.');
    };
    current = u; // keep a reference so the utterance is not collected mid-speech
    synth.speak(u);
    clearTimeout(watch);
    watch = setTimeout(function () {
      if (my === gen && !started && state === 'playing') status('No sound yet. Check your volume, or pick another voice.');
    }, 4000);
  }
  // Start (or restart) speech at the current position.
  function kick() {
    gen++;
    if (synth.speaking || synth.pending) {
      synth.cancel();
      setTimeout(function () { if (state === 'playing') speakNext(); }, 90);
    } else {
      speakNext();
    }
  }
  function halt() { gen++; clearTimeout(watch); synth.cancel(); }
  function startAt(i) { state = 'playing'; failures = 0; status(''); loadBlock(i); render(); kick(); }
  function pause() { state = 'paused'; halt(); render(); }
  function resume() { state = 'playing'; failures = 0; status(''); render(); kick(); }
  function stop() { state = 'idle'; halt(); mark(-1); idx = -1; status(''); render(); }
  function finish() { state = 'idle'; halt(); mark(-1); idx = -1; render(); status('Finished.'); }

  // ----- controls -----
  playBtn.addEventListener('click', function () {
    if (state === 'idle') startAt(0);                    // Listen all: always from the top of the intro
    else if (state === 'playing') pause();
    else resume();
  });
  stopBtn.addEventListener('click', stop);
  nextBtn.addEventListener('click', function () {
    if (idx + 1 >= blocks.length) { finish(); return; }
    startAt(idx + 1);
  });
  prevBtn.addEventListener('click', function () { startAt(sidx > 0 ? idx : Math.max(0, idx - 1)); });
  rateSel.addEventListener('change', function () {
    rate = parseFloat(rateSel.value) || 1;
    save('rate', String(rate));
    if (state === 'playing') kick();
  });
  voiceSel.addEventListener('change', function () {
    voice = voices[parseInt(voiceSel.value, 10)] || voice;
    if (voice) save('voice', voice.name);
    if (state === 'playing') kick();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state !== 'idle') stop(); });
  window.addEventListener('pagehide', function () { synth.cancel(); });

  synth.cancel(); // clear anything left over from a previous visit
  render();
})();
