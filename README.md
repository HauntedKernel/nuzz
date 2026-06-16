# Nuzz 🐾

**A tiny daily petting game. Just a little bit of petting.**

Play it: **[nuzz.pet](https://nuzz.pet)** · Follow along: **[@nuzz.pet](https://instagram.com/nuzz.pet)** (Instagram / TikTok)

Nuzz is your daily cuteness top-off — a warm, quick minute with your pet, then it lets you go.
Built by two humans, in the open.

---

## How it plays

1. **Name your pet** (first run only — it's remembered).
2. **Cuddle round (10 seconds).** Scratch your pet to bank **bond energy** (🦴). Glowing **sweet
   spots** appear and move around — cover them for big bonus points. This is the fun, explosive half.
3. **Agility course.** Your pet auto-runs a side-scrolling course of **14 hurdles**. **Tap to hop,
   hold to leap higher.** The course speeds up and the bars get taller as you go.
4. **Stamina is the energy you banked.** Each hurdle spends it — clean leaps are cheap, mistimed
   **bonks** are costly. Run dry before the finish and the run ends; clear all 14 for a 🥇 / 🥈 / 🥉
   ribbon.

The whole idea: **affection is the fuel.** You pet because your pet needs the energy for the run.

---

## Tech

A lightweight **HTML5 canvas** game in a single `index.html` (inline CSS + JS — no build step, no
backend, no accounts). It's a **PWA**: installable to your home screen, instant-loading, and works
offline after the first visit. The whole thing is a few small files on purpose — it opens and plays
in seconds.

## Run it locally

It's just a web page — open `index.html` in a browser, or serve the folder:

```bash
npx serve .        # or: python -m http.server
```

(A service worker needs HTTPS or `localhost` to register, so use a local server to test PWA bits.)

## Project structure

| Path | What it is |
|------|------------|
| `index.html` | The entire game — HTML, styling, and logic in one file. |
| `manifest.json` | PWA manifest (name, icons, theme color). |
| `sw.js` | Service worker (stale-while-revalidate caching → instant + self-updating). |
| `icons/` | App icons (placeholder heart mark; regenerate with `node tools/make-icons.js`). |
| `HANDOFF.md` | **The important doc** — how the game works, every tunable number, deploy steps, and the roadmap. Read this before changing anything. |

## Deploy

Hosted on **Cloudflare Pages** at **nuzz.pet**. Full deploy steps and every tuning knob live in
**[HANDOFF.md](HANDOFF.md)**.

## Status

Early but live. Chapter 1 (petting → agility course) is shipped. Next up: more obstacles, an
end-of-round share, and a second animal with its own way to bond. See the roadmap in `HANDOFF.md`.

---

*Nuzz is made with care. Be kind to your pets. 🧡*
