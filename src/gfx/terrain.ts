import { PLAYFIELD_BOTTOM, PLAYFIELD_TOP, SCREEN_W } from '../core/config';
import type { World } from '../world/world';

/** Outline thickness, px. Steps and cliffs get a full-height outline too. */
const OUTLINE = 2;

/** Draw the visible slice of terrain, one pixel column at a time. */
export function drawTerrain(ctx: CanvasRenderingContext2D, world: World, scroll: number): void {
  for (let x = 0; x < SCREEN_W; x++) {
    const wx = scroll + x;
    const { fill, outline } = world.stageAt(wx).colors;

    const f = world.floorY(wx);
    if (f < PLAYFIELD_BOTTOM) {
      // Extend the outline down to the lower neighbour so slopes and steps
      // read as a continuous edge.
      const edge = Math.min(
        PLAYFIELD_BOTTOM,
        Math.max(f + OUTLINE, world.floorY(wx - 1), world.floorY(wx + 1)),
      );
      ctx.fillStyle = outline;
      ctx.fillRect(x, f, 1, edge - f);
      ctx.fillStyle = fill;
      ctx.fillRect(x, edge, 1, PLAYFIELD_BOTTOM - edge);
    }

    const c = world.ceilY(wx);
    if (c > PLAYFIELD_TOP) {
      const edge = Math.max(
        PLAYFIELD_TOP,
        Math.min(c - OUTLINE, world.ceilY(wx - 1), world.ceilY(wx + 1)),
      );
      ctx.fillStyle = fill;
      ctx.fillRect(x, PLAYFIELD_TOP, 1, edge - PLAYFIELD_TOP);
      ctx.fillStyle = outline;
      ctx.fillRect(x, edge, 1, c - edge);
    }
  }
}
