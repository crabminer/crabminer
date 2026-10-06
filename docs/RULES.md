# Crabminer: Game Rules

This is the complete rulebook for Crabminer, the crab mining game at
[crabminer.com](https://crabminer.com). Every number here comes from the constants object
`K` in the simulation script, `sim.js`. If you change a constant,
change it here too. [ARCHITECTURE.md](ARCHITECTURE.md) explains how the code is organised.

- [1. The goal](#1-the-goal)
- [2. The world](#2-the-world)
- [3. Time: the day, night, and the clock](#3-time-the-day-night-and-the-clock)
- [4. The crew: eight kinds of crab](#4-the-crew-eight-kinds-of-crab)
- [5. The production chain](#5-the-production-chain)
- [6. Getting about](#6-getting-about)
- [7. Power](#7-power)
- [8. Breakdowns, parts, and the forge](#8-breakdowns-parts-and-the-forge)
- [9. Wear and rest](#9-wear-and-rest)
- [10. The workday](#10-the-workday)
- [11. The backup job](#11-the-backup-job)
- [12. Friends: dancing, mornings, and the den](#12-friends-dancing-mornings-and-the-den)
- [13. Money](#13-money)
- [14. Upgrades (Build tab)](#14-upgrades-build-tab)
- [15. Research and worker upgrades (Tech tab)](#15-research-and-worker-upgrades-tech-tab)
- [16. The line's layout and the refuel post](#16-the-lines-layout-and-the-refuel-post)
- [17. The sea](#17-the-sea)
- [18. Crab talk](#18-crab-talk)
- [19. Controls](#19-controls)

---

## 1. The goal

You run a crew of robot crabs that turns buried metal into money. Metal goes from the
sand, through a crushing yard and a lava cave, onto a stockpile of refined metal. A riser
then sends it up to a ship at the surface. Every ingot sent up earns credits.

Lifetime earnings set your rank. Each new rank pays a bonus of 10% of its threshold.

| Rank | Lifetime earnings |
| --- | --- |
| Sand Scraper | 0 (start) |
| Pebble Boss | 150 |
| Nodule Baron | 400 |
| Ingot Magnate | 1,000 |
| Lava Lord | 2,500 |
| Crab Tycoon | 6,000 (wins the game) |

Reaching Crab Tycoon wins. Your score is the crab time it took, and the best time is kept
in the browser. You can keep playing afterwards.

The game saves itself in the browser every 10 seconds and whenever the page is hidden or
closed. Reloading the page carries on exactly where you were. To start over, press ? and
choose New game. A save that cannot be read is ignored, and a new game starts instead.

You start with 9 crabs, room in the den for 10, and 120 credits:
1 scout, 2 drills, 2 haulers, 1 crusher, 1 smelter, 1 energy bot, and 1 repair bot.

## 2. The world

The world is a track 1,000 units long, left to right, and three dunes deep, back to
front. A position is `x` along the track and `d` in depth, from 0 at the back crest to 1 at
the front. Crossing the full depth costs as much as walking 300 units of track.

| Place | Track position |
| --- | --- |
| Nodule field | 20 to 540 |
| Building plots | 560, 603, 646, 689, 732, 775, 818 |
| Stirling engine | 852 |
| Lava rim (smelting, forging) | 874 |
| Lava | 888 to 1,000 |
| Thermal vent | rises at 918, entered at 880 |

**The three dunes.** You can mine only the dunes you have claimed. The front dune is
claimed from the start, and the middle and back dunes can be bought (section 14).

| Dune | Depth band | Richness bonus | Extra nodules per flag |
| --- | --- | --- | --- |
| Front | 0.70 to 0.97 | +0 | +0 |
| Middle | 0.38 to 0.62 | +0.08 | +1 |
| Back | 0.06 to 0.30 | +0.15 | +2 |

A crab climbing over the lip between two dunes (within 0.035 of depth 1/3 or 2/3) moves at
half speed.

## 3. Time: the day, night, and the clock

- The simulation runs in fixed steps of 1/60 of a second of crab time. The speed buttons
  (pause, 1×, 2×, 4×) change how fast crab time passes, not what happens.
- A day is 180 seconds and stands for 24 hours, so an hour passes every 7.5 seconds.
- The game starts at dawn, 06:00. The day counter goes up at each dawn.
- Night is 20:00 to 06:00.
- **Night work:** any crab can work at night, but at half speed unless it slept or danced
  within the last 4 hours (30 seconds). Scouts are never slowed at night. Neither are repair
  and maintenance bots under A and B shifts.

## 4. The crew: eight kinds of crab

Each further crab of a kind costs 15% of the base price more than the one before. Retiring
a crab refunds half of what the last one of its kind cost. The den limits how many crabs
you can have (section 14).

| Kind | Base price | Walk speed | Job |
| --- | --- | --- | --- |
| Scout | 30 | 78 | Scans the claimed dunes and plants flags on deposits |
| Drill | 35 | 56 | Drills flagged deposits into nodules |
| Hauler | 25 | 68 | Carries nodules to the ore pile |
| Crusher | 40 | 45 | Presses two nodules into a bar |
| Smelter | 40 | 52 | Melts a bar into an ingot in the lava |
| Energy bot | 35 | 95 | Recharges crabs; refuels at the refuel post |
| Repair bot | 35 | 60 | Forges and fits drill bits and energy cells |
| Maintenance bot | 35 | 64 | Forges and fits legs |

Walk speeds are in track units per second. Haulers walk at 88 with Spring legs.

### Names, records and veterans

Every crab has a name and keeps a record: the jobs it has done at its own work, nodules it
carried on the backup job, pearls, vent rides, dances, and legs lost. Click a crab to see its
name, what it is doing, and its record. The Ledger lists the crew with the most stars first.

A crab that has done enough of its own job earns a star, up to three. Each star makes it 5%
faster at its own job, both working and walking; the backup job gets no bonus. A crab earns
its stars at these job counts, which come to roughly 6, 18 and 36 minutes of steady work:

| Kind | Counts as a job | ★ | ★★ | ★★★ |
| --- | --- | --- | --- | --- |
| Scout | a flag planted | 15 | 45 | 90 |
| Drill | a hole drilled, rich or dry | 40 | 120 | 240 |
| Hauler | a nodule stacked | 20 | 60 | 120 |
| Crusher | a bar pressed | 25 | 75 | 150 |
| Smelter | an ingot smelted | 20 | 60 | 120 |
| Energy bot | a crab recharged | 35 | 105 | 210 |
| Repair bot | a bit or cell fitted | 7 | 21 | 42 |
| Maintenance bot | a leg fitted | 2 | 6 | 12 |

Retiring always takes the newest crab of a kind, so your veterans stay.

## 5. The production chain

```
scout ─flag─▶ drill ─nodule─▶ hauler ─▶ ORE PILE ─▶ crusher (2:1) ─▶ BAR STACK ─▶ smelter ─▶ STOCKPILE ─▶ riser ─▶ credits
                                                        │                              ▲          │
                                                        └──── bars for legs ◀── maintenance        └──── ingots for bits/cells ◀── repair
```

**Scout.**
- Walks to a random spot in the claimed dunes and scans for 3.4 s.
- A scan finds a deposit 50% of the time (better with upgrades).
- A find plants a flag with:
  - **richness**, the chance a hole strikes: 0.45 to 0.85, plus the dune bonus and scanner bonus, between 0.3 and 0.97
  - **size**, the nodules it holds: 2 to 4, plus the dune bonus
- The scout stops when 8 flags are standing (14 with Flag bundle).

**Drill.**
- Picks the flag that best repays the walk (distance plus 60, divided by richness), claims it, and drills there until it is empty.
- A hole takes 2.8 s.
- A hole strikes at the flag's richness. With no flag the drill wildcats, striking 25% of the time.
- A strike uncovers a nodule, and 20% of strikes uncover a second one (45% with Twin augers).
- Each strike uses up one of the flag's nodules.
- The drill rests when 24 nodules lie on the sand.

**Hauler.**
- Fetches the nearest unclaimed nodule; picking it up takes 0.6 s.
- After 3 (5 with Big hopper), it carries them to the ore pile and stacks them at 0.3 s each.
- It waits if the pile is full: 15, 24 or 36 with the Bigger yard upgrade.

**Crusher.**
- When the ore pile holds 2 nodules, it presses them into a bar in 4.5 s.
- It waits if the bar stack is full: 10, 16 or 24.

**Smelter.**
- Takes a bar (two with Twin tongs), holds it in the lava for 3.0 s, and carries the ingot to the stockpile.
- The stockpile holds 40.

**Riser.**
- Sends one ingot up every 3.0 s (1.8 s, then 1.0 s with upgrades), as long as the stockpile holds more than the **reserve**.
- The reserve is the number of ingots you keep back for repairs, 0 to 12, and starts at 2.

## 6. Getting about

- Crabs walk at their own speed (section 4), slowed by:

  | Condition | Speed |
  | --- | --- |
  | Battery under 20% | ×0.35 |
  | Tiredness (section 9) | down to ×0.8 |
  | Missing leg | ×0.55 |
  | Climbing a dune lip | ×0.5 |
  | Storm | ×0.85 |
  | Night, unrested | ×0.5 |

- They speed up with:

  | Condition | Speed |
  | --- | --- |
  | Overclock | ×1.5 |
  | Morning bonus | ×1.25 or more |

- **The thermal vent.** A crab on the lava side of the line (x above 760) with a trip more than 200 units to the left may ride the vent instead of walking:
  1. It walks to the vent at 880.
  2. It floats up for 1.8 s (faster in a lava surge).
  3. It swims down and sideways at 200 units a second, landing on its target.
- A crab only rides when riding is at least 10% quicker than walking.
- Floating costs no power and no wear.

## 7. Power

- **Batteries.** Every crab except energy bots carries a battery. Working or walking drains 2.2% a second, so a full battery lasts about 45 s of work.
  - A drill working with a broken bit drains three times as fast.
  - Overclock drains 1.6 times as fast.
- **Energy bots.**
  - Each carries 4 charges (6 with Big cells).
  - It recharges the crab with the lowest battery under 60%. Each charge refills a battery completely and takes 0.8 s (0.4 s with Fast plug).
  - When its charges run out, or nobody needs one, it goes back to the **refuel post** and plugs in. The post has 2 sockets.
  - Each plugged-in bot takes one charge every 0.35 s from the engine's store.
- **The Stirling engine.** Lava heat drives it.
  - It makes 32 charges a minute (56, then 90, with upgrades), and double that during a lava surge.
  - It banks up to 12 charges.
- **Free power:** sleeping crabs recharge themselves at 3% a second, and dancing crabs at 1.2% a second (more with den decorations).

## 8. Breakdowns, parts, and the forge

- **Drill bits.**
  - Each hole risks breaking the bit: 4.5% of holes (2.5%, then 1.2%, with Hardened bits). Diamond tips cut that by 40%, and wear raises it.
  - A drill with a broken bit switches to the backup job while it waits for a repair bot.
  - If there is nothing to haul, it keeps drilling badly: holes take 60% longer, it strikes 40% less often, and it draws triple power.
- **Energy bots.** Each charge given risks wearing the bot out: 3%, more with wear. A worn bot moves at 45% speed and charges at half speed.
- **Legs.**
  - Any crab can lose a leg while active: on average once per crab per hour of work (0.03% a second), more with wear, and half as often with Tough joints.
  - A crab with a leg missing limps at 55% speed, and the leg lies on the sand until a new one is fitted.
- **Repairs.** Repair bots fix bits and worn energy bots. Maintenance bots fix legs.
  1. The fixer fetches the raw material: an ingot from the stockpile, or a bar from the bar stack. If there is a spare part from the trader in stock, it takes that instead and skips straight to fitting.
  2. It forges the part at the lava rim in 1.4 s, or on the spot with a Pocket forge.
  3. It carries the part to the crab and fits it in 2.4 s (40% faster with Quick hands, repair bots only).
- **Repairs cost product.** The ingot is never sold, and the bar is never smelted. The stockpile reserve keeps ingots back for repairs; bars have no reserve.
- **Night repair crew.** Under A and B shifts, repair and maintenance bots work 30% faster at night and are not slowed by the dark.

## 9. Wear and rest

- Every crab counts the seconds it has worked since it last rested. That count is its **wear**.
- **Building up:**
  - Working adds 1 a second.
  - Overclocked work adds 2.
  - Crushers with Shock pads add half.
- **Wearing off:**
  - Standing idle removes 1 a second.
  - Sleeping removes 4.
  - Dancing removes 2.
- **Effect:** the first 240 s (four minutes) of wear are free. Beyond that, over the next 300 s:
  - breakdown chances (bits, energy cells, legs) rise to double
  - the crab slows by up to a fifth: 1% per 10 s of wear over 240, capped at 20%

## 10. The workday

Choose a pattern in the Crew tab. The 24-hour timeline there shows who is on duty when:
blue is daytime work, red is night work, and the outlined cell is now.

| Pattern | Who works when |
| --- | --- |
| All hands | Everyone, around the clock |
| 8-hour day | 08:00 to 16:00 |
| Two 8-hour shifts | 05:00 to 13:00, then 16:00 to 24:00 (3-hour rest between) |
| A and B shifts | Everyone 06:00 to 18:00. At night half of each kind sleeps, a different half each night; repair and maintenance bots work all night |
| Three-shift relief | Shifts 06:00 to 14:00, 14:00 to 22:00, 22:00 to 06:00; each crab sleeps through one of the three |
| Custom | You set the start hour, shift length (2 to 12 h), shifts a day (1 or 2), rest between (0 to 8 h), and groups (1 to 3, starting in turn, evenly spread through the day) |

- **Groups.** Crabs are split into groups by their number within their kind (0, 1, 2…).
- **Scouts take the night.** Under the 8-hour, two-8s and custom patterns, scouts work the night hours by default. Untick "Scouts work the night" to keep them with their group.
- **Going off and coming back.** A crab going off duty finishes the task in hand, then sleeps where it stands. A sleeping crab wakes and resumes its job when its hours come round.
- **Coverage.** If some job has nobody on duty while the rest of the line is working, that stage stops. The Ledger's coverage table shows crabs on duty for each part of the day, and the advisor names the first gap.

## 11. The backup job

When its own job is stuck, a crab carries nodules to the ore pile instead, at its own
walking pace. It returns to its job as soon as there is one, after delivering what it holds.
Crabs that switch to the backup job:

- a drill whose bit is broken, or when the sand is littered (24 nodules)
- a scout when all its flags are standing
- a crusher when the ore pile has fewer than 2 nodules
- a smelter when the bar stack is empty
- an energy bot with full charges and nobody to charge
- a repair or maintenance bot with nothing to fix

Haulers do this job all the time. Slow kinds are slow haulers.

## 12. Friends: dancing, mornings, and the den

- **Dancing.** Two idle crabs within 42 units of each other (and 0.12 in depth) pair up and dance. While dancing, each one:
  - recharges 1.2% a second, plus 5% of that per den decoration
  - sheds 2 s of wear a second
  - counts as rested for night work
- **The morning bonus.** At each dawn, every crab that slept or danced at least 20 s in the previous day starts fresh: 25% faster for 90 s. Each den decoration adds 1 point and 3 s to the bonus.
- **The den.** A round house on the first plot.
  - Every 300 crab-seconds of idle time, counted across the crew, the idle crab nearest the den makes a decoration for it.
  - The den holds 4 decorations, plus 2 per Crab den upgrade.
  - Everyday pieces: shell garland, sea-glass mosaic, pebble cairn, kelp wreath, coral sculpture, sand castle, nodule totem.
  - A big moment inspires the next piece:

    | Event | Decoration |
    | --- | --- |
    | Rank-up | Trophy |
    | Pearl | Pearl lamp |
    | Octopus shooed | Ink painting |
    | Storm passes | Driftwood sculpture |
    | Ship order filled | Ship in a bottle |
    | Lava surge ends | Lava lamp |

## 13. Money

- **Metal price.** It centres on 12 credits per ingot and moves within 6.6 to 18. A slow swell (±18% over 150 s), a faster ripple (±7% over 43 s), and a seeded random walk (up to ±15%) set it.
- **Flow bonus.** An ingot sold within 6 s of the last keeps the flow going. Each one in a row adds 2% to the price, up to 40% for 20 in a row. A gap resets the flow.
- **Overclock.**
  - Every sale banks 0.6 s of overclock, multiplied by (1 + streak / 10), up to 30 s.
  - Press ⚡ (or O) to spend it. While it runs, the whole crew moves and works 50% faster, drains 60% more power, and wears twice as fast.
- **Pearl jackpots.** A strike on a flag of richness 0.75 or more turns up a pearl 4% of the time. It pays 60, 90 or 130 credits on the front, middle or back dune, straight away, and counts toward rank.
- **Ship orders.**
  - At 150 s, and 180 to 300 s after each order closes, a cargo ship asks for 5 to 40 ingots within 100 s. The number is about 15% above the last minute's sales rate.
  - While the order is open, each ingot sold earns a 30% premium, plus 5 points per reputation star.
  - **Filling it** pays a bonus of 6 credits an ingot (10% more per star) and adds a star, up to 5.
  - **Missing it** costs a star.
- **The rival crew 🦞.** Once you reach Ingot Magnate, a crew of lobsters sets up behind the
  basalt ridge with its own line to the ship, and races you for every order after that.
  - For each order the rival sets a pace: it would fill the order in 75% to 120% of the
    order's 100 s, divided by its drive. Its count shows beside yours on the top bar and on
    the ship's flag, and its ingots rise up a red line from behind the ridge.
  - **If the rival fills the order first,** the ship sails with their metal. You keep the
    premium on what you already sent, but get no bonus, and lose a reputation star, as for a
    missed order.
  - **If you fill it first,** you get the usual bonus and star. Each order you win raises the
    rival's drive by 8%, and each it wins lowers it by 6%, between 70% and 150%. A strong
    line therefore faces a hungrier rival.
  - The advisor warns when the rival is ahead. Overclock and a lower stockpile reserve are
    the ways to catch up.
- **Spending.** Credits buy crabs, upgrades and research. Repairs are paid in metal. There is no upkeep.

## 14. Upgrades (Build tab)

| Upgrade | Levels | Costs |
| --- | --- | --- |
| Crab den | Room for 10, 14, 18, 24, 30, 36 crabs (and 2 more decorations each) | 120, 300, 650, 1,200, 2,000 |
| Dune claims | Front only; plus middle; plus back | 200, 550 |
| Hardened bits | Bits break on 4.5%, 2.5%, 1.2% of holes | 150, 380 |
| Sharper scanner | Find 50%, 62%, 74%; richness +0, +0.07, +0.13 | 140, 360 |
| Stirling engine | 32, 56, 90 charges a minute | 140, 420 |
| Riser pump | One ingot every 3.0, 1.8, 1.0 s | 100, 300 |
| Bigger yard | Ore pile 15/24/36, bar stack 10/16/24 | 90, 240 |

## 15. Research and worker upgrades (Tech tab)

Research a technology to unlock its worker upgrades. A worker upgrade is bought once and
applies to every crab of that kind, now and later.

| Technology (cost) | Worker upgrade | Effect | Cost |
| --- | --- | --- | --- |
| Sonar lab (150) | Night eyes | Scans take 30% less time at night | 80 |
| | Night battery | Scouts use no power at night | 90 |
| | Flag bundle | Up to 14 flags standing, not 8 | 110 |
| | Moon flags | +0.2 find chance at night | 120 |
| | Wide sonar | Scans take 35% less time | 120 |
| | Deep sonar | Flags +0.08 richness, +1 nodule | 200 |
| Metallurgy (250) | Diamond tips | Holes 25% quicker; bits break 40% less | 180 |
| | Twin augers | Second nodule on 45% of strikes | 220 |
| | Heat-proof tongs | Smelting 40% quicker | 200 |
| | Twin tongs | Smelters carry two bars a trip | 260 |
| Hydraulics (250) | Big hopper | Haulers carry 5 | 150 |
| | Spring legs | Haulers walk 30% faster | 150 |
| | Hydraulic claws | Crushing 35% quicker | 200 |
| | Shock pads | Crushers wear half as fast | 120 |
| Power electronics (300) | Big cells | Energy bots hold 6 charges | 160 |
| | Fast plug | Charging takes half as long; plugging in 40% quicker | 140 |
| Field engineering (300) | Pocket forge (repair) | Bits forged on the spot | 180 |
| | Quick hands | Repair bots fit parts 40% faster | 120 |
| | Pocket forge (maintenance) | Legs forged on the spot | 180 |
| | Tough joints | Every crab loses legs half as often | 220 |

Everything costs 4,450 in total.

## 16. The line's layout and the refuel post

- **Plots.** Seven buildings stand on seven plots. Left to right by default: den, workshop, ore pile, crushing yard, bar stack, stockpile, collector.
  - In Build → **Move buildings**, the plots show as tiles. Tap a building, then a plot, to move it there; it swaps with whatever stands there.
  - The Build tab also lists the plots in order with ◀ ▶ buttons, which move a building one plot toward the field or the lava (swapping with its neighbour), and the refuel post 30 units at a time, pinning it.
  - The spots crabs work at move with their building: the haul stand is 24 units left of the ore pile, and the smelters' grab spot is 16 right of the bar stack.
- **The refuel post.** It stands on a 520-unit extension cord from the Stirling engine's outlet, anywhere from x = 332 to 812 along the front dune (depth 0.72 to 0.97).
  - **Placing it.** In Move buildings you can tap the post, then the sand where it should go. That pins it there.
  - **Bots move it.** Otherwise ("Bots move it"), an idle energy bot drags it toward the middle of the crew, at most every 25 s and only if that is more than 110 units away.
  - **Tide drift.** The tide's current pushes the post along the sand: one way on the rising tide and the other on the falling one, up to 3 units a second near high and low water, and three times that in a storm. The post remembers its home, which is where it was last set down.
  - **Putting it back.** Once it slips more than 40 units from home, one of these drags it back:
    - an idle energy bot
    - a bot that has just refuelled at the post
    - if it has drifted more than 120 units, the next bot free from charging

    A pinned post goes back home; an unpinned one goes to the middle of the crew. Bots plugged in or parked at the post follow it as it slides.

## 17. The sea

- **Tides.** The tide runs a 240 s cycle.
  - Above 0.75 (high water), every 12 s the current washes 1 or 2 free nodules onto the claimed dunes.
  - Below −0.75 (low water), every 20 s there is a 50% chance a flag nobody is working gets buried.
- **Storms.** The first comes at 300 s, then 360 to 540 s after each one ends. Each storm lasts 40 s, with a 20 s warning.
  - The bad: walking slows to 85% and the riser to half speed, and every 8 s there is a 60% chance an idle flag is buried.
  - The good: every 4 s the waves stir up 2 or 3 free nodules.
- **Lava surges.** The first comes at 200 s, then 300 to 480 s after each one ends. Each lasts 30 s, during which:
  - smelting and forging take half the time
  - the engine makes double charge
  - the vent lifts 1.7 times faster
- **The octopus.** The first comes at 90 s, then 100 to 200 s after each one leaves.
  1. It swims in toward the ore pile, or toward the nodule nearest the line if the pile is empty.
  2. If a crab is within 28 units of its target when it arrives, it flees in a cloud of ink.
  3. Otherwise it spends 1.5 s grabbing up to 2 nodules and escapes.
  4. Click it, or press **Shoo the octopus** over the field (the S key), at any time to shoo it away. If it is carrying anything, it drops it on the sand.
- **Whales.** Every 2 to 4 minutes a whale glides overhead and the crabs below wave. This is decoration only.
- **The hermit-crab trader.** The first comes at 240 s, then 240 to 360 s after each one leaves.
  - It walks in from the left, keeps shop by the den (x = 500) for 60 s, then walks off.
  - It offers 3 of the 6 goods below, one of each. Swap for them in the Build tab, or click the trader to jump there.

    | Good | Price | Effect |
    | --- | --- | --- |
    | Spare drill bits ×2 | 1 bar | Repair bots fit them without fetching or forging |
    | Spare legs ×2 | 1 bar | Maintenance bots fit them without fetching or forging |
    | Treasure map | 2 ingots | Three flags of richness 0.85 to 0.95 appear on the claimed dunes |
    | Crate of cells | 1 ingot | Fills the engine's store and every energy bot's cells |
    | Gold gear | 3 bars | Every crab gets the morning bonus at once |
    | Lucky shell | 4 bars | The next strike on a rich flag (0.75 or more) finds a pearl for sure |

- **The sea turtle.** The first comes at 180 s, then 150 to 270 s after each one leaves.
  - It swims across low over a claimed dune at 85 units a second. It comes in from the side most travelling crabs are heading away from, and it can turn back once for a passenger it has passed.
  - It gives one crab a lift: one within 50 units of it (and 160 in depth) heading at least 160 units its way. Crabs with a flat battery or a missing leg are picked first.
  - It drops the crab where it was going. A ride costs no power and no wear.

## 18. Crab talk

Crabs speak in emoji sentences: a **thing**, then a **verb**, then sometimes **who** or a
**feeling**.

| Things | Verbs |
| --- | --- |
| 🔋 charge, 🦵 leg, ⛏️ drill bit, 🪨 nodule, 🧱 bar, 🪙 ingot, 🚩 flag, 🔥 forge, 🌋 vent, 🌊 tide, 🌩️ storm, 🐙 octopus, 🦪 pearl, 🚢 ship, 🐋 whale, 🏠 den, 🐚 shell, 🛒 shop, 🐢 turtle, 🔌 plug, 🦀 you/me | ❓ I need, 👍 on my way, ➡️ bringing it, ✅ got it/done, 💔 broke, ⛔ full, ❗ found one, ❤️ thanks |

Examples:
- 🔋❓ "I need charge". The energy bot that picks it replies 🔋➡️🦀, and the crab says 🔋✅❤️ once charged.
- 🦵💔😭 a lost leg; 🧱➡️🔥 a maintenance bot taking a bar to the forge.
- 🪨⛔ a full ore pile; 🔌🌊👍 an energy bot going to fetch a drifted post.

On devices without emoji, crabs spell the words instead.

The crabs have 52 animations across about 60 triggers: celebrations, dances with
neighbours, idle routines that get sillier the longer a crab waits, and moods for every
kind of trouble. A rank-up sets off a five-second crab rave. They are cosmetic.

## 19. Controls

| Control | Where | What |
| --- | --- | --- |
| ❚❚ 1× 2× 4× | Top bar | Pause and game speed (Space pauses; 1, 2, 3 set 1×, 2×, 4×) |
| ⚡ Overclock | Top bar | Spend banked overclock (O) |
| Stockpile − + | Top bar | Ingots kept back for repairs |
| Big field | Top bar | Big field (default) or side panel (B); hidden on small screens |
| ? | Top bar | The introduction, with the keys, Listen all (read aloud) and New game (? key) |
| Shoo the octopus | Over the field, top right | Shown while the octopus is in; shoos it (S) |
| Trader | Over the field, top right | Shown while the trader comes and keeps shop; opens its goods (T) |
| Crew tab | Panel | Hire (+), retire (−), workday, timeline, the crew by name (Show finds a crab and opens its card), crab-talk legend |
| Build tab | Panel | Upgrades, Move buildings (M), the plots with ◀ ▶ to move buildings and the post, refuel post pinning, den decorations, the trader's goods |
| Tech tab | Panel | Research and worker upgrades |
| Ledger tab | Panel | Money, prices, stage capacities, overheads, coverage, the sea, bonuses |
| View tab | Panel | Fold the panel away and scroll the field |
| [ ] | Keys | The previous or next tab |
| Click a crab | Field | See what it is doing |
| Click the octopus | Field | Shoo it |
| Click the trader | Field | Jump to its goods |
| Click a locked dune | Field | Jump to the Dune claims upgrade |
