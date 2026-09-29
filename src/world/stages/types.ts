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
export type TargetKind = 'rocket' | 'fuel' | 'mystery';

/**
 * A ground object. `x` is the object's left edge, in pixels from the start of
 * the stage; it is stood on the ground automatically. Place objects on flat
 * ground wide enough for them (rocket 8 px, fuel tank and mystery 16 px).
 */
export interface Placement {
  readonly x: number;
  readonly kind: TargetKind;
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
}
