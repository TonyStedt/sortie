/**
 * The master palette, modelled on the resistor-DAC colours of early-80s
 * arcade boards: few, saturated, and slightly uneven. Every colour drawn in
 * the game should come from here.
 */
export const PAL = {
  black: '#000000',
  white: '#ffffff',
  grey: '#a8a8a8',
  red: '#ff0000',
  darkRed: '#a80000',
  orange: '#ff9700',
  yellow: '#ffff00',
  green: '#00ff00',
  darkGreen: '#00a800',
  cyan: '#00ffff',
  blue: '#0051ff',
  darkBlue: '#0000a8',
  purple: '#a800ff',
  magenta: '#ff00ff',
  pink: '#ff97ae',
  brown: '#a85100',
} as const;

export type PalColor = (typeof PAL)[keyof typeof PAL];

/** Colours the hardware-style starfield picks from. */
export const STAR_COLORS: readonly string[] = [
  PAL.white,
  PAL.red,
  PAL.yellow,
  PAL.green,
  PAL.cyan,
  PAL.blue,
  PAL.magenta,
  PAL.orange,
  PAL.pink,
];
