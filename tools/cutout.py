#!/usr/bin/env python
"""Turn a kitty image into a game-ready transparent sprite.

Usage: python tools/cutout.py <input> <output.png> [maxdim]
- removes the background (AI matting via rembg)
- auto-crops to the subject
- resizes so the longest side == maxdim (default 256), preserving aspect + alpha
"""
import sys
from rembg import remove
from PIL import Image

inp = sys.argv[1]
outp = sys.argv[2]
maxdim = int(sys.argv[3]) if len(sys.argv) > 3 else 256

img = Image.open(inp).convert("RGBA")
out = remove(img)                      # -> RGBA with cut-out alpha
bbox = out.getbbox()                   # trim transparent margins
if bbox:
    out = out.crop(bbox)
w, h = out.size
scale = maxdim / max(w, h)
if scale < 1:
    out = out.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
out.save(outp)
print("saved", outp, out.size)
