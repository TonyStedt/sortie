import { PAL } from './palette';
import { buildSprite, type Sprite, type SpriteDef } from './sprite';

/**
 * Original sprite designs for SORTIE. Keep each within 3 colours.
 * The ship faces right; the world scrolls towards it from the right.
 */

// 1 = hull, 2 = trim / wing, 3 = canopy
const SHIP_COLORS = [PAL.white, PAL.red, PAL.cyan] as const;

const UFO_COLORS = [PAL.cyan, PAL.white, PAL.red] as const;
function ufoRows(lights: string): string[] {
  return [
    '......2222......',
    '....22222222....',
    '..111111111111..',
    lights,
    '..111111111111..',
    '....11....11....',
  ];
}

// Explosion frames, shared by the ship and targets (different colours).
const SHIP_BOOM_COLORS = [PAL.red, PAL.orange, PAL.yellow] as const;
const TARGET_BOOM_COLORS = [PAL.orange, PAL.yellow, PAL.white] as const;
const BOOM_A = [
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
];
const BOOM_B = [
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
];
const BOOM_C = [
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
];

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
  shipBoomA: { colors: SHIP_BOOM_COLORS, rows: BOOM_A },
  shipBoomB: { colors: SHIP_BOOM_COLORS, rows: BOOM_B },
  shipBoomC: { colors: [PAL.red, PAL.orange], rows: BOOM_C },
  // Destroyed target / enemy explosion: same shapes, hotter colours.
  boomA: { colors: TARGET_BOOM_COLORS, rows: BOOM_A },
  boomB: { colors: TARGET_BOOM_COLORS, rows: BOOM_B },
  boomC: { colors: [PAL.orange, PAL.yellow], rows: BOOM_C },
  // Bomb hitting the ground.
  puffA: {
    colors: [PAL.orange, PAL.red],
    rows: [
      '........',
      '...1....',
      '.1.2.1..',
      '..222...',
      '.22222..',
    ],
  },
  puffB: {
    colors: [PAL.orange, PAL.red],
    rows: [
      '.1...1..',
      '...1....',
      '1.2.2.1.',
      '........',
      '.2.2.2..',
    ],
  },
  // Ground rocket, nose up. 1 = body, 2 = nose / fins, 3 = window.
  rocket: {
    colors: [PAL.white, PAL.red, PAL.cyan],
    rows: [
      '...22...',
      '...22...',
      '..2222..',
      '..1111..',
      '..1331..',
      '..1111..',
      '..1111..',
      '..1111..',
      '..1111..',
      '.211112.',
      '22111122',
      '22111122',
      '2..11..2',
      '2......2',
    ],
  },
  // Rocket exhaust, drawn under a launched rocket.
  rocketFlameA: {
    colors: [PAL.yellow, PAL.orange],
    rows: [
      '..2112..',
      '..2112..',
      '...11...',
      '...22...',
      '...2....',
    ],
  },
  rocketFlameB: {
    colors: [PAL.yellow, PAL.orange],
    rows: [
      '..2112..',
      '...11...',
      '...12...',
      '....2...',
      '........',
    ],
  },
  // Fuel tank with its label. 1 = tank, 2 = lettering, 3 = label band.
  fuelTank: {
    colors: [PAL.magenta, PAL.white, PAL.red],
    rows: [
      '....11111111....',
      '..111111111111..',
      '.11111111111111.',
      '1111111111111111',
      '3333333333333333',
      '2223232322232333',
      '2333232323332333',
      '2233232322332333',
      '2333232323332333',
      '2333222322232223',
      '3333333333333333',
      '1111111111111111',
      '.11111111111111.',
      '.11..........11.',
    ],
  },
  // Mystery target: a dome marked with a question mark. 1 = dome, 2 = mark, 3 = base.
  mystery: {
    colors: [PAL.blue, PAL.yellow, PAL.grey],
    rows: [
      '....11111111....',
      '...1111111111...',
      '..111122211111..',
      '.11112111211111.',
      '.11111112111111.',
      '.11111121111111.',
      '.11111121111111.',
      '.11111111111111.',
      '.11111121111111.',
      '3333333333333333',
      '3333333333333333',
      '.33..........33.',
    ],
  },
  // The enemy base: armoured dome with antenna. 1 = structure, 2 = dome, 3 = lights.
  base: {
    colors: [PAL.grey, PAL.red, PAL.yellow],
    rows: [
      '...........33...........',
      '...........11...........',
      '...........11...........',
      '.........222222.........',
      '.......2222222222.......',
      '......222222222222......',
      '.....22233222233222.....',
      '.....22222222222222.....',
      '...111111111111111111...',
      '..11311311311311311311..',
      '..11111111111111111111..',
      '.1111111111111111111111.',
      '111111111111111111111111',
      '113113113113113113113113',
      '111111111111111111111111',
      '111111111111111111111111',
    ],
  },
  // UFO: saucer with a ring of lights that chase round (3 frames).
  // 1 = hull, 2 = dome, 3 = lights.
  ufoA: { colors: UFO_COLORS, rows: ufoRows('1131131131131131') },
  ufoB: { colors: UFO_COLORS, rows: ufoRows('1311311311311311') },
  ufoC: { colors: UFO_COLORS, rows: ufoRows('3113113113113113') },
  // Fireball, flying left: white-hot head, flickering tail (2 frames).
  fireballA: {
    colors: [PAL.white, PAL.yellow, PAL.red],
    rows: [
      '...2223..3...3..',
      '.22112223333.3..',
      '2111112222333.3.',
      '2111111222233333',
      '2111112222333.3.',
      '.22112223333.3..',
      '...2223..3...3..',
    ],
  },
  fireballB: {
    colors: [PAL.white, PAL.yellow, PAL.red],
    rows: [
      '...222.3...3....',
      '.2211222333.3..3',
      '21111122223333..',
      '211111122223333.',
      '21111122223333..',
      '.2211222333.3..3',
      '...222.3...3....',
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
