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
  // Player laser: a short dash, bright at the front.
  shot: {
    colors: [PAL.white, PAL.yellow],
    rows: ['222111'],
  },
  // Bomb, three attitudes as the arc steepens. 1 = casing, 2 = fins.
  bombLevel: {
    colors: [PAL.yellow, PAL.red],
    rows: [
      '2.11.',
      '22111',
      '2.11.',
    ],
  },
  bombAngled: {
    colors: [PAL.yellow, PAL.red],
    rows: [
      '22..',
      '211.',
      '.111',
      '..11',
    ],
  },
  bombDive: {
    colors: [PAL.yellow, PAL.red],
    rows: [
      '2.2',
      '222',
      '111',
      '111',
      '.1.',
    ],
  },
  // Player ship explosion, three frames.
  shipBoomA: {
    colors: [PAL.red, PAL.orange, PAL.yellow],
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '......1..1......',
      '.......22.......',
      '.....12332......',
      '......23321.....',
      '.......22.......',
      '......1..1......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  shipBoomB: {
    colors: [PAL.red, PAL.orange, PAL.yellow],
    rows: [
      '................',
      '................',
      '...1.......1....',
      '....1..2..1.....',
      '.....2.2.2......',
      '..1...2322...1..',
      '...2.233332.2...',
      '....2333332.....',
      '...2.23333.2....',
      '..1..22332...1..',
      '.....2.2.2......',
      '....1..2..1.....',
      '...1.......1....',
      '................',
      '................',
      '................',
    ],
  },
  shipBoomC: {
    colors: [PAL.red, PAL.orange],
    rows: [
      '..1..........1..',
      '................',
      '....2.....2.....',
      '.1.......1....1.',
      '......2.........',
      '...2.......2....',
      '........1.......',
      '..1..2.....2..1.',
      '........2.......',
      '....1.......2...',
      '.2.....1........',
      '..........2..1..',
      '....2...........',
      '..1.....2....1..',
      '................',
      '................',
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

/** Attachment points, relative to the ship's top-left. */
export const SHIP_FLAME_OFFSET = { x: -4, y: 4 } as const;
export const SHIP_NOSE = { x: 16, y: 5 } as const;
export const SHIP_BOMB_BAY = { x: 5, y: 10 } as const;
/** The 16x16 explosion is centred on the 16x10 ship. */
export const SHIP_BOOM_OFFSET = { x: 0, y: -3 } as const;
