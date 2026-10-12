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
colour-vision report that showed why), pinch zoom, drag to pan and the long-press crab card, skipping the
sprites and particles outside the visible part of the field, the annex on the middle dune (a second ore pile and
yard among the deep deposits, haulers choosing the nearer pile, crushers following the ore, and a cableway for its
bars), the shell marks as an option (shapes, letters or none), the night market on festival eve with its cake, the wreck on
the back dune that scouts strip for bars, crab portraits in the Ledger's crew table, the tide pool on the front dune, and
an automatic player in `tests/balance.js` that buys upgrades, with a second economy review in the paper.

## Engineering

- **Split `game.js`.** It is 380 KB in one file. A few script tags (drawing, crabs and animations, controls) need no
  build step; `tests/browser.js` catches load-order mistakes. Do it as its own commit with no change in behaviour, so
  the screenshots can be compared before and after.

## Seeds

Every game idea that was listed here has been built. New ones go here first, in the same spirit: a pitch in a line
and a sketch of how it fits the systems in [ARCHITECTURE.md](ARCHITECTURE.md). Some seeds, none committed to:

- **A crab choir.** On festival eve, crabs by the den sing in rounds (view-only: a `sing` animation with notes, in
  parts by role) while the night market is open.
- **Seagull raids on the ship.** A gull that steals from the cargo ship's deck now and then, with the ship's crew
  shooing it (view-only, in `eco.js`).
- **A lighthouse keeper.** A hermit crab who lives in the lamp once it is built and waves at crabs passing at night.
- **Postcards.** The run summary as a drawn postcard (a canvas snapshot of the field with the crew's names), shareable.
