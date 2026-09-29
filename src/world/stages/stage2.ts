import { PAL } from '../../gfx/palette';
import type { Placement, StageDef } from './types';

const fuel = (x: number): Placement => ({ x, kind: 'fuel' });
const mystery = (x: number): Placement => ({ x, kind: 'mystery' });

/**
 * Stage 2: the UFO cave. A ceiling drops in and the rest of the stage is a
 * passage between floor and roof.
 *
 * Tuning notes
 * - Length 1792 px = 30 s at 1 px/frame.
 * - The passage is never narrower than 72 px (7 ship heights), so UFOs
 *   always have room to weave and the challenge is the UFOs, not the walls.
 *   The tightest stretch (x 824-904) sits low, under a deep roof.
 * - The roof opens at both ends so the stage joins open-sky stages seamlessly.
 * - No rockets here: UFOs are the threat. 7 fuel tanks (about one every
 *   4.3 s) and 2 mystery targets sit on the floor flats.
 * - UFOs come in bursts of 3 that follow the same path (a snake), a burst
 *   every 2 s.
 */
export const STAGE_2: StageDef = {
  label: '2ND',
  colors: { fill: PAL.darkBlue, outline: PAL.cyan },
  floor: [
    [0, 24],
    [128, 24],
    [24, 48], [64, 48], [24, 24],
    [96, 24],
    [32, 56], [48, 56], [32, 24],
    [112, 24],
    [40, 64], [64, 64], [40, 24],
    [96, 24],
    [24, 48], [96, 48], [24, 24],
    [112, 24],
    [32, 56], [64, 56], [32, 24],
    [144, 24],
    [48, 72], [32, 72], [48, 24],
    [128, 24],
    [24, 48], [48, 48], [24, 24],
    [112, 24],
  ],
  ceiling: [
    [0, 0],
    // Cave mouth: open sky, then the roof slopes down.
    [64, 0], [48, 48],
    [80, 48], [24, 72], [48, 72], [24, 48],
    [96, 48],
    // Roof dips over the low plateau.
    [32, 80], [32, 80], [32, 48],
    [112, 48],
    // Roof lifts over the tall floor hump.
    [16, 32], [56, 32], [16, 48],
    [88, 48],
    // Low, deep-roofed squeeze.
    [40, 88], [96, 88], [40, 48],
    [112, 48],
    [32, 24], [64, 24], [32, 64],
    [80, 64], [32, 40],
    [80, 40], [48, 64],
    [80, 64], [40, 24],
    [40, 24], [48, 72], [48, 72], [48, 24],
    // Cave exit.
    [24, 0], [40, 0],
  ],
  targets: [
    fuel(280), fuel(496), mystery(736), fuel(856), fuel(984),
    fuel(1216), mystery(1264), fuel(1500), fuel(1720),
  ],
  waves: [{ kind: 'ufo', delay: 60, every: 120, burst: 3, gap: 20 }],
};
