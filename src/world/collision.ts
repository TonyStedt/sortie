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
