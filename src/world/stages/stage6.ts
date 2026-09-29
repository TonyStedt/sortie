import { PAL } from '../../gfx/palette';
import { OPEN, tunnel } from './build';
import type { StageDef } from './types';

/**
 * Stage 6: the base. A fortified approach under a roof, then open sky over a
 * walled pit with the base in it. Destroying the base completes the mission.
 *
 * Tuning notes
 * - Segments are [run, floor height, passage height (OPEN = no roof), ...objects].
 * - The approach steps up and down under a roof, guarded by 5 rockets, with
 *   2 fuel tanks and a mystery target.
 * - The pit is 64 px wide between 40 px walls, open above: the base is
 *   meant to be bombed. A rocket stands on each wall.
 * - Missing the base: the stretch from 'repeatFrom' to 'repeatTo' (open
 *   run-up, walls, pit; 352 px, about 6 s) comes round again, base and wall
 *   rockets included, until the base is destroyed. It has no fuel tanks, so
 *   each miss costs fuel. The 240 px flats either side of it are identical,
 *   which keeps the jump back invisible.
 */
const BASE = tunnel([
  [0, 24, OPEN],
  [64, 24, OPEN],
  // Fortress roof comes down.
  [48, 24, 136],
  [64, 24, 136, 'fuel'],
  [0, 56, 104],
  [48, 56, 104, 'rocket', 'rocket'],
  [0, 88, 72],
  [40, 88, 72, 'rocket'],
  [0, 40, 120],
  [56, 40, 120, 'fuel', 'rocket'],
  [0, 40, 80],
  [48, 40, 80],
  [40, 80, 80],
  [40, 80, 80, 'rocket'],
  [40, 40, 80],
  [32, 40, 80],
  [0, 24, 96],
  [48, 24, 96, 'mystery'],
  // Out into the open.
  [88, 24, OPEN],
  { mark: 'repeatFrom' },
  [240, 24, OPEN],
  // The pit: wall, base, wall.
  [0, 64, OPEN],
  [24, 64, OPEN, 'rocket'],
  [0, 24, OPEN],
  [64, 24, OPEN, 'base'],
  [0, 64, OPEN],
  [24, 64, OPEN, 'rocket'],
  [0, 24, OPEN],
  { mark: 'repeatTo' },
  // Run-out, back round to stage 1 (once the base is destroyed).
  [240, 24, OPEN],
]);

export const STAGE_6: StageDef = {
  label: 'BASE',
  colors: { fill: PAL.darkGrey, outline: PAL.yellow },
  floor: BASE.floor,
  ceiling: BASE.ceiling,
  targets: BASE.targets,
  baseLoop: { from: BASE.mark('repeatFrom'), to: BASE.mark('repeatTo') },
};
