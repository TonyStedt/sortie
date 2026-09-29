import type { Sprite } from '../gfx/sprite';
import type { World } from './world';

/**
 * Pixel-exact sprite vs terrain test. Because rock is solid everywhere above
 * the ceiling line and below the floor line, only each sprite column's
 * topmost and bottommost opaque pixels need checking.
 */
export function spriteHitsTerrain(
  world: World,
  scroll: number,
  sprite: Sprite,
  x: number,
  y: number,
): boolean {
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  for (let c = 0; c < sprite.w; c++) {
    const top = sprite.colTop[c];
    if (top < 0) continue;
    const wx = scroll + sx + c;
    if (sy + sprite.colBottom[c] >= world.floorY(wx)) return true;
    if (sy + top < world.ceilY(wx)) return true;
  }
  return false;
}

/** Pixel-exact overlap of two sprites at screen positions (top-left corners). */
export function spritesOverlap(
  a: Sprite,
  ax: number,
  ay: number,
  b: Sprite,
  bx: number,
  by: number,
): boolean {
  const ax0 = Math.floor(ax);
  const ay0 = Math.floor(ay);
  const bx0 = Math.floor(bx);
  const by0 = Math.floor(by);
  const x0 = Math.max(ax0, bx0);
  const y0 = Math.max(ay0, by0);
  const x1 = Math.min(ax0 + a.w, bx0 + b.w);
  const y1 = Math.min(ay0 + a.h, by0 + b.h);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (a.mask[(y - ay0) * a.w + (x - ax0)] && b.mask[(y - by0) * b.w + (x - bx0)]) {
        return true;
      }
    }
  }
  return false;
}

/** Pixel-exact test of a sprite against a solid rectangle (e.g. a shot's path). */
export function spriteHitsRect(
  s: Sprite,
  sx: number,
  sy: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const sx0 = Math.floor(sx);
  const sy0 = Math.floor(sy);
  const x0 = Math.max(sx0, Math.floor(rx));
  const y0 = Math.max(sy0, Math.floor(ry));
  const x1 = Math.min(sx0 + s.w, Math.floor(rx) + rw);
  const y1 = Math.min(sy0 + s.h, Math.floor(ry) + rh);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (s.mask[(y - sy0) * s.w + (x - sx0)]) return true;
    }
  }
  return false;
}
