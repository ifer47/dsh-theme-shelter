"""Generate the three illustrated wallpapers that ship next to the artwork.

The style is deliberately graphic rather than photographic: smooth spline
silhouettes, a flat colour ramp per ridge, soft snow caps, bokeh, and an aurora
built from vertical curtains. That reads as a designed illustration instead of
a failed painting, and it stays reproducible from this file alone.

    python tools/make-wallpapers.py [output-dir]

Writes <id>.webp (2560x1440) and <id>-thumb.webp (384x216) for ridge, rain and
aurora. The default painting (jinxi) is not generated here.
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 2560, 1440
THUMB = (384, 216)
# Polygons are drawn at 2x and shrunk, which is what keeps the silhouettes
# smooth without an anti-aliasing library.
SS = 2

rng = np.random.default_rng(20261112)


# ----------------------------------------------------------------- primitives

def vertical_ramp(stops):
    """(H, W, 3) float RGB from [(position, (r, g, b)), ...]."""
    ys = np.linspace(0.0, 1.0, H)
    out = np.zeros((H, 3), np.float32)
    for index in range(len(stops) - 1):
        start, color_a = stops[index]
        end, color_b = stops[index + 1]
        band = (ys >= start) & (ys <= end)
        t = ((ys[band] - start) / max(1e-9, end - start))[:, None]
        out[band] = np.array(color_a, np.float32) * (1 - t) + np.array(color_b, np.float32) * t
    out[: max(1, int(stops[0][0] * H))] = np.array(stops[0][1], np.float32)
    out[min(H - 1, int(stops[-1][0] * H)) :] = np.array(stops[-1][1], np.float32)
    return np.repeat(out[:, None, :], W, axis=1)


def spline(points, samples=600):
    """Catmull-Rom through the control points, returned as y(x) over [0, 1]."""
    pts = np.array(points, np.float32)
    # pad the ends so the curve reaches both edges
    padded = np.vstack([pts[0], pts, pts[-1]])
    curves = []
    steps = max(2, samples // (len(pts) - 1))
    for index in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[index - 1 : index + 3]
        t = np.linspace(0, 1, steps, endpoint=False)[:, None]
        curve = 0.5 * (
            2 * p1
            + (-p0 + p2) * t
            + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t**2
            + (-p0 + 3 * p1 - 3 * p2 + p3) * t**3
        )
        curves.append(curve)
    curves.append(np.array([padded[-2]], np.float32))
    line = np.vstack(curves)
    xs = line[:, 0]
    ys = line[:, 1]
    grid = np.linspace(0.0, 1.0, W)
    return np.interp(grid, xs, ys)


def blur_channel(channel, radius):
    image = Image.fromarray(np.clip(channel * 255.0, 0, 255).astype(np.uint8), "L")
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255.0


def blend(base, color, alpha):
    mask = np.clip(alpha, 0, 1)
    if mask.ndim == 2:
        mask = mask[..., None]
    return base * (1 - mask) + np.array(color, np.float32) * mask


def radial(cx, cy, radius, power=1.0):
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    distance = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / max(1.0, radius)
    return np.clip(1.0 - distance, 0, 1) ** power


def add_glow(base, cx, cy, radius, color, strength, power=1.6):
    return base + np.array(color, np.float32) * (radial(cx, cy, radius, power) * strength)[..., None]


def polygon_mask(points):
    """A feathered 0..1 mask from a filled polygon."""
    image = Image.new("L", (W * SS, H * SS), 0)
    draw = ImageDraw.Draw(image)
    draw.polygon([(x * SS, y * SS) for x, y in points], fill=255)
    image = image.resize((W, H), Image.LANCZOS)
    return np.asarray(image, np.float32) / 255.0


def ridge(base, control, color, fill_shade=0.3, snow=0.0, snow_color=(226, 236, 250), bottom=1.0):
    """Fill below a spline ridge, with an optional snow cap along its crest."""
    line = spline(control) * H
    xs = np.arange(W)
    top = np.stack([xs, line], axis=1)
    polygon = np.vstack([top, [[W - 1, bottom * H], [0, bottom * H]]])
    mask = polygon_mask(polygon)

    ys = np.arange(H, dtype=np.float32)[:, None]
    depth = np.clip((ys - line[None, :]) / (H * 0.8), 0, 1)
    shaded = np.array(color, np.float32)[None, None, :] * (1.0 - fill_shade * depth[..., None])
    out = base * (1 - mask[..., None]) + shaded * mask[..., None]

    if snow > 0:
        # the cap is the ridge shifted down by a variable thickness, feathered,
        # and broken up along x so it does not read as a drawn ribbon
        thickness = 4 + 20 * smooth_noise(W, 700)
        cap_polygon = np.vstack([top, np.stack([xs[::-1], (line + thickness)[::-1]], axis=1)])
        cap = polygon_mask(cap_polygon) * mask
        cap = blur_channel(cap, 2.6)
        # snow sits on flatter ground: weight it by the local slope
        slope = np.abs(np.gradient(line))
        slope = blur_channel(np.clip(slope / 1.6, 0, 1)[None, :].repeat(H, 0), 6.0)
        coverage = 0.35 + 0.65 * smooth_noise(W, 1500)
        cap = cap * (1.0 - 0.55 * slope) * coverage[None, :] * snow
        out = blend(out, snow_color, cap)
    return out


def smooth_noise(count, window):
    steps = rng.normal(0.0, 1.0, count)
    kernel = np.hanning(max(5, int(window) | 1))
    kernel /= kernel.sum()
    walk = np.convolve(steps, kernel, mode="same")
    walk -= walk.min()
    return walk / (walk.max() + 1e-9)


def star_field(base, count, limit=0.72, strength=0.85):
    layer = np.zeros((H, W), np.float32)
    image = Image.fromarray(layer, "F")
    del image
    canvas = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(canvas)
    for _ in range(count):
        x = rng.uniform(0, W)
        y = rng.uniform(0, H * limit)
        size = rng.uniform(0.5, 1.7)
        brightness = int(255 * rng.uniform(0.12, 1.0) ** 1.7)
        draw.ellipse((x - size, y - size, x + size, y + size), fill=brightness)
    layer = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.5)), np.float32) / 255.0
    return blend(base, (226, 236, 255), layer * strength)


def bokeh(base, count, color_a, color_b, y_range, size_range, strength):
    """Soft out-of-focus light discs: the classic rainy-window look."""
    layer = np.zeros((H, W, 3), np.float32)
    for _ in range(count):
        cx = rng.uniform(-0.05, 1.05) * W
        cy = rng.uniform(*y_range) * H
        radius = rng.uniform(*size_range) * W
        color = np.array(color_a, np.float32) * rng.uniform(0, 1) + np.array(color_b, np.float32) * (1 - rng.uniform(0, 1))
        strength_here = rng.uniform(0.25, 0.85) * strength
        disc = radial(cx, cy, radius, 1.1)[..., None]
        layer += color * disc * strength_here
    return base + layer


def grain(base, amount=2.2, vignette=0.26):
    out = base + rng.normal(0.0, amount, (H, W, 1)).astype(np.float32)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = (xs - W / 2) / (W / 2)
    ny = (ys - H / 2) / (H / 2)
    falloff = np.clip(1.0 - 0.5 * (nx**2 + ny**2), 0, 1) ** 1.4
    return out * (1 - vignette + vignette * falloff)[..., None]


def finish(base):
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")


# ------------------------------------------------------------------ paintings

def paint_forest():
    """夜林: a misty wood at night, with a low moon and a few fireflies."""
    base = vertical_ramp([
        (0.00, (3, 6, 11)),
        (0.34, (7, 14, 22)),
        (0.60, (12, 24, 33)),
        (0.80, (9, 18, 25)),
        (1.00, (3, 6, 9)),
    ])
    base = star_field(base, 240, limit=0.40, strength=0.45)

    moon_x, moon_y, moon_r = W * 0.735, H * 0.155, W * 0.016
    base = add_glow(base, moon_x, moon_y, moon_r * 10.0, (118, 156, 210), 0.22)
    base = blend(base, (245, 249, 255), blur_channel(radial(moon_x, moon_y, moon_r, 0.28), 1.4) * 0.92)

    # a wide shaft of moonlight angling down through the trunks
    canvas = Image.new("L", (W, H), 0)
    ImageDraw.Draw(canvas).polygon([
        (moon_x - moon_r, moon_y), (moon_x + moon_r, moon_y),
        (moon_x + W * 0.22, H), (moon_x - W * 0.30, H),
    ], fill=255)
    shaft = np.asarray(canvas.filter(ImageFilter.GaussianBlur(80)), np.float32) / 255.0
    base = blend(base, (150, 180, 216), shaft * 0.07)

    # far to near: hazier, thinner trunks behind; near ones are almost black
    layers = [
        (10.0, 0.40, (30, 46, 62), 30, (3, 7), (0.04, 0.16)),
        (4.5, 0.62, (16, 26, 38), 20, (6, 12), (0.02, 0.12)),
        (1.4, 1.00, (3, 5, 9), 12, (12, 26), (0.00, 0.10)),
    ]
    for index, (blur, alpha, color, count, widths, tops) in enumerate(layers):
        if index > 0:
            canvas = Image.new("L", (W, H), 0)
            cy = H * (0.52 + 0.08 * index)
            ImageDraw.Draw(canvas).rectangle((0, cy - H * 0.05, W, cy + H * 0.05), fill=255)
            fog_mask = np.asarray(canvas.filter(ImageFilter.GaussianBlur(H * 0.05)), np.float32) / 255.0
            base = blend(base, (128, 162, 190), fog_mask * 0.13)

        canvas = Image.new("L", (W, H), 0)
        draw = ImageDraw.Draw(canvas)
        for _ in range(count):
            x = rng.uniform(-0.02, 1.02) * W
            width = rng.uniform(*widths)
            top = rng.uniform(*tops) * H
            draw.polygon([(x - width / 2, H), (x - width * 0.34, top),
                          (x + width * 0.34, top), (x + width / 2, H)], fill=255)

        mask = np.asarray(canvas.filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255.0
        base = blend(base, color, mask * alpha)

    # ground fog, then fireflies
    canvas = Image.new("L", (W, H), 0)
    ImageDraw.Draw(canvas).rectangle((0, H * 0.86, W, H), fill=255)
    ground = np.asarray(canvas.filter(ImageFilter.GaussianBlur(H * 0.06)), np.float32) / 255.0
    base = blend(base, (110, 140, 165), ground * 0.10)

    for _ in range(18):
        fx = rng.uniform(0.06, 0.94) * W
        fy = rng.uniform(0.55, 0.94) * H
        base = add_glow(base, fx, fy, rng.uniform(0.003, 0.009) * W, (255, 198, 128),
                        rng.uniform(0.3, 0.75), power=2.0)

    return finish(grain(base, 2.0, 0.30))

def paint_rain():
    """檐雨: a wet pane, warm bokeh, an eave with a lantern, and falling rain."""
    base = vertical_ramp([
        (0.00, (4, 8, 12)),
        (0.35, (8, 17, 23)),
        (0.62, (13, 28, 35)),
        (0.78, (17, 35, 42)),
        (0.88, (10, 21, 26)),
        (1.00, (5, 11, 14)),
    ])

    # warm window bokeh behind the glass, denser toward the bottom
    base = bokeh(base, 34, (255, 196, 128), (255, 150, 74),
                 (0.55, 0.95), (0.012, 0.055), 0.75)
    base = bokeh(base, 14, (120, 200, 215), (70, 140, 180),
                 (0.50, 0.80), (0.02, 0.07), 0.28)

    # wet reflections: long soft vertical smears under each cluster
    for _ in range(18):
        x = rng.uniform(0.05, 0.95) * W
        y = rng.uniform(0.72, 0.95) * H
        length = rng.uniform(0.06, 0.16) * H
        width = rng.uniform(0.004, 0.014) * W
        mask = np.zeros((H, W), np.float32)
        canvas = Image.new("L", (W, H), 0)
        ImageDraw.Draw(canvas).rectangle((x - width / 2, y, x + width / 2, y + length), fill=120)
        mask = np.asarray(canvas.filter(ImageFilter.GaussianBlur(width * 0.9)), np.float32) / 255.0
        base = blend(base, (255, 176, 104), mask * rng.uniform(0.10, 0.26))

    # rain: thin strokes, a few of them bright
    canvas = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(canvas)
    for _ in range(1100):
        x = rng.uniform(-80, W + 80)
        y = rng.uniform(-80, H + 80)
        length = rng.uniform(30, 170)
        draw.line((x, y, x - length * 0.16, y + length), fill=int(rng.uniform(10, 70)))
    rain = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255.0
    base = blend(base, (190, 220, 232), np.clip(rain * 0.5, 0, 1))

    # the eave: a dark tiled band along the top with a soft underside
    eave = np.zeros((H, W), np.float32)
    canvas = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(canvas)
    draw.polygon([
        (0, 0), (W, 0), (W, 0.115 * H),
        (0.80 * W, 0.155 * H), (0.58 * W, 0.125 * H),
        (0.34 * W, 0.175 * H), (0.14 * W, 0.140 * H), (0, 0.185 * H),
    ], fill=255)
    eave = np.asarray(canvas.filter(ImageFilter.GaussianBlur(3.0)), np.float32) / 255.0
    base = blend(base, (3, 5, 7), eave)

    # water gathering along the eave edge and dripping
    for _ in range(26):
        x = rng.uniform(0.02, 0.98) * W
        top = 0.16 * H + rng.uniform(-0.02, 0.03) * H
        length = rng.uniform(0.02, 0.16) * H
        width = rng.uniform(1.2, 3.2)
        canvas = Image.new("L", (W, H), 0)
        ImageDraw.Draw(canvas).line((x, top, x, top + length), fill=140, width=int(width * 2))
        drop = np.asarray(canvas.filter(ImageFilter.GaussianBlur(1.1)), np.float32) / 255.0
        base = blend(base, (206, 226, 236), drop * 0.22)

    # beads of water clinging to the pane, with a highlight on each
    beads = []
    canvas = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(canvas)
    for _ in range(90):
        x = rng.uniform(0, W)
        y = rng.uniform(0.18 * H, H)
        radius = rng.uniform(1.4, 6.2) * (1.0 + rng.uniform(0, 0.4))
        beads.append((x, y, radius))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=int(rng.uniform(50, 150)))
    body = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.7)), np.float32) / 255.0
    base = blend(base, (190, 218, 234), body * 0.45)

    canvas = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(canvas)
    for x, y, radius in beads:
        spark = max(0.6, radius * 0.36)
        hx, hy = x - radius * 0.32, y - radius * 0.34
        draw.ellipse((hx - spark, hy - spark, hx + spark, hy + spark), fill=210)
    highlight = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.5)), np.float32) / 255.0
    base = blend(base, (255, 255, 255), highlight * 0.5)

    # the lantern under the eave: the warm anchor of the whole frame
    lx, ly = W * 0.78, H * 0.225
    base = add_glow(base, lx, ly, W * 0.07, (255, 146, 66), 0.42)
    base = add_glow(base, lx, ly, W * 0.016, (255, 208, 158), 0.9, power=2.0)
    base = blend(base, (255, 170, 96), radial(lx, ly, W * 0.0075, 0.7))

    base = bokeh(base, 8, (255, 210, 170), (255, 180, 120), (0.2, 0.6), (0.03, 0.09), 0.12)
    return finish(grain(base, 2.6, 0.30))


def paint_aurora():
    """极光: vertical curtains over a distant ridge, drawn as light."""
    base = vertical_ramp([
        (0.00, (3, 6, 12)),
        (0.30, (5, 11, 22)),
        (0.55, (8, 18, 30)),
        (0.70, (10, 22, 32)),
        (1.00, (3, 6, 10)),
    ])
    base = star_field(base, 460, limit=0.55)

    xs = np.arange(W, dtype=np.float32)
    ys = np.arange(H, dtype=np.float32)[:, None]

    def curtain(peaks, top, bottom, color_ramp, strength, streak_seed):
        intensity = np.zeros(W, np.float32)
        for center, width, height, exponent in peaks:
            center_px = center * W
            width_px = width * W
            intensity = np.maximum(
                intensity,
                height * np.exp(-((xs - center_px) ** 2) / (2 * width_px**2)) ** exponent,
            )
        # vertical striations make it read as a curtain, not a cloud
        streak_rng = np.random.default_rng(streak_seed)
        streak = np.convolve(streak_rng.normal(0, 1, W), np.hanning(9) / np.hanning(9).sum(), "same")
        streak = 1.0 + 0.55 * (streak / (np.abs(streak).max() + 1e-9))
        # the lower edge wanders instead of ending on one straight line
        lower = bottom + 0.06 * (smooth_noise(W, 900) - 0.5)
        v = np.clip((ys / H - top) / (lower[None, :] - top), 0, 1)
        vertical = np.clip(np.sin(np.pi * v), 0, 1) ** 0.7
        vertical = np.where((ys / H) <= lower[None, :], vertical, 0.0)
        field = intensity[None, :] * vertical * streak[None, :]
        field = blur_channel(np.clip(field, 0, 1), 2.0)
        field = blur_channel(field, 14.0) * 0.55 + field * 0.45
        # colour runs from green low to violet high
        ramp_w = np.clip((ys / H - top) / np.maximum(1e-6, lower[None, :] - top), 0, 1)
        ramp = (
            np.array(color_ramp[0], np.float32) * (1 - ramp_w)[..., None]
            + np.array(color_ramp[1], np.float32) * ramp_w[..., None]
        )
        glow = ramp * (field * strength)[..., None]
        return base + glow * (1.0 - base / 255.0)

    base = curtain(
        [(0.12, 0.045, 0.85, 2.0), (0.26, 0.06, 1.0, 1.8), (0.38, 0.035, 0.55, 2.2),
         (0.52, 0.07, 0.9, 1.9), (0.66, 0.04, 0.6, 2.2), (0.78, 0.06, 0.8, 2.0),
         (0.90, 0.05, 0.5, 2.2)],
        0.02, 0.66, [(70, 235, 170), (150, 110, 245)], 0.9, 11,
    )
    base = curtain(
        [(0.05, 0.035, 0.4, 2.2), (0.20, 0.03, 0.55, 2.2), (0.44, 0.05, 0.35, 2.4),
         (0.60, 0.04, 0.5, 2.2), (0.83, 0.045, 0.4, 2.2)],
        0.05, 0.55, [(60, 200, 210), (90, 150, 240)], 0.5, 23,
    )

    # haze where the light meets the ground, then a dark foreground ridge
    haze = np.zeros((H, W), np.float32)
    canvas = Image.new("L", (W, H), 0)
    ImageDraw.Draw(canvas).rectangle((0, 0.66 * H, W, 0.80 * H), fill=90)
    haze = np.asarray(canvas.filter(ImageFilter.GaussianBlur(38)), np.float32) / 255.0
    base = blend(base, (54, 96, 116), haze * 0.5)

    base = ridge(base, [(0.0, 0.815), (0.10, 0.775), (0.18, 0.805), (0.30, 0.760),
                        (0.40, 0.795), (0.52, 0.755), (0.62, 0.800), (0.74, 0.765),
                        (0.86, 0.800), (0.94, 0.775), (1.0, 0.810)],
                 (12, 20, 30), fill_shade=0.12, snow=0.16, snow_color=(90, 124, 150))
    base = ridge(base, [(0.0, 0.960), (0.08, 0.905), (0.15, 0.945), (0.26, 0.890),
                        (0.34, 0.935), (0.46, 0.885), (0.55, 0.930), (0.68, 0.890),
                        (0.78, 0.935), (0.88, 0.900), (1.0, 0.945)],
                 (5, 8, 12), fill_shade=0.1, snow=0.10, snow_color=(60, 90, 118))

    # a handful of pines on the near ridge give the scale
    canvas = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(canvas)
    for _ in range(14):
        x = rng.uniform(0.05, 0.95) * W
        ground = 0.945 * H - rng.uniform(0, 0.02) * H
        height = rng.uniform(0.03, 0.075) * H
        width = height * 0.26
        for tier in range(3):
            top = ground - height * (0.45 + 0.25 * tier)
            spread = width * (0.45 + 0.3 * tier)
            draw.polygon([(x, top), (x - spread, ground - height * 0.12 * tier),
                          (x + spread, ground - height * 0.12 * tier)], fill=255)
    pines = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.8)), np.float32) / 255.0
    base = blend(base, (2, 3, 5), pines)

    return finish(grain(base, 1.8, 0.30))


# --------------------------------------------------------------------- output

def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "wallpapers"
    os.makedirs(out_dir, exist_ok=True)
    for name, painter in (("forest", paint_forest), ("rain", paint_rain), ("aurora", paint_aurora)):
        image = painter()
        image.save(os.path.join(out_dir, name + ".webp"), "WEBP", quality=88, method=6)
        image.resize(THUMB, Image.LANCZOS).save(
            os.path.join(out_dir, name + "-thumb.webp"), "WEBP", quality=80, method=6
        )
        size = os.path.getsize(os.path.join(out_dir, name + ".webp")) // 1024
        print(name, image.size, str(size) + " KB")


if __name__ == "__main__":
    main()
