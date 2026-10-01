"""
B1 renderer: turns an E1 density into SVG ridge lines.

1. Field. The density becomes a smooth scalar field whose contours are evenly
   spaced ridges: inside the visited region (density >= T_VISITED) it follows
   the density's own contour shapes; outside it grows with distance, giving
   N_OUT offset outlines around where the song goes. The drawing mask is that
   silhouette minus near-flat areas (the negative-space rule).
2. Streamlines. Evenly spaced lines are traced along the contours
   (Jobard-Lefer style): seed at the densest cell, trace both ways with RK2
   midpoint steps, queue perpendicular seeds, fall back to a lattice.

Hero and thumbnail share the field but are traced separately at different
line spacings; the thumbnail is never a scaled-down hero.

Faithful port of the research reference (b1render.py, render() in
encodings_study.py). Arithmetic is written in the same order as the
reference so the output matches it exactly; keep it that way.
"""

import math
from dataclasses import dataclass

import numpy as np
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates

from song_dna.song_fingerprint.constants import (
    C,
    COORDINATE_DECIMALS,
    CORNER_SMOOTH,
    DREF_HEADROOM,
    DTEST_FACTOR,
    FLAT_FACTOR,
    GRADIENT_EPSILON,
    HERO_DSEP,
    HERO_POINT_STRIDE,
    HERO_SIZE,
    LOOP_CLOSE_FACTOR,
    LOOP_MIN_POINTS,
    MAX_STEPS,
    MIN_LEN,
    N_OUT,
    ORIENTATION_MIN_MAGNITUDE,
    ORIENTATION_SIGMA,
    S,
    SEED_CLEARANCE_FACTOR,
    SEED_EVERY,
    SEED_OFFSET,
    SPACING,
    STEP,
    T_VISITED,
    THUMB_DSEP,
    THUMB_POINT_STRIDE,
    THUMB_SIZE,
    VIEW_END,
    VIEW_SIZE,
    VIEW_START,
)

Point = tuple[float, float]


@dataclass
class Field:
    """
    Everything both tracings share, in view coordinates (376 x 376 cells,
    x = column, y = row). c2/s2 are the blurred doubled-angle ridge
    orientation (cos 2a, sin 2a), which treats a and a + 180 degrees alike.
    """

    region: np.ndarray
    silhouette: np.ndarray
    mask: np.ndarray
    c2: np.ndarray
    s2: np.ndarray
    seed: Point


@dataclass
class RenderedFingerprint:
    hero: str
    thumb: str


def production_dref(densities: list[np.ndarray]) -> float:
    """1.2 x the largest density cell across every given density (order-independent)."""
    return DREF_HEADROOM * max(float(density.max()) for density in densities)


def build_field(density: np.ndarray, dref: float) -> Field:
    """Build the B1 field, drawing mask and orientation from a 556 x 556 density."""
    phi_t = math.sqrt(math.log(dref / T_VISITED))
    region = density >= T_VISITED
    inner = np.sqrt(np.log(np.maximum(dref / np.maximum(density, T_VISITED), 1.0)))
    dist = distance_transform_edt(~region)
    phi = np.where(region, inner, phi_t + dist / C)
    view = slice(VIEW_START, VIEW_END)
    phi_b = gaussian_filter(phi, CORNER_SMOOTH)[view, view]

    silhouette = phi_b <= phi_t + (N_OUT + 0.5) * S
    gy, gx = np.gradient(phi_b)
    gm = np.hypot(gx, gy)
    mask = silhouette & ~(gm < S / (FLAT_FACTOR * SPACING))

    # Ridges run along the contours: perpendicular to the gradient.
    angle = np.arctan2(gy, gx) + math.pi / 2
    c2 = gaussian_filter(np.where(gm < GRADIENT_EPSILON, 0, np.cos(2 * angle)), ORIENTATION_SIGMA)
    s2 = gaussian_filter(np.where(gm < GRADIENT_EPSILON, 0, np.sin(2 * angle)), ORIENTATION_SIGMA)

    # Densest cell in the view; argmax takes the first in row-major order on ties.
    view_density = density[view, view]
    peak_row, peak_col = np.unravel_index(np.argmax(view_density), view_density.shape)
    seed = (peak_col + SEED_OFFSET[0], peak_row + SEED_OFFSET[1])

    return Field(region=region[view, view], silhouette=silhouette, mask=mask, c2=c2, s2=s2, seed=seed)


class Streamlines:
    """One evenly spaced tracing of a field at line spacing `dsep` (cells)."""

    def __init__(self, field: Field, dsep: float):
        self.c2, self.s2, self.mask = field.c2, field.s2, field.mask
        self.dsep = dsep
        # Written as the reference does (DTEST scaled from the base spacing).
        self.dtest = DTEST_FACTOR * SPACING * dsep / SPACING
        self.h, self.w = self.mask.shape
        # Spatial hash of accepted points, bucket size dsep.
        self.buckets: dict[tuple[int, int], list[Point]] = {}

    def orient(self, x: float, y: float) -> Point | None:
        """Unit ridge direction at (x, y), bilinearly sampled; None at a singularity."""
        c = map_coordinates(self.c2, [[y], [x]], order=1)[0]
        s = map_coordinates(self.s2, [[y], [x]], order=1)[0]
        if math.hypot(c, s) < ORIENTATION_MIN_MAGNITUDE:
            return None
        a = 0.5 * math.atan2(s, c)
        return math.cos(a), math.sin(a)

    def inside(self, x: float, y: float) -> bool:
        # Nearest cell via Python's round() (half to even), as the reference.
        xi, yi = int(round(x)), int(round(y))
        return 0 <= xi < self.w and 0 <= yi < self.h and self.mask[yi, xi]

    def near(self, x: float, y: float, d: float) -> bool:
        """True if any point of an already accepted line is closer than d."""
        bx, by = int(x // self.dsep), int(y // self.dsep)
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                for (px, py) in self.buckets.get((bx + i, by + j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < d * d:
                        return True
        return False

    def add(self, points: list[Point]) -> None:
        for (x, y) in points:
            self.buckets.setdefault((int(x // self.dsep), int(y // self.dsep)), []).append((x, y))

    def trace(self, x: float, y: float, sign: int) -> list[Point]:
        """Follow the ridge from (x, y) in one direction (sign +1 / -1), RK2 midpoint."""
        points: list[Point] = []
        prev = None
        for _ in range(MAX_STEPS):
            o = self.orient(x, y)
            if o is None:
                break
            dx, dy = o
            # Orientation is only defined up to sign: keep heading the same way.
            if prev is None:
                dx, dy = dx * sign, dy * sign
            elif dx * prev[0] + dy * prev[1] < 0:
                dx, dy = -dx, -dy
            o2 = self.orient(x + dx * STEP / 2, y + dy * STEP / 2)
            if o2 is None:
                break
            ex, ey = o2
            if ex * dx + ey * dy < 0:
                ex, ey = -ex, -ey
            nx, ny = x + ex * STEP, y + ey * STEP
            if not self.inside(nx, ny) or self.near(nx, ny, self.dtest):
                break
            if (
                len(points) > LOOP_MIN_POINTS
                and (nx - points[0][0]) ** 2 + (ny - points[0][1]) ** 2 < (STEP * LOOP_CLOSE_FACTOR) ** 2
            ):
                points.append((nx, ny))
                break
            points.append((nx, ny))
            prev, x, y = (ex, ey), nx, ny
        return points

    def run(self, seed: Point) -> list[list[Point]]:
        """Trace lines from `seed`, then queued perpendicular seeds, then the lattice."""
        lines: list[list[Point]] = []
        queue = [seed]
        step = int(self.dsep)
        lattice = [
            (x + 0.5, y + 0.5)
            for y in range(0, self.h, step)
            for x in range(0, self.w, step)
            if self.mask[y, x]
        ]
        lattice_index = 0
        while queue or lattice_index < len(lattice):
            if not queue:
                queue.append(lattice[lattice_index])
                lattice_index += 1
            sx, sy = queue.pop(0)
            if not self.inside(sx, sy) or self.near(sx, sy, self.dsep * SEED_CLEARANCE_FACTOR):
                continue
            line = self.trace(sx, sy, -1)[::-1] + [(sx, sy)] + self.trace(sx, sy, 1)
            if len(line) * STEP < MIN_LEN:
                continue
            self.add(line)
            lines.append(line)
            for k in range(0, len(line) - 1, SEED_EVERY):
                (x0, y0), (x1, y1) = line[k], line[k + 1]
                tx, ty = x1 - x0, y1 - y0
                norm = math.hypot(tx, ty) or 1
                nx, ny = -ty / norm, tx / norm
                queue.append((x0 + nx * self.dsep, y0 + ny * self.dsep))
                queue.append((x0 - nx * self.dsep, y0 - ny * self.dsep))
        return lines


def trace_lines(field: Field, dsep: float) -> list[list[Point]]:
    """An independent tracing of `field` at line spacing `dsep`."""
    return Streamlines(field, dsep).run(field.seed)


def to_path(lines: list[list[Point]], scale: float, stride: int) -> str:
    """
    SVG path data: one "M...L..." run per line, every `stride`-th point (plus
    the last), coordinates x `scale`, one decimal place, no separators.
    """
    out = []
    for line in lines:
        points = line[::stride] + ([line[-1]] if (len(line) - 1) % stride else [])
        out.append(
            "M"
            + "L".join(
                f"{x * scale:.{COORDINATE_DECIMALS}f} {y * scale:.{COORDINATE_DECIMALS}f}"
                for x, y in points
            )
        )
    return "".join(out)


def render_fingerprint(density: np.ndarray, dref: float) -> RenderedFingerprint:
    """Hero (viewBox 0 0 220 220) and thumbnail (0 0 52 52) paths for one density."""
    field = build_field(density, dref)
    hero = trace_lines(field, HERO_DSEP)
    thumb = trace_lines(field, THUMB_DSEP)
    return RenderedFingerprint(
        hero=to_path(hero, HERO_SIZE / VIEW_SIZE, HERO_POINT_STRIDE),
        thumb=to_path(thumb, THUMB_SIZE / VIEW_SIZE, THUMB_POINT_STRIDE),
    )
