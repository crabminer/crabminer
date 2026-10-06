# Crabminer: Backlog

Ideas not yet built, roughly grouped. Each has a one-line pitch and a sketch of how it would
fit the existing systems (see [ARCHITECTURE.md](ARCHITECTURE.md)). Nothing here is committed
to; move an item into the game, the rules and the paper together when it is built.

## Done (for reference)

These came from earlier rounds of ideas and are already in the game: tides and storms,
octopus, pearl jackpots, cargo-ship orders, den decorations, whale shadows, lava surges,
the hermit-crab trader, the sea turtle, save and load, named crabs with veteran stars, and the rival crew.

## Visitors and the sea

- **Bioluminescent plankton.** Drifting glow at night; crabs inside a patch work at full
  speed at night even if unrested. A `plankton[]` list in `S`, moved by the tide, checked
  in `nightSlow()`.
- **Sunken treasure chest.** Rarely a scan on the back dune finds a chest instead of a
  deposit; a drill opens it for a jackpot of credits plus a random trader good. Another
  branch in `scout()`, a chest flag kind in `drill()`.
- **Moray eel.** Lives in a crack in the basalt ridge; snaps at crabs that cross its patch,
  making them drop what they carry. Shooed like the octopus; a reason to route around it.
- **Manta-ray glide.** Like the vent, but a moving ride: a manta sweeps along the back dune
  and carries any crab under it a short way.
- **Kelp forest claim.** A fourth claimable area on the left that slows walking but grows
  kelp, a new material for den decorations or a "kelp rope" upgrade.
- **Earthquake / sand slide.** Rare event: one dune shifts, burying nodules and flags in a
  band and uncovering a fresh rich patch elsewhere.
- **Hydrothermal chimney.** A second, smaller vent that appears and fades over days; a
  temporary shortcut and a temporary heat source the engine can tap.

## Crew and characters

- **Crab festival day.** Every tenth day: a long rave at dawn, double flow bonus, and the
  den gets a festival decoration. Hook on `morning()` when `S.day % 10 === 0`.
- **Apprentices.** Cheap trainee crabs that work at half speed and become full crabs of
  their kind after a day. An early-game option when money is tight.
- **Moods.** A slow happiness value per crab from dancing, rest, decorations and
  breakdowns; happy crabs dance more, grumpy ones grumble and drop a little speed.
- **Crab pets.** A sea slug or a baby octopus that adopts the den; pure charm, earned from a
  rank or a trader good.

## Economy and progression

- **Contracts.** Longer goals beside ship orders: "deliver 200 ingots in three days" for a
  big reward and a unique decoration.
- **Metal grades.** Rich flags make "fine" ingots worth 50% more; the smelter keeps them on
  a separate shelf of the stockpile, and the reserve can be set per grade.
- **Market events.** News at the surface: a copper boom or a glut that moves the price for
  a minute, with a headline toast.
- **Prestige / new dig site.** After Crab Tycoon, start a new site with one permanent perk
  carried over (a tech, a decoration, a veteran crab). Replay value.
- **Achievements.** A short list (first pearl, ten turtle rides, a full den, an order at
  five stars, a night with no breakdowns) shown in the Ledger.
- **Insurance.** Pay credits up front to have storms and octopus losses refunded; an
  economic choice rather than a reflex.

## Buildings and layout

- **Second smelting rim.** A buildable lava rim further along the cavern so smelters do not
  queue; a plot-like slot on the cavern side.
- **Ore conveyor.** A built belt from the field edge to the ore pile that haulers drop onto
  instead of walking the last stretch.
- **More plots.** A den upgrade or claim that adds plots on the middle dune for a second
  ore pile near the deep deposits.
- **Charging pad.** A cheap building next to a busy spot where crabs top up themselves,
  slowly, without an energy bot.
- **Lighthouse lamp.** A building that lights the field at night; crabs near it are not
  slowed by the dark.

## Interface and accessibility

- **Tutorial.** A guided first five minutes: hire the second smelter, watch the advisor,
  try overclock.
- **Sound.** Soft clicks, bubbles, a crab-rave tune, the whale's song; muted by default,
  with a toggle.
- **Statistics charts.** Output and money over the whole game in the Ledger, not just the
  last minute.
- **Colour-blind check.** Run the role colours through a contrast and CVD validator and add
  a shape or letter to each crab's gear so roles are never told apart by colour alone.
- **Touch gestures.** Pinch to zoom the field on phones, drag to pan, long-press a crab for
  its card.
- **Share a run.** Copy a short summary (time to Tycoon, crew, best day) to the clipboard.

## Engineering

- **Split the file.** Move the three scripts to `sim.js`, `game.js` and `reader.js` (still
  no build step) so tests can load `sim.js` directly.
- **Checked-in tests.** Commit the fuzzer, the balance runs and the browser checks under
  `tests/`, runnable with plain Node.
- **Performance.** Cache the paper-dune layers to an offscreen canvas and redraw only when
  the size or palette changes; the full-size canvas is heavy on slow devices.
