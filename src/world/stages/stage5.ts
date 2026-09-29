import { PAL } from '../../gfx/palette';
import { OPEN, tunnel } from './build';
import type { StageDef } from './types';

/**
 * Stage 5: the maze. A tight tunnel whose floor and roof jump and slope
 * together, so the ship has to line up for each step in advance.
 *
 * Tuning notes
 * - Each segment is [run, floor height, passage height, ...objects].
 * - The passage is 48-64 px (5-6 ship heights), 40 px at the single
 *   tightest stretch.
 * - Every step keeps at least 24 px of overlap between the passage before
 *   and after it, so a step can be taken by lining up beforehand. The dev
 *   build's passability check confirms the whole tunnel can be flown.
 * - Fuel is scarce: 3 tanks. 3 rockets, which mostly just hit the roof.
 */
const MAZE = tunnel([
  [0, 24, OPEN],
  [64, 24, OPEN],
  // Roof comes down.
  [48, 24, 136],
  [48, 24, 136, 'fuel'],
  [0, 24, 64],
  [64, 24, 64, 'rocket'],
  [40, 64, 64],
  [48, 64, 64],
  [0, 96, 64],
  [56, 96, 64, 'mystery'],
  [48, 48, 64],
  [32, 48, 64],
  [0, 48, 48],
  [72, 48, 48, 'rocket'],
  [0, 72, 48],
  [48, 72, 48],
  [24, 96, 48],
  [40, 96, 48],
  [0, 64, 56],
  [64, 64, 56, 'fuel'],
  [32, 32, 56],
  [48, 32, 56],
  // Tightest stretch.
  [0, 32, 40],
  [64, 32, 40],
  [0, 32, 56],
  [24, 56, 56],
  [32, 56, 56],
  [0, 88, 56],
  [48, 88, 56, 'rocket'],
  [32, 120, 56],
  [40, 120, 56],
  [48, 72, 56],
  [24, 72, 56],
  [0, 40, 56],
  [64, 40, 56, 'fuel'],
  [0, 40, 48],
  [24, 64, 48],
  [48, 64, 48],
  [24, 40, 48],
  [48, 40, 48],
  [16, 24, 48],
  [40, 24, 48],
  // Roof lifts away.
  [0, 24, 96],
  [88, 24, OPEN],
  [64, 24, OPEN],
]);

export const STAGE_5: StageDef = {
  label: '5TH',
  colors: { fill: PAL.darkGreen, outline: PAL.green },
  floor: MAZE.floor,
  ceiling: MAZE.ceiling,
  targets: MAZE.targets,
};
