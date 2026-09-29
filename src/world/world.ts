import { PLAYFIELD_BOTTOM, PLAYFIELD_TOP } from '../core/config';
import type { Knot, StageDef } from './stages/types';

/**
 * The mission's terrain, flattened to one entry per pixel column of world
 * space. World x grows to the right; the camera's `scroll` is the world x of
 * screen column 0. World x wraps, so the mission loops.
 */
export class World {
  readonly length: number;
  /** World x where each stage (= HUD section) begins. */
  readonly sectionStarts: readonly number[];
  /** Screen y of the topmost ground pixel, per column. */
  private readonly floor: Int16Array;
  /** Screen y of the first open pixel below the ceiling, per column. */
  private readonly ceil: Int16Array;
  private readonly sectionOf: Uint8Array;

  constructor(readonly stages: readonly StageDef[]) {
    const floors: number[] = [];
    const ceils: number[] = [];
    const sections: number[] = [];
    const starts: number[] = [];

    stages.forEach((stage, i) => {
      starts.push(floors.length);
      const floor = profile(stage.floor, `${stage.label} floor`);
      const ceil = stage.ceiling
        ? profile(stage.ceiling, `${stage.label} ceiling`)
        : new Array<number>(floor.length).fill(0);
      if (ceil.length !== floor.length) {
        throw new Error(
          `${stage.label}: ceiling is ${ceil.length} px long but floor is ${floor.length} px`,
        );
      }
      for (let x = 0; x < floor.length; x++) {
        floors.push(PLAYFIELD_BOTTOM - floor[x]);
        ceils.push(PLAYFIELD_TOP + ceil[x]);
        sections.push(i);
      }
    });

    this.length = floors.length;
    this.floor = Int16Array.from(floors);
    this.ceil = Int16Array.from(ceils);
    this.sectionOf = Uint8Array.from(sections);
    this.sectionStarts = starts;
  }

  floorY(worldX: number): number {
    return this.floor[this.wrap(worldX)];
  }

  ceilY(worldX: number): number {
    return this.ceil[this.wrap(worldX)];
  }

  section(worldX: number): number {
    return this.sectionOf[this.wrap(worldX)];
  }

  stageAt(worldX: number): StageDef {
    return this.stages[this.section(worldX)];
  }

  /** True if the screen pixel (x, y) is inside rock. */
  solidAt(scroll: number, x: number, y: number): boolean {
    const wx = scroll + Math.floor(x);
    const py = Math.floor(y);
    return py >= this.floorY(wx) || py < this.ceilY(wx);
  }

  private wrap(x: number): number {
    const L = this.length;
    return ((Math.floor(x) % L) + L) % L;
  }
}

/** Expand knots into one height per pixel column. */
function profile(knots: readonly Knot[], name: string): number[] {
  const [first, ...rest] = knots;
  if (!first || first[0] !== 0) throw new Error(`${name}: first knot must have run 0`);
  let h = first[1];
  const out: number[] = [];
  for (const [run, target] of rest) {
    if (run === 0) {
      h = target;
      continue;
    }
    for (let i = 1; i <= run; i++) out.push(Math.round(h + ((target - h) * i) / run));
    h = target;
  }
  return out;
}
