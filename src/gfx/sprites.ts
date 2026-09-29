import { PAL } from './palette';
import { buildSprite, type Sprite, type SpriteDef } from './sprite';

/**
 * Original sprite designs for SORTIE. Keep each within 3 colours.
 * The ship faces right; the world scrolls towards it from the right.
 */

// 1 = hull, 2 = trim / wing, 3 = canopy
const SHIP_COLORS = [PAL.white, PAL.red, PAL.cyan] as const;

const DEFS = {
  ship: {
    colors: SHIP_COLORS,
    rows: [
      '22..............',
      '212.............',
      '2112............',
      '21112....333....',
      '211111113333311.',
      '2111111111111111',
      '2211111111111...',
      '.22222222.......',
      '...2112.........',
      '....22..........',
    ],
  },
  // Exhaust flicker, drawn directly behind the ship's tail.
  flameA: {
    colors: [PAL.yellow, PAL.orange],
    rows: [
      '..21',
      '2211',
      '..21',
    ],
  },
  flameB: {
    colors: [PAL.yellow, PAL.orange],
    rows: [
      '...2',
      '.221',
      '...2',
    ],
  },
  // Reserve-life icon for the bottom HUD row.
  lifeIcon: {
    colors: SHIP_COLORS,
    rows: [
      '2.......',
      '21..33..',
      '2111111.',
      '21111111',
      '.222....',
    ],
  },
  // One per completed mission.
  flag: {
    colors: [PAL.yellow, PAL.red],
    rows: [
      '1222....',
      '122222..',
      '12222...',
      '1.......',
      '1.......',
      '1.......',
      '1.......',
      '11......',
    ],
  },
} satisfies Record<string, SpriteDef>;

export type SpriteName = keyof typeof DEFS;

let cache: Record<SpriteName, Sprite> | null = null;

/** All sprites, built once on first use. */
export function sprites(): Record<SpriteName, Sprite> {
  if (!cache) {
    cache = Object.fromEntries(
      Object.entries(DEFS).map(([name, def]) => [name, buildSprite(def)]),
    ) as Record<SpriteName, Sprite>;
  }
  return cache;
}

/** Where the flame attaches, relative to the ship's top-left. */
export const SHIP_FLAME_OFFSET = { x: -4, y: 4 } as const;
