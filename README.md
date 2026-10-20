# Crabminer

A small city builder on the sea floor. You run a crew of robot crabs that turns buried
metal into money: scouts flag deposits, drills dig them up, haulers carry the nodules to
an ore pile, crushers press them into bars, smelters melt the bars into ingots in a lava
cave, and a riser sends the ingots up to a ship at the surface. Lifetime earnings climb
six ranks, from Sand Scraper to Crab Tycoon.

**Play it at [crabminer.com](https://crabminer.com).**

It is a static page with no build step and no dependencies: `index.html` and its
scripts, served by GitHub Pages from `main`. To run it locally, serve the folder with any
static server, for example `python3 -m http.server`, and open `http://localhost:8000/`.

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/FEATURE_GUIDE.md](docs/FEATURE_GUIDE.md) | A tour in pictures: one game from the first crab to Crab Tycoon, and why each feature exists |
| [docs/RULES.md](docs/RULES.md) | The complete rulebook; every number comes from the constants in `sim.js` |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is organised: the files, the scripts, and how data moves between them |

## Tests

The tests live in `tests/` and run with plain Node 22 or later, as the GitHub Actions
workflow does:

```sh
node tests/fuzz.js      # random play, invariants checked every second
node tests/save.js      # save and load round trips
node tests/eco.js       # the sea's food web
node tests/browser.js   # the page in headless Chromium, with screenshots
```

`docs/ARCHITECTURE.md` lists the rest, including the balance and colour reports.

## Licence

MIT. See [LICENSE](LICENSE).
