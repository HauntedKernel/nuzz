# Space Force Kitties — art assets

The game loads a painted **portrait** per kitty here and falls back to the in-code
drawn headshot if the file is missing. To upgrade a kitty, just replace its file.

## Portrait files (character-select + end screen)
Filename = the kitty's `id` (see `KITTIES` in `../index.html`):

| id          | nickname  | look                                   |
|-------------|-----------|----------------------------------------|
| `cheeto`    | Cheeto    | orange tabby, green eyes, orange rim   |
| `major-tom` | Major Tom | gray tabby, blue eyes, cyan rim        |
| `tabby`     | Tabby     | brown mackerel tabby, green eyes, gold |
| `moonpie`   | Moonpie   | cream/white point cat, blue eyes, pink |

- **Format:** `<id>.jpg` (square). ~512×512 is plenty. Keep each under ~120 KB.
- **Background is fine** — these sit inside a card, no transparency needed.
- Square-crop so the face is centered (CSS uses `object-fit: cover`).

> The current files are PLACEHOLDERS center-cropped from `../refs/`. Replace with
> clean generations. Avoid any image with a stock watermark (don't use refs/...124358).

## Generation prompt (for consistency)
> Cute realistic tabby cat astronaut, clear glass fishbowl space helmet with a glowing
> {RIM} neon rim light, white sci-fi space suit with a metal collar, big sparkly
> expressive eyes, dreamy painterly digital illustration, soft volumetric glow, vibrant
> cosmic nebula background, highly detailed, centered, square.

Swap `{RIM}` for warm-orange (Cheeto) / cyan (Major Tom) / gold (Tabby) / pink (Moonpie).

## In-game kitty sprites (WIRED UP) — `sprites/<id>.png`
The flying kitty loads `sprites/<id>.png` (transparent PNG) and falls back to the drawn
vector kitty if absent. Current files are PLACEHOLDERS (front-facing busts cut from the
refs) — replace with purpose-made art.

**For the final look, generate:** a back/3-quarter view of the kitty *facing up/away*,
full body with jetpack + raised ray-gun, roughly square framing, consistent across all 4.
Background doesn't need to be transparent — generate on any background and run:

```
python tools/cutout.py <input-image> kitties/assets/sprites/<id>.png 320
```

(`tools/cutout.py` uses rembg to remove the background, auto-crop, and resize.) Then I
resync + deploy. Same pipeline works for alien / boss / asteroid sprites later.
