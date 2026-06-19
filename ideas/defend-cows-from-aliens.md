# Defend the Cows from Aliens

> **🛸 PLAYABLE PROTOTYPE (2026-06-18): `nuzz.pet/aliens`** — the *flashlight* variant, built in
> **PixiJS v7 (WebGL)** as a standalone file (`aliens.html`, loads Pixi from CDN, separate from the
> main game). Dark night pasture, grazing cows/sheep/chickens, UFOs descend with glowing tractor
> beams; sweep a flashlight onto a UFO to break its beam and drive it off. 60s round → farmer verdict.
> This is the "see the WebGL jump" demo (additive glow / lighting / particles). Not wired into the
> main `index.html` level system yet.

**One-liner:** UFOs try to abduct cows with tractor beams; you yank the cows back down to the field.

**Core verb:** drag-to-rescue — the same drag we use everywhere, but *inverted* from Falling Pandas
(pull the cow DOWN out of the beam, instead of UP the hill).

**Sketch:**
- Cows graze in a field. UFOs drift in and drop a glowing tractor beam over a cow; that cow starts
  floating UP toward the saucer.
- Grab a rising cow and drag it back down to the grass before it vanishes into the ship.
- Ramps slow → busy like the others: stronger/faster beams, more UFOs over the round.
- Multi-touch: pin one cow down with a finger while you grab another out of a second beam.
- Consequence: a flustered **farmer** reacts at the end (kept the whole herd / lost a couple /
  "they took Bessie again"). Comedy, never cruelty — abducted cows wander back next round, dazed.

**Brand fit:** silly + wholesome; the farmer fills the mom-bird/zookeeper "verdict character" slot. Strong.

**Open questions:**
- Rescue-only (drag), or can you also tap/scare a UFO? (Lean: rescue-only — keep one verb.)
- Does holding a cow on the ground for a beat "win" it back for a while, or is the beam a constant tug?
- Win condition: survive the timed round with the fewest abductions (containment, like pandas).
