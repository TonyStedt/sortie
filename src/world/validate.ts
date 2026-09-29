import { PLAYER, SCREEN_W, WORLD } from '../core/config';
import { sprites } from '../gfx/sprites';
import type { World } from './world';

/**
 * Dev-time sanity checks on the mission's terrain. Returns human-readable
 * problems (empty if all is well):
 * - each stage should end at the height the next one starts (no seam);
 * - a base loop must jump back invisibly, contain the base and no fuel tanks;
 * - a ship restarting at any section start must be able to fly on through
 *   the rest of the mission. This tracks every height the ship could reach,
 *   frame by frame, using its real shape and vertical speed (its x stays at
 *   the start position, which is the cautious assumption).
 */
export function validateMission(world: World): string[] {
  const problems: string[] = [];
  const { stages, sectionStarts } = world;

  stages.forEach((stage, i) => {
    const next = stages[(i + 1) % stages.length];
    const endFloor = stage.floor[stage.floor.length - 1][1];
    const endCeil = stage.ceiling ? stage.ceiling[stage.ceiling.length - 1][1] : 0;
    const nextFloor = next.floor[0][1];
    const nextCeil = next.ceiling ? next.ceiling[0][1] : 0;
    if (endFloor !== nextFloor || endCeil !== nextCeil) {
      problems.push(`${stage.label} ends at a different height than ${next.label} starts`);
    }
  });

  stages.forEach((stage, i) => {
    const loop = stage.baseLoop;
    if (!loop) return;
    const start = sectionStarts[i];
    // Everything visible at the jump (plus a margin) must be identical.
    for (let k = 0; k < SCREEN_W + 16; k++) {
      const a = start + loop.from + k;
      const b = start + loop.to + k;
      if (world.floorY(a) !== world.floorY(b) || world.ceilY(a) !== world.ceilY(b)) {
        problems.push(`${stage.label}: base loop jump is visible (terrain differs at +${k})`);
        break;
      }
    }
    const inside = (stage.targets ?? []).filter((t) => t.x >= loop.from && t.x < loop.to);
    if (!inside.some((t) => t.kind === 'base')) {
      problems.push(`${stage.label}: base loop doesn't contain the base`);
    }
    if (inside.some((t) => t.kind === 'fuel')) {
      problems.push(`${stage.label}: base loop contains fuel tanks`);
    }
  });

  const ship = sprites().ship;
  /** Range of ship top-y values that don't touch rock at this scroll. */
  const open = (scroll: number): [number, number] => {
    let lo: number = PLAYER.minY;
    let hi: number = PLAYER.maxY;
    for (let c = 0; c < ship.w; c++) {
      if (ship.colTop[c] < 0) continue;
      const wx = scroll + PLAYER.startX + c;
      lo = Math.max(lo, world.ceilY(wx) - ship.colTop[c]);
      hi = Math.min(hi, world.floorY(wx) - 1 - ship.colBottom[c]);
    }
    return [lo, hi];
  };

  sectionStarts.forEach((start, i) => {
    const label = stages[i].label;
    const [lo, hi] = open(start);
    if (PLAYER.startY < lo || PLAYER.startY > hi) {
      problems.push(`${label}: the restart position is inside rock`);
      return;
    }
    let a: number = PLAYER.startY;
    let b: number = PLAYER.startY;
    for (let s = start; s < start + world.length; s += WORLD.scrollSpeed) {
      const [lo2, hi2] = open(s);
      a = Math.max(a - PLAYER.speedY, lo2);
      b = Math.min(b + PLAYER.speedY, hi2);
      if (a > b) {
        // Report where the ship's nose is, which is where the blockage is.
        const wx = (s + PLAYER.startX + ship.w) % world.length;
        const where = stages[world.section(wx)];
        const localX = wx - sectionStarts[world.section(wx)];
        problems.push(
          `Starting from ${label}, the ship can't get past ${where.label} x ${localX}`,
        );
        return;
      }
    }
  });

  return problems;
}
