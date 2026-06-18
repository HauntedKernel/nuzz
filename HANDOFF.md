# HANDOFF — how to change things in Nuzz

This is the map. It explains how the game works, every number you can tune (and what
happens when you change it), how to deploy, and what to build next. It's written so
**Claude Code can read this and immediately know how the project works**, and so you can
ask for changes in plain English.

**Nuzz** — a tiny daily petting game. Brand: Nuzz · domain **nuzz.pet** · socials **@nuzz.pet**
(Instagram + TikTok). Tagline: *"just a little bit of petting."* Positioning: *"your daily
cuteness top-off."* Built by two humans, in the open.

Everything lives in one file: **`index.html`** (kept single-file on purpose — instant load).
Inside it there are three parts:
- a `<style>` section at the top (colors + layout + the landing strip + the name prompt)
- the HTML in the middle (the canvas, HUD, end card, landing strip, first-run name prompt)
- a big `<script>` section at the bottom (all the game logic — most tuning happens here)

Supporting files: `manifest.json` + `sw.js` + `/icons` (the PWA), and `tools/make-icons.js`
(regenerates the icons). `public/` is the deploy folder (a synced copy — see DEPLOY).

If you're using Claude Code, just say things like *"make the cuddle round 8 seconds"* or
*"add a fifth hurdle obstacle"* and point it at this file.

---

## THE DAILY LOOP (what the game is right now)

1. **Name your pet** (first run only). A prompt asks for a name; it's saved in the browser
   (`localStorage`) so it sticks. Default "Biscuit". The pet is player-named — there is no
   single brand mascot.

2. **Cuddle round (10 seconds).** Scratch your pet to bank **bond energy** (the 🦴 counter).
   Glowing **sweet spots** appear and move fast; cover them for big bonus points. This is the
   fun, explosive, points-raining half. The 10s timer is a **hard window** — earning stops at
   the buzzer (no farming past it).

3. **Agility course (Chapter 1).** Your pet auto-runs left→right (side-scroller). You guide her
   over **14 hurdles**: **tap to hop, HOLD to leap higher.** The course **ramps** — each hurdle
   is faster, and the bars get taller, so later hurdles need a longer hold. A clean leap is cheap;
   a mistimed **BONK** is expensive and breaks your CLEAN combo chain.

4. **Stamina = the bond energy you banked.** Each hurdle spends it. **Run the 🦴 bar to zero
   before the finish and the run FAILS** ("Too Tired!" card). Finish all 14 and you get a
   **ribbon** graded on how clean you were: 🥇 Perfect Run / 🥈 Clear Round / 🥉 Good Run.

**The point:** petting is the fun charge-up; the agility course is the skill test. Affection
is the fuel.

---

## DEPLOY (live at nuzz.pet)

Hosted on **Cloudflare Pages**, project **`good-boy`**, custom domain **nuzz.pet** (apex; DNS on
Cloudflare, nameservers `vern`/`zainab.ns.cloudflare.com`, SSL automatic). Fallback URL:
`good-boy-4mx.pages.dev`. Wrangler is already authenticated.

The repo root is the source of truth; `public/` is what actually deploys. To push a new version:

1. Edit `index.html` (and/or `manifest.json`, `sw.js`, `icons/`) in the repo root.
2. **Syntax-check** the game script first (extract the `<script>` and `node --check`).
3. Sync into `public/`: copy `index.html`, `manifest.json`, `sw.js`, and `icons/*`.
4. Deploy:
   ```
   npx wrangler pages deploy --project-name good-boy --commit-dirty=true --branch=main
   ```
   (No `public` positional anymore — `wrangler.toml` sets `pages_build_output_dir = "public"`.
   That same `wrangler.toml` also attaches the D1 analytics binding and compiles `functions/`.)

The service worker (`sw.js`) uses **stale-while-revalidate**: repeat visits paint instantly from
cache and the new version is fetched in the background, so updates appear on the next reload with
no manual cache-busting. (Mobile Safari can still hold the old build briefly — hard-refresh or use
the deploy's `<hash>.good-boy-4mx.pages.dev` permalink to see changes immediately.) Bump `CACHE`
in `sw.js` only when you want to force-purge everything.

To regenerate the PWA icons (placeholder heart mark; swap in real art anytime): `node tools/make-icons.js`.

---

## THE TUNING KNOBS (the game's "economy")

All near the top of the `<script>` section. The economy is the heart of it — see the design note
in §"DESIGN PRINCIPLES".

### Cuddle / petting (the fun, generous half)
- **`const ROUND=10*60;`** — cuddle length. The `10` is **seconds**. Hard window: earning stops
  when it hits 0.
- **`const BASE_MS=75;`** — milliseconds between base-scratch points, gated **globally**. This is
  the anti-farm rule: extra fingers can't multiply your income (without it, multi-finger scrubbing
  banked 400+ trivially). Raise it for a smaller base trickle, lower for more.
- **`SPOT_BONUS_1=14 / SPOT_BONUS_2=32 / SPOT_BONUS_3=55`** — points for covering 1 / 2 / 3 glowing
  spots at once. These are the real income; raise to make good petting more rewarding.
- **`spotTTL = 110 + Math.random()*80;`** (in `rollSpots()`) — how long spots stay before moving,
  in frames (~1.8–3s). Lower = spots move faster (harder, busier).
- **`const n = r<0.5?1:(r<0.85?2:3);`** (in `rollSpots()`) — odds of 1 / 2 / 3 spots (50/35/15%).
- Spots are caught passively while covered, then **instantly re-roll** (chaining = the explosive
  feel). `spotLock` is a tiny debounce so one cover can't score twice in a frame.

### Agility course (the skill test)
- **`const COURSE_HURDLES = 14;`** — hurdles per run.
- **Speed ramp:** `COURSE_SPEED0 = 4.2` (start), `SPEED_RAMP = 0.9` (added each hurdle),
  `COURSE_SPEED_MAX = 11` (ceiling). The world accelerates a notch every time a bar passes.
- **`GAP_RAMP = 5`** / **`HURDLE_GAP = 100`** — hurdles also spawn quicker as it ramps
  (gap shrinks by `GAP_RAMP` frames per hurdle, floored at 55).
- **Jump feel:** `JUMP_V = 9.5` (initial pop on tap), `JUMP_GRAV = 0.85` (normal/falling gravity),
  `JUMP_GRAV_HOLD = 0.32` (gentler gravity *while you hold* and she's rising → floats higher),
  `HOLD_MAX_FR = 20` (caps the biggest leap). Tap = small hop; hold = big leap.
- **Bar heights:** `BAR_BASE = 40` (first hurdle), `BAR_RAMP = 8` (taller each one),
  `BAR_MAX = 100` (plateau, kept below her full-hold apex so every bar stays clearable/PERFECT-able).
- **`PERFECT_MARGIN = 22`** — clearance above the bar that scores PERFECT (vs. a bare CLEAR).
- **`HURDLE_TINTS`** — the rotating crossbar colors. **`COURSE_DOG_SCALE = 1.35`** — runner size.

### The economy (petting ↔ course) — tuned for ~50% fail
- **`COST_PERFECT = 26 / COST_GOOD = 60 / COST_MISS = 100`** — stamina spent per hurdle outcome.
  A full GOOD run ≈ `14 × 60 = 840`; a clean perfect-ish run ≈ 550–650; a bonk swaps a 60 for a 100.
- **To rebalance difficulty, change THESE costs — not the petting income.** Petting should stay
  fun and generous; the challenge lives in the jumps. Tune toward ~50% fail for an average run.
  The player's banked stamina vs. what the run needs is shown at course start.

### Sweet-spot anchors (where spots appear on the pet)
- **`const ANCHORS = {...}`** — five named spots (ear, belly, tail, chin, back), each an x/y offset
  from the pet's center. Add a spot by adding a line; move one by changing its `dx`/`dy`.

---

## PLAYER-NAMED PET + SAVED STATE

- First run shows the `#namecard` prompt; the name saves to `localStorage` under **`nuzz:pet`**.
- Progress (best combo, perfect count) saves under **`nuzz:progress`** on finish/fail.
- No accounts, no backend. To reset, clear the site's localStorage in the browser.
- `petName` is used throughout the UI (HUD "Day 1 · <name>", end-card blurbs).

---

## VISUAL / STYLING KNOBS

In the `<style>` section at the top:
- **`:root { --sky / --grass / --sun / --pup / --rose / --ink / --paper / --brand ... }`** — the
  palette. `--brand:#ef9f27` (Nuzz orange) and `--paper:#faeeda` (warm cream) are the brand colors
  (matched in `manifest.json` `theme_color` / `background_color`). Change hexes to recolor at once.
- **`#strip`** — the quiet landing strip below the game (wordmark, tagline, IG/TikTok links,
  add-to-home hint). Restraint is the point — the game is the pitch.
- The pet is drawn in code (no images): **`drawDog()`** (side view, faces right — used in both the
  cuddle round and as the course runner) and **`drawCourse()`** (the running scene, hurdles, speed
  juice). Ask Claude Code to tweak these rather than hand-editing.
- Font is `Comic Sans MS` on `body` — that's the playful storybook feel.

---

## GAMEPLAY ANALYTICS (anonymous, privacy-first)

Added 2026-06-17 so we can see *gameplay*, not just Cloudflare page views. No third party, no
accounts, no PII — a random `nuzz:aid` in localStorage and server-derived country only.

**How it flows:** `track(ev, props)` in `index.html` fires `navigator.sendBeacon('/api/e', …)` at
three moments → the Pages Function `functions/api/e.js` inserts one row into the **D1** database
`nuzz_analytics` (binding `DB`, declared in `wrangler.toml`). A failed beacon can never affect play
(everything is wrapped in try/catch; the endpoint always returns 204).

**The three events** (one row each):
- **`start`** — cuddle round begins (a real *play*). `{returning}` = has this browser played before.
- **`course`** — agility course begins. `{banked, need}` = stamina carried in vs. a full run's cost.
- **`run_end`** — finish or fail. `{result:'finish'|'fail', reached, grade, cleared, perfects, combo, left}`.
  `reached` = how many hurdles she got past — **this is the drop-off signal.**

Promoted (indexed) columns: `ev, reached, result, banked, country, ts`. Everything is also kept as
raw JSON in `data`.

**Reading the numbers** (same auth as DEPLOY — wrangler is logged in):
```
# plays / courses / finishes-fails per day
npx wrangler d1 execute nuzz_analytics --remote --command \
 "SELECT date(ts/1000,'unixepoch') d, ev, count(*) n FROM events GROUP BY d, ev ORDER BY d;"

# where do FAILS happen? (drop-off histogram by hurdle, 14 = finished)
npx wrangler d1 execute nuzz_analytics --remote --command \
 "SELECT reached, count(*) fails FROM events WHERE ev='run_end' AND result='fail' GROUP BY reached ORDER BY reached;"

# fail rate + banked-stamina distribution
npx wrangler d1 execute nuzz_analytics --remote --command \
 "SELECT result, count(*) n, round(avg(banked)) avg_banked FROM events WHERE ev='run_end' GROUP BY result;"
```
Schema lives in `tools/schema.sql`. To wipe and start over: `DELETE FROM events;`. The whole thing
is on Cloudflare's free tier (D1: 100k writes/day; we use ~3 per play).

---

## LEVELS — the dog, and the bird ("Feed the Nest")

The file now holds **two levels**, chosen at load by URL (`const LEVEL` near the top):
- default → the **dog** (cuddle → agility course), described above.
- **`nuzz.pet/?nest`** → the **bird** level, "Feed the Nest" (added 2026-06-17).

**Bird mechanic.** Six baby chicks open/close their beaks on ramping rhythms. You **scoop a worm
from the patch along the bottom and drag it up into an OPEN beak** (release to drop). Feed a closed
beak → the worm's wasted. Fed chicks fill up, settle, and stop gaping (so food naturally flows to
the hungry ones). A gentle hunger decay means a full nest still needs tending. When the 24s timer
ends, **Mama bird flies home and reacts**, graded like the dog's ribbons and tuned *generous* so a
happy mama is the norm and the angry dive-bomb is a rare, earned punchline:
- 🥇 gold (avg fullness ≥ 0.80) · 🥈 silver (≥ 0.58) · 🥉 bronze (≥ 0.34) · 😤 angry (below).

It is **self-contained**: feed → mama's verdict → end card. No second "course" phase — the verdict
*is* the payoff (each animal gets a different relationship, per the design principles).

**Tuning knobs** (top of the BIRD LEVEL block in `index.html`):
- `NEST_CHICKS = 6` · `NEST_ROUND = 24*60` (round length) · `FEED_AMOUNT = 0.34` (fullness per worm,
  ~3 to fill) · `FEED_OPEN_MIN = 0.25` (how open a beak must be to accept food) ·
  `NEST_RATE0` / `NEST_RATE_RAMP` (open/close speed + how much it accelerates over the round) ·
  `NEST_DECAY` (hunger creep) · the verdict thresholds are in `endNestRound()`.
- To rebalance difficulty: raise `NEST_RATE_RAMP` or lower `FEED_AMOUNT`/`NEST_ROUND` (harder);
  shift the `endNestRound()` thresholds to change how forgiving Mama is.

**The rollout strategy (why ?nest, not the front door yet).** Plan: when a new level is solid it
becomes the **landing default** so it gets the most exposure; older levels move to a "pick a friend"
collection; the analytics `level` field tells us which levels people replay; winners get extended
into missions. New levels bake behind `?…` first so the public front door stays polished.

**Analytics for levels.** Every event now carries `level` ('dog' | 'nest'). The nest's `run_end`
stores `result` = the verdict tier ('gold'/'silver'/'bronze'/'angry'), `reached` = chicks left full,
`banked` = worms fed, plus `fullness` (%). So the same D1 queries (see GAMEPLAY ANALYTICS) compare
levels: e.g. `... GROUP BY level, ev` for plays per level, or filter `WHERE ev='run_end' AND
json_extract(data,'$.level')='nest'` for the nest's verdict spread.

---

## PARKED (in the code, not currently reached)

The original **trail / dig-for-treasure** system is still in the file (the `walk` phase, `TIER_*`
item pools, `DIG_COST`, `SCENES_PER_WALK`, `drawTrailScene`, etc.) but is **no longer in the loop** —
the agility course replaced it after the cuddle round. Keep it around as Chapter-2+ material (e.g. a
reward for a gold ribbon) or delete if it's in the way.

---

## DESIGN PRINCIPLES (please keep these)

- **Petting is the fun; the course is the test.** Keep petting explosive and generous (big climbing
  numbers, jackpots). Balance difficulty by making hurdles cost more, never by nerfing petting.
- **Affection is the fuel, not a slot machine.** The petting powers the adventure. Don't turn it into
  something that pressures people to play for hours or spend money.
- **Stay light and instant.** One small file, no loading screens, opens and plays in seconds. That's
  the product (and why it's a single `index.html` + a tiny PWA shell).
- **Short and self-terminating.** A round ends cleanly. No streak nags, no re-engagement loops — it's
  a quick warm minute, then it lets the player go.
- **Keep it kind.** Warm, wholesome, a little funny. That's the brand.
- **Each animal a different relationship** (for later): resist making every animal "just scratch
  faster." The variety of *how you connect* is the point.

---

## ROADMAP — good next steps

1. **Real icon art.** `/icons` are placeholder heart marks. Drop in final PNGs (192, 512, 512-maskable).
2. **`www.nuzz.pet`** (optional) — add it under Cloudflare Pages → good-boy → Custom domains to
   redirect to the apex.
3. **End-of-round share** — wire `navigator.share` on the ribbon screen with a screenshot of the
   scorecard (feeds the #NuzzPet content loop). Pure outbound; no funnels mid-game.
4. **More obstacles / Chapter 2** — a **tunnel** (swipe to thread) and a **weave** (rhythm taps) were
   the planned next obstacles; A-frame/pause-table after. Builds course variety.
5. **A second animal — the bird.** Different personality, different interaction: **call-and-response**
   (repeat whistle patterns, Simon-Says) instead of scratching. Proves the core idea that the skill is
   adapting to each animal's temperament.
6. **Character selection + a "pack" screen** — pick who you bond with each day.
7. **Daily structure for real** — each real day = a new short leg, story carrying forward
   ("Wordle, but cozy").

---

## QUICK REFERENCE — "I want to change X, where do I look?"

| I want to… | Look for… |
|------------|-----------|
| Make the cuddle round longer/shorter | `const ROUND` |
| Make base scratching earn more/less | `const BASE_MS` |
| Make the sweet-spot bonuses bigger/smaller | `SPOT_BONUS_1/2/3` |
| Make spots move faster / appear more | `spotTTL` / `const n =` in `rollSpots()` |
| Add/move a scratch spot on the pet | `const ANCHORS` |
| Change how many hurdles per run | `const COURSE_HURDLES` |
| Make the course faster / ramp harder | `COURSE_SPEED0` / `SPEED_RAMP` / `COURSE_SPEED_MAX` |
| Change the jump / hold-to-leap feel | `JUMP_V` / `JUMP_GRAV` / `JUMP_GRAV_HOLD` / `HOLD_MAX_FR` |
| Make hurdles taller / cap their height | `BAR_BASE` / `BAR_RAMP` / `BAR_MAX` |
| Make the course harder/easier (the economy) | `COST_PERFECT` / `COST_GOOD` / `COST_MISS` |
| Recolor the whole game / brand | `:root` (esp. `--brand`, `--paper`) + `manifest.json` |
| Change the pet's looks | `drawDog()` |
| Change the running scene / hurdles art | `drawCourse()` / `drawHurdle()` |
| Edit the landing strip / social links | `#strip` in the HTML |
| Reset the saved pet/progress | clear `nuzz:pet` / `nuzz:progress` in localStorage |
| Play / tune the bird level ("Feed the Nest") | **LEVELS** below · launch `?nest` · `NEST_*` knobs |
| See how people actually play (plays, fail rate, drop-off) | **GAMEPLAY ANALYTICS** above |
| Add/change a tracked event | `track(...)` calls in `index.html`; sink is `functions/api/e.js` |
| Deploy a new version | see **DEPLOY** above |
