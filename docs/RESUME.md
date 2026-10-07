# Resume prompt

Paste this into a new session to pick up the work.

---

**Resume: Crabminer (`/home/user/code/crabminer`, remote `git@github.com:crabminer/crabminer.git`, live at crabminer.com via GitHub Pages)**

**What the game is.** Crabminer is a crab mining game: a small city builder on a layered
paper-dune sea floor: a static page (`index.html` plus `sim.js`, `game.js` and `reader.js`) with no build step or dependencies. You run a
crew of robot crabs that turns buried metal into money:
- Scouts flag deposits.
- Drills dig them up; holes can come up dry.
- Haulers carry the nodules to the ore pile.
- Crushers press two nodules into a bar.
- Smelters melt bars into ingots in a lava cave.
- A refined-metal stockpile feeds a riser that sells the ingots to a ship at the surface. Crab profit!

Upkeep crabs keep the line running:
- Energy bots recharge the crew from a Stirling engine by the lava, through a refuel post on an
  extension cord.
- Repair bots forge drill bits and energy cells from stockpile ingots.
- Maintenance bots forge legs from bars.

The goal is to climb six ranks by lifetime earnings, from Sand Scraper to Crab Tycoon (6,000
credits), as fast as you can. You get there by balancing the crew against the slowest stage of
the line, which the advisor and the Ledger tab point out.

**Systems already built:**
- **Workday and rest:** a 24-hour clock (night 20:00–06:00) with workday patterns: All hands,
  8-hour day, two 8-hour shifts, A/B, 3-shift relief, and Custom. Crabs work at half speed at
  night unless rested; scouts prefer the dark. Wear and rest, dancing neighbours, a morning bonus,
  and a den that fills with crab-made decorations.
- **Breakdowns:** broken bits, worn energy bots, and lost legs, all fixed by forging parts in the
  lava. Every crab takes a hauling backup job when its own work is stuck, and each kind walks at
  its own speed.
- **Progression:** upgrades, 5 technologies unlocking 20 worker upgrades (including night
  scouting), and movable building plots.
- **Money and bonuses:** overclock and a flow bonus, a drifting market price, and cargo-ship
  orders with reputation stars. From Ingot Magnate a rival lobster crew behind the ridge
  races you for every order, with a rubber-band drive.
- **The sea:** tides (which also push the refuel post around), storms, lava surges, an octopus
  thief, pearl jackpots, the thermal vent ride, whales, the hermit-crab trader, the sea turtle, sunken chests on the back dune,
  sea life in the deep shadows, and a plankton cycle that glows at night after ship wakes and storms. Three patches of
  plankton drift over the sand with the tide; at night a tired crab inside one works at full speed.
- **Crabs:** names and personal records, veteran stars (up to three, +5% each at their own
  job), emoji crab-talk grammar, 52 animations, and a crab rave on rank-up.
- **Save and load:** the game saves itself to `localStorage` every 10 seconds and when the
  page hides, and a reload resumes it exactly (the seed is saved too). New game is under ?.
- **Interface:** starts straight into play on the big field, with a phone layout for small screens
  like the iPhone SE, and 4K screens at 100% scaling. Everything the field can be clicked for
  also has a button and a key: visitor buttons over the field, the crew by name, plots with
  ◀ ▶, and shortcuts listed in the intro. A read-aloud "Listen all" button lives in the intro. The paper below the
  game holds the rules and an economy review.

**Docs:** `docs/RULES.md` (full rules), `docs/ARCHITECTURE.md` (code organisation and data flow),
`docs/BACKLOG.md` (ideas not yet built), `docs/DNS.md`.

**How the code works:** `sim.js` (`CrabSim()`) is a deterministic, seeded simulation that
runs headless in Node. The view, `game.js`, reads its state and receives its events, and changes
the game only through its API. `reader.js` reads the intro and the paper aloud. Before
committing a change:
1. `node tests/fuzz.js` and `node tests/save.js` (random play with invariants; save round trips).
2. `node tests/browser.js` (headless Chromium: console errors, controls, reload, screenshots).
3. `node tests/balance.js` before and after any change to the economy, and compare.
4. Update the game, `RULES.md`, `ARCHITECTURE.md` and the paper together.

The working style so far: commit locally, and push only when asked.

**What next** (from `docs/BACKLOG.md`; none is committed to):
1. **Engineering:** watch the first GitHub Action runs (`.github/workflows/test.yml`).
2. **Game:** pick from the backlog's visitors, crew, economy, buildings and interface ideas.
