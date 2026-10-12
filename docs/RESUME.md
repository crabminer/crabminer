# Resume prompt

Paste this into a new session to pick up the work.

---

**Resume: Crabminer (`/home/user/code/crabminer`, remote `git@github.com:crabminer/crabminer.git`, live at crabminer.com via GitHub Pages)**

**What the game is.** Crabminer is a crab mining game: a small city builder on a layered
paper-dune sea floor: a static page (`index.html` plus `sim.js`, `eco.js`, `game.js` and `reader.js`) with no build step or dependencies. You run a
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
  lava. A crab whose own work is stuck lends a claw to another (holding a drill steady, carrying
  beside a hauler, running hand in hand with an energy bot), or else takes the hauling backup
  job; tired crabs dig themselves into the sand to sleep. Each kind walks at
  its own speed.
- **Metal grades:** deposits of richness 0.85 and up yield fine nodules; two press into a fine bar, which smelts into a
  fine ingot on its own shelf beside the stockpile, with its own reserve in the top bar, selling for half as much again.
  The forge, the trader and the octopus take plain metal first.
- **Progression:** upgrades (including a lighthouse lamp that lights the field's edge at night, a kelp forest claim at the
  field's left end with richer deposits and slow walking, an ore conveyor haulers drop onto, a charging pad, and a second
  smelting rim, a lava pocket nearer the plots that smelters and the forge spread over), 5 technologies unlocking 20 worker upgrades (including night
  scouting), movable building plots, apprentices: half-price crabs at half pace that graduate after a day, and after Crab Tycoon a
  new dig site with one perk carried over (a technology, the decorations or the best crab) and a career record.
- **Money and bonuses:** overclock and a flow bonus, a drifting market price with surface news
  (booms, gluts and rumours that move it for a minute), thirty-one achievements listed in the Ledger, cargo-ship
  orders with reputation stars, contracts from the surface (so many ingots in three days, accepted or let lapse,
  paying credits and a unique decoration), and insurance (a daily premium against what the octopus and the sea take). From Ingot Magnate a rival lobster crew behind the ridge
  races you for every order, with a rubber-band drive.
- **The sea:** tides (which also push the refuel post around), storms, earthquakes that bury a band of a dune and bare a rich patch elsewhere, lava surges, a hydrothermal chimney that opens behind the plots for two days as a second vent and extra heat, an octopus
  thief, a moray eel that snaps at haulers, pearl jackpots, the thermal vent ride, whales, the hermit-crab trader, the sea turtle, a manta ray that sweeps walking crabs along the back of the claim, sunken chests on the back dune,
  sea life in the deep shadows, a plankton cycle that glows at night after ship wakes and storms, and a closed
  food web (`eco.js`, view-only): shoals, shrimp, jellies and crawlers, their hunters, a shark or two, gulls on
  the ships, and a fisherman whose jellyfish bait feeds more fish than it catches, with a lab report in the Ledger. The web
  bites the game twice, through the sim's API: the shark chases the octopus off, and gulls snatch a nodule from a crab on the back dune's crest. Three patches of
  plankton drift over the sand with the tide; at night a tired crab inside one works at full speed.
- **Crabs:** names and personal records, veteran stars (up to three, +5% each at their own
  job), moods (happy crabs dance from further off, grumpy ones sulk and slow 5%), emoji crab-talk grammar, 119 animations (acrobatics, 30 dances for two, the claw-in-claw
  walk, bopping along to a dance nearby, which also sheds wear for everyone within 60 units),
  and a crab rave on rank-up. The crushing yard is a line of press stations, one a crusher, and
  haulers and smelters queue up to the piles in lines; the den is a big two-storey crab house, with
  pets (a sea slug and a baby octopus from ranks, a starfish and a snail from the trader) that idle
  crabs stop to pet. Every tenth day is a festival: a long rave at dawn, everyone fresh, the flow
  bonus doubled, bunting on the den and a string of lanterns for it.
- **Save and load:** the game saves itself to `localStorage` every 10 seconds and when the
  page hides, and a reload resumes it exactly (the seed is saved too). New game is under ?.
- **Interface:** a six-step tutorial on every new game, synthesised sound behind a toggle (off by default), starts straight into play on the big field, with a phone layout for small screens
  like the iPhone SE, and 4K screens at 100% scaling. Everything the field can be clicked for
  also has a button and a key: visitor buttons over the field, the crew by name, plots with
  ◀ ▶, and shortcuts listed in the intro. On touch screens the field pans by dragging, zooms by pinching (up to 2.5×,
  also + − 0 and Ctrl-wheel, and buttons in the View tab) and a long press on a crab pins its card. Every kind wears a
  mark on its shell as well as its colour (`tests/colour.js` is the colour-vision report). Sprites outside the visible
  band of the canvas are skipped. A read-aloud "Listen all" button lives in the intro. The paper below the
  game holds the rules and an economy review.

**Docs:** `docs/RULES.md` (full rules), `docs/ARCHITECTURE.md` (code organisation and data flow),
`docs/BACKLOG.md` (ideas not yet built), `docs/DNS.md`.

**How the code works:** `sim.js` (`CrabSim()`) is a deterministic, seeded simulation that
runs headless in Node. The view, `game.js`, reads its state and receives its events, and changes
the game only through its API. `eco.js` (`CrabEco()`) is the food web, view-only and driven by
`game.js`. `reader.js` reads the intro and the paper aloud. Before
committing a change:
1. `node tests/fuzz.js`, `node tests/save.js` and `node tests/eco.js` (random play with invariants; save round trips; the food web).
2. `node tests/browser.js` (headless Chromium: console errors, controls, gestures, reload, screenshots).
3. `node tests/balance.js` before and after any change to the economy, and compare; `node tests/colour.js` after any change to the role colours.
4. Update the game, `RULES.md`, `ARCHITECTURE.md` and the paper together.

The working style so far: commit locally, and push only when asked.

**What next** (from `docs/BACKLOG.md`; none is committed to):
1. **Engineering:** watch the GitHub Action runs (`.github/workflows/test.yml`); skip offscreen particles too.
2. **Game:** the backlog is nearly empty: more plots with a second ore pile is the one big item left, and the
   role marks could become an option. New charm ideas are welcome.
