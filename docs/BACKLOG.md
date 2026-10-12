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
apprentices, contracts, the hydrothermal chimney and the lighthouse lamp.

## Visitors and the sea

- **Kelp forest claim.** A fourth claimable area on the left that slows walking but grows
  kelp, a new material for den decorations or a "kelp rope" upgrade.

## Crew and characters

- **A hungrier web.** Let the food web touch the game: a shark that scares the octopus off, a
  gull that steals a nodule from a hauler on the crest, or the fisherman's catch sold at the
  surface. All decoration now (`eco.js` never reads `S`).

## Economy and progression

- **Metal grades.** Rich flags make "fine" ingots worth 50% more; the smelter keeps them on
  a separate shelf of the stockpile, and the reserve can be set per grade.
- **Prestige / new dig site.** After Crab Tycoon, start a new site with one permanent perk
  carried over (a tech, a decoration, a veteran crab). Replay value.
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

## Interface and accessibility

- **Tutorial.** A guided first five minutes: hire the second smelter, watch the advisor,
  try overclock.
- **Sound.** Soft clicks, bubbles, a crab-rave tune, the whale's song; muted by default,
  with a toggle.
- **Colour-blind check.** Run the role colours through a contrast and CVD validator and add
  a shape or letter to each crab's gear so roles are never told apart by colour alone.
- **Touch gestures.** Pinch to zoom the field on phones, drag to pan, long-press a crab for
  its card.

## Engineering

- **Skip offscreen sprites.** Drawing already stops while the game is scrolled out of view
  and the loop stops in a hidden tab. On the wide big field, crabs and particles outside the
  visible part of the canvas could be skipped too.
