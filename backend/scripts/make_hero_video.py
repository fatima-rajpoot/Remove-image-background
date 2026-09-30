import math
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src = Path(r"c:\Users\fatima\background-remover\frontend\public\media\hero-user.jpg")
out = Path(r"c:\Users\fatima\background-remover\frontend\public\media\hero-user.mp4")

W, H = 720, 960
fps = 24
seconds = 5
n = fps * seconds

base = Image.open(src).convert("RGB")
bw, bh = base.size
scale = max(W / bw, H / bh)
nw, nh = int(bw * scale), int(bh * scale)
base = base.resize((nw, nh), Image.Resampling.LANCZOS)
left = (nw - W) // 2
top = (nh - H) // 2
base = base.crop((left, top, left + W, top + H))

checker = Image.new("RGB", (W, H), (232, 238, 233))
draw = ImageDraw.Draw(checker)
tile = 24
c2 = (213, 221, 215)
for y in range(0, H, tile):
    for x in range(0, W, tile):
        if ((x // tile) + (y // tile)) % 2 == 0:
            draw.rectangle([x, y, x + tile - 1, y + tile - 1], fill=c2)

yy, xx = np.mgrid[0:H, 0:W]
cx, cy = W * 0.5, H * 0.44
rx, ry = W * 0.34, H * 0.42
dist = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
mask = np.clip(1.0 - (dist - 0.75) / 0.55, 0.0, 1.0)
mask = (mask * 255).astype(np.uint8)
mask_img = Image.fromarray(mask, mode="L").filter(ImageFilter.GaussianBlur(10))

cutout = Image.composite(base, checker, mask_img)

frames = []
for i in range(n):
    t = i / n
    if t < 0.22:
        blend = 0.0
    elif t < 0.52:
        blend = (t - 0.22) / 0.30
    elif t < 0.78:
        blend = 1.0
    else:
        blend = 1.0 - (t - 0.78) / 0.22

    zoom = 1.0 + 0.04 * math.sin(t * math.pi * 2)
    zw, zh = int(W * zoom), int(H * zoom)
    scene = base.resize((zw, zh), Image.Resampling.BILINEAR)
    cut = cutout.resize((zw, zh), Image.Resampling.BILINEAR)
    ox, oy = (zw - W) // 2, (zh - H) // 2
    scene = scene.crop((ox, oy, ox + W, oy + H))
    cut = cut.crop((ox, oy, ox + W, oy + H))

    frame = Image.blend(scene, cut, blend)
    scan_x = int((-0.2 + (t % 1) * 1.4) * W)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).rectangle(
        [scan_x, 0, scan_x + 50, H],
        fill=(255, 255, 255, 28),
    )
    frame = Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")
    frames.append(np.asarray(frame))

imageio.mimsave(out, frames, fps=fps, codec="libx264", quality=7, pixelformat="yuv420p")
print("wrote", out, "bytes", out.stat().st_size)
