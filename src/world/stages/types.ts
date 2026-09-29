/**
 * A terrain knot: over the next `run` pixels, move in a straight line to
 * `height`. A run of 0 is a vertical step.
 *
 * Authoring conventions (they match the tile-built look of the original):
 * - heights and runs are multiples of 8;
 * - slopes are flat or 45 degrees (run === |height change|).
 */
export type Knot = readonly [run: number, height: number];

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
}
