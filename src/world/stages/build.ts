import { PLAYFIELD_BOTTOM, PLAYFIELD_TOP } from '../../core/config';
import { TARGET_WIDTH, type Knot, type Placement, type TargetKind } from './types';

/**
 * Builders that turn compact, stage-shaped descriptions into floor/ceiling
 * knots and placements, so city and tunnel stages stay readable. They only
 * produce data; nothing here runs during play.
 */

const PLAYFIELD_H = PLAYFIELD_BOTTOM - PLAYFIELD_TOP;
/** Space left between objects sharing a roof or ledge, px. */
const OBJECT_SPACING = 4;

/**
 * A flat-topped block: [width, height, ...objects on top]. Height is above
 * the bottom of the playfield. Neighbouring blocks join with vertical walls.
 */
export type Block = readonly [width: number, height: number, ...on: TargetKind[]];

/** A row of flat-topped blocks, e.g. a city skyline. */
export function skyline(blocks: readonly Block[]): { floor: Knot[]; targets: Placement[] } {
  let h = blocks[0][1];
  const floor: Knot[] = [[0, h]];
  const targets: Placement[] = [];
  let x = 0;
  for (const [w, height, ...on] of blocks) {
    if (height !== h) floor.push([0, height]);
    floor.push([w, height]);
    h = height;
    targets.push(...placeOn(x, w, on));
    x += w;
  }
  return { floor, targets };
}

/** `gap` value meaning "no ceiling". */
export const OPEN = -1;

/**
 * A tunnel segment: [run, floor, gap, ...objects on the floor].
 * Over `run` px the floor moves in a straight line to height `floor`, and the
 * roof follows so the passage is `gap` px tall (OPEN = no roof). Run 0 makes
 * a vertical step. Objects need a flat segment (floor unchanged).
 * The first segment must have run 0; it sets the starting shape.
 */
export type Segment = readonly [run: number, floor: number, gap: number, ...on: TargetKind[]];

/** A named position between segments; read it back with the result's `mark()`. */
export interface Mark {
  readonly mark: string;
}

export function tunnel(segments: readonly (Segment | Mark)[]): {
  floor: Knot[];
  ceiling: Knot[];
  targets: Placement[];
  /** Stage x of a named Mark. */
  mark(name: string): number;
} {
  const depth = (f: number, gap: number): number => {
    const d = gap === OPEN ? 0 : PLAYFIELD_H - f - gap;
    if (d < 0) throw new Error(`tunnel: floor ${f} + gap ${gap} is taller than the playfield`);
    return d;
  };
  const [first, ...rest] = segments;
  if (!Array.isArray(first) || first[0] !== 0) {
    throw new Error('tunnel: first segment must have run 0');
  }
  let f = first[1];
  const floor: Knot[] = [[0, f]];
  const ceiling: Knot[] = [[0, depth(f, first[2])]];
  const targets: Placement[] = [];
  const marks = new Map<string, number>();
  let x = 0;
  for (const seg of rest) {
    if (isMark(seg)) {
      marks.set(seg.mark, x);
      continue;
    }
    const [run, fl, gap, ...on] = seg;
    if (on.length > 0 && (run === 0 || fl !== f)) {
      throw new Error(`tunnel: objects at x ${x} need a flat segment`);
    }
    floor.push([run, fl]);
    ceiling.push([run, depth(fl, gap)]);
    targets.push(...placeOn(x, run, on));
    x += run;
    f = fl;
  }
  const mark = (name: string): number => {
    const at = marks.get(name);
    if (at === undefined) throw new Error(`tunnel: no mark named '${name}'`);
    return at;
  };
  return { floor, ceiling, targets, mark };
}

function isMark(s: Segment | Mark): s is Mark {
  return !Array.isArray(s);
}

/** Centre a row of objects on a flat span starting at x. */
function placeOn(x: number, width: number, kinds: readonly TargetKind[]): Placement[] {
  if (kinds.length === 0) return [];
  const total =
    kinds.reduce((sum, k) => sum + TARGET_WIDTH[k], 0) + OBJECT_SPACING * (kinds.length - 1);
  if (total > width) {
    throw new Error(`${kinds.join(', ')} (${total} px) don't fit on ${width} px at x ${x}`);
  }
  let at = x + Math.floor((width - total) / 2);
  return kinds.map((kind) => {
    const p = { x: at, kind };
    at += TARGET_WIDTH[kind] + OBJECT_SPACING;
    return p;
  });
}
