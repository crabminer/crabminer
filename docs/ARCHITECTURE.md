# Crabminer: Technical Architecture

This document describes how the game is built: the files, the three scripts, every
system inside them, and how data moves between them. [RULES.md](RULES.md) gives the game
rules themselves.

- [1. Overview](#1-overview)
- [2. The page](#2-the-page)
- [3. Data flow at a glance](#3-data-flow-at-a-glance)
- [4. Script 1: the simulation (`CrabSim`)](#4-script-1-the-simulation-crabsim)
- [5. Script 2: the view and the controls](#5-script-2-the-view-and-the-controls)
- [6. Script 3: read aloud](#6-script-3-read-aloud)
- [7. Styling and layout](#7-styling-and-layout)
- [8. Determinism, testing, and balance work](#8-determinism-testing-and-balance-work)
- [9. How to extend the game](#9-how-to-extend-the-game)
- [10. Conventions and gotchas](#10-conventions-and-gotchas)

---

## 1. Overview

Crabminer is a static page with no build step and no dependencies: one HTML file and its three
scripts. GitHub Pages serves them from the `main` branch of `crabminer/crabminer` at crabminer.com.

```
crabminer/
├── index.html        the page: CSS, markup, and the paper
├── sim.js            Script 1: the simulation, CrabSim()
├── game.js           Script 2: drawing, animation, crab talk, and the controls
├── reader.js         Script 3: read aloud
├── CNAME             crabminer.com, for GitHub Pages
├── LICENSE
├── tests/            fuzzer, save check, balance runs, browser checks (section 8)
├── .github/workflows/test.yml   runs the tests on GitHub on every push
└── docs/
    ├── RULES.md          the rules
    ├── ARCHITECTURE.md   this file
    ├── BACKLOG.md        ideas not yet built
    ├── RESUME.md         a prompt for picking up the work in a new session
    └── DNS.md            registrar records for the custom domain
```

`index.html` has these parts, top to bottom. The scripts are plain `<script src>` tags at the
end of the body, so they run in order, and Script 2 finds `CrabSim` as a global.

| Part | What it holds |
| --- | --- |
| `<style>` | Design tokens (light and dark), layout, components, small-screen and print rules |
| Overlays | `#intro` (how to play, Start, Listen all) and `#win` (Crab Tycoon card) |
| `<section class="game">` | Top bar `.hud`, the stage `#stage` with the canvas `#scene`, toasts, the panel `.panel` with five tabs |
| `<div class="below">` | The paper `<main class="paper">`: the rules and economy review as an IEEE-style article |
| `sim.js` | **Script 1**: the simulation, `CrabSim()` |
| `game.js` | **Script 2**: drawing, animation, crab talk, and the controls |
| `reader.js` | **Script 3**: read aloud (speech synthesis over the intro and the paper) |

The guiding rule: **the simulation owns the game, the view only watches.** Script 1 knows
nothing about the DOM or canvas. Script 2 reads the simulation's state and events, draws
them, and changes the game only through the simulation's public functions.

## 2. The page

```
┌───────────────────────────── .game (100svh grid) ─────────────────────────────┐
│ .hud  credits · rank · shift clock · flow · order · ⚡ · price · stockpile · speed · Big field · ? │
├───────────────────────────────────────────────────────────────────────────────┤
│ #stage (scrolls sideways)                                                     │
│   .stage-inner  ┌ .rays (CSS light shafts)                                    │
│                 └ canvas#scene  ← everything in the sea is drawn here         │
│   .toasts (aria-live)                                                         │
│   .panel  tabs: Crew │ Build │ Tech │ Ledger │ View                           │
│     (side column, a floating sheet in big-field mode, a bottom sheet on phones)│
└───────────────────────────────────────────────────────────────────────────────┘
.below > main.paper   the article (read by Script 3)
```

The body class `big` switches big-field mode, which is the default. A width at or below
`30rem` switches the small-screen layout.

## 3. Data flow at a glance

```
          player input (buttons, keys, canvas clicks)
                           │  calls the public API only
                           ▼
 ┌──────────────── Script 1: CrabSim ────────────────┐
 │  K (constants, read-only)                         │
 │  S (all game state)  ◀── step() every 1/60 s ──┐  │
 │        │                                       │  │
 │        └── emit(type, a, b) → events[] ────────┘  │
 └──────────────┬────────────────────────┬───────────┘
   S, read-only │                        │ drain() → events
                ▼                        ▼
 ┌──────────────── Script 2: the view ───────────────┐
 │ frame(now) → update(dt):                          │
 │   acc += dt × speed; while acc ≥ STEP: sim.step() │
 │   sim.drain().forEach(handle)  → effects, faces,  │
 │                                  talk, toasts     │
 │   view-only state (particles, v* fields on crabs) │
 │ draw()          canvas, from S + view state       │
 │ renderHUD/Panel/Ledger/Workday  DOM, from S       │
 └───────────────────────────────────────────────────┘
```

- **Into the sim**, data goes only through API calls: `hire`, `retire`, `buy`, `research`,
  `upgradeWorker`, `place`, `placePost`, `setPostAuto`, `setReserve`, `setShift`,
  `setWork`, `setScoutsNight`, `overclock` and `shoo`.
- **Out of the sim**, data goes two ways:
  1. **State**: the view reads `sim.state()` (the object `S`) every frame. Helpers such as
     `rates()`, `capacity()`, `bottleneck()`, `coverage()`, `gaps()` and `shiftInfo()`
     compute derived values.
  2. **Events**: the sim pushes discrete happenings with `emit()`, and the view collects
     them once a frame with `drain()`. Events carry references to the objects involved, a
     crab or a flag, so the view can animate them in place.

## 4. Script 1: the simulation (`CrabSim`)

`CrabSim()` is a factory. It returns an object with the constants `K`, the state accessor
`state()`, `reset`, `step`, `drain` and the API. At the end of `sim.js`,
`if (typeof module !== 'undefined') module.exports = CrabSim;` makes the same code load in
Node for testing (section 8).

### 4.1 Constants: `K`

Every tunable number lives in `K`, grouped and commented: places on the track, plots,
speeds, task times, recipe and luck, breakdowns, wear, energy, the clock and workday
presets, overclock and flow, money, roles, hire prices, starting crew, dunes, upgrades
(`K.UP`), research (`K.TECH`), worker upgrades (`K.WUP`), ranks, and the sea, weather,
octopus, pearls, orders and den. Code reads `K` and never writes it. Balance tests
override fields on a fresh instance's `K` before `reset`, for example to switch a feature
off.

### 4.2 State: `S`

`reset(opts)` builds `S`. Options: `seed`, `crew`, `lv`, `wu`, `tech`, `layout`, `shift`, and
`credits`. All of the game lives in `S`:

| Group | Fields |
| --- | --- |
| Clock | `t` (seconds), `tick` (last whole second), `si` (current shift info: hour, day, night, period), `day` |
| Money | `credits`, `earned`, `price`, `walk` (price random walk), `liftT` (riser timer), `reserve`, `streak`, `lastSale`, `oc`, `ocBank`, `rank` |
| Stocks | `nodules[]` (on the sand), `flags[]`, `ore`, `bars`, `stock`, `heat` (engine store) |
| Crew | `crabs[]`, `nextId` |
| Progress | `lv{}` (upgrade levels), `tech{}`, `wu{}` (worker upgrades), `layout{}` (building → plot), `pos{}` (derived positions) |
| Workday | `shift` (pattern key), `work{start,len,count,rest,groups}`, `scoutsNight` |
| Power | `docks[]` (bots plugged in), `post{x,d,auto,carrier,moved,home,drift,warned}` |
| Sea | `tide`, `nextSurge`, `nextBury`, `octo`, `nextOcto`, `storm`, `stormAt`, `stormEnd`, `stormWarned`, `nextStormWash`, `nextStormBury`, `lavaSurge`, `lavaAt`, `lavaEnd`, `order{need, got, until, premium, rival, rivalRate}`, `nextOrder`, `rep` |
| Rival | `rival{since, drive, won, lost}`: `null` until Ingot Magnate; `won` and `lost` are the rival's races |
| Den | `decor[]`, `decorWork`, `decorTheme` |
| Visitors | `trader{x,d,state,offers,sold,until}`, `nextTrader`, `spares{bit,leg}`, `luckyPearls`, `turtle{x,d,dir,rider,turned}`, `nextTurtle` |
| Ledger | `stat{}` (running totals), `hist[]` (one snapshot a second, last ~5 minutes) |

**A crab** is a plain object:

| Group | Fields |
| --- | --- |
| Identity | `id`, `role`, `k` (number within its role; used for lanes and groups), `name` |
| Record | `rec{jobs, helped, rides, legs, dances, pearls}`, `stars` (0–3, veteran level) |
| Position | `x`, `d`, `dir`, `air` (vent ride: `{phase, x0, gx, gd, tx, td, used}`), `alt` (0–1 height on the ride) |
| Behaviour | `state` (state-machine node), `timer`, `target`, `tx`/`td`, `flag`, `nod` (hole being drilled), `load` (hauler), `bload` (backup job), `carry` (item in claws), `n` (bars carried) |
| Body | `bat`, `wear`, `bitOk`, `broken`, `limp`, `charges` |
| Claims | `claimedBy` (energy bot coming), `fixBy`, `mendBy` (repair and maintenance bots coming) |
| Rest | `lastRest`, `rested`, `fresh` (morning bonus seconds left), `dance` (partner) |
| Travel | `goal{x,d,t}` (where `moveTo` last headed; the turtle reads it), `turtle`, `ride` (lift in progress) |
| Per-step flags | `moving`, `working`, `floating` |

The view adds its own fields to crabs. Their names start with `v` (for example `vx`,
`vgait`, `vfall`), plus `anim` and `say`. The sim never reads them.

### 4.3 Randomness

`sr()` is a linear congruential generator seeded from `opts.seed` or `K.SEED`. All game
randomness goes through `sr()` and `srr(a, b)`. With the same seed and the same calls in the
same order, the run is identical. The view uses `Math.random()` only for decoration.

### 4.4 One step: `step()`

Every 1/60 s of crab time, in this order:

1. `t += dt`; `si = shiftInfo()`; the overclock bank counts down.
2. **For each crab:**
   1. Clear `moving`, `working` and `floating`; count down `fresh`.
   2. If it is asleep, recharge it, shed wear, mark it rested, and wake it if it is on duty.
      Then go to the next crab.
   3. If no fixer is holding it, run its **state machine**: its role's rule, or the backup
      job if `state` is one of `bseek`, `bpick`, `bhaul`, `bstack`.
   4. If a vent ride was dropped mid-air, keep floating and land.
   5. If it was active, add wear, drain the battery (by role, broken bit, overclock and
      night battery), and roll for a lost leg. If it was idle, shed idle wear.
3. `dance()`: pair idle neighbours, apply recharge and rest, and `craft()` den decorations
   from idle time.
4. `sea()` (tide, wash-ups, burials); `driftPost()`; `octopus()`; `turtle()`; `trader()`.
   Crabs riding the turtle skip their own rules for the step.
5. `morning()` when the day number changes (fresh starts, `dawn`).
6. The engine's store gains heat; `weather()` (storms, lava surges, ship orders).
7. `sell()`: the riser timer, flow streak, order premium and bonus, overclock banking,
   `ranks()`.
8. Once a second: `market()` (price) and `snapshot()` (into `hist`).

### 4.5 The role state machines

Each role is a function of the crab. It reads local facts, the piles, the flags and the
batteries, and moves between states. No crab knows the plan.

| Role | States (main loop) | Decision point (where it may sleep, or take the backup job) |
| --- | --- | --- |
| scout | `pick → go → scan → pick` (`rest`) | `pick` |
| drill | `pick → go → drill → pick` (`rest`) | `pick` (also when its bit is broken) |
| haul | `seek ⇄ pick → haul → stack → seek` | `seek`, empty-handed |
| crush | `home → wait → crush → hold → wait` | `wait` |
| smelt | `toBar → grab → toLava → smelt → toStock → drop → toBar` | `toBar`; backup at `grab` with no bars |
| energy | `idle → go → charge → idle`; `toEngine → queue → refill`; `toPost → dragPost` | `idle` |
| repair, mech (`fixer`) | `idle → toMat → fetch → (toForge → forge) → toJob → fix → idle` | `idle` |
| any (backup) | `bseek ⇄ bpick → bhaul → bstack → bseek → (end) resume` | the end returns to `RESUME[role]` |
| any | `sleep` | wakes to `RESUME[role]` |

The two repair roles share one machine, `fixer()`. It is driven by a descriptor in `FIX`
that gives the claim field, raw material, part, where to fetch, how to take, the
pocket-forge and quick-hands upgrade keys, and what fixing does.

### 4.6 Systems

**Movement.**
- `moveTo(c, x, d, speed)` steps toward a point. It applies `pace(c)` (battery, tiredness,
  overclock, morning bonus, night slowness), a limp, the dune-crest slowdown, and a storm.
- `spd(c)` is the walking speed for the crab's kind.
- `go()` wraps `moveTo` and decides whether to ride the thermal vent: walk to the vent,
  rise, then glide.

**Workday.**
- `hourAt`, `makeSi` and `shiftInfo` compute the clock and current period.
- `dutyAt(crab, si)` answers "is this crab on duty?" for every pattern. Workday patterns use
  `inPattern(P, group, hour)`.
- `coverage()` turns the pattern into rows of hours with crabs on duty per role.
- `gaps()` reports jobs missing while the line works.
- `offShift()` puts a crab to sleep at a decision point, after `release()`-ing its claims.

**Power.**
- Energy bots, the Stirling engine's `heat` store, two docks, and the refuel post.
- `postTarget()` is the middle of the crew; `postGoal()` is home if the post is pinned.
- `driftPost()` applies the tide's push; `slipped()` measures distance from home.
- `postWanted()` decides when a bot should fetch or move the post.

**Breakdowns and the forge.**
- Bit breaks happen in `drill()`, worn bots in `energy()`, and lost legs in `step()`.
- `needs(w, kind)` says what a crab needs fixed.
- `isHeld(w)` freezes a crab while it is being fixed.

**Names, records and veterans.**
- `newcomer(c)` gives a crab its name, an empty `rec` and no `stars`. `addCrab` calls it, and
  so does `load()` for crabs from saves made before names existed. The name is the first one
  in `K.CRAB_NAMES` not worn by a living crab, starting from a place set by the crab's `id`,
  so names use no randomness.
- `emit()` passes every event to `tally(type, a, b)`, which keeps the records. `JOB` maps
  each role to the events that count as its own job; the hauler's `stack` is its job, anyone
  else's `stack` is backup help. When `rec.jobs` reaches `K.VET_AT[role] × K.VET_LEVELS[stars]`,
  the crab gains a star and `veteran` is emitted.
- `pace(c)` adds `K.VET_BONUS` per star, except in the backup states. `capacity()` scales
  each role by `veterans(role)`, its average star bonus.

**Backup job.** `primaryReady(c)` says whether the crab's own job has work. `tryBackup(c)`
starts carrying nodules when it does not; `backupHaul(c)` runs the job, and `endBackup(c)`
resumes the role.

**Friends and the den.** `dance()` pairs idle neighbours. `craft(idle)` turns idle time into
`decor`, and `inspire(kind)` themes the next piece. `morning()` grants fresh starts.

**The sea.**
- `sea()` runs the tide's wash-ups and burials.
- `octopus()` runs the octopus: `come → grab → flee`, with `octoTarget()` and `crabNear()`.
- `shoo()` is the player chasing it off.
- `weather()` runs storms, lava surges and ship orders. It also brings in the rival crew at
  `K.RIVAL_RANK`, gives each new order a `rivalRate` (ingots a second, from `K.RIVAL_PACE` and
  `S.rival.drive`), and calls `rival(o)`. That advances `o.rival`, emits `rivalSell` for each
  whole ingot, and on reaching `need` takes the order away (`orderLost`, a reputation star
  lost, the drive eased by `K.RIVAL_EASE`). `sell()` raises the drive by `K.RIVAL_PUSH` when
  the player fills a raced order.
- `turtle()` runs the turtle: it chooses its side, looks ahead for the crab that would gain most from a lift, steers toward it, may turn back once, carries the crab to its goal, and leaves.
- `trader()` runs the trader: `come → stay → leave`, with three offers drawn from `K.TRADES`. `trade(id)` takes payment and delivers the good. The fixers check `S.spares` before fetching raw material, and `luckyPearls` overrides the pearl roll.

**Market and money.**
- `market()` sets the price.
- `sell()` runs the riser, flow, order and overclock bank.
- `ranks()` handles rank-ups and bonuses.

**Ledger.**
- `snapshot()` stores totals once a second. `rates(secs)` turns them into per-minute flows.
- `capacity()` estimates each stage's ingots a minute from measured per-crab constants
  (`PER`), duty share and upgrades.
- `bottleneck()` names the slowest stage or short overhead. The advisor and the automatic
  test player both use it.

### 4.7 Save and load

`save()` returns a plain, JSON-ready object `{v, seed, S}`: the save format version, the
random seed, and the whole of `S`. `load(data)` puts it back and returns `true`, or `'bad'`
and leaves the game untouched.

- **References.** `S` is a web of references (section 10, claims). `save()` walks it twice:
  the first pass counts how often each object is reached; the second writes each shared
  object once as `{$id: n, ...}` and every later meeting as `{$ref: n}`. A shared array
  becomes `{$id: n, $arr: [...]}`. `load()` reads the same order back, so every claim, dance
  partner, dock and rider points at the same crab again.
- **View fields.** Keys that start with `v`, plus `anim` and `say`, are left out (section 10).
  A new sim field must therefore not start with `v`: the veteran level was first called
  `vet`, and the round-trip test caught saves silently dropping it.
- **Determinism.** The seed is saved, so a loaded game plays on exactly as the original
  would have. The round-trip test checks this: it saves, loads into a second instance, plays
  both with the same actions, and compares their saves.
- **New fields.** `load()` starts from a fresh `reset()` and copies over any top-level field,
  upgrade level or stat the save lacks, so saves made before a field existed still load.
  Bump `SAVE_VERSION` when a change would make old saves load wrongly; old saves are then
  refused and a new game starts.
- **Size.** About 200 KB late in a game, most of it `hist`.

### 4.8 Events

`emit(type, a, b)` appends `{type, a, b}` to a queue. `drain()` returns the queue and empties
it. The view calls `drain()` once a frame and after every player action. Events are
notifications only: the sim never depends on anyone reading them.

| Area | Events |
| --- | --- |
| Crew | `join`, `leave`, `sleep`, `wake`, `backup`, `backupEnd`, `dance`, `morning`, `dawn`, `shiftMode`, `veteran` |
| Mining | `flag`, `miss`, `flagDone`, `strike`, `uncover`, `dry`, `pearl` |
| Line | `take`, `stack`, `feed`, `bar`, `grab`, `ingot`, `stock`, `sell`, `rank` |
| Power | `charge`, `plug`, `refill`, `postGrab`, `postMoved`, `postDrift` |
| Breakdowns | `bitBreak`, `ebotBreak`, `legOff`, `takeMat`, `forged`, `fixed` |
| Movement | `ride`, `land` |
| Bonuses | `ocStart`, `ocEnd`, `flowLost` |
| Building | `build`, `tech`, `wup`, `layout`, `decor` |
| Visitors | `traderArrive`, `traderOpen`, `traderLeave`, `trade`, `spareUsed`, `turtleArrive`, `turtleTurn`, `turtlePick`, `turtleDrop`, `turtleGone` |
| Sea | `surge`, `bury`, `stormWarn`, `stormStart`, `stormEnd`, `lavaStart`, `lavaEnd`, `octoArrive`, `octoScared`, `octoSteal`, `octoShoo`, `octoGone`, `orderStart`, `orderDone`, `orderFail`, `rivalArrive`, `rivalSell`, `orderLost` |

### 4.9 Public API

| Group | Functions |
| --- | --- |
| Lifecycle | `reset(opts)`, `step()`, `drain()`, `state()`, `save()`, `load(data)`, `K`, `FLOW` |
| Crew | `hire(role)`, `retire(role)`, `hireCost(role)`, `refund(role)`, `crewCap()`, `counts()` |
| Build | `buy(id)`, `upgradeCost(id)`, `up(id)`, `place(building, plot)`, `placePost(x, d)`, `setPostAuto(on)`, `postTarget()` |
| Research | `research(id)`, `upgradeWorker(id)`, `unlocked(role)`, `has(id)` |
| Workday | `setShift(key)`, `setWork(params)`, `setScoutsNight(on)`, `shiftInfo(t)`, `coverage()`, `gaps()`, `onDuty(crab)`, `dutyFor(role, k, hour, day)`, `pattern()`, `inPattern()`, `hourAt(t)` |
| Play | `setReserve(n)`, `overclock(on)`, `shoo()`, `trade(id)` |
| Read-outs | `rates(secs)`, `capacity()`, `bottleneck()`, `flowMult()`, `wearMult(c)`, `avgBattery()`, `avgWear()`, `oreCap()`, `barCap()`, `charges()`, `carry()`, `flagCap()`, `decorMax()`, `isHeld(c)`, `zoneOf(d)` |

Levers return `true` on success, or a reason string (`'credits'`, `'den'`, `'max'`, `'locked'`,
`'done'`). They emit events the view can react to.

## 5. Script 2: the view and the controls

Script 2 is one IIFE. It creates `sim = CrabSim()`, keeps `S = sim.state()`, and runs the
page.

### 5.1 The loop

```
frame(now)                       requestAnimationFrame
 ├─ dt = min(0.05, elapsed)      a long pause never jumps the game
 ├─ update(dt)
 │   ├─ acc += dt × speed; up to 30 × sim.step() per frame (fixed 1/60 s)
 │   ├─ sim.drain().forEach(handle)   events → effects, faces, talk, toasts
 │   ├─ per-crab view state: gait, hops, idle clocks, needs talk, replies
 │   └─ particles, flights, lifts, rain, bombs, ink, fish, whale, night and weather fades
 ├─ draw()                       if the stage is on screen
 ├─ every 0.25 s: renderHUD(), renderPanel()
 └─ every 1 s on the Ledger tab: renderLedger()
```

`speed` is 0 (paused), 1, 2 or 4. Because the sim steps in fixed increments, the outcome
does not depend on frame rate or speed.

### 5.2 Event handling: `handle(e)`

A `switch` on `e.type` turns each event into something visible:
- **Motion:** `fly()` sends a nodule, bar, ingot or pearl along an arc, for example from a
  crab's claw to its slot on the pile.
- **Particles:** `poof`, `spark`, `burst`, `ink`, `confetti`.
- **Poses and words:** `express()` and `play()` start a face or animation; `say()` starts
  an emoji sentence.
- **Text:** `toast()` shows a message card; `floater()` shows a rising "+$12".

Piles are drawn as `S.ore - incoming('ore')`, so a nodule in flight is not drawn twice.

### 5.3 Drawing: `draw()`

The canvas is drawn in painter's order:

1. Sea surface waves (tide and storm move them), fish, jellyfish, the cargo ship, the whale,
   and snow.
2. The far dune, then, for each dune k = 0, 1, 2 (back to front):
   1. The paper dune: a fill with a drop shadow, a paper-grain pattern, and a cut-edge
      highlight. Then the ripples, which move, so they are drawn live.
   2. On k = 0: weeds and the basalt ridge.
   3. On k = 2: the cavern and lava, the thermal vent, the riser and lifts, plot tiles and
      foundations, and the extension cord.
   4. A roped-off overlay if the dune is unclaimed.
   5. Everything standing on that dune, sorted by screen y: nodules, flags, crabs,
      buildings, the base, the post, the den, and debris.
   6. On k = 2: energy-bot cables and the octopus. The trader stands among the buildings on k = 2.
3. Tide currents, the whale's shadow, ink, rings and flights.
4. The sea turtle, then crabs in the air, riding the vent or the turtle.

**Cached paper sheets.** The four paper sheets (far, back, middle, front) only change with the
size or the palette, but their blurred shadows were most of a frame's cost without a GPU:
122 ms of drawing against 22 ms with the sheets switched off, in headless Chromium at
1280×800. `sheet()` draws each one once to its own canvas (`sheets[]`) and copies it in with
`drawImage`, which brought a frame to about 20 ms there, and from 870 to 60 ms at 2× pixel
density. A sheet only shows above the next sheet's crest, which is opaque below it, so each
canvas holds just that band: about 1.2 times one full canvas in all. `measure()` and
`readPalette()` empty `sheets[]`. The result matches drawing directly, pixel for pixel, on
the dunes.
5. Night shade with lamps, the storm overlay, lava glow, lava bombs, bubbles, particles, and
   floaters.

**Geometry.**
- `X(x)` maps track units to pixels; `Xinv` is the reverse.
- `groundY(px, d)` gives the sand's height. It is continuous across dune lips, with a small
  hump at each crest.
- `crabLayer(c)` draws a crab on the dune in front while it climbs a lip.
- `scaleAt(d)` sets perspective scale.
- `measure()` sizes the canvas. In big field and on small screens, the front dune fills the
  lower half and the world is wider than the screen, so it scrolls.
- A `ResizeObserver` re-measures whenever the stage changes size.

### 5.4 Crabs: faces, animations, talk

`drawCrab(c)` draws legs, tool, claws, gear, shell, eye stalks and mouth from a **pose**
returned by `face(c)`. `face` checks, in priority order:

1. falling in (a new hire), asleep, or riding the vent
2. the crab rave (rank-up), via `partyUntil`
3. a timed animation: `c.anim`, set by `play()`
4. a looping mood from `moodFor(c)`: a duet dance with its partner, dizzy, nodding off,
   struggling, thinking, determined, tired at night, worn, or the idle ladder, which gets
   sillier the longer it waits
5. a short expression: `c.vx`, set by `express()`
6. the face for the task at hand: tongue out drilling, gritted teeth crushing, sweat at the
   lava, and so on

**A pose** is a plain object with:
- `eye` and `mouth`: named styles
- `tilt`: rotation of the whole body
- `dx`, `dy`, `body`: offsets
- `arm`: claw positions `[lx, ly, rx, ry]` in shell units
- `legs`: `'tap'`, `'step'` or `'sit'`
- `prop`: a pebble, note, sparkle or bubbles
- `look`, `glyph`, `sweat`, `brows`

`ANIMS` holds the 52 animations as functions `(crab, seconds) → pose`. `DUETS` lists the
dances used by pairs.

**Crab talk.**
- `TALK` holds the phrases, and `say(c, text)` sets `c.say`.
- `needs(c)` asks for help when a crab is stuck. Helpers reply when they first pick a
  target.
- `emojiOK` tests whether the device draws emoji. If not, `spoken()` maps each emoji to a
  word (`WORDS`).

### 5.5 The controls

- **Top bar:** `renderHUD()` shows credits, rate, rank, the shift clock, flow, the open
  order, overclock, price, stockpile and reserve, and speed. It also sets the advisor text.
- **Panel:** `renderPanel()` covers:
  - Crew: hire and retire costs and state, the workday buttons, `renderWorkday()` (custom
    steppers, scouts toggle, 24-hour timeline from `sim.dutyFor`), and gaps
  - Build: upgrade cards, arrange note, post toggle, den decorations
  - Tech: research and worker-upgrade cards
- **Ledger:** `renderLedger()` builds tables from `rates()`, `capacity()`, `bottleneck()`,
  `coverage()` and `S.stat`, plus an SVG sparkline of the price. The crew table lists the
  twelve crabs with the most stars (then nearest their next star), using `recText(c)`.
- **Crab card:** clicking a crab shows `drawInfo()`: its name, kind and stars, `statusText(c)`,
  and `recText(c)`. `drawCrab` draws one small gold star per veteran level on the shell.
  The `veteran` event cheers the crab and its neighbours; a toast explains the first star of
  the game and announces every third star.
- **Rival crew:** the top bar's order item adds the rival's count and a thin red meter.
  `drawCargo()` draws the rival's dashed red line from behind the ridge (`rivalFoot()`) to
  the ship's stern, with `rivalLifts` (one per `rivalSell`) rising along it, and the
  rival's count on the ship's flag. A game loaded mid-order sails the ship back in.
- **Advisor:** `advice()` picks one message, in priority order:
  1. octopus
  2. trader open
  3. ship order (the rival is ahead, or what is left to send)
  4. storm, then lava surge
  5. night-scout tip
  6. repairs stuck
  7. coverage gap
  8. bottleneck
  9. wear and overclock hints
- **Input:** buttons call the sim API, then `sim.drain().forEach(handle)`, then re-render.
  Canvas clicks are handled in this order:
  1. the trader (opens its goods in the Build tab)
  2. shoo the octopus
  3. arrange mode: pick up and set down buildings or the post
  4. pick a crab to show its status
  5. a locked dune, which jumps to its upgrade
- **Keys:** Space (pause), O (overclock), B (big field), Escape (close the intro or leave
  arrange mode).
- **Storage:** `localStorage` keeps `crabminer-save` (the game, from `sim.save()`),
  `crabminer-best` (best Tycoon time), `crabminer-big` (layout), and
  `reader-rate`/`reader-voice` (read aloud). Every access is wrapped in `try`/`catch`.
- **Save and load:** `saveGame()` runs every 10 s of real time, when the page is hidden, on
  `pagehide`, and right after `newGame()`. At start-up `loadGame()` restores the save if
  `sim.load` accepts it; otherwise `newGame()` runs. Both call `freshView()`, which clears
  the view's flights, particles and debris. A loaded game that is already won does not show
  the win card again, and a toast welcomes the player back.
- **Debug:** `window.crabminer` exposes:
  - `sim` and `state()`
  - `view()`, read-only view values, including the selected crab's id and the zoom `Z`
  - `at(crab)`, where a crab is on the canvas in CSS pixels, for tests that click it
  - `select(crab)`, which opens a crab's card as a click would
  - `summonWhale()`

  It is for the console and for automated browser tests.

## 6. Script 3: read aloud

Script 3 is independent of the game. It collects readable blocks from `#intro` and the
paper (headings, paragraphs, list items, table rows, captions) and marks them with
`data-say`. It reads them with `speechSynthesis`, one utterance per sentence, highlighting
and scrolling as it goes.

- **Starting:** reading starts only from Listen all in the intro. When it reaches the paper
  it closes the intro.
- **Text clean-up:** `SAY` rewrites text for speech (Fig., Table numerals, °C, Node.js).
- **Voices:** voice scoring prefers natural and premium voices and falls back to a local
  voice if an online one fails.

## 7. Styling and layout

- **Design tokens.** All colours are CSS custom properties on `:root`, such as `--sea-*`,
  `--c-*` canvas colours, `--paper` and `--ink`.
  - They are defined three times: light, `prefers-color-scheme: dark` (unless
    `data-theme="light"`), and `[data-theme="dark"]`.
  - `readPalette()` copies the `--c-*` values into `pal` for the canvas, and re-reads them
    when the scheme or theme changes.
- **Layouts:**
  - Default (`body.big`): the stage fills the screen and the panel floats bottom-left.
  - Side panel: a grid of stage plus a 23rem column.
  - At or below `30rem` (phones, iPhone SE): a one-row, sideways-scrolling top bar, and a
    full-width bottom sheet (at most 46% of the screen) with the crew list first. The crew
    is a two-column grid with short names (`SHORT` in Script 2), so all eight kinds fit
    without scrolling; tap targets are about 26–28px. On an iPhone SE in Safari (about
    375×553 visible) the field gets roughly 250px.
  - At or above 200rem × 100rem (3200×1600 CSS pixels: a 4K or 5K screen at 100% scaling)
    the root font size doubles, so the page looks as it would at 200%. `measure()` reads the
    zoom as `Z` (root font size over 16px), lays the canvas out in units of `Z` pixels, and
    draws it with `Z` times the pixels; canvas clicks divide by `Z`. The browser checks cover
    4K at 100% and at 200%, including a click on a crab.
  - Buttons are compact everywhere: speed and hire buttons about 1.7rem high, tabs 2.15rem.
- **Reduced motion:** decorative particles, snow and rays are cut. The game itself still
  runs.
- **Print:** the game and overlays are hidden, and the paper prints in black on white.

## 8. Determinism, testing, and balance work

**Running the sim headless.** `sim.js` loads in Node as it is:

```sh
node -e '
const CrabSim = require("./sim.js");
const sim = CrabSim(); sim.reset({ seed: 7919, shift: "ab" });
for (let i = 0; i < 20 * 3600; i++) { sim.step(); sim.drain(); }
console.log(sim.state().stat.sold / 20, "ingots a minute");
'
```

**The tests.** They live in `tests/` and run with plain Node (version 22 or later, for the
built-in `WebSocket`), with nothing to install. Each exits non-zero on failure.

| Command | Time | What it does |
| --- | --- | --- |
| `node tests/fuzz.js [runs] [minutes]` | ~10 s | Twelve 20-minute games of random play, invariants checked every second |
| `node tests/save.js [runs] [minutes]` | ~5 s | Save and load round trips, bad saves, and older saves |
| `node tests/browser.js [shot dir]` | ~35 s | The page in headless Chromium at three sizes, with screenshots |
| `node tests/balance.js [seeds]` | ~80 s | A report, not a pass or fail: fixed crews and rank times |

`.github/workflows/test.yml` runs the fuzzer, the save check and the browser checks on every
push and pull request, and keeps the screenshots as a build artifact. `tests/lib.js` holds what
they share: loading the sim, stepping it, a seeded generator for the
player's choices (separate from the sim's own), and `act()`, one random player action.

- **Fuzzing.** Random hires, retirements, upgrades, research, building and post moves,
  workday and custom changes, scouts at night, reserve, overclock, shooing and trades, about
  five a minute. Odd runs start with 4,000 credits to reach big crews and upgrades. The
  invariants:
  - no negative stocks
  - no stale claims: `fixBy`, `mendBy`, `claimedBy`, flag `by`, nodule `by`
  - no ghost or overfull docks
  - post carrier valid, post in range
  - no two buildings on one plot
  - dance pairs symmetric
  - no sleeping in the air, no claims held while asleep
  - finite position, wear, battery and `bload`

  Checking every second matters: a stale claim often clears itself within a few seconds, and
  a check every 10 s missed a release bug planted on purpose. The fuzzer first corrupts a game
  in six ways and stops if the checker misses one.
- **Save.** Plays, saves through JSON into a second instance, and compares the two states
  field by field (a save that silently drops a field would otherwise round-trip cleanly). Then
  it plays both on with the same actions and compares their saves. It also feeds `load()`
  broken saves, which must be refused with the game untouched, and a save with fields
  missing, which must load with them at their defaults.
- **Balance runs.** Fixed crews from the paper across workday patterns, beside the paper's
  figures, and an automatic player that follows `bottleneck()` and `gaps()`, timed to each
  rank. Run it before and after a change to the economy. The automatic player is a rebuild,
  so its rank times are close to the paper's but not the same. Hill-climbing over crews and
  ablations that switch a feature off through `K` were one-off studies and are not checked in.
- **Browser checks.** Headless Chromium driven over the DevTools protocol at desktop, iPhone
  SE, and dark sizes. Each starts a new game from the ? menu, checks that the sim runs, that
  the page does not scroll sideways, that the hire buttons and tabs work, and that a reload
  resumes the game, and fails on any console error. Tests reach state through
  `window.crabminer`. It runs Chromium with `--disable-gpu --no-sandbox`, since in a VM the GPU
  process and the seccomp sandbox both crash it; it only opens the local page. Set `CHROME`
  to use another browser binary.

## 9. How to extend the game

- **A new constant:** add it to `K` with a comment, read it where needed, and update
  RULES.md.
- **A new event:**
  1. `emit('name', a, b)` in the sim.
  2. Add a `case` in `handle()` for visuals and talk.
  3. List it in section 4.8.
- **A new upgrade:**
  1. Add it to `K.UP` with costs and values.
  2. Read it with `up(id)`.
  3. Add a `UP_INFO` entry (name and effect text) in Script 2.
  4. The Build card is generated.
- **A new worker upgrade:**
  1. Add it to `K.WUP` with a role and cost.
  2. Check it with `has(id)` where it takes effect.
  3. Add a `WUP_INFO` entry. The Tech card appears under the technology for its role.
- **A new role:**
  1. Add it to `K.ROLES`, `K.HIRE`, `K.SPEEDS`, `RESUME`, `RULES`, and `primaryReady()`.
  2. In Script 2, add it to `STYLE`, `NAMES`, `ROLE_INFO`, and `statusText()`, plus
     `--c-<role>` colours in all three token blocks.
  3. If its claims need releasing, extend `release()`.
- **A new animation:** add a function to `ANIMS` returning a pose, then call
  `play(crab, 'name')` from an event, or add it to the idle ladder in `moodFor()`.
- **A new phrase:** add it to `TALK`, and add any new emoji to `WORDS` for the fallback.

## 10. Conventions and gotchas

- **The sim never touches the DOM, and the view never writes `S`.** The one exception is
  test code in the console. View-only data on sim objects uses `v*` names, `anim` or `say`.
- **Units:**
  - Sim time is in seconds; `T` in Script 2 is view time.
  - Positions are track units (`x`) and depth fractions (`d`). Only `X()`, `groundY()` and
    `scaleAt()` convert to pixels.
- **Claims are references:** `n.by`, `f.by`, `w.claimedBy`, `w.fixBy`, `w.mendBy`,
  `S.post.carrier`, `S.docks`. Anything that removes a crab or changes its job must release
  them. That is what `release()` and `removeCrab()` do, and the fuzzer checks it.
- **Decision points:** sleeping and the backup job start only at a role's decision point, so
  crabs finish what they are holding.
- **Comments:** comments in Script 1 describe rules in plain words and sit next to the code
  that enforces them. When rules change, update the comment, RULES.md, and the paper
  together.
