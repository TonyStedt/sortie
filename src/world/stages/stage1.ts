import { PAL } from '../../gfx/palette';
import type { Placement, StageDef } from './types';

const rocket = (x: number): Placement => ({ x, kind: 'rocket' });
const fuel = (x: number): Placement => ({ x, kind: 'fuel' });
const mystery = (x: number): Placement => ({ x, kind: 'mystery' });

/**
 * Stage 1: rolling mountains, open sky (no ceiling).
 *
 * Tuning notes
 * - Length 1920 px = 32 s at 1 px/frame. A full tank lasts 36 s, so fuel is
 *   only just enough without shooting any fuel tanks.
 * - Peaks stay at or below 136 px (floor y >= 104) so there is always at
 *   least ~60 px of sky over the highest ground: this stage teaches, it
 *   doesn't squeeze.
 * - Ground objects stand on the flats: 24 rockets, 7 fuel tanks (one about
 *   every 4.5 s, each worth 9 s of fuel) and 3 mystery targets. The launch
 *   strip's first ~100 px is left empty.
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
  targets: [
    // Launch strip, bump, first flat.
    rocket(104), rocket(156), fuel(208),
    // Double hill: one on each step.
    rocket(288), rocket(332),
    // Valley pair.
    rocket(416), rocket(428),
    // Low plateau.
    fuel(480), rocket(504), mystery(540),
    // Peak shoulder.
    rocket(668),
    // Wide valley: guarded tank.
    rocket(720), fuel(736), rocket(756),
    // Mid plateau: guarded mystery.
    rocket(824), mystery(840), rocket(864),
    // Summit and ledge.
    rocket(932), fuel(980),
    // Valley after the big climb.
    rocket(1072), rocket(1088),
    // After the rumble strip.
    rocket(1176), fuel(1192),
    // Tall ridge approach.
    rocket(1304), rocket(1316), fuel(1364),
    // After the long descent.
    rocket(1576), mystery(1592),
    // Last hills.
    rocket(1652), rocket(1704), rocket(1716), fuel(1764), rocket(1788),
    // Run-out.
    rocket(1848),
  ],
};
