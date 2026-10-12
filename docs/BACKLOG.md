# Crabminer: Backlog

Ideas not yet built, roughly grouped. Each has a one-line pitch and a sketch of how it would
fit the existing systems (see [ARCHITECTURE.md](ARCHITECTURE.md)). Nothing here is committed
to; move an item into the game, the rules and the paper together when it is built.

## Done (for reference)

These came from earlier rounds of ideas and are already in the game: tides and storms,
octopus, pearl jackpots, cargo-ship orders, den decorations, whale shadows, lava surges,
the hermit-crab trader, the sea turtle, save and load, named crabs with veteran stars, the rival crew,
the split into `sim.js`, `game.js` and `reader.js`, the checked-in tests and their GitHub Action,
cached paper-dune sheets, whole-game charts in the Ledger, sharing a run, plankton
light that lets tired crabs work at full speed at night, sunken chests on the back dune,
the moray eel, lending a claw, the closed food web with the fisherman and the gulls (`eco.js`)
and its lab report, the crushing line of press stations, the two-storey den, a repertoire
of 119 animations with dances that cheer up the crabs around them, the manta-ray glide, the crab
festival every tenth day, the den's pets, crab moods, earthquakes, surface news, achievements,
apprentices, contracts, the hydrothermal chimney, the lighthouse lamp, the kelp forest claim, the ore
conveyor, the charging pad, the new dig site after Crab Tycoon, insurance, the food web's two bites at the
game (the shark and the gulls), sound, the tutorial, metal grades (fine ingots from rich deposits, on their own
shelf with their own reserve), the second smelting rim, a mark on every kind's shell (with `tests/colour.js`, the
colour-vision report that showed why), pinch zoom, drag to pan and the long-press crab card, and skipping the
sprites outside the visible part of the field.

## Buildings and layout

- **More plots.** A den upgrade or claim that adds plots on the middle dune for a second
  ore pile near the deep deposits. Needs haulers to choose a pile, crushers to work from
  both, and the belt and the pad to know which pile they serve, so it is a round of its own.

## Interface and accessibility

- **Role marks as an option.** The shell marks are always on. A View-tab toggle could make
  them bolder (a letter instead of a shape) or hide them for players who prefer bare shells.

## Engineering

- **Skip offscreen particles.** Nodules, flags, crabs and debris outside the visible band of
  the canvas are skipped. Puffs, sparks, confetti, plankton and the food web still draw
  everywhere; on a zoomed phone they are the next cost worth cutting.
