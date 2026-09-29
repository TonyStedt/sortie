import { PAL } from '../../gfx/palette';
import type { Placement, StageDef } from './types';

const rocket = (x: number): Placement => ({ x, kind: 'rocket' });
const fuel = (x: number): Placement => ({ x, kind: 'fuel' });
const mystery = (x: number): Placement => ({ x, kind: 'mystery' });

/**
 * Stage 3: fireballs. Low, gentle terrain and open sky; fireballs streak in
 * from the right in bursts and can only be dodged.
 *
 * Tuning notes
 * - Length 1664 px = 28 s at 1 px/frame.
 * - Terrain stays low (max height 56) to leave the whole sky for dodging.
 * - Few ground targets: 4 rockets, 6 fuel tanks, 2 mystery targets.
 * - Fireballs come in bursts of 4, 14 frames apart, a burst every 100
 *   frames, at random heights.
 */
export const STAGE_3: StageDef = {
  label: '3RD',
  colors: { fill: PAL.darkRed, outline: PAL.orange },
  floor: [
    [0, 24],
    [96, 24],
    [16, 40], [64, 40], [16, 24],
    [128, 24],
    [24, 48], [64, 48], [24, 24],
    [160, 24],
    [16, 40], [96, 40], [16, 24],
    [128, 24],
    [32, 56], [48, 56], [32, 24],
    [160, 24],
    [16, 40], [64, 40], [16, 24],
    [144, 24],
    [24, 48], [48, 48], [24, 24],
    [208, 24],
  ],
  targets: [
    fuel(240), rocket(280), fuel(376), rocket(520), mystery(640), fuel(780),
    rocket(900), fuel(1040), rocket(1160), fuel(1300), mystery(1400), fuel(1560),
  ],
  waves: [{ kind: 'fireball', delay: 30, every: 100, burst: 4, gap: 14 }],
};
