import { PAL } from '../../gfx/palette';
import type { StageDef } from './types';

/**
 * Stage 1: rolling mountains, open sky (no ceiling).
 *
 * Tuning notes
 * - Length 1920 px = 32 s at 1 px/frame. A full tank lasts 36 s, so fuel is
 *   only just enough without shooting any fuel tanks.
 * - Peaks stay at or below 136 px (floor y >= 104) so there is always at
 *   least ~60 px of sky over the highest ground: this stage teaches, it
 *   doesn't squeeze.
 * - Flat plateaus and valleys are left for placements in Phase 3: fuel
 *   tanks on flats, ground rockets in valleys and on hilltops.
 * - It begins and ends at height 24 so sections join without a seam.
 */
export const STAGE_1: StageDef = {
  label: '1ST',
  colors: { fill: PAL.brown, outline: PAL.green },
  floor: [
    [0, 24],
    // Launch strip: flat, gives the player a moment to settle in.
    [128, 24],
    // Small bump, then back to the base line.
    [16, 40], [32, 40], [16, 24],
    [48, 24],
    // Stepped double hill.
    [40, 64], [24, 64], [24, 88], [16, 88], [64, 24],
    // Valley.
    [32, 24],
    // Low plateau.
    [32, 56], [48, 56], [16, 40], [24, 40],
    // Sharp peak.
    [56, 96], [8, 96], [40, 56], [16, 56], [32, 24],
    // Wide valley floor.
    [56, 24],
    // Mid plateau, then the first big climb.
    [48, 72], [64, 72], [48, 120], [16, 120], [32, 88], [24, 88], [64, 24],
    [40, 24],
    // Rumble strip of small bumps.
    [16, 40], [16, 24], [16, 40], [16, 24],
    [48, 24],
    // Long climb to the tallest ridge of the stage.
    [80, 104], [32, 104], [24, 80], [40, 80], [56, 136], [8, 136],
    // Long descent.
    [112, 24],
    [48, 24],
    // Last hills.
    [32, 56], [16, 56], [32, 24],
    [32, 24],
    [24, 48], [48, 48], [24, 24],
    // Run-out into the next section.
    [96, 24],
  ],
};
