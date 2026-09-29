import { PAL } from '../../gfx/palette';
import { skyline } from './build';
import type { StageDef } from './types';

/**
 * Stage 4: the city. Rectangular buildings of varying heights rise straight
 * out of the street, with rockets and fuel tanks on the rooftops.
 *
 * Tuning notes
 * - Each block is [width, height, ...rooftop objects]. Heights run 48-144
 *   (the tallest leaves ~60 px of sky), all multiples of 8.
 * - Tall towers sit next to low roofs and streets, so rooftop rockets launch
 *   from very different heights and the ship has to weave rather than cruise.
 * - Rocket-heavy: 22 rockets, 8 fuel tanks, 2 mystery targets.
 */
const CITY = skyline([
  [96, 24],
  [24, 56, 'rocket'],
  [32, 88, 'fuel'],
  [16, 24],
  [24, 72, 'rocket'],
  [16, 120],
  [24, 96, 'rocket'],
  [24, 24],
  [32, 64, 'rocket', 'rocket'],
  [24, 104, 'fuel'],
  [16, 136],
  [16, 24],
  [40, 80, 'rocket', 'fuel'],
  [24, 48],
  [24, 112, 'rocket'],
  [32, 24],
  [24, 64, 'mystery'],
  [16, 96],
  [24, 128, 'rocket'],
  [16, 24],
  [32, 72, 'fuel'],
  [24, 56, 'rocket'],
  [16, 24],
  [24, 144, 'rocket'],
  [24, 104],
  [24, 24],
  [40, 88, 'rocket', 'rocket', 'rocket'],
  [24, 24],
  [32, 120, 'fuel'],
  [16, 64],
  [24, 96, 'rocket'],
  [32, 24],
  [24, 56, 'mystery'],
  [24, 136, 'rocket'],
  [24, 80, 'fuel'],
  [16, 24],
  [24, 112, 'rocket'],
  [32, 72, 'rocket', 'rocket'],
  [24, 24],
  [32, 104, 'fuel'],
  [16, 144],
  [24, 64, 'rocket'],
  [32, 24],
  [24, 48, 'rocket'],
  [32, 88, 'fuel'],
  [16, 24],
  [96, 24],
]);

export const STAGE_4: StageDef = {
  label: '4TH',
  colors: { fill: PAL.purple, outline: PAL.pink },
  floor: CITY.floor,
  targets: CITY.targets,
};
