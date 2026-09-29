/**
 * A terrain knot: over the next `run` pixels, move in a straight line to
 * `height`. A run of 0 is a vertical step.
 *
 * Authoring conventions (they match the tile-built look of the original):
 * - heights and runs are multiples of 8;
 * - slopes are flat or 45 degrees (run === |height change|).
 */
export type Knot = readonly [run: number, height: number];

/** Things that sit on the ground and scroll with the terrain. */
export type TargetKind = 'rocket' | 'fuel' | 'mystery' | 'base';

/** Footprint width of each ground object, px (matches its sprite). */
export const TARGET_WIDTH: Readonly<Record<TargetKind, number>> = {
  rocket: 8,
  fuel: 16,
  mystery: 16,
  base: 24,
};

/**
 * A ground object. `x` is the object's left edge, in pixels from the start of
 * the stage; it is stood on the ground automatically. Place objects on flat
 * ground at least TARGET_WIDTH wide.
 */
export interface Placement {
  readonly x: number;
  readonly kind: TargetKind;
}

/** Airborne enemies, released in waves while the ship is in the stage. */
export type AirKind = 'ufo' | 'fireball';

/**
 * A repeating wave of airborne enemies. Waves run only while the ship and
 * the right edge of the screen are both inside the stage, and restart when
 * the stage is re-entered.
 */
export interface WaveDef {
  readonly kind: AirKind;
  /** Frames after the stage becomes active before the first burst. */
  readonly delay: number;
  /** Frames between the starts of successive bursts. */
  readonly every: number;
  /** Enemies per burst... */
  readonly burst: number;
  /** ...released this many frames apart. */
  readonly gap: number;
}

export interface StageDef {
  /** Label in the HUD's section-progress bar. */
  label: string;
  /** Terrain colours for this stage. */
  colors: { readonly fill: string; readonly outline: string };
  /**
   * Ground profile. Heights are pixels above the bottom of the playfield
   * (0 = no visible ground). The first knot must have run 0: it sets the
   * starting height. The stage is as long as the sum of the runs.
   */
  floor: readonly Knot[];
  /**
   * Optional ceiling profile. Heights are pixels below the top of the
   * playfield (0 = no ceiling). Same format as `floor`, same total length.
   */
  ceiling?: readonly Knot[];
  /** Ground objects, in any order. */
  targets?: readonly Placement[];
  /** Airborne waves. */
  waves?: readonly WaveDef[];
  /**
   * The base stage's repeating end. Until the base is destroyed, when the
   * screen's left edge reaches `to` (stage x) the view jumps back to `from`,
   * so the stretch from `from` to `to` (with the base) comes round again.
   * For the jump to be invisible, the terrain from `to` onward must match
   * the terrain from `from` onward for a screen width. The stretch must hold
   * the base and no fuel tanks: running low on fuel is the price of missing.
   */
  baseLoop?: { readonly from: number; readonly to: number };
}
